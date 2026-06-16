import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class NotificationController {
    async list(req: Request, res: Response) {
        try {
            const notifications = await prisma.notification.findMany({
                orderBy: { createdAt: 'desc' },
                take: 50,
            });
            res.json(notifications);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    async markAsRead(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id);
            await prisma.notification.update({
                where: { id },
                data: { isRead: true },
            });
            res.json({ success: true });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    async markAllAsRead(req: Request, res: Response) {
        try {
            await prisma.notification.updateMany({
                where: { isRead: false },
                data: { isRead: true },
            });
            res.json({ success: true });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    async delete(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id);
            await prisma.notification.delete({
                where: { id },
            });
            res.json({ success: true });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
}
