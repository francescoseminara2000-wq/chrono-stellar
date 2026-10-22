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

export interface ActiveOrderWatchdog {
    orderId: number;
    messageId: string;
    rawMessageId: string;
    customerEmail?: string;
    order: any;
    status: string;
    timer: any;
    pollInterval: any;
    sentAt: Date;
    pollCount: number;
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
    private activeOrderWatchdogs: Map<number, ActiveOrderWatchdog> = new Map();
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
                // Ensure change:ack event is properly wired to onMessageAckEvent in case of delayed injection
                await pupPage.evaluate(() => {
                    try {
                        const store = (window as any).Store;
                        if (store && store.Msg && typeof store.Msg.on === 'function') {
                            try { store.Msg.off('change:ack'); } catch (e) {}
                            store.Msg.on('change:ack', (msg: any, ack: number) => {
                                if (typeof (window as any).onMessageAckEvent === 'function') {
                                    const model = (window as any).WWebJS ? (window as any).WWebJS.getMessageModel(msg) : msg;
                                    (window as any).onMessageAckEvent(model, ack);
                                }
                            });
                        }
                    } catch (e) {}
                }).catch(() => {});

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
            console.log(`[WhatsApp Track] 📤 Inviando messaggio a ${chatId} (${message.length} caratteri)...`);
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
            
            // Fallback recovery: if sentResult lacks serialized ID, retrieve last message from chat
            if ((!sentResult || !sentResult.id || !sentResult.id._serialized) && (this.client as any).pupPage) {
                console.log(`[WhatsApp Track] ⚠️ sentResult privo di ID univoco immediato, estraggo l'ultimo messaggio dalla chat ${chatId}...`);
                const recovered = await (this.client as any).pupPage.evaluate((cId: string) => {
                    try {
                        const chat = (window as any).Store?.Chat?.get(cId);
                        if (chat && chat.msgs && chat.msgs.length) {
                            const myMsgs = chat.msgs.filter((m: any) => m.id && m.id.fromMe);
                            const last = myMsgs[myMsgs.length - 1];
                            if (last && last.id) {
                                const fullKey = (last.id && typeof last.id._serialized === 'string' && last.id._serialized)
                                    || (last.id && typeof last.id.toString === 'function' ? last.id.toString() : '')
                                    || `true_${cId}_${last.id.id || last.id}`;
                                return {
                                    id: fullKey,
                                    ack: typeof last.ack === 'number' ? last.ack : 1
                                };
                            }
                        }
                    } catch (e) {}
                    return null;
                }, chatId).catch(() => null);

                if (recovered && recovered.id) {
                    console.log(`[WhatsApp Track] ✅ ID recuperato con successo dalla memoria della chat: ${recovered.id} (ACK: ${recovered.ack})`);
                    sentResult = { id: { _serialized: recovered.id, id: recovered.id.split('_').pop() || recovered.id }, ack: recovered.ack };
                }
            }

            if (sentResult) {
                const sId = sentResult.id?._serialized || (typeof sentResult === 'string' ? sentResult : 'OK');
                this.log('info', `Message successfully sent to ${chatId}! ID: ${sId}`);
                console.log(`[WhatsApp Track] 📨 Messaggio inviato con successo a ${chatId}! ID Messaggio: ${sId}`);
            } else {
                this.log('warn', `client.sendMessage returned null or undefined for ${chatId}`);
                console.warn(`[WhatsApp Track] ⚠️ Invio completato ma nessun ID restituito per ${chatId}`);
            }
            return sentResult || true;
        } catch (error: any) {
            this.log('error', `Failed to send WhatsApp message to ${phoneNumber}: ${error?.message || error}`);
            console.error(`[WhatsApp Track] ❌ Errore invio messaggio a ${phoneNumber}:`, error?.message || error);
            throw error;
        }
    }

    public async findLastMessageForPhone(phoneNumber: string): Promise<{ id: string; ack: number } | null> {
        if (!this.client) return null;
        const page = (this.client as any).pupPage;
        if (!page) return null;

        let cleanPhone = (phoneNumber || '').replace(/[^0-9]/g, '');
        if (cleanPhone.length === 10 && cleanPhone.startsWith('3')) {
            cleanPhone = '39' + cleanPhone;
        } else if (cleanPhone.startsWith('0039')) {
            cleanPhone = cleanPhone.substring(2);
        }

        const chatId = `${cleanPhone}@c.us`;
        try {
            const result = await page.evaluate(async (cId: string) => {
                try {
                    const store = (window as any).Store;
                    if (!store || !store.Chat) return null;
                    let chat = store.Chat.get(cId);
                    if (!chat && store.Chat.find) {
                        try {
                            const wid = store.WidFactory ? store.WidFactory.createWid(cId) : cId;
                            chat = await store.Chat.find(wid);
                        } catch (e) {}
                    }
                    if (chat && chat.msgs && chat.msgs.length) {
                        const myMsgs = chat.msgs.filter((m: any) => m.id && m.id.fromMe);
                        const last = myMsgs[myMsgs.length - 1];
                        if (last && last.id) {
                            const fullKey = (last.id && typeof last.id._serialized === 'string' && last.id._serialized)
                                || (last.id && typeof last.id.toString === 'function' ? last.id.toString() : '')
                                || `true_${cId}_${last.id.id || last.id}`;
                            return {
                                id: fullKey,
                                ack: typeof last.ack === 'number' ? last.ack : 1
                            };
                        }
                    }
                } catch (e) {}
                return null;
            }, chatId).catch(() => null);

            return result;
        } catch (e) {
            return null;
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
            // Cancel any previous watchdog for this order so we strictly monitor ONLY the latest communication
            this.cancelWatchdogForOrder(order.id);

            const sentResult = await this.sendMessage(phone, message);
            let messageId = sentResult?.id?._serialized || (typeof sentResult === 'string' ? sentResult : null);
            const rawMessageId = sentResult?.id?.id || (typeof messageId === 'string' ? messageId.split('_').pop() || messageId : '');
            const initialAck = typeof sentResult?.ack === 'number' ? sentResult.ack : 1;
            const nowTime = new Date().toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome' });

            if (order.id) {
                if (initialAck >= 2) {
                    // Message delivered immediately!
                    const newStatus = initialAck === 3 ? 'WHATSAPP_READ' : 'WHATSAPP_DELIVERED';
                    const detailsText = initialAck === 3
                        ? `Visualizzato dal cliente su WhatsApp (spunte blu) alle ${nowTime}`
                        : `Consegnato sul telefono del cliente (doppia spunta) alle ${nowTime}`;

                    const updated = await prisma.order.update({
                        where: { id: order.id },
                        data: {
                            notificationStatus: newStatus,
                            notificationDetails: detailsText,
                            whatsappMessageId: messageId
                        } as any
                    });

                    this.log('info', `[WhatsAppWatchdog] Order #${order.id} was immediately delivered (ack=${initialAck})!`);
                    this.notifyOrderUpdated(updated);
                    return sentResult;
                }

                // Initial state: Sent to WhatsApp server, waiting for customer device delivery
                if (!messageId) {
                    console.warn(`[WhatsApp Track] ⚠️ Nessun messageId restituito da sendMessage per Ordine #${order.id}. Avvio recupero automatico dalla chat...`);
                    const found = await this.findLastMessageForPhone(phone);
                    if (found && found.id) {
                        messageId = found.id;
                        console.log(`[WhatsApp Track] 🔗 Message ID recuperato con successo per Ordine #${order.id}: ${messageId} (ACK: ${found.ack})`);
                    }
                }

                const updated = await prisma.order.update({
                    where: { id: order.id },
                    data: {
                        notificationStatus: 'WHATSAPP_SENT',
                        notificationDetails: `Inviato al server WhatsApp alle ${nowTime}. In attesa di consegna sul telefono...`,
                        whatsappMessageId: messageId
                    } as any
                });
                console.log(`[WhatsApp Track] 💾 Ordine #${order.id} salvato nel database con stato WHATSAPP_SENT e messageId: ${messageId || 'NULL'}`);
                this.notifyOrderUpdated(updated);

                if (messageId) {
                    const fallbackTimeoutMs = 3 * 60 * 1000;
                    const watchdogEntry: ActiveOrderWatchdog = {
                        orderId: order.id,
                        messageId,
                        rawMessageId: rawMessageId || messageId.split('_').pop() || messageId,
                        customerEmail: order.customerEmail || order.user?.email,
                        order,
                        status: type,
                        timer: null,
                        pollInterval: null,
                        sentAt: new Date(),
                        pollCount: 0
                    };

                    // 1. Fallback timer (3 minutes)
                    watchdogEntry.timer = setTimeout(async () => {
                        console.log(`[WhatsApp Track] ⏰ Scaduti 3 minuti per Ordine #${order.id}. Avvio fallback email...`);
                        await this.triggerFallbackEmailForOrder(order.id);
                    }, fallbackTimeoutMs);

                    // 2. Active poll: inspects Store.Msg in the Puppeteer page every 4s (up to 45 times = 3 mins)
                    watchdogEntry.pollInterval = setInterval(async () => {
                        try {
                            const currentEntry = this.activeOrderWatchdogs.get(order.id);
                            if (!currentEntry || currentEntry.messageId !== messageId) {
                                if (watchdogEntry.pollInterval) clearInterval(watchdogEntry.pollInterval);
                                return;
                            }

                            currentEntry.pollCount++;
                            if (currentEntry.pollCount > 45) {
                                if (currentEntry.pollInterval) clearInterval(currentEntry.pollInterval);
                                return;
                            }

                            const pageAck = await this.checkMessageAckInPage(messageId, currentEntry.rawMessageId, phone);
                            console.log(`[WhatsApp Track] 🔍 Poll #${currentEntry.pollCount} per Ordine #${order.id} (msg: ${messageId}): ACK=${pageAck}`);
                            if (pageAck >= 2) {
                                console.log(`[WhatsApp Track] 🎯 Doppia spunta rilevata (ACK=${pageAck}) per Ordine #${order.id}!`);
                                await this.handleMessageAck(messageId, pageAck);
                            }
                        } catch (pErr: any) {
                            // Poll check silent error
                        }
                    }, 4000);

                    this.activeOrderWatchdogs.set(order.id, watchdogEntry);
                    console.log(`[WhatsApp Track] 🚀 Avviato watchdog attivo di 3 minuti per Ordine #${order.id} su messaggio ${messageId}`);
                    this.log('info', `[WhatsAppWatchdog] Started 3-minute delivery watchdog exclusively for Order #${order.id} (latest msg: ${messageId})`);
                }
            }

            return sentResult;
        } catch (error: any) {
            this.log('error', `[WhatsAppService] sendOrderNotification failed for Order #${order.id}: ${error?.message || error}. Triggering immediate email fallback...`);
            
            // Immediate fallback to email if WhatsApp send fails
            const customerEmail = order.customerEmail || order.user?.email;
            if (customerEmail && order.id) {
                try {
                    const { EmailService } = require('./EmailService');
                    const emailService = new EmailService();
                    await emailService.sendOrderStatusUpdateEmail(customerEmail, order, type, true);
                    this.log('info', `[WhatsAppService] Immediate email fallback successfully sent to ${customerEmail} for Order #${order.id}`);

                    const nowTime = new Date().toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome' });
                    const updated = await prisma.order.update({
                        where: { id: order.id },
                        data: {
                            notificationStatus: 'EMAIL_FALLBACK_SENT',
                            notificationDetails: `Invio WhatsApp fallito (${error?.message || 'Offline'}). Inviata email di fallback a ${customerEmail} alle ${nowTime}`
                        } as any
                    });
                    this.notifyOrderUpdated(updated);
                } catch (eErr: any) {
                    this.log('error', `[WhatsAppService] Immediate email fallback also failed: ${eErr?.message || eErr}`);
                }
            }
            throw error;
        }
    }

    public cancelWatchdogForOrder(orderId: number) {
        const existing = this.activeOrderWatchdogs.get(orderId);
        if (existing) {
            if (existing.timer) clearTimeout(existing.timer);
            if (existing.pollInterval) clearInterval(existing.pollInterval);
            this.activeOrderWatchdogs.delete(orderId);
            this.log('info', `[WhatsAppWatchdog] Cancelled previous watchdog for Order #${orderId}`);
        }
    }

    public async checkMessageAckInPage(messageId: string, rawId: string, phone?: string): Promise<number> {
        if (!this.client) return -1;

        const effectiveRawId = rawId || (messageId.includes('_') ? messageId.split('_').pop() || messageId : messageId);

        // Try official getMessageById only if messageId has valid serialized format
        if (messageId && messageId.includes('_')) {
            try {
                const msgObj: any = await this.client.getMessageById(messageId).catch(() => null);
                if (msgObj && typeof msgObj.ack === 'number' && msgObj.ack >= 0) {
                    return msgObj.ack;
                }
            } catch (e) {}
        }

        const page = (this.client as any).pupPage;
        if (!page) return -1;

        try {
            const ack = await page.evaluate(async (fullId: string, rId: string, rawPhone?: string) => {
                try {
                    const store = (window as any).Store;
                    if (!store) return -1;

                    const getAckVal = (m: any) => {
                        if (!m) return -1;
                        if (typeof m.ack === 'number') return m.ack;
                        if (typeof m._ack === 'number') return m._ack;
                        return -1;
                    };

                    // 1. Try Store.Msg if fullId has proper serialization
                    if (fullId && fullId.includes('_') && store.Msg) {
                        let m = store.Msg.get(fullId);
                        if (m) {
                            const val = getAckVal(m);
                            if (val >= 0) return val;
                        }
                        if (store.Msg.getMessagesById) {
                            try {
                                const res = await store.Msg.getMessagesById([fullId]);
                                if (res && res.messages && res.messages.length) {
                                    const val = getAckVal(res.messages[0]);
                                    if (val >= 0) return val;
                                }
                            } catch (e) {}
                        }
                    }

                    // 2. Search in Chat messages (where messages reside in WhatsApp Web)
                    let cleanPhone = (rawPhone || '').replace(/[^0-9]/g, '');
                    if (cleanPhone.length === 10 && cleanPhone.startsWith('3')) cleanPhone = '39' + cleanPhone;
                    else if (cleanPhone.startsWith('0039')) cleanPhone = cleanPhone.substring(2);

                    const chatsToScan: any[] = [];
                    if (cleanPhone && store.Chat) {
                        const cId = cleanPhone + '@c.us';
                        let targetChat = store.Chat.get(cId);
                        if (!targetChat && store.Chat.find && store.WidFactory) {
                            try { targetChat = await store.Chat.find(store.WidFactory.createWid(cId)); } catch (e) {}
                        }
                        if (targetChat) chatsToScan.push(targetChat);
                    }

                    if (store.Chat?.getModelsArray) {
                        const all = store.Chat.getModelsArray();
                        for (const c of all) { if (c && !chatsToScan.includes(c)) chatsToScan.push(c); }
                    } else if (store.Chat?.models) {
                        for (const c of store.Chat.models) { if (c && !chatsToScan.includes(c)) chatsToScan.push(c); }
                    }

                    for (const chat of chatsToScan) {
                        if (!chat || !chat.msgs) continue;
                        let msgs: any[] = [];
                        if (typeof chat.msgs.getModelsArray === 'function') msgs = chat.msgs.getModelsArray();
                        else if (Array.isArray(chat.msgs.models)) msgs = chat.msgs.models;
                        else if (Array.isArray(chat.msgs)) msgs = chat.msgs;

                        for (let i = msgs.length - 1; i >= 0; i--) {
                            const m = msgs[i];
                            if (!m || !m.id) continue;
                            const mId = m.id.id || (typeof m.id === 'string' ? m.id : '');
                            const mFull = m.id._serialized || (typeof m.id === 'string' ? m.id : '');

                            if ((rId && (mId === rId || mFull.includes(rId))) || (fullId && (mFull === fullId || mFull.includes(fullId)))) {
                                const val = getAckVal(m);
                                if (val >= 0) return val;
                            }
                        }
                    }
                } catch (e) {}
                return -1;
            }, messageId, effectiveRawId, phone).catch(() => -1);

            return typeof ack === 'number' ? ack : -1;
        } catch (e) {
            return -1;
        }
    }

    public async handleMessageAck(messageId: string, ack: number) {
        // ack: 1 = ACK_SERVER (single tick), 2 = ACK_DEVICE (double tick - delivered), 3 = ACK_READ (blue ticks), -1 = ACK_ERROR
        this.log('info', `[WhatsAppService] handleMessageAck received for ${messageId} with ack=${ack}`);

        // Find if this message belongs to any ACTIVE watchdog
        let matchedOrderId: number | null = null;
        let entry: ActiveOrderWatchdog | undefined;

        for (const [oId, e] of this.activeOrderWatchdogs.entries()) {
            const isMatch = e.messageId === messageId || 
                (e.rawMessageId && messageId.includes(e.rawMessageId)) ||
                (messageId && e.messageId.includes(messageId));
            if (isMatch) {
                matchedOrderId = oId;
                entry = e;
                break;
            }
        }

        // If not in active watchdogs, check if it matches the Order's CURRENT latest whatsappMessageId in the database
        if (!matchedOrderId) {
            const rawId = messageId.split('_').pop() || messageId;
            const existingOrder = await prisma.order.findFirst({
                where: {
                    OR: [
                        { whatsappMessageId: messageId },
                        { whatsappMessageId: { contains: rawId } }
                    ]
                }
            });

            if (existingOrder) {
                // ONLY process if this message is the latest message recorded on the order
                matchedOrderId = existingOrder.id;
            }
        }

        if (!matchedOrderId) {
            this.log('info', `[WhatsAppService] Ignoring ack for older or unmonitored message: ${messageId}`);
            return;
        }

        if (ack >= 2) {
            // Cancel active watchdog timer & interval
            if (entry) {
                if (entry.timer) clearTimeout(entry.timer);
                if (entry.pollInterval) clearInterval(entry.pollInterval);
                this.activeOrderWatchdogs.delete(matchedOrderId);
                this.log('info', `[WhatsAppWatchdog] Order #${matchedOrderId} received delivery ack=${ack}! Delivery confirmed, timer cancelled.`);
            }

            const nowTime = new Date().toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome' });
            const newStatus = ack === 3 ? 'WHATSAPP_READ' : 'WHATSAPP_DELIVERED';
            const detailsText = ack === 3
                ? `Visualizzato dal cliente su WhatsApp (spunte blu) alle ${nowTime}`
                : `Consegnato sul telefono del cliente (doppia spunta) alle ${nowTime}`;

            const updated = await prisma.order.update({
                where: { id: matchedOrderId },
                data: {
                    notificationStatus: newStatus,
                    notificationDetails: detailsText
                } as any
            });

            this.notifyOrderUpdated(updated);
        } else if (ack === -1) {
            this.log('warn', `[WhatsAppWatchdog] Order #${matchedOrderId} message failed with ACK_ERROR (-1). Triggering immediate fallback...`);
            await this.triggerFallbackEmailForOrder(matchedOrderId);
        }
    }

    public async triggerFallbackEmailForOrder(orderId: number) {
        const entry = this.activeOrderWatchdogs.get(orderId);
        if (!entry) return;

        if (entry.timer) clearTimeout(entry.timer);
        if (entry.pollInterval) clearInterval(entry.pollInterval);
        this.activeOrderWatchdogs.delete(orderId);

        const { customerEmail, order, status } = entry;
        this.log('warn', `[WhatsAppWatchdog] 3 minutes elapsed without WhatsApp delivery confirmation for Order #${orderId}. Triggering Email Fallback...`);

        if (customerEmail) {
            try {
                const { EmailService } = require('./EmailService');
                const emailService = new EmailService();
                await emailService.sendOrderStatusUpdateEmail(customerEmail, order, status, true);
                this.log('info', `[WhatsAppWatchdog] Fallback email sent successfully to ${customerEmail} for Order #${orderId}`);

                const nowTime = new Date().toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome' });
                const updated = await prisma.order.update({
                    where: { id: orderId },
                    data: {
                        notificationStatus: 'EMAIL_FALLBACK_SENT',
                        notificationDetails: `WhatsApp non recapitato entro 3 min. Inviata email di fallback a ${customerEmail} alle ${nowTime}`
                    } as any
                });

                this.notifyOrderUpdated(updated);
            } catch (emailErr: any) {
                this.log('error', `[WhatsAppWatchdog] Failed to send fallback email for Order #${orderId}: ${emailErr?.message || emailErr}`);
            }
        } else {
            this.log('warn', `[WhatsAppWatchdog] Order #${orderId} has no customerEmail, cannot send email fallback.`);
            const updated = await prisma.order.update({
                where: { id: orderId },
                data: {
                    notificationStatus: 'FAILED',
                    notificationDetails: `WhatsApp non recapitato sul telefono e nessuna email cliente disponibile.`
                } as any
            });
            this.notifyOrderUpdated(updated);
        }
    }

    private notifyOrderUpdated(order: any) {
        try {
            const { orderEventBus } = require('./OrderEventBus');
            orderEventBus.emit('order:updated', order);
            orderEventBus.emit('order:notification_updated', order);
        } catch (e) {}
    }
}

