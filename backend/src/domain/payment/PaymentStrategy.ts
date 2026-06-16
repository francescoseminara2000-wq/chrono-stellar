import { Order, Transaction } from '@prisma/client';

export interface PaymentStrategy {
    /**
     * Identifies the strategy type (e.g., 'COD', 'STRIPE')
     */
    name: string;

    /**
     * Initiates the payment process.
     * For COD, this might just record the intent.
     * For Stripe, this would create a PaymentIntent.
     */
    initiate(order: Order, amount: number): Promise<Partial<Transaction>>;

    /**
     * Verifies the transaction status.
     * Useful for webhooks or manual verification.
     */
    verify(transactionId: string): Promise<Transaction | null>;
}
