import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class PushController {
    /**
     * Salva una nuova sottoscrizione push per l'utente loggato
     */
    async subscribe(req: any, res: Response) {
        try {
            const { subscription } = req.body;
            const userId = req.user?.userId;

            if (!subscription || !subscription.endpoint) {
                return res.status(400).json({ error: 'Sottoscrizione non valida' });
            }

            // Estrai le chiavi
            const { endpoint, keys } = subscription;
            const { p256dh, auth } = keys;

            // Salva o aggiorna la sottoscrizione
            await prisma.pushSubscription.upsert({
                where: { endpoint },
                update: {
                    userId: userId || null,
                    p256dh,
                    auth
                },
                create: {
                    endpoint,
                    p256dh,
                    auth,
                    userId: userId || null
                }
            });

            res.status(201).json({ success: true });
        } catch (error: any) {
            console.error('[PushController] Error in subscribe:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Ritorna la chiave pubblica VAPID per il frontend
     */
    async getPublicKey(req: Request, res: Response) {
        const publicKey = process.env.VAPID_PUBLIC_KEY;
        if (!publicKey) {
            return res.status(500).json({ error: 'VAPID public key not configured' });
        }
        res.json({ publicKey });
    }
}
