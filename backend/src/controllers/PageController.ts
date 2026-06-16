import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class PageController {
    async list(req: Request, res: Response) {
        try {
            const pages = await prisma.page.findMany({
                orderBy: { updatedAt: 'desc' }
            });
            res.json(pages);
        } catch (error: any) {
            console.error('[PageController] Error listing pages:', error);
            res.status(500).json({ error: 'Failed to fetch pages' });
        }
    }

    async getBySlug(req: Request, res: Response) {
        try {
            const { slug } = req.params;
            const page = await prisma.page.findUnique({
                where: { slug }
            });

            if (!page) {
                return res.status(404).json({ error: 'Page not found' });
            }

            // If requested from public frontend (no auth), only return if published
            // We assume admin requests have auth headers but we can keep it simple: 
            // the public frontend will just handle 404 if it's not published or not found.
            // For safety, let's only return published pages to public endpoint if we want, 
            // but for now let's just return what's there and let the frontend handle it, 
            // or we can strictly filter here:
            const isAdmin = (req as any).user?.role === 'ADMIN';
            if (!isAdmin && !page.isPublished) {
                return res.status(404).json({ error: 'Page not found' });
            }

            res.json(page);
        } catch (error: any) {
            console.error('[PageController] Error fetching page:', error);
            res.status(500).json({ error: 'Failed to fetch page' });
        }
    }

    async create(req: Request, res: Response) {
        try {
            const { slug, title, content, isPublished } = req.body;

            // Validate slug format (alphanumeric and dashes)
            if (!/^[a-z0-9-]+$/.test(slug)) {
                return res.status(400).json({ error: 'Invalid slug format. Use only lowercase letters, numbers, and dashes.' });
            }

            const existing = await prisma.page.findUnique({ where: { slug } });
            if (existing) {
                return res.status(400).json({ error: 'A page with this slug already exists.' });
            }

            const newPage = await prisma.page.create({
                data: { slug, title, content, isPublished: Boolean(isPublished) }
            });
            res.status(201).json(newPage);
        } catch (error: any) {
            console.error('[PageController] Error creating page:', error);
            res.status(500).json({ error: 'Failed to create page' });
        }
    }

    async update(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id);
            const { slug, title, content, isPublished } = req.body;

            if (slug && !/^[a-z0-9-]+$/.test(slug)) {
                return res.status(400).json({ error: 'Invalid slug format.' });
            }

            if (slug) {
                const existing = await prisma.page.findFirst({
                    where: { slug, id: { not: id } }
                });
                if (existing) {
                    return res.status(400).json({ error: 'Slug already in use by another page.' });
                }
            }

            const updatedPage = await prisma.page.update({
                where: { id },
                data: { slug, title, content, isPublished }
            });
            res.json(updatedPage);
        } catch (error: any) {
            console.error('[PageController] Error updating page:', error);
            res.status(500).json({ error: 'Failed to update page' });
        }
    }

    async delete(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id);
            await prisma.page.delete({ where: { id } });
            res.json({ success: true });
        } catch (error: any) {
            console.error('[PageController] Error deleting page:', error);
            res.status(500).json({ error: 'Failed to delete page' });
        }
    }
}
