import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class CustomerController {
    async list(req: Request, res: Response) {
        try {
            // Get all registered users (CUSTOMER and ADMIN)
            const users = await prisma.user.findMany({
                where: {
                    OR: [{ role: 'CUSTOMER' }, { role: 'ADMIN' }]
                },
                include: {
                    orders: {
                        select: {
                            id: true,
                            finalTotal: true,
                            estimatedTotal: true,
                            createdAt: true,
                            status: true,
                            deliveryMethod: true,
                            scheduledDate: true,
                            scheduledTime: true,
                            _count: {
                                select: { items: true }
                            }
                        },
                        orderBy: { createdAt: 'desc' }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            // Map and calculate stats
            const customers = users.map(user => {
                const totalOrders = user.orders.length;
                const totalSpent = user.orders.reduce((sum, order) => {
                    if (order.status !== 'CANCELLED') {
                        return sum + (order.finalTotal || order.estimatedTotal);
                    }
                    return sum;
                }, 0);

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    city: user.city,
                    street: user.street,
                    civic: user.civic,
                    zipCode: user.zipCode,
                    notificationPreference: user.notificationPreference,
                    role: user.role,
                    createdAt: user.createdAt,
                    avatar: user.avatar,
                    walletBalance: user.walletBalance || 0,
                    stats: {
                        totalOrders,
                        totalSpent
                    },
                    orders: user.orders.map(o => ({
                        id: o.id,
                        finalTotal: o.finalTotal,
                        estimatedTotal: o.estimatedTotal,
                        createdAt: o.createdAt,
                        status: o.status,
                        deliveryMethod: o.deliveryMethod,
                        scheduledDate: o.scheduledDate,
                        scheduledTime: o.scheduledTime,
                        itemsCount: o._count?.items || 0
                    }))
                };
            });

            res.json(customers);
        } catch (error: any) {
            console.error('[CustomerController] Error listing customers:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async create(req: Request, res: Response) {
        try {
            const { name, email, password, phone, role } = req.body;

            if (!name || !email || !password || !role) {
                return res.status(400).json({ error: 'Name, email, password, and role are required' });
            }

            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser) {
                return res.status(400).json({ error: 'User with this email already exists' });
            }

            const bcrypt = require('bcrypt');
            const hashedPassword = await bcrypt.hash(password, 10);

            // Validate role
            const assignedRole = role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER';

            const user = await prisma.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    phone: phone || null,
                    role: assignedRole,
                    isEmailVerified: true, // Created by admin, considered verified
                    notificationPreference: 'EMAIL'
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    createdAt: true
                }
            });

            res.status(201).json(user);
        } catch (error: any) {
            console.error('[CustomerController] Error creating user:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async update(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { name, email, phone, street, civic, city, zipCode, notificationPreference, password, avatar, role } = req.body;

            const updateData: any = {
                name,
                email,
                phone,
                street,
                civic,
                city,
                zipCode
            };

            if (avatar !== undefined) {
                updateData.avatar = avatar;
            }

            if (role && ['CUSTOMER', 'ADMIN'].includes(role)) {
                updateData.role = role;
            }

            if (notificationPreference && ['EMAIL', 'WHATSAPP'].includes(notificationPreference)) {
                updateData.notificationPreference = notificationPreference;
            }

            if (password && password.trim() !== '') {
                const bcrypt = require('bcrypt');
                updateData.password = await bcrypt.hash(password, 10);
            }

            const user = await prisma.user.update({
                where: { id: parseInt(id) },
                data: updateData,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    street: true,
                    civic: true,
                    city: true,
                    zipCode: true,
                    notificationPreference: true,
                    avatar: true,
                    role: true,
                    walletBalance: true,
                    createdAt: true
                }
            });

            res.json(user);
        } catch (error: any) {
            console.error('[CustomerController] Error updating customer:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async adjustWallet(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { amountCents, description } = req.body;
            const userId = parseInt(id);

            if (typeof amountCents !== 'number' || isNaN(amountCents) || amountCents === 0) {
                return res.status(400).json({ error: 'Importo non valido' });
            }

            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) return res.status(404).json({ error: 'Cliente non trovato' });

            const newBalance = (user.walletBalance || 0) + amountCents;
            if (newBalance < 0) {
                return res.status(400).json({ error: 'Il saldo del borsellino non può diventare negativo' });
            }

            const result = await prisma.$transaction(async (tx) => {
                const updated = await tx.user.update({
                    where: { id: userId },
                    data: { walletBalance: newBalance }
                });

                await tx.walletTransaction.create({
                    data: {
                        userId,
                        amount: amountCents,
                        balanceAfter: newBalance,
                        type: 'MANUAL_ADJUSTMENT',
                        description: description || (amountCents > 0 ? 'Ricarica manuale borsellino da admin' : 'Rettifica manuale borsellino da admin')
                    }
                });

                return updated;
            });

            res.json({ success: true, walletBalance: result.walletBalance });
        } catch (error: any) {
            console.error('[CustomerController] adjustWallet error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async delete(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const userId = parseInt(id);

            // @ts-ignore
            if (req.user?.userId === userId) {
                return res.status(400).json({ error: 'Non puoi eliminare il tuo stesso account amministratore' });
            }

            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: { orders: true }
            });
            if (!user) return res.status(404).json({ error: 'Cliente non trovato' });

            if (user.orders.length > 0) {
                return res.status(400).json({
                    error: `Impossibile eliminare: il cliente ha ${user.orders.length} ordini collegati. Per motivi contabili e fiscali, l'account con ordini non può essere rimosso.`
                });
            }

            await prisma.user.delete({ where: { id: userId } });
            res.json({ success: true, message: 'Cliente eliminato con successo' });
        } catch (error: any) {
            console.error('[CustomerController] delete customer error:', error);
            res.status(500).json({ error: error.message });
        }
    }
}
