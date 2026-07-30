import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

/**
 * Explicit helper to log product views instantly from modals or detail pages
 */
export const trackProductVisit = (productId: number, pathName?: string) => {
    if (!productId) return;
    fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            path: pathName || `/shop/${productId}`,
            productId,
            deviceType: /mobile|android|iphone|ipad|phone/i.test(navigator.userAgent) ? 'MOBILE' : 'DESKTOP'
        })
    }).catch(() => {
        // silent ignore
    });
};

export const useAnalyticsTracker = () => {
    const location = useLocation();
    const { user } = useAuthStore();
    const lastTrackedPath = useRef<string>('');

    useEffect(() => {
        const currentPath = location.pathname + location.search;

        // Avoid logging duplicate identical route fires
        if (lastTrackedPath.current === currentPath) return;
        lastTrackedPath.current = currentPath;

        // Check if viewing a specific product (e.g., /shop/:id or ?product=:id)
        let productId: number | null = null;
        const matchProductPath = location.pathname.match(/\/shop\/(\d+)/);
        if (matchProductPath) {
            productId = parseInt(matchProductPath[1], 10);
        } else {
            const queryParams = new URLSearchParams(location.search);
            const pId = queryParams.get('product');
            if (pId) productId = parseInt(pId, 10);
        }

        // Fire background ping
        fetch('/api/analytics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                path: location.pathname,
                productId,
                userId: user?.id || null,
                referrer: document.referrer || null,
                deviceType: /mobile|android|iphone|ipad|phone/i.test(navigator.userAgent) ? 'MOBILE' : 'DESKTOP'
            })
        }).catch(() => {
            // silent ignore
        });
    }, [location, user]);
};
