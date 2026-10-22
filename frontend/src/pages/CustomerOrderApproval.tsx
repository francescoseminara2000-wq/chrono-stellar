import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { 
    CheckCircle2, 
    AlertTriangle, 
    Scale, 
    ShieldCheck, 
    XCircle, 
    MessageCircle, 
    Phone, 
    MapPin, 
    CreditCard, 
    Truck, 
    Store as StoreIcon, 
    Calendar,
    Sparkles,
    ChevronDown,
    ShoppingBag
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

export const CustomerOrderApproval: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [data, setData] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);
    const [approvedStatus, setApprovedStatus] = useState<string | null>(null);
    const [showAllItems, setShowAllItems] = useState(false);

    useEffect(() => {
        const fetchApprovalData = async () => {
            try {
                const res = await fetch(`${API_URL}/api/public/orders/${id}/approval?token=${encodeURIComponent(token)}`);
                if (!res.ok) {
                    const errJson = await res.json();
                    throw new Error(errJson.error || 'Impossibile caricare i dettagli dell\'ordine');
                }
                const result = await res.json();
                setData(result);
                if (result.order.approvalStatus) {
                    setApprovedStatus(result.order.approvalStatus);
                }
            } catch (err: any) {
                console.error(err);
                setError(err.message || 'Errore di connessione');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchApprovalData();
        }
    }, [id, token]);

    const handleAction = async (action: 'ACCEPT' | 'REJECT') => {
        setSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/api/public/orders/${id}/approval`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, token })
            });

            if (res.ok) {
                const json = await res.json();
                setApprovedStatus(json.approvalStatus);
                // Scroll smoothly to top to show confirmation
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                const errJson = await res.json();
                alert(errJson.error || 'Errore durante la conferma.');
            }
        } catch (err) {
            console.error(err);
            alert('Errore di connessione al server.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-emerald-50/50 to-slate-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-emerald-100 flex flex-col items-center max-w-sm w-full text-center space-y-4 animate-in fade-in zoom-in-95">
                    <div className="w-14 h-14 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                    <div>
                        <h3 className="font-black text-gray-900 text-base">Ortofrutta Butti</h3>
                        <p className="font-bold text-gray-500 text-xs mt-1">Caricamento scontrino e pesatura...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-red-100 flex flex-col items-center max-w-md w-full text-center space-y-4">
                    <div className="w-16 h-16 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center shadow-inner">
                        <AlertTriangle size={36} />
                    </div>
                    <h2 className="text-xl font-black text-gray-900">Link Non Valido o Scaduto</h2>
                    <p className="text-xs font-bold text-gray-500 leading-relaxed">
                        {error || 'Impossibile visualizzare i dettagli di approvazione per questo ordine. Ti invitiamo a contattare il negozio per verificare.'}
                    </p>
                    <a
                        href="/"
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                    >
                        Vai al Sito
                    </a>
                </div>
            </div>
        );
    }

    const { order, diffPercent, tolerancePercent, storeInfo } = data;
    const isApproved = approvedStatus === 'CUSTOMER_APPROVED';
    const isRejected = approvedStatus === 'CUSTOMER_REJECTED';
    const isWithinTolerance = Math.abs(diffPercent) <= tolerancePercent;
    const isAutoApproved = approvedStatus === 'AUTO_APPROVED' || (isWithinTolerance && approvedStatus !== 'AWAITING_CUSTOMER_APPROVAL');
    const requiresCustomerAction = approvedStatus === 'AWAITING_CUSTOMER_APPROVAL' && !isApproved && !isRejected;

    const estTotalEur = (order.estimatedTotal || 0) / 100;
    const finalTotalEur = (order.finalTotal || order.estimatedTotal || 0) / 100;
    const diffAmountEur = finalTotalEur - estTotalEur;
    const isIncreased = diffAmountEur > 0.01;
    const isDecreased = diffAmountEur < -0.01;

    // Filter weighed items
    const items = order.items || [];
    const variableItems = items.filter((it: any) => it.product?.isVariableWeight);
    const displayedItems = showAllItems ? items : items.slice(0, 4);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-emerald-50/25 to-slate-50 text-gray-900 flex flex-col justify-between selection:bg-emerald-200">
            {/* Top Store Header */}
            <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200/80 text-gray-900 px-4 py-3 sm:py-4 shadow-xs">
                <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        {storeInfo.logoUrl ? (
                            <img 
                                src={storeInfo.logoUrl} 
                                alt={storeInfo.siteName} 
                                className="h-9 sm:h-10 w-auto object-contain rounded-xl bg-gray-50 p-1 border border-gray-100"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center text-xl shrink-0 shadow-xs">
                                🍏
                            </div>
                        )}
                        <div className="min-w-0">
                            <h1 className="font-black text-sm sm:text-base leading-tight truncate text-gray-900">
                                {storeInfo.siteName || 'Ortofrutta Butti'}
                            </h1>
                            <p className="text-[10px] sm:text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                                <ShieldCheck size={12} className="text-emerald-600 shrink-0" /> Negozio Verificato
                            </p>
                        </div>
                    </div>

                    <div className="text-right shrink-0">
                        <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block">Ordine</span>
                        <span className="font-black text-xs sm:text-sm text-emerald-950 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                            #{order.id}
                        </span>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 max-w-xl w-full mx-auto p-3 sm:p-5 pb-32 sm:pb-36 space-y-4 sm:space-y-5 animate-in fade-in duration-300">
                {/* 1. Status Alert Hero Banner */}
                {isApproved ? (
                    <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 sm:p-6 rounded-3xl shadow-lg border border-emerald-500/30 space-y-2 animate-in zoom-in-95">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0">
                                <CheckCircle2 size={28} className="text-white" />
                            </div>
                            <div>
                                <h2 className="font-black text-lg sm:text-xl leading-tight">Pesatura Approvata!</h2>
                                <p className="text-xs font-semibold text-emerald-100">Hai confermato con successo l'ordine #{order.id}</p>
                            </div>
                        </div>
                        <p className="text-xs text-emerald-50/90 leading-relaxed pt-1">
                            Grazie per la conferma! Il nostro staff sta impacchettando i tuoi prodotti freschi e procederà con la spedizione/ritiro.
                        </p>
                    </div>
                ) : isRejected ? (
                    <div className="bg-gradient-to-br from-rose-500 to-rose-600 text-white p-5 sm:p-6 rounded-3xl shadow-lg border border-rose-400/30 space-y-2 animate-in zoom-in-95">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0">
                                <XCircle size={28} className="text-white" />
                            </div>
                            <div>
                                <h2 className="font-black text-lg sm:text-xl leading-tight">Ordine Annullato</h2>
                                <p className="text-xs font-semibold text-rose-100">Pesatura rifiutata e fondi sbloccati</p>
                            </div>
                        </div>
                        <p className="text-xs text-rose-50/90 leading-relaxed pt-1">
                            Come da te confermato, l'ordine #{order.id} è stato annullato. L'importo pre-autorizzato o bloccato sulla tua carta è stato sbloccato senza alcun addebito.
                        </p>
                    </div>
                ) : requiresCustomerAction ? (
                    <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white p-5 sm:p-6 rounded-3xl shadow-xl border border-amber-400/30 space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0">
                                <Scale size={28} className="text-white animate-pulse" />
                            </div>
                            <div>
                                <div className="inline-block px-2 py-0.5 bg-black/20 rounded-md text-[10px] font-black uppercase tracking-wider mb-0.5">
                                    Azione Richiesta
                                </div>
                                <h2 className="font-black text-lg sm:text-xl leading-tight">Conferma Pesatura al Banco</h2>
                            </div>
                        </div>
                        <p className="text-xs text-amber-50 leading-relaxed pt-1">
                            I prodotti freschi dell'ordine sono stati pesati singolarmente. Controlla il dettaglio qui sotto e tocca il pulsante in basso per confermare.
                        </p>
                    </div>
                ) : isAutoApproved ? (
                    <div className="bg-gradient-to-br from-emerald-700 to-teal-800 text-white p-5 sm:p-6 rounded-3xl shadow-xl border border-emerald-500/30 space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0">
                                <Sparkles size={28} className="text-white" />
                            </div>
                            <div>
                                <h2 className="font-black text-lg sm:text-xl leading-tight">Pesatura Conforme</h2>
                                <p className="text-xs font-semibold text-emerald-100">Variazione entro la soglia (±{tolerancePercent}%)</p>
                            </div>
                        </div>
                        <p className="text-xs text-emerald-50/90 leading-relaxed pt-1">
                            Il peso effettivo è allineato alla stima. L'ordine è già confermato ed in preparazione.
                        </p>
                    </div>
                ) : null}

                {/* 2. Before / After Totals Card */}
                <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xl border border-gray-100 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                        <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">Riepilogo Totale</span>
                        <span className="text-xs font-bold text-gray-500">
                            Cliente: <span className="font-black text-gray-800">{order.customerName || 'Cliente'}</span>
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 items-center">
                        {/* Stima Iniziale */}
                        <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 text-left">
                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-0.5">Stima Iniziale</span>
                            <span className="text-base sm:text-lg font-black text-gray-400 line-through">
                                € {estTotalEur.toFixed(2)}
                            </span>
                            <span className="text-[10px] font-bold text-gray-400 block mt-0.5">Al momento dell'ordine</span>
                        </div>

                        {/* Totale Finale Pesato */}
                        <div className="p-3.5 bg-emerald-50/90 rounded-2xl border border-emerald-200 text-left relative overflow-hidden">
                            <div className="absolute top-1 right-2 text-emerald-300 opacity-20 pointer-events-none">
                                <Scale size={42} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block mb-0.5">Totale Finale Pesato</span>
                            <span className="text-xl sm:text-2xl font-black text-emerald-950">
                                € {finalTotalEur.toFixed(2)}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700 block mt-0.5">
                                {isIncreased ? `+€ ${diffAmountEur.toFixed(2)} (+${diffPercent}%)` : 
                                 isDecreased ? `-€ ${Math.abs(diffAmountEur).toFixed(2)} (${diffPercent}%)` : 'Prezzo Invariato'}
                            </span>
                        </div>
                    </div>

                    {/* Tolerance pill */}
                    <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 pt-1">
                        <span className="flex items-center gap-1.5">
                            <Scale size={14} className="text-emerald-600" /> Tolleranza banco: ±{tolerancePercent}%
                        </span>
                        <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            {variableItems.length} {variableItems.length === 1 ? 'articolo a peso' : 'articoli a peso'}
                        </span>
                    </div>

                    {/* Pre-auth & Guarantee info */}
                    {requiresCustomerAction && (
                        <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-3 text-[11px] text-amber-900 space-y-1">
                            <div className="flex items-center gap-1.5 font-black text-amber-950">
                                <ShieldCheck size={14} className="text-amber-600" />
                                <span>Trasparenza e Garanzia Pagamento</span>
                            </div>
                            <p className="text-[11px] text-amber-800/90 leading-relaxed">
                                Se <strong>approvi</strong>, verrà addebitato l'importo effettivo esatto di <strong>€ {finalTotalEur.toFixed(2)}</strong> e l'eventuale eccedenza autorizzata verrà rilasciata automaticamente.<br />
                                Se <strong>rifiuti</strong>, l'ordine verrà annullato e l'intero importo bloccato sulla carta verrà sbloccato all'istante a costo zero.
                            </p>
                        </div>
                    )}
                </div>

                {/* 3. Delivery / Pickup Context Card */}
                <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xl border border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="flex items-start gap-3 p-3 bg-gray-50/80 rounded-2xl">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                            {order.deliveryMethod === 'PICKUP' ? <StoreIcon size={18} /> : <Truck size={18} />}
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">Modalità</span>
                            <p className="font-black text-gray-800 text-xs">
                                {order.deliveryMethod === 'PICKUP' ? 'Ritiro in Negozio' : 'Consegna a Domicilio'}
                            </p>
                            {order.shippingAddress && order.deliveryMethod !== 'PICKUP' && (
                                <p className="text-[11px] font-semibold text-gray-500 truncate mt-0.5 flex items-center gap-1">
                                    <MapPin size={11} className="shrink-0 text-emerald-600" /> {order.shippingAddress}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-gray-50/80 rounded-2xl">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                            <CreditCard size={18} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">Pagamento</span>
                            <p className="font-black text-gray-800 text-xs">
                                {order.paymentMethod === 'REVOLUT' ? 'Carta / Revolut Pay' :
                                 order.paymentMethod === 'CARD' ? 'Carta di Credito / Bancomat' :
                                 order.paymentMethod === 'WALLET' ? 'Saldo Borsellino' : 'Contanti alla Consegna / Ritiro'}
                            </p>
                            {(order.scheduledDate || order.scheduledTime) && (
                                <p className="text-[11px] font-semibold text-gray-500 truncate mt-0.5 flex items-center gap-1">
                                    <Calendar size={11} className="shrink-0 text-blue-600" /> {order.scheduledDate} {order.scheduledTime}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* 4. Products List Breakdown */}
                <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xl border border-gray-100 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-black text-xs sm:text-sm text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                            <ShoppingBag size={16} className="text-emerald-600" /> Dettaglio Prodotti ({items.length})
                        </h3>
                        <span className="text-[11px] font-bold text-gray-400">Pesi Effettivi</span>
                    </div>

                    <div className="space-y-2.5 divide-y divide-gray-100">
                        {displayedItems.map((item: any) => {
                            const isPiece = item.orderedUnit === 'PZ' || item.product?.unitType === 'PZ';
                            const isVar = item.product?.isVariableWeight;
                            const estQty = Number(item.quantityOrdered);
                            const actualQty = item.quantityFulfilled !== null && item.quantityFulfilled !== undefined ? Number(item.quantityFulfilled) : estQty;
                            const unitPriceEur = (item.priceAtPurchase || item.product?.priceCents || 0) / 100;
                            const itemTotalEur = unitPriceEur * actualQty;

                            return (
                                <div key={item.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3 text-xs">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden text-xl shadow-xs">
                                            {item.product?.imageUrl ? (
                                                <img src={item.product.imageUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                '🍏'
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-black text-gray-900 truncate text-xs sm:text-sm">{item.product?.name || item.name}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {isVar ? (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                                        <Scale size={11} /> Pesato: {actualQty} {isPiece ? 'pz' : 'kg'}
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] font-extrabold text-gray-600">
                                                        {actualQty} {isPiece ? 'pz' : 'kg'}
                                                    </span>
                                                )}
                                                {isVar && (
                                                    <span className="text-[10px] font-semibold text-gray-400">
                                                        (Richiesto: {estQty})
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <span className="font-black text-gray-900 block text-xs sm:text-sm">
                                            € {itemTotalEur.toFixed(2)}
                                        </span>
                                        <span className="text-[10px] font-semibold text-gray-400 block">
                                            € {unitPriceEur.toFixed(2)}/{isPiece ? 'pz' : 'kg'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Show more button if > 4 items */}
                    {items.length > 4 && (
                        <button
                            type="button"
                            onClick={() => setShowAllItems(prev => !prev)}
                            className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                            <span>{showAllItems ? 'Mostra Meno' : `Mostra tutti (${items.length} articoli)`}</span>
                            <ChevronDown size={14} className={`transition-transform duration-200 ${showAllItems ? 'rotate-180' : ''}`} />
                        </button>
                    )}
                </div>

                {/* 5. Direct Contact & Help Box */}
                <div className="bg-white rounded-3xl p-5 shadow-xl border border-gray-100 space-y-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block text-center">
                        Desideri modificare l'ordine o hai una domanda?
                    </span>
                    <div className="grid grid-cols-2 gap-2.5">
                        {storeInfo.contactPhone && (
                            <a
                                href={`https://wa.me/${storeInfo.contactPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Ciao, ti contatto in merito alla pesatura dell'ordine #${order.id}.`)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="py-3 px-3 bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-900 font-black text-xs rounded-2xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-emerald-200 shadow-xs"
                            >
                                <MessageCircle size={16} className="text-emerald-600 shrink-0" />
                                <span className="truncate">Chatta su WhatsApp</span>
                            </a>
                        )}
                        {storeInfo.contactPhone && (
                            <a
                                href={`tel:${storeInfo.contactPhone.replace(/\s+/g, '')}`}
                                className="py-3 px-3 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-900 font-black text-xs rounded-2xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-gray-200/80 shadow-xs"
                            >
                                <Phone size={16} className="text-emerald-700 shrink-0" />
                                <span className="truncate">Chiama Negozio</span>
                            </a>
                        )}
                    </div>
                </div>

                {/* Footer Security Badges */}
                <footer className="pt-2 text-center text-[11px] font-bold text-gray-500 space-y-1">
                    <p className="flex items-center justify-center gap-1 text-emerald-700">
                        <ShieldCheck size={13} /> Scontrino e transazione protetti da crittografia SSL
                    </p>
                    <p className="text-gray-400">{storeInfo.siteName} · {storeInfo.contactAddress || 'Freschezza Garantita'}</p>
                </footer>
            </main>

            {/* 6. FIXED THUMB-FRIENDLY BOTTOM ACTION BAR (Smartphones & Mobile Devices) */}
            {requiresCustomerAction && (
                <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 py-3 sm:py-4 shadow-[0_-10px_30px_rgba(0,0,0,0.15)] animate-in slide-in-from-bottom duration-300">
                    <div className="max-w-xl mx-auto space-y-2">
                        <div className="flex items-center justify-between gap-3">
                            <div className="shrink-0">
                                <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block leading-none">Totale Pesato</span>
                                <span className="text-lg sm:text-xl font-black text-emerald-950 leading-tight block">
                                    € {finalTotalEur.toFixed(2)}
                                </span>
                            </div>

                            <div className="flex-1 min-w-0">
                                {order.paymentMethod === 'REVOLUT' ? (
                                    <button
                                        type="button"
                                        disabled={submitting}
                                        onClick={() => handleAction('ACCEPT')}
                                        className="w-full h-11 sm:h-12 bg-emerald-600 hover:bg-emerald-700 active:scale-98 disabled:opacity-50 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-emerald-600/30 truncate"
                                    >
                                        <CheckCircle2 size={18} className="shrink-0" />
                                        <span className="truncate">
                                            {submitting ? 'Elaborazione...' : `Approva Pesatura (€ ${finalTotalEur.toFixed(2)})`}
                                        </span>
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        disabled={submitting}
                                        onClick={() => handleAction('ACCEPT')}
                                        className="w-full h-11 sm:h-12 bg-emerald-600 hover:bg-emerald-700 active:scale-98 disabled:opacity-50 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-emerald-600/30 truncate"
                                    >
                                        <CheckCircle2 size={18} className="shrink-0" />
                                        <span className="truncate">
                                            {submitting ? 'Conferma in corso...' : 'Approva & Conferma Pesatura'}
                                        </span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Rifiuta & Sblocca Fondi */}
                        <div className="flex items-center justify-center pt-1 border-t border-gray-100">
                            <button
                                type="button"
                                disabled={submitting}
                                onClick={() => {
                                    if (window.confirm("Sei sicuro di voler rifiutare la pesatura? L'ordine verrà annullato e l'importo autorizzato sulla tua carta verrà sbloccato immediatamente (senza alcun addebito).")) {
                                        handleAction('REJECT');
                                    }
                                }}
                                className="text-xs font-bold text-rose-600 hover:text-rose-700 active:text-rose-800 py-1 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                                <XCircle size={14} className="shrink-0" />
                                <span>Rifiuta pesatura ed annulla ordine (Sblocca fondi)</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
