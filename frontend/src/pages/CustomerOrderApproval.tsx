import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, Scale, ShieldCheck, XCircle, MessageCircle, Phone } from 'lucide-react';

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
            } else {
                const errJson = await res.json();
                alert(errJson.error || 'Errore durante la conferma.');
            }
        } catch (err) {
            console.error(err);
            alert('Errore di connessione.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 flex flex-col items-center max-w-sm w-full text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="font-black text-gray-800 text-sm">Caricamento riepilogo pesatura...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-red-100 flex flex-col items-center max-w-md w-full text-center space-y-4">
                    <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
                        <AlertTriangle size={32} />
                    </div>
                    <h2 className="text-xl font-black text-gray-900">Link Non Valido o Scaduto</h2>
                    <p className="text-xs font-bold text-gray-500">{error || 'Impossibile visualizzare i dettagli di approvazione per questo ordine.'}</p>
                </div>
            </div>
        );
    }

    const { order, diffPercent, tolerancePercent, storeInfo } = data;
    const isIncreased = diffPercent > 0;
    const isApproved = approvedStatus === 'CUSTOMER_APPROVED';
    const isRejected = approvedStatus === 'CUSTOMER_REJECTED';

    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-gray-900 to-gray-950 text-gray-900 p-4 sm:p-6 flex flex-col items-center justify-center">
            <div className="max-w-xl w-full bg-white rounded-3xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 animate-in fade-in duration-300">
                {/* Store Header */}
                <div className="bg-gradient-to-r from-emerald-900 via-emerald-950 to-gray-900 p-6 sm:p-8 text-white relative">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-2xl">
                                🍏
                            </div>
                            <div>
                                <h1 className="font-black text-xl leading-tight">{storeInfo.siteName}</h1>
                                <p className="text-xs font-bold text-emerald-300">Conferma Pesatura Ordine #{order.id}</p>
                            </div>
                        </div>
                    </div>

                    {/* Customer Greeting */}
                    <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300/80 block">Cliente</span>
                            <span className="font-extrabold text-sm">{order.customerName}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300/80 block">Data Ordine</span>
                            <span className="font-extrabold text-sm">{new Date(order.createdAt).toLocaleDateString('it-IT')}</span>
                        </div>
                    </div>
                </div>

                {/* Main Body */}
                <div className="p-6 sm:p-8 space-y-6">
                    {/* Status Alert Badge */}
                    {isApproved ? (
                        <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-3xl text-emerald-950 flex items-center gap-4 animate-in zoom-in-95">
                            <CheckCircle2 size={36} className="text-emerald-600 shrink-0" />
                            <div>
                                <h3 className="font-black text-base">Pesatura Approvata!</h3>
                                <p className="text-xs font-bold text-emerald-800 mt-0.5">Hai confermato con successo l'ordine #{order.id}. Il negozio procederà con la consegna.</p>
                            </div>
                        </div>
                    ) : isRejected ? (
                        <div className="bg-red-50 border border-red-200 p-5 rounded-3xl text-red-950 flex items-center gap-4 animate-in zoom-in-95">
                            <XCircle size={36} className="text-red-600 shrink-0" />
                            <div>
                                <h3 className="font-black text-base">Variazione Contestata</h3>
                                <p className="text-xs font-bold text-red-800 mt-0.5">Hai segnalato la variazione di prezzo. Puoi contattare il negozio direttamente per informazioni.</p>
                            </div>
                        </div>
                    ) : (
                        /* Variation Highlight Card */
                        <div className={`p-5 rounded-3xl border flex items-center justify-between gap-4 shadow-sm ${
                            isIncreased ? 'bg-amber-50/90 border-amber-200 text-amber-950' : 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                        }`}>
                            <div className="flex items-center gap-3.5">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${
                                    isIncreased ? 'bg-amber-200/80 text-amber-900' : 'bg-emerald-200/80 text-emerald-900'
                                }`}>
                                    <Scale size={24} />
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider block opacity-75">Variazione Totale Pesatura</span>
                                    <span className="font-black text-lg sm:text-xl leading-none block mt-0.5">
                                        {isIncreased ? `+${diffPercent}% rispetto alla stima` : `${diffPercent}% rispetto alla stima`}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <span className="text-[10px] font-black uppercase tracking-wider block opacity-75">Soglia Tolleranza</span>
                                <span className="font-black text-xs px-2.5 py-1 rounded-full bg-white/80 border border-current inline-block mt-0.5">
                                    ±{tolerancePercent}%
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Order Summary Totals */}
                    <div className="bg-gray-50 p-5 rounded-3xl border border-gray-200/90 flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Stima Iniziale</span>
                            <span className="font-black text-base text-gray-400 line-through">€ {((order.estimatedTotal || 0) / 100).toFixed(2)}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">Totale Finale Pesato</span>
                            <span className="font-black text-2xl text-emerald-950">€ {((order.finalTotal || order.estimatedTotal) / 100).toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Product List Comparison */}
                    <div className="space-y-3">
                        <h3 className="font-black text-xs text-gray-500 uppercase tracking-wider">Dettaglio Articoli Pesati</h3>
                        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                            {order.items.map((item: any) => {
                                const isPiece = item.orderedUnit === 'PZ' || item.product.unitType === 'PZ';
                                const estQty = Number(item.quantityOrdered);
                                const actualQty = item.quantityFulfilled !== null ? Number(item.quantityFulfilled) : estQty;
                                const itemCost = ((item.priceAtPurchase || item.product.priceCents) * actualQty) / 100;

                                return (
                                    <div key={item.id} className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200/80 flex items-center justify-between gap-3 text-xs">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden text-lg">
                                                {item.product.imageUrl ? (
                                                    <img src={item.product.imageUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    '🍏'
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-black text-gray-900 truncate">{item.product.name}</p>
                                                <p className="text-gray-500 font-bold text-[11px]">
                                                    Richiesto: {estQty} {isPiece ? 'pz' : 'kg'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <span className="font-black text-gray-900 block text-xs">
                                                {actualQty} {isPiece ? 'pz' : 'kg'}
                                            </span>
                                            <span className="font-black text-emerald-700 block text-[11px]">
                                                € {itemCost.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Main Action Buttons */}
                    {!isApproved && !isRejected && (
                        <div className="pt-2 space-y-2.5">
                            {order.paymentMethod === 'REVOLUT' ? (
                                <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={() => handleAction('ACCEPT')}
                                    className="w-full py-4 bg-indigo-900 hover:bg-indigo-950 active:scale-98 disabled:opacity-50 text-white font-black text-base rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-indigo-900/30"
                                >
                                    <CheckCircle2 size={20} className="text-amber-400" /> 💳 Paga Online con Carta ed Approva (€ {((order.finalTotal || order.estimatedTotal) / 100).toFixed(2)})
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={() => handleAction('ACCEPT')}
                                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 disabled:opacity-50 text-white font-black text-base rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-emerald-600/30"
                                >
                                    <CheckCircle2 size={20} /> Conferma & Accetta Pesatura
                                </button>
                            )}
                        </div>
                    )}

                    {/* Quick Contact Buttons (Phone Call + WhatsApp Chat) */}
                    <div className="pt-2 space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block text-center">Hai domande o vuoi modificare l'ordine?</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {storeInfo.contactPhone && (
                                <a
                                    href={`tel:${storeInfo.contactPhone.replace(/\s+/g, '')}`}
                                    className="py-3 px-4 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-900 font-black text-xs rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-gray-200/80 shadow-xs"
                                >
                                    <Phone size={16} className="text-emerald-700" /> Chiama Negozio
                                </a>
                            )}
                            {storeInfo.contactPhone && (
                                <a
                                    href={`https://wa.me/${storeInfo.contactPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Ciao, vorrei informazioni in merito all'ordine #${order.id}`)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={() => {
                                        if (!isApproved && !isRejected) {
                                            handleAction('REJECT');
                                        }
                                    }}
                                    className="py-3 px-4 bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-950 font-black text-xs rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-200 shadow-xs"
                                >
                                    <MessageCircle size={16} className="text-emerald-600" /> Scrivi su WhatsApp
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Customer Support Footer */}
                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-[11px] font-extrabold text-gray-400">
                        <span className="flex items-center gap-1"><ShieldCheck size={14} /> Transazione Sicura</span>
                        <span>{storeInfo.contactPhone || storeInfo.contactEmail}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
