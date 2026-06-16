import webpush from 'web-push';
import { prisma } from '../lib/prisma';

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@chrono-stellar.it';

webpush.setVapidDetails(
    vapidEmail,
    vapidPublicKey,
    vapidPrivateKey
);

export class PushService {
    /**
     * Invia una notifica push a tutti i dispositivi di un utente
     */
    async sendToUser(userId: number, title: string, body: string, url: string = '/') {
        try {
            const subscriptions = await prisma.pushSubscription.findMany({
                where: { userId }
            });

            if (subscriptions.length === 0) return;

            const payload = JSON.stringify({ title, body, url });

            const promises = subscriptions.map(async (sub) => {
                const pushSubscription = {
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth
                    }
                };

                try {
                    await webpush.sendNotification(pushSubscription, payload);
                } catch (error: any) {
                    if (error.statusCode === 410 || error.statusCode === 404) {
                        // Sottoscrizione non più valida, rimuovila
                        console.log(`[PushService] Rimuovo sottoscrizione scaduta: ${sub.endpoint}`);
                        await prisma.pushSubscription.delete({ where: { id: sub.id } });
                    } else {
                        console.error('[PushService] Errore invio push:', error);
                    }
                }
            });

            await Promise.all(promises);
        } catch (error) {
            console.error('[PushService] Errore generale sendToUser:', error);
        }
    }

    /**
     * Invia una notifica push a tutti gli amministratori
     */
    async sendToAdmins(title: string, body: string, url: string = '/admin') {
        try {
            const admins = await prisma.user.findMany({
                where: { role: 'ADMIN' },
                select: { id: true }
            });

            const adminIds = admins.map(admin => admin.id);

            const subscriptions = await prisma.pushSubscription.findMany({
                where: {
                    userId: { in: adminIds }
                }
            });

            if (subscriptions.length === 0) return;

            const payload = JSON.stringify({ title, body, url });

            const promises = subscriptions.map(async (sub) => {
                const pushSubscription = {
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth
                    }
                };

                try {
                    await webpush.sendNotification(pushSubscription, payload);
                } catch (error: any) {
                    if (error.statusCode === 410 || error.statusCode === 404) {
                        await prisma.pushSubscription.delete({ where: { id: sub.id } });
                    }
                }
            });

            await Promise.all(promises);
        } catch (error) {
            console.error('[PushService] Errore generale sendToAdmins:', error);
        }
    }
}
