import React, { useState, useEffect } from 'react';
import { Gift, Plus, Download, Search, CheckCircle2, Clock, Mail } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

const API_URL = import.meta.env.VITE_API_URL || '';

export const GiftCardManager: React.FC = () => {
    const { token } = useAuthStore();
    const [giftCards, setGiftCards] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'REDEEMED'>('ALL');

    // Modal Creazione Manuale
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
    const [createAmount, setCreateAmount] = useState<string>('50');
    const [createRecipientName, setCreateRecipientName] = useState<string>('');
    const [createRecipientEmail, setCreateRecipientEmail] = useState<string>('');
    const [createMessage, setCreateMessage] = useState<string>('Omaggio speciale dall\'amministrazione');
    const [sendEmail, setSendEmail] = useState<boolean>(true);
    const [isCreating, setIsCreating] = useState<boolean>(false);
    const [actionMessage, setActionMessage] = useState<string | null>(null);

    const fetchGiftCards = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/gift-cards`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setGiftCards(data);
            }
        } catch (err) {
            console.error('Failed to fetch admin gift cards:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchGiftCards();
    }, [token]);

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amountCents = Math.round((parseFloat(createAmount) || 0) * 100);
        if (amountCents <= 0) return;

        setIsCreating(true);
        setActionMessage(null);

        try {
            const res = await fetch(`${API_URL}/api/admin/gift-cards`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    amountCents,
                    recipientName: createRecipientName.trim() || 'Cliente Speciale',
                    recipientEmail: createRecipientEmail.trim() || null,
                    customMessage: createMessage.trim() || null,
                    sendEmail
                })
            });

            if (res.ok) {
                setIsCreateModalOpen(false);
                setCreateRecipientName('');
                setCreateRecipientEmail('');
                setActionMessage('Gift Card creata con successo!');
                await fetchGiftCards();
                setTimeout(() => setActionMessage(null), 4000);
            } else {
                const err = await res.json();
                alert(err.error || 'Errore durante la creazione');
            }
        } catch (err: any) {
            alert('Errore di connessione');
        } finally {
            setIsCreating(false);
        }
    };

    const filteredCards = giftCards.filter((card) => {
        const matchesSearch =
            card.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (card.recipientName && card.recipientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (card.buyerName && card.buyerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (card.buyerEmail && card.buyerEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (card.recipientEmail && card.recipientEmail.toLowerCase().includes(searchTerm.toLowerCase()));

        if (!matchesSearch) return false;

        if (filterStatus === 'ACTIVE') return !card.isRedeemed;
        if (filterStatus === 'REDEEMED') return card.isRedeemed;
        return true;
    });

    const totalIssued = giftCards.reduce((acc, c) => acc + c.amount, 0);
    const totalRedeemed = giftCards.filter(c => c.isRedeemed).reduce((acc, c) => acc + c.amount, 0);
    const totalActive = totalIssued - totalRedeemed;

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <Gift className="w-8 h-8 text-emerald-600" />
                        Gestione Gift Card & Buoni
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Monitora tutte le Gift Card emesse, lo stato di riscatto e crea voucher promozionali
                    </p>
                </div>

                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                    <Plus className="w-4 h-4" />
                    Emetti Nuova Gift Card
                </button>
            </div>

            {actionMessage && (
                <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-sm font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>{actionMessage}</span>
                </div>
            )}

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-xs">
                    <span className="text-xs uppercase font-bold text-gray-400 tracking-wider">Totale Emesse</span>
                    <div className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
                        € {(totalIssued / 100).toFixed(2)}
                    </div>
                    <span className="text-xs text-gray-500 mt-1 block">{giftCards.length} voucher generati</span>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-emerald-150 shadow-xs bg-emerald-50/20">
                    <span className="text-xs uppercase font-bold text-emerald-700 tracking-wider">Saldo Attivo Rimanente</span>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">
                        € {(totalActive / 100).toFixed(2)}
                    </div>
                    <span className="text-xs text-emerald-600 mt-1 block">
                        {giftCards.filter(c => !c.isRedeemed).length} carte in attesa di riscatto
                    </span>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-xs">
                    <span className="text-xs uppercase font-bold text-gray-400 tracking-wider">Riscattate nel Saldo</span>
                    <div className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">
                        € {(totalRedeemed / 100).toFixed(2)}
                    </div>
                    <span className="text-xs text-gray-500 mt-1 block">
                        {giftCards.filter(c => c.isRedeemed).length} carte già caricate
                    </span>
                </div>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-xs flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Cerca codice, nome, email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                    {(['ALL', 'ACTIVE', 'REDEEMED'] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                filterStatus === status
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {status === 'ALL' ? 'Tutte' : status === 'ACTIVE' ? 'Attive' : 'Riscattate'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl border border-gray-150 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-black uppercase tracking-wider text-gray-400">
                                <th className="p-4 sm:px-6">Codice Voucher</th>
                                <th className="p-4">Importo</th>
                                <th className="p-4">Destinatario</th>
                                <th className="p-4">Acquirente</th>
                                <th className="p-4">Stato</th>
                                <th className="p-4">Data Emissione</th>
                                <th className="p-4 sm:pr-6 text-right">PDF</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-12 text-gray-400">
                                        Caricamento Gift Card in corso...
                                    </td>
                                </tr>
                            ) : filteredCards.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-12 text-gray-400">
                                        Nessuna Gift Card trovata con questi filtri.
                                    </td>
                                </tr>
                            ) : (
                                filteredCards.map((card) => (
                                    <tr key={card.id} className="hover:bg-gray-50/80 transition-colors">
                                        <td className="p-4 sm:px-6">
                                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                                                {card.code}
                                            </span>
                                        </td>
                                        <td className="p-4 font-black text-base text-gray-900">
                                            € {(card.amount / 100).toFixed(2)}
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-gray-800">{card.recipientName || '—'}</div>
                                            {card.recipientEmail && (
                                                <div className="text-xs text-gray-400 flex items-center gap-1">
                                                    <Mail size={12} /> {card.recipientEmail}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="text-gray-800">{card.buyerName || 'Store'}</div>
                                            {card.buyerEmail && (
                                                <div className="text-xs text-gray-400">{card.buyerEmail}</div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {card.isRedeemed ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                    <CheckCircle2 size={13} /> Riscattata
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                                    <Clock size={13} /> Attiva
                                                </span>
                                            )}
                                            {card.redeemedBy && (
                                                <div className="text-[11px] text-gray-400 mt-0.5">
                                                    da: {card.redeemedBy.name || card.redeemedBy.email}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-xs text-gray-500">
                                            {new Date(card.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                        </td>
                                        <td className="p-4 sm:pr-6 text-right">
                                            <a
                                                href={`${API_URL}/api/gift-cards/${card.code}/pdf`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-xs font-bold border border-slate-200 transition-colors"
                                                title="Scarica Voucher PDF"
                                            >
                                                <Download size={14} /> PDF
                                            </a>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Creazione Manuale */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                            <h3 className="font-black text-xl text-gray-900 flex items-center gap-2">
                                <Gift className="w-5 h-5 text-emerald-600" /> Emetti Nuova Gift Card
                            </h3>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                    Importo (€) *
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    required
                                    value={createAmount}
                                    onChange={(e) => setCreateAmount(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                    Nome Destinatario
                                </label>
                                <input
                                    type="text"
                                    placeholder="Es. Mario Rossi"
                                    value={createRecipientName}
                                    onChange={(e) => setCreateRecipientName(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                    Email Destinatario (Opzionale)
                                </label>
                                <input
                                    type="email"
                                    placeholder="mario@example.com"
                                    value={createRecipientEmail}
                                    onChange={(e) => setCreateRecipientEmail(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                    Messaggio / Dedica
                                </label>
                                <textarea
                                    rows={2}
                                    value={createMessage}
                                    onChange={(e) => setCreateMessage(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            {createRecipientEmail && (
                                <label className="flex items-center gap-2 cursor-pointer pt-1">
                                    <input
                                        type="checkbox"
                                        checked={sendEmail}
                                        onChange={(e) => setSendEmail(e.target.checked)}
                                        className="w-4 h-4 accent-emerald-600 rounded"
                                    />
                                    <span className="text-xs font-medium text-gray-700">
                                        Invia subito via email al destinatario con il PDF allegato
                                    </span>
                                </label>
                            )}

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50"
                                >
                                    Annulla
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md"
                                >
                                    {isCreating ? 'Creazione...' : 'Crea Voucher'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
