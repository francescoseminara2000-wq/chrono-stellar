import { useState, useEffect } from 'react';
import { Bell, BellOff, X, Check } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

interface Notification {
    id: number;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
}

export const NotificationCenter = () => {
    const { token } = useAuthStore();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const API_URL = '/api/admin/notifications';

    const fetchNotifications = async () => {
        if (!token) return;
        try {
            const res = await fetch(API_URL, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                setNotifications(data);
                setUnreadCount(data.filter(n => !n.isRead).length);
            }
        } catch (err) {
            console.error('Error fetching notifications:', err);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, [token]);

    const markAsRead = async (id: number) => {
        try {
            await fetch(`${API_URL}/${id}/read`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchNotifications();
        } catch (err) { console.error(err); }
    };

    const markAllAsRead = async () => {
        try {
            await fetch(`${API_URL}/read-all`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchNotifications();
        } catch (err) { console.error(err); }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all border border-white/10 group shadow-inner"
            >
                <Bell size={20} className="group-hover:scale-110 transition-transform" />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-nature-900">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[110]" onClick={() => setIsOpen(false)}></div>
                    <div className="fixed top-20 right-4 left-4 md:bottom-24 md:left-8 md:top-auto md:right-auto md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[111] overflow-hidden animate-in fade-in slide-in-from-top-2 md:slide-in-from-bottom-2 transition-all">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                Notifiche {unreadCount > 0 && <span className="bg-nature-100 text-nature-700 text-xs px-2 py-0.5 rounded-full">{unreadCount}</span>}
                            </h3>
                            <div className="flex items-center gap-2">
                                <button onClick={markAllAsRead} className="text-[10px] font-bold text-nature-600 hover:text-nature-700 uppercase tracking-wider">Segna tutte come lette</button>
                                <button onClick={() => setIsOpen(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={16} /></button>
                            </div>
                        </div>

                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="p-12 text-center flex flex-col items-center gap-4">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                                        <BellOff size={32} />
                                    </div>
                                    <p className="text-gray-400 text-sm italic">Nessuna notifica al momento.</p>
                                </div>
                            ) : (
                                notifications.map(notif => (
                                    <div
                                        key={notif.id}
                                        className={`p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors relative group ${!notif.isRead ? 'bg-nature-50/30' : ''}`}
                                    >
                                        <div className="flex gap-3">
                                            <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${!notif.isRead ? 'bg-nature-500' : 'bg-transparent'}`}></div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-bold ${notif.isRead ? 'text-gray-700' : 'text-gray-900'}`}>{notif.title}</p>
                                                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{notif.message}</p>
                                                <p className="text-[10px] text-gray-400 mt-2 font-medium">
                                                    {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                            {!notif.isRead && (
                                                <button
                                                    onClick={() => markAsRead(notif.id)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-nature-600 hover:bg-nature-100 rounded-md transition-all self-start"
                                                    title="Segna come letta"
                                                >
                                                    <Check size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {notifications.length > 5 && (
                            <div className="p-3 bg-gray-50/80 text-center border-t border-gray-100">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Mostrando le ultime 50 attività</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
