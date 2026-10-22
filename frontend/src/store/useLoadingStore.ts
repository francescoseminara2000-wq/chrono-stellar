import { create } from 'zustand';

interface LoadingState {
    isLoading: boolean;
    message?: string;
    subtext?: string;
    startLoading: (message?: string, subtext?: string) => void;
    stopLoading: () => void;
}

export const useLoadingStore = create<LoadingState>((set) => ({
    isLoading: false,
    message: 'Caricamento in corso...',
    subtext: 'Raccolta della freschezza...',
    startLoading: (message = 'Caricamento in corso...', subtext = 'Raccolta della freschezza...') =>
        set({ isLoading: true, message, subtext }),
    stopLoading: () => set({ isLoading: false }),
}));

// Helper globale per richiamare ovunque (anche fuori da React)
export const setGlobalLoading = (active: boolean, message?: string, subtext?: string) => {
    if (active) {
        useLoadingStore.getState().startLoading(message, subtext);
    } else {
        useLoadingStore.getState().stopLoading();
    }
};
