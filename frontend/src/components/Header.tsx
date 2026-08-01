import React from 'react';
import { ShoppingBasket, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';

import { useAuthStore } from '../store/useAuthStore';
import { ChevronDown, ChevronRight, Package, User as UserIcon, LogOut, Settings, Bell, BellOff, Home, Apple, MapPin } from 'lucide-react';
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
        return (
            <div className="relative" ref={dropdownRef}>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 group"
                >
                    <div className="w-9 h-9 bg-gradient-to-br from-nature-100 to-nature-200 rounded-full flex items-center justify-center text-nature-700 shadow-sm border border-nature-100 group-hover:shadow-md transition-all duration-300 overflow-hidden">
                        {user.avatar ? (
                            <img
                                src={sanitizeImageUrl(user.avatar)}
                                alt={user.name || 'User'}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <UserIcon size={18} />
                        )}
                    </div>
                    <span className="hidden lg:inline text-nature-900 font-bold group-hover:text-nature-700 transition-colors">{user.name}</span>
                    <ChevronDown size={16} className={`text-nature-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </motion.button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95, filter: "blur(10px)" }}
                            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                            exit={{ opacity: 0, y: 10, scale: 0.95, filter: "blur(10px)" }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className="absolute right-0 mt-3 w-56 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 ring-1 ring-black/5 py-2 z-50 overflow-hidden"
                        >
                            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                                <p className="text-sm text-gray-500">Accesso effettuato come</p>
                                <p className="text-sm font-bold text-nature-900 truncate">{user.email}</p>
                            </div>

                            <div className="py-1">
                                <Link
                                    to="/profile"
                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-nature-50 hover:text-nature-700 transition-colors mx-1 rounded-lg"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <UserIcon size={16} className="text-nature-400" /> Il mio Profilo
                                </Link>
                                <Link
                                    to="/orders"
                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-nature-50 hover:text-nature-700 transition-colors mx-1 rounded-lg"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <Package size={16} className="text-nature-400" /> I miei Ordini
                                </Link>

                                <button
                                    onClick={handleTogglePush}
                                    disabled={pushEnabled || isPushLoading}
                                    className={`w-[calc(100%-8px)] flex items-center gap-3 px-4 py-2.5 text-sm transition-colors mx-1 rounded-lg ${pushEnabled ? 'text-green-600 bg-green-50/50' : 'text-gray-700 hover:bg-nature-50 hover:text-nature-700'}`}
                                >
                                    {pushEnabled ? <Bell size={16} className="text-green-500" /> : <BellOff size={16} className="text-nature-400" />}
                                    {pushEnabled ? 'Notifiche Attive' : isPushLoading ? 'Attivazione...' : 'Attiva Notifiche Push'}
                                </button>
                                {user.role === 'ADMIN' && (
                                    <Link
                                        to="/admin"
                                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-colors mx-1 rounded-lg font-medium"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <Settings size={16} className="text-blue-400" /> Dashboard Admin
                                    </Link>
                                )}
                            </div>

                            <div className="border-t border-gray-100 my-1"></div>

                            <div className="px-1 pb-1">
                                <button
                                    onClick={() => { logout(); setIsOpen(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors rounded-lg text-left"
                                >
                                    <LogOut size={16} className="text-red-400" /> Esci
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

const NavLink = ({ to, children }: { to: string; children: React.ReactNode }) => {
    return (
        <Link to={to} className="relative text-nature-900 font-medium group py-2">
            {children}
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-nature-500 transition-all duration-300 group-hover:w-full rounded-full"></span>
        </Link>
    );
};

import { useAppState } from '../store/useAppState';

export const Header = () => {
    const { items } = useCartStore();
    const [isScrolled, setIsScrolled] = React.useState(false);
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    const { settings } = useAppState();

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
    }, [window.location.pathname]);

    return (
        <header className={`${isMenuOpen ? 'fixed inset-0 z-[9999] bg-transparent' : `bg-white/90 backdrop-blur-md sticky top-0 z-[100] border-b border-gray-100 ${isScrolled ? 'py-1.5 shadow-md' : 'py-3.5 shadow-sm'}`} transition-all duration-300`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2 md:gap-3 group relative z-50 flex-shrink-0">
                        <motion.div
                            layout
                            className={`relative flex items-center justify-center transition-all duration-500 ${isScrolled ? 'w-8 h-8' : 'w-12 h-12 md:w-16 md:h-16'}`}
                        >
                            <img src={settings?.logoUrl ? sanitizeImageUrl(settings.logoUrl) : "/logo.png"} alt={`${settings?.siteName || 'Chrono Stellar'} Logo`} className="w-full h-full object-contain drop-shadow-sm group-hover:scale-110 transition-transform duration-300" />
                        </motion.div>
                        <motion.div
                            layout
                            className={`flex flex-col justify-center origin-left transition-all duration-500`}
                        >
                            <h1 className={`font-script text-nature-900 leading-none whitespace-nowrap transition-all duration-500 ${isScrolled ? 'text-lg' : 'text-2xl md:text-3xl'}`}>
                                {settings?.siteName ? (
                                    <>
                                        <span className="text-nature-600">{settings.siteName.split(' ')[0]}</span>{' '}
                                        {settings.siteName.substring(settings.siteName.indexOf(' ') + 1)}
                                    </>
                                ) : (
                                    <><span className="text-nature-600">Ortofrutta</span> Butti</>
                                )}
                            </h1>
                            <p className={`text-nature-500 font-sans tracking-[0.2em] uppercase font-bold transition-all duration-500 ${isScrolled ? 'text-[8px]' : 'text-[10px] md:text-xs'}`}>
                                {settings?.tagline || 'FRESCHEZZA DI QUALITÀ'}
                            </p>
                        </motion.div>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-12">
                        <div className="flex items-center gap-8">
                            <NavLink to="/">Home</NavLink>
                            <NavLink to="/shop">Nostri Prodotti</NavLink>
                            <NavLink to="/mercati">I Nostri Mercati</NavLink>
                        </div>

                        {/* User Actions Pill */}
                        <div className={`
                            bg-nature-50 border border-nature-100 rounded-full shadow-sm flex items-center transition-all duration-500 hover:shadow-md hover:border-nature-200
                            ${isScrolled ? 'py-1 pl-2 pr-4 gap-2' : 'py-2 pl-3 pr-5 gap-3'}
                        `}>
                            <AuthMenu
                                pushEnabled={pushEnabled}
                                handleTogglePush={handleTogglePush}
                                isPushLoading={isPushLoading}
                            />


                            <div className={`w-px bg-nature-200 transition-all duration-500 ${isScrolled ? 'h-4' : 'h-6'}`}></div>

                            {user && (
                                <>
                                    <button
                                        onClick={handleTogglePush}
                                        disabled={isPushLoading}
                                        className="p-2 text-nature-900 hover:text-nature-600 transition-colors group relative"
                                        title={pushEnabled ? "Notifiche Attive" : "Attiva Notifiche Push"}
                                    >
                                        {pushEnabled ? <Bell size={isScrolled ? 18 : 20} className="transition-all duration-500 text-green-500" /> : <BellOff size={isScrolled ? 18 : 20} className="transition-all duration-500" />}
                                    </button>
                                    <div className={`w-px bg-nature-200 transition-all duration-500 ${isScrolled ? 'h-4' : 'h-6'}`}></div>
                                </>
                            )}

                            <Link to="/cart" className="relative p-2 text-nature-900 hover:text-nature-600 transition-colors group">
                                <motion.div whileHover={{ scale: 1.1, rotate: 5 }} whileTap={{ scale: 0.9 }}>
                                    <ShoppingBasket size={isScrolled ? 18 : 22} className="transition-all duration-500" />
                                </motion.div>
                                <AnimatePresence>
                                    {itemCount > 0 && (
                                        <motion.span
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            exit={{ scale: 0 }}
                                            className="absolute -bottom-1 -right-1 bg-fruit-500 text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow-md border-2 border-white select-none pointer-events-none"
                                        >
                                            {itemCount}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </Link>
                        </div>
                    </nav>

                    {/* Mobile Actions: Cart & Burger */}
                    <div className="md:hidden flex items-center gap-3 relative z-50 pr-2">
                        {/* Mobile Cart */}
                        <Link to="/cart" className="relative p-2 text-nature-900">
                            <ShoppingBasket size={24} />
                            {itemCount > 0 && (
                                <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute -bottom-0.5 -right-0.5 bg-fruit-500 text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow-md border-2 border-white select-none pointer-events-none"
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
                                <div className="w-12 h-12 rounded-2xl bg-white p-1 shadow-sm border border-gray-150 flex items-center justify-center shrink-0">
                                    <img src={settings?.logoUrl ? sanitizeImageUrl(settings.logoUrl) : "/logo.png"} alt="Logo" className="w-full h-full object-contain" />
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
