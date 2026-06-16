import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';

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
        <div className="min-h-screen bg-nature-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-script text-nature-900">
                    Recupero Password
                </h2>
                <p className="mt-2 text-center text-sm text-gray-500">
                    Hai ricordato la password?{' '}
                    <Link to="/login" className="font-bold text-nature-600 hover:underline">
                        Torna al login
                    </Link>
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-8 shadow-xl sm:rounded-2xl">

                    {status === 'success' ? (
                        <div className="text-center">
                            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                            <h3 className="mt-2 text-lg font-medium text-gray-900">Email Inviata</h3>
                            <p className="mt-2 text-sm text-gray-500">{message}</p>
                            <div className="mt-6">
                                <Link
                                    to="/login"
                                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-nature-900 hover:bg-nature-800"
                                >
                                    Torna al Login
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                    Indirizzo Email dell'account
                                </label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="focus:ring-nature-500 focus:border-nature-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-xl"
                                        placeholder="tuo@email.com"
                                    />
                                </div>
                            </div>

                            {status === 'error' && (
                                <div className="text-red-600 text-sm mt-2">{message}</div>
                            )}

                            <div>
                                <button
                                    type="submit"
                                    disabled={status === 'loading' || !email}
                                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm font-bold text-white bg-nature-900 hover:bg-nature-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-nature-900 disabled:opacity-50 transition-colors"
                                >
                                    {status === 'loading' ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        'Invia link di recupero'
                                    )}
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="mt-6 flex justify-center">
                        <Link to="/login" className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900">
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            Torna al login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
