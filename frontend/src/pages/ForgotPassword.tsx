import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, CheckCircle, ShieldAlert, KeyRound } from 'lucide-react';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setMessage('');

        try {
            const API_URL = import.meta.env.VITE_API_URL || '';
            const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                setStatus('success');
                setMessage(data.message || 'Se esiste un account con questa email, abbiamo inviato un link per il reset.');
            } else {
                setStatus('error');
                setMessage(data.error || 'Si è verificato un errore.');
            }
        } catch (error) {
            setStatus('error');
            setMessage('Errore di connessione. Riprova più tardi.');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-nature-50 to-emerald-100/50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
            {/* Background design elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] rounded-full bg-nature-100/30 blur-[80px] -z-10" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[35rem] h-[35rem] rounded-full bg-emerald-100/40 blur-[100px] -z-10" />

            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
                <div className="inline-flex p-4 bg-white/80 rounded-3xl shadow-md border border-white/50 backdrop-blur-md mb-4 animate-bounce">
                    <KeyRound className="h-10 w-10 text-nature-600" />
                </div>
                <h2 className="text-4xl md:text-5xl font-script text-nature-950 tracking-tight">
                    Chrono Stellar
                </h2>
                <p className="mt-3 text-lg font-medium text-nature-800">
                    Recupero della password di accesso
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
                <div className="bg-white/70 backdrop-blur-xl py-10 px-8 md:px-10 border border-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.06)] rounded-[2.5rem]">

                    {status === 'success' ? (
                        <div className="text-center animate-in fade-in zoom-in duration-300">
                            <div className="mx-auto h-20 w-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-6 border border-green-100 shadow-inner">
                                <CheckCircle className="h-10 w-10 animate-pulse" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Email Inviata!</h3>
                            <p className="mt-3 text-sm font-medium text-gray-500 leading-relaxed">{message}</p>
                            <div className="mt-8">
                                <Link
                                    to="/login"
                                    className="w-full flex justify-center py-4 px-6 rounded-2xl shadow-lg font-bold text-white bg-nature-900 hover:bg-nature-800 active:scale-95 transition-all duration-150"
                                >
                                    Torna alla schermata di Login
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            <div>
                                <label htmlFor="email" className="block text-xs font-black uppercase tracking-wider text-nature-800 mb-2">
                                    Indirizzo Email dell'account
                                </label>
                                <div className="relative rounded-2xl shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-nature-500" />
                                    </div>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="focus:ring-2 focus:ring-nature-500 focus:border-nature-500 block w-full pl-12 pr-4 py-4 sm:text-sm border-gray-200/80 rounded-2xl transition-all placeholder:text-gray-400 bg-white/60 focus:bg-white"
                                        placeholder="esempio@email.it"
                                    />
                                </div>
                                <p className="text-[11px] text-gray-400 mt-2 ml-1 leading-relaxed">
                                    Ti invieremo un link sicuro per reimpostare la tua password attuale.
                                </p>
                            </div>

                            {status === 'error' && (
                                <div className="bg-red-50 text-red-700 text-xs font-bold p-4 rounded-2xl border border-red-100 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                                    <span>{message}</span>
                                </div>
                            )}

                            <div>
                                <button
                                    type="submit"
                                    disabled={status === 'loading' || !email}
                                    className="w-full flex justify-center py-4 px-6 rounded-2xl shadow-lg shadow-nature-200 font-extrabold text-white bg-nature-600 hover:bg-nature-700 disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed active:scale-[0.98] transition-all duration-150 text-base"
                                >
                                    {status === 'loading' ? (
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Invio in corso...</span>
                                        </div>
                                    ) : (
                                        'Invia link di recupero'
                                    )}
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="mt-8 flex justify-center border-t border-gray-100 pt-6">
                        <Link to="/login" className="flex items-center text-sm font-bold text-nature-700 hover:text-nature-900 group transition-colors">
                            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                            Torna al login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
