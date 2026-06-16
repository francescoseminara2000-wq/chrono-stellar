import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me';

export class AuthController {

    async register(req: Request, res: Response) {
        try {
            const { email, password, name, phone, street, civic, city, zipCode, notificationPreference } = req.body;

            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password are required' });
            }

            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser) {
                return res.status(400).json({ error: 'User already exists' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            require('crypto').randomBytes(32, async (err: any, buffer: Buffer) => {
                if (err) return res.status(500).json({ error: 'Error generating token' });

                const verificationToken = buffer.toString('hex');
                // Validate notification preference
                const validPreference = ['EMAIL', 'WHATSAPP'].includes(notificationPreference) ? notificationPreference : 'EMAIL';

                const user = await prisma.user.create({
                    data: {
                        email,
                        password: hashedPassword,
                        name,
                        phone,
                        street,
                        civic,
                        city,
                        zipCode,
                        notificationPreference: validPreference,
                        role: 'CUSTOMER',
                        isEmailVerified: false,
                        verificationToken
                    }
                });

                const emailService = new (require('../services/EmailService').EmailService)();
                await emailService.sendVerificationEmail(user.email, verificationToken);

                // Do not return token yet, require verification
                res.status(201).json({
                    message: 'Registration successful. Please check your email to verify your account.',
                    userId: user.id
                });
            });

        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    async verifyEmail(req: Request, res: Response) {
        try {
            const { token } = req.body;

            if (!token) {
                return res.status(400).json({ error: 'Token is required' });
            }

            const user = await prisma.user.findUnique({ where: { verificationToken: token } });

            if (!user) {
                return res.status(400).json({ error: 'Invalid or expired verification token' });
            }

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    isEmailVerified: true,
                    verificationToken: null
                }
            });

            res.json({ message: 'Email verified successfully. You can now log in.' });

        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    async resendVerification(req: Request, res: Response) {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({ error: 'Email is required' });
            }

            const user = await prisma.user.findUnique({ where: { email } });

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            if (user.isEmailVerified) {
                return res.status(400).json({ error: 'Email is already verified' });
            }

            require('crypto').randomBytes(32, async (err: any, buffer: Buffer) => {
                if (err) return res.status(500).json({ error: 'Error generating token' });

                const verificationToken = buffer.toString('hex');

                await prisma.user.update({
                    where: { id: user.id },
                    data: { verificationToken }
                });

                const emailService = new (require('../services/EmailService').EmailService)();
                await emailService.sendVerificationEmail(user.email, verificationToken);

                res.json({ message: 'Verification email resent. Please check your inbox.' });
            });

        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    async login(req: Request, res: Response) {
        try {
            const { email, password } = req.body;

            const user = await prisma.user.findUnique({ where: { email } });
            if (!user || !user.password) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            if (!user.isEmailVerified) {
                return res.status(403).json({ error: 'Please verify your email address before logging in.', requiresVerification: true });
            }

            const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

            res.json({
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    phone: user.phone,
                    street: user.street,
                    civic: user.civic,
                    city: user.city,
                    zipCode: user.zipCode,
                    role: user.role
                },
                token
            });

        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    async forgotPassword(req: Request, res: Response) {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({ error: 'Email is required' });
            }

            const user = await prisma.user.findUnique({ where: { email } });

            if (!user) {
                // Return generic success to prevent email enumeration
                return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
            }

            require('crypto').randomBytes(32, async (err: any, buffer: Buffer) => {
                if (err) return res.status(500).json({ error: 'Error generating token' });

                const resetPasswordToken = buffer.toString('hex');
                // Expires in 1 hour
                const resetPasswordExpires = new Date(Date.now() + 3600000);

                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        resetPasswordToken,
                        resetPasswordExpires
                    }
                });

                const emailService = new (require('../services/EmailService').EmailService)();
                await emailService.sendPasswordResetEmail(user.email, resetPasswordToken);

                res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
            });

        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    async resetPassword(req: Request, res: Response) {
        try {
            const { token, newPassword } = req.body;

            if (!token || !newPassword) {
                return res.status(400).json({ error: 'Token and new password are required' });
            }

            const user = await prisma.user.findFirst({
                where: {
                    resetPasswordToken: token,
                    resetPasswordExpires: {
                        gt: new Date() // Must be in the future
                    }
                }
            });

            if (!user) {
                return res.status(400).json({ error: 'Password reset token is invalid or has expired' });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    password: hashedPassword,
                    resetPasswordToken: null,
                    resetPasswordExpires: null
                }
            });

            res.json({ message: 'Password has been reset successfully. You can now log in.' });

        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    async me(req: Request, res: Response) {
        try {
            // @ts-ignore - userId added by middleware
            const userId = req.user?.userId;

            if (!userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json({
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                street: user.street,
                civic: user.civic,
                city: user.city,
                zipCode: user.zipCode,
                avatar: user.avatar,
                role: user.role,
                isEmailVerified: user.isEmailVerified,
                notificationPreference: user.notificationPreference
            });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    async update(req: Request, res: Response) {
        try {
            // @ts-ignore - userId added by middleware
            const userId = req.user?.userId;
            const { name, phone, street, civic, city, zipCode, avatar, latitude, longitude, notificationPreference } = req.body;

            if (!userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const updateData: any = { name, phone, street, civic, city, zipCode, avatar, latitude, longitude };

            if (notificationPreference && ['EMAIL', 'WHATSAPP'].includes(notificationPreference)) {
                updateData.notificationPreference = notificationPreference;
            }

            const user = await prisma.user.update({
                where: { id: userId },
                data: updateData
            });

            res.json({
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    phone: user.phone,
                    street: user.street,
                    civic: user.civic,
                    city: user.city,
                    zipCode: user.zipCode,
                    latitude: user.latitude,
                    longitude: user.longitude,
                    avatar: user.avatar,
                    role: user.role,
                    isEmailVerified: user.isEmailVerified,
                    notificationPreference: user.notificationPreference
                }
            });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}
