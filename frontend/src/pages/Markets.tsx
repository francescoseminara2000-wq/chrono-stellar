import React, { useState, useEffect } from 'react';
import { MapPin, Clock, ExternalLink, ArrowRight, Store, Navigation, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { sanitizeImageUrl } from '../utils/imageUrl';

interface MarketDay {
    id?: number;
    dayNum: number; // 0 = Sunday, 1 = Monday, etc.
    dayName: string;
    location: string;
    details: string;
    hours: string;
    province: string;
    googleMapsUrl?: string;
    imageUrl?: string;
    description: string;
}

export const Markets: React.FC = () => {
    const [markets, setMarkets] = useState<MarketDay[]>([]);
    const [currentDay, setCurrentDay] = useState<number>(1);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const todayNum = new Date().getDay();
        setCurrentDay(todayNum === 0 ? 1 : todayNum);

        // Fetch markets from backend database
        fetch('/api/markets')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setMarkets(data);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to load markets:', err);
                setLoading(false);
            });
    }, []);

    const todayDayNum = new Date().getDay();
    const todayMarket = markets.find(m => m.dayNum === todayDayNum);
    const activeMarket = markets.find(m => m.dayNum === currentDay) || markets[0];

    return (
        <div className="bg-gradient-to-br from-nature-50 via-gray-50 to-emerald-50/30 min-h-screen py-10 px-4">
            <div className="max-w-6xl mx-auto space-y-12">

                {/* Hero Header */}
                <div className="text-center space-y-4 max-w-2xl mx-auto animate-in fade-in duration-500">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-850 rounded-full text-xs font-black uppercase tracking-widest inline-flex items-center gap-1.5 shadow-xs">
                        📍 Mercati Rionali
                    </span>
                    <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight leading-none">
                        Ortofrutta <span className="text-emerald-700">Itinerante</span>
                    </h1>
                    <p className="text-gray-500 text-sm md:text-base font-medium">
                        Oltre al nostro punto vendita principale a Sirone, portiamo la freschezza e la qualità dei nostri prodotti selezionati nei mercati rionali della zona. Scopri dove trovarci giorno per giorno.
                    </p>
                </div>

                {loading ? (
                    <div className="text-center py-16 bg-white rounded-3xl shadow-sm border border-gray-100 max-w-md mx-auto">
                        <div className="w-12 h-12 border-4 border-emerald-250 border-t-emerald-700 rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-500 font-bold text-sm">Caricamento itinerario mercati...</p>
                    </div>
                ) : markets.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-3xl shadow-sm border border-gray-100 max-w-md mx-auto">
                        <p className="text-gray-500 font-bold text-sm">Nessun mercato itinerante configurato.</p>
                    </div>
                ) : (
                    <>
                        {/* Today's Highlight Banner */}
                        <div className="relative overflow-hidden bg-gradient-to-r from-nature-950 via-emerald-950 to-nature-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                            
                            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                                        <span className="text-emerald-300 font-bold uppercase text-[11px] tracking-wider">Oggi dove ci trovi?</span>
                                    </div>

                                    {todayMarket ? (
                                        <div className="space-y-1.5">
                                            <h2 className="text-2xl sm:text-3xl font-black">{todayMarket.location} ({todayMarket.province})</h2>
                                            <p className="text-sm text-emerald-100/90 font-medium flex items-center gap-1.5">
                                                <MapPin size={16} /> {todayMarket.details}
                                            </p>
                                            <p className="text-xs text-emerald-355 font-bold flex items-center gap-1.5">
                                                <Clock size={14} /> Attivo oggi dalle {todayMarket.hours}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5">
                                            <h2 className="text-2xl sm:text-3xl font-black">Sede Centrale di Sirone</h2>
                                            <p className="text-sm text-emerald-100/90 font-medium flex items-center gap-1.5">
                                                <Store size={16} /> Via don Giovanni Minzoni, 9 - Sirone (LC)
                                            </p>
                                            <p className="text-xs text-emerald-355 font-bold">
                                                Nessun mercato attivo oggi. Ti aspettiamo in sede!
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {todayMarket && todayMarket.googleMapsUrl && (
                                    <a
                                        href={todayMarket.googleMapsUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-6 py-3.5 bg-white text-emerald-950 font-black rounded-2xl text-xs sm:text-sm hover:bg-emerald-50 transition-all flex items-center gap-2 shadow-lg self-start md:self-auto cursor-pointer"
                                    >
                                        <Navigation size={16} /> Naviga al mercato
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Main Interactive Roadmap Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            
                            {/* Left Column: Weekly Roadmap Flow */}
                            <div className="lg:col-span-1 space-y-4">
                                <h3 className="text-lg font-black text-gray-900 px-1">🗓️ La Settimana dei Mercati</h3>
                                
                                <div className="space-y-3">
                                    {markets.map((market) => {
                                        const isActive = currentDay === market.dayNum;
                                        const isToday = todayDayNum === market.dayNum;

                                        return (
                                            <div
                                                key={market.dayNum}
                                                className={`w-full rounded-2xl border-2 transition-all flex flex-col bg-white overflow-hidden ${
                                                    isActive
                                                        ? 'border-emerald-600 shadow-md'
                                                        : 'border-transparent shadow-sm hover:border-gray-250/50'
                                                }`}
                                            >
                                                {/* Header Row (Accordion Trigger) */}
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentDay(market.dayNum)}
                                                    className={`w-full text-left p-4 flex items-center justify-between gap-4 cursor-pointer relative ${
                                                        isActive ? 'bg-emerald-50/10' : 'bg-white'
                                                    }`}
                                                >
                                                    {isToday && (
                                                        <div className="absolute top-0 left-0 bottom-0 w-1 bg-emerald-550" />
                                                    )}
                                                    
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-xl font-black text-xs uppercase flex items-center justify-center border shrink-0 ${
                                                            isActive
                                                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                                                : 'bg-gray-50 border-gray-100 text-gray-400'
                                                        }`}>
                                                            {market.dayName.substring(0, 3)}
                                                        </div>
                                                        <div>
                                                            <div className="font-black text-sm text-gray-900 flex items-center gap-1.5">
                                                                <span>{market.location}</span>
                                                                <span className="text-[10px] text-gray-400 font-bold bg-gray-100 px-1.5 py-0.5 rounded-md">{market.province}</span>
                                                            </div>
                                                            <span className="text-xs text-gray-400 font-bold block mt-0.5">{market.dayName}</span>
                                                        </div>
                                                    </div>

                                                    {/* Arrow indicator (desktop) or Chevron indicator (mobile) */}
                                                    <div className="flex items-center gap-1">
                                                        {isToday && (
                                                            <span className="lg:hidden px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[9px] font-black uppercase mr-1">Oggi</span>
                                                        )}
                                                        <ChevronDown
                                                            size={16}
                                                            className={`lg:hidden transition-transform duration-300 ${
                                                                isActive ? 'text-emerald-700 rotate-180' : 'text-gray-400'
                                                            }`}
                                                        />
                                                        <ArrowRight
                                                            size={16}
                                                            className={`hidden lg:block transition-transform duration-300 ${
                                                                isActive ? 'text-emerald-700 translate-x-1' : 'text-gray-400'
                                                            }`}
                                                        />
                                                    </div>
                                                </button>

                                                {/* Mobile Inline Details (Accordion Content) */}
                                                <AnimatePresence initial={false}>
                                                    {isActive && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.25, ease: "easeInOut" }}
                                                            className="lg:hidden border-t border-gray-100 overflow-hidden bg-gray-50/40"
                                                        >
                                                            {market.imageUrl && (
                                                                <div className="w-full h-44 overflow-hidden relative">
                                                                    <img
                                                                        src={sanitizeImageUrl(market.imageUrl)}
                                                                        alt={market.location}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                                                                </div>
                                                            )}
                                                            <div className="p-4 space-y-4">
                                                                <div className="grid grid-cols-1 gap-2.5">
                                                                    <div className="p-3 bg-white rounded-xl border border-gray-150/70 flex items-start gap-2.5">
                                                                        <MapPin className="text-emerald-700 shrink-0 mt-0.5" size={16} />
                                                                        <div>
                                                                            <span className="text-[9px] font-bold text-gray-400 uppercase block">Posizionamento</span>
                                                                            <span className="font-bold text-xs text-gray-900 block mt-0.5 leading-snug">{market.details}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="p-3 bg-white rounded-xl border border-gray-150/70 flex items-start gap-2.5">
                                                                        <Clock className="text-emerald-700 shrink-0 mt-0.5" size={16} />
                                                                        <div>
                                                                            <span className="text-[9px] font-bold text-gray-400 uppercase block">Orari</span>
                                                                            <span className="font-bold text-xs text-gray-900 block mt-0.5">{market.hours}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-1">
                                                                    <span className="font-black text-[9px] uppercase tracking-wider text-gray-400 block">Descrizione</span>
                                                                    <p className="text-xs text-gray-600 leading-relaxed font-medium">
                                                                        {market.description}
                                                                    </p>
                                                                </div>

                                                                {market.googleMapsUrl && (
                                                                    <a
                                                                        href={market.googleMapsUrl}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black rounded-xl text-xs border border-emerald-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                                                    >
                                                                        Apri in Google Maps <ExternalLink size={12} />
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Store HQ Card */}
                                <div className="p-5 rounded-3xl bg-emerald-50/50 border border-emerald-100 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Store className="text-emerald-750" size={20} />
                                        <h4 className="font-black text-sm text-emerald-950">Sede Principale di Sirone</h4>
                                    </div>
                                    <p className="text-xs text-emerald-900/80 leading-relaxed font-bold">
                                        Trovi la nostra esposizione completa dal lunedì al sabato. Frutta fresca biologica, ortaggi di stagione ed eccellenze locali.
                                    </p>
                                    <Link to="/shop" className="text-xs font-black text-emerald-850 flex items-center gap-1 hover:underline">
                                        Scopri il punto vendita online <ArrowRight size={12} />
                                    </Link>
                                </div>
                            </div>

                            {/* Right Column: Detailed Animated Day card (DESKTOP ONLY) */}
                            {activeMarket && (
                                <div className="hidden lg:block lg:col-span-2">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={activeMarket.dayNum}
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -15 }}
                                            transition={{ duration: 0.2 }}
                                            className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col justify-between"
                                        >
                                            {/* Market Image Header */}
                                            {activeMarket.imageUrl && (
                                                <div className="w-full h-56 sm:h-64 overflow-hidden relative">
                                                    <img
                                                        src={sanitizeImageUrl(activeMarket.imageUrl)}
                                                        alt={activeMarket.location}
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                                                    <span className="absolute bottom-4 left-4 bg-white/95 text-emerald-950 px-3 py-1 rounded-xl text-xs font-black shadow">
                                                        📍 Mercato di {activeMarket.location}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="p-6 sm:p-8 space-y-6">
                                                {/* Active Day Title & Location */}
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
                                                    <div>
                                                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-black uppercase tracking-wider block w-fit mb-2">
                                                            Mercato del {activeMarket.dayName}
                                                        </span>
                                                        <h2 className="text-3xl font-black text-gray-900 flex items-center gap-2">
                                                            {activeMarket.location}
                                                            <span className="text-base text-gray-400 font-bold bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100">
                                                                Prov. {activeMarket.province}
                                                            </span>
                                                        </h2>
                                                    </div>

                                                    {todayDayNum === activeMarket.dayNum && (
                                                        <span className="px-3 py-1 bg-emerald-500 text-white rounded-full text-xs font-black flex items-center gap-1.5 self-start sm:self-auto shadow-sm">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                                            Mercato Attivo Oggi
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Detail Cards */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-start gap-3">
                                                        <MapPin className="text-emerald-700 shrink-0 mt-0.5" size={20} />
                                                        <div>
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase block">Posizionamento Banco</span>
                                                            <span className="font-bold text-sm text-gray-900 block mt-0.5 leading-snug">{activeMarket.details}</span>
                                                        </div>
                                                    </div>

                                                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-start gap-3">
                                                        <Clock className="text-emerald-700 shrink-0 mt-0.5" size={20} />
                                                        <div>
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase block">Orari di Esposizione</span>
                                                            <span className="font-bold text-sm text-gray-900 block mt-0.5">{activeMarket.hours}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Description */}
                                                <div className="space-y-2">
                                                    <h4 className="font-black text-xs uppercase tracking-wider text-gray-400">Descrizione del Mercato</h4>
                                                    <p className="text-sm text-gray-600 leading-relaxed font-medium">
                                                        {activeMarket.description}
                                                    </p>
                                                </div>

                                                {/* External Navigation Link */}
                                                {activeMarket.googleMapsUrl && (
                                                    <a
                                                        href={activeMarket.googleMapsUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="w-full sm:w-auto px-6 py-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black rounded-2xl text-xs border border-emerald-200 transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
                                                    >
                                                        Apri in Google Maps <ExternalLink size={14} />
                                                    </a>
                                                )}
                                            </div>
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                            )}

                        </div>
                    </>
                )}

            </div>
        </div>
    );
};
