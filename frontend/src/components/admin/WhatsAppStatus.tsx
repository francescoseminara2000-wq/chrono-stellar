import { useState, useEffect } from 'react';
import { Smartphone, RefreshCw, X } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export const WhatsAppStatus = () => {
    const { token } = useAuthStore();
    const [status, setStatus] = useState<{ isConnected: boolean; qrCode: string | null }>({ isConnected: false, qrCode: null });
    const [isOpen, setIsOpen] = useState(false);

    const fetchStatus = () => {
        fetch(`/api/admin/whatsapp/status`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(setStatus)
            .catch(console.error);
    };

    useEffect(() => {
        if (isOpen) {
            fetchStatus();
            const interval = setInterval(fetchStatus, 3000); // Poll every 3s when open
            return () => clearInterval(interval);
        }
    }, [isOpen, token]);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="relative p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-nature-300 hover:text-white transition-all border border-white/10 group shadow-inner"
                title="Stato WhatsApp"
            >
                <Smartphone size={20} className="group-hover:scale-110 transition-transform" />
                {status.isConnected && <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-green-500 border-2 border-nature-900 rounded-full animate-pulse"></span>}
            </button>
        );
    }

    return (
        <div className="fixed inset-0 md:inset-auto md:bottom-24 md:left-8 md:w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 z-[100] overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-green-600 p-4 flex justify-between items-center text-white">
                <h3 className="font-bold flex items-center gap-2">
                    <Smartphone size={20} /> WhatsApp Server
                </h3>
                <button onClick={() => setIsOpen(false)}><X size={20} /></button>
            </div>

            <div className="p-6 flex flex-col items-center justify-center min-h-[300px]">
                {status.isConnected ? (
                    <div className="text-center">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Smartphone size={40} />
                        </div>
                        <h4 className="font-bold text-green-800 text-lg mb-2">Connesso!</h4>
                        <p className="text-sm text-gray-500">
                            Il server invierà automaticamente i messaggi ai clienti.
                        </p>
                    </div>
                ) : (
                    <div className="text-center w-full">
                        {status.qrCode ? (
                            <>
                                <p className="text-sm text-gray-600 mb-4 font-bold">Scansiona con WhatsApp:</p>
                                <img src={status.qrCode} alt="QR Code" className="w-48 h-48 mx-auto border-4 border-white shadow-sm mb-4" />
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-48">
                                <RefreshCw className="animate-spin text-gray-400 mb-2" size={32} />
                                <p className="text-gray-400 text-sm">Caricamento QR...</p>
                            </div>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                            Apri WhatsApp {'>'} Menu {'>'} Dispositivi collegati
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
