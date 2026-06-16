import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class CategoryController {
    async list(req: Request, res: Response) {
        try {
            const categories = await prisma.category.findMany({
                orderBy: { name: 'asc' }
            });
            res.json(categories);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    async create(req: Request, res: Response) {
        try {
            const { name, color } = req.body;
            const category = await prisma.category.create({
                data: { name, color }
            });
            res.status(201).json(category);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    async update(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { name, color } = req.body;
            const category = await prisma.category.update({
                where: { id: Number(id) },
                data: { name, color }
            });
            res.json(category);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    async delete(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await prisma.category.delete({
                where: { id: Number(id) }
            });
            res.json({ message: 'Category deleted' });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
}
