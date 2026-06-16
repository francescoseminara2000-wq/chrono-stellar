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
                            status: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            // Map and calculate stats
            const customers = users.map(user => {
                const totalOrders = user.orders.length;
                const totalSpent = user.orders.reduce((sum, order) => {
                    // Only count completed or delivered orders for LTV optionally, or all non-cancelled
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
                    stats: {
                        totalOrders,
                        totalSpent
                    },
                    orders: user.orders // Send order skeleton for the timeline/history view
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
            const { name, email, phone, street, civic, city, zipCode, notificationPreference, password, avatar } = req.body;

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
                    createdAt: true
                }
            });

            res.json(user);
        } catch (error: any) {
            console.error('[CustomerController] Error updating customer:', error);
            res.status(500).json({ error: error.message });
        }
    }
}
