import { Request, Response } from 'express';
import { GiftCardService } from '../services/GiftCardService';
import { prisma } from '../lib/prisma';

export class GiftCardController {
    private giftCardService: GiftCardService;

    constructor() {
        this.giftCardService = new GiftCardService();
    }

    /**
     * Acquisto / Creazione di una Gift Card.
     */
    async buy(req: Request, res: Response) {
        try {
            const {
                amountCents,
                buyerName,
                buyerEmail,
                recipientName,
                recipientEmail,
                recipientPhone,
                customMessage
            } = req.body;

            // @ts-ignore - aggiunto da auth middleware se loggato
            const purchaserId = req.user?.userId || null;

            if (!amountCents || amountCents <= 0) {
                return res.status(400).json({ error: 'Importo non valido.' });
            }

            const giftCard = await this.giftCardService.createGiftCard({
                amountCents: Math.round(amountCents),
                buyerName,
                buyerEmail,
                recipientName,
                recipientEmail,
                recipientPhone,
                customMessage,
                purchaserId,
                sendEmailNow: true
            });

            // Notifica admin
            try {
                const message = `È stata acquistata una Gift Card da €${(giftCard.amount / 100).toFixed(2)} (Codice: ${giftCard.code})`;
                await prisma.notification.create({
                    data: {
                        type: 'GIFT_CARD_PURCHASE',
                        title: 'Nuova Gift Card Emessa',
                        message
                    }
                });
            } catch (err) {
                console.error('[GiftCardController] Errore creazione notifica admin:', err);
            }

            res.status(201).json({
                success: true,
                giftCard: {
                    id: giftCard.id,
                    code: giftCard.code,
                    amount: giftCard.amount,
                    buyerName: giftCard.buyerName,
                    recipientName: giftCard.recipientName,
                    recipientEmail: giftCard.recipientEmail,
                    createdAt: giftCard.createdAt
                },
                pdfDownloadUrl: `/api/gift-cards/${giftCard.code}/pdf`
            });
        } catch (error: any) {
            console.error('[GiftCardController] Error creating gift card:', error);
            res.status(400).json({ error: error.message });
        }
    }

    /**
     * Riscatto della Gift Card e accredito nel saldo dell'utente loggato.
     */
    async redeem(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Devi essere autenticato per riscattare un buono.' });
            }

            const { code } = req.body;
            if (!code) {
                return res.status(400).json({ error: 'Codice Gift Card mancante.' });
            }

            const result = await this.giftCardService.redeemGiftCard(code, userId);
            res.json(result);
        } catch (error: any) {
            console.error('[GiftCardController] Error redeeming gift card:', error);
            res.status(400).json({ error: error.message });
        }
    }

    /**
     * Download / visualizzazione del PDF della Gift Card.
     */
    async downloadPdf(req: Request, res: Response) {
        try {
            const { code } = req.params;
            if (!code) {
                return res.status(400).json({ error: 'Codice mancante.' });
            }

            const pdfBuffer = await this.giftCardService.getGiftCardPdfBuffer(code);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="gift-card-${code.toUpperCase()}.pdf"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            res.end(pdfBuffer);
        } catch (error: any) {
            console.error('[GiftCardController] Error downloading PDF:', error);
            res.status(404).json({ error: error.message || 'Gift card non trovata' });
        }
    }

    /**
     * Visualizzazione Saldo e Storico transazioni del Wallet utente.
     */
    async getWallet(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Non autorizzato' });
            }

            const wallet = await this.giftCardService.getUserWallet(userId);
            res.json(wallet);
        } catch (error: any) {
            console.error('[GiftCardController] Error fetching wallet:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Admin: elenco di tutte le Gift Card.
     */
    async adminList(req: Request, res: Response) {
        try {
            const list = await this.giftCardService.listAllGiftCards();
            res.json(list);
        } catch (error: any) {
            console.error('[GiftCardController] Error listing gift cards:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Admin: creazione manuale di una Gift Card (omaggi, promozioni, promo clienti).
     */
    async adminCreate(req: Request, res: Response) {
        try {
            const { amountCents, recipientName, recipientEmail, customMessage, sendEmail } = req.body;

            if (!amountCents || amountCents <= 0) {
                return res.status(400).json({ error: 'Importo non valido' });
            }

            const giftCard = await this.giftCardService.createGiftCard({
                amountCents: Math.round(amountCents),
                buyerName: 'Amministrazione Store',
                buyerEmail: 'noreply@ortofruttabutti.it',
                recipientName,
                recipientEmail,
                customMessage,
                sendEmailNow: sendEmail !== false
            });

            res.status(201).json(giftCard);
        } catch (error: any) {
            console.error('[GiftCardController] Error admin create gift card:', error);
            res.status(400).json({ error: error.message });
        }
    }
}
