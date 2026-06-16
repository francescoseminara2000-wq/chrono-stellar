import { Request, Response } from 'express';
import { OrderService } from '../services/OrderService';
import { PushService } from '../services/PushService';
import { prisma } from '../lib/prisma';

export class OrderController {
    private orderService: OrderService;
    private pushService: PushService;

    constructor() {
        this.orderService = new OrderService();
        this.pushService = new PushService();
    }

    async create(req: Request, res: Response) {
        try {
            const { userId, items, paymentMethod, deliveryMethod, shippingAddress, deliveryNotes, customerName, customerEmail, shippingCost, customerPhone, latitude, longitude } = req.body;

            // Validate minimal guest info
            if (!userId && (!customerName || !customerEmail)) {
                return res.status(400).json({ error: 'Customer name and email are required for guest checkout' });
            }

            const order = await this.orderService.createOrder(
                items,
                paymentMethod,
                { method: deliveryMethod, address: shippingAddress, notes: deliveryNotes, shippingCost, latitude, longitude },
                { userId, name: customerName, email: customerEmail, phone: customerPhone }
            );

            // Create admin notification
            try {
                const message = `L'ordine #${order.id} è stato inviato da ${customerName || 'un cliente'}.`;
                await prisma.notification.create({
                    data: {
                        type: 'NEW_ORDER',
                        title: 'Nuovo Ordine Ricevuto',
                        message,
                    }
                });

                // Invia Push agli admin
                await this.pushService.sendToAdmins('Nuovo Ordine Ricevuto', message, `/admin/orders?id=${order.id}`);
            } catch (notifyError) {
                console.error('Failed to create notification:', notifyError);
            }

            res.status(201).json(order);
        } catch (error: any) {
            console.error('Error creating order:', error);
            res.status(400).json({ error: error.message });
        }
    }
    async list(req: Request, res: Response) {
        try {
            const orders = await prisma.order.findMany({
                include: {
                    user: true,
                    items: {
                        include: {
                            product: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
            res.json(orders);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
    async listMyOrders(req: Request, res: Response) {
        try {
            // @ts-ignore - user is added by auth middleware
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const orders = await this.orderService.getUserOrders(userId);
            res.json(orders);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    async cancel(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user?.userId;
            const orderId = parseInt(req.params.id);

            if (!userId) return res.status(401).json({ error: 'Unauthorized' });
            if (isNaN(orderId)) return res.status(400).json({ error: 'Invalid order ID' });

            await this.orderService.cancelOrder(orderId, userId);
            res.json({ message: 'Order cancelled successfully' });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
}
