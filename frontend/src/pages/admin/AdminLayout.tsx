import { Link, Outlet, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    ShoppingBag,
    LogOut,
    Package,
    Users,
    Menu,
    X,
    Settings,
    FileText,
    Map as MapIcon,
    Maximize,
    Minimize,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    BarChart3,
    Gift,
    Mail,
    Tag,
    Sparkles,
    SlidersHorizontal
} from 'lucide-react';
import { WhatsAppStatus } from '../../components/admin/WhatsAppStatus';
import { NotificationCenter } from '../../components/admin/NotificationCenter';
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { sanitizeImageUrl } from '../../utils/imageUrl';
import { useAppState } from '../../store/useAppState';

type NavSingleItem = {
    type: 'link';
    path: string;
    icon: React.ReactNode;
    label: string;
};

type NavGroupItem = {
    type: 'group';
    id: string;
    label: string;
    icon: React.ReactNode;
    children: Array<{
        path: string;
        icon: React.ReactNode;
        label: string;
    }>;
};

type NavItem = NavSingleItem | NavGroupItem;

export const AdminLayout = () => {
    const { user } = useAuthStore();
    const { settings } = useAppState();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isProfilePopupOpen, setIsProfilePopupOpen] = useState(false);

    // Accordion state for collapsible groups
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        if (['/admin/coupons', '/admin/gift-cards', '/admin/newsletter'].some(p => location.pathname.startsWith(p))) {
            initial['marketing'] = true;
        }
        if (['/admin/logistics', '/admin/pages', '/admin/settings'].some(p => location.pathname.startsWith(p))) {
            initial['config'] = true;
        }
        return initial;
    });

    useEffect(() => {
        const onFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

    // Auto-open groups when navigating to child pages
    useEffect(() => {
        if (['/admin/coupons', '/admin/gift-cards', '/admin/newsletter'].some(p => location.pathname.startsWith(p))) {
            setOpenGroups(prev => ({ ...prev, marketing: true }));
        }
        if (['/admin/logistics', '/admin/pages', '/admin/settings'].some(p => location.pathname.startsWith(p))) {
            setOpenGroups(prev => ({ ...prev, config: true }));
        }
    }, [location.pathname]);

    const toggleGroup = (groupId: string) => {
        setOpenGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
    };

    const toggleFullscreen = async () => {
        if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    const isActive = (path: string) => location.pathname === path;

    const navItems: NavItem[] = [
        { type: 'link', path: '/admin', icon: <LayoutDashboard size={20} />, label: 'Panoramica' },
        { type: 'link', path: '/admin/analytics', icon: <BarChart3 size={20} />, label: 'Statistiche Accessi' },
        { type: 'link', path: '/admin/orders', icon: <ShoppingBag size={20} />, label: 'Ordini' },
        { type: 'link', path: '/admin/products', icon: <Package size={20} />, label: 'Prodotti' },
        { type: 'link', path: '/admin/customers', icon: <Users size={20} />, label: 'Clienti' },
        {
            type: 'group',
            id: 'marketing',
            label: 'Marketing & Promo',
            icon: <Sparkles size={20} />,
            children: [
                { path: '/admin/coupons', icon: <Tag size={17} />, label: 'Codici Sconto' },
                { path: '/admin/gift-cards', icon: <Gift size={17} />, label: 'Gift Card & Saldi' },
                { path: '/admin/newsletter', icon: <Mail size={17} />, label: 'Newsletter' },
            ],
        },
        {
            type: 'group',
            id: 'config',
            label: 'Sito & Configurazione',
            icon: <SlidersHorizontal size={20} />,
            children: [
                { path: '/admin/logistics', icon: <MapIcon size={17} />, label: 'Logistica' },
                { path: '/admin/pages', icon: <FileText size={17} />, label: 'Pagine' },
                { path: '/admin/settings', icon: <Settings size={17} />, label: 'Impostazioni' },
            ],
        },
    ];

    const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

    return (
        <div className="min-h-screen bg-[#F8F9FA] flex flex-col lg:flex-row font-sans selection:bg-nature-200 selection:text-nature-900">
            {/* Mobile Header (Pulp & Solid) */}
            <div className="lg:hidden bg-nature-900 text-white p-4 flex justify-between items-center sticky top-0 z-50 border-b border-white/5 shadow-md">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 flex items-center justify-center shrink-0">
                        <img src={settings?.logoUrl ? sanitizeImageUrl(settings.logoUrl) : "/logo.png"} alt="Logo" className="w-full h-full object-contain filter drop-shadow-md" />
                    </div>
                    <div>
                        <h1 className="font-sans font-black text-lg leading-none text-white tracking-tight">Amministrazione</h1>
                        <p className="text-nature-400/80 text-[9px] uppercase tracking-[0.18em] font-bold mt-0.5">Gestione Negozio</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <NotificationCenter />
                    <WhatsAppStatus />
                    <button onClick={toggleFullscreen} className="p-2.5 bg-white/10 rounded-xl text-white hover:bg-white/20 active:scale-95 transition-all backdrop-blur-md border border-white/10 hidden sm:block">
                        {isFullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
                    </button>
                    <button onClick={toggleMenu} className="p-2.5 bg-white/10 rounded-xl text-white hover:bg-white/20 active:scale-95 transition-all backdrop-blur-md border border-white/10">
                        {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </div>

            {/* Sidebar (Desktop) & Drawer (Mobile) */}
            <aside className={`
                fixed inset-y-0 left-0 z-[60] w-[280px] ${isSidebarCollapsed ? 'lg:w-[88px]' : 'lg:w-[280px]'} bg-nature-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-nature-800 via-nature-900 to-black text-white flex flex-col transform transition-all duration-300 shadow-[20px_0_40px_rgba(0,0,0,0.2)]
                lg:sticky lg:top-0 lg:h-screen lg:z-[100] lg:translate-x-0 border-r border-white/5
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {/* Decorative glow */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-nature-500 rounded-full blur-[80px] opacity-20 pointer-events-none transition-all duration-300"></div>

                <div className={`p-4 lg:px-4 lg:py-5 hidden lg:flex items-center ${isSidebarCollapsed ? 'justify-center flex-col gap-4' : 'justify-between'} border-b border-white/5 relative z-20 transition-all duration-300 shrink-0`}>
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 flex items-center justify-center shrink-0">
                            <img src={settings?.logoUrl ? sanitizeImageUrl(settings.logoUrl) : "/logo.png"} alt="Logo" className="w-full h-full object-contain filter drop-shadow-md hover:scale-105 transition-transform" />
                        </div>
                        {!isSidebarCollapsed && (
                            <div className="animate-in fade-in slide-in-from-left-2 duration-300 min-w-0 pr-1">
                                <h1 className="font-sans font-black text-lg text-white tracking-tight leading-tight truncate">Amministrazione</h1>
                                <p className="text-nature-400/90 text-[9px] uppercase tracking-[0.18em] font-bold mt-0.5">Gestione Negozio</p>
                            </div>
                        )}
                    </div>

                    {/* Sleek Collapse Toggle Button with Chevron Icon */}
                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className="hidden lg:flex w-8 h-8 rounded-xl items-center justify-center text-nature-300/80 hover:text-white bg-white/5 hover:bg-white/15 transition-all cursor-pointer shadow-xs border border-white/10 shrink-0"
                        title={isSidebarCollapsed ? "Espandi Menu" : "Comprimi Menu"}
                    >
                        {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>
                </div>

                {/* Navigation with scrollable list and Option A Collapsible Submenus */}
                <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto overflow-x-hidden dark-sidebar-scrollbar relative z-10">
                    {navItems.map((item) => {
                        if (item.type === 'link') {
                            const active = isActive(item.path);
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    title={isSidebarCollapsed ? item.label : undefined}
                                    className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-2xl transition-all duration-200 font-medium ${isSidebarCollapsed ? 'justify-center p-3' : ''} ${active
                                        ? 'bg-white/12 text-white shadow-[0_8px_25px_rgba(0,0,0,0.15)] border border-white/15 backdrop-blur-md'
                                        : 'text-nature-300/80 hover:bg-white/5 hover:text-white hover:translate-x-0.5 border border-transparent'
                                        }`}
                                >
                                    <div className={`flex items-center justify-center transition-transform duration-200 ${active ? 'scale-110 text-nature-300' : 'group-hover:scale-110'} shrink-0`}>
                                        {item.icon}
                                    </div>
                                    {!isSidebarCollapsed && (
                                        <>
                                            <span className="tracking-wide text-sm whitespace-nowrap animate-in fade-in duration-200">{item.label}</span>
                                            {active && (
                                                <div className="ml-auto w-1.5 h-5 bg-nature-400 rounded-full shadow-[0_0_10px_rgba(74,222,128,0.6)]"></div>
                                            )}
                                        </>
                                    )}
                                </Link>
                            );
                        }

                        // Collapsible Group
                        const isChildActive = item.children.some(c => isActive(c.path));
                        const isOpen = openGroups[item.id] ?? false;

                        if (isSidebarCollapsed) {
                            return (
                                <div key={item.id} className="relative group/collapsed">
                                    <button
                                        onClick={() => toggleGroup(item.id)}
                                        className={`w-full flex items-center justify-center p-3 rounded-2xl transition-all duration-200 font-medium ${isChildActive
                                            ? 'bg-white/12 text-white shadow-md border border-white/15'
                                            : 'text-nature-300/80 hover:bg-white/5 hover:text-white'
                                            }`}
                                        title={item.label}
                                    >
                                        <div className={`transition-transform duration-200 ${isChildActive ? 'scale-110 text-nature-300' : 'group-hover/collapsed:scale-110'} shrink-0`}>
                                            {item.icon}
                                        </div>
                                        {isChildActive && (
                                            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-nature-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
                                        )}
                                    </button>

                                    {/* Flyout Popover for Collapsed Sidebar */}
                                    <div className="hidden group-hover/collapsed:block absolute left-full top-0 ml-2 w-52 bg-nature-950/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl p-2 z-[120] animate-in fade-in slide-in-from-left-2 duration-150">
                                        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-nature-400 border-b border-white/10 mb-1">
                                            {item.label}
                                        </div>
                                        <div className="space-y-1">
                                            {item.children.map(child => {
                                                const active = isActive(child.path);
                                                return (
                                                    <Link
                                                        key={child.path}
                                                        to={child.path}
                                                        onClick={() => setIsMobileMenuOpen(false)}
                                                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${active
                                                            ? 'bg-nature-500/25 text-white font-bold border border-nature-400/30'
                                                            : 'text-nature-200/80 hover:bg-white/10 hover:text-white'
                                                            }`}
                                                    >
                                                        <div className={`shrink-0 ${active ? 'text-nature-300' : ''}`}>
                                                            {child.icon}
                                                        </div>
                                                        <span className="truncate">{child.label}</span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={item.id} className="space-y-1">
                                <button
                                    type="button"
                                    onClick={() => toggleGroup(item.id)}
                                    className={`w-full group flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all duration-200 font-medium text-left ${isChildActive
                                        ? 'bg-white/8 text-white border border-white/10'
                                        : 'text-nature-300/80 hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`flex items-center justify-center transition-transform duration-200 ${isChildActive ? 'scale-110 text-nature-300' : 'group-hover:scale-110'} shrink-0`}>
                                            {item.icon}
                                        </div>
                                        <span className="tracking-wide text-sm font-semibold truncate animate-in fade-in duration-200">{item.label}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0 text-white/50">
                                        <span className="text-[10px] bg-white/10 text-nature-300 px-1.5 py-0.5 rounded-md font-bold">
                                            {item.children.length}
                                        </span>
                                        <ChevronDown size={15} className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-nature-300' : ''}`} />
                                    </div>
                                </button>

                                {isOpen && (
                                    <div className="pl-3 pr-1 py-0.5 space-y-1 relative ml-4 border-l-2 border-white/10 my-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                        {item.children.map(child => {
                                            const active = isActive(child.path);
                                            return (
                                                <Link
                                                    key={child.path}
                                                    to={child.path}
                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                    className={`group/child flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${active
                                                        ? 'bg-nature-500/25 text-white shadow-sm border border-nature-400/30'
                                                        : 'text-nature-200/70 hover:bg-white/5 hover:text-white hover:translate-x-0.5'
                                                        }`}
                                                >
                                                    <div className={`transition-transform duration-200 ${active ? 'scale-110 text-nature-300' : 'group-hover/child:scale-110'} shrink-0`}>
                                                        {child.icon}
                                                    </div>
                                                    <span className="truncate">{child.label}</span>
                                                    {active && (
                                                        <div className="ml-auto w-1.5 h-1.5 bg-nature-400 rounded-full shadow-[0_0_8px_rgba(74,222,128,0.8)]"></div>
                                                    )}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                <div className={`p-6 border-t border-white/10 bg-black/20 backdrop-blur-md relative z-10 transition-all duration-300 ${isSidebarCollapsed ? 'px-3 pb-8' : ''}`}>
                    {isSidebarCollapsed ? (
                        <div className="relative flex flex-col items-center">
                            <button
                                onClick={() => setIsProfilePopupOpen(!isProfilePopupOpen)}
                                className="w-12 h-12 rounded-xl bg-gradient-to-br from-nature-700 to-nature-900 flex items-center justify-center text-white font-bold overflow-hidden border border-white/20 shadow-inner hover:scale-105 transition-transform cursor-pointer"
                            >
                                {user?.avatar ? (
                                    <img src={sanitizeImageUrl(user.avatar)} alt="avatar" className="w-full h-full object-cover" />
                                ) : (
                                    user?.name?.charAt(0).toUpperCase() || 'A'
                                )}
                            </button>

                            {isProfilePopupOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsProfilePopupOpen(false)}></div>
                                    <div className="absolute bottom-0 left-[70px] bg-nature-900 border border-white/10 rounded-2xl shadow-2xl p-4 w-60 z-50 animate-in fade-in slide-in-from-left-2 duration-200">
                                        <div className="border-b border-white/10 pb-3 mb-3">
                                            <p className="text-sm font-bold text-white truncate">{user?.name || 'Admin'}</p>
                                            <p className="text-[11px] text-nature-400/80 truncate font-medium">{user?.email || settings?.contactEmail || 'admin@chrono-stellar.it'}</p>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <button onClick={toggleFullscreen} className="flex items-center gap-3 p-2.5 text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-all w-full text-left text-sm font-medium">
                                                {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                                                <span>Schermo Intero</span>
                                            </button>
                                            <div className="p-1">
                                                <NotificationCenter />
                                            </div>
                                            <div className="p-1">
                                                <WhatsAppStatus />
                                            </div>
                                            <Link to="/" className="flex items-center gap-3 p-2.5 mt-2 text-red-300 hover:text-white bg-red-500/10 hover:bg-red-500/80 border border-red-500/20 hover:border-red-500 rounded-xl transition-all text-sm font-bold">
                                                <LogOut size={16} />
                                                <span>Esci</span>
                                            </Link>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-3 mb-5 p-3 rounded-2xl bg-white/5 border border-white/10 shadow-inner transition-all duration-300">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-nature-700 to-nature-900 flex items-center justify-center text-white font-bold overflow-hidden shrink-0 border border-white/20 shadow-inner">
                                    {user?.avatar ? (
                                        <img src={sanitizeImageUrl(user.avatar)} alt="avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        user?.name?.charAt(0).toUpperCase() || 'A'
                                    )}
                                </div>
                                <div className="min-w-0 flex-1 animate-in fade-in duration-300">
                                    <p className="text-sm font-bold text-white truncate">{user?.name || 'Admin'}</p>
                                    <p className="text-[11px] text-nature-400/80 truncate font-medium">{user?.email || settings?.contactEmail || 'admin@chrono-stellar.it'}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 transition-all duration-300">
                                <button onClick={toggleFullscreen} className="p-3 text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all duration-300 shadow-sm hidden lg:block" title="Schermo Intero">
                                    {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                                </button>
                                <Link to="/" className="flex-1 flex items-center justify-center gap-2 py-3.5 text-xs text-red-300 hover:text-white bg-red-500/10 hover:bg-red-500/80 border border-red-500/20 hover:border-red-500 rounded-2xl transition-all duration-300 font-bold group shadow-sm hover:shadow-red-500/25">
                                    <LogOut size={16} className="group-hover:-translate-x-1 transition-transform shrink-0" />
                                    <span className="animate-in fade-in duration-300">Esci</span>
                                </Link>
                                <div className="hidden lg:block">
                                    <NotificationCenter />
                                </div>
                                <div className="hidden lg:block">
                                    <WhatsAppStatus />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </aside>

            {/* Overlay for mobile when drawer is open */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-nature-900/60 z-30 lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto bg-transparent lg:p-8 p-5 w-full relative min-h-screen pb-32 lg:pb-8">
                {/* Dynamic subtle background elements */}
                <div className="fixed top-0 left-0 right-0 h-48 bg-gradient-to-b from-nature-500/5 to-transparent pointer-events-none -z-10"></div>

                <Outlet />
            </main>

            {/* Mobile Bottom Navigation (Docked full-width bar) */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[50] bg-white/95 backdrop-blur-xl border-t border-gray-200 px-3 py-2 flex items-center justify-around h-16 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                {[
                    { path: '/admin', icon: <LayoutDashboard size={19} />, label: 'Home' },
                    { path: '/admin/orders', icon: <ShoppingBag size={19} />, label: 'Ordini' },
                    { path: '/admin/products', icon: <Package size={19} />, label: 'Prodotti' },
                    { path: '/admin/customers', icon: <Users size={19} />, label: 'Clienti' },
                ].map((link) => {
                    const active = isActive(link.path);
                    return (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={`relative flex items-center gap-1.5 py-2 px-3 rounded-full transition-all duration-300 ${active ? 'bg-nature-900 text-white shadow-md' : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            <div className={`transition-transform duration-300 ${active ? 'scale-110' : ''}`}>
                                {link.icon}
                            </div>
                            {active && (
                                <span className="text-[11px] font-bold whitespace-nowrap">{link.label}</span>
                            )}
                        </Link>
                    );
                })}
                <button
                    onClick={toggleMenu}
                    className={`relative flex items-center gap-1.5 py-2 px-3 rounded-full transition-all duration-300 ${isMobileMenuOpen ? 'bg-nature-900 text-white shadow-md' : 'text-gray-500 hover:text-gray-900'
                        }`}
                >
                    <Menu size={19} />
                    <span className="text-[11px] font-bold">Altro</span>
                </button>
            </div>

        </div>
    );
};
