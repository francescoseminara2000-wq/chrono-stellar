import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Download, Mail, CheckCircle2, Copy, Sparkles, Send, ShieldCheck, Heart } from 'lucide-react';
import { useAppState } from '../store/useAppState';
import { useAuthStore } from '../store/useAuthStore';

const API_URL = import.meta.env.VITE_API_URL || '';

export const GiftCards: React.FC = () => {
    const { settings } = useAppState();
    const { user, token } = useAuthStore();

    const PRESET_AMOUNTS = [25, 50, 75, 100];

    const [selectedAmount, setSelectedAmount] = useState<number>(50);
    const [customAmount, setCustomAmount] = useState<string>('');
    const [isCustom, setIsCustom] = useState<boolean>(false);

    const [sendMode, setSendMode] = useState<'download' | 'email'>('download');
    const [buyerName, setBuyerName] = useState<string>(user?.name || '');
    const [buyerEmail, setBuyerEmail] = useState<string>(user?.email || '');
    const [recipientName, setRecipientName] = useState<string>('');
    const [recipientEmail, setRecipientEmail] = useState<string>('');
    const [recipientPhone, setRecipientPhone] = useState<string>('');
    const [customMessage, setCustomMessage] = useState<string>('Un piccolo pensiero per gustare il meglio dei prodotti freschi e genuini!');

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [purchasedCard, setPurchasedCard] = useState<any | null>(null);
    const [copied, setCopied] = useState<boolean>(false);

    const effectiveAmount = isCustom ? (parseFloat(customAmount) || 0) : selectedAmount;
    const siteName = settings?.siteName || 'Ortofrutta Butti';
    const primaryColor = settings?.primaryColor || '#16a34a';

    const handleSelectAmount = (amount: number) => {
        setIsCustom(false);
        setSelectedAmount(amount);
    };

    const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIsCustom(true);
        setCustomAmount(e.target.value);
    };

    const handleBuy = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (effectiveAmount < 5) {
            setError('L\'importo minimo per una Gift Card è di 5,00 €');
            return;
        }

        if (!buyerName.trim() || !buyerEmail.trim()) {
            setError('Inserisci il tuo nome e la tua email per la ricevuta.');
            return;
        }

        if (sendMode === 'email' && !recipientEmail.trim()) {
            setError('Inserisci l\'indirizzo email del destinatario per procedere con l\'invio.');
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch(`${API_URL}/api/gift-cards/buy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    amountCents: Math.round(effectiveAmount * 100),
                    buyerName: buyerName.trim(),
                    buyerEmail: buyerEmail.trim(),
                    recipientName: recipientName.trim() || 'Un caro amico',
                    recipientEmail: sendMode === 'email' ? recipientEmail.trim() : null,
                    recipientPhone: recipientPhone.trim() || null,
                    customMessage: customMessage.trim() || null
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Errore durante la creazione della Gift Card.');
            }

            setPurchasedCard(data.giftCard);
        } catch (err: any) {
            setError(err.message || 'Si è verificato un errore.');
        } finally {
            setIsLoading(false);
        }
    };

    const copyRedeemLink = (code: string) => {
        const url = `${window.location.origin}/profile?redeem=${encodeURIComponent(code)}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                {/* Header Section */}
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-3">
                        <Sparkles className="w-3.5 h-3.5" /> Il Regalo Perfetto
                    </span>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                        Regala la Freschezza con la nostra Gift Card
                    </h1>
                    <p className="mt-3 text-base sm:text-lg text-slate-600">
                        Scegli l'importo, scrivi una dedica e scarica subito il PDF pronto da stampare o inviare via email al destinatario. 
                        Chi la riceve potrà caricarla direttamente nel proprio saldo account per acquistare quando vuole!
                    </p>
                </div>

                <AnimatePresence mode="wait">
                    {purchasedCard ? (
                        /* Success View */
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-emerald-100 max-w-2xl mx-auto text-center"
                        >
                            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>

                            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                                Gift Card Pronta!
                            </h2>
                            <p className="text-slate-600 mb-6">
                                Il buono regalo da <strong className="text-slate-900">€ {(purchasedCard.amount / 100).toFixed(2)}</strong> è stato generato con successo.
                            </p>

                            {/* Codice Box */}
                            <div className="bg-slate-50 border-2 border-dashed border-emerald-500 rounded-2xl p-6 mb-8">
                                <p className="text-xs uppercase font-bold tracking-wider text-slate-500 mb-2">
                                    Codice Gift Card
                                </p>
                                <p className="font-mono text-3xl font-extrabold text-slate-900 tracking-widest select-all mb-4">
                                    {purchasedCard.code}
                                </p>
                                <div className="flex flex-wrap gap-3 justify-center">
                                    <button
                                        type="button"
                                        onClick={() => copyRedeemLink(purchasedCard.code)}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                                    >
                                        <Copy className="w-4 h-4 text-emerald-600" />
                                        {copied ? 'Link Copiato!' : 'Copia Link per Riscatto'}
                                    </button>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <a
                                    href={`${API_URL}/api/gift-cards/${purchasedCard.code}/pdf`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/30 transition-all text-base"
                                >
                                    <Download className="w-5 h-5" />
                                    Scarica Buono in PDF
                                </a>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPurchasedCard(null);
                                        setRecipientName('');
                                        setRecipientEmail('');
                                    }}
                                    className="px-6 py-3.5 rounded-xl font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors text-base"
                                >
                                    Acquista un'altra Card
                                </button>
                            </div>

                            {sendMode === 'email' && purchasedCard.recipientEmail && (
                                <p className="text-xs text-slate-500 mt-6 flex items-center justify-center gap-1.5">
                                    <Mail className="w-4 h-4 text-emerald-600" />
                                    Una copia con il PDF è stata spedita a: <strong>{purchasedCard.recipientEmail}</strong>
                                </p>
                            )}
                        </motion.div>
                    ) : (
                        /* Main Grid: Form + Live Card Preview */
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                            {/* Left Column: Form */}
                            <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
                                <form onSubmit={handleBuy} className="space-y-6">
                                    {/* Scegli Taglio */}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-800 mb-3">
                                            1. Scegli il valore del regalo
                                        </label>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                                            {PRESET_AMOUNTS.map((amount) => (
                                                <button
                                                    key={amount}
                                                    type="button"
                                                    onClick={() => handleSelectAmount(amount)}
                                                    className={`py-3 px-4 rounded-xl font-bold text-lg border transition-all ${
                                                        !isCustom && selectedAmount === amount
                                                            ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm ring-2 ring-emerald-600/20'
                                                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    € {amount}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold">
                                                €
                                            </span>
                                            <input
                                                type="number"
                                                min="5"
                                                max="1000"
                                                step="1"
                                                placeholder="Oppure inserisci un altro importo (min. € 5)"
                                                value={customAmount}
                                                onChange={handleCustomChange}
                                                className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border font-medium transition-all ${
                                                    isCustom
                                                        ? 'border-emerald-600 ring-2 ring-emerald-600/20 text-slate-900'
                                                        : 'border-slate-200 text-slate-600'
                                                }`}
                                            />
                                        </div>
                                    </div>

                                    {/* Modalità di Consegna */}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-800 mb-3">
                                            2. Come vuoi consegnare il buono?
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setSendMode('download')}
                                                className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                                                    sendMode === 'download'
                                                        ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20'
                                                        : 'border-slate-200 hover:bg-slate-50'
                                                }`}
                                            >
                                                <div className={`p-2 rounded-xl ${sendMode === 'download' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                                    <Download className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-sm text-slate-900">Scarica PDF Subito</div>
                                                    <div className="text-xs text-slate-500 mt-0.5">Pronto da stampare o inviare su WhatsApp</div>
                                                </div>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setSendMode('email')}
                                                className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                                                    sendMode === 'email'
                                                        ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20'
                                                        : 'border-slate-200 hover:bg-slate-50'
                                                }`}
                                            >
                                                <div className={`p-2 rounded-xl ${sendMode === 'email' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                                    <Send className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-sm text-slate-900">Invia via Email</div>
                                                    <div className="text-xs text-slate-500 mt-0.5">Recapito diretto alla casella del destinatario</div>
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Dati Destinatario & Dedica */}
                                    <div className="space-y-4 pt-2">
                                        <label className="block text-sm font-bold text-slate-800">
                                            3. Personalizza la dedica
                                        </label>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                                    Nome del Destinatario
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="Es. Marco Rossi"
                                                    value={recipientName}
                                                    onChange={(e) => setRecipientName(e.target.value)}
                                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                                />
                                            </div>

                                            {sendMode === 'email' ? (
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                                                        Email del Destinatario
                                                    </label>
                                                    <input
                                                        type="email"
                                                        required
                                                        placeholder="amico@esempio.it"
                                                        value={recipientEmail}
                                                        onChange={(e) => setRecipientEmail(e.target.value)}
                                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                                    />
                                                </div>
                                            ) : (
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                                                        Cellulare (Opzionale per WhatsApp)
                                                    </label>
                                                    <input
                                                        type="tel"
                                                        placeholder="Es. 333 1234567"
                                                        value={recipientPhone}
                                                        onChange={(e) => setRecipientPhone(e.target.value)}
                                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                                Messaggio o Auguri
                                            </label>
                                            <textarea
                                                rows={3}
                                                maxLength={300}
                                                placeholder="Scrivi qui il tuo messaggio speciale..."
                                                value={customMessage}
                                                onChange={(e) => setCustomMessage(e.target.value)}
                                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                            />
                                            <div className="text-right text-xs text-slate-400 mt-1">
                                                {customMessage.length}/300 caratteri
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dati Acquirente (Mittente) */}
                                    <div className="pt-2 border-t border-slate-100">
                                        <label className="block text-sm font-bold text-slate-800 mb-3">
                                            4. I tuoi dati (Mittente)
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                                    Il tuo Nome
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="Es. Giulia"
                                                    value={buyerName}
                                                    onChange={(e) => setBuyerName(e.target.value)}
                                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                                    La tua Email (per la ricevuta)
                                                </label>
                                                <input
                                                    type="email"
                                                    required
                                                    placeholder="tua@email.it"
                                                    value={buyerEmail}
                                                    onChange={(e) => setBuyerEmail(e.target.value)}
                                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">
                                            {error}
                                        </div>
                                    )}

                                    {/* Pulsante Conferma & Acquisto */}
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full py-4 px-6 rounded-2xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50 shadow-lg shadow-emerald-600/30 transition-all text-lg flex items-center justify-center gap-2"
                                    >
                                        {isLoading ? (
                                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Gift className="w-5 h-5" />
                                                Acquista Gift Card • € {effectiveAmount.toFixed(2)}
                                            </>
                                        )}
                                    </button>

                                    <div className="flex items-center justify-center gap-4 text-xs text-slate-500 pt-2">
                                        <span className="inline-flex items-center gap-1">
                                            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Nessuna scadenza
                                        </span>
                                        <span>•</span>
                                        <span>Valida su tutto il catalogo</span>
                                        <span>•</span>
                                        <span>Accreditabile a saldo</span>
                                    </div>
                                </form>
                            </div>

                            {/* Right Column: Live Interactive Voucher Preview */}
                            <div className="lg:col-span-5 sticky top-8">
                                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                                    <span>Anteprima Voucher dal Vivo</span>
                                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                        <Heart className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" /> Formato Stampabile
                                    </span>
                                </div>

                                {/* Virtual Card Container */}
                                <div className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-emerald-600 bg-white p-6 sm:p-7 text-slate-800">
                                    {/* Header Badge */}
                                    <div
                                        className="rounded-2xl p-4 text-white flex items-center justify-between shadow-md mb-6"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        <div>
                                            <div className="font-extrabold text-base tracking-wide uppercase">
                                                {siteName}
                                            </div>
                                            <div className="text-xs text-white/90 font-medium">
                                                BUONO REGALO DIGITALE
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-black">
                                                € {effectiveAmount.toFixed(2)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dedica & Destinatario */}
                                    <div className="space-y-3 mb-6">
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                                Destinatario
                                            </span>
                                            <span className="font-bold text-lg text-slate-900">
                                                {recipientName || 'Nome Destinatario'}
                                            </span>
                                        </div>

                                        {buyerName && (
                                            <div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                                    Regalo di
                                                </span>
                                                <span className="font-medium text-sm text-slate-700">
                                                    {buyerName}
                                                </span>
                                            </div>
                                        )}

                                        {customMessage && (
                                            <div className="bg-slate-50 border-l-4 border-emerald-500 p-3 rounded-r-xl">
                                                <p className="text-xs italic text-slate-600 line-clamp-3">
                                                    "{customMessage}"
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Codice & QR Mockup */}
                                    <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 flex items-center justify-between gap-4">
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                                Codice da caricare a saldo
                                            </span>
                                            <div className="font-mono text-base font-bold text-slate-800 tracking-wider">
                                                GIFT-••••-••••
                                            </div>
                                            <span className="text-[10px] text-slate-500 mt-1 block">
                                                Inquadra il QR con il telefono per caricarlo subito
                                            </span>
                                        </div>

                                        {/* QR Placeholder */}
                                        <div className="w-16 h-16 bg-white p-1 rounded-xl border border-slate-200 flex items-center justify-center shadow-sm shrink-0">
                                            <div className="grid grid-cols-3 gap-0.5 w-full h-full p-1 opacity-70">
                                                <div className="bg-slate-800 rounded-xs" />
                                                <div className="bg-slate-800 rounded-xs" />
                                                <div className="bg-slate-300 rounded-xs" />
                                                <div className="bg-slate-800 rounded-xs" />
                                                <div className="bg-emerald-600 rounded-xs" />
                                                <div className="bg-slate-800 rounded-xs" />
                                                <div className="bg-slate-300 rounded-xs" />
                                                <div className="bg-slate-800 rounded-xs" />
                                                <div className="bg-slate-800 rounded-xs" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* How it works banner */}
                                    <div className="mt-4 text-center">
                                        <span className="text-[11px] text-slate-400">
                                            Scaricabile in PDF ad alta risoluzione subito dopo l'acquisto
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
