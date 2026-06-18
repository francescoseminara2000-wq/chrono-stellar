import { prisma } from '../lib/prisma';
import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';

export class WhatsAppService {
    private client: Client;
    private qrCode: string | null = null;
    private isReady: boolean = false;
    private static instance: WhatsAppService;

    private constructor() {
        this.client = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: {
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
                headless: true
            }
        });

        this.initialize();
        this.setupExitHandlers();
    }

    private setupExitHandlers() {
        const cleanExit = async () => {
            console.log('[WhatsApp] Clean shutdown of WhatsApp client...');
            try {
                await this.client.destroy();
            } catch (err) {
                // ignore
            }
        };

        process.on('SIGINT', async () => {
            await cleanExit();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            await cleanExit();
            process.exit(0);
        });
    }

    public static getInstance(): WhatsAppService {
        if (!WhatsAppService.instance) {
            WhatsAppService.instance = new WhatsAppService();
        }
        return WhatsAppService.instance;
    }

    private initialize() {
        this.client.on('qr', async (qr) => {
            console.log('WhatsApp QR generated');
            try {
                this.qrCode = await qrcode.toDataURL(qr);
            } catch (err) {
                console.error('Error generating QR', err);
            }
            this.isReady = false;
        });

        this.client.on('ready', () => {
            console.log('WhatsApp Client is ready!');
            this.isReady = true;
            this.qrCode = null;
        });

        this.client.on('authenticated', () => {
            console.log('WhatsApp Authenticated');
        });

        this.client.on('auth_failure', msg => {
            console.error('WhatsApp Auth Failure', msg);
            this.isReady = false;
        });

        this.client.on('disconnected', (reason) => {
            console.log('WhatsApp Client was logged out', reason);
            this.isReady = false;
            // Client usually destroys itself on logout, might need re-init
            this.client.initialize();
        });

        this.client.initialize().catch(err => {
            console.error('[WhatsApp] Failed to initialize client:', err);
            this.isReady = false;
        });
    }

    public getStatus() {
        return {
            isConnected: this.isReady,
            qrCode: this.qrCode
        };
    }

    public async sendMessage(phoneNumber: string, message: string) {
        console.log(`[WhatsApp] Attempting to send to: ${phoneNumber}`);

        if (!this.isReady) {
            console.warn('[WhatsApp] Client not ready');
            throw new Error('WhatsApp client is not ready');
        }

        try {
            // formatting: remove non-digits
            let cleanPhone = phoneNumber.replace(/[^0-9]/g, '');

            // Handle Italian numbers logic
            if (cleanPhone.length === 10 && cleanPhone.startsWith('3')) {
                cleanPhone = '39' + cleanPhone;
            }
            else if (cleanPhone.startsWith('0039')) {
                cleanPhone = cleanPhone.substring(2);
            }

            console.log(`[WhatsApp] Cleaned number: ${cleanPhone}`);

            let chatId = `${cleanPhone}@c.us`;

            // Try to validate number first
            const check = await this.client.getNumberId(cleanPhone);
            if (check) {
                chatId = check._serialized;
                console.log(`[WhatsApp] Number validated: ${chatId}`);
            } else {
                console.warn(`[WhatsApp] Number verification failed for ${cleanPhone}. Trying to send anyway to ${chatId}...`);
            }

            await this.client.sendMessage(chatId, message);
            console.log(`[WhatsApp] Message successfully sent to ${chatId}`);
            return true;
        } catch (error) {
            console.error('[WhatsApp] Error sending message:', error);
            throw error;
        }
    }

    public async sendOrderNotification(order: any, type: 'CREATED' | 'WEIGHING_COMPLETED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED') {
        if (!order.customerPhone) {
            console.log('[WhatsApp] No customer phone, skipping notification');
            return;
        }

        // Fetch settings for templates
        const settings = await prisma.storeSettings.findUnique({ where: { id: 1 } });

        let template = '';
        switch (type) {
            case 'CREATED':
                // @ts-ignore
                template = settings?.waTemplateCreated || `Ciao [cliente], grazie per il tuo ordine #[id]! 🍎\n\nLo abbiamo ricevuto e inizieremo a prepararlo a breve.\nTi invieremo un messaggio appena pesati i prodotti freschi con il totale esatto.\n\nRiepilogo:\n[prodotti]`;
                break;
            case 'WEIGHING_COMPLETED':
                // @ts-ignore
                template = settings?.waTemplateWeighing || `Ciao [cliente], il tuo ordine #[id] è pronto! ⚖️\n\nAbbiamo pesato i prodotti freschi.\n💰 *Totale aggiornato: € [totale]*\n\nDettaglio pesatura:\n[prodotti]\n\nPuoi procedere al ritiro o attendere la consegna.`;
                break;
            case 'OUT_FOR_DELIVERY':
                if (order.deliveryMethod === 'PICKUP') {
                    // @ts-ignore
                    template = settings?.waTemplatePickupReady || `Ciao [cliente], il tuo ordine #[id] è pronto per il ritiro in negozio! 🏪\n\nTi aspettiamo negli orari di apertura.\n💰 Totale da pagare: € [totale]`;
                } else {
                    // @ts-ignore
                    template = settings?.waTemplateOutForDelivery || `Ciao [cliente], il tuo ordine #[id] è in consegna! 🚚\n\nIl nostro corriere sta arrivando da te.\n📍 Indirizzo: [indirizzo]\n💰 Totale da pagare: € [totale]`;
                }
                break;
            case 'DELIVERED':
                // @ts-ignore
                template = settings?.waTemplateDelivered || `Ciao [cliente], ordine #[id] consegnato. Grazie mille! 🥗\n\nSperiamo che i prodotti siano di tuo gradimento.\nAlla prossima! 👋`;
                break;
            case 'CANCELLED':
                // @ts-ignore
                template = settings?.waTemplateCancelled || `Ciao [cliente], ci dispiace informarti che l'ordine #[id] è stato annullato.\nPer maggiori informazioni, non esitare a contattarci.`;
                break;
        }

        // Prepare products list
        let productsList = '';
        if (order.items) {
            order.items.forEach((item: any) => {
                if (type === 'WEIGHING_COMPLETED') {
                    if (item.product.isVariableWeight) {
                        const unitStr = item.product.unitType === 'PZ' ? 'pz' : 'kg';
                        productsList += `- ${item.product.name}: ${item.quantityFulfilled}kg (Ord: ${item.quantityOrdered} ${unitStr})\n`;
                    } else {
                        const unitText = item.product.unitType === 'BOX' ? 'box' : item.product.unitType.toLowerCase();
                        productsList += `- ${item.product.name}: ${item.quantityFulfilled} ${unitText}\n`;
                    }
                } else {
                    productsList += `- ${item.quantityOrdered}x ${item.product.name}\n`;
                }
            });
        }

        const total = (order.finalTotal ? order.finalTotal / 100 : (order.estimatedTotal / 100)).toFixed(2);

        // Replace placeholders
        let message = template
            .replace(/\[id\]/g, order.id.toString())
            .replace(/\[cliente\]/g, order.customerName || 'Cliente')
            .replace(/\[totale\]/g, total)
            .replace(/\[prodotti\]/g, productsList.trim())
            .replace(/\[indirizzo\]/g, order.shippingAddress || 'Ritiro in negozio')
            .replace(/\[note\]/g, order.deliveryNotes || '');

        // Add Footer
        message += `\n\n_${settings?.siteName || 'Ortofrutta'}_`;

        return this.sendMessage(order.customerPhone, message);
    }
}
