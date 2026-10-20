import { prisma } from '../lib/prisma';
import { DiscountType } from '@prisma/client';
import { EmailService } from './EmailService';

export class CouponService {
    private emailService: EmailService;

    constructor() {
        this.emailService = new EmailService();
        this.ensureDefaultCoupons().catch(err => {
            console.error('[CouponService] Errore inizializzazione coupon predefiniti:', err);
        });
    }

    /**
     * Assicura l'esistenza dei coupon automatici di benvenuto per Registrazione e Newsletter.
     */
    async ensureDefaultCoupons() {
        try {
            // 1. Coupon Registrazione: BENVENUTO5 (5€ di sconto su spesa minima 30€)
            const regCoupon = await prisma.coupon.findFirst({
                where: { isForRegistration: true }
            });
            if (!regCoupon) {
                const existingCode = await prisma.coupon.findUnique({ where: { code: 'BENVENUTO5' } });
                if (!existingCode) {
                    await prisma.coupon.create({
                        data: {
                            code: 'BENVENUTO5',
                            description: 'Sconto di benvenuto per la registrazione del tuo account',
                            discountType: DiscountType.FIXED,
                            discountValue: 500, // 5.00€
                            minSpend: 3000,     // 30.00€ spesa minima
                            usageLimitPerUser: 1,
                            isActive: true,
                            isForRegistration: true
                        }
                    });
                    console.log('[CouponService] Creato coupon automatico BENVENUTO5');
                }
            }

            // 2. Coupon Newsletter: NEWSLETTER10 (10% di sconto su spesa minima 25€)
            const newsCoupon = await prisma.coupon.findFirst({
                where: { isForNewsletter: true }
            });
            if (!newsCoupon) {
                const existingCode = await prisma.coupon.findUnique({ where: { code: 'NEWSLETTER10' } });
                if (!existingCode) {
                    await prisma.coupon.create({
                        data: {
                            code: 'NEWSLETTER10',
                            description: 'Sconto esclusivo di benvenuto per l\'iscrizione alla newsletter',
                            discountType: DiscountType.PERCENTAGE,
                            discountValue: 10,   // 10%
                            minSpend: 2500,      // 25.00€ spesa minima
                            usageLimitPerUser: 1,
                            isActive: true,
                            isForNewsletter: true
                        }
                    });
                    console.log('[CouponService] Creato coupon automatico NEWSLETTER10');
                }
            }
        } catch (error) {
            console.error('[CouponService] Errore ensureDefaultCoupons:', error);
        }
    }

    /**
     * Recupera le impostazioni correnti dei due coupon di benvenuto.
     */
    async getWelcomeSettings() {
        const regCoupon = await prisma.coupon.findFirst({
            where: { isForRegistration: true }
        });

        const newsCoupon = await prisma.coupon.findFirst({
            where: { isForNewsletter: true }
        });

        return {
            registration: regCoupon ? {
                id: regCoupon.id,
                code: regCoupon.code,
                isActive: regCoupon.isActive,
                discountType: regCoupon.discountType,
                discountValue: regCoupon.discountType === DiscountType.FIXED ? regCoupon.discountValue / 100 : regCoupon.discountValue,
                minSpend: regCoupon.minSpend ? regCoupon.minSpend / 100 : 0,
                description: regCoupon.description || ''
            } : {
                id: null,
                code: 'BENVENUTO5',
                isActive: true,
                discountType: DiscountType.FIXED,
                discountValue: 5,
                minSpend: 30,
                description: 'Sconto di benvenuto per la registrazione del tuo account'
            },
            newsletter: newsCoupon ? {
                id: newsCoupon.id,
                code: newsCoupon.code,
                isActive: newsCoupon.isActive,
                discountType: newsCoupon.discountType,
                discountValue: newsCoupon.discountType === DiscountType.FIXED ? newsCoupon.discountValue / 100 : newsCoupon.discountValue,
                minSpend: newsCoupon.minSpend ? newsCoupon.minSpend / 100 : 0,
                description: newsCoupon.description || ''
            } : {
                id: null,
                code: 'NEWSLETTER10',
                isActive: true,
                discountType: DiscountType.PERCENTAGE,
                discountValue: 10,
                minSpend: 25,
                description: 'Sconto esclusivo di benvenuto per l\'iscrizione alla newsletter'
            }
        };
    }

    /**
     * Salva o aggiorna le impostazioni dei due coupon di benvenuto.
     */
    async saveWelcomeSettings(settings: {
        registration: {
            code: string;
            isActive: boolean;
            discountType: DiscountType;
            discountValue: number;
            minSpend: number;
            description?: string;
        };
        newsletter: {
            code: string;
            isActive: boolean;
            discountType: DiscountType;
            discountValue: number;
            minSpend: number;
            description?: string;
        };
    }) {
        // 1. Aggiorna o crea coupon registrazione
        const regCode = settings.registration.code.trim().toUpperCase();
        const regVal = settings.registration.discountType === DiscountType.FIXED
            ? Math.round(Number(settings.registration.discountValue) * 100)
            : Number(settings.registration.discountValue);
        const regMin = Math.round(Number(settings.registration.minSpend) * 100);

        const existingReg = await prisma.coupon.findFirst({
            where: { isForRegistration: true }
        });

        if (existingReg) {
            await prisma.coupon.update({
                where: { id: existingReg.id },
                data: {
                    code: regCode,
                    isActive: Boolean(settings.registration.isActive),
                    discountType: settings.registration.discountType,
                    discountValue: regVal,
                    minSpend: regMin,
                    description: settings.registration.description?.trim() || 'Sconto di benvenuto per la registrazione account'
                }
            });
        } else {
            await prisma.coupon.create({
                data: {
                    code: regCode,
                    isActive: Boolean(settings.registration.isActive),
                    discountType: settings.registration.discountType,
                    discountValue: regVal,
                    minSpend: regMin,
                    isForRegistration: true,
                    usageLimitPerUser: 1,
                    description: settings.registration.description?.trim() || 'Sconto di benvenuto per la registrazione account'
                }
            });
        }

        // 2. Aggiorna o crea coupon newsletter
        const newsCode = settings.newsletter.code.trim().toUpperCase();
        const newsVal = settings.newsletter.discountType === DiscountType.FIXED
            ? Math.round(Number(settings.newsletter.discountValue) * 100)
            : Number(settings.newsletter.discountValue);
        const newsMin = Math.round(Number(settings.newsletter.minSpend) * 100);

        const existingNews = await prisma.coupon.findFirst({
            where: { isForNewsletter: true }
        });

        if (existingNews) {
            await prisma.coupon.update({
                where: { id: existingNews.id },
                data: {
                    code: newsCode,
                    isActive: Boolean(settings.newsletter.isActive),
                    discountType: settings.newsletter.discountType,
                    discountValue: newsVal,
                    minSpend: newsMin,
                    description: settings.newsletter.description?.trim() || 'Sconto esclusivo di benvenuto per l\'iscrizione alla newsletter'
                }
            });
        } else {
            await prisma.coupon.create({
                data: {
                    code: newsCode,
                    isActive: Boolean(settings.newsletter.isActive),
                    discountType: settings.newsletter.discountType,
                    discountValue: newsVal,
                    minSpend: newsMin,
                    isForNewsletter: true,
                    usageLimitPerUser: 1,
                    description: settings.newsletter.description?.trim() || 'Sconto esclusivo di benvenuto per l\'iscrizione alla newsletter'
                }
            });
        }

        return this.getWelcomeSettings();
    }

    /**
     * Valida un codice sconto rispetto al carrello e al cliente.
     */
    async validateCoupon(code: string, cartSubtotal: number, customerEmail?: string, userId?: number) {
        if (!code || !code.trim()) {
            return { valid: false, error: 'Codice sconto non inserito.' };
        }

        const cleanCode = code.trim().toUpperCase();
        const now = new Date();

        const coupon = await prisma.coupon.findUnique({
            where: { code: cleanCode }
        });

        if (!coupon) {
            return { valid: false, error: 'Codice sconto non valido o inesistente.' };
        }

        if (!coupon.isActive) {
            return { valid: false, error: 'Questo codice sconto non è attualmente attivo.' };
        }

        if (coupon.startDate && coupon.startDate > now) {
            return { valid: false, error: `Questo codice sarà utilizzabile a partire dal ${coupon.startDate.toLocaleDateString('it-IT')}.` };
        }

        if (coupon.endDate && coupon.endDate < now) {
            return { valid: false, error: 'Questo codice sconto è scaduto.' };
        }

        // Verifica limite totale utilizzi
        if (coupon.usageLimit !== null && coupon.timesUsed >= coupon.usageLimit) {
            return { valid: false, error: 'Questo codice sconto ha raggiunto il limite massimo di utilizzi disponibili.' };
        }

        // Verifica cliente assegnato
        if (coupon.assignedCustomerEmail) {
            const cleanAssigned = coupon.assignedCustomerEmail.trim().toLowerCase();
            const cleanUserEmail = customerEmail?.trim().toLowerCase();
            if (!cleanUserEmail || cleanUserEmail !== cleanAssigned) {
                return { valid: false, error: 'Questo codice sconto è riservato ad un cliente specifico.' };
            }
        }

        // Verifica limite per utente / email
        if (coupon.usageLimitPerUser && (customerEmail || userId)) {
            const orConditions: any[] = [];
            if (customerEmail) {
                orConditions.push({ customerEmail: customerEmail.trim().toLowerCase() });
            }
            if (userId) {
                orConditions.push({ userId });
            }

            const userUsages = await prisma.couponUsage.count({
                where: {
                    couponId: coupon.id,
                    OR: orConditions
                }
            });

            if (userUsages >= coupon.usageLimitPerUser) {
                return { valid: false, error: 'Hai già utilizzato questo codice sconto per il numero massimo di volte consentito.' };
            }
        }

        // Verifica spesa minima
        if (coupon.minSpend && cartSubtotal < coupon.minSpend) {
            const minFormatted = (coupon.minSpend / 100).toFixed(2);
            const currentFormatted = (cartSubtotal / 100).toFixed(2);
            return {
                valid: false,
                error: `Questo codice richiede una spesa minima di €${minFormatted} (il tuo carrello attuale è di €${currentFormatted}).`
            };
        }

        // Calcolo dello sconto
        let discountAmount = 0;
        if (coupon.discountType === DiscountType.PERCENTAGE) {
            discountAmount = Math.round((cartSubtotal * coupon.discountValue) / 100);
            if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
                discountAmount = coupon.maxDiscount;
            }
        } else {
            // FIXED
            discountAmount = coupon.discountValue;
        }

        // Non può superare il totale del carrello
        if (discountAmount > cartSubtotal) {
            discountAmount = cartSubtotal;
        }

        const newSubtotal = Math.max(0, cartSubtotal - discountAmount);

        return {
            valid: true,
            coupon: {
                id: coupon.id,
                code: coupon.code,
                description: coupon.description,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
                minSpend: coupon.minSpend,
                maxDiscount: coupon.maxDiscount,
                isForRegistration: coupon.isForRegistration,
                isForNewsletter: coupon.isForNewsletter
            },
            discountAmount,
            formattedDiscount: coupon.discountType === DiscountType.PERCENTAGE
                ? `${coupon.discountValue}%`
                : `€${(coupon.discountValue / 100).toFixed(2)}`,
            newSubtotal
        };
    }

    /**
     * Applica il codice sconto e salva la registrazione dell'utilizzo.
     */
    async recordCouponUsage(orderId: number, couponId: number, customerEmail: string, userId: number | null, discountAmount: number) {
        return prisma.$transaction(async (tx) => {
            // Incrementa contatore coupon
            await tx.coupon.update({
                where: { id: couponId },
                data: { timesUsed: { increment: 1 } }
            });

            // Registra storico utilizzo
            return tx.couponUsage.create({
                data: {
                    couponId,
                    orderId,
                    userId,
                    customerEmail: customerEmail.trim().toLowerCase(),
                    discountAmount
                }
            });
        });
    }

    /**
     * Admin: Recupera tutti i coupon con statistiche di utilizzo.
     */
    async getAllCoupons() {
        return prisma.coupon.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { usages: true, orders: true }
                }
            }
        });
    }

    /**
     * Admin: Statistiche generali coupon.
     */
    async getStats() {
        const totalCoupons = await prisma.coupon.count();
        const activeCoupons = await prisma.coupon.count({ where: { isActive: true } });
        const usages = await prisma.couponUsage.findMany({
            select: { discountAmount: true }
        });

        const totalDiscountGiven = usages.reduce((acc, curr) => acc + curr.discountAmount, 0);
        const totalUsages = usages.length;

        return {
            totalCoupons,
            activeCoupons,
            totalDiscountGiven,
            totalUsages
        };
    }

    /**
     * Admin: Crea un nuovo coupon.
     */
    async createCoupon(data: {
        code: string;
        description?: string;
        discountType: DiscountType;
        discountValue: number;
        minSpend?: number;
        maxDiscount?: number;
        usageLimit?: number;
        usageLimitPerUser?: number;
        startDate?: Date;
        endDate?: Date;
        isActive?: boolean;
        isForNewsletter?: boolean;
        isForRegistration?: boolean;
        assignedCustomerEmail?: string;
    }) {
        const cleanCode = data.code.trim().toUpperCase();

        const existing = await prisma.coupon.findUnique({
            where: { code: cleanCode }
        });

        if (existing) {
            throw new Error(`Esiste già un codice sconto con il codice "${cleanCode}".`);
        }

        // Se impostato come registrazione o newsletter esclusivo, disattiva gli altri dello stesso tipo
        if (data.isForRegistration) {
            await prisma.coupon.updateMany({
                where: { isForRegistration: true },
                data: { isForRegistration: false }
            });
        }
        if (data.isForNewsletter) {
            await prisma.coupon.updateMany({
                where: { isForNewsletter: true },
                data: { isForNewsletter: false }
            });
        }

        return prisma.coupon.create({
            data: {
                code: cleanCode,
                description: data.description?.trim() || null,
                discountType: data.discountType,
                discountValue: data.discountValue,
                minSpend: data.minSpend !== undefined ? data.minSpend : 0,
                maxDiscount: data.maxDiscount || null,
                usageLimit: data.usageLimit || null,
                usageLimitPerUser: data.usageLimitPerUser !== undefined ? data.usageLimitPerUser : 1,
                startDate: data.startDate || null,
                endDate: data.endDate || null,
                isActive: data.isActive !== undefined ? data.isActive : true,
                isForRegistration: data.isForRegistration || false,
                isForNewsletter: data.isForNewsletter || false,
                assignedCustomerEmail: data.assignedCustomerEmail?.trim().toLowerCase() || null
            }
        });
    }

    /**
     * Admin: Modifica coupon.
     */
    async updateCoupon(id: number, data: Partial<any>) {
        if (data.code) {
            data.code = data.code.trim().toUpperCase();
        }
        if (data.assignedCustomerEmail) {
            data.assignedCustomerEmail = data.assignedCustomerEmail.trim().toLowerCase();
        }

        if (data.isForRegistration) {
            await prisma.coupon.updateMany({
                where: { isForRegistration: true, id: { not: id } },
                data: { isForRegistration: false }
            });
        }
        if (data.isForNewsletter) {
            await prisma.coupon.updateMany({
                where: { isForNewsletter: true, id: { not: id } },
                data: { isForNewsletter: false }
            });
        }

        return prisma.coupon.update({
            where: { id },
            data
        });
    }

    /**
     * Admin: Elimina coupon.
     */
    async deleteCoupon(id: number) {
        return prisma.coupon.delete({
            where: { id }
        });
    }

    /**
     * Admin: Storico utilizzi.
     */
    async getUsages(couponId?: number) {
        return prisma.couponUsage.findMany({
            where: couponId ? { couponId } : undefined,
            orderBy: { usedAt: 'desc' },
            take: 100,
            include: {
                coupon: {
                    select: { code: true, discountType: true, discountValue: true }
                }
            }
        });
    }

    /**
     * Invia un codice sconto a clienti selezionati via email.
     */
    async sendCouponToTarget(
        couponId: number,
        target: 'SPECIFIC' | 'NEWSLETTER_SUBSCRIBERS' | 'VIP_CUSTOMERS' | 'ALL_CUSTOMERS',
        specificEmail?: string,
        customMessage?: string
    ) {
        const coupon = await prisma.coupon.findUnique({
            where: { id: couponId }
        });

        if (!coupon) {
            throw new Error('Coupon non trovato.');
        }

        let recipients: { email: string; name?: string }[] = [];

        if (target === 'SPECIFIC') {
            if (!specificEmail || !specificEmail.includes('@')) {
                throw new Error('Indirizzo email specifico non valido.');
            }
            recipients = [{ email: specificEmail.trim().toLowerCase() }];
        } else if (target === 'NEWSLETTER_SUBSCRIBERS') {
            const subscribers = await prisma.newsletterSubscriber.findMany({
                where: { isConfirmed: true, isActive: true },
                select: { email: true }
            });
            recipients = subscribers.map(s => ({ email: s.email }));
        } else if (target === 'VIP_CUSTOMERS') {
            // Clienti con almeno 2 ordini o spesa totale > 50€
            const orders = await prisma.order.findMany({
                where: { customerEmail: { not: null } },
                select: { customerEmail: true, customerName: true, finalTotal: true, estimatedTotal: true }
            });

            const customerMap = new Map<string, { email: string; name?: string; count: number; total: number }>();
            for (const o of orders) {
                if (!o.customerEmail) continue;
                const email = o.customerEmail.toLowerCase().trim();
                const total = o.finalTotal || o.estimatedTotal || 0;
                const prev = customerMap.get(email) || { email, name: o.customerName || undefined, count: 0, total: 0 };
                prev.count++;
                prev.total += total;
                customerMap.set(email, prev);
            }

            recipients = Array.from(customerMap.values())
                .filter(c => c.count >= 2 || c.total >= 5000)
                .map(c => ({ email: c.email, name: c.name }));
        } else if (target === 'ALL_CUSTOMERS') {
            const users = await prisma.user.findMany({
                where: { role: 'CUSTOMER' },
                select: { email: true, name: true }
            });
            recipients = users.map(u => ({ email: u.email, name: u.name || undefined }));
        }

        if (recipients.length === 0) {
            throw new Error('Nessun destinatario trovato per la selezione impostata.');
        }

        const discountText = coupon.discountType === DiscountType.PERCENTAGE
            ? `${coupon.discountValue}% di Sconto`
            : `€${(coupon.discountValue / 100).toFixed(2)} di Sconto`;

        const minSpendText = coupon.minSpend && coupon.minSpend > 0
            ? `su una spesa minima di €${(coupon.minSpend / 100).toFixed(2)}`
            : 'senza spesa minima';

        let sentCount = 0;
        for (const r of recipients) {
            try {
                await this.emailService.sendCouponPromoEmail(
                    r.email,
                    r.name || 'Gentile Cliente',
                    coupon.code,
                    discountText,
                    minSpendText,
                    coupon.endDate ? coupon.endDate.toLocaleDateString('it-IT') : undefined,
                    customMessage
                );
                sentCount++;
            } catch (err) {
                console.error(`[CouponService] Errore invio promo a ${r.email}:`, err);
            }
        }

        return {
            success: true,
            sentCount,
            totalTargeted: recipients.length
        };
    }
}
