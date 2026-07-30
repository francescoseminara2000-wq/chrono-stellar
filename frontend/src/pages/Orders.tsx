import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Package, Calendar, ChevronRight, Scale, Clock, ShoppingBag } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { sanitizeImageUrl } from '../utils/imageUrl';

interface Order {
    id: number;
    createdAt: string;
    status: string;
    finalTotal?: number;
    estimatedTotal: number;
    shippingCost: number;
    shippingAddress: string;
    deliveryMethod: 'PICKUP' | 'DELIVERY';
    scheduledDate?: string;
    scheduledTime?: string;
    approvalStatus?: string;
    items: any[];
}

export const Orders = () => {
    const { user, token } = useAuthStore();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchParams] = useSearchParams();
    const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

    useEffect(() => {
        if (token) {
            fetchOrders();
        }
    }, [token]);

    useEffect(() => {
        const orderId = searchParams.get('id');
        if (orderId && orders.length > 0) {
            setExpandedOrderId(parseInt(orderId, 10));
            setTimeout(() => {
                const element = document.getElementById(`order-${orderId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 300);
        }
    }, [searchParams, orders]);

    const fetchOrders = async () => {
        try {
            const res = await fetch(`/api/orders/my-orders`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setOrders(data);
            }
        } catch (err) {
            console.error('Failed to fetch orders', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelOrder = async (orderId: number) => {
        if (!window.confirm('Sei sicuro di voler annullare questo ordine?')) return;

        try {
            const res = await fetch(`/api/orders/${orderId}/cancel`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                alert('Ordine annullato con successo');
                fetchOrders();
            } else {
                const data = await res.json();
                alert(data.error || 'Errore durante l\'annullamento');
            }
        } catch (err) {
            console.error(err);
            alert('Errore di connessione');
        }
    };

    const statusLabels: Record<string, string> = {
        PENDING: 'In Attesa',
        WEIGHING_COMPLETED: 'Pesatura Completata',
        OUT_FOR_DELIVERY: 'In Consegna',
        DELIVERED: 'Consegnato',
        CANCELLED: 'Annullato',
    };

    const statusStyles: Record<string, string> = {
        PENDING: 'bg-amber-100 text-amber-900 border-amber-200',
        WEIGHING_COMPLETED: 'bg-emerald-100 text-emerald-900 border-emerald-200',
        OUT_FOR_DELIVERY: 'bg-indigo-100 text-indigo-900 border-indigo-200',
        DELIVERED: 'bg-green-100 text-green-900 border-green-200',
        CANCELLED: 'bg-red-100 text-red-900 border-red-200',
    };

    if (!user) return (
        <div className="min-h-screen bg-gradient-to-br from-nature-50 via-gray-50 to-emerald-50/30 flex items-center justify-center p-4">
            <div className="text-center p-8 bg-white rounded-3xl shadow-xl border border-gray-100 max-w-md space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto text-2xl">
                    📦
                </div>
                <h2 className="text-2xl font-black text-gray-900">Accesso Richiesto</h2>
                <p className="text-gray-500 text-sm">Effettua il login per consultare lo storico dei tuoi ordini.</p>
                <Link to="/login" className="inline-block w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black rounded-2xl transition-all shadow-md">
                    Vai al Login →
                </Link>
            </div>
        </div>
    );

    return (
        <div className="bg-gradient-to-br from-nature-50 via-gray-50 to-emerald-50/30 min-h-screen py-6 md:py-12 px-4">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header Title */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <div>
                        <span className="text-emerald-700 font-mono text-xs font-black uppercase tracking-widest block mb-1">Storico Spesa</span>
                        <h1 className="text-2xl md:text-4xl font-black text-gray-900">I Miei Ordini</h1>
                    </div>
                    <Link
                        to="/shop"
                        className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs sm:text-sm rounded-2xl transition-all shadow-md self-start sm:self-auto flex items-center gap-2"
                    >
                        <ShoppingBag size={16} /> Nuova Spesa
                    </Link>
                </div>

                {loading ? (
                    <div className="text-center py-16 bg-white rounded-3xl shadow-sm border border-gray-100">
                        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-700 rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-500 font-bold text-sm">Caricamento ordini in corso...</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="bg-white rounded-3xl shadow-sm p-12 text-center border border-gray-100 space-y-4">
                        <div className="w-20 h-20 bg-emerald-50 text-emerald-700 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                            <Package size={40} />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900">Nessun ordine trovato</h2>
                        <p className="text-gray-500 text-sm max-w-sm mx-auto">Non hai ancora effettuato ordini. Sfoglia il catalogo di frutta e verdura fresca e fa la tua prima spesa!</p>
                        <Link to="/shop" className="inline-block px-8 py-3.5 bg-emerald-700 text-white rounded-2xl font-black hover:bg-emerald-800 transition-all shadow-md">
                            Inizia lo Shopping →
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map(order => {
                            const isExpanded = expandedOrderId === order.id;
                            const statusStyle = statusStyles[order.status] || 'bg-gray-100 text-gray-800 border-gray-200';
                            const statusLabel = statusLabels[order.status] || order.status;

                            return (
                                <div
                                    key={order.id}
                                    id={`order-${order.id}`}
                                    className="bg-white rounded-3xl shadow-sm overflow-hidden border border-gray-100 hover:border-emerald-200 transition-all space-y-4 p-5 sm:p-6"
                                >
                                    {/* Order Top Bar */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-800 font-black text-sm flex items-center justify-center border border-emerald-100 shadow-xs">
                                                #{order.id}
                                            </div>
                                            <div>
                                                <div className="text-xs text-gray-400 font-bold flex items-center gap-1">
                                                    <Calendar size={13} />
                                                    {new Date(order.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </div>
                                                <div className="font-black text-gray-900 text-sm mt-0.5">
                                                    {order.items.length} {order.items.length === 1 ? 'articolo' : 'articoli'}
                                                </div>
                                            </div>
                                        </div>

                                        <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border shadow-xs ${statusStyle}`}>
                                            {statusLabel}
                                        </span>
                                    </div>

                                    {/* Order Delivery & Price Info */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                                                {order.deliveryMethod === 'DELIVERY' ? '🚚 Spedizione a domicilio' : '🏪 Ritiro in Negozio'}
                                            </span>
                                            <p className="text-xs font-bold text-gray-800 leading-snug">
                                                {order.shippingAddress || 'Ritiro in sede'}
                                            </p>

                                            {order.scheduledDate && (
                                                <div className="mt-2 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl inline-flex items-center gap-1.5 border border-emerald-100">
                                                    <Clock size={13} />
                                                    <span>Pianificato: {order.scheduledDate} {order.scheduledTime ? `• ${order.scheduledTime}` : ''}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="sm:text-right space-y-1">
                                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Totale Ordine</span>
                                            <div className="text-2xl font-black text-emerald-800">
                                                € {((order.finalTotal || order.estimatedTotal) / 100).toFixed(2)}
                                            </div>
                                            {!order.finalTotal && (
                                                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                                                    <Scale size={11} /> Stimato prima della pesatura
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Bar */}
                                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                                        <button
                                            onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                                            className="text-emerald-700 hover:text-emerald-900 font-black text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                        >
                                            {isExpanded ? 'Nascondi Articoli' : 'Visualizza Dettaglio Prodotti'}
                                            <ChevronRight size={16} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                        </button>

                                        {order.status === 'PENDING' && (
                                            <button
                                                onClick={() => handleCancelOrder(order.id)}
                                                className="text-xs text-red-600 hover:text-red-800 font-bold hover:underline cursor-pointer"
                                            >
                                                Annulla Ordine
                                            </button>
                                        )}
                                    </div>

                                    {/* Expanded Product List */}
                                    {isExpanded && (
                                        <div className="pt-4 border-t border-dashed border-gray-200 space-y-3 animate-in fade-in duration-200">
                                            <h4 className="font-black text-xs uppercase tracking-wider text-gray-400">Articoli Acquistati</h4>
                                            <div className="space-y-2.5">
                                                {order.items.map((item: any, idx: number) => (
                                                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-2xl bg-gray-50 border border-gray-100">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-10 h-10 rounded-xl bg-white overflow-hidden border border-gray-100 shrink-0 flex items-center justify-center">
                                                                {item.product?.imageUrl ? (
                                                                    <img src={sanitizeImageUrl(item.product.imageUrl)} alt={item.product?.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <ShoppingBag size={16} className="text-gray-300" />
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-bold text-gray-900 text-xs truncate">{item.product?.name || 'Prodotto'}</p>
                                                                <p className="text-[11px] text-gray-500 font-bold">
                                                                    {item.quantityOrdered} {item.orderedUnit || item.product?.unitType || 'pz'} x € {(item.priceAtPurchase / 100).toFixed(2)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="font-black text-xs text-gray-900 shrink-0">
                                                            € {((item.priceAtPurchase * item.quantityOrdered) / 100).toFixed(2)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
