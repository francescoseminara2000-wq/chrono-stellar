import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
    id: number;
    email: string;
    name: string | null;
    phone?: string | null;
    street?: string | null;
    civic?: string | null;
    city?: string | null;
    zipCode?: string | null;
    avatar?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    role: 'ADMIN' | 'CUSTOMER';
    notificationPreference?: 'EMAIL' | 'WHATSAPP';
}

interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isLoading: false,
            login: (token, user) => set({ token, user }),
            logout: () => set({ token: null, user: null }),
        }),
        {
            name: 'auth-storage',
        }
    )
);
