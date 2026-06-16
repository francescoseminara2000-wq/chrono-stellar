import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class DeliveryZoneController {

    async list(req: Request, res: Response) {
        try {
            const zones = await prisma.deliveryZone.findMany({
                orderBy: { city: 'asc' }
            });
            res.json(zones);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    async listActive(req: Request, res: Response) {
        try {
            const zones = await prisma.deliveryZone.findMany({
                where: { isActive: true },
                orderBy: { city: 'asc' }
            });
            res.json(zones);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    async create(req: Request, res: Response) {
        try {
            const { city, zipCode, shippingCost, isActive } = req.body;
            const zone = await prisma.deliveryZone.create({
                data: {
                    city,
                    zipCode,
                    shippingCost: Number(shippingCost),
                    isActive: isActive !== undefined ? isActive : true
                }
            });
            res.status(201).json(zone);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    async update(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { city, zipCode, shippingCost, isActive } = req.body;
            const zone = await prisma.deliveryZone.update({
                where: { id: Number(id) },
                data: {
                    city,
                    zipCode,
                    shippingCost: Number(shippingCost),
                    isActive: Boolean(isActive)
                }
            });
            res.json(zone);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    async delete(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await prisma.deliveryZone.delete({
                where: { id: Number(id) }
            });
            res.status(204).send();
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
}
