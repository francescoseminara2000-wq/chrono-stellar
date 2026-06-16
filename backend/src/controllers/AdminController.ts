import { Request, Response } from 'express';
import { AdminService } from '../services/AdminService';
import { WhatsAppService } from '../services/WhatsAppService';
import { PushService } from '../services/PushService';

const adminService = new AdminService();
const whatsAppService = WhatsAppService.getInstance();
const pushService = new PushService();

export class AdminController {
    async fulfill(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { items } = req.body; // Changed from actualQuantities to items to match frontend

            const order = await adminService.fulfillOrder(Number(id), items);

            // Auto-send WhatsApp if connected
            const waStatus = whatsAppService.getStatus();
            console.log(`[AdminController] Fulfill Order ID: ${order.id}, Phone: ${order.customerPhone}, WA Connected: ${waStatus.isConnected}`);

            if (waStatus.isConnected && order.customerPhone) {
                console.log('[AdminController] Triggering WhatsApp notification (WEIGHING_COMPLETED)...');
                // @ts-ignore
                try {
                    await whatsAppService.sendOrderNotification(order, 'WEIGHING_COMPLETED');
                } catch (waError) {
                    console.error('[AdminController] WhatsApp notification failed (non-blocking):', waError);
                }
            }

            // Push Notification to customer
            if (order.userId) {
                try {
                    await pushService.sendToUser(
                        order.userId,
                        'Aggiornamento Ordine',
                        `Il tuo ordine #${order.id} è stato pesato. Totale finale: €${(order.finalTotal || 0) / 100}`,
                        `/orders?id=${order.id}`
                    );
                } catch (pushError) {
                    console.error('[AdminController] Push notification failed:', pushError);
                }
            }

            res.json(order);
        } catch (error: any) {
            console.error('[AdminController] Fulfill error details:', error);
            res.status(400).json({
                error: error.message,
                stack: error.stack,
                receivedId: req.params.id,
                receivedItems: req.body.items
            });
        }
    }

    async updateStatus(req: Request, res: Response) {
        console.log('[AdminController] updateStatus request:', req.params, req.body);
        try {
            const { id } = req.params;
            const { status, adminNotes } = req.body;
            console.log(`[AdminController] Calling adminService.updateStatus(${id}, ${status})`);

            const order = await adminService.updateStatus(Number(id), status, adminNotes);
            console.log('[AdminController] Order updated successfully:', order.id);

            // Auto-send WhatsApp if connected
            const waStatus = whatsAppService.getStatus();
            console.log(`[AdminController] WhatsApp Status - Connected: ${waStatus.isConnected}, Phone: ${order.customerPhone}`);

            if (waStatus.isConnected && order.customerPhone) {
                console.log('[AdminController] Triggering WhatsApp notification...');
                // @ts-ignore
                try {
                    await whatsAppService.sendOrderNotification(order, status);
                } catch (waError) {
                    console.error('[AdminController] WhatsApp notification failed (non-blocking):', waError);
                }
            }

            // Push Notification to customer
            if (order.userId) {
                try {
                    let pushBody = `Il tuo ordine #${order.id} è ora in stato ${status}.`;
                    if (status === 'OUT_FOR_DELIVERY') pushBody = `Il tuo ordine #${order.id} è in consegna! 🚚`;
                    if (status === 'DELIVERED') pushBody = `Il tuo ordine #${order.id} è stato consegnato. Grazie!`;
                    if (status === 'CANCELLED') pushBody = `Il tuo ordine #${order.id} è stato annullato.`;

                    await pushService.sendToUser(order.userId, 'Aggiornamento Ordine', pushBody, `/orders?id=${order.id}`);
                } catch (pushError) {
                    console.error('[AdminController] Push notification failed:', pushError);
                }
            }

            res.json(order);
        } catch (error: any) {
            console.error('[AdminController] Error in updateStatus:', error);
            res.status(400).json({ error: error.message, stack: error.stack });
        }
    }

    async getDeliveryMap(req: Request, res: Response) {
        try {
            const deliveries = await adminService.getActiveDeliveries();
            res.json(deliveries);
        } catch (error: any) {
            console.error('[AdminController] getDeliveryMap error:', error);
            res.status(500).json({ error: error.message });
        }
    }
}
