import { prisma } from '../lib/prisma';
import { WhatsAppService } from './WhatsAppService';
import { PaymentStrategy } from '../domain/payment/PaymentStrategy';
import { CashOnDeliveryStrategy } from '../infrastructure/payment/CodStrategy';
import { PrismaClient, Prisma, OrderStatus } from '@prisma/client';

export class OrderService {
    private paymentStrategies: Map<string, PaymentStrategy>;

    constructor() {
        this.paymentStrategies = new Map();
        // Register strategies
        const cod = new CashOnDeliveryStrategy();
        this.paymentStrategies.set(cod.name, cod);
    }

    async createOrder(
        items: { id: number; quantity: number }[],
        paymentMethod: string,
        deliveryDetails: { method: string; address?: string; notes?: string; shippingCost?: number; latitude?: number; longitude?: number; scheduledDate?: string },
        customerDetails: { userId?: number; name?: string; email?: string; phone?: string }
    ) {
        const strategy = this.paymentStrategies.get(paymentMethod);
        if (!strategy) {
            throw new Error(`Invalid payment method: ${paymentMethod}`);
        }

        // 1. Calculate totals
        let estimatedTotal = 0;
        const orderItemsData: {
            productId: number;
            priceAtPurchase: number;
            quantityOrdered: Prisma.Decimal;
            quantityFulfilled: Prisma.Decimal | null;
        }[] = [];

        for (const item of items) {
            const product = await prisma.product.findUnique({ where: { id: item.id } });
            if (!product) throw new Error(`Product ${item.id} not found`);
            if (!product.isAvailable) throw new Error(`Product ${product.name} is not available`);

            const quantity = new Prisma.Decimal(item.quantity);

            // Stock Check Enforcement
            if (!product.allowBackorder && product.stockQuantity.lessThan(quantity)) {
                throw new Error(`Quantità non disponibile per ${product.name}. Disponibili: ${product.stockQuantity} ${product.unitType}`);
            }

            const multiplier = (product.isVariableWeight && product.unitType === 'PZ') ? product.stepAmount.toNumber() : 1;
            const lineTotal = product.priceCents * item.quantity * multiplier;

            estimatedTotal += lineTotal;
            orderItemsData.push({
                productId: product.id,
                priceAtPurchase: product.priceCents,
                quantityOrdered: quantity,
                quantityFulfilled: product.isVariableWeight ? null : quantity
            });
        }

        // Add shipping cost if applicable
        const shippingCost = deliveryDetails.shippingCost || 0;
        estimatedTotal += shippingCost;

        // Geocoding fallback if coordinates are not set
        let finalLat = deliveryDetails.latitude;
        let finalLng = deliveryDetails.longitude;

        if (deliveryDetails.method === 'DELIVERY' && (finalLat === undefined || finalLng === undefined || finalLat === null || finalLng === null) && deliveryDetails.address && deliveryDetails.address !== 'PICKUP') {
            try {
                const queryAddress = deliveryDetails.address.replace(/\s*-\s*/g, ', ');
                const response = await (globalThis as any).fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(queryAddress)}&format=json&limit=1`, {
                    headers: { 'User-Agent': 'ChronoStellarApp/1.0 (contact@chronostellar.com)' }
                });
                if (response.ok) {
                    const results = await response.json() as any;
                    if (results && results.length > 0) {
                        finalLat = parseFloat(results[0].lat);
                        finalLng = parseFloat(results[0].lon);
                        console.log(`[Geocoding] Auto-assigned coordinates for address "${queryAddress}": lat=${finalLat}, lng=${finalLng}`);
                    } else {
                        console.warn(`[Geocoding] No results found for address "${queryAddress}"`);
                    }
                }
            } catch (err) {
                console.error('[Geocoding] Error during order creation geocoding:', err);
            }
        }

        // 2. Create Order and Update Stock
        const order = await prisma.$transaction(async (tx) => {
            // Create the order
            const newOrder = await tx.order.create({
                data: {
                    userId: customerDetails.userId || null,
                    customerName: customerDetails.name,
                    customerEmail: customerDetails.email,
                    customerPhone: customerDetails.phone,
                    status: OrderStatus.PENDING,
                    estimatedTotal: Math.round(estimatedTotal),
                    deliveryMethod: deliveryDetails.method as any,
                    shippingAddress: deliveryDetails.address,
                    deliveryNotes: deliveryDetails.notes,
                    latitude: finalLat,
                    longitude: finalLng,
                    shippingCost: shippingCost,
                    scheduledDate: deliveryDetails.scheduledDate || null,
                    items: {
                        create: orderItemsData,
                    },
                },
                include: {
                    items: {
                        include: {
                            product: true
                        }
                    }
                }
            });

            // Decrement stock for each item
            for (const item of items) {
                await tx.product.update({
                    where: { id: item.id },
                    data: {
                        stockQuantity: {
                            decrement: new Prisma.Decimal(item.quantity)
                        }
                    }
                });
            }

            return newOrder;
        });

        // Fetch user preferences if user is registered
        let sendWhatsApp = false;
        let sendEmail = true;

        if (order.userId) {
            const user = await prisma.user.findUnique({ where: { id: order.userId } });
            if (user?.notificationPreference === 'WHATSAPP') {
                sendWhatsApp = true;
                sendEmail = false;
            }
        }

        // Trigger notifications based on preference
        if (sendWhatsApp && order.customerPhone) {
            try {
                const whatsAppService = WhatsAppService.getInstance();
                await whatsAppService.sendOrderNotification(order, 'CREATED');
            } catch (error) {
                console.error('Failed to send order confirmation WhatsApp message:', error);
            }
        } else if (sendEmail && order.customerEmail) {
            try {
                const EmailService = require('./EmailService').EmailService;
                const emailService = new EmailService();
                await emailService.sendOrderConfirmationEmail(order.customerEmail, order);
            } catch (error) {
                console.error('Failed to send order confirmation email:', error);
            }
        }

        return order;
    }
    async getUserOrders(userId: number) {
        return prisma.order.findMany({
            where: { userId },
            include: {
                items: {
                    include: {
                        product: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async cancelOrder(orderId: number, userId: number) {
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order) throw new Error('Order not found');
        if (order.userId !== userId) throw new Error('Unauthorized');

        if (order.status !== OrderStatus.PENDING) {
            throw new Error('Order cannot be cancelled in its current state');
        }

        return prisma.order.update({
            where: { id: orderId },
            data: { status: OrderStatus.CANCELLED }
        });
    }
}
