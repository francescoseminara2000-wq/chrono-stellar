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
        const waStatus = whatsAppService.getStatus();
        let whatsAppSent = false;
        const targetPhone = order.customerPhone || order.user?.phone;

        whatsAppService.log('info', `[AdminController] notifyClientOfStatusUpdate called for Order #${order.id}: status="${status}", isConnected=${waStatus.isConnected}, targetPhone="${targetPhone || 'NONE'}"`);

        if (waStatus.isConnected && targetPhone) {
            whatsAppService.log('info', `[AdminController] Invoking sendOrderNotification for #${order.id} to ${targetPhone}...`);
            try {
                await whatsAppService.sendOrderNotification({ ...order, customerPhone: targetPhone }, status as any);
                whatsAppSent = true;
                whatsAppService.log('info', `[AdminController] WhatsApp notification succeeded for #${order.id}!`);
            } catch (err: any) {
                whatsAppService.log('error', `[AdminController] WhatsApp notification failed for #${order.id}: ${err?.message || err}`);
            }
        } else {
            whatsAppService.log('warn', `[AdminController] WhatsApp NOT sent for #${order.id}: isConnected=${waStatus.isConnected}, targetPhone=${targetPhone || 'NONE'}`);
        }

        if (!whatsAppSent && order.customerEmail) {
            console.log(`[AdminController] Sending Email notification for status ${status} to order #${order.id} (${order.customerEmail})`);
            await emailService.sendOrderStatusUpdateEmail(order.customerEmail, order, status);
        }
    } catch (err: any) {
        whatsAppService.log('error', `[AdminController] Failed to notify client of status update: ${err?.message || err}`);
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

    async resendApproval(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const order: any = await prisma.order.findUnique({
                where: { id: Number(id) },
                include: {
                    user: true,
                    items: {
                        include: {
                            product: true
                        }
                    }
                }
            });

            if (!order) {
                return res.status(404).json({ error: 'Ordine non trovato' });
            }

            if (!order.approvalToken) {
                const crypto = require('crypto');
                order.approvalToken = crypto.randomBytes(16).toString('hex');
                await prisma.order.update({
                    where: { id: Number(id) },
                    data: { approvalToken: order.approvalToken }
                });
            }

            await notifyClientOfStatusUpdate(order, 'WEIGHING_COMPLETED');

            res.json({ message: 'Sollecito inviato con successo al cliente!' });
        } catch (error: any) {
            console.error('[AdminController] Resend approval error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async updateStatus(req: Request, res: Response) {
        console.log('[AdminController] updateStatus request:', req.params, req.body);
        try {
            const { id } = req.params;
            const { status, adminNotes, forceNotify } = req.body;
            console.log(`[AdminController] Calling adminService.updateStatus(${id}, ${status})`);

            const currentOrder = await prisma.order.findUnique({ where: { id: Number(id) } });
            if (!currentOrder) {
                return res.status(404).json({ error: 'Ordine non trovato' });
            }
            const isStatusChanged = status && currentOrder.status !== status;
            whatsAppService.log('info', `[AdminController] Order #${id} updateStatus: currentStatus="${currentOrder.status}", targetStatus="${status}", isChanged=${isStatusChanged}, forceNotify=${Boolean(forceNotify)}`);

            const order = await adminService.updateStatus(Number(id), status || currentOrder.status, adminNotes);
            console.log('[AdminController] Order updated successfully:', order.id);

            // Auto-send WhatsApp/Email notification if status changed OR if forced
            if (isStatusChanged || forceNotify) {
                await notifyClientOfStatusUpdate(order, status || currentOrder.status);
            } else {
                whatsAppService.log('info', `[AdminController] Order #${id} notification skipped because status did not change and forceNotify was not set.`);
            }

            // Push Notification to customer
            if (order.userId && (isStatusChanged || forceNotify)) {
                try {
                    let pushBody = `Il tuo ordine #${order.id} è ora in stato ${status || order.status}.`;
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

    async notifyWhatsApp(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const order: any = await prisma.order.findUnique({
                where: { id: Number(id) },
                include: {
                    user: true,
                    items: {
                        include: {
                            product: true
                        }
                    }
                }
            });

            if (!order) {
                return res.status(404).json({ error: 'Ordine non trovato' });
            }

            const targetPhone = order.customerPhone || order.user?.phone;
            if (!targetPhone) {
                return res.status(400).json({ error: 'Nessun numero di telefono associato all\'ordine o al cliente' });
            }

            const targetStatus = status || order.status;
            whatsAppService.log('info', `[AdminController] Manual WhatsApp trigger for Order #${order.id} with status "${targetStatus}"`);
            await whatsAppService.sendOrderNotification({ ...order, customerPhone: targetPhone }, targetStatus);

            res.json({
                success: true,
                message: `Notifica WhatsApp inviata a ${targetPhone}!`,
                logs: whatsAppService.getLogs().slice(0, 5)
            });
        } catch (error: any) {
            whatsAppService.log('error', `[AdminController] Manual notifyWhatsApp failed for Order #${req.params.id}: ${error?.message || error}`);
            res.status(500).json({
                success: false,
                error: error.message || 'Errore durante l\'invio della notifica WhatsApp',
                logs: whatsAppService.getLogs().slice(0, 5)
            });
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
