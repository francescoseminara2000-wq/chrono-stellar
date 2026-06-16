import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Package, Truck, Calendar, ChevronRight } from 'lucide-react';
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
    items: any[];
}

export const Orders = () => {
    const { user, token } = useAuthStore();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchParams] = useSearchParams();

    useEffect(() => {
        if (token) {
            fetchOrders();
        }
    }, [token]);

    useEffect(() => {
        const orderId = searchParams.get('id');
        if (orderId && orders.length > 0) {
            setExpandedOrderId(parseInt(orderId));
            // Scroll to the order element if needed
            setTimeout(() => {
                const element = document.getElementById(`order-${orderId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 500);
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
                fetchOrders(); // Refresh list
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
        PENDING: 'bg-yellow-100 text-yellow-700',
        WEIGHING_COMPLETED: 'bg-blue-100 text-blue-700',
        OUT_FOR_DELIVERY: 'bg-purple-100 text-purple-700',
        DELIVERED: 'bg-green-100 text-green-700',
        CANCELLED: 'bg-red-100 text-red-700',
    };

    if (!user) return (
        <div className="min-h-screen flex items-center justify-center bg-nature-50">
            <div className="text-center p-8 bg-white rounded-2xl shadow-sm">
                <p className="text-gray-500 mb-4">Effettua il login per vedere i tuoi ordini.</p>
                <Link to="/login" className="text-nature-600 font-bold hover:underline">Vai al Login</Link>
            </div>
        </div>
    );

    const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

    return (
        <div className="min-h-screen bg-nature-50 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-script text-nature-900 mb-8">I Miei Ordini</h1>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="w-12 h-12 border-4 border-nature-200 border-t-nature-600 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-500">Caricamento ordini...</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                        <div className="w-20 h-20 bg-nature-100 rounded-full flex items-center justify-center mx-auto mb-6 text-nature-500">
                            <Package size={40} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Nessun ordine trovato</h2>
                        <p className="text-gray-500 mb-8">Non hai ancora effettuato ordini nel nostro negozio.</p>
                        <Link to="/shop" className="bg-nature-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-nature-700 transition-colors">
                            Inizia lo Shopping
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {orders.map(order => (
                            <div key={order.id} id={`order-${order.id}`} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 transition-all hover:shadow-md">
                                <div className="p-6">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-nature-50 rounded-full flex items-center justify-center text-nature-600 font-bold text-lg">
                                                #{order.id}
                                            </div>
                                            <div>
                                                <div className="text-sm text-gray-500 flex items-center gap-1">
                                                    <Calendar size={14} />
                                                    {new Date(order.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                </div>
                                                <div className="font-bold text-nature-900">
                                                    {order.items.length} prodotti
                                                </div>
                                            </div>
                                        </div>
                                        <span className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider ${statusStyles[order.status]}`}>
                                            {statusLabels[order.status] || order.status}
                                        </span>
                                    </div>

                                    {/* Order Summary */}
                                    <div className="border-t border-gray-50 pt-4 flex flex-col md:flex-row justify-between gap-6">
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold text-gray-700">Consegna a:</p>
                                            <p className="text-sm text-gray-600 flex items-start gap-2">
                                                <Truck size={16} className="mt-0.5 flex-shrink-0" />
                                                {order.shippingAddress}
                                            </p>
                                        </div>

                                        <div className="text-right space-y-1">
                                            <div className="text-2xl font-bold text-nature-900">
                                                € {((order.finalTotal || order.estimatedTotal) / 100).toFixed(2)}
                                                {!order.finalTotal && <span className="text-xs font-normal text-gray-400 ml-2">(Stimato)</span>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="mt-6 flex justify-between items-center">
                                        <button
                                            onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                                            className="text-nature-600 font-bold flex items-center gap-1 text-sm hover:underline"
                                        >
                                            {expandedOrderId === order.id ? 'Nascondi Dettagli' : 'Vedi Dettagli'}
                                            <ChevronRight size={16} className={`transition-transform ${expandedOrderId === order.id ? 'rotate-90' : ''}`} />
                                        </button>

                                        {order.status === 'PENDING' && (
                                            <button
                                                onClick={() => handleCancelOrder(order.id)}
                                                className="text-red-500 hover:text-red-700 text-sm font-medium hover:underline"
                                            >
                                                Annulla Ordine
                                            </button>
                                        )}
                                    </div>

                                    {/* Expanded Details */}
                                    {expandedOrderId === order.id && (
                                        <div className="mt-6 border-t border-dashed border-gray-200 pt-6 animate-in slide-in-from-top-2 duration-200">
                                            <h4 className="font-bold text-gray-700 mb-4">Dettaglio Prodotti</h4>
                                            <div className="space-y-3">
                                                {order.items.map((item: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between items-center text-sm">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-gray-50 rounded-lg overflow-hidden border border-gray-100 flex-shrink-0">
                                                                {item.product?.imageUrl ? (
                                                                    <img src={sanitizeImageUrl(item.product.imageUrl)} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">IMG</div>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-gray-900">{item.product?.name || 'Prodotto non disponibile'}</p>
                                                                <p className="text-gray-500 text-xs">
                                                                    {item.quantityOrdered} {item.product?.unitType === 'KG' ? 'kg' : 'pz'} x € {(item.priceAtPurchase / 100).toFixed(2)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className="font-bold text-gray-700">
                                                            € {((item.priceAtPurchase * item.quantityOrdered) / 100).toFixed(2)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                            {order.shippingCost > 0 && (
                                                <div className="flex justify-between text-sm text-gray-600 mt-4 pt-3 border-t border-gray-100">
                                                    <span>Spedizione</span>
                                                    <span>€ {(order.shippingCost / 100).toFixed(2)}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
