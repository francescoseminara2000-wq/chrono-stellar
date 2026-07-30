import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { sanitizeImageUrl } from '../../utils/imageUrl';
import {
    TrendingUp,
    Users,
    Eye,
    ShoppingBag,
    Smartphone,
    Monitor,
    ArrowUpRight,
    Sparkles,
    RefreshCw,
    BarChart3
} from 'lucide-react';

interface AnalyticsData {
    period: string;
    totalVisits: number;
    uniqueVisitors: number;
    homepageVisits: number;
    productVisits: number;
    trendData: Array<{ date: string; visits: number; uniqueVisitors: number }>;
    topProducts: Array<{
        productId: number;
        name: string;
        priceCents: number;
        imageUrl: string | null;
        unitType: string;
        visits: number;
    }>;
    topPages: Array<{ path: string; visits: number }>;
    devices: {
        mobile: number;
        desktop: number;
        mobilePercent: number;
        desktopPercent: number;
    };
}

export const AnalyticsDashboard: React.FC = () => {
    const { token } = useAuthStore();
    const [period, setPeriod] = useState<string>('7days');
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

    const fetchAnalytics = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/analytics/admin/overview?period=${period}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Impossibile caricare le statistiche');
            const json = await res.json();
            setData(json);
        } catch (err: any) {
            if (!isBackground) setError(err.message || 'Errore nel caricamento dei dati');
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, [period, token]);

    // Live 5-second auto refresh interval
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(() => {
            fetchAnalytics(true);
        }, 5000);
        return () => clearInterval(interval);
    }, [autoRefresh, period, token]);

    const maxVisitsInTrend = data?.trendData?.length
        ? Math.max(...data.trendData.map(d => d.visits), 1)
        : 1;

    return (
        <div className="p-4 md:p-8 space-y-8 bg-gray-50/50 min-h-screen">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                            <BarChart3 size={16} /> Analytics Hub
                        </span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 mt-2">Monitoraggio Accessi & Traffic Flow</h1>
                    <p className="text-xs md:text-sm text-gray-500 mt-0.5">
                        Analisi in tempo reale degli accessi al sito, delle visite ai prodotti e dei flussi utente.
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center bg-gray-100 p-1 rounded-2xl border border-gray-200">
                        {[
                            { id: 'today', label: 'Oggi' },
                            { id: '7days', label: '7 Giorni' },
                            { id: '30days', label: '30 Giorni' },
                            { id: '1year', label: 'Anno' },
                            { id: 'all', label: 'Tutti' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setPeriod(tab.id)}
                                className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                                    period === tab.id
                                        ? 'bg-emerald-800 text-white shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`px-3 py-2 rounded-2xl border text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                            autoRefresh
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                                : 'bg-gray-100 text-gray-500 border-gray-200'
                        }`}
                        title="Attiva/Disattiva aggiornamento in tempo reale ogni 5 sec"
                    >
                        <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-ping' : 'bg-gray-400'}`} />
                        <span>{autoRefresh ? '⚡ Live (5s)' : 'Pausa Live'}</span>
                    </button>

                    <button
                        onClick={() => fetchAnalytics(false)}
                        className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl transition-colors cursor-pointer"
                        title="Aggiorna dati manuale"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-700 text-sm font-bold rounded-2xl border border-red-200">
                    ⚠️ {error}
                </div>
            )}

            {/* KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Visite Totali</span>
                        <div className="text-3xl font-black text-gray-900">
                            {loading ? '...' : (data?.totalVisits || 0).toLocaleString('it-IT')}
                        </div>
                        <span className="text-[11px] text-emerald-600 font-bold mt-1 inline-flex items-center gap-1">
                            <TrendingUp size={12} /> {period === '7days' ? 'Ultimi 7 giorni' : 'Periodo selezionato'}
                        </span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">
                        <Eye size={24} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Visitatori Unici</span>
                        <div className="text-3xl font-black text-gray-900">
                            {loading ? '...' : (data?.uniqueVisitors || 0).toLocaleString('it-IT')}
                        </div>
                        <span className="text-[11px] text-blue-600 font-bold mt-1 inline-flex items-center gap-1">
                            <Users size={12} /> Indirizzi IP Distinti
                        </span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-black">
                        <Users size={24} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Visite Prodotti</span>
                        <div className="text-3xl font-black text-gray-900">
                            {loading ? '...' : (data?.productVisits || 0).toLocaleString('it-IT')}
                        </div>
                        <span className="text-[11px] text-amber-600 font-bold mt-1 inline-flex items-center gap-1">
                            <ShoppingBag size={12} /> Pagine Prodotto
                        </span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-black">
                        <ShoppingBag size={24} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Traffico Mobile</span>
                        <div className="text-3xl font-black text-gray-900">
                            {loading ? '...' : `${data?.devices?.mobilePercent || 0}%`}
                        </div>
                        <span className="text-[11px] text-purple-600 font-bold mt-1 inline-flex items-center gap-1">
                            <Smartphone size={12} /> {data?.devices?.mobile || 0} visite da Smartphone
                        </span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-black">
                        <Smartphone size={24} />
                    </div>
                </div>
            </div>

            {/* Daily Access Flow Chart */}
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100 pb-4">
                    <div>
                        <h2 className="text-lg md:text-xl font-black text-gray-900 flex items-center gap-2">
                            <TrendingUp className="text-emerald-600" /> Andamento Accessi e Flussi Giornalieri
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">Grafico a barre delle visite totali e dei visitatori unici giorno per giorno</p>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-bold">
                        <span className="flex items-center gap-1.5 text-emerald-700">
                            <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block"></span> Visite Totali
                        </span>
                        <span className="flex items-center gap-1.5 text-blue-700">
                            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span> Visitatori Unici
                        </span>
                    </div>
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center text-gray-400 text-sm font-bold">
                        Caricamento grafico flussi...
                    </div>
                ) : !data?.trendData || data.trendData.length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-gray-400 text-sm font-bold">
                        Nessun dato di accesso registrato in questo periodo.
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="h-64 flex items-end justify-between gap-2 md:gap-4 pt-8 px-2 border-b border-gray-200 overflow-x-auto">
                            {data.trendData.map((day, idx) => {
                                const heightPercent = Math.max(Math.round((day.visits / maxVisitsInTrend) * 100), 8);
                                const uniqueHeightPercent = Math.max(Math.round((day.uniqueVisitors / maxVisitsInTrend) * 100), 5);
                                const dateFormatted = new Date(day.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });

                                return (
                                    <div key={idx} className="flex-1 min-w-[36px] flex flex-col items-center gap-2 group relative">
                                        {/* Hover Tooltip */}
                                        <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] font-black py-1 px-2.5 rounded-xl shadow-lg whitespace-nowrap z-20 pointer-events-none">
                                            {day.date} • {day.visits} visite ({day.uniqueVisitors} unici)
                                        </div>

                                        {/* Bar Group */}
                                        <div className="w-full flex items-end justify-center gap-1 h-48">
                                            {/* Total Visits Bar */}
                                            <div
                                                style={{ height: `${heightPercent}%` }}
                                                className="w-1/2 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg transition-all group-hover:brightness-110 shadow-sm"
                                            />
                                            {/* Unique Visitors Bar */}
                                            <div
                                                style={{ height: `${uniqueHeightPercent}%` }}
                                                className="w-1/2 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all group-hover:brightness-110 shadow-sm opacity-90"
                                            />
                                        </div>

                                        {/* Date label */}
                                        <span className="text-[10px] font-bold text-gray-500 group-hover:text-gray-900 transition-colors">
                                            {dateFormatted}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Grid: Top Products Leaderboard & Top Pages / Devices */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                {/* Top Visited Products (2 Columns) */}
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-5">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                        <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                            <Sparkles className="text-amber-500" /> Prodotti Più Consultati (Leaderboard)
                        </h2>
                        <span className="text-xs text-gray-400 font-bold">Top 10 Articoli</span>
                    </div>

                    {loading ? (
                        <div className="py-8 text-center text-gray-400 text-sm font-bold">Caricamento prodotti più visti...</div>
                    ) : !data?.topProducts || data.topProducts.length === 0 ? (
                        <div className="py-8 text-center text-gray-400 text-sm font-bold">Nessun prodotto visitato nel periodo.</div>
                    ) : (
                        <div className="space-y-3">
                            {data.topProducts.map((prod, idx) => (
                                <div
                                    key={prod.productId}
                                    className="flex items-center gap-4 p-3.5 rounded-2xl bg-gray-50/70 border border-gray-100 hover:border-emerald-200 transition-all"
                                >
                                    {/* Rank Badge */}
                                    <div className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                                        idx === 0 ? 'bg-amber-400 text-amber-950 shadow-sm' :
                                        idx === 1 ? 'bg-gray-300 text-gray-900' :
                                        idx === 2 ? 'bg-amber-700 text-white' : 'bg-white text-gray-500 border border-gray-200'
                                    }`}>
                                        #{idx + 1}
                                    </div>

                                    {/* Thumbnail */}
                                    <div className="w-12 h-12 rounded-xl bg-white overflow-hidden shrink-0 border border-gray-100 flex items-center justify-center">
                                        {prod.imageUrl ? (
                                            <img src={sanitizeImageUrl(prod.imageUrl)} alt={prod.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <ShoppingBag size={18} className="text-gray-300" />
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-black text-gray-900 text-sm truncate">{prod.name}</h4>
                                        <p className="text-xs text-emerald-700 font-bold">
                                            € {(prod.priceCents / 100).toFixed(2)} / {prod.unitType === 'PZ' ? 'pezzo' : prod.unitType}
                                        </p>
                                    </div>

                                    {/* Visit Count Badge */}
                                    <div className="text-right shrink-0">
                                        <span className="px-3 py-1.5 rounded-xl bg-emerald-100/80 text-emerald-900 font-black text-xs flex items-center gap-1">
                                            <Eye size={13} /> {prod.visits} visite
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Top Visited Pages & Device Breakdown (1 Column) */}
                <div className="space-y-6">
                    {/* Device Breakdown Card */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
                        <h3 className="font-black text-base text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                            <Smartphone size={18} className="text-purple-600" /> Dispositivi di Navigazione
                        </h3>

                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                                    <span className="flex items-center gap-1.5"><Smartphone size={14} /> Smartphone / Tablet</span>
                                    <span>{data?.devices?.mobilePercent || 0}% ({data?.devices?.mobile || 0})</span>
                                </div>
                                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        style={{ width: `${data?.devices?.mobilePercent || 0}%` }}
                                        className="h-full bg-purple-600 rounded-full transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                                    <span className="flex items-center gap-1.5"><Monitor size={14} /> Desktop / Computer</span>
                                    <span>{data?.devices?.desktopPercent || 0}% ({data?.devices?.desktop || 0})</span>
                                </div>
                                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        style={{ width: `${data?.devices?.desktopPercent || 0}%` }}
                                        className="h-full bg-emerald-600 rounded-full transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Top Visited Pages Card */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
                        <h3 className="font-black text-base text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                            <ArrowUpRight size={18} className="text-emerald-600" /> Pagine Più Cliccate
                        </h3>

                        {loading ? (
                            <div className="text-center text-xs text-gray-400 font-bold py-4">Caricamento pagine...</div>
                        ) : !data?.topPages || data.topPages.length === 0 ? (
                            <div className="text-center text-xs text-gray-400 font-bold py-4">Nessuna pagina registrata.</div>
                        ) : (
                            <div className="space-y-2.5">
                                {data.topPages.map((page, i) => (
                                    <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 text-xs font-bold">
                                        <span className="text-gray-800 font-mono truncate max-w-[180px]" title={page.path}>
                                            {page.path === '/' ? '🏠 Homepage (/)' : page.path}
                                        </span>
                                        <span className="text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md font-black">
                                            {page.visits}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
