import { prisma } from '../lib/prisma';
import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import fs from 'fs';
import path from 'path';

export class WhatsAppService {
    private client!: Client;
    private qrCode: string | null = null;
    private isReady: boolean = false;
    private pingInterval: any = null;
    private isReconnecting: boolean = false;
    private static instance: WhatsAppService;

    private constructor() {
        this.createClient();
        this.setupExitHandlers();
    }

    private cleanChromiumLocks() {
        try {
            const authPath = path.join(process.cwd(), '.wwebjs_auth');
            if (fs.existsSync(authPath)) {
                const findAndDeleteLocks = (dir: string) => {
                    try {
                        const files = fs.readdirSync(dir);
                        for (const file of files) {
                            const fullPath = path.join(dir, file);
                            const stat = fs.statSync(fullPath);
                            if (stat.isDirectory()) {
                                findAndDeleteLocks(fullPath);
                            } else if (file.includes('SingletonLock') || file.includes('SingletonCookie') || file.includes('SingletonSocket')) {
                                try {
                                    fs.unlinkSync(fullPath);
                                    console.log(`[WhatsApp] Removed stale Chromium lock file: ${file}`);
                                } catch (e) {}
                            }
                        }
                    } catch (e) {}
                };
                findAndDeleteLocks(authPath);
            }
        } catch (err) {
            console.error('[WhatsApp] Error cleaning Chromium locks:', err);
        }
    }

    private createClient() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }

        // Clean stale Chromium SingletonLocks before initializing Puppeteer
        this.cleanChromiumLocks();

        this.client = new Client({
            authStrategy: new LocalAuth({
                clientId: 'chrono-session',
                dataPath: path.join(process.cwd(), '.wwebjs_auth')
            }),
            webVersionCache: {
                type: 'remote',
                remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1018944829-alpha.html'
            },
            puppeteer: {
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding',
                    '--no-first-run',
                    '--no-zygote'
                ],
                headless: true
            }
        });

        this.initialize();
    }

    public async resetConnection() {
        console.log('[WhatsApp] Resetting WhatsApp connection and session...');
        this.isReady = false;
        this.qrCode = null;

        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }

        try {
            if (this.client) {
                await this.client.logout().catch(() => {});
                await this.client.destroy().catch(() => {});
            }
        } catch (err) {
            console.error('[WhatsApp] Error shutting down client:', err);
        }

        // Try removing .wwebjs_auth directory if exists to clear stuck/corrupt session
        try {
            const authPath = path.join(process.cwd(), '.wwebjs_auth');
            if (fs.existsSync(authPath)) {
                fs.rmSync(authPath, { recursive: true, force: true });
                console.log('[WhatsApp] Cleared .wwebjs_auth folder');
            }
        } catch (fsErr) {
            console.error('[WhatsApp] Could not remove .wwebjs_auth folder:', fsErr);
        }

        // Re-create Client instance & initialize
        this.createClient();
        return { success: true, message: 'WhatsApp session reset. Generating new QR Code...' };
    }

    private setupExitHandlers() {
        const cleanExit = async () => {
            console.log('[WhatsApp] Clean shutdown of WhatsApp client...');
            if (this.pingInterval) clearInterval(this.pingInterval);
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

    private startHeartbeat() {
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(async () => {
            if (this.isReady && this.client && !this.isReconnecting) {
                try {
                    const state = await this.client.getState();
                    if (state !== 'CONNECTED') {
                        console.warn(`[WhatsApp Heartbeat] Disconnection detected (state: ${state}). Triggering reconnect...`);
                        this.reconnect();
                    }
                } catch (err) {
                    console.warn('[WhatsApp Heartbeat] Connection check failed. Triggering reconnect...', err);
                    this.reconnect();
                }
            }
        }, 45000);
    }

    private async reconnect() {
        if (this.isReconnecting) return;
        this.isReconnecting = true;
        this.isReady = false;
        console.log('[WhatsApp] Initiating clean reconnect...');

        try {
            if (this.client) {
                await this.client.destroy().catch(() => {});
            }
        } catch (e) {}

        setTimeout(() => {
            this.createClient();
            this.isReconnecting = false;
        }, 3000);
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
            console.log('WhatsApp Client is ready and connected!');
            this.isReady = true;
            this.qrCode = null;
            this.startHeartbeat();
        });

        this.client.on('authenticated', () => {
            console.log('WhatsApp Authenticated');
        });

        this.client.on('auth_failure', msg => {
            console.error('WhatsApp Auth Failure', msg);
            this.isReady = false;
        });

        this.client.on('disconnected', (reason) => {
            console.log('[WhatsApp] Client disconnected:', reason);
            this.isReady = false;
            this.reconnect();
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
        console.log(`[WhatsApp] Attempting to send message to: ${phoneNumber}`);

        if (!this.isReady) {
            console.warn('[WhatsApp] Client not ready (isReady = false)');
            throw new Error('WhatsApp client is not ready');
        }

        try {
            // formatting: remove non-digits
            let cleanPhone = phoneNumber.replace(/[^0-9]/g, '');

            // Handle Italian numbers logic
            if (cleanPhone.length === 10 && cleanPhone.startsWith('3')) {
                cleanPhone = '39' + cleanPhone;
            } else if (cleanPhone.startsWith('0039')) {
                cleanPhone = cleanPhone.substring(2);
            } else if (cleanPhone.length === 12 && cleanPhone.startsWith('393')) {
                // Already valid Italian international format 393XXXXXXXXX
            }

            console.log(`[WhatsApp] Formatted phone number: ${cleanPhone}`);

            let chatId = `${cleanPhone}@c.us`;

            // Try to validate number with 3s timeout
            try {
                const getNumberPromise = this.client.getNumberId(cleanPhone);
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout getNumberId')), 3000));
                const check: any = await Promise.race([getNumberPromise, timeoutPromise]).catch(() => null);
                if (check && check._serialized) {
                    chatId = check._serialized;
                    console.log(`[WhatsApp] Number validated by WhatsApp API: ${chatId}`);
                }
            } catch (vErr) {
                console.warn(`[WhatsApp] Number verification skipped or timed out, sending directly to ${chatId}`);
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
                        const chosenUnit = item.orderedUnit || item.product.unitType;
                        const unitStr = chosenUnit === 'PZ' ? 'pz' : 'kg';
                        productsList += `- ${item.product.name}: ${item.quantityFulfilled}kg (Ord: ${item.quantityOrdered} ${unitStr})\n`;
                    } else {
                        const chosenUnit = item.orderedUnit || item.product.unitType;
                        const unitText = chosenUnit === 'BOX' ? 'box' : chosenUnit.toLowerCase();
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

        if (order.approvalToken) {
            const domain = process.env.PUBLIC_URL || 'https://ortofruttabutti.it';
            const approvalUrl = `${domain}/conferma-pesatura/${order.id}?token=${order.approvalToken}`;

            if (order.approvalStatus === 'AWAITING_CUSTOMER_APPROVAL' || order.requiresApproval) {
                message += `\n\n⚠️ *Variazione Pesatura da Approvare*\nPer verificare il dettaglio della pesatura ed approvare il tuo ordine, clicca sul link qui sotto:\n🔗 ${approvalUrl}`;
            } else {
                message += `\n\n🔍 *Dettaglio Pesatura Online*\nPer verificare la pesatura ed il dettaglio dei prodotti pesati, clicca sul link qui sotto:\n🔗 ${approvalUrl}`;
            }
        }

        // Add Footer
        message += `\n\n_${settings?.siteName || 'Ortofrutta'}_`;

        return this.sendMessage(order.customerPhone, message);
    }
}
