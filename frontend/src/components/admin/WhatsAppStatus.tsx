import { useState, useEffect } from 'react';
import { Smartphone, RefreshCw, X, CheckCircle2, Loader2, Send, Terminal, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

interface WhatsAppStatusData {
    isConnected: boolean;
    isAuthenticated?: boolean;
    loadingPercent?: number | null;
    qrCode: string | null;
}

interface WhatsAppLogEntry {
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    message: string;
}

export const WhatsAppStatus = () => {
    const { token } = useAuthStore();
    const [status, setStatus] = useState<WhatsAppStatusData>({ isConnected: false, qrCode: null });
    const [isOpen, setIsOpen] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [activeTab, setActiveTab] = useState<'status' | 'test' | 'logs'>('status');

    // Test send state
    const [testPhone, setTestPhone] = useState('');
    const [testMessage, setTestMessage] = useState('');
    const [isSendingTest, setIsSendingTest] = useState(false);
    const [testFeedback, setTestFeedback] = useState<{ success: boolean; message: string } | null>(null);

    // Logs state
    const [logs, setLogs] = useState<WhatsAppLogEntry[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);

    const fetchStatus = () => {
        fetch(`/api/admin/whatsapp/status`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then((data: WhatsAppStatusData) => {
                setStatus(data);
            })
            .catch(console.error);
    };

    const fetchLogs = async () => {
        setIsLoadingLogs(true);
        try {
            const res = await fetch(`/api/admin/whatsapp/logs`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs || []);
                if (data.status) setStatus(data.status);
            }
        } catch (e) {
            console.error('Failed to fetch whatsapp logs:', e);
        } finally {
            setIsLoadingLogs(false);
        }
    };

    const handleSendTest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!testPhone.trim()) return;

        setIsSendingTest(true);
        setTestFeedback(null);
        try {
            const res = await fetch(`/api/admin/whatsapp/test-send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ phone: testPhone, message: testMessage || undefined })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setTestFeedback({ success: true, message: data.message || 'Messaggio inviato con successo!' });
                fetchLogs();
            } else {
                setTestFeedback({ success: false, message: data.error || 'Errore durante l\'invio del messaggio' });
                fetchLogs();
            }
        } catch (err: any) {
            setTestFeedback({ success: false, message: err?.message || 'Errore di connessione' });
        } finally {
            setIsSendingTest(false);
        }
    };

    const handleReset = async () => {
        setIsResetting(true);
        try {
            await fetch('/api/admin/whatsapp/reset', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setStatus({ isConnected: false, isAuthenticated: false, loadingPercent: null, qrCode: null });
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
            if (activeTab === 'logs') fetchLogs();

            const intervalTime = (status.isAuthenticated && !status.isConnected) ? 1500 : 3500;
            const interval = setInterval(() => {
                fetchStatus();
                if (activeTab === 'logs') fetchLogs();
            }, intervalTime);
            return () => clearInterval(interval);
        }
    }, [isOpen, token, activeTab, status.isAuthenticated, status.isConnected]);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="relative p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all border border-white/10 group shadow-inner"
                title="Stato WhatsApp"
            >
                <Smartphone size={20} className="group-hover:scale-110 transition-transform" />
                {status.isConnected ? (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-green-500 border-2 border-nature-900 rounded-full animate-pulse"></span>
                ) : status.isAuthenticated ? (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-amber-400 border-2 border-nature-900 rounded-full animate-ping"></span>
                ) : null}
            </button>
        );
    }

    return (
        <>
            {/* Backdrop for mobile */}
            <div className="fixed inset-0 bg-nature-950/60 backdrop-blur-sm z-[99] lg:hidden" onClick={() => setIsOpen(false)}></div>
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-32px)] sm:w-96 md:fixed md:top-auto md:left-8 md:bottom-24 md:translate-x-0 md:translate-y-0 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-[100] overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]">
                <div className="bg-green-600 p-4 flex justify-between items-center text-white shrink-0">
                    <h3 className="font-bold flex items-center gap-2 text-sm sm:text-base">
                        <Smartphone size={20} /> WhatsApp Server
                    </h3>
                    <div className="flex items-center gap-2">
                        {status.isConnected && (
                            <span className="px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded-full">
                                Connesso
                            </span>
                        )}
                        <button onClick={() => setIsOpen(false)} className="hover:opacity-80 transition-opacity"><X size={20} /></button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 bg-gray-50/80 px-2 pt-2 gap-1 shrink-0 text-xs font-bold">
                    <button
                        onClick={() => setActiveTab('status')}
                        className={`flex-1 py-2 rounded-t-xl transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                            activeTab === 'status' 
                                ? 'bg-white text-green-700 border-green-600 shadow-xs' 
                                : 'text-gray-500 border-transparent hover:text-gray-800'
                        }`}
                    >
                        <Smartphone size={14} /> Stato
                    </button>
                    <button
                        onClick={() => { setActiveTab('test'); setTestFeedback(null); }}
                        className={`flex-1 py-2 rounded-t-xl transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                            activeTab === 'test' 
                                ? 'bg-white text-green-700 border-green-600 shadow-xs' 
                                : 'text-gray-500 border-transparent hover:text-gray-800'
                        }`}
                    >
                        <Send size={13} /> Test Invio
                    </button>
                    <button
                        onClick={() => { setActiveTab('logs'); fetchLogs(); }}
                        className={`flex-1 py-2 rounded-t-xl transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                            activeTab === 'logs' 
                                ? 'bg-white text-green-700 border-green-600 shadow-xs' 
                                : 'text-gray-500 border-transparent hover:text-gray-800'
                        }`}
                    >
                        <Terminal size={14} /> Log Server
                    </button>
                </div>

                <div className="p-5 overflow-y-auto flex-1 min-h-[300px]">
                    {activeTab === 'status' && (
                        <>
                            {status.isConnected ? (
                                <div className="text-center w-full py-2">
                                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                                        <CheckCircle2 size={36} />
                                    </div>
                                    <h4 className="font-bold text-green-800 text-base mb-1">WhatsApp Connesso!</h4>
                                    <span className="inline-block px-2.5 py-0.5 bg-green-100 text-green-700 text-[11px] font-bold rounded-full mb-2">
                                        Sessione attiva & pronta
                                    </span>
                                    <p className="text-xs text-gray-500 mb-4 max-w-[260px] mx-auto">
                                        I messaggi automatici di pesatura e cambio stato verranno inviati regolarmente.
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => setActiveTab('test')}
                                            className="w-full py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-95"
                                        >
                                            <Send size={13} /> Invia Messaggio di Prova
                                        </button>
                                        <button
                                            onClick={handleReset}
                                            disabled={isResetting}
                                            className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 active:scale-95"
                                        >
                                            <RefreshCw size={13} className={isResetting ? "animate-spin" : ""} />
                                            {isResetting ? 'Disconnessione...' : 'Disconnetti / Cambia Account'}
                                        </button>
                                    </div>
                                </div>
                            ) : status.isAuthenticated ? (
                                <div className="text-center w-full py-2">
                                    <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                                        <Loader2 size={32} className="animate-spin text-amber-500" />
                                    </div>
                                    <h4 className="font-bold text-gray-800 text-base mb-1">Dispositivo Collegato!</h4>
                                    <p className="text-xs text-amber-700 font-semibold mb-2">
                                        Sincronizzazione in corso... {status.loadingPercent ? `(${status.loadingPercent}%)` : ''}
                                    </p>
                                    <p className="text-[11px] text-gray-400 max-w-[240px] mx-auto mb-3">
                                        Lo smartphone ha completato il pairing. Il server sta caricando la sessione nel browser headless.
                                    </p>
                                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mb-3">
                                        <div 
                                            className="bg-amber-500 h-full transition-all duration-300 rounded-full"
                                            style={{ width: `${status.loadingPercent || 70}%` }}
                                        ></div>
                                    </div>
                                    <button
                                        onClick={fetchStatus}
                                        className="text-xs text-gray-600 hover:text-green-600 font-bold underline transition-colors"
                                    >
                                        Verifica adesso lo stato
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center w-full">
                                    {status.qrCode ? (
                                        <>
                                            <p className="text-xs text-gray-700 mb-2 font-bold">Scansiona con WhatsApp:</p>
                                            <img src={status.qrCode} alt="QR Code" className="w-44 h-44 mx-auto border-4 border-white shadow-md rounded-xl mb-2 object-contain" />
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-44">
                                            <RefreshCw className="animate-spin text-green-600 mb-2" size={32} />
                                            <p className="text-gray-600 font-bold text-sm">Caricamento QR Code...</p>
                                            <p className="text-xs text-gray-400 mt-1">Generazione sessione in corso...</p>
                                        </div>
                                    )}
                                    <p className="text-[11px] text-gray-400 my-2">
                                        Apri WhatsApp {'>'} Impostazioni {'>'} Dispositivi collegati
                                    </p>
                                    <button
                                        onClick={handleReset}
                                        disabled={isResetting}
                                        className="mt-2 w-full py-2.5 bg-green-50 hover:bg-green-100 text-green-800 border border-green-200 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xs"
                                    >
                                        <RefreshCw size={14} className={isResetting ? "animate-spin" : ""} />
                                        {isResetting ? 'Rigenerazione QR in corso...' : 'Resetta Connessione & Rigenera QR'}
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'test' && (
                        <form onSubmit={handleSendTest} className="space-y-3 py-1">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Numero WhatsApp di destinazione
                                </label>
                                <input
                                    type="text"
                                    value={testPhone}
                                    onChange={(e) => setTestPhone(e.target.value)}
                                    placeholder="Es. 3401234567 oppure +39340..."
                                    required
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 font-sans"
                                />
                                <span className="text-[10px] text-gray-400">Il prefisso +39 viene aggiunto automaticamente se omesso.</span>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Testo Messaggio (Opzionale)
                                </label>
                                <textarea
                                    value={testMessage}
                                    onChange={(e) => setTestMessage(e.target.value)}
                                    placeholder="Messaggio di test predefinito..."
                                    rows={3}
                                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 font-sans"
                                />
                            </div>

                            {testFeedback && (
                                <div className={`p-2.5 rounded-xl text-xs font-bold flex items-start gap-2 ${
                                    testFeedback.success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
                                }`}>
                                    {testFeedback.success ? <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" /> : <ShieldAlert size={16} className="text-red-600 shrink-0 mt-0.5" />}
                                    <div className="flex-1">{testFeedback.message}</div>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSendingTest || !status.isConnected}
                                className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                                    !status.isConnected 
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-green-600 hover:bg-green-700 text-white active:scale-95'
                                }`}
                            >
                                {isSendingTest ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                                {isSendingTest ? 'Invio in corso...' : !status.isConnected ? 'WhatsApp non connesso' : 'Invia Messaggio Test'}
                            </button>
                        </form>
                    )}

                    {activeTab === 'logs' && (
                        <div className="space-y-2">
                            <div className="flex justify-between items-center pb-1">
                                <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
                                    <Terminal size={13} /> Log Real-time del Server
                                </span>
                                <button
                                    onClick={fetchLogs}
                                    disabled={isLoadingLogs}
                                    className="text-[11px] font-bold text-green-700 hover:underline flex items-center gap-1"
                                >
                                    <RefreshCw size={11} className={isLoadingLogs ? "animate-spin" : ""} /> Ricarica
                                </button>
                            </div>

                            <div className="bg-nature-950 text-gray-200 p-2.5 rounded-xl font-mono text-[11px] h-60 overflow-y-auto space-y-1.5 border border-nature-800 select-text">
                                {logs.length === 0 ? (
                                    <div className="text-gray-500 text-center py-8">Nessun log recente registrato.</div>
                                ) : (
                                    logs.map((l, idx) => (
                                        <div key={idx} className="leading-tight break-all border-b border-white/5 pb-1 last:border-0">
                                            <span className="text-gray-500 font-bold mr-1.5">[{l.timestamp}]</span>
                                            <span className={
                                                l.level === 'error' ? 'text-red-400 font-bold' :
                                                l.level === 'warn' ? 'text-amber-400' :
                                                'text-emerald-400'
                                            }>
                                                {l.message}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                            <p className="text-[10px] text-gray-400">
                                I log mostrano ogni tentativo di invio, formattazione numero ed eventuali errori.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

