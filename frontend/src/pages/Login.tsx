import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { LogIn, Mail, Lock, Eye, EyeOff, Sparkles } from 'lucide-react';

export const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [requiresVerification, setRequiresVerification] = useState(false);
    const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [resendMessage, setResendMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const login = useAuthStore((state) => state.login);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setRequiresVerification(false);
        setResendStatus('idle');
        setIsSubmitting(true);

        try {
            const res = await fetch(`/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.requiresVerification) {
                    setRequiresVerification(true);
                }
                throw new Error(data.error || 'Credenziali non valide o utente non trovato.');
            }

            login(data.token, data.user);

            if (data.user.role === 'ADMIN') {
                navigate('/admin');
            } else {
                navigate('/');
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResendVerification = async () => {
        setResendStatus('loading');
        setResendMessage('');

        try {
            const res = await fetch(`/api/auth/resend-verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (res.ok) {
                setResendStatus('success');
                setResendMessage(data.message || 'Email inviata! Controlla la tua casella di posta.');
            } else {
                setResendStatus('error');
                setResendMessage(data.error || 'Errore durante l\'invio dell\'email.');
            }
        } catch (err) {
            setResendStatus('error');
            setResendMessage('Errore di connessione. Riprova più tardi.');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-nature-50 via-gray-50 to-emerald-50/40 flex items-center justify-center p-4 sm:p-6 py-12">
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden relative animate-in fade-in duration-300">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-emerald-800 via-nature-900 to-emerald-950 p-6 sm:p-8 text-white relative">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-emerald-400 font-mono text-xs font-bold uppercase tracking-widest block mb-1">Accedi al Negozio</span>
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Bentornato!</h1>
                            <p className="text-nature-200 text-xs sm:text-sm mt-1">Gestisci la tua spesa ed i tuoi ordini in un click</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-emerald-400 font-bold border border-white/10 shrink-0">
                            <Sparkles size={24} />
                        </div>
                    </div>
                </div>

                <div className="p-6 sm:p-8">
                    {error && (
                        <div className="bg-red-50 text-red-700 p-4 rounded-2xl mb-6 text-xs sm:text-sm font-bold border border-red-200 flex flex-col gap-2 animate-in fade-in duration-200">
                            <div className="flex items-center gap-2">
                                <span>⚠️</span>
                                <span>{error}</span>
                            </div>
                            {requiresVerification && (
                                <button
                                    type="button"
                                    onClick={handleResendVerification}
                                    disabled={resendStatus === 'loading'}
                                    className="mt-1 text-xs border border-red-300 bg-white text-red-800 px-3 py-1.5 rounded-xl hover:bg-red-100 transition-all font-bold self-start cursor-pointer disabled:opacity-50"
                                >
                                    {resendStatus === 'loading' ? 'Invio in corso...' : 'Invia di nuovo email di verifica'}
                                </button>
                            )}
                            {resendMessage && (
                                <span className={`text-xs font-bold ${resendStatus === 'success' ? 'text-emerald-700' : 'text-red-700'}`}>
                                    {resendMessage}
                                </span>
                            )}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Indirizzo Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                                <input
                                    type="email"
                                    required
                                    placeholder="mario@example.com"
                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-bold text-gray-900 transition-all"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Password</label>
                                <Link to="/forgot-password" className="text-xs text-emerald-700 font-bold hover:underline">
                                    Password dimenticata?
                                </Link>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-bold text-gray-900 transition-all"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-2xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98 text-base mt-2"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                    Accesso in corso...
                                </span>
                            ) : (
                                <>
                                    Accedi <LogIn size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center pt-4 border-t border-gray-100">
                        <p className="text-xs text-gray-500 font-bold">
                            Non hai un account?{' '}
                            <Link to="/register" className="text-emerald-700 font-black hover:underline">
                                Registrati Ora
                            </Link>
                        </p>
                    </div>

                    <div className="mt-4 text-center">
                        <Link to="/" className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors">
                            ← Torna al Negozio
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
