import React, { useState } from 'react';
import { Mail, CheckCircle2, ArrowRight, ShieldCheck, Sparkles, X, AlertCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

interface NewsletterSectionProps {
    variant?: 'home' | 'footer' | 'card';
    className?: string;
}

export const NewsletterSection: React.FC<NewsletterSectionProps> = ({ variant = 'card', className = '' }) => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [isUnsubscribeModalOpen, setIsUnsubscribeModalOpen] = useState(false);
    const [unsubEmail, setUnsubEmail] = useState('');
    const [unsubLoading, setUnsubLoading] = useState(false);
    const [unsubMessage, setUnsubMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !email.includes('@')) {
            setStatusMessage({ type: 'error', text: 'Inserisci un indirizzo email valido.' });
            return;
        }

        setIsLoading(true);
        setStatusMessage(null);

        try {
            const res = await fetch(`${API_URL}/api/newsletter/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim(), action: 'subscribe' })
            });

            const data = await res.json();
            if (res.ok) {
                setStatusMessage({
                    type: 'success',
                    text: data.message || 'Controlla la tua casella di posta per confermare l\'iscrizione!'
                });
                setEmail('');
            } else {
                setStatusMessage({ type: 'error', text: data.error || 'Errore durante l\'iscrizione.' });
            }
        } catch (err) {
            setStatusMessage({ type: 'error', text: 'Errore di connessione. Riprova più tardi.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleUnsubscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!unsubEmail.trim() || !unsubEmail.includes('@')) {
            setUnsubMessage({ type: 'error', text: 'Inserisci un indirizzo email valido.' });
            return;
        }

        setUnsubLoading(true);
        setUnsubMessage(null);

        try {
            const res = await fetch(`${API_URL}/api/newsletter/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: unsubEmail.trim(), action: 'unsubscribe' })
            });

            const data = await res.json();
            if (res.ok) {
                setUnsubMessage({
                    type: 'success',
                    text: data.message || 'Richiesta inviata. Controlla la tua email per confermare la disiscrizione.'
                });
                setUnsubEmail('');
            } else {
                setUnsubMessage({ type: 'error', text: data.error || 'Errore durante la disiscrizione.' });
            }
        } catch (err) {
            setUnsubMessage({ type: 'error', text: 'Errore di connessione.' });
        } finally {
            setUnsubLoading(false);
        }
    };

    if (variant === 'footer') {
        return (
            <div className={`space-y-4 ${className}`}>
                <div className="flex items-center gap-2 text-white font-bold text-base">
                    <Mail className="w-5 h-5 text-emerald-400" />
                    <span>Resta Aggiornato</span>
                </div>
                <p className="text-xs text-nature-100/70 leading-relaxed">
                    Iscriviti per ricevere in anteprima le offerte della settimana e gli arrivi freschi di stagione.
                </p>

                <form onSubmit={handleSubscribe} className="space-y-2">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            type="email"
                            required
                            placeholder="La tua email..."
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-nature-100/50 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white/15 transition-all"
                        />
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all whitespace-nowrap disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                            {isLoading ? 'Invio...' : 'Iscriviti'}
                        </button>
                    </div>

                    {statusMessage && (
                        <div className={`p-2.5 rounded-xl text-xs font-semibold ${
                            statusMessage.type === 'success'
                                ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30'
                                : 'bg-red-500/20 text-red-200 border border-red-500/30'
                        }`}>
                            {statusMessage.text}
                        </div>
                    )}
                </form>

                <div className="pt-1 flex items-center justify-between text-[11px] text-nature-100/50">
                    <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Nessun spam
                    </span>
                    <button
                        type="button"
                        onClick={() => setIsUnsubscribeModalOpen(true)}
                        className="hover:text-nature-100 underline transition-colors cursor-pointer"
                    >
                        Disiscriviti
                    </button>
                </div>

                {/* Modal Disiscrizione */}
                {isUnsubscribeModalOpen && (
                    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 text-slate-800">
                        <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative">
                            <button
                                onClick={() => { setIsUnsubscribeModalOpen(false); setUnsubMessage(null); }}
                                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                            >
                                <X size={20} />
                            </button>
                            <h4 className="font-bold text-base text-slate-900 mb-2">Cancellati dalla Newsletter</h4>
                            <p className="text-xs text-slate-500 mb-4">
                                Inserisci la tua email per richiedere la rimozione dalla mailing list:
                            </p>
                            <form onSubmit={handleUnsubscribe} className="space-y-3">
                                <input
                                    type="email"
                                    required
                                    placeholder="tua@email.it"
                                    value={unsubEmail}
                                    onChange={(e) => setUnsubEmail(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500"
                                />
                                {unsubMessage && (
                                    <div className={`p-2.5 rounded-xl text-xs font-semibold ${
                                        unsubMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                                    }`}>
                                        {unsubMessage.text}
                                    </div>
                                )}
                                <button
                                    type="submit"
                                    disabled={unsubLoading}
                                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                >
                                    {unsubLoading ? 'Elaborazione...' : 'Conferma Rimozione'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Default: Hero / Card Variant
    return (
        <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-nature-900 to-emerald-950 text-white p-8 md:p-12 shadow-xl border border-white/10 ${className}`}>
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <Sparkles className="w-3.5 h-3.5" /> Newsletter & Offerte Esclusive
                </span>

                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white">
                    Non perderti le offerte della settimana e gli arrivi di stagione!
                </h2>

                <p className="text-sm sm:text-base text-emerald-100/80 max-w-2xl mx-auto">
                    Iscriviti alla nostra mailing list ufficiale: riceverai direttamente via email i nuovi arrivi freschi di frutta e verdura, le promozioni speciali e le nostre ricette consigliate.
                </p>

                <form onSubmit={handleSubscribe} className="max-w-xl mx-auto pt-2">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="email"
                            required
                            placeholder="Inserisci il tuo indirizzo email..."
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="flex-1 px-5 py-4 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-emerald-100/50 text-sm sm:text-base backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white/15 transition-all shadow-inner"
                        />
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-8 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-nature-950 font-black text-sm sm:text-base shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
                        >
                            {isLoading ? 'Iscrizione in corso...' : (
                                <>
                                    Iscriviti Subito <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>

                    {statusMessage && (
                        <div className={`mt-4 p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 ${
                            statusMessage.type === 'success'
                                ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30'
                                : 'bg-red-500/20 text-red-200 border border-red-500/30'
                        }`}>
                            {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <AlertCircle className="w-4 h-4 text-red-300" />}
                            <span>{statusMessage.text}</span>
                        </div>
                    )}
                </form>

                <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-emerald-200/60 pt-2">
                    <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" /> Nessun invio molesto
                    </span>
                    <span>•</span>
                    <span>Disiscriviti con 1 click quando vuoi</span>
                    <span>•</span>
                    <button
                        type="button"
                        onClick={() => setIsUnsubscribeModalOpen(true)}
                        className="hover:text-emerald-100 underline transition-colors cursor-pointer"
                    >
                        Vuoi cancellarti?
                    </button>
                </div>
            </div>

            {/* Modal Disiscrizione */}
            {isUnsubscribeModalOpen && (
                <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 text-slate-800">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-left">
                        <button
                            onClick={() => { setIsUnsubscribeModalOpen(false); setUnsubMessage(null); }}
                            className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
                        >
                            <X size={20} />
                        </button>
                        <h4 className="font-bold text-lg text-slate-900 mb-2">Cancellazione Mailing List</h4>
                        <p className="text-xs text-slate-500 mb-4">
                            Ci dispiace vederti andare via! Inserisci la tua email per richiedere la cancellazione da <strong>aggiornamenti@ortofruttabutti.it</strong>:
                        </p>
                        <form onSubmit={handleUnsubscribe} className="space-y-4">
                            <input
                                type="email"
                                required
                                placeholder="tua@email.it"
                                value={unsubEmail}
                                onChange={(e) => setUnsubEmail(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 text-slate-900"
                            />
                            {unsubMessage && (
                                <div className={`p-3 rounded-xl text-xs font-semibold ${
                                    unsubMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                                }`}>
                                    {unsubMessage.text}
                                </div>
                            )}
                            <button
                                type="submit"
                                disabled={unsubLoading}
                                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer"
                            >
                                {unsubLoading ? 'Invio in corso...' : 'Conferma Cancellazione'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
};
