import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { UnitType } from '@prisma/client';

export class ProductController {

    // List all products (Admin view allows seeing disabled ones)
    async list(req: Request, res: Response) {
        try {
            const { categoryId, search, sortBy, sortOrder } = req.query;
            const where: any = {};
            if (categoryId) where.categoryId = Number(categoryId);
            if (search) where.name = { contains: String(search) };

            const validSortFields: Record<string, string> = {
                name: 'name',
                price: 'priceCents',
                stock: 'stockQuantity',
                category: 'categoryId',
            };
            const orderBy: any = {};
            const sortField = validSortFields[String(sortBy)] ?? 'name';
            orderBy[sortField] = sortOrder === 'desc' ? 'desc' : 'asc';

            const products = await prisma.product.findMany({
                where,
                include: { category: true },
                orderBy
            });
            res.json(products);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // List available products (Public view)
    async listPublic(req: Request, res: Response) {
        try {
            const { categoryId, search, sortBy, sortOrder } = req.query;
            const where: any = {
                isAvailable: true,
                OR: [
                    { stockQuantity: { gt: 0 } },
                    { allowBackorder: true }
                ]
            };
            if (categoryId) where.categoryId = Number(categoryId);
            if (search) where.name = { contains: String(search) };

            const validSortFields: Record<string, string> = {
                name: 'name',
                price: 'priceCents',
                stock: 'stockQuantity',
            };
            const orderBy: any = {};
            const sortField = validSortFields[String(sortBy)] ?? 'name';
            orderBy[sortField] = sortOrder === 'desc' ? 'desc' : 'asc';

            const products = await prisma.product.findMany({
                where,
                include: { category: true },
                orderBy
            });
            res.json(products);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    async create(req: Request, res: Response) {
        try {
            const { name, description, priceCents, unitType, isVariableWeight, stepAmount, seasonalTips, categoryId } = req.body;
            const file = req.file;

            const product = await prisma.product.create({
                data: {
                    name,
                    description,
                    priceCents: Number(priceCents),
                    unitType: unitType as UnitType,
                    isVariableWeight: isVariableWeight === 'true' || isVariableWeight === true,
                    stepAmount: Number(stepAmount),
                    stockQuantity: Number(req.body.stockQuantity || 0),
                    lowStockThreshold: Number(req.body.lowStockThreshold || 0),
                    allowBackorder: req.body.allowBackorder === 'true' || req.body.allowBackorder === true,
                    seasonalTips,
                    categoryId: categoryId ? Number(categoryId) : null,
                    imageUrl: file ? `/uploads/${file.filename}` : null,
                    isAvailable: true
                }
            });
            res.status(201).json(product);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    async update(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { name, description, priceCents, unitType, isVariableWeight, stepAmount, isAvailable, seasonalTips, categoryId } = req.body;
            const file = req.file;

            // Prepare update data
            const data: any = {};
            if (name) data.name = name;
            if (description) data.description = description;
            if (priceCents) data.priceCents = Number(priceCents);
            if (unitType) data.unitType = unitType as UnitType;
            if (isVariableWeight !== undefined) data.isVariableWeight = isVariableWeight === 'true' || isVariableWeight === true;
            if (stepAmount !== undefined) data.stepAmount = Number(stepAmount);
            if (isAvailable !== undefined) data.isAvailable = isAvailable === 'true' || isAvailable === true;
            if (req.body.stockQuantity !== undefined) data.stockQuantity = Number(req.body.stockQuantity);
            if (req.body.lowStockThreshold !== undefined) data.lowStockThreshold = Number(req.body.lowStockThreshold);
            if (req.body.allowBackorder !== undefined) data.allowBackorder = req.body.allowBackorder === 'true' || req.body.allowBackorder === true;
            if (seasonalTips) data.seasonalTips = seasonalTips;
            if (categoryId !== undefined) data.categoryId = categoryId ? Number(categoryId) : null;
            if (file) data.imageUrl = `/uploads/${file.filename}`;

            const product = await prisma.product.update({
                where: { id: Number(id) },
                data
            });
            res.json(product);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    async toggleAvailability(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { isAvailable } = req.body; // Expecting { isAvailable: boolean }

            const product = await prisma.product.update({
                where: { id: Number(id) },
                data: { isAvailable: Boolean(isAvailable) }
            });
            res.json(product);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    async getProductStats(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { period } = req.query; // 'all', '7d', '30d', '1y'
            const productId = Number(id);

            const product = await prisma.product.findUnique({
                where: { id: productId },
                select: { name: true, unitType: true }
            });

            if (!product) {
                return res.status(404).json({ error: 'Product not found' });
            }

            // Calculate date threshold based on period
            let dateThreshold: Date | undefined;
            if (period && typeof period === 'string' && period !== 'all') {
                dateThreshold = new Date();
                if (period === '7d') {
                    dateThreshold.setDate(dateThreshold.getDate() - 7);
                } else if (period === '30d') {
                    dateThreshold.setDate(dateThreshold.getDate() - 30);
                } else if (period === '1y') {
                    dateThreshold.setFullYear(dateThreshold.getFullYear() - 1);
                }
            }

            const whereClause: any = {
                productId: productId,
                order: {
                    status: { not: 'CANCELLED' }
                }
            };

            if (dateThreshold) {
                whereClause.order.createdAt = { gte: dateThreshold };
            }

            const orderItems = await prisma.orderItem.findMany({
                where: whereClause,
                include: {
                    order: {
                        select: {
                            id: true,
                            createdAt: true,
                            status: true,
                            customerName: true
                        }
                    }
                },
                orderBy: {
                    order: {
                        createdAt: 'desc'
                    }
                }
            });

            let totalUnitsSold = 0;
            let totalRevenueCents = 0;

            const recentOrders = orderItems.map(item => {
                const quantity = item.quantityFulfilled !== null ? Number(item.quantityFulfilled) : Number(item.quantityOrdered);
                totalUnitsSold += quantity;
                totalRevenueCents += quantity * item.priceAtPurchase;

                return {
                    orderId: item.order.id,
                    customerName: item.order.customerName || 'Cliente',
                    date: item.order.createdAt,
                    status: item.order.status,
                    quantity: quantity,
                    priceAtPurchase: item.priceAtPurchase
                };
            });

            res.json({
                productName: product.name,
                unitType: product.unitType,
                totalUnitsSold,
                totalRevenueCents,
                recentOrders
            });

        } catch (error: any) {
            console.error('[ProductController] getProductStats error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async bulkUpdate(req: Request, res: Response) {
        try {
            const { ids, data } = req.body; // Expecting { ids: number[], data: Partial<Product> }
            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ error: 'IDs array is required' });
            }

            const updated = await prisma.product.updateMany({
                where: { id: { in: ids.map(Number) } },
                data: {
                    ...data,
                    // Ensure boolean conversion for specific fields if provided
                    isAvailable: data.isAvailable !== undefined ? Boolean(data.isAvailable) : undefined,
                    allowBackorder: data.allowBackorder !== undefined ? Boolean(data.allowBackorder) : undefined,
                }
            });

            res.json({ message: `Updated ${updated.count} products`, count: updated.count });
        } catch (error: any) {
            console.error('[ProductController] bulkUpdate error:', error);
            res.status(400).json({ error: error.message });
        }
    }

    async bulkDelete(req: Request, res: Response) {
        try {
            const { ids } = req.body; // Expecting { ids: number[] }
            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ error: 'IDs array is required' });
            }

            const deleted = await prisma.product.deleteMany({
                where: { id: { in: ids.map(Number) } }
            });

            res.json({ message: `Deleted ${deleted.count} products`, count: deleted.count });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    // Dynamic Open Graph HTML generator for WhatsApp / Facebook / Social Crawlers
    async getOpenGraphProductHtml(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const product = await prisma.product.findUnique({
                where: { id: Number(id) }
            });

            const host = (req.headers['x-forwarded-host'] || req.get('host') || 'ortofruttabutti.it').toString().split(':')[0];
            const baseUrl = `https://${host}`;

            if (!product) {
                const defaultTitle = 'Ortofrutta Butti Sirone - Frutta e Verdura Fresca';
                const defaultDesc = 'Ordina online frutta e verdura fresca di stagione con consegna a domicilio o ritiro in negozio.';
                const defaultImg = `${baseUrl}/logo.png`;
                const defaultPageUrl = `${baseUrl}/shop`;

                const fallbackHtml = `<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <title>${defaultTitle}</title>
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Ortofrutta Butti">
    <meta property="og:title" content="${defaultTitle}">
    <meta property="og:description" content="${defaultDesc}">
    <meta property="og:image" content="${defaultImg}">
    <meta property="og:url" content="${defaultPageUrl}">
    <script>window.location.replace("${defaultPageUrl}");</script>
</head>
<body><h1>${defaultTitle}</h1></body>
</html>`;
                res.setHeader('Content-Type', 'text/html');
                return res.send(fallbackHtml);
            }

            const formattedPrice = (product.priceCents / 100).toFixed(2);
            const unitStr = product.isVariableWeight ? 'kg' : (product.unitType === 'BOX' ? 'conf.' : 'pz');
            const title = `${product.name} - €${formattedPrice}/${unitStr} | Ortofrutta Butti`;
            const description = product.description || `Scopri ${product.name} fresco di giornata su Ortofrutta Butti Sirone. Ordina online con consegna a domicilio o ritiro!`;

            const imageUrl = product.imageUrl 
                ? (product.imageUrl.startsWith('http') ? product.imageUrl : `${baseUrl}${product.imageUrl.startsWith('/') ? '' : '/'}${product.imageUrl}`) 
                : `${baseUrl}/logo.png`;
            const pageUrl = `${baseUrl}/shop/${product.id}`;

            const html = `<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <link rel="canonical" href="${pageUrl}">
    <meta http-equiv="refresh" content="0;url=${pageUrl}">
    <!-- Open Graph / WhatsApp / Facebook / Telegram -->
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Ortofrutta Butti Sirone">
    <meta property="og:url" content="${pageUrl}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:image:secure_url" content="${imageUrl}">
    <meta property="og:image:alt" content="${product.name}">
    <!-- Twitter Cards -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${imageUrl}">
    <!-- Instant Client Redirect -->
    <script>window.location.replace("${pageUrl}");</script>
</head>
<body style="font-family: sans-serif; padding: 40px; text-align: center; background: #022c22; color: white;">
    <h1>${title}</h1>
    <p>${description}</p>
    <img src="${imageUrl}" alt="${product.name}" style="max-width: 400px; border-radius: 20px; margin: 20px 0;" />
    <p><a href="${pageUrl}" style="color: #a7f3d0; font-weight: bold;">Clicca qui se non vieni reindirizzato automaticamente...</a></p>
</body>
</html>`;

            res.setHeader('Content-Type', 'text/html');
            return res.send(html);
        } catch (error: any) {
            console.error('[ProductController] OG generator error:', error);
            return res.status(500).send('Error generating Open Graph metadata');
        }
    }
}
