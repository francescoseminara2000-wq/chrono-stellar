import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useToastStore } from '../store/useToastStore';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const addToast = useToastStore((state) => state.addToast);

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Token di sicurezza mancante. Richiedi un nuovo link.');
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setStatus('error');
            setMessage('Le password non coincidono');
            return;
        }

        if (password.length < 6) {
            setStatus('error');
            setMessage('La password deve contenere almeno 6 caratteri');
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
                setMessage(data.error || 'Token non valido o scaduto. Richiedi un nuovo link.');
            }
        } catch (err: any) {
            setStatus('error');
            setMessage('Errore di connessione. Riprova più tardi.');
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen bg-nature-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md bg-white py-8 px-8 shadow-xl sm:rounded-2xl text-center">
                    <XCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Accesso Negato</h2>
                    <p className="text-red-600 mb-6">{message}</p>
                    <button
                        onClick={() => navigate('/forgot-password')}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm font-bold text-white bg-nature-900 hover:bg-nature-800 transition-colors"
                    >
                        Richiedi Nuovo Link
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-nature-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-script text-nature-900">
                    Nuova Password
                </h2>
                <p className="mt-2 text-center text-sm text-gray-500">
                    Inserisci la tua nuova password
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-8 shadow-xl sm:rounded-2xl">
                    {status === 'success' ? (
                        <div className="text-center">
                            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-2" />
                            <h3 className="text-lg font-medium text-gray-900">Password Aggiornata</h3>
                            <p className="text-sm text-gray-500 mt-2">{message}</p>
                            <p className="text-sm text-gray-400 mt-4">Reindirizzamento al login...</p>
                        </div>
                    ) : (
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                    Nuova Password
                                </label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        autoComplete="new-password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="focus:ring-nature-500 focus:border-nature-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-xl"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                                    Conferma Nuova Password
                                </label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type="password"
                                        autoComplete="new-password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="focus:ring-nature-500 focus:border-nature-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-xl"
                                    />
                                </div>
                            </div>

                            {status === 'error' && (
                                <div className="text-red-600 text-sm mt-2">{message}</div>
                            )}

                            <div>
                                <button
                                    type="submit"
                                    disabled={status === 'loading'}
                                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm font-bold text-white bg-nature-900 hover:bg-nature-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-nature-900 disabled:opacity-50 transition-colors"
                                >
                                    {status === 'loading' ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
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
