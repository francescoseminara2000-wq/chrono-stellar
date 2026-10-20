import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Sparkles, ShoppingBag, ArrowRight } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

export const NewsletterConfirm = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState<string>('');
    const [confirmedEmail, setConfirmedEmail] = useState<string>('');
    const [welcomeCoupon, setWelcomeCoupon] = useState<any>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Link di conferma non valido: il token di verifica è mancante.');
            return;
        }

        const verifyToken = async () => {
            try {
                const response = await fetch(`${API_URL}/api/newsletter/confirm`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    setStatus('success');
                    setMessage(data.message || 'La tua iscrizione alla newsletter è stata confermata con successo!');
                    setConfirmedEmail(data.email || '');
                    if (data.welcomeCoupon) {
                        setWelcomeCoupon(data.welcomeCoupon);
                    }
                } else {
                    setStatus('error');
                    setMessage(data.error || 'Impossibile verificare il link di iscrizione.');
                }
            } catch (err: any) {
                setStatus('error');
                setMessage('Il link di conferma è scaduto o non è più valido.');
            }
        };

        verifyToken();
    }, [token]);

    return (
        <div className="min-h-[75vh] flex items-center justify-center py-16 px-4 bg-gradient-to-b from-nature-50/50 to-white">
            <div className="max-w-lg w-full bg-white rounded-3xl shadow-xl shadow-nature-900/5 border border-nature-100 p-8 sm:p-12 text-center relative overflow-hidden">
                {/* Decorative background glow */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-100 rounded-full blur-3xl opacity-60 pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-100 rounded-full blur-3xl opacity-60 pointer-events-none" />

                {status === 'loading' && (
                    <div className="relative py-8">
                        <div className="w-20 h-20 mx-auto rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-6 shadow-inner">
                            <Loader2 className="w-10 h-10 animate-spin" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Conferma iscrizione in corso...</h1>
                        <p className="text-gray-500 text-sm">Stiamo convalidando la tua richiesta di adesione alla newsletter.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="relative">
                        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/30">
                            <CheckCircle2 className="w-11 h-11" />
                        </div>

                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-3">
                            <Sparkles className="w-3.5 h-3.5" />
                            Iscrizione Attiva
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">
                            Benvenuto nella nostra Famiglia!
                        </h1>

                        <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-6">
                            {message}
                        </p>

                        {confirmedEmail && (
                            <div className="bg-nature-50 border border-nature-200/80 rounded-xl py-2 px-4 mb-6 text-xs sm:text-sm text-nature-800 font-medium inline-block">
                                ✉️ Email convalidata: <span className="font-semibold text-nature-950">{confirmedEmail}</span>
                            </div>
                        )}

                        {welcomeCoupon && (
                            <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/60 border-2 border-dashed border-emerald-400 rounded-3xl p-5 mb-8 text-center relative shadow-sm">
                                <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-widest mb-1 flex items-center justify-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Il tuo Regalo di Benvenuto
                                </div>
                                <div className="text-xl sm:text-2xl font-black text-emerald-950 mb-2">
                                    {welcomeCoupon.discountType === 'PERCENTAGE'
                                        ? `${welcomeCoupon.discountValue}% DI SCONTO`
                                        : `€${(welcomeCoupon.discountValue / 100).toFixed(2)} DI SCONTO`}
                                </div>
                                <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-emerald-200 shadow-xs mb-2">
                                    <span className="font-mono font-black text-lg text-emerald-700 tracking-wider">
                                        {welcomeCoupon.code}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(welcomeCoupon.code);
                                            setCopied(true);
                                            setTimeout(() => setCopied(false), 2000);
                                        }}
                                        className="text-xs font-bold text-emerald-800 hover:text-emerald-950 px-2 py-1 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                    >
                                        {copied ? 'Copiato!' : 'Copia'}
                                    </button>
                                </div>
                                <div className="text-xs text-emerald-800/80">
                                    {welcomeCoupon.minSpend && welcomeCoupon.minSpend > 0
                                        ? `Valido su una spesa minima di €${(welcomeCoupon.minSpend / 100).toFixed(2)}`
                                        : 'Nessuna spesa minima richiesta'}
                                </div>
                            </div>
                        )}

                        <div className="bg-amber-50/70 border border-amber-200/60 rounded-2xl p-4 mb-8 text-left text-xs sm:text-sm text-amber-900/90 leading-relaxed">
                            <span className="font-bold text-amber-950">Cosa riceverai:</span>
                            <ul className="mt-1.5 space-y-1 list-disc list-inside text-amber-900/80">
                                <li>Nuovi arrivi di stagione & primizie dal campo</li>
                                <li>Offerte lampo ed esclusive per gli iscritti</li>
                                <li>Date e orari aggiornati dei mercati rionali</li>
                            </ul>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Link
                                to="/shop"
                                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold rounded-xl shadow-md shadow-emerald-600/20 transition-all text-sm group"
                            >
                                <ShoppingBag className="w-4 h-4" />
                                Scopri i Prodotti Freschi
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                            <Link
                                to="/"
                                className="inline-flex items-center justify-center px-5 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all text-sm"
                            >
                                Torna alla Home
                            </Link>
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="relative">
                        <div className="w-20 h-20 mx-auto rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-6">
                            <XCircle className="w-11 h-11" />
                        </div>

                        <h1 className="text-2xl font-bold text-gray-900 mb-3">
                            Verifica non riuscita
                        </h1>

                        <p className="text-gray-600 text-sm leading-relaxed mb-8">
                            {message}
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Link
                                to="/"
                                className="inline-flex items-center justify-center px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md transition-all text-sm"
                            >
                                Torna alla Home
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NewsletterConfirm;
