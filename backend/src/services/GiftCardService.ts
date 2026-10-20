import { prisma } from '../lib/prisma';
import crypto from 'crypto';
import { GiftCardPdfService } from './GiftCardPdfService';
import { EmailService } from './EmailService';
import { WhatsAppService } from './WhatsAppService';
import { WalletTxType } from '@prisma/client';

export interface CreateGiftCardInput {
    amountCents: number;
    buyerName?: string;
    buyerEmail?: string;
    recipientName?: string;
    recipientEmail?: string;
    recipientPhone?: string;
    customMessage?: string;
    purchaserId?: number;
    expiresAt?: Date | null;
    sendEmailNow?: boolean;
}

export class GiftCardService {
    private emailService: EmailService;

    constructor() {
        this.emailService = new EmailService();
    }

    /**
     * Genera un codice univoco nel formato GIFT-XXXX-YYYY (escludendo caratteri ambigui come 0, O, 1, I).
     */
    public async generateUniqueCode(): Promise<string> {
        const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
        let isUnique = false;
        let code = '';

        while (!isUnique) {
            let part1 = '';
            let part2 = '';
            const randomBytes = crypto.randomBytes(8);
            for (let i = 0; i < 4; i++) {
                part1 += chars[randomBytes[i] % chars.length];
                part2 += chars[randomBytes[i + 4] % chars.length];
            }
            code = `GIFT-${part1}-${part2}`;

            const existing = await prisma.giftCard.findUnique({
                where: { code }
            });
            if (!existing) {
                isUnique = true;
            }
        }

        return code;
    }

    /**
     * Crea e registra una nuova Gift Card nel DB, genera il PDF e opzionalmente invia le notifiche.
     */
    public async createGiftCard(input: CreateGiftCardInput) {
        if (!input.amountCents || input.amountCents <= 0) {
            throw new Error('Importo non valido per la Gift Card');
        }

        const code = await this.generateUniqueCode();

        const giftCard = await prisma.giftCard.create({
            data: {
                code,
                amount: Math.round(input.amountCents),
                buyerName: input.buyerName?.trim() || null,
                buyerEmail: input.buyerEmail?.trim() || null,
                recipientName: input.recipientName?.trim() || null,
                recipientEmail: input.recipientEmail?.trim() || null,
                recipientPhone: input.recipientPhone?.trim() || null,
                customMessage: input.customMessage?.trim() || null,
                purchaserId: input.purchaserId || null,
                expiresAt: input.expiresAt || null,
                isRedeemed: false
            }
        });

        // Genera il PDF
        let pdfBuffer: Buffer | null = null;
        try {
            pdfBuffer = await GiftCardPdfService.generateGiftCardPdf({
                code: giftCard.code,
                amountCents: giftCard.amount,
                buyerName: giftCard.buyerName,
                recipientName: giftCard.recipientName,
                customMessage: giftCard.customMessage,
                expiresAt: giftCard.expiresAt
            });
        } catch (pdfErr) {
            console.error('[GiftCardService] Errore generazione PDF:', pdfErr);
        }

        const formattedAmount = (giftCard.amount / 100).toLocaleString('it-IT', {
            style: 'currency',
            currency: 'EUR'
        });

        // Invia email al destinatario se richiesta e presente email
        if (input.sendEmailNow !== false && giftCard.recipientEmail && pdfBuffer) {
            try {
                await this.emailService.sendGiftCardEmail(
                    giftCard.recipientEmail,
                    giftCard.recipientName || 'Amico',
                    giftCard.buyerName || 'Un acquirente',
                    formattedAmount,
                    giftCard.code,
                    giftCard.customMessage,
                    pdfBuffer
                );
            } catch (mailErr) {
                console.error('[GiftCardService] Errore invio email al destinatario:', mailErr);
            }
        }

        // Se l'acquirente ha specificato una propria email diversa dal destinatario, manda una copia di conferma
        if (input.sendEmailNow !== false && giftCard.buyerEmail && giftCard.buyerEmail !== giftCard.recipientEmail && pdfBuffer) {
            try {
                await this.emailService.sendGiftCardEmail(
                    giftCard.buyerEmail,
                    giftCard.buyerName || 'Cliente',
                    'Ortofrutta Butti',
                    formattedAmount,
                    giftCard.code,
                    `Ecco la ricevuta e il voucher della Gift Card che hai acquistato per ${giftCard.recipientName || 'un amico'}.`,
                    pdfBuffer
                );
            } catch (buyerMailErr) {
                console.error('[GiftCardService] Errore invio email copia acquirente:', buyerMailErr);
            }
        }

        // Invia notifica WhatsApp se presente numero destinatario e WhatsApp è connesso
        if (giftCard.recipientPhone) {
            try {
                const waService = WhatsAppService.getInstance();
                if (waService.getStatus().isConnected) {
                    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
                    const redeemUrl = `${frontendUrl}/profilo?redeem=${encodeURIComponent(giftCard.code)}`;
                    const waText = `🎁 Ciao ${giftCard.recipientName || ''}! Hai ricevuto un Buono Regalo da ${giftCard.buyerName || 'un amico'} del valore di ${formattedAmount}!\n\n` +
                        (giftCard.customMessage ? `"${giftCard.customMessage}"\n\n` : '') +
                        `Codice: *${giftCard.code}*\n` +
                        `Caricalo subito sul tuo saldo cliccando qui:\n${redeemUrl}`;
                    await waService.sendMessage(giftCard.recipientPhone, waText);
                }
            } catch (waErr) {
                console.warn('[GiftCardService] Impossibile inviare notifica WhatsApp:', waErr);
            }
        }

        return { ...giftCard, pdfBuffer };
    }

    /**
     * Riscatta e accredita la Gift Card nel saldo dell'utente loggato.
     */
    public async redeemGiftCard(rawCode: string, userId: number) {
        if (!rawCode || !rawCode.trim()) {
            throw new Error('Codice Gift Card obbligatorio.');
        }

        const code = rawCode.trim().toUpperCase();

        const result = await prisma.$transaction(async (tx) => {
            const card = await tx.giftCard.findUnique({
                where: { code }
            });

            if (!card) {
                throw new Error('Codice Gift Card non trovato. Verifica di aver digitato correttamente il codice.');
            }

            if (card.isRedeemed) {
                const dateStr = card.redeemedAt
                    ? new Date(card.redeemedAt).toLocaleDateString('it-IT')
                    : '';
                throw new Error(`Questa Gift Card è già stata caricata e utilizzata${dateStr ? ' il ' + dateStr : ''}.`);
            }

            if (card.expiresAt && new Date() > new Date(card.expiresAt)) {
                throw new Error('Questa Gift Card è scaduta e non può più essere riscattata.');
            }

            // 1. Marca la Gift Card come riscattata
            const updatedCard = await tx.giftCard.update({
                where: { id: card.id },
                data: {
                    isRedeemed: true,
                    redeemedAt: new Date(),
                    redeemedById: userId
                }
            });

            // 2. Incrementa il saldo dell'utente
            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: {
                    walletBalance: {
                        increment: card.amount
                    }
                }
            });

            // 3. Registra il movimento nel registro contabile del Wallet
            const walletTx = await tx.walletTransaction.create({
                data: {
                    userId: userId,
                    amount: card.amount,
                    balanceAfter: updatedUser.walletBalance,
                    type: WalletTxType.GIFT_CARD_REDEMPTION,
                    referenceId: card.code,
                    description: `Ricarica saldo da Buono Regalo ${card.code}`
                }
            });

            return {
                card: updatedCard,
                user: updatedUser,
                walletTx
            };
        });

        return {
            success: true,
            code: result.card.code,
            amountRedeemed: result.card.amount,
            newBalance: result.user.walletBalance,
            message: `Fantastico! Sono stati accreditati ${(result.card.amount / 100).toFixed(2)} € sul tuo saldo.`
        };
    }

    /**
     * Restituisce il saldo attuale e lo storico movimenti del wallet dell'utente.
     */
    public async getUserWallet(userId: number) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                walletBalance: true
            }
        });

        if (!user) {
            throw new Error('Utente non trovato');
        }

        const transactions = await prisma.walletTransaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        return {
            balance: user.walletBalance,
            formattedBalance: (user.walletBalance / 100).toLocaleString('it-IT', {
                style: 'currency',
                currency: 'EUR'
            }),
            transactions
        };
    }

    /**
     * Genera il PDF del voucher a partire dal codice della Gift Card.
     */
    public async getGiftCardPdfBuffer(code: string): Promise<Buffer> {
        const card = await prisma.giftCard.findUnique({
            where: { code: code.trim().toUpperCase() }
        });

        if (!card) {
            throw new Error('Gift Card non trovata');
        }

        return GiftCardPdfService.generateGiftCardPdf({
            code: card.code,
            amountCents: card.amount,
            buyerName: card.buyerName,
            recipientName: card.recipientName,
            customMessage: card.customMessage,
            expiresAt: card.expiresAt
        });
    }

    /**
     * Elenco di tutte le Gift Card per il pannello di amministrazione.
     */
    public async listAllGiftCards() {
        return prisma.giftCard.findMany({
            include: {
                redeemedBy: {
                    select: { id: true, name: true, email: true }
                },
                purchaser: {
                    select: { id: true, name: true, email: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }
}
