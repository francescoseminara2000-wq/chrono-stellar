import { prisma } from '../lib/prisma';
import { OrderStatus } from '@prisma/client';
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export interface StatsPeriod {
    revenue: number;
    orderCount: number;
    aov: number;
    topProducts: Array<{
        id: number;
        name: string;
        revenue: number;
        quantity: number;
        unitType: string;
    }>;
    chartData: Array<{
        label: string;
        value: number;
    }>;
}

export class StatsService {
    async getAdminStats(period: string) {
        const { start, end, prevStart, prevEnd } = this.getDateRange(period);

        const currentStats = await this.calculateStatsForRange(start, end);
        const prevStats = await this.calculateStatsForRange(prevStart, prevEnd);

        return {
            current: currentStats,
            previous: prevStats,
            trends: {
                revenue: this.calculateTrend(currentStats.revenue, prevStats.revenue),
                orderCount: this.calculateTrend(currentStats.orderCount, prevStats.orderCount),
                aov: this.calculateTrend(currentStats.aov, prevStats.aov),
            }
        };
    }

    private async calculateStatsForRange(start: Date, end: Date) {
        const orders = await prisma.order.findMany({
            where: {
                createdAt: { gte: start, lte: end },
                status: { not: OrderStatus.CANCELLED }
            },
            include: {
                items: {
                    include: { product: true }
                }
            }
        });

        const revenue = orders.reduce((sum, order) => sum + (order.finalTotal || order.estimatedTotal), 0);
        const orderCount = orders.length;
        const aov = orderCount > 0 ? Math.round(revenue / orderCount) : 0;

        // Calculate Top Products
        const productStats: Record<number, { id: number; name: string; revenue: number; quantity: number; unitType: string }> = {};

        orders.forEach(order => {
            order.items.forEach(item => {
                const productId = item.productId;
                const qty = Number(item.quantityFulfilled || item.quantityOrdered);
                const itemRevenue = item.priceAtPurchase * qty;

                if (!productStats[productId]) {
                    productStats[productId] = {
                        id: productId,
                        name: item.product.name,
                        revenue: 0,
                        quantity: 0,
                        unitType: item.product.unitType
                    };
                }

                productStats[productId].revenue += itemRevenue;
                productStats[productId].quantity += qty;
            });
        });

        const topProducts = Object.values(productStats)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        const chartData = await this.calculateChartData(start, end);

        return { revenue, orderCount, aov, topProducts, chartData };
    }

    private async calculateChartData(start: Date, end: Date) {
        const orders = await prisma.order.findMany({
            where: {
                createdAt: { gte: start, lte: end },
                status: { not: OrderStatus.CANCELLED }
            },
            select: {
                createdAt: true,
                finalTotal: true,
                estimatedTotal: true
            }
        });

        const diffMs = Math.abs(end.getTime() - start.getTime());
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (diffDays <= 1.1) {
            // Hourly for Today
            return this.bucketByHour(orders, start);
        } else {
            // Daily for other periods
            return this.bucketByDay(orders, start, end);
        }
    }

    private bucketByHour(orders: any[], start: Date) {
        const buckets: Record<number, number> = {};
        for (let i = 0; i < 24; i++) buckets[i] = 0;

        orders.forEach(o => {
            const hour = new Date(o.createdAt).getHours();
            buckets[hour] += (o.finalTotal || o.estimatedTotal);
        });

        return Object.entries(buckets).map(([hour, val]) => ({
            label: `${hour}:00`,
            value: val
        }));
    }

    private bucketByDay(orders: any[], start: Date, end: Date) {
        const buckets: Record<string, number> = {};
        const current = new Date(start);
        while (current <= end) {
            const key = current.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
            buckets[key] = 0;
            current.setDate(current.getDate() + 1);
        }

        orders.forEach(o => {
            const key = new Date(o.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
            if (buckets[key] !== undefined) {
                buckets[key] += (o.finalTotal || o.estimatedTotal);
            }
        });

        return Object.entries(buckets).map(([label, value]) => ({ label, value }));
    }

    private getDateRange(period: string) {
        const now = new Date();
        let start: Date;
        let end: Date = endOfDay(now);
        let prevStart: Date;
        let prevEnd: Date;

        switch (period) {
            case 'today':
                start = startOfDay(now);
                prevStart = startOfDay(subDays(now, 1));
                prevEnd = endOfDay(subDays(now, 1));
                break;
            case 'last7days':
                start = startOfDay(subDays(now, 7));
                prevStart = startOfDay(subDays(now, 14));
                prevEnd = endOfDay(subDays(now, 8));
                break;
            case 'last30days':
                start = startOfDay(subDays(now, 30));
                prevStart = startOfDay(subDays(now, 60));
                prevEnd = endOfDay(subDays(now, 31));
                break;
            case 'thisMonth':
                start = startOfMonth(now);
                prevStart = startOfMonth(subMonths(now, 1));
                prevEnd = endOfMonth(subMonths(now, 1));
                break;
            case 'lastMonth':
                start = startOfMonth(subMonths(now, 1));
                end = endOfMonth(subMonths(now, 1));
                prevStart = startOfMonth(subMonths(now, 2));
                prevEnd = endOfMonth(subMonths(now, 2));
                break;
            default: // Default to last 7 days
                start = startOfDay(subDays(now, 7));
                prevStart = startOfDay(subDays(now, 14));
                prevEnd = endOfDay(subDays(now, 8));
        }

        return { start, end, prevStart, prevEnd };
    }

    private calculateTrend(current: number, previous: number) {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
    }
}
