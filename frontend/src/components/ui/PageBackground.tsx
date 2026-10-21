import { useLocation } from 'react-router-dom';
import { useAppState, PageBackgroundConfig, PageBackgroundsMap } from '../../store/useAppState';
import { sanitizeImageUrl } from '../../utils/imageUrl';

// Mapping URL pathnames to standardized page keys
export const getPageKeyFromPathname = (pathname: string): string => {
    if (pathname === '/') return 'home';
    if (pathname.startsWith('/shop')) return 'shop';
    if (pathname.startsWith('/mercati')) return 'mercati';
    if (pathname.startsWith('/gift-cards')) return 'gift-cards';
    if (pathname.startsWith('/profile')) return 'profile';
    if (pathname.startsWith('/orders')) return 'orders';
    if (pathname.startsWith('/cart')) return 'cart';
    if (pathname.startsWith('/checkout')) return 'checkout';
    if (pathname.startsWith('/p/')) return 'static';
    return 'default';
};

export const AVAILABLE_PAGE_TARGETS: { key: string; label: string; icon: string; path: string }[] = [
    { key: 'default', label: '🌐 Sfondo Globale Predefinito', icon: 'Globe', path: 'Tutte le pagine' },
    { key: 'home', label: '🏠 Home Page', icon: 'Home', path: '/' },
    { key: 'shop', label: '🍎 Catalogo Prodotti', icon: 'ShoppingBag', path: '/shop' },
    { key: 'mercati', label: '🚚 I Nostri Mercati', icon: 'Truck', path: '/mercati' },
    { key: 'gift-cards', label: '🎁 Buoni & Gift Card', icon: 'Gift', path: '/gift-cards' },
    { key: 'profile', label: '👤 Profilo Cliente', icon: 'User', path: '/profile' },
    { key: 'orders', label: '📦 I Miei Ordini', icon: 'Package', path: '/orders' },
    { key: 'cart', label: '🛒 Carrello', icon: 'ShoppingCart', path: '/cart' },
    { key: 'checkout', label: '💳 Checkout & Cassa', icon: 'CreditCard', path: '/checkout' },
];

export const PageBackground = () => {
    const location = useLocation();
    const { settings } = useAppState();

    // Never show custom background inside admin dashboard
    if (location.pathname.startsWith('/admin')) {
        return null;
    }

    if (!settings?.pageBackgrounds) {
        return null;
    }

    let backgroundsMap: PageBackgroundsMap = {};
    try {
        if (typeof settings.pageBackgrounds === 'string') {
            backgroundsMap = JSON.parse(settings.pageBackgrounds);
        } else if (typeof settings.pageBackgrounds === 'object') {
            backgroundsMap = settings.pageBackgrounds as PageBackgroundsMap;
        }
    } catch (e) {
        return null;
    }

    const currentKey = getPageKeyFromPathname(location.pathname);
    const activeConfig: PageBackgroundConfig | undefined =
        (backgroundsMap[currentKey]?.isActive !== false && backgroundsMap[currentKey]?.imageUrl)
            ? backgroundsMap[currentKey]
            : (backgroundsMap['default']?.isActive !== false && backgroundsMap['default']?.imageUrl)
                ? backgroundsMap['default']
                : undefined;

    if (!activeConfig || !activeConfig.imageUrl) {
        return null;
    }

    const opacity = (activeConfig.opacity !== undefined ? activeConfig.opacity : 25) / 100;
    const blur = activeConfig.blur || 0;
    const bgUrl = sanitizeImageUrl(activeConfig.imageUrl);

    return (
        <div
            className="fixed inset-0 pointer-events-none -z-10 overflow-hidden transition-all duration-700"
            aria-hidden="true"
        >
            {/* The Background Image Layer */}
            <div
                className="absolute inset-0 bg-cover bg-center transition-all duration-700"
                style={{
                    backgroundImage: `url("${bgUrl}")`,
                    backgroundAttachment: activeConfig.isFixed ? 'fixed' : 'scroll',
                    opacity: opacity,
                    filter: blur > 0 ? `blur(${blur}px)` : undefined,
                    transform: blur > 0 ? 'scale(1.04)' : undefined, // prevent white edges when blurred
                }}
            />

            {/* Subtle Gradient Overlay to Guarantee Legibility of all text and cards */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/50 to-white/80 backdrop-saturate-150" />
        </div>
    );
};
