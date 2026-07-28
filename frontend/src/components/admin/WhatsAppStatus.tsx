import { useState, useEffect } from 'react';
import { Smartphone, RefreshCw, X } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export const WhatsAppStatus = () => {
    const { token } = useAuthStore();
    const [status, setStatus] = useState<{ isConnected: boolean; qrCode: string | null }>({ isConnected: false, qrCode: null });
    const [isOpen, setIsOpen] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    const fetchStatus = () => {
        fetch(`/api/admin/whatsapp/status`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(setStatus)
            .catch(console.error);
    };

    const handleReset = async () => {
        setIsResetting(true);
        try {
            await fetch('/api/admin/whatsapp/reset', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setStatus({ isConnected: false, qrCode: null });
            setTimeout(fetchStatus, 1500);
        } catch (err) {
            console.error(err);
        } finally {
            setTimeout(() => setIsResetting(false), 2000);
        }
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
                className="relative p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all border border-white/10 group shadow-inner"
                title="Stato WhatsApp"
            >
                <Smartphone size={20} className="group-hover:scale-110 transition-transform" />
                {status.isConnected && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-green-500 border-2 border-nature-900 rounded-full animate-pulse"></span>}
            </button>
        );
    }

    return (
        <>
            {/* Backdrop for mobile */}
            <div className="fixed inset-0 bg-nature-950/60 backdrop-blur-sm z-[99] lg:hidden" onClick={() => setIsOpen(false)}></div>
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-32px)] sm:w-80 md:fixed md:top-auto md:left-8 md:bottom-24 md:translate-x-0 md:translate-y-0 md:w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 z-[100] overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-green-600 p-4 flex justify-between items-center text-white">
                <h3 className="font-bold flex items-center gap-2">
                    <Smartphone size={20} /> WhatsApp Server
                </h3>
                <button onClick={() => setIsOpen(false)}><X size={20} /></button>
            </div>

            <div className="p-6 flex flex-col items-center justify-center min-h-[300px]">
                {status.isConnected ? (
                    <div className="text-center w-full">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                            <Smartphone size={40} />
                        </div>
                        <h4 className="font-bold text-green-800 text-lg mb-2">Connesso!</h4>
                        <p className="text-sm text-gray-500 mb-4">
                            Il server invierà automaticamente i messaggi ai clienti.
                        </p>
                        <button
                            onClick={handleReset}
                            disabled={isResetting}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 mx-auto active:scale-95"
                        >
                            <RefreshCw size={13} className={isResetting ? "animate-spin" : ""} />
                            {isResetting ? 'Resettando...' : 'Resetta / Cambia Account'}
                        </button>
                    </div>
                ) : (
                    <div className="text-center w-full">
                        {status.qrCode ? (
                            <>
                                <p className="text-sm text-gray-600 mb-3 font-bold">Scansiona con WhatsApp:</p>
                                <img src={status.qrCode} alt="QR Code" className="w-48 h-48 mx-auto border-4 border-white shadow-md rounded-xl mb-3" />
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-44">
                                <RefreshCw className="animate-spin text-green-600 mb-2" size={32} />
                                <p className="text-gray-600 font-bold text-sm">Caricamento QR Code...</p>
                                <p className="text-xs text-gray-400 mt-1">Se il QR non compare, clicca in basso.</p>
                            </div>
                        )}
                        <p className="text-[11px] text-gray-400 my-2">
                            Apri WhatsApp {'>'} Menu {'>'} Dispositivi collegati
                        </p>
                        <button
                            onClick={handleReset}
                            disabled={isResetting}
                            className="mt-2 w-full py-2.5 bg-green-50 hover:bg-green-100 text-green-800 border border-green-200 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
                        >
                            <RefreshCw size={14} className={isResetting ? "animate-spin" : ""} />
                            {isResetting ? 'Rigenerazione QR in corso...' : 'Resetta Connessione & Rigenera QR'}
                        </button>
                    </div>
                )}
            </div>
        </div>
        </>
    );
};
