import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, LogOut, Package, Users, Menu, X, Settings, FileText, Map as MapIcon, Maximize, Minimize } from 'lucide-react';
import { WhatsAppStatus } from '../../components/admin/WhatsAppStatus';
import { NotificationCenter } from '../../components/admin/NotificationCenter';
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { Toaster } from '../../components/ui/Toaster';
import { sanitizeImageUrl } from '../../utils/imageUrl';
import { useAppState } from '../../store/useAppState';

export const AdminLayout = () => {
    const { user } = useAuthStore();
    const { settings } = useAppState();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isProfilePopupOpen, setIsProfilePopupOpen] = useState(false);

    useEffect(() => {
        const onFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

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

    const navLinks = [
        { path: '/admin', icon: <LayoutDashboard size={20} />, label: 'Panoramica' },
        { path: '/admin/orders', icon: <ShoppingBag size={20} />, label: 'Ordini' },
        { path: '/admin/logistics', icon: <MapIcon size={20} />, label: 'Logistica' },
        { path: '/admin/pages', icon: <FileText size={20} />, label: 'Pagine' },
        { path: '/admin/products', icon: <Package size={20} />, label: 'Prodotti' },
        { path: '/admin/customers', icon: <Users size={20} />, label: 'Clienti' },
        { path: '/admin/settings', icon: <Settings size={20} />, label: 'Impostazioni' },
    ];

    const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

    return (
        <div className="min-h-screen bg-[#F8F9FA] flex flex-col lg:flex-row font-sans selection:bg-nature-200 selection:text-nature-900">
            {/* Mobile Header (Pulp & Solid) */}
            <div className="lg:hidden bg-nature-900 text-white p-4 flex justify-between items-center sticky top-0 z-50 border-b border-white/5 shadow-md">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center overflow-hidden border border-white/20">
                        <img src={settings?.logoUrl ? sanitizeImageUrl(settings.logoUrl) : "/logo.png"} alt={`${settings?.siteName || 'Admin'} Logo`} className="w-full h-full object-contain p-1" />
                    </div>
                    <div>
                        <h1 className="font-script text-2xl leading-none text-white drop-shadow-sm">{settings?.siteName ? `${settings.siteName} Admin` : 'Admin'}</h1>
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

                <div className={`p-6 ${isSidebarCollapsed ? 'lg:p-8' : 'lg:px-5 lg:py-8'} hidden lg:flex items-center ${isSidebarCollapsed ? 'justify-center flex-col gap-4' : 'justify-between'} border-b border-white/5 relative z-20 transition-all duration-300`}>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center overflow-hidden shadow-lg shadow-nature-500/30 shrink-0">
                            <img src={settings?.logoUrl ? sanitizeImageUrl(settings.logoUrl) : "/logo.png"} alt={`${settings?.siteName || 'Admin'} Logo`} className="w-full h-full object-contain p-1" />
                        </div>
                        {!isSidebarCollapsed && (
                            <div className="animate-in fade-in slide-in-from-left-2 duration-300 whitespace-nowrap">
                                <h1 className="font-script text-3xl mb-0.5 text-white tracking-wide">{settings?.siteName ? `${settings.siteName.split(' ')[0]} Admin` : 'Admin'}</h1>
                                <p className="text-nature-400/80 text-[10px] uppercase tracking-[0.2em] font-bold">Gestione Negozio</p>
                            </div>
                        )}
                    </div>

                    {/* Clean Collapse Toggle inside header */}
                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className="hidden lg:flex w-9 h-9 rounded-xl items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer shadow-sm border border-white/10 relative overflow-hidden group"
                        title={isSidebarCollapsed ? "Espandi Menu" : "Comprimi Menu"}
                    >
                        <div className="w-5 h-3.5 flex flex-col justify-between relative">
                            <span className={`w-5 h-0.5 bg-current rounded-full transition-all duration-300 transform origin-center ${isSidebarCollapsed ? '' : 'rotate-45 translate-y-1.5'}`}></span>
                            <span className={`w-5 h-0.5 bg-current rounded-full transition-all duration-300 ${isSidebarCollapsed ? 'opacity-100' : 'opacity-0'}`}></span>
                            <span className={`w-5 h-0.5 bg-current rounded-full transition-all duration-300 transform origin-center ${isSidebarCollapsed ? '' : '-rotate-45 -translate-y-1.5'}`}></span>
                        </div>
                    </button>
                </div>

                <nav className="flex-1 px-4 py-8 space-y-2 overflow-hidden relative z-10">
                    {navLinks.map((link) => {
                        const active = isActive(link.path);
                        return (
                            <Link
                                key={link.path}
                                to={link.path}
                                onClick={() => setIsMobileMenuOpen(false)}
                                title={isSidebarCollapsed ? link.label : undefined}
                                className={`group flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-300 font-medium ${isSidebarCollapsed ? 'justify-center' : ''} ${active
                                    ? 'bg-white/10 text-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-white/10 backdrop-blur-md'
                                    : 'text-nature-300/80 hover:bg-white/5 hover:text-white hover:translate-x-1 border border-transparent'
                                    }`}
                            >
                                <div className={`flex items-center justify-center transition-transform duration-300 ${active ? 'scale-110 text-nature-300' : 'group-hover:scale-110'} shrink-0`}>
                                    {link.icon}
                                </div>
                                {!isSidebarCollapsed && (
                                    <>
                                        <span className="tracking-wide whitespace-nowrap animate-in fade-in duration-300">{link.label}</span>
                                        {active && (
                                            <div className="ml-auto w-1.5 h-6 bg-nature-400 rounded-full shadow-[0_0_10px_rgba(74,222,128,0.5)]"></div>
                                        )}
                                    </>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className={`p-6 border-t border-white/10 bg-black/20 backdrop-blur-md relative z-10 transition-all duration-300 ${isSidebarCollapsed ? 'px-3 pb-8' : ''}`}>
                    <Toaster variant="inline" />

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
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[50] bg-white/95 backdrop-blur-xl border-t border-gray-200 px-2 py-2 flex items-center justify-around h-16 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                {navLinks.slice(0, 5).map((link) => {
                    const active = isActive(link.path);
                    return (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={`relative flex items-center gap-2 py-2 px-3 sm:px-4 rounded-full transition-all duration-300 ${active ? 'bg-nature-900 text-white shadow-md' : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            <div className={`transition-transform duration-300 ${active ? 'scale-110' : ''}`}>
                                {React.cloneElement(link.icon, { size: 18 })}
                            </div>
                            {active && (
                                <span className="text-[11px] font-bold whitespace-nowrap">{link.label}</span>
                            )}
                        </Link>
                    )
                })}
            </div>

        </div>
    );
};
