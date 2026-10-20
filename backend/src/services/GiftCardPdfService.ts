import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { prisma } from '../lib/prisma';

export interface GiftCardPdfData {
    code: string;
    amountCents: number;
    buyerName?: string | null;
    recipientName?: string | null;
    customMessage?: string | null;
    expiresAt?: Date | null;
}

export class GiftCardPdfService {
    /**
     * Genera un buffer PDF formattato come voucher regalo stampabile o condivisibile.
     */
    public static async generateGiftCardPdf(data: GiftCardPdfData): Promise<Buffer> {
        // Carica le impostazioni dello store per brandizzare il voucher
        let storeSettings: any = null;
        try {
            storeSettings = await prisma.storeSettings.findUnique({ where: { id: 1 } });
        } catch (e) {
            console.warn('[GiftCardPdfService] Impossibile recuperare StoreSettings:', e);
        }

        const siteName = storeSettings?.siteName || 'Ortofrutta Butti';
        const primaryColor = storeSettings?.primaryColor || '#16a34a';
        const contactEmail = storeSettings?.contactEmail || 'info@ortofruttabutti.it';
        const contactPhone = storeSettings?.contactPhone || '';

        // Formattazione importo
        const formattedAmount = (data.amountCents / 100).toLocaleString('it-IT', {
            style: 'currency',
            currency: 'EUR'
        });

        // URL per riscattare direttamente con QR code
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const redeemUrl = `${frontendUrl}/profilo?redeem=${encodeURIComponent(data.code)}`;

        // Genera QR code ad alta risoluzione
        const qrBuffer = await QRCode.toBuffer(redeemUrl, {
            type: 'png',
            width: 280,
            margin: 1,
            color: {
                dark: '#1e293b',
                light: '#ffffff'
            }
        });

        return new Promise<Buffer>((resolve, reject) => {
            // Formato A5 Orizzontale (595.28 x 419.53 pt)
            const doc = new PDFDocument({
                size: [595.28, 419.53],
                margins: { top: 20, bottom: 20, left: 24, right: 24 },
                autoFirstPage: true
            });

            const buffers: Buffer[] = [];
            doc.on('data', (chunk) => buffers.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', (err) => reject(err));

            const width = 595.28;
            const height = 419.53;

            // 1. Sfondo generale della carta
            doc.rect(14, 14, width - 28, height - 28)
                .lineWidth(2)
                .strokeColor(primaryColor)
                .fillAndStroke('#ffffff', primaryColor);

            // Cornice interna con angoli arrotondati
            doc.roundedRect(20, 20, width - 40, height - 40, 12)
                .lineWidth(1)
                .strokeColor('#e2e8f0')
                .stroke();

            // 2. Header a fascia superiore
            doc.save();
            doc.roundedRect(20, 20, width - 40, 60, 12)
                .clip();
            doc.rect(20, 20, width - 40, 60)
                .fill(primaryColor);
            doc.restore();

            // Titolo Store nell'header
            doc.fontSize(19)
                .font('Helvetica-Bold')
                .fillColor('#ffffff')
                .text(siteName.toUpperCase(), 35, 33, { align: 'left' });

            // Badge "BUONO REGALO"
            doc.fontSize(11)
                .font('Helvetica')
                .fillColor('#f8fafc')
                .text('GIFT CARD DIGITALE', 35, 55, { align: 'left' });

            // Valore in evidenza nell'header a destra
            doc.fontSize(22)
                .font('Helvetica-Bold')
                .fillColor('#ffffff')
                .text(formattedAmount, width - 215, 38, { width: 175, align: 'right' });

            // 3. Sezione Centrale Destra: Box Codice + QR Code
            const rightBoxX = width - 185;
            const rightBoxY = 96;

            // Box sfondo QR & Codice
            doc.roundedRect(rightBoxX, rightBoxY, 145, 230, 8)
                .lineWidth(1)
                .strokeColor('#cbd5e1')
                .fillAndStroke('#f8fafc', '#cbd5e1');

            // Inserimento QR Code
            doc.image(qrBuffer, rightBoxX + 17.5, rightBoxY + 12, { width: 110, height: 110 });

            // Istruzione sopra codice
            doc.fontSize(7.5)
                .font('Helvetica-Bold')
                .fillColor('#64748b')
                .text('CODICE PER IL SALDO', rightBoxX, rightBoxY + 128, { width: 145, align: 'center' });

            // Box Codice tratteggiato
            doc.roundedRect(rightBoxX + 10, rightBoxY + 140, 125, 26, 4)
                .lineWidth(1)
                .strokeColor(primaryColor)
                .fillAndStroke('#ffffff', primaryColor);

            doc.fontSize(10)
                .font('Courier-Bold')
                .fillColor('#0f172a')
                .text(data.code, rightBoxX + 10, rightBoxY + 148, { width: 125, align: 'center' });

            // Info inquadra QR
            doc.fontSize(7)
                .font('Helvetica')
                .fillColor('#64748b')
                .text('Inquadra per caricare subito sul tuo account', rightBoxX + 10, rightBoxY + 174, { width: 125, align: 'center' });

            // Scadenza nel box
            const expiryText = data.expiresAt
                ? `Scadenza: ${new Date(data.expiresAt).toLocaleDateString('it-IT')}`
                : 'Nessuna data di scadenza';
            doc.fontSize(7)
                .font('Helvetica-Bold')
                .fillColor('#94a3b8')
                .text(expiryText, rightBoxX + 10, rightBoxY + 208, { width: 125, align: 'center' });

            // 4. Sezione Centrale Sinistra: Dedica e Dati Regalo
            const leftX = 40;
            let currentY = 100;

            if (data.recipientName) {
                doc.fontSize(10)
                    .font('Helvetica-Bold')
                    .fillColor('#64748b')
                    .text('DESTINATARIO:', leftX, currentY);
                doc.fontSize(15)
                    .font('Helvetica-Bold')
                    .fillColor('#0f172a')
                    .text(data.recipientName, leftX, currentY + 14);
                currentY += 40;
            }

            if (data.buyerName) {
                doc.fontSize(10)
                    .font('Helvetica-Bold')
                    .fillColor('#64748b')
                    .text('REGALO DA:', leftX, currentY);
                doc.fontSize(13)
                    .font('Helvetica')
                    .fillColor('#334155')
                    .text(data.buyerName, leftX, currentY + 14);
                currentY += 36;
            }

            // Messaggio d'auguri / Dedica
            if (data.customMessage && data.customMessage.trim().length > 0) {
                doc.fontSize(9)
                    .font('Helvetica-Bold')
                    .fillColor('#64748b')
                    .text('MESSAGGIO:', leftX, currentY);

                currentY += 13;

                // Box citazione messaggio
                doc.roundedRect(leftX, currentY, 320, 60, 6)
                    .fill('#f1f5f9');

                doc.fontSize(9.5)
                    .font('Helvetica-Oblique')
                    .fillColor('#334155')
                    .text(`"${data.customMessage.trim()}"`, leftX + 10, currentY + 8, {
                        width: 300,
                        height: 48,
                        ellipsis: true
                    });

                currentY += 68;
            } else {
                currentY += 10;
            }

            // 5. Istruzioni d'uso
            doc.fontSize(8.5)
                .font('Helvetica-Bold')
                .fillColor('#0f172a')
                .text('COME FUNZIONA:', leftX, currentY);

            currentY += 12;

            const instructions = [
                '1. Inquadra il QR Code col telefono o accedi al tuo profilo su ' + siteName,
                '2. Vai nella sezione "Il mio Saldo" e inserisci il codice di questa card',
                '3. Il valore verrà caricato sul tuo Saldo Personale e potrai usarlo a scalare nei tuoi ordini!'
            ];

            doc.fontSize(7.5)
                .font('Helvetica')
                .fillColor('#475569');

            for (const step of instructions) {
                doc.text(step, leftX, currentY, { width: 320 });
                currentY += 11;
            }

            // 6. Footer elegante
            doc.fontSize(7.5)
                .font('Helvetica')
                .fillColor('#94a3b8')
                .text(
                    `${siteName} • ${contactEmail}${contactPhone ? ' • Tel: ' + contactPhone : ''}`,
                    20,
                    height - 35,
                    { width: width - 40, align: 'center' }
                );

            doc.end();
        });
    }
}
