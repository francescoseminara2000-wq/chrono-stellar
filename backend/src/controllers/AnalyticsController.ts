import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AnalyticsController {
    /**
     * Public endpoint to log a site or product visit
     */
    static async trackVisit(req: Request, res: Response) {
        try {
            const { path, productId, userId, referrer, deviceType } = req.body;

            if (!path) {
                return res.status(400).json({ error: 'Path is required' });
            }

            const ip = req.ip || req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || '127.0.0.1';
            const userAgent = req.headers['user-agent'] || '';

            // Detect device type if not provided
            let detectedDevice = deviceType;
            if (!detectedDevice) {
                detectedDevice = /mobile|android|iphone|ipad|phone/i.test(userAgent) ? 'MOBILE' : 'DESKTOP';
            }

            const visit = await prisma.siteVisit.create({
                data: {
                    path: path.substring(0, 255),
                    productId: productId ? parseInt(productId, 10) : null,
                    userId: userId ? parseInt(userId, 10) : null,
                    ip: ip.substring(0, 45),
                    userAgent: userAgent,
                    deviceType: detectedDevice,
                    referrer: referrer ? referrer.substring(0, 255) : null
                }
            });

            return res.status(201).json({ success: true, visitId: visit.id });
        } catch (error) {
            console.error('Error tracking site visit:', error);
            return res.status(500).json({ error: 'Failed to track visit' });
        }
    }

    /**
     * Admin endpoint: Returns comprehensive analytics, graphs, top products & pages
     */
    static async getOverview(req: Request, res: Response) {
        try {
            const period = (req.query.period as string) || '7days';

            const now = new Date();
            let startDate = new Date();

            if (period === 'today') {
                startDate.setHours(0, 0, 0, 0);
            } else if (period === '7days') {
                startDate.setDate(now.getDate() - 7);
            } else if (period === '30days') {
                startDate.setDate(now.getDate() - 30);
            } else if (period === '1year') {
                startDate.setFullYear(now.getFullYear() - 1);
            } else {
                startDate = new Date(0); // All time
            }

            // Total Visits
            const totalVisits = await prisma.siteVisit.count({
                where: { createdAt: { gte: startDate } }
            });

            // Unique IP Visitors
            const uniqueVisitorsRaw = await prisma.siteVisit.groupBy({
                by: ['ip'],
                where: { createdAt: { gte: startDate } },
                _count: { ip: true }
            });
            const uniqueVisitors = uniqueVisitorsRaw.length;

            // Homepage visits vs Product Page visits
            const homepageVisits = await prisma.siteVisit.count({
                where: {
                    path: '/',
                    createdAt: { gte: startDate }
                }
            });

            const productVisits = await prisma.siteVisit.count({
                where: {
                    productId: { not: null },
                    createdAt: { gte: startDate }
                }
            });

            // Daily Access Trend Graph (Grouping by Day)
            const visitsList = await prisma.siteVisit.findMany({
                where: { createdAt: { gte: startDate } },
                select: { createdAt: true, ip: true, path: true, deviceType: true },
                orderBy: { createdAt: 'asc' }
            });

            // Aggregate by date (YYYY-MM-DD)
            const trendMap: Record<string, { date: string; visits: number; uniqueIps: Set<string> }> = {};

            visitsList.forEach(v => {
                const dateStr = v.createdAt.toISOString().split('T')[0];
                if (!trendMap[dateStr]) {
                    trendMap[dateStr] = { date: dateStr, visits: 0, uniqueIps: new Set() };
                }
                trendMap[dateStr].visits += 1;
                if (v.ip) trendMap[dateStr].uniqueIps.add(v.ip);
            });

            const trendData = Object.values(trendMap).map(item => ({
                date: item.date,
                visits: item.visits,
                uniqueVisitors: item.uniqueIps.size
            }));

            // Top Visited Products (Leaderboard)
            const topProductsGroup = await prisma.siteVisit.groupBy({
                by: ['productId'],
                where: {
                    productId: { not: null },
                    createdAt: { gte: startDate }
                },
                _count: { productId: true },
                orderBy: { _count: { productId: 'desc' } },
                take: 10
            });

            const productIds = topProductsGroup.map(g => g.productId!).filter(Boolean);
            const productsInfo = await prisma.product.findMany({
                where: { id: { in: productIds } },
                select: { id: true, name: true, priceCents: true, imageUrl: true, unitType: true }
            });

            const topProducts = topProductsGroup.map(g => {
                const p = productsInfo.find(prod => prod.id === g.productId);
                return {
                    productId: g.productId,
                    name: p?.name || `Prodotto #${g.productId}`,
                    priceCents: p?.priceCents || 0,
                    imageUrl: p?.imageUrl || null,
                    unitType: p?.unitType || 'PZ',
                    visits: g._count.productId
                };
            });

            // Top Visited Pages
            const topPagesGroup = await prisma.siteVisit.groupBy({
                by: ['path'],
                where: { createdAt: { gte: startDate } },
                _count: { path: true },
                orderBy: { _count: { path: 'desc' } },
                take: 10
            });

            const topPages = topPagesGroup.map(p => ({
                path: p.path,
                visits: p._count.path
            }));

            // Device Distribution
            const mobileVisits = await prisma.siteVisit.count({
                where: { deviceType: 'MOBILE', createdAt: { gte: startDate } }
            });
            const desktopVisits = totalVisits - mobileVisits;

            return res.json({
                period,
                totalVisits,
                uniqueVisitors,
                homepageVisits,
                productVisits,
                trendData,
                topProducts,
                topPages,
                devices: {
                    mobile: mobileVisits,
                    desktop: desktopVisits,
                    mobilePercent: totalVisits > 0 ? Math.round((mobileVisits / totalVisits) * 100) : 0,
                    desktopPercent: totalVisits > 0 ? Math.round((desktopVisits / totalVisits) * 100) : 0
                }
            });
        } catch (error) {
            console.error('Error fetching analytics overview:', error);
            return res.status(500).json({ error: 'Failed to fetch analytics' });
        }
    }
}
