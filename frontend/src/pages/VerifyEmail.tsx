import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useToastStore } from '../store/useToastStore';

const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const addToast = useToastStore((state) => state.addToast);

    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [message, setMessage] = useState('');
    const [welcomeCoupon, setWelcomeCoupon] = useState<any>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const verifyToken = async () => {
            if (!token) {
                setStatus('error');
                setMessage('Token di verifica mancante.');
                return;
            }

            try {
                const API_URL = import.meta.env.VITE_API_URL || '';
                const response = await fetch(`${API_URL}/api/auth/verify-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                });

                const data = await response.json();

                if (response.ok) {
                    setStatus('success');
                    setMessage(data.message || 'Email verificata con successo!');
                    if (data.welcomeCoupon) {
                        setWelcomeCoupon(data.welcomeCoupon);
                    }
                    addToast('Email verificata con successo! Benvenuto!', 'success');
                } else {
                    setStatus('error');
                    setMessage(data.error || 'Token non valido o scaduto.');
                }
            } catch (error) {
                setStatus('error');
                setMessage('Errore di connessione durante la verifica.');
            }
        };

        verifyToken();
    }, [token, addToast]);

    return (
        <div className="min-h-[75vh] bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-6 shadow-xl rounded-3xl sm:px-10 text-center border border-gray-150">

                    {status === 'verifying' && (
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <Loader2 className="h-12 w-12 text-emerald-600 animate-spin" />
                            <h2 className="text-xl font-bold text-gray-900">Verifica in corso...</h2>
                            <p className="text-gray-500 text-sm">Stiamo verificando il tuo indirizzo email.</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                                <CheckCircle className="h-10 w-10 text-emerald-600" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Account Attivato!</h2>
                            <p className="text-gray-600 text-sm">{message}</p>

                            {welcomeCoupon && (
                                <div className="w-full bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/60 border-2 border-dashed border-emerald-400 rounded-2xl p-4 my-2 text-center shadow-xs">
                                    <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest mb-1">
                                        🎁 Il tuo Buono Regalo di Benvenuto
                                    </div>
                                    <div className="text-lg font-black text-emerald-950 mb-1.5">
                                        {welcomeCoupon.discountType === 'PERCENTAGE'
                                            ? `${welcomeCoupon.discountValue}% DI SCONTO`
                                            : `€${(welcomeCoupon.discountValue / 100).toFixed(2)} DI SCONTO`}
                                    </div>
                                    <div className="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-emerald-200 shadow-xs mb-1.5">
                                        <span className="font-mono font-black text-base text-emerald-700 tracking-wider">
                                            {welcomeCoupon.code}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText(welcomeCoupon.code);
                                                setCopied(true);
                                                setTimeout(() => setCopied(false), 2000);
                                            }}
                                            className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors cursor-pointer"
                                        >
                                            {copied ? 'Copiato!' : 'Copia'}
                                        </button>
                                    </div>
                                    <div className="text-[11px] text-emerald-800/80">
                                        {welcomeCoupon.minSpend && welcomeCoupon.minSpend > 0
                                            ? `Valido su una spesa minima di €${(welcomeCoupon.minSpend / 100).toFixed(2)}`
                                            : 'Nessuna spesa minima richiesta'}
                                    </div>
                                </div>
                            )}

                            <div className="mt-4 flex flex-col gap-2 w-full pt-2">
                                <button
                                    onClick={() => navigate('/login')}
                                    className="w-full py-3 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all cursor-pointer"
                                >
                                    Accedi al tuo Account
                                </button>
                                <button
                                    onClick={() => navigate('/shop')}
                                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 transition-all cursor-pointer"
                                >
                                    Inizia a Fare la Spesa
                                </button>
                            </div>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <XCircle className="h-16 w-16 text-red-500" />
                            <h2 className="text-2xl font-bold text-gray-900">Errore di Verifica</h2>
                            <p className="text-red-600">{message}</p>
                            <div className="mt-6 flex gap-4 w-full">
                                <button
                                    onClick={() => navigate('/login')}
                                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                                >
                                    Torna al Login
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default VerifyEmail;
