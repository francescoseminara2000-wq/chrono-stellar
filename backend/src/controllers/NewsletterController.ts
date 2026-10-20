import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { EmailService } from '../services/EmailService';

export class NewsletterController {
    private emailService: EmailService;

    constructor() {
        this.emailService = new EmailService();
    }

    /**
     * Iscrizione o richiesta di cancellazione alla Newsletter con Double Opt-in.
     */
    async subscribe(req: Request, res: Response) {
        try {
            const { email, action } = req.body;

            if (!email || !email.includes('@')) {
                return res.status(400).json({ error: 'Inserisci un indirizzo email valido.' });
            }

            const cleanEmail = email.trim().toLowerCase();

            // Caso Disiscrizione
            if (action === 'unsubscribe') {
                const subscriber = await prisma.newsletterSubscriber.findUnique({
                    where: { email: cleanEmail }
                });

                if (subscriber) {
                    await prisma.newsletterSubscriber.update({
                        where: { id: subscriber.id },
                        data: {
                            isActive: false,
                            unsubscribedAt: new Date()
                        }
                    });
                }

                return res.json({
                    success: true,
                    message: 'Il tuo indirizzo email è stato rimosso dalla nostra mailing list.',
                    mode: 'unsubscribe'
                });
            }

            // Caso Iscrizione
            const existing = await prisma.newsletterSubscriber.findUnique({
                where: { email: cleanEmail }
            });

            if (existing && existing.isConfirmed && existing.isActive) {
                return res.json({
                    success: true,
                    alreadySubscribed: true,
                    message: 'Il tuo indirizzo email risulta già iscritto e attivo nella nostra newsletter!',
                    mode: 'subscribe'
                });
            }

            const confirmationToken = crypto.randomBytes(32).toString('hex');

            if (existing) {
                await prisma.newsletterSubscriber.update({
                    where: { id: existing.id },
                    data: {
                        confirmationToken,
                        isActive: true
                    }
                });
            } else {
                await prisma.newsletterSubscriber.create({
                    data: {
                        email: cleanEmail,
                        confirmationToken,
                        isConfirmed: false,
                        isActive: true
                    }
                });
            }

            // Invia l'email con grafica elegante in italiano
            await this.emailService.sendNewsletterConfirmationEmail(cleanEmail, confirmationToken);

            res.json({
                success: true,
                message: 'Ti abbiamo inviato un\'email di conferma: clicca sul pulsante all\'interno per completare l\'iscrizione!',
                mode: 'subscribe'
            });
        } catch (error: any) {
            console.error('[NewsletterController] Errore richiesta newsletter:', error);
            res.status(500).json({ error: 'Impossibile completare la richiesta. Riprova più tardi.' });
        }
    }

    /**
     * Conferma iscrizione via token da link email.
     */
    async confirm(req: Request, res: Response) {
        try {
            const token = (req.query.token as string) || req.body.token;

            if (!token) {
                return res.status(400).json({ error: 'Token di conferma mancante.' });
            }

            const subscriber = await prisma.newsletterSubscriber.findUnique({
                where: { confirmationToken: token }
            });

            if (!subscriber) {
                return res.status(400).json({ error: 'Il link di conferma non è valido oppure è già stato utilizzato.' });
            }

            await prisma.newsletterSubscriber.update({
                where: { id: subscriber.id },
                data: {
                    isConfirmed: true,
                    confirmedAt: new Date(),
                    confirmationToken: null,
                    isActive: true
                }
            });

            // Recupera eventuale coupon di benvenuto newsletter
            let welcomeCoupon = null;
            try {
                const coupon = await prisma.coupon.findFirst({
                    where: { isForNewsletter: true, isActive: true }
                });
                if (coupon) {
                    welcomeCoupon = {
                        code: coupon.code,
                        discountType: coupon.discountType,
                        discountValue: coupon.discountValue,
                        minSpend: coupon.minSpend,
                        description: coupon.description
                    };
                }
            } catch (cErr) {
                console.error('[NewsletterController] Errore caricamento coupon benvenuto:', cErr);
            }

            res.json({
                success: true,
                email: subscriber.email,
                welcomeCoupon,
                message: 'Fantastico! La tua iscrizione alla newsletter è stata confermata con successo.'
            });
        } catch (error: any) {
            console.error('[NewsletterController] Errore conferma iscrizione:', error);
            res.status(500).json({ error: 'Errore durante la conferma dell\'iscrizione.' });
        }
    }

    /**
     * Admin: invio di una comunicazione / newsletter a tutti gli iscritti confermati.
     */
    async sendCampaign(req: Request, res: Response) {
        try {
            const { subject, content, preview, isTest, testEmail } = req.body;

            if (!subject || !subject.trim()) {
                return res.status(400).json({ error: 'Oggetto della newsletter obbligatorio.' });
            }

            if (!content || !content.trim()) {
                return res.status(400).json({ error: 'Contenuto del messaggio obbligatorio.' });
            }

            // Se è un test, invia solo all'email specificata
            if (isTest) {
                const target = testEmail || 'noreply@ortofruttabutti.it';
                const sent = await this.emailService.sendNewsletterEmail(
                    target,
                    `[TEST ANTEPRIMA] ${subject}`,
                    content
                );

                if (!sent) {
                    return res.status(500).json({ error: 'Errore durante l\'invio dell\'email di test.' });
                }

                return res.json({
                    success: true,
                    isTest: true,
                    target,
                    message: `Email di test inviata con successo a ${target}!`
                });
            }

            // Invio effettivo a tutti gli iscritti confermati
            const subscribers = await prisma.newsletterSubscriber.findMany({
                where: {
                    isConfirmed: true,
                    isActive: true
                }
            });

            if (subscribers.length === 0) {
                return res.status(400).json({
                    error: 'Nessun iscritto confermato trovato a cui inviare la newsletter.'
                });
            }

            // Invia in parallelo/batch a tutti gli iscritti
            let sentCount = 0;
            for (const sub of subscribers) {
                try {
                    await this.emailService.sendNewsletterEmail(sub.email, subject, content);
                    sentCount++;
                } catch (sendErr) {
                    console.error(`[NewsletterController] Errore invio a ${sub.email}:`, sendErr);
                }
            }

            // Salva nello storico campagne
            // @ts-ignore
            const sentBy = req.user?.email || 'Amministratore';
            const campaign = await prisma.newsletterCampaign.create({
                data: {
                    subject: subject.trim(),
                    preview: preview?.trim() || null,
                    content: content.trim(),
                    targetList: `${sentCount} iscritti confermati`,
                    sentBy
                }
            });

            res.json({
                success: true,
                isTest: false,
                sentCount,
                message: `Newsletter inviata con successo a ${sentCount} iscritti!`,
                campaign
            });
        } catch (error: any) {
            console.error('[NewsletterController] Errore invio newsletter:', error);
            res.status(500).json({ error: error.message || 'Errore durante l\'invio della newsletter.' });
        }
    }

    /**
     * Admin: elenco di tutti gli iscritti con statistiche.
     */
    async getSubscribers(req: Request, res: Response) {
        try {
            const subscribers = await prisma.newsletterSubscriber.findMany({
                orderBy: { subscribedAt: 'desc' }
            });

            const total = subscribers.length;
            const confirmed = subscribers.filter(s => s.isConfirmed && s.isActive).length;
            const pending = subscribers.filter(s => !s.isConfirmed).length;
            const unsubscribed = subscribers.filter(s => !s.isActive).length;

            res.json({
                stats: { total, confirmed, pending, unsubscribed },
                subscribers
            });
        } catch (error: any) {
            console.error('[NewsletterController] Errore caricamento iscritti:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Admin: elimina iscritto.
     */
    async deleteSubscriber(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id);
            await prisma.newsletterSubscriber.delete({
                where: { id }
            });
            res.json({ success: true, message: 'Iscritto eliminato.' });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Admin: storico delle newsletter inviate.
     */
    async getHistory(req: Request, res: Response) {
        try {
            const history = await prisma.newsletterCampaign.findMany({
                orderBy: { sentAt: 'desc' },
                take: 50
            });
            res.json(history);
        } catch (error: any) {
            console.error('[NewsletterController] Errore caricamento storico:', error);
            res.status(500).json({ error: error.message });
        }
    }
}
