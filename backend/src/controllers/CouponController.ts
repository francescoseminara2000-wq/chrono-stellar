import { Request, Response } from 'express';
import { CouponService } from '../services/CouponService';
import { prisma } from '../lib/prisma';

export class CouponController {
    private couponService: CouponService;

    constructor() {
        this.couponService = new CouponService();
    }

    /**
     * Pubblico: Valida un codice sconto inserito al checkout o nel carrello.
     */
    async validate(req: Request, res: Response) {
        try {
            const { code, cartSubtotal, customerEmail } = req.body;
            // @ts-ignore
            const userId = req.user?.id || undefined;

            if (!code) {
                return res.status(400).json({ valid: false, error: 'Codice sconto non specificato.' });
            }

            const subtotalNumber = Number(cartSubtotal) || 0;
            const result = await this.couponService.validateCoupon(code, subtotalNumber, customerEmail, userId);

            if (!result.valid) {
                return res.status(400).json(result);
            }

            res.json(result);
        } catch (error: any) {
            console.error('[CouponController] Errore validazione coupon:', error);
            res.status(500).json({ valid: false, error: 'Errore durante la verifica del codice sconto.' });
        }
    }

    /**
     * Pubblico: Recupera informazioni sui coupon di benvenuto attivi (registrazione e newsletter).
     */
    async getPublicWelcomeInfo(req: Request, res: Response) {
        try {
            const regCoupon = await prisma.coupon.findFirst({
                where: { isForRegistration: true, isActive: true },
                select: {
                    code: true,
                    discountType: true,
                    discountValue: true,
                    minSpend: true,
                    description: true
                }
            });

            const newsCoupon = await prisma.coupon.findFirst({
                where: { isForNewsletter: true, isActive: true },
                select: {
                    code: true,
                    discountType: true,
                    discountValue: true,
                    minSpend: true,
                    description: true
                }
            });

            res.json({
                registrationCoupon: regCoupon,
                newsletterCoupon: newsCoupon
            });
        } catch (error: any) {
            console.error('[CouponController] Errore getPublicWelcomeInfo:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Admin: Elenco di tutti i coupon.
     */
    async adminList(req: Request, res: Response) {
        try {
            const coupons = await this.couponService.getAllCoupons();
            res.json(coupons);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Admin: Statistiche generali coupon.
     */
    async adminStats(req: Request, res: Response) {
        try {
            const stats = await this.couponService.getStats();
            res.json(stats);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Admin: Crea un nuovo coupon.
     */
    async adminCreate(req: Request, res: Response) {
        try {
            const {
                code,
                description,
                discountType,
                discountValue,
                minSpend,
                maxDiscount,
                usageLimit,
                usageLimitPerUser,
                startDate,
                endDate,
                isActive,
                isForNewsletter,
                isForRegistration,
                assignedCustomerEmail
            } = req.body;

            if (!code || !discountType || discountValue === undefined) {
                return res.status(400).json({ error: 'Codice, tipo di sconto e valore sono obbligatori.' });
            }

            const coupon = await this.couponService.createCoupon({
                code,
                description,
                discountType,
                discountValue: Number(discountValue),
                minSpend: minSpend ? Number(minSpend) : 0,
                maxDiscount: maxDiscount ? Number(maxDiscount) : undefined,
                usageLimit: usageLimit ? Number(usageLimit) : undefined,
                usageLimitPerUser: usageLimitPerUser ? Number(usageLimitPerUser) : 1,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                isActive: isActive !== undefined ? Boolean(isActive) : true,
                isForNewsletter: Boolean(isForNewsletter),
                isForRegistration: Boolean(isForRegistration),
                assignedCustomerEmail
            });

            res.status(201).json({ success: true, coupon });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    /**
     * Admin: Modifica un coupon esistente.
     */
    async adminUpdate(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id);
            const coupon = await this.couponService.updateCoupon(id, req.body);
            res.json({ success: true, coupon });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    /**
     * Admin: Elimina un coupon.
     */
    async adminDelete(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id);
            await this.couponService.deleteCoupon(id);
            res.json({ success: true, message: 'Codice sconto eliminato con successo.' });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    /**
     * Admin: Storico utilizzi.
     */
    async adminUsages(req: Request, res: Response) {
        try {
            const couponId = req.query.couponId ? parseInt(req.query.couponId as string) : undefined;
            const usages = await this.couponService.getUsages(couponId);
            res.json(usages);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Admin: Invia coupon via email a clienti target.
     */
    async adminSendPromo(req: Request, res: Response) {
        try {
            const { couponId, target, specificEmail, customMessage } = req.body;

            if (!couponId || !target) {
                return res.status(400).json({ error: 'Coupon e target sono obbligatori.' });
            }

            const result = await this.couponService.sendCouponToTarget(
                Number(couponId),
                target,
                specificEmail,
                customMessage
            );

            res.json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    /**
     * Admin: Recupera le configurazioni correnti dei due coupon di benvenuto.
     */
    async adminGetWelcomeSettings(req: Request, res: Response) {
        try {
            const settings = await this.couponService.getWelcomeSettings();
            res.json(settings);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Admin: Salva le configurazioni dei due coupon di benvenuto.
     */
    async adminSaveWelcomeSettings(req: Request, res: Response) {
        try {
            const { registration, newsletter } = req.body;

            if (!registration || !newsletter) {
                return res.status(400).json({ error: 'Configurazioni registrazione e newsletter obbligatorie.' });
            }

            const updated = await this.couponService.saveWelcomeSettings({ registration, newsletter });
            res.json({ success: true, settings: updated, message: 'Impostazioni sconti di benvenuto salvate con successo!' });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
}
