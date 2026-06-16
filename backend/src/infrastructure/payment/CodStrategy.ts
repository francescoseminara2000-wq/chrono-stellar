import { Order, Transaction, TransactionStatus, PaymentGateway } from '@prisma/client';
import { PaymentStrategy } from '../../domain/payment/PaymentStrategy';

export class CashOnDeliveryStrategy implements PaymentStrategy {
    name = 'COD';

    async initiate(order: Order, amount: number): Promise<Partial<Transaction>> {
        // COD is synchronous in terms of initiation - it's just a promise to pay later.
        // We create a pending transaction record.
        return {
            orderId: order.id,
            amount: amount,
            currency: 'EUR',
            gateway: PaymentGateway.COD,
            status: TransactionStatus.PENDING,
            gatewayTxId: `COD-${order.id}-${Date.now()}`, // Generate a local ref
            metadata: { NOTE: 'Payment to be collected upon delivery' },
        };
    }

    async verify(transactionId: string): Promise<Transaction | null> {
        // For COD, verification is manual (driver collects cash).
        // This method might just return the current state from DB or be no-op.
        // In a real scenario, this might trigger a check against a logistics system.
        return null;
    }
}
