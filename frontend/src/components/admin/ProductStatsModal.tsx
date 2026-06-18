import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, TrendingUp, DollarSign, Package, Calendar } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

interface ProductStatsModalProps {
    product: { id: number; name: string };
    onClose: () => void;
}

interface OrderHistoryItem {
    orderId: number;
    customerName: string;
    date: string;
    status: string;
    quantity: number;
    priceAtPurchase: number;
}

interface ProductStats {
    productName: string;
    unitType: string;
    totalUnitsSold: number;
    totalRevenueCents: number;
    recentOrders: OrderHistoryItem[];
}

export const ProductStatsModal: React.FC<ProductStatsModalProps> = ({ product, onClose }) => {
    const { token } = useAuthStore();
    const [stats, setStats] = useState<ProductStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [period, setPeriod] = useState<string>('all');

    useEffect(() => {
        const fetchStats = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/admin/products/${product.id}/stats?period=${period}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (!res.ok) throw new Error('Failed to fetch stats');
                const data = await res.json();
                setStats(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        if (token) {
            fetchStats();
        }
    }, [product.id, period, token]);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white w-full max-w-4xl rounded-2xl shadow-xl flex flex-col overflow-hidden max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/50 relative">
                    <div className="pr-10 sm:pr-0">
                        <h2 className="text-2xl font-bold text-gray-800">Statistiche Vendite</h2>
                        <p className="text-gray-500 mt-1">{product.name}</p>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        <select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            className="bg-white border border-gray-200 text-gray-700 text-sm rounded-xl px-3 py-2 cursor-pointer focus:ring-2 focus:ring-nature-500 outline-none w-full sm:w-auto"
                        >
                            <option value="all">Sempre</option>
                            <option value="7d">Ultimi 7 Giorni</option>
                            <option value="30d">Ultimi 30 Giorni</option>
                            <option value="1y">Ultimo Anno</option>
                        </select>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-200 rounded-full transition-colors shrink-0 absolute top-4 right-4 sm:relative sm:top-auto sm:right-auto"
                        >
                            <X size={24} className="text-gray-500" />
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-48">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nature-600"></div>
                        </div>
                    ) : error ? (
                        <div className="text-red-500 p-4 bg-red-50 rounded-xl text-center">
                            {error}
                        </div>
                    ) : stats ? (
                        <div className="space-y-8">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl border border-green-200 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="p-4 bg-white rounded-xl shadow-sm">
                                            <Package size={24} className="text-green-600" />
                                        </div>
                                        <div>
                                            <p className="text-green-800 font-medium">Unità Vendute</p>
                                            <p className="text-3xl font-bold text-green-900">
                                                {stats.totalUnitsSold} <span className="text-lg text-green-700 font-normal">{stats.unitType}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-sky-50 to-sky-100 p-6 rounded-2xl border border-sky-200 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="p-4 bg-white rounded-xl shadow-sm">
                                            <DollarSign size={24} className="text-sky-600" />
                                        </div>
                                        <div>
                                            <p className="text-sky-800 font-medium">Incasso Totale</p>
                                            <p className="text-3xl font-bold text-sky-900">
                                                €{(stats.totalRevenueCents / 100).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Orders List */}
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <TrendingUp size={20} className="text-gray-500" />
                                    Storico Acquisti
                                </h3>

                                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                                    {stats.recentOrders.length > 0 ? (
                                        <div className="overflow-x-auto w-full">
                                            <table className="w-full min-w-[600px]">
                                                <thead className="bg-gray-50">
                                                    <tr className="text-left text-sm font-bold text-gray-500">
                                                        <th className="p-4">Ordine</th>
                                                        <th className="p-4">Cliente</th>
                                                        <th className="p-4">Data</th>
                                                        <th className="p-4">Quantità</th>
                                                        <th className="p-4">Prezzo d'acquisto</th>
                                                        <th className="p-4">Stato</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {stats.recentOrders.map((order, idx) => (
                                                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                            <td className="p-4 font-medium text-gray-900">#{order.orderId}</td>
                                                            <td className="p-4 text-gray-600">{order.customerName}</td>
                                                            <td className="p-4 text-gray-500 flex items-center gap-2 whitespace-nowrap">
                                                                <Calendar size={14} />
                                                                {new Date(order.date).toLocaleDateString('it-IT')}
                                                            </td>
                                                            <td className="p-4 font-medium text-gray-900">
                                                                <span className="bg-gray-100 px-3 py-1 rounded-lg">
                                                                    {order.quantity} <span className="text-xs text-gray-500">{stats.unitType}</span>
                                                                </span>
                                                            </td>
                                                            <td className="p-4 font-bold text-gray-900">
                                                                €{(order.priceAtPurchase / 100).toFixed(2)}
                                                            </td>
                                                            <td className="p-4">
                                                                <span className={`px-3 py-1 text-xs font-bold rounded-full whitespace-nowrap ${order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                                                                    order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                                                        'bg-blue-100 text-blue-700'
                                                                    }`}>
                                                                    {order.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="text-center p-8 text-gray-500">
                                            Nessun ordine trovato per questo prodotto.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </motion.div>
        </div>
    );
};
