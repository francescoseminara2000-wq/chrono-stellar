import React from 'react';
import { useAppState } from '../store/useAppState';
import { Megaphone, X } from 'lucide-react';

export const AlertBanner = () => {
    const { settings } = useAppState();
    const [isVisible, setIsVisible] = React.useState(true);

    if (!settings?.announcementActive || !settings.announcementText || !isVisible) {
        return null;
    }

    return (
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-4 py-2 flex items-center justify-between relative z-[60]">
            <div className="flex items-center justify-center w-full gap-2">
                <Megaphone size={16} className="shrink-0" />
                <p className="text-sm font-semibold truncate text-center">{settings.announcementText}</p>
            </div>
            <button
                onClick={() => setIsVisible(false)}
                className="absolute right-4 p-1 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Chiudi avviso"
            >
                <X size={16} />
            </button>
        </div>
    );
};
