import { prisma } from '../lib/prisma';
import { OrderStatus } from '@prisma/client';

export class AdminService {

    /**
     * Fulfills an order by updating the actual quantities weighed.
     * Recalculates final total.
     */
    async fulfillOrder(orderId: number, actualQuantities: { orderItemId: number; quantityFulfilled: number }[]) {
        return await prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({
                where: { id: orderId },
                include: { items: true }
            });

            if (!order) throw new Error(`Ordine #${orderId} non trovato nel database.`);

            const allowedStatuses: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.WEIGHING_COMPLETED];
            if (!allowedStatuses.includes(order.status)) {
                throw new Error(`L'ordine #${orderId} non può essere pesato perché si trova in stato "${order.status}".`);
            }

            let finalTotal = 0;

            // Update each item
            for (const update of actualQuantities) {
                const item = order.items.find(i => i.id === update.orderItemId);
                if (!item) throw new Error(`Item ${update.orderItemId} not found in order ${orderId}`);

                // Update item quantity
                await tx.orderItem.update({
                    where: { id: item.id },
                    data: { quantityFulfilled: update.quantityFulfilled }
                });

                // Calculate item final price
                // Logic: priceAtPurchase * fulfilled quantity
                // Note: quantityFulfilled might be float (e.g. 1.5kg). priceAtPurchase is cents per unit.
                // We need to handle floating point math carefully.
                const itemTotal = item.priceAtPurchase * update.quantityFulfilled;
                finalTotal += itemTotal;
            }

            // Handle items that were NOT in the update array? 
            // For MVP, assume admin sends all variable weight items or we fulfill non-variable ones automatically.
            // Let's assume non-updated items are basically "fulfilled as ordered" IF they are not variable weight?
            // Or simply: strict requirement to send all.
            // Let's iterate over ALL items to be safe and use quantityOrdered if fulfilled is missing (for non-variable parts).

            // Re-fetch items or use logic above?
            // Better approach: Iterate over original items.

            finalTotal = 0; // Reset
            for (const item of order.items) {
                const update = actualQuantities.find(u => u.orderItemId === item.id);
                let qty = item.quantityOrdered.toNumber(); // Default to ordered

                if (update) {
                    qty = update.quantityFulfilled;
                } else {
                    // If not updated, verify if it needed weighing?
                    // For MVP, assume if not provided, it matches ordered (or we strictly require it).
                    // Let's set fulfilled = ordered for those not updated.
                    await tx.orderItem.update({
                        where: { id: item.id },
                        data: { quantityFulfilled: qty }
                    });
                }

                finalTotal += (item.priceAtPurchase * qty);
            }

            // Update Order
            const updatedOrder = await tx.order.update({
                where: { id: orderId },
                data: {
                    status: OrderStatus.WEIGHING_COMPLETED,
                    finalTotal: Math.round(finalTotal),
                },
                include: {
                    user: true,
                    items: {
                        include: {
                            product: true
                        }
                    }
                }
            });

            return updatedOrder;
        });
    }

    async updateStatus(orderId: number, status: OrderStatus, adminNotes?: string) {
        return prisma.order.update({
            where: { id: orderId },
            data: {
                status,
                ...(adminNotes !== undefined && { adminNotes })
            },
            include: {
                user: true,
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });
    }

    async getActiveDeliveries() {
        return prisma.order.findMany({
            where: {
                status: {
                    in: [
                        OrderStatus.PENDING,
                        OrderStatus.WEIGHING_COMPLETED,
                        OrderStatus.OUT_FOR_DELIVERY
                    ]
                },
                latitude: { not: null },
                longitude: { not: null }
            },
            select: {
                id: true,
                customerName: true,
                customerPhone: true,
                shippingAddress: true,
                status: true,
                latitude: true,
                longitude: true,
                finalTotal: true,
                estimatedTotal: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }
}
