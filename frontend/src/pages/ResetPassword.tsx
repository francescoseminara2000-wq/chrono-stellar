import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Loader2, CheckCircle, XCircle, Eye, EyeOff, Check, X, ShieldCheck, AlertCircle } from 'lucide-react';
import { useToastStore } from '../store/useToastStore';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const addToast = useToastStore((state) => state.addToast);

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const [verifyingToken, setVerifyingToken] = useState(true);
    const [tokenError, setTokenError] = useState('');
    
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    // Verification Criteria
    const isMinLength = password.length >= 8;
    const hasNumber = /\d/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const isStrong = isMinLength && hasNumber && hasUppercase;

    // Check token validity on mount
    useEffect(() => {
        if (!token) {
            setTokenError('Token di sicurezza mancante. Richiedi un nuovo link.');
            setVerifyingToken(false);
            return;
        }

        const verifyToken = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/verify-reset-token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                });

                if (!response.ok) {
                    const data = await response.json();
                    setTokenError(data.error || 'Il link di recupero è scaduto o non è valido.');
                }
            } catch (err) {
                setTokenError('Errore di connessione durante la verifica del link.');
            } finally {
                setVerifyingToken(false);
            }
        };

        verifyToken();
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!isStrong) {
            setStatus('error');
            setMessage('La password non rispetta i criteri di sicurezza.');
            return;
        }

        if (password !== confirmPassword) {
            setStatus('error');
            setMessage('Le password inserite non coincidono.');
            return;
        }

        setStatus('loading');
        setMessage('');

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token, newPassword: password }),
            });

            const data = await response.json();

            if (response.ok) {
                setStatus('success');
                setMessage(data.message || 'Password aggiornata con successo!');
                addToast('Password ripristinata. Ora puoi effettuare l\'accesso.', 'success');
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            } else {
                setStatus('error');
                setMessage(data.error || 'Si è verificato un errore nel salvataggio. Riprova.');
            }
        } catch (err: any) {
            setStatus('error');
            setMessage('Errore di connessione. Riprova più tardi.');
        }
    };

    // 1. Loading state for token verification
    if (verifyingToken) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-nature-50 to-emerald-100/50 flex items-center justify-center p-4">
                <div className="bg-white/70 backdrop-blur-xl p-10 rounded-[2.5rem] border border-white/60 shadow-2xl flex flex-col items-center max-w-sm text-center">
                    <Loader2 className="w-12 h-12 text-nature-600 animate-spin mb-4" />
                    <h3 className="text-lg font-black text-gray-955 uppercase tracking-wider">Verifica in corso</h3>
                    <p className="text-sm text-gray-500 mt-2">Stiamo convalidando il tuo link di recupero password...</p>
                </div>
            </div>
        );
    }

    // 2. Token Error Screen (Prevent input)
    if (tokenError) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-nature-50 to-emerald-100/50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md bg-white/70 backdrop-blur-xl py-10 px-8 border border-white/60 shadow-2xl rounded-[2.5rem] text-center">
                    <div className="mx-auto h-20 w-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6 border border-red-100">
                        <XCircle className="h-10 w-10 animate-pulse" />
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Link Non Valido</h2>
                    <p className="text-sm font-medium text-red-600 leading-relaxed mb-8">{tokenError}</p>
                    <button
                        onClick={() => navigate('/forgot-password')}
                        className="w-full flex justify-center py-4 px-6 rounded-2xl shadow-lg shadow-nature-200 font-extrabold text-white bg-nature-900 hover:bg-nature-800 active:scale-95 transition-all duration-150"
                    >
                        Richiedi un nuovo link
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-nature-50 to-emerald-100/50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
            {/* Background design elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] rounded-full bg-nature-100/30 blur-[80px] -z-10" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[35rem] h-[35rem] rounded-full bg-emerald-100/40 blur-[100px] -z-10" />

            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
                <div className="inline-flex p-4 bg-white/80 rounded-3xl shadow-md border border-white/50 backdrop-blur-md mb-4 animate-bounce">
                    <ShieldCheck className="h-10 w-10 text-nature-600" />
                </div>
                <h2 className="text-4xl md:text-5xl font-script text-nature-955 tracking-tight">
                    Nuova Password
                </h2>
                <p className="mt-3 text-lg font-medium text-nature-800">
                    Inserisci e conferma le nuove credenziali
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
                <div className="bg-white/70 backdrop-blur-xl py-10 px-8 md:px-10 border border-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.06)] rounded-[2.5rem]">
                    {status === 'success' ? (
                        <div className="text-center animate-in fade-in zoom-in duration-300">
                            <div className="mx-auto h-20 w-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-6 border border-green-100 shadow-inner">
                                <CheckCircle className="h-10 w-10 animate-pulse" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Password Aggiornata</h3>
                            <p className="text-sm font-medium text-gray-500 mt-2 leading-relaxed">{message}</p>
                            <p className="text-xs text-gray-400 mt-6 flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-nature-600" />
                                Reindirizzamento al login in corso...
                            </p>
                        </div>
                    ) : (
                        <form className="space-y-5" onSubmit={handleSubmit}>
                            {/* New Password */}
                            <div>
                                <label htmlFor="password" className="block text-xs font-black uppercase tracking-wider text-nature-800 mb-2">
                                    Nuova Password
                                </label>
                                <div className="relative rounded-2xl shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-nature-500" />
                                    </div>
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="focus:ring-2 focus:ring-nature-500 focus:border-nature-500 block w-full pl-12 pr-12 py-4 sm:text-sm border-gray-200/80 rounded-2xl transition-all bg-white/60 focus:bg-white"
                                        placeholder="Minimo 8 caratteri"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-nature-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label htmlFor="confirmPassword" className="block text-xs font-black uppercase tracking-wider text-nature-800 mb-2">
                                    Conferma Nuova Password
                                </label>
                                <div className="relative rounded-2xl shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-nature-500" />
                                    </div>
                                    <input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="focus:ring-2 focus:ring-nature-500 focus:border-nature-500 block w-full pl-12 pr-12 py-4 sm:text-sm border-gray-200/80 rounded-2xl transition-all bg-white/60 focus:bg-white"
                                        placeholder="Ripeti la password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-nature-600 transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            {/* Password Strength Checklist */}
                            {password.length > 0 && (
                                <div className="bg-nature-50/50 rounded-2xl p-4 border border-nature-100/50 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <p className="text-[11px] font-black text-nature-800 uppercase tracking-wider mb-2">Requisiti Password:</p>
                                    <div className="flex items-center gap-2 text-xs font-medium">
                                        {isMinLength ? <Check size={14} className="text-green-600" /> : <X size={14} className="text-gray-400" />}
                                        <span className={isMinLength ? 'text-green-800' : 'text-gray-500'}>Almeno 8 caratteri</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-medium">
                                        {hasNumber ? <Check size={14} className="text-green-600" /> : <X size={14} className="text-gray-400" />}
                                        <span className={hasNumber ? 'text-green-800' : 'text-gray-500'}>Contiene almeno un numero</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-medium">
                                        {hasUppercase ? <Check size={14} className="text-green-600" /> : <X size={14} className="text-gray-400" />}
                                        <span className={hasUppercase ? 'text-green-800' : 'text-gray-500'}>Contiene almeno una lettera maiuscola</span>
                                    </div>
                                </div>
                            )}

                            {status === 'error' && (
                                <div className="bg-red-50 text-red-700 text-xs font-bold p-4 rounded-2xl border border-red-100 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                    <span>{message}</span>
                                </div>
                            )}

                            <div>
                                <button
                                    type="submit"
                                    disabled={status === 'loading' || !isStrong}
                                    className="w-full flex justify-center py-4 px-6 rounded-2xl shadow-lg shadow-nature-200 font-extrabold text-white bg-nature-600 hover:bg-nature-700 disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed active:scale-[0.98] transition-all duration-150 text-base"
                                >
                                    {status === 'loading' ? (
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Salvataggio...</span>
                                        </div>
                                    ) : (
                                        "Salva nuova password"
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
