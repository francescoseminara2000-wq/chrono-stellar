import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class SettingsController {

    // Ensure that a settings record exists, since it's a singleton (ID = 1)
    private async getOrCreateSettings() {
        let settings = await prisma.storeSettings.findUnique({ where: { id: 1 } });
        if (!settings) {
            settings = await prisma.storeSettings.create({
                data: {
                    id: 1,
                    siteName: 'Chrono Stellar',
                    tagline: 'Freschezza quotidiana',
                    contactEmail: 'info@chrono-stellar.it',
                    contactPhone: '+39 0341 000 000',
                    contactAddress: 'Via Roma 1, Valmadrera (LC)',
                    openingHours: 'Lunedì - Sabato: 08:00 - 12:30 / 15:30 - 19:00',
                    announcementActive: false,
                    // @ts-ignore
                    waTemplateCreated: 'Ciao [cliente], grazie per il tuo ordine #[id]! 🍎\n\nLo abbiamo ricevuto e inizieremo a prepararlo a breve.\nTi invieremo un messaggio appena pesati i prodotti freschi con il totale esatto.\n\nRiepilogo:\n[prodotti]',
                    // @ts-ignore
                    waTemplateWeighing: 'Ciao [cliente], il tuo ordine #[id] è pronto! ⚖️\n\nAbbiamo pesato i prodotti freschi.\n💰 *Totale aggiornato: € [totale]*\n\nDettaglio pesatura:\n[prodotti]\n\nPuoi procedere al ritiro o attendere la consegna.',
                    // @ts-ignore
                    waTemplateOutForDelivery: 'Ciao [cliente], il tuo ordine #[id] è in consegna! 🚚\n\nIl nostro corriere sta arrivando da te.\n📍 Indirizzo: [indirizzo]\n💰 Totale da pagare: € [totale]',
                    // @ts-ignore
                    waTemplatePickupReady: 'Ciao [cliente], il tuo ordine #[id] è pronto per il ritiro in negozio! 🏪\n\nTi aspettiamo negli orari di apertura.\n💰 Totale da pagare: € [totale]',
                    // @ts-ignore
                    waTemplateCancelled: 'Ciao [cliente], ci dispiace informarti che l\'ordine #[id] è stato annullato.\nPer maggiori informazioni, non esitare a contattarci.',
                    latitude: 45.8485, // Valmadrera default
                    longitude: 9.3568,
                    logoUrl: null,
                    colorTheme: 'green',
                    primaryColor: '#16a34a',
                    accentColor: '#ef4444',
                    pickupCutoffHour: 12,
                    deliveryCutoffHour: 12,
                    // @ts-ignore
                    waTemplateScheduled: 'Ciao [cliente], la pianificazione del tuo ordine #[id] è stata programmata per il [data] alle [ora]. A presto!'
                }
            });
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
                deliveryCutoffHour
            } = req.body;

            const updatedSettings = await prisma.storeSettings.update({
                where: { id: 1 },
                data: {
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
                    pickupCutoffHour: pickupCutoffHour !== undefined ? Number(pickupCutoffHour) : undefined,
                    deliveryCutoffHour: deliveryCutoffHour !== undefined ? Number(deliveryCutoffHour) : undefined
                }
            });

            res.json(updatedSettings);
        } catch (error) {
            console.error('Error updating settings:', error);
            res.status(500).json({ error: 'Errore durante il salvataggio delle impostazioni' });
        }
    }
}
