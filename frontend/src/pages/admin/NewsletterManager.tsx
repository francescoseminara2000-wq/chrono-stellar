import React, { useState, useEffect } from 'react';
import { Mail, Send, Eye, History, Sparkles, CheckCircle2, AlertTriangle, Info, Clock, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppState } from '../../store/useAppState';

const API_URL = import.meta.env.VITE_API_URL || '';

export const NewsletterManager: React.FC = () => {
    const { token, user } = useAuthStore();
    const { settings } = useAppState();

    const [activeTab, setActiveTab] = useState<'composer' | 'history' | 'guide'>('composer');

    // Composer State
    const [subject, setSubject] = useState('');
    const [previewText, setPreviewText] = useState('');
    const [content, setContent] = useState('');
    const [testEmail, setTestEmail] = useState(user?.email || '');
    const [isSending, setIsSending] = useState(false);
    const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // History State
    const [history, setHistory] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    const siteName = settings?.siteName || 'Ortofrutta Butti';
    const primaryColor = settings?.primaryColor || '#16a34a';

    const TEMPLATES = [
        {
            name: '🍓 Offerte della Settimana',
            subject: `Le Offerte della Settimana da ${siteName}!`,
            preview: 'Scopri i migliori prodotti freschi a prezzi speciali.',
            content: `<h2>Gentile Cliente,</h2>
<p>ecco le imperdibili offerte della settimana selezionate per te con la consueta garanzia di freschezza:</p>
<ul>
    <li><strong>Fragole nostrane dolcissime:</strong> ottime da gustare al naturale o nei dessert.</li>
    <li><strong>Asparagi verdi freschi:</strong> ideali per risotti e contorni primaverili.</li>
    <li><strong>Arance e Agrumi di Sicilia:</strong> ricchi di vitamine e sapore autentico.</li>
</ul>
<p>Ti aspettiamo nel nostro punto vendita e sul nostro shop online per consegnarti la spesa direttamente a casa!</p>`
        },
        {
            name: '🌱 Nuovi Arrivi di Stagione',
            subject: `Nuovi Arrivi di Stagione: Freschezza Quotidiana!`,
            preview: 'Sono arrivate le primizie della settimana, scoprile tutte.',
            content: `<h2>Ciao a tutti gli amanti della buona tavola!</h2>
<p>Oggi sono arrivate le prime primizie fresche direttamente dai nostri produttori di fiducia.</p>
<p>Vieni a scoprire i profumi e la qualità dei prodotti appena raccolti. Disponibili sia per il ritiro in negozio che con consegna a domicilio!</p>`
        },
        {
            name: '⏰ Orari & Festività',
            subject: `Comunicazione Orari di Apertura e Consegne - ${siteName}`,
            preview: 'Importante avviso sugli orari e giorni di consegna.',
            content: `<h2>Gentili Clienti,</h2>
<p>vi comunichiamo che in occasione delle prossime festività osserveremo i seguenti orari:</p>
<p><strong>Lunedì - Sabato:</strong> 08:00 - 12:30 / 15:30 - 19:30<br/><strong>Domenica:</strong> Chiuso</p>
<p>Vi consigliamo di prenotare la spesa con un po' di anticipo per garantirvi le consegne negli orari desiderati.</p>`
        }
    ];

    const applyTemplate = (tpl: typeof TEMPLATES[0]) => {
        setSubject(tpl.subject);
        setPreviewText(tpl.preview);
        setContent(tpl.content);
        setActionFeedback({ type: 'success', message: `Template "${tpl.name}" applicato!` });
        setTimeout(() => setActionFeedback(null), 3000);
    };

    const fetchHistory = async () => {
        setIsLoadingHistory(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/newsletter/history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setHistory(data);
            }
        } catch (err) {
            console.error('Failed to fetch history:', err);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'history') {
            fetchHistory();
        }
    }, [activeTab]);

    const handleSend = async (isTest: boolean) => {
        if (!subject.trim() || !content.trim()) {
            setActionFeedback({ type: 'error', message: 'Inserisci sia l\'oggetto che il contenuto della newsletter.' });
            return;
        }

        if (isTest && (!testEmail.trim() || !testEmail.includes('@'))) {
            setActionFeedback({ type: 'error', message: 'Inserisci un indirizzo email valido per il test.' });
            return;
        }

        if (!isTest) {
            const confirmed = window.confirm(
                'ATTENZIONE: Stai per inviare questa newsletter a TUTTI gli iscritti della mailing list (aggiornamenti@ortofruttabutti.it).\n\nConfermi l\'invio?'
            );
            if (!confirmed) return;
        }

        setIsSending(true);
        setActionFeedback(null);

        try {
            const res = await fetch(`${API_URL}/api/admin/newsletter/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    subject,
                    preview: previewText,
                    content,
                    isTest,
                    testEmail
                })
            });

            const data = await res.json();
            if (res.ok) {
                setActionFeedback({
                    type: 'success',
                    message: data.message || 'Newsletter inviata con successo!'
                });
                if (!isTest) {
                    fetchHistory();
                }
            } else {
                setActionFeedback({ type: 'error', message: data.error || 'Errore durante l\'invio.' });
            }
        } catch (err: any) {
            setActionFeedback({ type: 'error', message: 'Errore di connessione durante l\'invio.' });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <Mail className="w-8 h-8 text-emerald-600" />
                        Newsletter & Comunicazioni
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Componi e invia aggiornamenti alla mailing list <strong className="text-gray-700">aggiornamenti@ortofruttabutti.it</strong>
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl shrink-0">
                    <button
                        onClick={() => setActiveTab('composer')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            activeTab === 'composer' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        <Send size={14} /> Componi & Invia
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            activeTab === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        <History size={14} /> Storico Invii
                    </button>
                    <button
                        onClick={() => setActiveTab('guide')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            activeTab === 'guide' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        <Info size={14} /> Guida IONOS
                    </button>
                </div>
            </div>

            {actionFeedback && (
                <div className={`p-4 rounded-2xl text-sm font-bold flex items-center gap-2 ${
                    actionFeedback.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                    {actionFeedback.type === 'success' ? <CheckCircle2 size={18} className="shrink-0" /> : <AlertTriangle size={18} className="shrink-0" />}
                    <span>{actionFeedback.message}</span>
                </div>
            )}

            {/* TAB 1: COMPOSER */}
            {activeTab === 'composer' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Form & Quick Templates */}
                    <div className="lg:col-span-7 space-y-6">
                        {/* Quick Templates */}
                        <div className="bg-white p-5 rounded-3xl border border-gray-150 shadow-xs space-y-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Template Veloci
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {TEMPLATES.map((tpl, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => applyTemplate(tpl)}
                                        className="p-3 text-left rounded-xl border border-gray-150 hover:border-emerald-300 hover:bg-emerald-50/40 text-xs font-bold text-gray-800 transition-all cursor-pointer"
                                    >
                                        {tpl.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Composer Form */}
                        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-150 shadow-xs space-y-5">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                                    Oggetto dell'Email *
                                </label>
                                <input
                                    type="text"
                                    placeholder="Es. Le Novità e le Offerte della Settimana!"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                                    Anteprima Testo Breve (Opzionale)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Testo visibile nell'anteprima della notifica / casella email..."
                                    value={previewText}
                                    onChange={(e) => setPreviewText(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                        Contenuto del Messaggio (HTML supportato) *
                                    </label>
                                    <span className="text-[11px] text-gray-400">Supporta &lt;h2&gt;, &lt;p&gt;, &lt;strong&gt;, &lt;ul&gt;, ecc.</span>
                                </div>
                                <textarea
                                    rows={10}
                                    placeholder="Scrivi qui il messaggio per i clienti..."
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    className="w-full p-4 rounded-2xl border border-gray-200 text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none leading-relaxed"
                                />
                            </div>

                            {/* Test Send Box */}
                            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3">
                                <input
                                    type="email"
                                    placeholder="Email per prova (es. tua@email.it)"
                                    value={testEmail}
                                    onChange={(e) => setTestEmail(e.target.value)}
                                    className="flex-1 w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 bg-white"
                                />
                                <button
                                    type="button"
                                    disabled={isSending}
                                    onClick={() => handleSend(true)}
                                    className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                                >
                                    Invia Prova Test
                                </button>
                            </div>

                            {/* Main Send Action Button */}
                            <button
                                type="button"
                                disabled={isSending || !subject.trim() || !content.trim()}
                                onClick={() => handleSend(false)}
                                className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {isSending ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Send size={18} />
                                        Invia a Tutta la Mailing List (aggiornamenti@ortofruttabutti.it)
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Live Email Preview Mockup */}
                    <div className="lg:col-span-5 sticky top-8 space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-400">
                            <span className="flex items-center gap-1.5">
                                <Eye size={14} /> Anteprima Email Ricevuta
                            </span>
                            <span className="text-emerald-700">Formato Client Email</span>
                        </div>

                        {/* Simulated Email Client Container */}
                        <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden">
                            {/* Email Client Header bar */}
                            <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 text-xs space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-500">Da:</span>
                                    <span className="text-gray-800 font-medium">{siteName} &lt;noreply@ortofruttabutti.it&gt;</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-500">A:</span>
                                    <span className="text-gray-800 font-medium">aggiornamenti@ortofruttabutti.it</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-500">Oggetto:</span>
                                    <span className="text-gray-900 font-bold">{subject || 'Nessun oggetto specificato'}</span>
                                </div>
                            </div>

                            {/* Rendered Email Body */}
                            <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
                                {/* Store Header Banner */}
                                <div
                                    className="p-5 rounded-2xl text-center text-white"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    <h3 className="font-bold text-lg tracking-wider uppercase">{siteName}</h3>
                                    <p className="text-xs text-white/80">Freschezza e Qualità Quotidiana</p>
                                </div>

                                {/* Content Render */}
                                <div
                                    className="prose prose-sm max-w-none text-gray-800 leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: content || '<p class="text-gray-400 italic">Il testo della tua newsletter apparirà qui mentre scrivi...</p>' }}
                                />

                                {/* Simulated Footer */}
                                <div className="pt-6 border-t border-gray-150 text-[11px] text-gray-400 text-center space-y-1">
                                    <p>Ricevi questa comunicazione perché sei iscritto alla mailing list di {siteName}.</p>
                                    <p className="underline text-gray-500">Disiscriviti dalla mailing list</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: HISTORY */}
            {activeTab === 'history' && (
                <div className="bg-white rounded-3xl border border-gray-150 shadow-xs overflow-hidden">
                    <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-bold text-base text-gray-900">Storico delle Newsletter Inviate</h3>
                        <button
                            onClick={fetchHistory}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                            title="Aggiorna"
                        >
                            <RefreshCw size={16} />
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-black uppercase tracking-wider text-gray-400">
                                    <th className="p-4 sm:px-6">Oggetto</th>
                                    <th className="p-4">Lista Destinataria</th>
                                    <th className="p-4">Inviata Da</th>
                                    <th className="p-4 sm:pr-6 text-right">Data Invio</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {isLoadingHistory ? (
                                    <tr>
                                        <td colSpan={4} className="text-center py-12 text-gray-400">
                                            Caricamento storico newsletter...
                                        </td>
                                    </tr>
                                ) : history.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="text-center py-12 text-gray-400">
                                            Nessuna newsletter inviata finora.
                                        </td>
                                    </tr>
                                ) : (
                                    history.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="p-4 sm:px-6 font-bold text-gray-900">
                                                <div>{item.subject}</div>
                                                {item.preview && <div className="text-xs text-gray-400 font-normal">{item.preview}</div>}
                                            </td>
                                            <td className="p-4 font-mono text-xs text-emerald-700">
                                                {item.targetList}
                                            </td>
                                            <td className="p-4 text-xs text-gray-600">
                                                {item.sentBy || 'Admin'}
                                            </td>
                                            <td className="p-4 sm:pr-6 text-right text-xs text-gray-500 font-medium">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Clock size={12} />
                                                    {new Date(item.sentAt).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 3: GUIDE */}
            {activeTab === 'guide' && (
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-150 shadow-xs space-y-6 max-w-4xl">
                    <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                            💡
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-900">Come funziona la Mailing List su IONOS</h3>
                            <p className="text-xs text-gray-500">Tutti i dettagli tecnici e le buone pratiche per inviare comunicazioni</p>
                        </div>
                    </div>

                    <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
                        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                            <h4 className="font-bold text-emerald-900 mb-1">1. L'indirizzo della Mailing List</h4>
                            <p className="text-xs text-emerald-800">
                                La lista creata su IONOS risponde a: <strong className="font-mono">aggiornamenti@ortofruttabutti.it</strong>.
                                Quando invii una newsletter tramite il pannello qui a fianco, il server invia l'email a questo indirizzo, e IONOS la recapita automaticamente a tutti i membri iscritti.
                            </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
                            <h4 className="font-bold text-blue-900 mb-1">2. Iscrizione e Cancellazione a norma GDPR</h4>
                            <p className="text-xs text-blue-800">
                                Il modulo presente nel Footer e nella Home Page del tuo sito invia la richiesta di iscrizione a IONOS.
                                IONOS gestisce automaticamente il <strong>Double Opt-in</strong> (invia un'email di conferma all'utente con un link da cliccare prima di renderlo effettivo nella lista).
                            </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                            <h4 className="font-bold text-amber-900 mb-1">3. Mittenti Autorizzati nel Pannello IONOS</h4>
                            <p className="text-xs text-amber-800">
                                Nel pannello di controllo IONOS (sezione Email &gt; Mailing List), assicurati che l'indirizzo configurato come mittente (es. <strong className="font-mono">noreply@ortofruttabutti.it</strong>) sia impostato come <strong>"Moderatore"</strong> o <strong>"Autorizzato a inviare senza moderazione"</strong>. In questo modo i tuoi messaggi partiranno subito senza blocchi.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
