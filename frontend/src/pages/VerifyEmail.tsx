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
                    setTimeout(() => {
                        navigate('/login');
                        addToast('Puoi ora effettuare il login.', 'success');
                    }, 3000);
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
    }, [token, navigate, addToast]);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">

                    {status === 'verifying' && (
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <Loader2 className="h-12 w-12 text-primary animate-spin" />
                            <h2 className="text-xl font-medium text-gray-900">Verifica in corso...</h2>
                            <p className="text-gray-500">Stiamo verificando il tuo indirizzo email.</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <CheckCircle className="h-16 w-16 text-green-500" />
                            <h2 className="text-2xl font-bold text-gray-900">Email Verificata!</h2>
                            <p className="text-gray-600">{message}</p>
                            <p className="text-sm text-gray-500 mt-4">Reindirizzamento al login in corso...</p>
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
