import React from 'react';
import { ShoppingBasket, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';

import { useAuthStore } from '../store/useAuthStore';
import { ChevronDown, Package, User as UserIcon, LogOut, Settings, Bell, BellOff } from 'lucide-react';
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
        <header className={`bg-white/80 backdrop-blur-md sticky top-0 ${isMenuOpen ? 'z-[150]' : 'z-[100]'} transition-all duration-500 border-b border-gray-100 ${isScrolled ? 'py-1 shadow-md' : 'py-4 shadow-sm'}`}>
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

            {/* Mobile Fullscreen Glassmorphism Navigation Drawer */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="md:hidden fixed inset-0 z-[120] bg-gradient-to-br from-nature-950 via-emerald-950 to-nature-900 text-white backdrop-blur-2xl p-6 flex flex-col justify-between overflow-y-auto"
                    >
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-white/10 p-1 flex items-center justify-center border border-white/10">
                                    <img src={settings?.logoUrl ? sanitizeImageUrl(settings.logoUrl) : "/logo.png"} alt="Logo" className="w-full h-full object-contain" />
                                </div>
                                <div>
                                    <span className="font-black text-base text-white block leading-none">{settings?.siteName || 'Ortofrutta'}</span>
                                    <span className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase">Menu Principale</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsMenuOpen(false)}
                                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer border border-white/10 active:scale-90"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        {/* Navigation Links Grid */}
                        <div className="py-6 space-y-3 flex-1 overflow-y-auto">
                            <Link
                                to="/"
                                onClick={() => setIsMenuOpen(false)}
                                className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all font-black text-lg text-white"
                            >
                                <span className="p-2.5 bg-emerald-500/20 text-emerald-300 rounded-xl">🏠</span>
                                <span>Home</span>
                            </Link>

                            <Link
                                to="/shop"
                                onClick={() => setIsMenuOpen(false)}
                                className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all font-black text-lg text-white"
                            >
                                <span className="p-2.5 bg-amber-500/20 text-amber-300 rounded-xl">🍏</span>
                                <span>Catalogo Ortofrutta</span>
                            </Link>

                            <Link
                                to="/cart"
                                onClick={() => setIsMenuOpen(false)}
                                className="flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all font-black text-lg text-white"
                            >
                                <div className="flex items-center gap-4">
                                    <span className="p-2.5 bg-purple-500/20 text-purple-300 rounded-xl">🛒</span>
                                    <span>Il Tuo Carrello</span>
                                </div>
                                {itemCount > 0 && (
                                    <span className="px-3 py-1 bg-emerald-500 text-white font-black text-xs rounded-full">
                                        {itemCount} {itemCount === 1 ? 'art.' : 'art.'}
                                    </span>
                                )}
                            </Link>

                            {user && (
                                <>
                                    <Link
                                        to="/orders"
                                        onClick={() => setIsMenuOpen(false)}
                                        className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all font-black text-lg text-white"
                                    >
                                        <span className="p-2.5 bg-blue-500/20 text-blue-300 rounded-xl">📦</span>
                                        <span>I Miei Ordini</span>
                                    </Link>

                                    <Link
                                        to="/profile"
                                        onClick={() => setIsMenuOpen(false)}
                                        className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all font-black text-lg text-white"
                                    >
                                        <span className="p-2.5 bg-emerald-500/20 text-emerald-300 rounded-xl">👤</span>
                                        <span>Il Mio Profilo</span>
                                    </Link>

                                    {user.role === 'ADMIN' && (
                                        <Link
                                            to="/admin"
                                            onClick={() => setIsMenuOpen(false)}
                                            className="flex items-center gap-4 p-4 rounded-2xl bg-blue-600/30 hover:bg-blue-600/40 border border-blue-500/40 transition-all font-black text-lg text-blue-200"
                                        >
                                            <span className="p-2.5 bg-blue-500 text-white rounded-xl">⚙️</span>
                                            <span>Dashboard Admin</span>
                                        </Link>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Drawer Bottom User Card / Auth */}
                        <div className="pt-4 border-t border-white/10">
                            {user ? (
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-11 h-11 rounded-2xl bg-emerald-800 border border-white/20 overflow-hidden shrink-0 flex items-center justify-center">
                                            {user.avatar ? (
                                                <img src={sanitizeImageUrl(user.avatar)} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <UserIcon size={20} className="text-white" />
                                            )}
                                        </div>
                                        <div>
                                            <span className="font-black text-sm text-white block">{user.name}</span>
                                            <span className="text-xs text-emerald-300/80">{user.email}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { logout(); setIsMenuOpen(false); }}
                                        className="p-2.5 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-all cursor-pointer font-bold text-xs"
                                    >
                                        Esci
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    <Link
                                        to="/login"
                                        onClick={() => setIsMenuOpen(false)}
                                        className="py-3.5 text-center bg-white/10 hover:bg-white/20 text-white font-black rounded-2xl border border-white/10 transition-all"
                                    >
                                        Accedi
                                    </Link>
                                    <Link
                                        to="/register"
                                        onClick={() => setIsMenuOpen(false)}
                                        className="py-3.5 text-center bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-lg transition-all"
                                    >
                                        Registrati
                                    </Link>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
};
