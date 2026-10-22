import { prisma } from '../lib/prisma';
import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import fs from 'fs';
import path from 'path';

export interface WhatsAppLogEntry {
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    message: string;
}

export interface WatchdogEntry {
    orderId: number;
    customerEmail?: string;
    order: any;
    status: string;
    timer: any;
    sentAt: Date;
}

export class WhatsAppService {
    private client!: Client;
    private qrCode: string | null = null;
    private isReady: boolean = false;
    private isAuthenticated: boolean = false;
    private loadingPercent: number | null = null;
    private pingInterval: any = null;
    private isReconnecting: boolean = false;
    private logBuffer: WhatsAppLogEntry[] = [];
    private watchdogMap: Map<string, WatchdogEntry> = new Map();
    private static instance: WhatsAppService;

    public log(level: 'info' | 'warn' | 'error', message: string, meta?: any) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('it-IT');
        const metaStr = meta ? ` ${typeof meta === 'object' ? JSON.stringify(meta) : meta}` : '';
        const fullMsg = `${message}${metaStr}`;

        if (level === 'error') {
            console.error(`[${timeStr}] [WhatsApp] ❌ ${fullMsg}`);
        } else if (level === 'warn') {
            console.warn(`[${timeStr}] [WhatsApp] ⚠️ ${fullMsg}`);
        } else {
            console.log(`[${timeStr}] [WhatsApp] ℹ️ ${fullMsg}`);
        }

        this.logBuffer.unshift({ timestamp: timeStr, level, message: fullMsg });
        if (this.logBuffer.length > 250) {
            this.logBuffer.pop();
        }

        try {
            const logsDir = path.join(process.cwd(), 'logs');
            if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
            fs.appendFileSync(path.join(logsDir, 'whatsapp.log'), `[${now.toISOString()}] [${level.toUpperCase()}] ${fullMsg}\n`);
        } catch (e) {}
    }

    public getLogs(): WhatsAppLogEntry[] {
        return this.logBuffer;
    }

    private constructor() {
        this.log('info', 'WhatsAppService instance initializing...');
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

        const modernChromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

        this.client = new Client({
            authStrategy: new LocalAuth({
                clientId: 'chrono-session',
                dataPath: path.join(process.cwd(), '.wwebjs_auth')
            }),
            webVersionCache: {
                type: 'remote',
                remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/{version}.html',
                strict: false
            },
            userAgent: modernChromeUA,
            puppeteer: {
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-accelerated-2d-canvas',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding',
                    '--no-first-run',
                    '--no-zygote',
                    `--user-agent=${modernChromeUA}`
                ],
                headless: true
            }
        });

        this.initialize();
    }

    public async resetConnection() {
        console.log('[WhatsApp] Resetting WhatsApp connection and session...');
        this.isReady = false;
        this.isAuthenticated = false;
        this.loadingPercent = null;
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

        // Wait 1.5s for Chromium processes and file handles to fully release on Windows
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Remove .wwebjs_auth and .wwebjs_cache directories if they exist to clear stuck/corrupt session
        try {
            const authPath = path.join(process.cwd(), '.wwebjs_auth');
            if (fs.existsSync(authPath)) {
                fs.rmSync(authPath, { recursive: true, force: true });
                console.log('[WhatsApp] Cleared .wwebjs_auth folder');
            }
        } catch (fsErr) {
            console.error('[WhatsApp] Could not remove .wwebjs_auth folder:', fsErr);
        }

        try {
            const cachePath = path.join(process.cwd(), '.wwebjs_cache');
            if (fs.existsSync(cachePath)) {
                fs.rmSync(cachePath, { recursive: true, force: true });
                console.log('[WhatsApp] Cleared .wwebjs_cache folder');
            }
        } catch (cErr) {
            console.error('[WhatsApp] Could not remove .wwebjs_cache folder:', cErr);
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

        // Allow a 60-second grace period for newly authenticated sessions to settle and sync initial state
        let failureCount = 0;
        setTimeout(() => {
            if (!this.isReady) return;
            this.pingInterval = setInterval(async () => {
                if (this.isReady && this.client && !this.isReconnecting) {
                    try {
                        const state: any = await this.client.getState().catch(() => null);
                        if (state === 'CONNECTED') {
                            failureCount = 0;
                        } else if (state && state !== 'CONNECTED') {
                            failureCount++;
                            console.warn(`[WhatsApp Heartbeat] State check warning (${failureCount}/3): ${state}`);
                            if (failureCount >= 3) {
                                console.warn('[WhatsApp Heartbeat] Disconnection confirmed. Triggering reconnect...');
                                failureCount = 0;
                                this.reconnect();
                            }
                        }
                    } catch (err) {
                        failureCount++;
                        console.warn(`[WhatsApp Heartbeat] Check error (${failureCount}/3):`, err);
                        if (failureCount >= 3) {
                            console.warn('[WhatsApp Heartbeat] Persistent connection check failure. Triggering reconnect...');
                            failureCount = 0;
                            this.reconnect();
                        }
                    }
                }
            }, 60000);
        }, 60000);
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
            this.log('info', 'QR code generated and waiting for mobile scan');
            try {
                this.qrCode = await qrcode.toDataURL(qr);
            } catch (err: any) {
                this.log('error', 'Error converting QR to data URL:', err?.message || err);
            }
            this.isReady = false;
            this.isAuthenticated = false;
            this.loadingPercent = null;
        });

        this.client.on('authenticated', async () => {
            this.log('info', 'Authenticated successfully with mobile device!');
            this.qrCode = null;
            this.isAuthenticated = true;

            // Check page readiness in background
            let checks = 0;
            const authCheckInterval = setInterval(async () => {
                checks++;
                if (this.isReady) {
                    clearInterval(authCheckInterval);
                    return;
                }
                try {
                    const isPageReady = await (this.client as any).pupPage?.evaluate(() => {
                        return typeof (window as any).WWebJS !== 'undefined' && typeof (window as any).Store !== 'undefined';
                    }).catch(() => false);

                    if (isPageReady) {
                        this.log('info', 'Puppeteer page confirmed Store and WWebJS are fully injected!');
                        this.isReady = true;
                        this.isAuthenticated = true;
                        this.qrCode = null;
                        this.startHeartbeat();
                        clearInterval(authCheckInterval);
                        return;
                    }
                } catch (e) {}

                if (checks >= 30) {
                    clearInterval(authCheckInterval);
                }
            }, 1500);
        });

        this.client.on('loading_screen', (percent: number, message: string) => {
            this.log('info', `Loading screen progress: ${percent}% - ${message}`);
            this.qrCode = null;
            this.isAuthenticated = true;
            this.loadingPercent = percent;
        });

        this.client.on('ready', () => {
            this.log('info', 'Client emitted READY event! WhatsApp is fully connected and ready to send messages.');
            this.isReady = true;
            this.isAuthenticated = true;
            this.loadingPercent = null;
            this.qrCode = null;
            this.startHeartbeat();
        });

        this.client.on('message_ack', async (msg: any, ack: number) => {
            try {
                const msgId = msg?.id?._serialized || msg?.id?.id;
                this.log('info', `[WhatsAppService] message_ack for ${msgId}: ack=${ack}`);
                if (msgId) {
                    await this.handleMessageAck(msgId, ack);
                }
            } catch (err: any) {
                this.log('warn', `[WhatsAppService] message_ack handler error: ${err?.message || err}`);
            }
        });

        this.client.on('auth_failure', (msg: any) => {
            this.log('error', `Authentication failure: ${JSON.stringify(msg)}`);
            this.isReady = false;
            this.isAuthenticated = false;
            this.loadingPercent = null;
        });

        this.client.on('disconnected', (reason: any) => {
            this.log('warn', `Client disconnected. Reason: ${reason}`);
            this.isReady = false;
            this.isAuthenticated = false;
            this.loadingPercent = null;
            if (reason !== 'NAVIGATION') {
                this.reconnect();
            }
        });

        this.client.initialize().catch((err: any) => {
            this.log('error', `Failed to initialize client: ${err?.message || err}`);
            this.isReady = false;
            this.isAuthenticated = false;
        });
    }

    public async checkOrPromoteReady(): Promise<{ isConnected: boolean; isAuthenticated: boolean; loadingPercent: number | null; qrCode: string | null; diagnostic?: any }> {
        if (!this.client) return this.getStatus();

        try {
            const state = await this.client.getState().catch(() => null);
            if (state) {
                this.log('info', `[WhatsAppService] client.getState() = "${state}"`);
            }

            if (state === 'CONNECTED') {
                this.isAuthenticated = true;
                this.qrCode = null;
            }

            if ((this.client as any).pupPage) {
                const info = await (this.client as any).pupPage.evaluate(() => {
                    const storeObj = (window as any).Store;
                    const wwebjsObj = (window as any).WWebJS;
                    const authState = (window as any).AuthStore?.AppState?.state;
                    const progressEl = document.querySelector('progress, [role="progressbar"]');
                    const progressVal = progressEl?.getAttribute('value') || progressEl?.textContent || null;
                    const modalEl = document.querySelector('div[data-animate-modal-popup="true"]');
                    const chatListEl = document.querySelector('[data-testid="chat-list"], [aria-label="Chat list"], #pane-side');

                    return {
                        hasStore: Boolean(storeObj),
                        hasWWebJS: Boolean(wwebjsObj),
                        hasChatList: Boolean(chatListEl),
                        authState: authState || null,
                        title: document.title,
                        progress: progressVal,
                        modalText: modalEl?.textContent?.slice(0, 150) || null
                    };
                }).catch((e: any) => ({ error: e?.message }));

                this.log('info', `[WhatsAppService] Page diagnostic: hasStore=${info.hasStore}, hasWWebJS=${info.hasWWebJS}, hasChatList=${info.hasChatList}, title="${info.title}", progress="${info.progress || 'none'}", modal="${info.modalText || 'none'}"`);

                if (info.hasStore && info.hasWWebJS) {
                    if (!this.isReady) {
                        this.log('info', '[WhatsAppService] Store & WWebJS detected! Setting isReady = true.');
                        this.isReady = true;
                        this.isAuthenticated = true;
                        this.loadingPercent = null;
                        this.qrCode = null;
                        this.startHeartbeat();
                    }
                } else if (info.hasChatList || state === 'CONNECTED') {
                    this.log('info', '[WhatsAppService] Chat list is active in DOM! Ensuring Store and WWebJS injection...');
                    await this.ensureInjected();
                }
            }
        } catch (err: any) {
            this.log('warn', `[WhatsAppService] checkOrPromoteReady error: ${err?.message || err}`);
        }

        return this.getStatus();
    }

    public async ensureInjected(): Promise<boolean> {
        if (!this.client) return false;
        const pupPage = (this.client as any).pupPage;
        if (!pupPage) return false;

        try {
            const status = await pupPage.evaluate(() => {
                const wwebjs = (window as any).WWebJS;
                const store = (window as any).Store;
                return {
                    hasStore: typeof store !== 'undefined' && typeof store.Chat !== 'undefined',
                    hasWWebJS: typeof wwebjs !== 'undefined' && typeof wwebjs.getChat === 'function' && typeof wwebjs.sendMessage === 'function'
                };
            }).catch(() => ({ hasStore: false, hasWWebJS: false }));

            if (status.hasStore && status.hasWWebJS) {
                this.isReady = true;
                this.isAuthenticated = true;
                return true;
            }

            this.log('info', `[WhatsAppService] Page injection required (hasStore=${status.hasStore}, hasWWebJS=${status.hasWWebJS}). Injecting modules...`);

            // @ts-ignore
            const { ExposeStore } = require('whatsapp-web.js/src/util/Injected/Store');
            // @ts-ignore
            const { LoadUtils } = require('whatsapp-web.js/src/util/Injected/Utils');
            // @ts-ignore
            const InterfaceController = require('whatsapp-web.js/src/util/InterfaceController');

            if (!status.hasStore) {
                await pupPage.evaluate(ExposeStore).catch((e: any) => this.log('warn', `ExposeStore injection: ${e?.message}`));
                await new Promise(r => setTimeout(r, 400));
            }

            if (!status.hasWWebJS) {
                await pupPage.evaluate(LoadUtils).catch((e: any) => this.log('warn', `LoadUtils injection: ${e?.message}`));
            }

            if (!(this.client as any).interface) {
                (this.client as any).interface = new InterfaceController(this.client);
            }

            const recheck = await pupPage.evaluate(() => {
                const wwebjs = (window as any).WWebJS;
                const store = (window as any).Store;
                return {
                    hasStore: typeof store !== 'undefined',
                    hasWWebJS: typeof wwebjs !== 'undefined' && typeof wwebjs.getChat === 'function' && typeof wwebjs.sendMessage === 'function'
                };
            }).catch(() => ({ hasStore: false, hasWWebJS: false }));

            if (recheck.hasWWebJS) {
                this.log('info', '[WhatsAppService] Store & WWebJS verified in page!');
                this.isReady = true;
                this.isAuthenticated = true;
                return true;
            } else {
                this.log('warn', `[WhatsAppService] Post-injection status: hasStore=${recheck.hasStore}, hasWWebJS=${recheck.hasWWebJS}`);
            }
        } catch (err: any) {
            this.log('error', `[WhatsAppService] ensureInjected error: ${err?.message || err}`);
        }
        return false;
    }

    public getStatus() {
        return {
            isConnected: this.isReady,
            isAuthenticated: this.isAuthenticated,
            loadingPercent: this.loadingPercent,
            qrCode: this.qrCode
        };
    }

    public async sendMessage(phoneNumber: string, message: string): Promise<any> {
        this.log('info', `sendMessage requested for number: "${phoneNumber}"`);

        // Guarantee Store and WWebJS are injected before calling client.sendMessage
        await this.ensureInjected();

        if (!this.isReady) {
            const state = await this.client.getState().catch(() => null);
            if (state === 'CONNECTED') {
                this.isReady = true;
                this.isAuthenticated = true;
            }
        }

        if (!this.isReady) {
            const errMsg = `WhatsApp client not ready (isReady=false, isAuthenticated=${this.isAuthenticated})`;
            this.log('warn', errMsg);
            throw new Error(errMsg);
        }

        try {
            let cleanPhone = (phoneNumber || '').replace(/[^0-9]/g, '');

            if (cleanPhone.length === 10 && cleanPhone.startsWith('3')) {
                cleanPhone = '39' + cleanPhone;
            } else if (cleanPhone.startsWith('0039')) {
                cleanPhone = cleanPhone.substring(2);
            } else if (cleanPhone.length === 12 && cleanPhone.startsWith('393')) {
                // Valid Italian international number
            }

            this.log('info', `Formatted phone number: ${phoneNumber} -> ${cleanPhone}`);

            let chatId = `${cleanPhone}@c.us`;

            // Validate number via getNumberId with timeout
            try {
                const getNumberPromise = this.client.getNumberId(cleanPhone).catch((e) => {
                    this.log('warn', `getNumberId error: ${e?.message}`);
                    return null;
                });
                const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
                const check: any = await Promise.race([getNumberPromise, timeoutPromise]);
                if (check && check._serialized) {
                    chatId = check._serialized;
                    this.log('info', `WhatsApp API verified number: ${chatId}`);
                } else {
                    this.log('info', `Verification returned null/timeout, sending directly to ${chatId}`);
                }
            } catch (vErr: any) {
                this.log('warn', `Number verification exception: ${vErr?.message}`);
            }

            this.log('info', `Calling client.sendMessage to ${chatId}... (Length: ${message.length} chars)`);
            let sentResult: any;
            try {
                sentResult = await this.client.sendMessage(chatId, message);
            } catch (firstErr: any) {
                if (firstErr?.message?.includes('getChat') || firstErr?.message?.includes('WWebJS')) {
                    this.log('warn', `getChat error on first attempt, re-injecting WWebJS and retrying...`);
                    await this.ensureInjected();
                    sentResult = await this.client.sendMessage(chatId, message);
                } else {
                    throw firstErr;
                }
            }
            
            if (sentResult) {
                this.log('info', `Message successfully sent to ${chatId}! ID: ${sentResult.id?._serialized || 'OK'}`);
            } else {
                this.log('warn', `client.sendMessage returned null or undefined for ${chatId}`);
            }
            return sentResult || true;
        } catch (error: any) {
            this.log('error', `Failed to send WhatsApp message to ${phoneNumber}: ${error?.message || error}`);
            throw error;
        }
    }

    public async sendTestMessage(phoneNumber: string, customMessage?: string) {
        this.log('info', `Manual Test Message requested for: ${phoneNumber}`);
        const testText = customMessage || `🔔 *Test Connessione WhatsApp*\n\nQuesto è un messaggio di prova inviato dal pannello amministratore di Ortofrutta Butti.\n\nSe ricevi questo messaggio, l'integrazione è 100% funzionante! ✅\nData: ${new Date().toLocaleString('it-IT')}`;
        return await this.sendMessage(phoneNumber, testText);
    }

    public async sendOrderNotification(order: any, type: string) {
        const phone = order.customerPhone || order.user?.phone;
        this.log('info', `sendOrderNotification triggered for Order #${order.id}, Status/Type: "${type}", Phone: "${phone || 'NONE'}"`);

        if (!phone) {
            this.log('warn', `Order #${order.id} has no customer phone (order.customerPhone=${order.customerPhone}, order.user.phone=${order.user?.phone}), skipping WhatsApp`);
            return false;
        }

        // Fetch settings for templates safely
        let settings: any = null;
        try {
            settings = await prisma.storeSettings.findUnique({ where: { id: 1 } });
        } catch (e: any) {
            this.log('warn', `Could not load StoreSettings from DB, falling back to built-in templates: ${e?.message}`);
        }

        const normalizedType = (type || '').toUpperCase();
        let template = '';
        switch (normalizedType) {
            case 'CREATED':
            case 'PENDING':
                template = settings?.waTemplateCreated || `Ciao [cliente], grazie per il tuo ordine #[id]! 🍎\n\nLo abbiamo ricevuto e inizieremo a prepararlo a breve.\nTi invieremo un messaggio appena pesati i prodotti freschi con il totale esatto.\n\nRiepilogo:\n[prodotti]`;
                break;
            case 'WEIGHING_COMPLETED':
                template = settings?.waTemplateWeighing || `Ciao [cliente], il tuo ordine #[id] è pronto! ⚖️\n\nAbbiamo pesato i prodotti freschi.\n💰 *Totale aggiornato: € [totale]*\n\nDettaglio pesatura:\n[prodotti]\n\nPuoi procedere al ritiro o attendere la consegna.`;
                break;
            case 'OUT_FOR_DELIVERY':
                if (order.deliveryMethod === 'PICKUP') {
                    template = settings?.waTemplatePickupReady || `Ciao [cliente], il tuo ordine #[id] è pronto per il ritiro in negozio! 🏪\n\nTi aspettiamo negli orari di apertura.\n💰 Totale da pagare: € [totale]`;
                } else {
                    template = settings?.waTemplateOutForDelivery || `Ciao [cliente], il tuo ordine #[id] è in consegna! 🚚\n\nIl nostro corriere sta arrivando da te.\n📍 Indirizzo: [indirizzo]\n💰 Totale da pagare: € [totale]`;
                }
                break;
            case 'PICKUP_READY':
                template = settings?.waTemplatePickupReady || `Ciao [cliente], il tuo ordine #[id] è pronto per il ritiro in negozio! 🏪\n\nTi aspettiamo negli orari di apertura.\n💰 Totale da pagare: € [totale]`;
                break;
            case 'DELIVERED':
                template = settings?.waTemplateDelivered || `Ciao [cliente], ordine #[id] consegnato. Grazie mille! 🥗\n\nSperiamo che i prodotti siano di tuo gradimento.\nAlla prossima! 👋`;
                break;
            case 'CANCELLED':
                template = settings?.waTemplateCancelled || `Ciao [cliente], ci dispiace informarti che l'ordine #[id] è stato annullato.\nPer maggiori informazioni, non esitare a contattarci.`;
                break;
            case 'SCHEDULED':
                template = settings?.waTemplateScheduled || `Ciao [cliente], la consegna/ritiro del tuo ordine #[id] è programmata per il [data] alle [ora]. A presto! 📅`;
                break;
            default:
                template = `Ciao [cliente], il tuo ordine #[id] è stato aggiornato allo stato: ${type}.\n💰 Totale: € [totale]`;
                break;
        }

        // Prepare products list
        let productsList = '';
        if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item: any) => {
                const prodName = item.product?.name || item.name || 'Prodotto';
                if (normalizedType === 'WEIGHING_COMPLETED') {
                    if (item.product?.isVariableWeight) {
                        const chosenUnit = item.orderedUnit || item.product?.unitType;
                        const unitStr = chosenUnit === 'PZ' ? 'pz' : 'kg';
                        productsList += `- ${prodName}: ${item.quantityFulfilled ?? item.quantityOrdered}kg (Ord: ${item.quantityOrdered} ${unitStr})\n`;
                    } else {
                        const chosenUnit = item.orderedUnit || item.product?.unitType;
                        const unitText = chosenUnit === 'BOX' ? 'box' : (chosenUnit ? chosenUnit.toLowerCase() : 'pz');
                        productsList += `- ${prodName}: ${item.quantityFulfilled ?? item.quantityOrdered} ${unitText}\n`;
                    }
                } else {
                    productsList += `- ${item.quantityOrdered}x ${prodName}\n`;
                }
            });
        }

        const total = (order.finalTotal ? order.finalTotal / 100 : (order.estimatedTotal ? order.estimatedTotal / 100 : 0)).toFixed(2);

        // Replace placeholders
        let message = template
            .replace(/\[id\]/g, order.id.toString())
            .replace(/\[cliente\]/g, order.customerName || order.user?.name || 'Cliente')
            .replace(/\[totale\]/g, total)
            .replace(/\[prodotti\]/g, productsList.trim())
            .replace(/\[indirizzo\]/g, order.shippingAddress || 'Ritiro in negozio')
            .replace(/\[note\]/g, order.deliveryNotes || '')
            .replace(/\[data\]/g, order.scheduledDate || '')
            .replace(/\[ora\]/g, order.scheduledTime || '')
            .replace(/\[metodo\]/g, order.deliveryMethod === 'PICKUP' ? 'Ritiro in negozio' : 'Consegna a domicilio');

        if (order.approvalToken) {
            const domain = process.env.PUBLIC_URL || 'https://ortofruttabutti.it';
            const approvalUrl = `${domain}/conferma-pesatura/${order.id}?token=${order.approvalToken}`;

            if (order.approvalStatus === 'AWAITING_CUSTOMER_APPROVAL' || order.requiresApproval) {
                message += `\n\n⚖️ *Conferma Pesatura Richiesta*\nPer visualizzare lo scontrino dettagliato ed approvare il tuo ordine, tocca il link qui sotto:\n👉 ${approvalUrl}`;
            } else {
                message += `\n\n🧾 *Scontrino Digitale Pesatura*\nPuoi controllare il dettaglio dei pesi effettivi e lo scontrino completo cliccando qui:\n👉 ${approvalUrl}`;
            }
        }

        // Add Footer
        message += `\n\n_${settings?.siteName || 'Ortofrutta'}_`;

        try {
            const sentResult = await this.sendMessage(phone, message);
            const messageId = sentResult?.id?._serialized || (typeof sentResult === 'string' ? sentResult : null);

            if (order.id) {
                const nowTime = new Date().toLocaleTimeString('it-IT');
                await prisma.order.update({
                    where: { id: order.id },
                    data: {
                        notificationStatus: 'WHATSAPP_SENT',
                        notificationDetails: `Inviato al server WhatsApp alle ${nowTime}. In attesa di consegna sul telefono...`,
                        whatsappMessageId: messageId
                    } as any
                });

                if (messageId) {
                    // Set 3-minute Watchdog timer (180,000 ms)
                    const fallbackTimeoutMs = 3 * 60 * 1000;
                    const timer = setTimeout(async () => {
                        await this.triggerFallbackEmail(messageId);
                    }, fallbackTimeoutMs);

                    this.watchdogMap.set(messageId, {
                        orderId: order.id,
                        customerEmail: order.customerEmail || order.user?.email,
                        order,
                        status: type,
                        timer,
                        sentAt: new Date()
                    });
                    this.log('info', `[WhatsAppWatchdog] Started 3-minute delivery watchdog for Order #${order.id} (msg: ${messageId})`);
                }
            }

            return sentResult;
        } catch (error: any) {
            this.log('error', `[WhatsAppService] sendOrderNotification failed for Order #${order.id}: ${error?.message || error}. Triggering immediate email fallback...`);
            
            // Immediate fallback to email if WhatsApp send fails
            const customerEmail = order.customerEmail || order.user?.email;
            if (customerEmail) {
                try {
                    const { EmailService } = require('./EmailService');
                    const emailService = new EmailService();
                    await emailService.sendOrderStatusUpdateEmail(customerEmail, order, type, true);
                    this.log('info', `[WhatsAppService] Immediate email fallback successfully sent to ${customerEmail} for Order #${order.id}`);

                    await prisma.order.update({
                        where: { id: order.id },
                        data: {
                            notificationStatus: 'EMAIL_FALLBACK_SENT',
                            notificationDetails: `Invio WhatsApp fallito (${error?.message || 'Offline'}). Inviata email di fallback a ${customerEmail} alle ${new Date().toLocaleTimeString('it-IT')}`
                        } as any
                    });
                } catch (eErr: any) {
                    this.log('error', `[WhatsAppService] Immediate email fallback also failed: ${eErr?.message || eErr}`);
                }
            }
            throw error;
        }
    }

    public async handleMessageAck(messageId: string, ack: number) {
        // ack: 1 = ACK_SERVER (single tick), 2 = ACK_DEVICE (double tick - delivered), 3 = ACK_READ (blue ticks), -1 = ACK_ERROR
        const entry = this.watchdogMap.get(messageId);
        let targetOrderId = entry?.orderId;

        if (!targetOrderId) {
            const existingOrder = await prisma.order.findFirst({
                where: { whatsappMessageId: messageId }
            });
            targetOrderId = existingOrder?.id;
        }

        if (!targetOrderId) return;

        let orderEventBus: any = null;
        try {
            orderEventBus = require('./OrderEventBus').orderEventBus;
        } catch (e) {}

        if (ack >= 2) {
            // Cancel watchdog timer if running
            if (entry) {
                clearTimeout(entry.timer);
                this.watchdogMap.delete(messageId);
                this.log('info', `[WhatsAppWatchdog] Order #${targetOrderId} received double tick (ack=${ack})! Delivery confirmed, email fallback timer cancelled.`);
            }

            const newStatus = ack === 3 ? 'WHATSAPP_READ' : 'WHATSAPP_DELIVERED';
            const detailsText = ack === 3
                ? `Visualizzato dal cliente su WhatsApp (spunte blu) alle ${new Date().toLocaleTimeString('it-IT')}`
                : `Consegnato sul telefono del cliente (doppia spunta) alle ${new Date().toLocaleTimeString('it-IT')}`;

            const updated = await prisma.order.update({
                where: { id: targetOrderId },
                data: {
                    notificationStatus: newStatus,
                    notificationDetails: detailsText
                } as any
            });

            if (orderEventBus) {
                try {
                    orderEventBus.emit('order:notification_updated', updated);
                } catch (e) {}
            }
        } else if (ack === -1) {
            this.log('warn', `[WhatsAppWatchdog] Order #${targetOrderId} message failed with ACK_ERROR (-1). Triggering immediate email fallback...`);
            await this.triggerFallbackEmail(messageId);
        }
    }

    public async triggerFallbackEmail(messageId: string) {
        const entry = this.watchdogMap.get(messageId);
        if (!entry) return;

        this.watchdogMap.delete(messageId);
        const { orderId, customerEmail, order, status } = entry;

        this.log('warn', `[WhatsAppWatchdog] 3 minutes elapsed without WhatsApp delivery confirmation (ACK_DEVICE) for Order #${orderId}. Triggering Email Fallback...`);

        if (customerEmail) {
            try {
                const { EmailService } = require('./EmailService');
                const emailService = new EmailService();
                await emailService.sendOrderStatusUpdateEmail(customerEmail, order, status, true);
                this.log('info', `[WhatsAppWatchdog] Fallback email sent successfully to ${customerEmail} for Order #${orderId}`);

                const updated = await prisma.order.update({
                    where: { id: orderId },
                    data: {
                        notificationStatus: 'EMAIL_FALLBACK_SENT',
                        notificationDetails: `WhatsApp non recapitato entro 3 min. Inviata email di fallback a ${customerEmail} alle ${new Date().toLocaleTimeString('it-IT')}`
                    } as any
                });

                try {
                    const { orderEventBus } = require('./OrderEventBus');
                    orderEventBus.emit('order:notification_updated', updated);
                } catch (e) {}
            } catch (emailErr: any) {
                this.log('error', `[WhatsAppWatchdog] Failed to send fallback email for Order #${orderId}: ${emailErr?.message || emailErr}`);
            }
        } else {
            this.log('warn', `[WhatsAppWatchdog] Order #${orderId} has no customerEmail, cannot send email fallback.`);
            await prisma.order.update({
                where: { id: orderId },
                data: {
                    notificationStatus: 'FAILED',
                    notificationDetails: `WhatsApp non recapitato sul telefono e nessuna email cliente disponibile.`
                } as any
            });
        }
    }
}
