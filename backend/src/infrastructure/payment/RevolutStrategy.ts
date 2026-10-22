import { Order, Transaction, TransactionStatus, PaymentGateway } from '@prisma/client';
import { PaymentStrategy } from '../../domain/payment/PaymentStrategy';
import { prisma } from '../../lib/prisma';

export class RevolutPaymentStrategy implements PaymentStrategy {
    name = 'REVOLUT';

    async initiate(order: Order, amount: number): Promise<Partial<Transaction>> {
        const settings = await prisma.storeSettings.findUnique({ where: { id: 1 } });

        const apiKey = settings?.revolutApiKey;
        const environment = settings?.revolutEnvironment || 'sandbox';

        const hasVariableWeight = (order as any).hasVariableWeight ?? false;
        const isPreAuth = hasVariableWeight;
        const captureMode = isPreAuth ? 'MANUAL' : 'AUTOMATIC';

        if (!apiKey || apiKey.trim() === '' || apiKey === 'demo') {
            console.log('[RevolutStrategy] API Key non inserita. Utilizzo modalità simulazione interattiva (Demo Simulator).');
            return {
                orderId: order.id,
                amount,
                currency: 'EUR',
                gateway: PaymentGateway.REVOLUT,
                status: TransactionStatus.PENDING,
                gatewayTxId: `REV-SIM-${order.id}-${Date.now()}`,
                metadata: {
                    isDemo: true,
                    isPreAuth,
                    captureMode,
                    preAuthAmount: amount,
                    environment,
                    checkoutUrl: `/checkout/demo-revolut?orderId=${order.id}&amount=${amount}`
                }
            };
        }

        const baseUrl = environment === 'production'
            ? 'https://merchant.revolut.com'
            : 'https://sandbox-merchant.revolut.com';

        try {
            console.log(`[RevolutStrategy] Creating Revolut Merchant Order on ${baseUrl} for order #${order.id} (capture_mode: ${captureMode})`);

            const payload = {
                amount: Math.round(amount), // amount in cents
                currency: 'EUR',
                capture_mode: captureMode,
                merchant_order_ext_ref: String(order.id),
                description: `Ordine #${order.id} - ${settings?.siteName || 'Ortofrutta Butti'}${isPreAuth ? ' (Pre-autorizzazione)' : ''}`,
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

    async capture(orderId: number, amountCents: number): Promise<boolean> {
        try {
            const transaction = await prisma.transaction.findFirst({
                where: { orderId, gateway: PaymentGateway.REVOLUT },
                orderBy: { createdAt: 'desc' }
            });

            if (!transaction) {
                console.warn(`[RevolutStrategy] No transaction found to capture for order #${orderId}`);
                return false;
            }

            const metadata: any = transaction.metadata || {};
            const isDemo = metadata.isDemo || transaction.gatewayTxId?.startsWith('REV-SIM');

            if (isDemo) {
                console.log(`[RevolutStrategy] Capturing DEMO payment for Order #${orderId}: €${(amountCents / 100).toFixed(2)}`);
                await prisma.transaction.update({
                    where: { id: transaction.id },
                    data: {
                        status: TransactionStatus.CAPTURED,
                        amount: Math.round(amountCents),
                        metadata: {
                            ...metadata,
                            capturedAmount: Math.round(amountCents),
                            capturedAt: new Date().toISOString(),
                            revolutState: 'COMPLETED'
                        }
                    }
                });
                return true;
            }

            const settings = await prisma.storeSettings.findUnique({ where: { id: 1 } });
            const apiKey = settings?.revolutApiKey;
            const environment = settings?.revolutEnvironment || 'sandbox';

            if (!apiKey) return false;

            const baseUrl = environment === 'production'
                ? 'https://merchant.revolut.com'
                : 'https://sandbox-merchant.revolut.com';

            console.log(`[RevolutStrategy] Capturing Revolut order ${transaction.gatewayTxId} with amount €${(amountCents / 100).toFixed(2)}`);
            const response = await fetch(`${baseUrl}/api/1.0/orders/${transaction.gatewayTxId}/capture`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Revolut-Api-Version': '2023-09-01'
                },
                body: JSON.stringify({ amount: Math.round(amountCents) })
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error(`[RevolutStrategy] Capture failed for order #${orderId}: ${errText}`);
                throw new Error(`Revolut Capture Error: ${errText}`);
            }

            const resData: any = await response.json();
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: TransactionStatus.CAPTURED,
                    amount: Math.round(amountCents),
                    metadata: {
                        ...metadata,
                        capturedAmount: Math.round(amountCents),
                        capturedAt: new Date().toISOString(),
                        revolutState: resData.state || 'COMPLETED'
                    }
                }
            });

            console.log(`[RevolutStrategy] Successfully captured €${(amountCents / 100).toFixed(2)} for Order #${orderId}`);
            return true;
        } catch (err: any) {
            console.error(`[RevolutStrategy] Error in capture:`, err?.message || err);
            return false;
        }
    }

    async cancel(orderId: number): Promise<boolean> {
        try {
            const transaction = await prisma.transaction.findFirst({
                where: { orderId, gateway: PaymentGateway.REVOLUT },
                orderBy: { createdAt: 'desc' }
            });

            if (!transaction) {
                console.warn(`[RevolutStrategy] No transaction found to cancel for order #${orderId}`);
                return false;
            }

            const metadata: any = transaction.metadata || {};
            const isDemo = metadata.isDemo || transaction.gatewayTxId?.startsWith('REV-SIM');

            if (isDemo) {
                console.log(`[RevolutStrategy] Cancelling DEMO pre-authorization for Order #${orderId}. Funds released.`);
                await prisma.transaction.update({
                    where: { id: transaction.id },
                    data: {
                        status: TransactionStatus.VOIDED,
                        metadata: {
                            ...metadata,
                            voidedAt: new Date().toISOString(),
                            revolutState: 'CANCELLED'
                        }
                    }
                });
                return true;
            }

            const settings = await prisma.storeSettings.findUnique({ where: { id: 1 } });
            const apiKey = settings?.revolutApiKey;
            const environment = settings?.revolutEnvironment || 'sandbox';

            if (!apiKey) return false;

            const baseUrl = environment === 'production'
                ? 'https://merchant.revolut.com'
                : 'https://sandbox-merchant.revolut.com';

            console.log(`[RevolutStrategy] Cancelling/Releasing Revolut order hold ${transaction.gatewayTxId}`);
            const response = await fetch(`${baseUrl}/api/1.0/orders/${transaction.gatewayTxId}/cancel`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Revolut-Api-Version': '2023-09-01'
                }
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error(`[RevolutStrategy] Cancel failed for order #${orderId}: ${errText}`);
            }

            await prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: TransactionStatus.VOIDED,
                    metadata: {
                        ...metadata,
                        voidedAt: new Date().toISOString(),
                        revolutState: 'CANCELLED'
                    }
                }
            });

            console.log(`[RevolutStrategy] Successfully cancelled and released pre-auth hold for Order #${orderId}`);
            return true;
        } catch (err: any) {
            console.error(`[RevolutStrategy] Error in cancel:`, err?.message || err);
            return false;
        }
    }
}
