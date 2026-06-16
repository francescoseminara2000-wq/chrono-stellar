import { create } from 'zustand';

const API_URL = import.meta.env.VITE_API_URL || '';

interface StoreSettings {
    siteName: string;
    tagline: string;
    contactEmail: string;
    contactPhone: string;
    contactAddress: string;
    openingHours: string;
    announcementText: string;
    announcementActive: boolean;
    logoUrl: string | null;
    colorTheme: string;
    primaryColor: string;
    accentColor: string;
}

interface AppState {
    settings: StoreSettings | null;
    isLoading: boolean;
    error: string | null;
    fetchSettings: () => Promise<void>;
}

export const useAppState = create<AppState>((set) => ({
    settings: null,
    isLoading: true,
    error: null,
    fetchSettings: async () => {
        set({ isLoading: true, error: null });
        try {
            const res = await fetch(`${API_URL}/api/settings`);
            if (res.ok) {
                const data = await res.json();
                set({ settings: data, isLoading: false });
            } else {
                set({ error: 'Errore nel caricamento impostazioni', isLoading: false });
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
            set({ error: 'Rete non disponibile', isLoading: false });
        }
    }
}));
