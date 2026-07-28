import { Order, Transaction, TransactionStatus, PaymentGateway } from '@prisma/client';
import { PaymentStrategy } from '../../domain/payment/PaymentStrategy';
import { prisma } from '../../lib/prisma';

export class RevolutPaymentStrategy implements PaymentStrategy {
    name = 'REVOLUT';

    async initiate(order: Order, amount: number): Promise<Partial<Transaction>> {
        const settings = await prisma.storeSettings.findUnique({ where: { id: 1 } });

        const apiKey = settings?.revolutApiKey;
        const environment = settings?.revolutEnvironment || 'sandbox';

        if (!apiKey) {
            console.warn('[RevolutStrategy] Revolut API Key non configurata nelle impostazioni.');
            return {
                orderId: order.id,
                amount,
                currency: 'EUR',
                gateway: PaymentGateway.REVOLUT,
                status: TransactionStatus.PENDING,
                gatewayTxId: `REV-SIM-${order.id}-${Date.now()}`,
                metadata: {
                    error: 'API Key mancante',
                    environment,
                    checkoutUrl: null
                }
            };
        }

        const baseUrl = environment === 'production'
            ? 'https://merchant.revolut.com'
            : 'https://sandbox-merchant.revolut.com';

        try {
            console.log(`[RevolutStrategy] Creating Revolut Merchant Order on ${baseUrl} for order #${order.id}`);

            const payload = {
                amount: Math.round(amount), // amount in cents
                currency: 'EUR',
                capture_mode: 'AUTOMATIC',
                merchant_order_ext_ref: String(order.id),
                description: `Ordine #${order.id} - ${settings?.siteName || 'Chrono Stellar'}`,
                customer: {
                    email: order.customerEmail || undefined,
                    phone: order.customerPhone || undefined
                }
            };

            const response = await fetch(`${baseUrl}/api/1.0/orders`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Revolut-Api-Version': '2023-09-01'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error('[RevolutStrategy] Revolut API Error Response:', response.status, errText);
                throw new Error(`Revolut API returned status ${response.status}: ${errText}`);
            }

            const resData: any = await response.json();
            console.log('[RevolutStrategy] Revolut Order created successfully:', resData.id);

            const checkoutUrl = resData.checkout_url || (resData.public_id ? `${baseUrl}/checkout/${resData.public_id}` : null);

            return {
                orderId: order.id,
                amount: Math.round(amount),
                currency: 'EUR',
                gateway: PaymentGateway.REVOLUT,
                status: TransactionStatus.PENDING,
                gatewayTxId: resData.id || `REV-${order.id}-${Date.now()}`,
                metadata: {
                    revolutOrderId: resData.id,
                    revolutPublicId: resData.public_id || resData.token,
                    checkoutUrl: checkoutUrl,
                    environment: environment,
                    state: resData.state || 'PENDING'
                }
            };
        } catch (error: any) {
            console.error('[RevolutStrategy] Failed to initiate Revolut payment:', error.message);
            return {
                orderId: order.id,
                amount,
                currency: 'EUR',
                gateway: PaymentGateway.REVOLUT,
                status: TransactionStatus.FAILED,
                gatewayTxId: `REV-ERR-${order.id}-${Date.now()}`,
                metadata: {
                    error: error.message,
                    environment
                }
            };
        }
    }

    async verify(transactionId: string): Promise<Transaction | null> {
        try {
            const transaction = await prisma.transaction.findFirst({
                where: { gatewayTxId: transactionId }
            });

            if (!transaction) return null;

            const settings = await prisma.storeSettings.findUnique({ where: { id: 1 } });
            const apiKey = settings?.revolutApiKey;
            const environment = settings?.revolutEnvironment || 'sandbox';

            if (!apiKey) return transaction;

            const baseUrl = environment === 'production'
                ? 'https://merchant.revolut.com'
                : 'https://sandbox-merchant.revolut.com';

            const response = await fetch(`${baseUrl}/api/1.0/orders/${transactionId}`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Revolut-Api-Version': '2023-09-01'
                }
            });

            if (response.ok) {
                const resData: any = await response.json();
                let status = transaction.status;
                if (resData.state === 'COMPLETED') {
                    status = TransactionStatus.CAPTURED;
                } else if (resData.state === 'CANCELLED') {
                    status = TransactionStatus.VOIDED;
                }

                return await prisma.transaction.update({
                    where: { id: transaction.id },
                    data: {
                        status,
                        metadata: {
                            ...(transaction.metadata as object || {}),
                            revolutState: resData.state
                        }
                    }
                });
            }

            return transaction;
        } catch (err) {
            console.error('[RevolutStrategy] Verification error:', err);
            return null;
        }
    }
}
