import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { TransactionStatus } from '@prisma/client';

export class RevolutController {
    // Webhook listener for Revolut Merchant API events
    async handleWebhook(req: Request, res: Response) {
        try {
            const event = req.body;
            console.log('[RevolutWebhook] Received event:', event?.event || 'UNKNOWN', JSON.stringify(event));

            if (!event || !event.event) {
                return res.status(400).json({ error: 'Invalid webhook payload' });
            }

            const { event: eventName, order_id, merchant_order_ext_ref } = event;

            // Find transaction by gatewayTxId or order ID
            let transaction = await prisma.transaction.findFirst({
                where: {
                    OR: [
                        { gatewayTxId: order_id },
                        { orderId: merchant_order_ext_ref ? Number(merchant_order_ext_ref) : undefined }
                    ]
                }
            });

            if (transaction) {
                let newStatus = transaction.status;

                if (eventName === 'ORDER_COMPLETED' || eventName === 'ORDER_AUTHORISED') {
                    newStatus = TransactionStatus.CAPTURED;
                } else if (eventName === 'ORDER_CANCELLED') {
                    newStatus = TransactionStatus.VOIDED;
                } else if (eventName === 'ORDER_PAYMENT_FAILED') {
                    newStatus = TransactionStatus.FAILED;
                }

                await prisma.transaction.update({
                    where: { id: transaction.id },
                    data: {
                        status: newStatus as any,
                        metadata: {
                            ...(transaction.metadata as object || {}),
                            lastWebhookEvent: eventName,
                            webhookReceivedAt: new Date().toISOString()
                        }
                    }
                });

                console.log(`[RevolutWebhook] Transaction #${transaction.id} updated to status ${newStatus}`);
            }

            // Always respond 200 to acknowledge webhook
            res.status(200).json({ received: true });
        } catch (error: any) {
            console.error('[RevolutWebhook] Error processing webhook:', error);
            res.status(500).json({ error: 'Webhook processing error' });
        }
    }
}
