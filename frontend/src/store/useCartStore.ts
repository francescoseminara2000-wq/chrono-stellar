import { create } from 'zustand';

export interface Product {
    id: number;
    name: string;
    priceCents: number; // e.g. 150 cents = 1.50 EUR
    unitType: 'KG' | 'PZ' | 'BOX';
    isVariableWeight: boolean;
    stepAmount: number; // e.g. 0.5 for KG
    imageUrl?: string;
}

export interface CartItem extends Product {
    quantity: number;
}

interface CartState {
    items: CartItem[];
    addItem: (product: Product, quantity: number) => void;
    updateQuantity: (productId: number, quantity: number) => void;
    removeItem: (productId: number) => void;
    clearCart: () => void;

    // Computed helpers could be functions or we use consumers to calculate
    getEstimatedTotal: () => number;
    hasVariableWeightItems: () => boolean;
}

export const useCartStore = create<CartState>((set, get) => ({
    items: [],

    addItem: (product, quantity) => {
        set((state) => {
            const existing = state.items.find((i) => i.id === product.id);
            if (existing) {
                return {
                    items: state.items.map((i) =>
                        i.id === product.id ? { ...i, quantity: i.quantity + quantity } : i
                    ),
                };
            }
            return { items: [...state.items, { ...product, quantity }] };
        });
    },

    removeItem: (productId) => {
        set((state) => ({
            items: state.items.filter((i) => i.id !== productId),
        }));
    },

    clearCart: () => set({ items: [] }),

    updateQuantity: (productId: number, quantity: number) => {
        set((state) => {
            if (quantity <= 0) {
                return { items: state.items.filter((i) => i.id !== productId) };
            }
            return {
                items: state.items.map((i) =>
                    i.id === productId ? { ...i, quantity } : i
                ),
            };
        });
    },

    getEstimatedTotal: () => {
        const { items } = get();
        return items.reduce((total, item) => total + (item.priceCents * item.quantity), 0);
    },

    hasVariableWeightItems: () => {
        const { items } = get();
        return items.some((item) => item.isVariableWeight);
    }
}));
