import { create } from 'zustand';

const API_URL = import.meta.env.VITE_API_URL || '';

export interface PageBackgroundConfig {
    imageUrl: string;
    opacity?: number; // 0 to 100
    blur?: number; // 0 to 20 px
    isFixed?: boolean;
    isActive?: boolean;
}

export interface CustomNavItem {
    id: string;
    label: string;
    type: 'PAGE' | 'CATEGORY' | 'CUSTOM';
    target: string;
    url: string;
    isActive: boolean;
    order: number;
}

export const DEFAULT_NAV_ITEMS: CustomNavItem[] = [
    { id: 'default-1', label: 'Home', type: 'PAGE', target: '/', url: '/', isActive: true, order: 1 },
    { id: 'default-2', label: 'Nostri Prodotti', type: 'PAGE', target: '/shop', url: '/shop', isActive: true, order: 2 },
    { id: 'default-3', label: 'I Nostri Mercati', type: 'PAGE', target: '/mercati', url: '/mercati', isActive: true, order: 3 },
    { id: 'default-4', label: 'Gift Card', type: 'PAGE', target: '/gift-cards', url: '/gift-cards', isActive: true, order: 4 },
];

export type PageBackgroundsMap = Record<string, PageBackgroundConfig>;

export interface StoreSettings {
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
    pickupCutoffHour: number;
    deliveryCutoffHour: number;
    deliveryTimeSlots?: string;
    revolutApiKey?: string;
    revolutEnvironment?: string;
    revolutEnabled?: boolean;
    pageBackgrounds?: string | PageBackgroundsMap;
    customNavItems?: string | CustomNavItem[];
    navHoverOpacity?: number;
    navHoverColor?: string;
    appleLoaderPlaybackRate?: number;
    appleLoaderMinDuration?: number;
    appleLoaderVideoUrl?: string | null;
    appleLoaderDimension?: number;
    appleLoaderPhrase?: string;
    appleLoaderTextSize?: number;
    appleLoaderTextBold?: boolean;
    appleLoaderTextOffset?: number;
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
