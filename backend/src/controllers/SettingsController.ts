import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const DEFAULT_WA_TEMPLATES = {
    waTemplateCreated: 'Ciao [cliente], grazie per il tuo ordine #[id]! 🍎\n\nLo abbiamo ricevuto e inizieremo a prepararlo a breve.\nTi invieremo un messaggio appena pesati i prodotti freschi con il totale esatto.\n\nRiepilogo:\n[prodotti]',
    waTemplateWeighing: 'Ciao [cliente], il tuo ordine #[id] è pronto! ⚖️\n\nAbbiamo pesato i prodotti freschi.\n💰 *Totale aggiornato: € [totale]*\n\nDettaglio pesatura:\n[prodotti]\n\nPuoi procedere al ritiro o attendere la consegna.',
    waTemplateOutForDelivery: 'Ciao [cliente], il tuo ordine #[id] è in consegna! 🚚\n\nIl nostro corriere sta arrivando da te.\n📍 Indirizzo: [indirizzo]\n💰 Totale da pagare: € [totale]',
    waTemplatePickupReady: 'Ciao [cliente], il tuo ordine #[id] è pronto per il ritiro in negozio! 🏪\n\nTi aspettiamo negli orari di apertura.\n💰 Totale da pagare: € [totale]',
    waTemplateDelivered: 'Ciao [cliente], ordine #[id] consegnato. Grazie mille! 🥗\n\nSperiamo che i prodotti siano di tuo gradimento.\nAlla prossima! 👋',
    waTemplateCancelled: 'Ciao [cliente], ci dispiace informarti che l\'ordine #[id] è stato annullato.\nPer maggiori informazioni, non esitare a contattarci.',
    waTemplateScheduled: 'Ciao [cliente], la pianificazione del tuo ordine #[id] è stata programmata per il [data] alle [ora]. A presto! 📅'
};

export class SettingsController {

    private async ensureColumnsExist() {
        const sqlStatements = [
            `ALTER TABLE StoreSettings ADD COLUMN waTemplateCreated TEXT`,
            `ALTER TABLE StoreSettings ADD COLUMN waTemplateWeighing TEXT`,
            `ALTER TABLE StoreSettings ADD COLUMN waTemplateOutForDelivery TEXT`,
            `ALTER TABLE StoreSettings ADD COLUMN waTemplatePickupReady TEXT`,
            `ALTER TABLE StoreSettings ADD COLUMN waTemplateDelivered TEXT`,
            `ALTER TABLE StoreSettings ADD COLUMN waTemplateCancelled TEXT`,
            `ALTER TABLE StoreSettings ADD COLUMN waTemplateScheduled TEXT`,
            `ALTER TABLE StoreSettings ADD COLUMN deliveryTimeSlots TEXT`,
            `ALTER TABLE StoreSettings ADD COLUMN revolutApiKey TEXT`,
            `ALTER TABLE StoreSettings ADD COLUMN revolutEnvironment VARCHAR(255) DEFAULT 'sandbox'`,
            `ALTER TABLE StoreSettings ADD COLUMN revolutEnabled TINYINT(1) DEFAULT 0`,
            `ALTER TABLE StoreSettings ADD COLUMN weighingTolerancePercent INT DEFAULT 10`,
            `ALTER TABLE Order ADD COLUMN approvalToken VARCHAR(255)`,
            `ALTER TABLE Order ADD COLUMN approvalStatus VARCHAR(255) DEFAULT 'NONE'`,
            `ALTER TABLE Order ADD COLUMN customerApprovedAt DATETIME`,
            `ALTER TABLE Transaction MODIFY COLUMN gateway VARCHAR(255) DEFAULT 'COD'`,
            `ALTER TABLE StoreSettings ADD COLUMN pageBackgrounds LONGTEXT`,
            `ALTER TABLE StoreSettings ADD COLUMN customNavItems LONGTEXT`,
            `ALTER TABLE StoreSettings ADD COLUMN navHoverOpacity INT DEFAULT 75`,
            `ALTER TABLE StoreSettings ADD COLUMN navHoverColor VARCHAR(50) DEFAULT '#bbf7d0'`,
            `ALTER TABLE StoreSettings ADD COLUMN appleLoaderPlaybackRate FLOAT DEFAULT 1.0`,
            `ALTER TABLE StoreSettings ADD COLUMN appleLoaderMinDuration INT DEFAULT 2`,
            `ALTER TABLE StoreSettings ADD COLUMN appleLoaderVideoUrl TEXT`,
            `ALTER TABLE StoreSettings ADD COLUMN appleLoaderDimension INT DEFAULT 200`,
            `ALTER TABLE StoreSettings ADD COLUMN appleLoaderPhrase VARCHAR(255) DEFAULT 'Caricando gli scaffali...'`,
            `ALTER TABLE StoreSettings ADD COLUMN appleLoaderTextSize INT DEFAULT 28`,
            `ALTER TABLE StoreSettings ADD COLUMN appleLoaderTextBold TINYINT(1) DEFAULT 1`,
            `ALTER TABLE StoreSettings ADD COLUMN appleLoaderTextOffset INT DEFAULT 16`,
            `ALTER TABLE StoreSettings ADD COLUMN headerLogoSize INT DEFAULT 80`,
            `ALTER TABLE StoreSettings ADD COLUMN customCursorEnabled TINYINT(1) DEFAULT 1`,
            `ALTER TABLE StoreSettings ADD COLUMN customCursorStyle VARCHAR(50) DEFAULT 'sprout'`,
            `ALTER TABLE StoreSettings ADD COLUMN customCursorColor VARCHAR(50) DEFAULT '#16a34a'`,
            `ALTER TABLE StoreSettings ADD COLUMN customCursorActiveInAdmin TINYINT(1) DEFAULT 0`,
            `ALTER TABLE StoreSettings ADD COLUMN customCursorClickEffect VARCHAR(50) DEFAULT 'botanical'`
        ];

        for (const statement of sqlStatements) {
            try {
                await prisma.$executeRawUnsafe(statement);
            } catch (e) {
                // Column already exists or handled by MySQL
            }
        }
    }

    // Ensure that a settings record exists, since it's a singleton (ID = 1)
    private async getOrCreateSettings() {
        let settings: any = null;
        try {
            settings = await prisma.storeSettings.findUnique({ where: { id: 1 } });
        } catch (err) {
            console.warn('[SettingsController] Missing columns in database, running ensureColumnsExist...');
            await this.ensureColumnsExist();
            try {
                settings = await prisma.storeSettings.findUnique({ where: { id: 1 } });
            } catch (retryErr) {
                console.error('[SettingsController] Retry findUnique failed:', retryErr);
            }
        }

        if (!settings) {
            await this.ensureColumnsExist();
            try {
                settings = await prisma.storeSettings.create({
                    data: {
                        id: 1,
                        siteName: 'Ortofrutta Butti',
                        tagline: 'Freschezza quotidiana',
                        contactEmail: 'info@ortofruttabutti.it',
                        contactPhone: '+39 0341 000 000',
                        contactAddress: 'Via Roma 1, Valmadrera (LC)',
                        openingHours: 'Lunedì - Sabato: 08:00 - 12:30 / 15:30 - 19:00',
                        announcementActive: false,
                        waTemplateCreated: DEFAULT_WA_TEMPLATES.waTemplateCreated,
                        waTemplateWeighing: DEFAULT_WA_TEMPLATES.waTemplateWeighing,
                        waTemplateOutForDelivery: DEFAULT_WA_TEMPLATES.waTemplateOutForDelivery,
                        waTemplatePickupReady: DEFAULT_WA_TEMPLATES.waTemplatePickupReady,
                        waTemplateDelivered: DEFAULT_WA_TEMPLATES.waTemplateDelivered,
                        waTemplateCancelled: DEFAULT_WA_TEMPLATES.waTemplateCancelled,
                        waTemplateScheduled: DEFAULT_WA_TEMPLATES.waTemplateScheduled,
                        latitude: 45.8485, // Valmadrera default
                        longitude: 9.3568,
                        logoUrl: null,
                        colorTheme: 'green',
                        primaryColor: '#16a34a',
                        accentColor: '#ef4444',
                        pickupCutoffHour: 12,
                        deliveryCutoffHour: 12
                    }
                });
            } catch (createErr) {
                // Record ID=1 already exists, fetch again
                settings = await prisma.storeSettings.findFirst();
            }
        }

        if (settings) {
            // Auto-populate any missing or blank WhatsApp templates
            const missingTemplates: any = {};
            if (!settings.waTemplateCreated?.trim()) missingTemplates.waTemplateCreated = DEFAULT_WA_TEMPLATES.waTemplateCreated;
            if (!settings.waTemplateWeighing?.trim()) missingTemplates.waTemplateWeighing = DEFAULT_WA_TEMPLATES.waTemplateWeighing;
            if (!settings.waTemplateOutForDelivery?.trim()) missingTemplates.waTemplateOutForDelivery = DEFAULT_WA_TEMPLATES.waTemplateOutForDelivery;
            if (!settings.waTemplatePickupReady?.trim()) missingTemplates.waTemplatePickupReady = DEFAULT_WA_TEMPLATES.waTemplatePickupReady;
            if (!settings.waTemplateDelivered?.trim()) missingTemplates.waTemplateDelivered = DEFAULT_WA_TEMPLATES.waTemplateDelivered;
            if (!settings.waTemplateCancelled?.trim()) missingTemplates.waTemplateCancelled = DEFAULT_WA_TEMPLATES.waTemplateCancelled;
            if (!settings.waTemplateScheduled?.trim()) missingTemplates.waTemplateScheduled = DEFAULT_WA_TEMPLATES.waTemplateScheduled;

            if (Object.keys(missingTemplates).length > 0) {
                try {
                    settings = await prisma.storeSettings.update({
                        where: { id: settings.id },
                        data: missingTemplates
                    });
                } catch (err) {
                    settings = { ...settings, ...missingTemplates };
                }
            }
        }

        if (!settings.deliveryTimeSlots) {
            try {
                settings = await prisma.storeSettings.update({
                    where: { id: 1 },
                    data: { deliveryTimeSlots: '09:00 - 11:00, 11:00 - 13:00, 15:00 - 17:00, 17:00 - 19:00' } as any
                });
            } catch (err) {
                settings.deliveryTimeSlots = '09:00 - 11:00, 11:00 - 13:00, 15:00 - 17:00, 17:00 - 19:00';
            }
        }
        return settings;
    }

    // Public: Get global settings
    public async get(req: Request, res: Response) {
        try {
            const settings = await this.getOrCreateSettings();
            res.json(settings);
        } catch (error) {
            console.error('Error fetching settings:', error);
            res.status(500).json({ error: 'Errore durante il recupero delle impostazioni' });
        }
    }

    // Admin: Update global settings
    public async update(req: Request, res: Response) {
        try {
            await this.getOrCreateSettings(); // Ensure it exists before updating

            const {
                siteName,
                tagline,
                contactEmail,
                contactPhone,
                contactAddress,
                openingHours,
                announcementText,
                announcementActive,
                // @ts-ignore
                waTemplateCreated,
                // @ts-ignore
                waTemplateWeighing,
                // @ts-ignore
                waTemplateOutForDelivery,
                // @ts-ignore
                waTemplatePickupReady,
                // @ts-ignore
                waTemplateDelivered,
                // @ts-ignore
                waTemplateCancelled,
                // @ts-ignore
                waTemplateScheduled,
                latitude,
                longitude,
                logoUrl,
                colorTheme,
                primaryColor,
                accentColor,
                pickupCutoffHour,
                deliveryCutoffHour,
                deliveryTimeSlots,
                revolutApiKey,
                revolutEnvironment,
                revolutEnabled,
                weighingTolerancePercent
            } = req.body;

            const updateData: any = {
                siteName,
                tagline,
                contactEmail,
                contactPhone,
                contactAddress,
                openingHours,
                announcementText,
                announcementActive,
                waTemplateCreated,
                waTemplateWeighing,
                waTemplateOutForDelivery,
                waTemplatePickupReady,
                waTemplateDelivered,
                waTemplateCancelled,
                waTemplateScheduled,
                latitude,
                longitude,
                logoUrl,
                colorTheme,
                primaryColor,
                accentColor,
                pickupCutoffHour: pickupCutoffHour !== undefined ? Number(pickupCutoffHour) : undefined,
                deliveryCutoffHour: deliveryCutoffHour !== undefined ? Number(deliveryCutoffHour) : undefined
            };

            if (deliveryTimeSlots !== undefined) {
                updateData.deliveryTimeSlots = String(deliveryTimeSlots);
            }
            if (revolutApiKey !== undefined) {
                updateData.revolutApiKey = String(revolutApiKey);
            }
            if (revolutEnvironment !== undefined) {
                updateData.revolutEnvironment = String(revolutEnvironment);
            }
            if (revolutEnabled !== undefined) {
                updateData.revolutEnabled = Boolean(revolutEnabled);
            }
            if (weighingTolerancePercent !== undefined) {
                updateData.weighingTolerancePercent = Number(weighingTolerancePercent);
            }
            if (req.body.pageBackgrounds !== undefined) {
                updateData.pageBackgrounds = typeof req.body.pageBackgrounds === 'string'
                    ? req.body.pageBackgrounds
                    : JSON.stringify(req.body.pageBackgrounds);
            }
            if (req.body.customNavItems !== undefined) {
                updateData.customNavItems = typeof req.body.customNavItems === 'string'
                    ? req.body.customNavItems
                    : JSON.stringify(req.body.customNavItems);
            }
            if (req.body.navHoverOpacity !== undefined) {
                updateData.navHoverOpacity = Number(req.body.navHoverOpacity);
            }
            if (req.body.navHoverColor !== undefined) {
                updateData.navHoverColor = String(req.body.navHoverColor).trim();
            }
            if (req.body.appleLoaderPlaybackRate !== undefined) {
                updateData.appleLoaderPlaybackRate = Number(req.body.appleLoaderPlaybackRate);
            }
            if (req.body.appleLoaderMinDuration !== undefined) {
                updateData.appleLoaderMinDuration = Number(req.body.appleLoaderMinDuration);
            }
            if (req.body.appleLoaderVideoUrl !== undefined) {
                updateData.appleLoaderVideoUrl = req.body.appleLoaderVideoUrl ? String(req.body.appleLoaderVideoUrl).trim() : null;
            }
            if (req.body.appleLoaderDimension !== undefined) {
                updateData.appleLoaderDimension = Number(req.body.appleLoaderDimension);
            }
            if (req.body.appleLoaderPhrase !== undefined) {
                updateData.appleLoaderPhrase = String(req.body.appleLoaderPhrase).trim();
            }
            if (req.body.appleLoaderTextSize !== undefined) {
                updateData.appleLoaderTextSize = Number(req.body.appleLoaderTextSize);
            }
            if (req.body.appleLoaderTextBold !== undefined) {
                updateData.appleLoaderTextBold = Boolean(req.body.appleLoaderTextBold);
            }
            if (req.body.appleLoaderTextOffset !== undefined) {
                updateData.appleLoaderTextOffset = Number(req.body.appleLoaderTextOffset);
            }
            if (req.body.headerLogoSize !== undefined) {
                updateData.headerLogoSize = Number(req.body.headerLogoSize);
            }
            if (req.body.customCursorEnabled !== undefined) {
                updateData.customCursorEnabled = Boolean(req.body.customCursorEnabled);
            }
            if (req.body.customCursorStyle !== undefined) {
                updateData.customCursorStyle = String(req.body.customCursorStyle);
            }
            if (req.body.customCursorColor !== undefined) {
                updateData.customCursorColor = String(req.body.customCursorColor);
            }
            if (req.body.customCursorActiveInAdmin !== undefined) {
                updateData.customCursorActiveInAdmin = Boolean(req.body.customCursorActiveInAdmin);
            }
            if (req.body.customCursorClickEffect !== undefined) {
                updateData.customCursorClickEffect = String(req.body.customCursorClickEffect);
            }

            const updatedSettings = await prisma.storeSettings.update({
                where: { id: 1 },
                data: updateData
            });

            res.json(updatedSettings);
        } catch (error) {
            console.error('Error updating settings:', error);
            res.status(500).json({ error: 'Errore durante il salvataggio delle impostazioni' });
        }
    }

    public async uploadBackground(req: Request, res: Response) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'Nessun file caricato' });
            }
            const publicUrl = `/uploads/backgrounds/${req.file.filename}`;
            res.json({ url: publicUrl, filename: req.file.filename });
        } catch (error: any) {
            console.error('Error uploading background:', error);
            res.status(500).json({ error: error.message || 'Errore durante il caricamento dello sfondo' });
        }
    }

    public async uploadLoaderVideo(req: Request, res: Response) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'Nessun file video caricato' });
            }
            const publicUrl = `/uploads/loaders/${req.file.filename}`;
            
            // Aggiorna subito le impostazioni con la nuova URL
            const updated = await prisma.storeSettings.update({
                where: { id: 1 },
                data: { appleLoaderVideoUrl: publicUrl }
            });

            res.json({ url: publicUrl, filename: req.file.filename, settings: updated });
        } catch (error: any) {
            console.error('Error uploading loader video:', error);
            res.status(500).json({ error: error.message || 'Errore durante il caricamento del video' });
        }
    }
}
