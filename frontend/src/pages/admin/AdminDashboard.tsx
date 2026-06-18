import { useState, useEffect } from 'react';
import { ShoppingBag, Package, TrendingUp, Clock, ChevronRight, ArrowUpRight, ArrowDownRight, Target, BarChart3 } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { Link } from 'react-router-dom';
import { sanitizeImageUrl } from '../../utils/imageUrl';
import { motion } from 'framer-motion';

interface OrderSummary {
    id: number;
    finalTotal: number | null;
    estimatedTotal: number;
    status: string;
    createdAt: string;
    customerInfo: any;
}

interface StatPeriod {
    revenue: number;
    orderCount: number;
    aov: number;
    topProducts: Array<{
        id: number;
        name: string;
        revenue: number;
        quantity: number;
        unitType: string;
    }>;
    chartData: Array<{
        label: string;
        value: number;
    }>;
}

interface DashboardData {
    current: StatPeriod;
    previous: StatPeriod;
    trends: {
        revenue: number;
        orderCount: number;
        aov: number;
    };
}

const periods = [
    { id: 'today', label: 'Oggi' },
    { id: 'last7days', label: '7 Giorni' },
    { id: 'last30days', label: '30 Giorni' },
    { id: 'thisMonth', label: 'Mese Corr.' },
    { id: 'lastMonth', label: 'Mese Scorso' },
];

export const AdminDashboard = () => {
    const { token } = useAuthStore();
    const [data, setData] = useState<DashboardData | null>(null);
    const [recentOrders, setRecentOrders] = useState<OrderSummary[]>([]);
    const [activeProducts, setActiveProducts] = useState(0);
    const [criticalProducts, setCriticalProducts] = useState<any[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState('last7days');
    const [isLoading, setIsLoading] = useState(true);

    const API_URL = '';

    useEffect(() => {
        if (token) {
            fetchDashboardData();
        }
    }, [token, selectedPeriod]);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            const [statsRes, ordersRes, productsRes] = await Promise.all([
                fetch(`${API_URL}/api/admin/stats?period=${selectedPeriod}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/admin/orders`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/admin/products`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            const stats = await statsRes.json();
            const orders = await ordersRes.json();
            const products = await productsRes.json();

            if (stats && !stats.error) setData(stats);
            if (Array.isArray(orders)) setRecentOrders(orders.slice(0, 5));
            if (Array.isArray(products)) {
                setActiveProducts(products.filter((p: any) => p.isAvailable).length);
                setCriticalProducts(products.filter((p: any) => p.stockQuantity <= p.lowStockThreshold).slice(0, 5));
            }
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Buongiorno';
        if (hour < 18) return 'Buon Pomeriggio';
        return 'Buonasera';
    };

    const renderTrend = (value: number) => {
        const isPositive = value >= 0;
        return (
            <div className={`flex items-center gap-0.5 text-[10px] font-black uppercase tracking-wider ${isPositive ? 'text-nature-600' : 'text-red-500'}`}>
                {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {Math.abs(value)}%
                <span className="text-gray-400 font-medium ml-1">vs prec.</span>
            </div>
        );
    };

    const renderStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            WEIGHING_COMPLETED: 'bg-blue-100 text-blue-700 border-blue-200',
            OUT_FOR_DELIVERY: 'bg-purple-100 text-purple-700 border-purple-200',
            DELIVERED: 'bg-green-100 text-green-700 border-green-200',
            CANCELLED: 'bg-red-100 text-red-700 border-red-200',
        };
        const labels: Record<string, string> = {
            PENDING: 'In Attesa',
            WEIGHING_COMPLETED: 'Pesato',
            OUT_FOR_DELIVERY: 'In Consegna',
            DELIVERED: 'Consegnato',
            CANCELLED: 'Annullato',
        };
        return (
            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border shadow-sm ${styles[status]}`}>
                {labels[status] || status}
            </span>
        );
    };

    const maxChartValue = data ? Math.max(...data.current.chartData.map(d => d.value), 1) : 1;

    return (
        <div className="flex flex-col h-full bg-gray-50 -m-5 lg:-m-8 p-5 lg:p-8 overflow-y-auto overflow-x-hidden custom-scrollbar">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 lg:gap-6 mb-4 lg:mb-8">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">{getGreeting()}, Admin! 👋</h1>
                    <p className="text-gray-500 flex items-center gap-2 text-sm font-medium mt-1">
                        <Clock size={16} className="text-nature-600" /> {new Date().toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>

                <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-200 w-full lg:w-auto overflow-x-auto no-scrollbar">
                    {periods.map(p => (
                        <button
                            key={p.id}
                            onClick={() => setSelectedPeriod(p.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${selectedPeriod === p.id ? 'bg-nature-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-nature-600"></div>
                </div>
            ) : data && (
                <div className="space-y-8 pb-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-6 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 group hover:border-nature-200 transition-colors">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 rounded-2xl bg-nature-50 text-nature-600 group-hover:scale-110 transition-transform">
                                    <TrendingUp size={20} />
                                </div>
                                {renderTrend(data.trends.revenue)}
                            </div>
                            <h3 className="text-gray-400 text-[10px] uppercase font-black tracking-widest mb-1">Fatturato Periodo</h3>
                            <p className="text-3xl font-black text-gray-900">€ {(data.current.revenue / 100).toFixed(2)}</p>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                            className="bg-white p-6 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 group hover:border-blue-200 transition-colors">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform">
                                    <ShoppingBag size={20} />
                                </div>
                                {renderTrend(data.trends.orderCount)}
                            </div>
                            <h3 className="text-gray-400 text-[10px] uppercase font-black tracking-widest mb-1">Ordini Gestiti</h3>
                            <p className="text-3xl font-black text-gray-900">{data.current.orderCount}</p>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                            className="bg-white p-6 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 group hover:border-purple-200 transition-colors">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 rounded-2xl bg-purple-50 text-purple-600 group-hover:scale-110 transition-transform">
                                    <Target size={20} />
                                </div>
                                {renderTrend(data.trends.aov)}
                            </div>
                            <h3 className="text-gray-400 text-[10px] uppercase font-black tracking-widest mb-1">Valore Medio Ordine</h3>
                            <p className="text-3xl font-black text-gray-900">€ {(data.current.aov / 100).toFixed(2)}</p>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                            className="bg-white p-6 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 group hover:border-amber-200 transition-colors">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform">
                                    <Package size={20} />
                                </div>
                                <div className="flex items-center gap-1 text-[10px] font-black uppercase text-amber-600">Catalogo Online</div>
                            </div>
                            <h3 className="text-gray-400 text-[10px] uppercase font-black tracking-widest mb-1">Prodotti Attivi</h3>
                            <p className="text-3xl font-black text-gray-900">{activeProducts}</p>
                        </motion.div>
                    </div>

                    {/* Low Stock Alerts Widget */}
                    {criticalProducts.length > 0 && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                            className="bg-red-50 p-6 rounded-[2.5rem] border-2 border-red-100 shadow-lg shadow-red-100/20">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-red-500 text-white rounded-2xl shadow-lg shadow-red-200 animate-pulse">
                                        <Package size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-red-900 leading-tight">Allerta Sottoscorta! ⚠️</h2>
                                        <p className="text-red-700 text-xs font-bold uppercase tracking-wider mt-1">{criticalProducts.length} prodotti richiedono riassortimento immediato</p>
                                    </div>
                                </div>
                                <div className="flex -space-x-4">
                                    {criticalProducts.map((p, i) => (
                                        <Link key={p.id} to="/admin/products" className="w-12 h-12 rounded-2xl border-2 border-white bg-white overflow-hidden shadow-md hover:-translate-y-2 transition-all relative group" style={{ zIndex: 10 - i }}>
                                            {p.imageUrl ? (
                                                <img src={sanitizeImageUrl(p.imageUrl)} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[10px] font-black bg-gray-50 text-gray-400">?</div>
                                            )}
                                            <div className="absolute inset-x-0 bottom-0 bg-red-600 text-white text-[8px] font-black text-center py-0.5">{p.stockQuantity}</div>
                                        </Link>
                                    ))}
                                    <Link to="/admin/products" className="w-12 h-12 rounded-2xl border-2 border-white bg-red-600 text-white flex items-center justify-center shadow-md hover:bg-red-700 transition-colors z-0">
                                        <ChevronRight size={20} />
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Main Chart Section */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                        className="bg-white p-5 lg:p-8 rounded-[2rem] lg:rounded-[3.5rem] shadow-[0_8px_40px_rgb(0,0,0,0.04)] border border-gray-100">
                        <div className="flex justify-between items-center mb-6 lg:mb-10">
                            <div>
                                <h2 className="text-xl lg:text-2xl font-black text-gray-900 flex items-center gap-3">
                                    <BarChart3 className="text-nature-600" /> Andamento Fatturato
                                </h2>
                                <p className="text-gray-400 text-xs lg:text-sm font-medium mt-1">Dettaglio ricavi per il periodo {periods.find(p => p.id === selectedPeriod)?.label}</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto custom-scrollbar w-full pb-2">
                            <div className="relative h-64 flex items-end gap-1.5 sm:gap-3 md:gap-5 px-4 min-w-[500px] lg:min-w-0">
                                {/* Grid Lines */}
                                <div className="absolute inset-0 flex flex-col justify-between py-2 pointer-events-none">
                                    {[0, 1, 2, 3].map(i => (
                                        <div key={i} className="w-full border-t border-gray-50/80" />
                                    ))}
                                </div>

                                {data.current.chartData.map((d, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center group relative z-10 h-full justify-end">
                                        {/* Tooltip centered over the bar top */}
                                        <div
                                            style={{ bottom: `${(d.value / maxChartValue) * 92}%` }}
                                            className="absolute mb-1 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap 
                                                bg-nature-900 text-white text-[10px] font-black px-2 py-1 rounded-md shadow-2xl z-20 
                                                left-1/2 -translate-x-1/2 origin-bottom transform scale-95 group-hover:scale-100"
                                        >
                                            € {(d.value / 100).toFixed(0)}
                                            {/* Small centered arrow */}
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[3px] border-transparent border-t-nature-900" />
                                        </div>

                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: `${(d.value / maxChartValue) * 92}%` }}
                                            transition={{ delay: 0.1 + (i * 0.01), duration: 0.8, ease: "circOut" }}
                                            className={`w-full max-w-[42px] rounded-t-lg transition-all duration-500 ${d.value === maxChartValue
                                                ? 'bg-nature-600 shadow-[0_3px_8px_rgba(34,197,94,0.15)]'
                                                : 'bg-nature-100 group-hover:bg-nature-200'
                                                }`}
                                        />
                                        <span className="mt-4 text-[9px] font-black text-gray-400 uppercase tracking-tighter sm:tracking-normal group-hover:text-nature-900 transition-colors truncate w-full text-center">
                                            {d.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1 bg-white p-5 lg:p-8 rounded-[2rem] lg:rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                            <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                                <Target size={20} className="text-nature-600" /> Top Prodotti
                            </h2>
                            <div className="space-y-6">
                                {data.current.topProducts.length === 0 ? (
                                    <p className="text-sm text-gray-400 italic">Nessun dato disponibile.</p>
                                ) : (
                                    data.current.topProducts.map((p, idx) => (
                                        <div key={p.id} className="space-y-2">
                                            <div className="flex justify-between items-end">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-black text-nature-600 w-4">#{idx + 1}</span>
                                                    <p className="font-bold text-gray-900 truncate max-w-[150px]">{p.name}</p>
                                                </div>
                                                <span className="text-xs font-black text-gray-900">€ {(p.revenue / 100).toFixed(2)}</span>
                                            </div>
                                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(p.revenue / (data.current.topProducts[0]?.revenue || 1)) * 100}%` }}
                                                    transition={{ duration: 1, ease: "easeOut" }}
                                                    className="h-full bg-nature-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                                                />
                                            </div>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                                {p.quantity} {p.unitType} venduti
                                            </p>
                                        </div>
                                    ))
                                ) }
                            </div>
                        </div>

                        <div className="lg:col-span-2 bg-white rounded-[2rem] lg:rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
                            <div className="p-5 lg:p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                                <h2 className="text-xl font-black text-gray-900">Ultimi Ordini</h2>
                                <Link to="/admin/orders" className="text-xs font-black text-nature-600 bg-nature-50 px-4 py-2 rounded-xl transition-all hover:bg-nature-100 flex items-center gap-2 uppercase tracking-widest">
                                    Vedi Tutti <ChevronRight size={14} />
                                </Link>
                            </div>
                            <div className="divide-y divide-gray-50">
                                {recentOrders.length === 0 ? (
                                    <div className="p-20 text-center text-gray-400 font-medium">Nessun ordine recente.</div>
                                ) : (
                                    recentOrders.map(order => (
                                        <div key={order.id} className="p-4 lg:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center shrink-0 border border-white shadow-sm font-black text-gray-500">
                                                    #{order.id}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 text-lg leading-tight">{order.customerInfo?.name || 'Cliente'}</p>
                                                    <p className="text-xs text-gray-500 font-medium flex items-center gap-1.5 mt-1">
                                                        <Clock size={14} className="opacity-50" />
                                                        {new Date(order.createdAt).toLocaleDateString('it-IT')} · {new Date(order.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between sm:justify-end gap-10 sm:w-auto w-full border-t border-gray-50 sm:border-0 pt-4 sm:pt-0">
                                                <div className="text-left sm:text-right">
                                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider mb-0.5">Fatturato</p>
                                                    <p className="text-xl font-black text-gray-900">
                                                        € {((order.finalTotal || order.estimatedTotal) / 100).toFixed(2)}
                                                    </p>
                                                </div>
                                                <div className="shrink-0">
                                                    {renderStatusBadge(order.status)}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
