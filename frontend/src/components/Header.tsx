import React from 'react';
import { ShoppingBasket, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';

import { useAuthStore } from '../store/useAuthStore';
import { ChevronDown, ChevronRight, Package, User as UserIcon, LogOut, Settings, Bell, BellOff, Home, Apple, MapPin, Gift, Wallet } from 'lucide-react';
import { subscribeToPushNotifications, checkPushSubscription } from '../services/pushNotification';
import { motion, AnimatePresence } from 'framer-motion';
import { sanitizeImageUrl } from '../utils/imageUrl';

const AuthMenu = ({
    pushEnabled,
    handleTogglePush,
    isPushLoading
}: {
    pushEnabled: boolean;
    handleTogglePush: () => void;
    isPushLoading: boolean;
}) => {
    const { user, logout } = useAuthStore();
    const [isOpen, setIsOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (user) {
        const formattedBalance = ((user.walletBalance || 0) / 100).toFixed(2);

        return (
            <div className="relative" ref={dropdownRef}>
                {/* Trigger Button seamlessly integrated into Header Pill */}
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2.5 sm:gap-3 py-1 px-1.5 rounded-full group cursor-pointer transition-all"
                >
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white flex items-center justify-center text-emerald-800 shadow-sm border border-nature-200/90 overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                        {user.avatar ? (
                            <img
                                src={sanitizeImageUrl(user.avatar)}
                                alt={user.name || 'User'}
                                className="w-full h-full object-contain p-0.5"
                            />
                        ) : (
                            <UserIcon size={18} />
                        )}
                    </div>
                    <div className="flex flex-col text-left">
                        <span className="text-sm sm:text-[15px] font-black text-nature-950 group-hover:text-emerald-700 transition-colors leading-tight truncate max-w-[160px]">
                            {user.name || 'Account'}
                        </span>
                        <span className="text-xs font-black text-emerald-700 leading-tight mt-0.5">
                            € {formattedBalance}
                        </span>
                    </div>
                    <ChevronDown size={16} className={`text-nature-400 group-hover:text-emerald-700 transition-transform duration-300 ml-0.5 ${isOpen ? 'rotate-180' : ''}`} />
                </motion.button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.96 }}
                            transition={{ duration: 0.18, ease: "easeOut" }}
                            className="absolute right-0 mt-2.5 w-72 sm:w-80 bg-white rounded-3xl shadow-2xl border border-gray-100 ring-1 ring-black/5 p-3.5 z-50 overflow-hidden space-y-3"
                        >
                            {/* 1. Header con Profilo Utente */}
                            <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50/80 border border-gray-100">
                                <div className="w-11 h-11 rounded-2xl bg-nature-800 flex items-center justify-center text-white shadow-sm overflow-hidden shrink-0 border border-white">
                                    {user.avatar ? (
                                        <img
                                            src={sanitizeImageUrl(user.avatar)}
                                            alt={user.name || 'User'}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <UserIcon size={20} className="text-emerald-300" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-sm font-black text-gray-900 truncate">
                                            {user.name || 'Cliente'}
                                        </span>
                                        {user.role === 'ADMIN' ? (
                                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[9px] font-black rounded uppercase tracking-wider">
                                                Admin
                                            </span>
                                        ) : (
                                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded uppercase tracking-wider">
                                                Cliente
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-gray-500 truncate mt-0.5" title={user.email}>
                                        {user.email}
                                    </p>
                                </div>
                            </div>

                            {/* 2. Card Saldo Portafoglio Premium */}
                            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-nature-950 via-emerald-950 to-nature-900 text-white p-3.5 shadow-md border border-emerald-800/40">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
                                <div className="relative z-10 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/30">
                                            <Wallet size={16} />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/80 block leading-tight">
                                                Saldo Portafoglio
                                            </span>
                                            <span className="text-lg font-black text-white leading-tight">
                                                € {formattedBalance}
                                            </span>
                                        </div>
                                    </div>
                                    <Link
                                        to="/profile"
                                        onClick={() => setIsOpen(false)}
                                        className="text-[11px] font-bold bg-white/15 hover:bg-white/25 active:scale-95 text-white px-2.5 py-1.5 rounded-xl transition border border-white/10"
                                    >
                                        Ricarica →
                                    </Link>
                                </div>
                            </div>

                            {/* 3. Link Azioni con Icone Colorate & Effetti Hover */}
                            <div className="space-y-1 pt-1">
                                <Link
                                    to="/profile"
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 transition group cursor-pointer"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition-transform shrink-0">
                                            <UserIcon size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <span className="text-xs font-black text-gray-800 group-hover:text-emerald-700 transition-colors block">
                                                Il Mio Profilo
                                            </span>
                                            <span className="text-[10px] text-gray-400 block truncate">
                                                Dati, indirizzo e sicurezza
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight size={14} className="text-gray-300 group-hover:text-emerald-600 transition-colors shrink-0" />
                                </Link>

                                <Link
                                    to="/orders"
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 transition group cursor-pointer"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform shrink-0">
                                            <Package size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <span className="text-xs font-black text-gray-800 group-hover:text-blue-700 transition-colors block">
                                                I Miei Ordini
                                            </span>
                                            <span className="text-[10px] text-gray-400 block truncate">
                                                Tracciamento e ricevute
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-600 transition-colors shrink-0" />
                                </Link>

                                <Link
                                    to="/gift-cards"
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 transition group cursor-pointer"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100 group-hover:scale-105 transition-transform shrink-0">
                                            <Gift size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <span className="text-xs font-black text-gray-800 group-hover:text-purple-700 transition-colors block">
                                                Buoni & Gift Card
                                            </span>
                                            <span className="text-[10px] text-gray-400 block truncate">
                                                Regala o riscatta credito
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight size={14} className="text-gray-300 group-hover:text-purple-600 transition-colors shrink-0" />
                                </Link>

                                <button
                                    type="button"
                                    onClick={handleTogglePush}
                                    disabled={pushEnabled || isPushLoading}
                                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 transition group cursor-pointer text-left"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center border group-hover:scale-105 transition-transform shrink-0 ${
                                            pushEnabled
                                                ? 'bg-green-50 text-green-700 border-green-200'
                                                : 'bg-amber-50 text-amber-700 border-amber-200'
                                        }`}>
                                            {pushEnabled ? <Bell size={16} /> : <BellOff size={16} />}
                                        </div>
                                        <div className="min-w-0">
                                            <span className="text-xs font-black text-gray-800 group-hover:text-amber-800 transition-colors block">
                                                Notifiche Push
                                            </span>
                                            <span className="text-[10px] text-gray-400 block truncate">
                                                {pushEnabled ? 'Notifiche attive' : isPushLoading ? 'Attivazione...' : 'Attiva per pesatura e offerte'}
                                            </span>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                        pushEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                        {pushEnabled ? 'ON' : 'OFF'}
                                    </span>
                                </button>

                                {user.role === 'ADMIN' && (
                                    <Link
                                        to="/admin"
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center justify-between p-2 rounded-xl bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-100 transition group cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                                                <Settings size={16} />
                                            </div>
                                            <div className="min-w-0">
                                                <span className="text-xs font-black text-indigo-950 block">
                                                    Dashboard Admin
                                                </span>
                                                <span className="text-[10px] text-indigo-600 block truncate">
                                                    Gestione negozio e ordini
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight size={14} className="text-indigo-400 group-hover:text-indigo-700 transition-colors shrink-0" />
                                    </Link>
                                )}
                            </div>

                            {/* 4. Logout Footer */}
                            <div className="pt-2 border-t border-gray-100">
                                <button
                                    onClick={() => { logout(); setIsOpen(false); }}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black text-red-600 hover:bg-red-50 active:scale-[0.98] transition cursor-pointer"
                                >
                                    <LogOut size={15} /> Esci dall'account
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-4">
            <Link to="/login" className="text-nature-900 hover:text-nature-600 font-medium transition-colors relative group">
                Accedi
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-nature-600 transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link to="/register" className="bg-nature-900 text-white px-6 py-2.5 rounded-full font-bold hover:bg-nature-800 transition-all hover:shadow-lg shadow-nature-900/20 text-sm">
                    Registrati
                </Link>
            </motion.div>
        </div>
    );
};

import { useAppState, DEFAULT_NAV_ITEMS, CustomNavItem } from '../store/useAppState';

export const Header = () => {
    const location = useLocation();
    const [hoveredNav, setHoveredNav] = React.useState<string | null>(null);
    const { items } = useCartStore();
    const [isScrolled, setIsScrolled] = React.useState(false);
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    const { settings } = useAppState();

    const dynamicNavItems: CustomNavItem[] = React.useMemo(() => {
        let list: CustomNavItem[] = DEFAULT_NAV_ITEMS;
        if (settings?.customNavItems) {
            try {
                const parsed = typeof settings.customNavItems === 'string'
                    ? JSON.parse(settings.customNavItems)
                    : settings.customNavItems;
                if (Array.isArray(parsed) && parsed.length > 0) {
                    list = parsed;
                }
            } catch (e) {
                console.error("Error parsing customNavItems:", e);
            }
        }
        return list.filter(item => item.isActive !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
    }, [settings?.customNavItems]);

    const itemCount = items.length;
    const { user, logout, token } = useAuthStore();

    const [pushEnabled, setPushEnabled] = React.useState(false);
    const [isPushLoading, setIsPushLoading] = React.useState(false);

    React.useEffect(() => {
        const checkSub = async () => {
            const isSubscribed = await checkPushSubscription();
            setPushEnabled(isSubscribed);
        };
        checkSub();
    }, []);

    const handleTogglePush = async () => {
        if (!token) return;
        setIsPushLoading(true);
        const success = await subscribeToPushNotifications(token);
        if (success) {
            setPushEnabled(true);
        }
        setIsPushLoading(false);
    };

    React.useEffect(() => {
        const handleScroll = () => {
            setIsScrolled((prev) => {
                if (!prev && window.scrollY > 80) return true;
                if (prev && window.scrollY <= 20) return false;
                return prev;
            });
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close menu when route changes
    React.useEffect(() => {
        setIsMenuOpen(false);
    }, [location.pathname]);

    return (
        <header className={`${isMenuOpen ? 'fixed inset-0 z-[9999] bg-transparent' : `bg-white/90 backdrop-blur-md sticky top-0 z-[100] border-b border-gray-100 ${isScrolled ? 'py-1.5 shadow-md' : 'py-3.5 shadow-sm'}`} transition-all duration-300`}>
            <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center gap-4 sm:gap-6">
                    {/* Left: Logo + Desktop Menu Nav Bar */}
                    <div className="flex items-center gap-5 sm:gap-7 lg:gap-10 min-w-0">
                        {/* Logo */}
                        <Link to="/" className="flex items-center gap-2.5 sm:gap-3.5 group relative z-50 flex-shrink-0">
                            <motion.div
                                layout
                                className={`relative flex items-center justify-center transition-all duration-500 ${isScrolled ? 'w-10 h-10 md:w-12 md:h-12' : 'w-16 h-16 sm:w-20 sm:h-20 md:w-22 md:h-22'}`}
                            >
                                <img
                                    src={settings?.logoUrl ? sanitizeImageUrl(settings.logoUrl) : "/logo.png"}
                                    alt={`${settings?.siteName || 'Chrono Stellar'} Logo`}
                                    className="w-full h-full object-contain scale-115 drop-shadow-sm group-hover:scale-125 transition-transform duration-300 origin-center"
                                />
                            </motion.div>
                            <motion.div
                                layout
                                className="flex flex-col justify-center origin-left transition-all duration-500"
                            >
                                <h1 className={`font-script text-nature-900 leading-none whitespace-nowrap transition-all duration-500 ${isScrolled ? 'text-xl md:text-2xl' : 'text-2xl sm:text-3xl md:text-4xl'}`}>
                                    {settings?.siteName ? (
                                        <>
                                             <span className="text-nature-600">{settings.siteName.split(' ')[0]}</span>{' '}
                                            {settings.siteName.substring(settings.siteName.indexOf(' ') + 1)}
                                        </>
                                    ) : (
                                        <><span className="text-nature-600">Ortofrutta</span> Butti</>
                                    )}
                                </h1>
                                <p className={`text-nature-600/90 font-sans tracking-[0.22em] uppercase font-bold transition-all duration-500 mt-1 ${isScrolled ? 'text-[8px] md:text-[9px]' : 'text-[9px] sm:text-[10px] md:text-xs'}`}>
                                    {settings?.tagline || 'FRESCHEZZA DI QUALITÀ'}
                                </p>
                            </motion.div>
                        </Link>

                        {/* Desktop Nav - Aligned Left right after the Logo */}
                        <nav className="hidden md:flex items-center">
                            <div 
                                onMouseLeave={() => setHoveredNav(null)}
                                className={`relative bg-nature-50/90 backdrop-blur-md border border-nature-200/80 rounded-full shadow-[0_3px_14px_-3px_rgba(20,83,45,0.09)] flex items-center transition-all duration-300 ${
                                    isScrolled ? 'p-1 gap-1' : 'p-1.5 lg:p-2 gap-1 lg:gap-1.5'
                                }`}
                            >
                                {dynamicNavItems.map((item) => {
                                    const currentPath = location.pathname;
                                    const currentSearch = location.search;
                                    const fullCurrent = currentPath + currentSearch;

                                    const isActive = item.url === '/'
                                        ? (currentPath === '/' && !currentSearch)
                                        : (item.url.includes('?')
                                            ? fullCurrent === item.url
                                            : (item.url === '/shop'
                                                ? ((currentPath === '/shop' && !currentSearch) || currentPath.startsWith('/product'))
                                                : (currentPath === item.url || currentPath.startsWith(item.url + '/'))));

                                    const isHovered = hoveredNav === item.id;
                                    const isExternal = item.url.startsWith('http://') || item.url.startsWith('https://');

                                    const linkContent = (
                                        <>
                                            {/* Active Pill (Vibrant Emerald Gradient with soft glow) */}
                                            {isActive && (
                                                <motion.div
                                                    layoutId="activeNavPill"
                                                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                                                    className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-nature-600 to-emerald-700 rounded-full shadow-[0_3px_14px_rgba(22,163,74,0.38)] border border-emerald-500/40 -z-10"
                                                />
                                            )}

                                            {/* Hover Pill (Transparent Glass Green) */}
                                            {isHovered && !isActive && (
                                                <motion.div
                                                    layoutId="hoverNavPill"
                                                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                                                    className="absolute inset-0 bg-emerald-600/18 backdrop-blur-md rounded-full -z-10 shadow-[0_2px_10px_rgba(16,185,129,0.22)] border border-emerald-500/45"
                                                />
                                            )}

                                            <motion.span 
                                                animate={{ 
                                                    scale: isHovered ? 1.05 : 1,
                                                    y: isHovered ? -0.5 : 0 
                                                }}
                                                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                                className="relative z-10 flex items-center gap-2 whitespace-nowrap"
                                            >
                                                <span>{item.label}</span>
                                                {isActive && (
                                                    <motion.span 
                                                        layoutId="activeNavDot"
                                                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                                        className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)] inline-block" 
                                                    />
                                                )}
                                            </motion.span>
                                        </>
                                    );

                                    const itemClass = `relative rounded-full font-bold transition-colors duration-200 z-10 flex items-center select-none ${
                                        isScrolled 
                                            ? 'px-3.5 py-1.5 text-xs' 
                                            : 'px-4 lg:px-5 py-2 lg:py-2.5 text-xs lg:text-[15px]'
                                    } ${
                                        isActive 
                                            ? 'text-white font-extrabold' 
                                            : 'text-nature-900/80 hover:text-emerald-800'
                                    }`;

                                    return isExternal ? (
                                        <a
                                            key={item.id}
                                            href={item.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onMouseEnter={() => setHoveredNav(item.id)}
                                            className={itemClass}
                                        >
                                            {linkContent}
                                        </a>
                                    ) : (
                                        <Link
                                            key={item.id}
                                            to={item.url}
                                            onMouseEnter={() => setHoveredNav(item.id)}
                                            className={itemClass}
                                        >
                                            {linkContent}
                                        </Link>
                                    );
                                })}
                            </div>
                        </nav>
                    </div>

                    {/* Right: Desktop User Actions Pill (Profile, Balance, Cart) */}
                    <div className="hidden md:flex items-center flex-shrink-0">
                        <div className={`
                            bg-nature-50 border border-nature-100 rounded-full shadow-xs flex items-center transition-all duration-300 hover:shadow-md hover:border-nature-200
                            ${isScrolled ? 'py-1 pl-1.5 pr-2 gap-2' : 'py-1.5 pl-2 pr-2.5 gap-2.5'}
                        `}>
                            <AuthMenu
                                pushEnabled={pushEnabled}
                                handleTogglePush={handleTogglePush}
                                isPushLoading={isPushLoading}
                            />

                            <div className="w-px bg-nature-200/90 transition-all duration-300 self-stretch my-1"></div>

                            <Link 
                                to="/cart" 
                                className={`relative flex items-center justify-center rounded-full hover:bg-white/80 active:scale-95 text-nature-900 hover:text-emerald-700 transition-all group shrink-0 ${
                                    isScrolled ? 'w-9 h-9' : 'w-10 h-10'
                                }`}
                                title="Carrello"
                            >
                                <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} className="flex items-center justify-center">
                                    <ShoppingBasket size={isScrolled ? 19 : 22} className="transition-all duration-300" />
                                </motion.div>
                                <AnimatePresence>
                                    {itemCount > 0 && (
                                        <motion.span
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            exit={{ scale: 0 }}
                                            className="absolute -top-1 -right-1 bg-fruit-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md border-2 border-white select-none pointer-events-none"
                                        >
                                            {itemCount}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </Link>
                        </div>
                    </div>

                    {/* Mobile Actions: Cart & Burger */}
                    <div className="md:hidden flex items-center gap-3 relative z-50 pr-2">
                        {/* Mobile Cart */}
                        <Link to="/cart" className="relative p-2 text-nature-900">
                            <ShoppingBasket size={24} />
                            {itemCount > 0 && (
                                <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute -top-1 -right-1 bg-fruit-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md border-2 border-white select-none pointer-events-none"
                                >
                                    {itemCount}
                                </motion.span>
                            )}
                        </Link>

                        {/* Burger Toggle */}
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            className="p-2 text-nature-900 focus:outline-none ml-1 rounded-full hover:bg-gray-100 transition-colors"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
                        </motion.button>
                    </div>
                </div>
            </div>

            {/* Mobile Fullscreen Navigation Drawer */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                        className="md:hidden fixed inset-0 z-[120] w-full h-full bg-white text-gray-900 p-5 sm:p-6 flex flex-col justify-between overflow-y-auto shadow-2xl"
                    >
                        {/* Drawer Header with Store Logo & RED Close Button */}
                        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-14 h-14 rounded-2xl bg-white p-1.5 shadow-sm border border-gray-150 flex items-center justify-center shrink-0">
                                    <img src={settings?.logoUrl ? sanitizeImageUrl(settings.logoUrl) : "/logo.png"} alt="Logo" className="w-full h-full object-contain scale-115" />
                                </div>
                                <div>
                                    <span className="font-black text-lg text-gray-900 block leading-tight">{settings?.siteName || 'Ortofrutta'}</span>
                                    <span className="text-[10px] text-emerald-700 font-black tracking-widest uppercase block">Menu Navigazione</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsMenuOpen(false)}
                                className="w-10 h-10 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-all cursor-pointer border border-red-200/80 active:scale-90 shadow-xs"
                                title="Chiudi Menu"
                            >
                                <X size={22} className="text-red-600" />
                            </button>
                        </div>

                        {/* 4 General Navigation Links - Single Column Remade UI */}
                        <div className="py-5 flex-1 overflow-y-auto space-y-3">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block px-1">
                                Esplora lo Store
                            </span>

                            <Link
                                to="/"
                                onClick={() => setIsMenuOpen(false)}
                                className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/70 hover:bg-emerald-50/60 border border-gray-150 hover:border-emerald-200 transition-all group shadow-2xs"
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                                        <Home size={22} />
                                    </div>
                                    <div>
                                        <span className="font-black text-base text-gray-900 block">Home Page</span>
                                        <span className="text-xs text-gray-400 font-medium block">Esplora le offerte e le novità</span>
                                    </div>
                                </div>
                                <ChevronRight size={20} className="text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                            </Link>

                            <Link
                                to="/shop"
                                onClick={() => setIsMenuOpen(false)}
                                className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/70 hover:bg-amber-50/60 border border-gray-150 hover:border-amber-200 transition-all group shadow-2xs"
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                                        <Apple size={22} />
                                    </div>
                                    <div>
                                        <span className="font-black text-base text-gray-900 block">Catalogo Ortofrutta</span>
                                        <span className="text-xs text-gray-400 font-medium block">Frutta e verdura di stagione a km 0</span>
                                    </div>
                                </div>
                                <ChevronRight size={20} className="text-gray-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
                            </Link>

                            <Link
                                to="/mercati"
                                onClick={() => setIsMenuOpen(false)}
                                className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/70 hover:bg-rose-50/60 border border-gray-150 hover:border-rose-200 transition-all group shadow-2xs"
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                                        <MapPin size={22} />
                                    </div>
                                    <div>
                                        <span className="font-black text-base text-gray-900 block">I Nostri Mercati</span>
                                        <span className="text-xs text-gray-400 font-medium block">Scopri dove trovarci in settimana</span>
                                    </div>
                                </div>
                                <ChevronRight size={20} className="text-gray-400 group-hover:text-red-600 group-hover:translate-x-1 transition-all" />
                            </Link>

                            <Link
                                to="/gift-cards"
                                onClick={() => setIsMenuOpen(false)}
                                className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/70 hover:bg-emerald-50/60 border border-gray-150 hover:border-emerald-200 transition-all group shadow-2xs"
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                                        <Gift size={22} />
                                    </div>
                                    <div>
                                        <span className="font-black text-base text-gray-900 block">Buoni Regalo & Gift Card</span>
                                        <span className="text-xs text-gray-400 font-medium block">Regala la freschezza e scarica in PDF</span>
                                    </div>
                                </div>
                                <ChevronRight size={20} className="text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                            </Link>

                            <Link
                                to="/cart"
                                onClick={() => setIsMenuOpen(false)}
                                className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/70 hover:bg-purple-50/60 border border-gray-150 hover:border-purple-200 transition-all group shadow-2xs"
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                                        <ShoppingBasket size={22} />
                                    </div>
                                    <div>
                                        <span className="font-black text-base text-gray-900 block flex items-center gap-2">
                                            Il Tuo Carrello
                                            {itemCount > 0 && (
                                                <span className="px-2.5 py-0.5 bg-emerald-600 text-white font-black text-xs rounded-full shadow-2xs">
                                                    {itemCount} {itemCount === 1 ? 'art.' : 'art.'}
                                                </span>
                                            )}
                                        </span>
                                        <span className="text-xs text-gray-400 font-medium block">Controlla i prodotti selezionati</span>
                                    </div>
                                </div>
                                <ChevronRight size={20} className="text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                            </Link>
                        </div>

                        {/* Enlarged Prominent Interactive User Box */}
                        <div className="pt-4 border-t border-gray-150 space-y-3">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block px-1">
                                Area Riservata Utente
                            </span>

                            {user ? (
                                <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/60 border border-emerald-200/80 shadow-sm space-y-4">
                                    {/* User Header */}
                                    <div className="flex items-center justify-between gap-3 pb-3 border-b border-emerald-100">
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <div className="w-12 h-12 rounded-2xl bg-white border-2 border-emerald-300 overflow-hidden shrink-0 flex items-center justify-center text-emerald-800 shadow-sm">
                                                {user.avatar ? (
                                                    <img src={sanitizeImageUrl(user.avatar)} alt="Avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    <UserIcon size={24} />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <span className="font-black text-base text-gray-900 block truncate">{user.name}</span>
                                                <span className="text-xs text-gray-500 font-medium truncate block">{user.email}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { logout(); setIsMenuOpen(false); }}
                                            className="px-3.5 py-2 text-red-600 hover:text-red-700 bg-white hover:bg-red-50 rounded-xl transition-all cursor-pointer font-black text-xs border border-red-200 shadow-2xs shrink-0 flex items-center gap-1.5"
                                            title="Disconnetti"
                                        >
                                            <LogOut size={15} />
                                            <span>Esci</span>
                                        </button>
                                    </div>

                                    {/* Compact User Action Options Grid */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <Link
                                            to="/orders"
                                            onClick={() => setIsMenuOpen(false)}
                                            className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white hover:bg-blue-50/80 border border-gray-200/80 hover:border-blue-300 transition-all font-black text-xs text-gray-900 shadow-2xs group"
                                        >
                                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                                                <Package size={14} />
                                            </div>
                                            <span className="truncate">I Miei Ordini</span>
                                        </Link>

                                        <Link
                                            to="/profile"
                                            onClick={() => setIsMenuOpen(false)}
                                            className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white hover:bg-teal-50/80 border border-gray-200/80 hover:border-teal-300 transition-all font-black text-xs text-gray-900 shadow-2xs group"
                                        >
                                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                                                <UserIcon size={14} />
                                            </div>
                                            <span className="truncate">Il Mio Profilo</span>
                                        </Link>

                                        {user.role === 'ADMIN' && (
                                            <Link
                                                to="/admin"
                                                onClick={() => setIsMenuOpen(false)}
                                                className="col-span-2 flex items-center gap-2.5 p-2.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 transition-all font-black text-xs text-blue-950 shadow-2xs group"
                                            >
                                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-800 to-blue-900 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                                                    <Settings size={14} />
                                                </div>
                                                <span>Dashboard Admin</span>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-5 rounded-3xl bg-gray-50 border border-gray-200/80 space-y-3">
                                    <p className="text-xs text-gray-600 font-medium">Accedi al tuo account per visualizzare lo storico ordini e gestire il profilo.</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Link
                                            to="/login"
                                            onClick={() => setIsMenuOpen(false)}
                                            className="py-3 text-center bg-white hover:bg-gray-100 text-gray-900 font-black rounded-2xl border border-gray-200 shadow-2xs transition-all text-xs"
                                        >
                                            Accedi
                                        </Link>
                                        <Link
                                            to="/register"
                                            onClick={() => setIsMenuOpen(false)}
                                            className="py-3 text-center bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 text-white font-black rounded-2xl shadow-xs transition-all text-xs"
                                        >
                                            Registrati
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
};
