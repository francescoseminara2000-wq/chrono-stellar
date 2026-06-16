import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { LogIn } from 'lucide-react';

export const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [requiresVerification, setRequiresVerification] = useState(false);
    const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [resendMessage, setResendMessage] = useState('');

    const login = useAuthStore((state) => state.login);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setRequiresVerification(false);
        setResendStatus('idle');

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
                throw new Error(data.error || 'Login failed');
            }

            login(data.token, data.user);

            if (data.user.role === 'ADMIN') {
                navigate('/admin');
            } else {
                navigate('/');
            }

        } catch (err: any) {
            setError(err.message);
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
                setResendMessage(data.message || 'Email inviata verifica la tua casella.');
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
        <div className="min-h-screen bg-nature-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="font-script text-4xl text-nature-900 mb-2">Bentornato!</h1>
                    <p className="text-gray-500">Accedi al tuo account per gestire i tuoi ordini</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm flex flex-col gap-2">
                        <span>{error}</span>
                        {requiresVerification && (
                            <button
                                onClick={handleResendVerification}
                                disabled={resendStatus === 'loading'}
                                className="text-sm border border-red-200 bg-white text-red-700 px-3 py-1 rounded hover:bg-red-50 transition w-max disabled:opacity-50"
                            >
                                {resendStatus === 'loading' ? 'Invio in corso...' : 'Invia di nuovo email di verifica'}
                            </button>
                        )}
                        {resendMessage && (
                            <span className={`text-xs ${resendStatus === 'success' ? 'text-green-600' : 'text-red-700'}`}>
                                {resendMessage}
                            </span>
                        )}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            required
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-nature-500 outline-none"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-bold text-gray-700">Password</label>
                            <Link to="/forgot-password" className="text-xs text-nature-600 hover:text-nature-800 font-medium">Password dimenticata?</Link>
                        </div>
                        <input
                            type="password"
                            required
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-nature-500 outline-none"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-nature-900 text-white font-bold py-3 rounded-xl hover:bg-nature-800 transition-colors flex items-center justify-center gap-2"
                    >
                        <LogIn size={20} /> Accedi
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-500">
                    Non hai un account? <Link to="/register" className="text-nature-600 font-bold hover:underline">Registrati qui</Link>
                </div>

                <div className="mt-4 text-center">
                    <Link to="/" className="text-xs text-gray-400 hover:text-gray-600">Torna alla Home</Link>
                </div>
            </div>
        </div>
    );
};
