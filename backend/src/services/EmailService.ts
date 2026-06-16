import nodemailer from 'nodemailer';
import { Order } from '@prisma/client';
import { prisma } from '../lib/prisma';

export class EmailService {
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            // Configure this with a real SMTP provider later (SendGrid, Mailgun, Amazon SES, or standard SMTP)
            // For now, testing with standard options, wait for user config
            host: process.env.SMTP_HOST || 'smtp.ethereal.email',
            port: parseInt(process.env.SMTP_PORT || '587'),
            auth: {
                user: process.env.SMTP_USER || 'ethereal.user@ethereal.email',
                pass: process.env.SMTP_PASS || 'ethereal_password'
            }
        });
    }

    private async sendMail(to: string, subject: string, html: string, settings?: any) {
        try {
            const fromName = settings?.siteName || 'Chrono Stellar';
            const fromEmail = settings?.contactEmail || 'noreply@chronostellar.com';

            const info = await this.transporter.sendMail({
                from: process.env.SMTP_FROM || `"${fromName}" <${fromEmail}>`,
                to,
                subject,
                html
            });
            console.log('Message sent: %s', info.messageId);
            // If using ethereal.email, log the preview URL
            if (process.env.SMTP_HOST === 'smtp.ethereal.email') {
                console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
            }
            return true;
        } catch (error) {
            console.error('Error sending email:', error);
            return false;
        }
    }

    private getEmailTemplate(title: string, content: string, settings?: any) {
        const siteName = settings?.siteName || 'Chrono Stellar';
        const contactEmail = settings?.contactEmail || 'support@chronostellar.com';
        
        const logoUrl = settings?.logoUrl
            ? (settings.logoUrl.startsWith('http') ? settings.logoUrl : `${process.env.FRONTEND_URL || 'http://localhost:5173'}${settings.logoUrl}`)
            : `${process.env.FRONTEND_URL || 'http://localhost:5173'}/logo.png`; 

        const primaryColor = settings?.primaryColor || '#1e3f20'; 
        const primaryLight = settings?.colorTheme === 'green' ? '#e5eed5' : '#f0f4f0'; // simple default light background

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    line-height: 1.6;
                    color: #333333;
                    margin: 0;
                    padding: 0;
                    background-color: #f7f9f6;
                }
                .container {
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: #ffffff;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
                    margin-top: 40px;
                    margin-bottom: 40px;
                }
                .header {
                    background-color: ${primaryColor};
                    padding: 30px 20px;
                    text-align: center;
                }
                .header-logo {
                    font-size: 28px;
                    font-weight: bold;
                    color: #ffffff;
                    margin: 0;
                    font-family: 'Georgia', serif; /* Fallback for script font */
                }
                .content {
                    padding: 40px 30px;
                }
                .title {
                    color: ${primaryColor};
                    font-size: 22px;
                    margin-top: 0;
                    margin-bottom: 20px;
                }
                .btn {
                    display: inline-block;
                    padding: 12px 24px;
                    background-color: ${primaryColor};
                    color: #ffffff !important;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: bold;
                    margin: 20px 0;
                    font-size: 16px;
                }
                .footer {
                    background-color: ${primaryLight};
                    padding: 20px;
                    text-align: center;
                    font-size: 13px;
                    color: #666666;
                    border-top: 1px solid #dce5ce;
                }
                .footer a {
                    color: ${primaryColor};
                    text-decoration: none;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                }
                th {
                    background-color: ${primaryLight};
                    color: ${primaryColor};
                    padding: 12px;
                    text-align: left;
                    font-size: 14px;
                }
                td {
                    padding: 12px;
                    border-bottom: 1px solid #eeeeee;
                }
                .text-right {
                    text-align: right;
                }
                .text-center {
                    text-align: center;
                }
                .totals-row td {
                    font-weight: bold;
                    border-bottom: none;
                    padding-top: 16px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <img src="${logoUrl}" alt="${siteName}" style="height: 50px; display: block; margin: 0 auto; object-fit: contain;">
                </div>
                <div class="content">
                    <h2 class="title">${title}</h2>
                    ${content}
                </div>
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} ${siteName}. Tutti i diritti riservati.</p>
                    <p>Hai domande? <a href="mailto:${contactEmail}">Contattaci</a></p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    async sendVerificationEmail(to: string, token: string) {
        const settings = await prisma.storeSettings.findUnique({ where: { id: 1 } });
        const siteName = settings?.siteName || 'Chrono Stellar';
        const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
        const subject = `Verifica il tuo indirizzo email - ${siteName}`;

        const content = `
            <p>Ciao,</p>
            <p>Grazie per esserti registrato su <strong>${siteName}</strong>! Siamo felici di averti a bordo.</p>
            <p>Per completare la registrazione e attivare il tuo account, ti chiediamo gentilmente di verificare il tuo indirizzo email cliccando sul pulsante qui sotto:</p>
            <div style="text-align: center;">
                <a href="${url}" class="btn">Verifica Indirizzo Email</a>
            </div>
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
                Se il pulsante non funziona, puoi copiare e incollare il seguente link nel tuo browser:<br>
                <a href="${url}" style="word-break: break-all; color: ${settings?.primaryColor || '#1e3f20'};">${url}</a>
            </p>
            <p>Se non hai creato un account, puoi ignorare in sicurezza questa email.</p>
            <p>A presto,<br>Il Team di ${siteName}</p>
        `;

        return this.sendMail(to, subject, this.getEmailTemplate(`Benvenuto in ${siteName}`, content, settings), settings);
    }

    async sendPasswordResetEmail(to: string, token: string) {
        const settings = await prisma.storeSettings.findUnique({ where: { id: 1 } });
        const siteName = settings?.siteName || 'Chrono Stellar';
        const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
        const subject = `Recupero Password - ${siteName}`;

        const content = `
            <p>Ciao,</p>
            <p>Abbiamo ricevuto una richiesta per reimpostare la password del tuo account su ${siteName}.</p>
            <p>Clicca sul pulsante sottostante per scegliere una nuova password. Per tua sicurezza, questo link scadrà tra <strong>1 ora</strong>.</p>
            <div style="text-align: center;">
                <a href="${url}" class="btn">Reimposta la Password</a>
            </div>
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
                Se il pulsante non funziona, puoi copiare e incollare il seguente link nel tuo browser:<br>
                <a href="${url}" style="word-break: break-all; color: ${settings?.primaryColor || '#1e3f20'};">${url}</a>
            </p>
            <p>Se non hai richiesto tu il ripristino, ignora questa email e la tua password attuale rimarrà invariata.</p>
            <p>A presto,<br>Il Team di ${siteName}</p>
        `;

        return this.sendMail(to, subject, this.getEmailTemplate('Recupero della Password', content, settings), settings);
    }

    async sendOrderConfirmationEmail(to: string, order: any) {
        const settings = await prisma.storeSettings.findUnique({ where: { id: 1 } });
        const siteName = settings?.siteName || 'Chrono Stellar';
        const subject = `Conferma Ordine #${order.id} - ${siteName}`;

        let itemsHtml = order.items.map((item: any) => `
            <tr>
                <td>${item.product?.name || 'Prodotto'} ${item.requiresWeight && item.originalWeight ? `(${item.originalWeight}kg resi)` : ''}</td>
                <td class="text-center">${item.quantityOrdered}</td>
                <td class="text-right">€${(item.priceAtPurchase * Number(item.quantityOrdered) / 100).toFixed(2)}</td>
            </tr>
        `).join('');

        const content = `
            <p>Ciao ${order.customerName || ''},</p>
            <p>Grazie per aver acquistato su ${siteName}! Il tuo ordine <strong>#${order.id}</strong> è stato ricevuto e stiamo già lavorando per prepararlo.</p>
            
            <h3 style="color: ${settings?.primaryColor || '#1e3f20'}; border-bottom: 2px solid ${settings?.primaryColor || '#1e3f20'}33; padding-bottom: 8px; margin-top: 30px;">Dettagli dell'Ordine</h3>
            <table>
                <thead>
                    <tr>
                        <th>Prodotto</th>
                        <th class="text-center">Quantità</th>
                        <th class="text-right">Prezzo</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="2" class="text-right" style="padding-top: 20px;">Costo di spedizione:</td>
                        <td class="text-right" style="padding-top: 20px;">€${((order.shippingCost || 0) / 100).toFixed(2)}</td>
                    </tr>
                    <tr class="totals-row">
                        <td colspan="2" class="text-right" style="font-size: 18px; color: ${settings?.primaryColor || '#1e3f20'};">Totale ${order.status === 'PREPARING' ? 'Stimato' : ''}:</td>
                        <td class="text-right" style="font-size: 18px; color: ${settings?.primaryColor || '#1e3f20'};">€${(order.estimatedTotal / 100).toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>
            
            <div style="background-color: #f8faf7; padding: 15px; border-radius: 8px; margin-top: 30px; border-left: 4px solid ${settings?.primaryColor || '#1e3f20'};">
                <p style="margin: 0; font-size: 14px;"><strong>Metodo di Consegna:</strong> ${order.deliveryMethod === 'HOME_DELIVERY' ? 'Consegna a Domicilio' : 'Ritiro in Negozio'}</p>
                ${order.shippingAddress ? `<p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Indirizzo:</strong> ${order.shippingAddress}</p>` : ''}
            </div>

            <p style="font-size: 13px; color: #666; margin-top: 30px; font-style: italic;">
                Nota: Il totale finale potrebbe subire leggere variazioni nel caso in cui il tuo ordine contenga prodotti venduti a peso (il cui prezzo viene ricalcolato al momento della pesatura esatta) o in caso di sostituzioni di prodotti non disponibili.
            </p>
            
            <p>Riceverai un'altra notifica non appena il tuo ordine sarà in transito o pronto per il ritiro.</p>
            <p>A presto,<br>Il Team di ${siteName}</p>
        `;

        return this.sendMail(to, subject, this.getEmailTemplate('Conferma del tuo Ordine', content, settings), settings);
    }
}
