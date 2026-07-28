import { prisma } from '../lib/prisma';
import { OrderStatus } from '@prisma/client';

export class AdminService {

    /**
     * Fulfills an order by updating the actual quantities weighed.
     * Recalculates final total.
     */
    async fulfillOrder(orderId: number, actualQuantities: { orderItemId: number; quantityFulfilled: number; priceAtPurchase?: number }[]) {
        return await prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({
                where: { id: orderId },
                include: { items: true }
            });

            if (!order) throw new Error(`Ordine #${orderId} non trovato nel database.`);

            const allowedStatuses: OrderStatus[] = [
                OrderStatus.PENDING, 
                OrderStatus.WEIGHING_COMPLETED,
                OrderStatus.OUT_FOR_DELIVERY
            ];
            if (!allowedStatuses.includes(order.status)) {
                throw new Error(`L'ordine #${orderId} non può essere modificato perché si trova in stato "${order.status}".`);
            }

            let finalTotal = 0;

            for (const item of order.items) {
                const update = actualQuantities.find(u => u.orderItemId === item.id);
                let qty = item.quantityOrdered.toNumber(); // Default to ordered
                let priceCents = item.priceAtPurchase;

                if (update) {
                    if (typeof update.quantityFulfilled === 'number' && !isNaN(update.quantityFulfilled)) {
                        qty = update.quantityFulfilled;
                    }
                    if (typeof update.priceAtPurchase === 'number' && !isNaN(update.priceAtPurchase) && update.priceAtPurchase >= 0) {
                        priceCents = Math.round(update.priceAtPurchase);
                    }

                    await tx.orderItem.update({
                        where: { id: item.id },
                        data: { 
                            quantityFulfilled: qty,
                            priceAtPurchase: priceCents
                        }
                    });
                } else {
                    await tx.orderItem.update({
                        where: { id: item.id },
                        data: { quantityFulfilled: qty }
                    });
                }

                finalTotal += (priceCents * qty);
            }

            // Include shipping cost if present
            if (order.shippingCost) {
                finalTotal += order.shippingCost;
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
        const activeOrders = await prisma.order.findMany({
            where: {
                status: {
                    in: [
                        OrderStatus.PENDING,
                        OrderStatus.WEIGHING_COMPLETED,
                        OrderStatus.OUT_FOR_DELIVERY
                    ]
                },
                deliveryMethod: 'DELIVERY'
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

        // Loop to geocode missing coordinates
        for (const order of activeOrders) {
            if ((order.latitude === null || order.longitude === null) && order.shippingAddress && order.shippingAddress !== 'PICKUP') {
                try {
                    const queryAddress = order.shippingAddress.replace(/\s*-\s*/g, ', ');
                    const response = await (globalThis as any).fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(queryAddress)}&format=json&limit=1`, {
                        headers: { 'User-Agent': 'ChronoStellarApp/1.0 (contact@chronostellar.com)' }
                    });
                    if (response.ok) {
                        const results = await response.json() as any;
                        if (results && results.length > 0) {
                            const lat = parseFloat(results[0].lat);
                            const lng = parseFloat(results[0].lon);
                            
                            // Save to database
                            await prisma.order.update({
                                where: { id: order.id },
                                data: { latitude: lat, longitude: lng }
                            });
                            
                            order.latitude = lat;
                            order.longitude = lng;
                            console.log(`[Geocoding Map] Success for Order #${order.id} "${queryAddress}": lat=${lat}, lng=${lng}`);
                        } else {
                            console.warn(`[Geocoding Map] No results found for Order #${order.id} "${queryAddress}"`);
                        }
                    }
                } catch (err) {
                    console.error(`[Geocoding Map] Error geocoding order #${order.id}:`, err);
                }
            }
        }

        // Return only orders that have valid coordinates
        return activeOrders.filter(order => order.latitude !== null && order.longitude !== null) as any[];
    }
}
