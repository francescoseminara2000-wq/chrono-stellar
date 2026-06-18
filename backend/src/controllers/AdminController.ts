import { Request, Response } from 'express';
import { AdminService } from '../services/AdminService';
import { WhatsAppService } from '../services/WhatsAppService';
import { PushService } from '../services/PushService';
import { prisma } from '../lib/prisma';
import { EmailService } from '../services/EmailService';

const adminService = new AdminService();
const whatsAppService = WhatsAppService.getInstance();
const pushService = new PushService();
const emailService = new EmailService();

async function notifyClientOfStatusUpdate(order: any, status: string) {
    try {
        let preference = 'EMAIL';
        if (order.userId) {
            const user = await prisma.user.findUnique({ where: { id: order.userId } });
            if (user && user.notificationPreference) {
                preference = user.notificationPreference;
            }
        }

        const waStatus = whatsAppService.getStatus();

        if (preference === 'WHATSAPP' && order.customerPhone && waStatus.isConnected) {
            console.log(`[AdminController] Sending WhatsApp notification for status ${status} to order #${order.id}`);
            try {
                await whatsAppService.sendOrderNotification(order, status as any);
            } catch (err) {
                console.error('WhatsApp notification failed, falling back to email:', err);
                if (order.customerEmail) {
                    await emailService.sendOrderStatusUpdateEmail(order.customerEmail, order, status);
                }
            }
        } else if (order.customerEmail) {
            console.log(`[AdminController] Sending Email notification for status ${status} to order #${order.id}`);
            await emailService.sendOrderStatusUpdateEmail(order.customerEmail, order, status);
        }
    } catch (err) {
        console.error('Failed to notify client:', err);
    }
}

export class AdminController {
    async fulfill(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { items } = req.body; // Changed from actualQuantities to items to match frontend

            const order = await adminService.fulfillOrder(Number(id), items);

            // Auto-send WhatsApp/Email notification
            await notifyClientOfStatusUpdate(order, 'WEIGHING_COMPLETED');

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

            const currentOrder = await prisma.order.findUnique({ where: { id: Number(id) } });
            if (!currentOrder) {
                return res.status(404).json({ error: 'Ordine non trovato' });
            }
            const isStatusChanged = status && currentOrder.status !== status;

            const order = await adminService.updateStatus(Number(id), status || currentOrder.status, adminNotes);
            console.log('[AdminController] Order updated successfully:', order.id);

            if (isStatusChanged) {
                // Auto-send WhatsApp/Email notification
                await notifyClientOfStatusUpdate(order, status);

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

    async bulkUpdateStatus(req: Request, res: Response) {
        try {
            const { ids, status } = req.body; // Expecting { ids: number[], status: string }
            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ error: 'IDs array is required' });
            }

            const updatedOrders = [];
            for (const id of ids) {
                try {
                    const order = await adminService.updateStatus(Number(id), status);
                    updatedOrders.push(order);

                    // Send WhatsApp/Email notification
                    await notifyClientOfStatusUpdate(order, status);

                    // Push Notification to customer
                    if (order.userId) {
                        try {
                            let pushBody = `Il tuo ordine #${order.id} è ora in stato ${status}.`;
                            if (status === 'OUT_FOR_DELIVERY') pushBody = `Il tuo ordine #${order.id} è in consegna! 🚚`;
                            if (status === 'DELIVERED') pushBody = `Il tuo ordine #${order.id} è stato consegnato. Grazie!`;
                            if (status === 'CANCELLED') pushBody = `Il tuo ordine #${order.id} è stato annullato.`;

                            await pushService.sendToUser(order.userId, 'Aggiornamento Ordine', pushBody, `/orders?id=${order.id}`);
                        } catch (pushError) {
                            console.error(`[AdminController] Bulk push notification failed for order #${order.id}:`, pushError);
                        }
                    }
                } catch (err) {
                    console.error(`[AdminController] Error updating order #${id} in bulk:`, err);
                }
            }

            res.json({ message: `Updated ${updatedOrders.length} orders`, count: updatedOrders.length });
        } catch (error: any) {
            console.error('[AdminController] bulkUpdateStatus error:', error);
            res.status(400).json({ error: error.message });
        }
    }
}
