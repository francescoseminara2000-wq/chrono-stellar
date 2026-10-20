import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { EmailService } from '../services/EmailService';

export class NewsletterController {
    private emailService: EmailService;

    constructor() {
        this.emailService = new EmailService();
    }

    /**
     * Iscrizione o cancellazione dalla Mailing List IONOS.
     */
    async subscribe(req: Request, res: Response) {
        try {
            const { email, action } = req.body;

            if (!email || !email.includes('@')) {
                return res.status(400).json({ error: 'Inserisci un indirizzo email valido.' });
            }

            const cleanEmail = email.trim().toLowerCase();
            const mode = action === 'unsubscribe' ? 'unsubscribe' : 'subscribe';

            // Invio a IONOS cgi-bin mailinglist
            const formParams = new URLSearchParams();
            formParams.append('subscribe_r', mode);
            formParams.append('mailaccount_r', cleanEmail);
            formParams.append('mailaccount2_r', cleanEmail);
            formParams.append('FBMLNAME', 'aggiornamenti@ortofruttabutti.it');
            formParams.append('FBLANG', 'it');
            formParams.append('FBURLERROR_L', 'https://ml.kundenserver.de/mailinglist/error.it.html');
            formParams.append('FBURLSUBSCRIBE_L', 'https://ml.kundenserver.de/mailinglist/subscribe.it.html');
            formParams.append('FBURLUNSUBSCRIBE_L', 'https://ml.kundenserver.de/mailinglist/unsubscribe.it.html');
            formParams.append('FBURLINVALID_L', 'https://ml.kundenserver.de/mailinglist/invalid.it.html');

            const ionosRes = await (globalThis as any).fetch('https://ml.kundenserver.de/cgi-bin/mailinglist.cgi', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'ChronoStellarNewsletter/1.0'
                },
                body: formParams.toString()
            });

            console.log(`[NewsletterController] Inviata richiesta ${mode} per ${cleanEmail} a IONOS, status: ${ionosRes.status}`);

            const successMessage = mode === 'unsubscribe'
                ? 'Richiesta di cancellazione inviata! Controlla la tua casella di posta per confermare la rimozione.'
                : 'Ti abbiamo inviato un\'email di conferma: clicca sul link all\'interno per attivare la tua iscrizione!';

            res.json({
                success: true,
                message: successMessage,
                mode
            });
        } catch (error: any) {
            console.error('[NewsletterController] Errore richiesta newsletter:', error);
            res.status(500).json({ error: 'Impossibile completare la richiesta. Riprova più tardi.' });
        }
    }

    /**
     * Admin: invio di una comunicazione / newsletter a tutta la lista o come test.
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

            // Destinatario: testEmail o indirizzo della mailing list IONOS
            const target = isTest
                ? (testEmail || 'noreply@ortofruttabutti.it')
                : 'aggiornamenti@ortofruttabutti.it';

            const sent = await this.emailService.sendNewsletterEmail(
                target,
                isTest ? `[PROVA] ${subject}` : subject,
                content
            );

            if (!sent) {
                return res.status(500).json({ error: 'Errore durante l\'invio dell\'email via SMTP IONOS.' });
            }

            // Se è un invio effettivo alla lista, registriamo la campagna nello storico
            let campaign = null;
            if (!isTest) {
                // @ts-ignore
                const sentBy = req.user?.email || 'Amministratore';
                campaign = await prisma.newsletterCampaign.create({
                    data: {
                        subject: subject.trim(),
                        preview: preview?.trim() || null,
                        content: content.trim(),
                        targetList: target,
                        sentBy
                    }
                });
            }

            res.json({
                success: true,
                isTest: Boolean(isTest),
                target,
                message: isTest
                    ? `Email di prova inviata con successo a ${target}!`
                    : `Newsletter inviata con successo a tutta la lista (${target})!`,
                campaign
            });
        } catch (error: any) {
            console.error('[NewsletterController] Errore invio newsletter:', error);
            res.status(500).json({ error: error.message || 'Errore durante l\'invio della newsletter.' });
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
