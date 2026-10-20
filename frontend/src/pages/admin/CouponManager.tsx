import React, { useState, useEffect } from 'react';
import {
    Tag, Plus, Send, CheckCircle2, AlertTriangle, Trash2, Edit3,
    Copy, Check, Sparkles, Clock, RefreshCw, X
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

const API_URL = import.meta.env.VITE_API_URL || '';

interface CouponItem {
    id: number;
    code: string;
    description: string | null;
    discountType: 'PERCENTAGE' | 'FIXED';
    discountValue: number;
    minSpend: number | null;
    maxDiscount: number | null;
    usageLimit: number | null;
    usageLimitPerUser: number | null;
    timesUsed: number;
    startDate: string | null;
    endDate: string | null;
    isActive: boolean;
    isForNewsletter: boolean;
    isForRegistration: boolean;
    assignedCustomerEmail: string | null;
    createdAt: string;
    _count?: { usages: number; orders: number };
}

interface UsageItem {
    id: number;
    couponId: number;
    orderId: number | null;
    customerEmail: string;
    discountAmount: number;
    usedAt: string;
    coupon?: { code: string; discountType: string; discountValue: number };
}

export const CouponManager: React.FC = () => {
    const { token } = useAuthStore();

    const [activeTab, setActiveTab] = useState<'coupons' | 'usages' | 'welcome'>('coupons');
    const [coupons, setCoupons] = useState<CouponItem[]>([]);
    const [usages, setUsages] = useState<UsageItem[]>([]);
    const [stats, setStats] = useState({ totalCoupons: 0, activeCoupons: 0, totalDiscountGiven: 0, totalUsages: 0 });
    const [isLoading, setIsLoading] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Search and Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'ALL' | 'ACTIVE' | 'WELCOME'>('ALL');

    // Create / Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<CouponItem | null>(null);
    const [formCode, setFormCode] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formDiscountType, setFormDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
    const [formDiscountValue, setFormDiscountValue] = useState<number>(10);
    const [formMinSpend, setFormMinSpend] = useState<string>('0');
    const [formMaxDiscount, setFormMaxDiscount] = useState<string>('');
    const [formUsageLimit, setFormUsageLimit] = useState<string>('');
    const [formUsageLimitPerUser, setFormUsageLimitPerUser] = useState<string>('1');
    const [formStartDate, setFormStartDate] = useState('');
    const [formEndDate, setFormEndDate] = useState('');
    const [formIsActive, setFormIsActive] = useState(true);
    const [formIsForRegistration, setFormIsForRegistration] = useState(false);
    const [formIsForNewsletter, setFormIsForNewsletter] = useState(false);
    const [formAssignedEmail, setFormAssignedEmail] = useState('');

    // Send Promo Modal State
    const [isSendModalOpen, setIsSendModalOpen] = useState(false);
    const [selectedCouponToSend, setSelectedCouponToSend] = useState<number | null>(null);
    const [sendTarget, setSendTarget] = useState<'SPECIFIC' | 'NEWSLETTER_SUBSCRIBERS' | 'VIP_CUSTOMERS' | 'ALL_CUSTOMERS'>('SPECIFIC');
    const [sendSpecificEmail, setSendSpecificEmail] = useState('');
    const [sendCustomMessage, setSendCustomMessage] = useState('');
    const [isSendingPromo, setIsSendingPromo] = useState(false);

    // Welcome Discounts Configuration State
    const [welcomeRegCode, setWelcomeRegCode] = useState('BENVENUTO5');
    const [welcomeRegActive, setWelcomeRegActive] = useState(true);
    const [welcomeRegType, setWelcomeRegType] = useState<'PERCENTAGE' | 'FIXED'>('FIXED');
    const [welcomeRegValue, setWelcomeRegValue] = useState<number>(5);
    const [welcomeRegMinSpend, setWelcomeRegMinSpend] = useState<number>(30);

    const [welcomeNewsCode, setWelcomeNewsCode] = useState('NEWSLETTER10');
    const [welcomeNewsActive, setWelcomeNewsActive] = useState(true);
    const [welcomeNewsType, setWelcomeNewsType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
    const [welcomeNewsValue, setWelcomeNewsValue] = useState<number>(10);
    const [welcomeNewsMinSpend, setWelcomeNewsMinSpend] = useState<number>(25);

    const [isSavingWelcome, setIsSavingWelcome] = useState(false);

    // Copied indicator
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    const showFeedback = (type: 'success' | 'error', message: string) => {
        setFeedback({ type, message });
        setTimeout(() => setFeedback(null), 4000);
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [couponsRes, statsRes, usagesRes, welcomeRes] = await Promise.all([
                fetch(`${API_URL}/api/admin/coupons`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/admin/coupons/stats`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/admin/coupons/usages`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/admin/coupons/welcome-settings`, { headers: { 'Authorization': `Bearer ${token}` } }),
            ]);

            if (couponsRes.ok) {
                const data = await couponsRes.json();
                setCoupons(data);
            }
            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setStats(statsData);
            }
            if (usagesRes.ok) {
                const usagesData = await usagesRes.json();
                setUsages(usagesData);
            }
            if (welcomeRes.ok) {
                const welcomeData = await welcomeRes.json();
                if (welcomeData.registration) {
                    setWelcomeRegCode(welcomeData.registration.code);
                    setWelcomeRegActive(welcomeData.registration.isActive);
                    setWelcomeRegType(welcomeData.registration.discountType);
                    setWelcomeRegValue(welcomeData.registration.discountValue);
                    setWelcomeRegMinSpend(welcomeData.registration.minSpend);
                }
                if (welcomeData.newsletter) {
                    setWelcomeNewsCode(welcomeData.newsletter.code);
                    setWelcomeNewsActive(welcomeData.newsletter.isActive);
                    setWelcomeNewsType(welcomeData.newsletter.discountType);
                    setWelcomeNewsValue(welcomeData.newsletter.discountValue);
                    setWelcomeNewsMinSpend(welcomeData.newsletter.minSpend);
                }
            }
        } catch (err) {
            console.error('Error fetching coupon data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveWelcomeSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingWelcome(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/coupons/welcome-settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    registration: {
                        code: welcomeRegCode.trim().toUpperCase(),
                        isActive: welcomeRegActive,
                        discountType: welcomeRegType,
                        discountValue: Number(welcomeRegValue),
                        minSpend: Number(welcomeRegMinSpend),
                        description: 'Sconto di benvenuto per la registrazione account'
                    },
                    newsletter: {
                        code: welcomeNewsCode.trim().toUpperCase(),
                        isActive: welcomeNewsActive,
                        discountType: welcomeNewsType,
                        discountValue: Number(welcomeNewsValue),
                        minSpend: Number(welcomeNewsMinSpend),
                        description: 'Sconto esclusivo di benvenuto per l\'iscrizione alla newsletter'
                    }
                })
            });

            const data = await res.json();
            if (res.ok) {
                showFeedback('success', 'Impostazioni sconti di benvenuto salvate con successo!');
                fetchData();
            } else {
                showFeedback('error', data.error || 'Errore durante il salvataggio.');
            }
        } catch (err) {
            showFeedback('error', 'Errore di connessione durante il salvataggio.');
        } finally {
            setIsSavingWelcome(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [token]);

    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const generateRandomCode = () => {
        const prefix = formDiscountType === 'PERCENTAGE' ? 'SCONTO' : 'PROMO';
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        setFormCode(`${prefix}${formDiscountValue}-${randomNum}`);
    };

    const openCreateModal = () => {
        setEditingCoupon(null);
        setFormCode('');
        setFormDescription('');
        setFormDiscountType('PERCENTAGE');
        setFormDiscountValue(10);
        setFormMinSpend('0');
        setFormMaxDiscount('');
        setFormUsageLimit('');
        setFormUsageLimitPerUser('1');
        setFormStartDate('');
        setFormEndDate('');
        setFormIsActive(true);
        setFormIsForRegistration(false);
        setFormIsForNewsletter(false);
        setFormAssignedEmail('');
        setIsEditModalOpen(true);
    };

    const openEditModal = (coupon: CouponItem) => {
        setEditingCoupon(coupon);
        setFormCode(coupon.code);
        setFormDescription(coupon.description || '');
        setFormDiscountType(coupon.discountType);
        setFormDiscountValue(
            coupon.discountType === 'FIXED' ? coupon.discountValue / 100 : coupon.discountValue
        );
        setFormMinSpend(coupon.minSpend ? (coupon.minSpend / 100).toString() : '0');
        setFormMaxDiscount(coupon.maxDiscount ? (coupon.maxDiscount / 100).toString() : '');
        setFormUsageLimit(coupon.usageLimit ? coupon.usageLimit.toString() : '');
        setFormUsageLimitPerUser(coupon.usageLimitPerUser ? coupon.usageLimitPerUser.toString() : '1');
        setFormStartDate(coupon.startDate ? coupon.startDate.split('T')[0] : '');
        setFormEndDate(coupon.endDate ? coupon.endDate.split('T')[0] : '');
        setFormIsActive(coupon.isActive);
        setFormIsForRegistration(coupon.isForRegistration);
        setFormIsForNewsletter(coupon.isForNewsletter);
        setFormAssignedEmail(coupon.assignedCustomerEmail || '');
        setIsEditModalOpen(true);
    };

    const handleSaveCoupon = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formCode.trim()) {
            showFeedback('error', 'Inserisci un codice.');
            return;
        }

        const valueNumber = Number(formDiscountValue);
        if (isNaN(valueNumber) || valueNumber <= 0) {
            showFeedback('error', 'Inserisci un valore di sconto valido.');
            return;
        }

        const rawDiscountValue = formDiscountType === 'FIXED'
            ? Math.round(valueNumber * 100)
            : valueNumber;

        const minSpendCents = formMinSpend ? Math.round(Number(formMinSpend) * 100) : 0;
        const maxDiscountCents = formMaxDiscount ? Math.round(Number(formMaxDiscount) * 100) : undefined;
        const usageLimitVal = formUsageLimit ? parseInt(formUsageLimit) : undefined;
        const usageLimitPerUserVal = formUsageLimitPerUser ? parseInt(formUsageLimitPerUser) : 1;

        const payload = {
            code: formCode.trim().toUpperCase(),
            description: formDescription.trim() || undefined,
            discountType: formDiscountType,
            discountValue: rawDiscountValue,
            minSpend: minSpendCents,
            maxDiscount: maxDiscountCents,
            usageLimit: usageLimitVal,
            usageLimitPerUser: usageLimitPerUserVal,
            startDate: formStartDate ? new Date(formStartDate).toISOString() : undefined,
            endDate: formEndDate ? new Date(formEndDate).toISOString() : undefined,
            isActive: formIsActive,
            isForRegistration: formIsForRegistration,
            isForNewsletter: formIsForNewsletter,
            assignedCustomerEmail: formAssignedEmail.trim() || undefined
        };

        try {
            const url = editingCoupon
                ? `${API_URL}/api/admin/coupons/${editingCoupon.id}`
                : `${API_URL}/api/admin/coupons`;
            const method = editingCoupon ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok) {
                showFeedback('success', editingCoupon ? 'Codice sconto aggiornato!' : 'Codice sconto creato con successo!');
                setIsEditModalOpen(false);
                fetchData();
            } else {
                showFeedback('error', data.error || 'Errore durante il salvataggio.');
            }
        } catch (err: any) {
            showFeedback('error', 'Errore di connessione durante il salvataggio.');
        }
    };

    const handleToggleActive = async (coupon: CouponItem) => {
        try {
            const res = await fetch(`${API_URL}/api/admin/coupons/${coupon.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ isActive: !coupon.isActive })
            });
            if (res.ok) {
                showFeedback('success', `Codice ${coupon.code} ${!coupon.isActive ? 'attivato' : 'disattivato'}.`);
                fetchData();
            }
        } catch (err) {
            showFeedback('error', 'Errore aggiornamento stato.');
        }
    };

    const handleDeleteCoupon = async (coupon: CouponItem) => {
        if (!window.confirm(`Sei sicuro di voler eliminare il codice sconto ${coupon.code}? L'azione è irreversibile.`)) {
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/admin/coupons/${coupon.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                showFeedback('success', `Codice sconto ${coupon.code} eliminato.`);
                fetchData();
            } else {
                const data = await res.json();
                showFeedback('error', data.error || 'Impossibile eliminare.');
            }
        } catch (err) {
            showFeedback('error', 'Errore durante l\'eliminazione.');
        }
    };

    const handleSendPromo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCouponToSend) {
            showFeedback('error', 'Seleziona un codice sconto da inviare.');
            return;
        }

        if (sendTarget === 'SPECIFIC' && (!sendSpecificEmail || !sendSpecificEmail.includes('@'))) {
            showFeedback('error', 'Inserisci un indirizzo email valido.');
            return;
        }

        setIsSendingPromo(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/coupons/send-promo`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    couponId: selectedCouponToSend,
                    target: sendTarget,
                    specificEmail: sendSpecificEmail.trim(),
                    customMessage: sendCustomMessage.trim() || undefined
                })
            });

            const data = await res.json();
            if (res.ok) {
                showFeedback('success', `Email promozionale inviata con successo a ${data.sentCount} destinatari!`);
                setIsSendModalOpen(false);
                setSendCustomMessage('');
            } else {
                showFeedback('error', data.error || 'Errore durante l\'invio della promozione.');
            }
        } catch (err) {
            showFeedback('error', 'Errore di connessione durante l\'invio.');
        } finally {
            setIsSendingPromo(false);
        }
    };

    const filteredCoupons = coupons.filter(c => {
        if (filterType === 'ACTIVE') return c.isActive;
        if (filterType === 'WELCOME') return c.isForRegistration || c.isForNewsletter;
        return true;
    }).filter(c => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return c.code.toLowerCase().includes(q) || (c.description && c.description.toLowerCase().includes(q));
    });

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <Tag className="w-8 h-8 text-emerald-600" />
                        Codici Sconto & Promozioni
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Crea coupon personalizzati, imposta sconti di benvenuto (registrazione e newsletter) o invia promozioni mirate.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => {
                            if (coupons.length > 0) {
                                setSelectedCouponToSend(coupons[0].id);
                            }
                            setIsSendModalOpen(true);
                        }}
                        className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer"
                    >
                        <Send size={15} /> Invia a Clienti
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer"
                    >
                        <Plus size={16} /> Nuovo Codice Sconto
                    </button>
                </div>
            </div>

            {feedback && (
                <div className={`p-4 rounded-2xl text-sm font-bold flex items-center gap-2 ${
                    feedback.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                    {feedback.type === 'success' ? <CheckCircle2 size={18} className="shrink-0" /> : <AlertTriangle size={18} className="shrink-0" />}
                    <span>{feedback.message}</span>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Codici Attivi</span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Tag size={16} />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-gray-900 mt-2">
                        {stats.activeCoupons} <span className="text-xs text-gray-400 font-normal">/ {stats.totalCoupons}</span>
                    </div>
                    <div className="text-xs text-emerald-600/80 mt-0.5">Pronti all'uso al checkout</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Sconti Totali Erogati</span>
                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Sparkles size={16} />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-gray-900 mt-2">
                        €{(stats.totalDiscountGiven / 100).toFixed(2)}
                    </div>
                    <div className="text-xs text-amber-600/80 mt-0.5">Risparmio totale per i clienti</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Utilizzi Totali</span>
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <CheckCircle2 size={16} />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-gray-900 mt-2">{stats.totalUsages}</div>
                    <div className="text-xs text-blue-600/80 mt-0.5">Ordini con sconto applicato</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-600">Sconti Benvenuto</span>
                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                            <Sparkles size={16} />
                        </div>
                    </div>
                    <div className="text-sm font-black text-gray-900 mt-2 flex flex-col gap-0.5">
                        <span className="text-emerald-700 font-mono text-xs">🍏 Reg: {coupons.find(c => c.isForRegistration)?.code || 'BENVENUTO5'}</span>
                        <span className="text-teal-700 font-mono text-xs">🌱 News: {coupons.find(c => c.isForNewsletter)?.code || 'NEWSLETTER10'}</span>
                    </div>
                    <div className="text-xs text-purple-600/80 mt-0.5">Rilasciati in automatico</div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-3">
                <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl">
                    <button
                        onClick={() => setActiveTab('coupons')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            activeTab === 'coupons' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        Tutti i Codici ({coupons.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('usages')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            activeTab === 'usages' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        Registro Utilizzi ({usages.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('welcome')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            activeTab === 'welcome' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        ⚙️ Configura Sconti Benvenuto
                    </button>
                </div>

                {activeTab === 'coupons' && (
                    <div className="flex items-center gap-2">
                        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl text-xs font-bold">
                            <button
                                onClick={() => setFilterType('ALL')}
                                className={`px-2.5 py-1 rounded-lg ${filterType === 'ALL' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500'}`}
                            >
                                Tutti
                            </button>
                            <button
                                onClick={() => setFilterType('ACTIVE')}
                                className={`px-2.5 py-1 rounded-lg ${filterType === 'ACTIVE' ? 'bg-white text-emerald-700 shadow-xs' : 'text-gray-500'}`}
                            >
                                Attivi
                            </button>
                            <button
                                onClick={() => setFilterType('WELCOME')}
                                className={`px-2.5 py-1 rounded-lg ${filterType === 'WELCOME' ? 'bg-white text-purple-700 shadow-xs' : 'text-gray-500'}`}
                            >
                                Benvenuto
                            </button>
                        </div>
                        <input
                            type="text"
                            placeholder="Cerca codice..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none w-48"
                        />
                        <button
                            onClick={fetchData}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100"
                            title="Ricarica"
                        >
                            <RefreshCw size={15} />
                        </button>
                    </div>
                )}
            </div>

            {/* TAB 1: COUPONS LIST */}
            {activeTab === 'coupons' && (
                <div className="bg-white rounded-3xl border border-gray-150 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-black uppercase tracking-wider text-gray-400">
                                    <th className="p-4 sm:px-6">Codice Promozione</th>
                                    <th className="p-4">Valore Sconto</th>
                                    <th className="p-4">Condizioni Spesa</th>
                                    <th className="p-4">Utilizzi</th>
                                    <th className="p-4">Stato</th>
                                    <th className="p-4 sm:pr-6 text-right">Azioni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12 text-gray-400">
                                            Caricamento codici sconto...
                                        </td>
                                    </tr>
                                ) : filteredCoupons.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12 text-gray-400">
                                            Nessun codice sconto trovato. Clicca su "+ Nuovo Codice Sconto" per crearne uno!
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCoupons.map((coupon) => (
                                        <tr key={coupon.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="p-4 sm:px-6">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-black text-sm bg-gray-100 text-gray-900 px-2.5 py-1 rounded-lg border border-gray-200">
                                                        {coupon.code}
                                                    </span>
                                                    <button
                                                        onClick={() => handleCopy(coupon.code)}
                                                        className="text-gray-400 hover:text-gray-700 p-1"
                                                        title="Copia codice"
                                                    >
                                                        {copiedCode === coupon.code ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                                    </button>
                                                </div>
                                                {coupon.description && (
                                                    <div className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                                                        {coupon.description}
                                                    </div>
                                                )}
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {coupon.isForRegistration && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                                            🍏 Benvenuto Registrazione
                                                        </span>
                                                    )}
                                                    {coupon.isForNewsletter && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                                                            🌱 Benvenuto Newsletter
                                                        </span>
                                                    )}
                                                    {coupon.assignedCustomerEmail && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                                            🔒 Riservato a {coupon.assignedCustomerEmail}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 font-bold text-gray-900">
                                                <span className="text-emerald-700 text-base font-extrabold">
                                                    {coupon.discountType === 'PERCENTAGE'
                                                        ? `${coupon.discountValue}%`
                                                        : `€${(coupon.discountValue / 100).toFixed(2)}`}
                                                </span>
                                                <span className="text-xs text-gray-400 font-normal block">
                                                    {coupon.discountType === 'PERCENTAGE' ? 'Percentuale' : 'Importo Fisso'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-xs text-gray-600">
                                                <div>
                                                    {coupon.minSpend && coupon.minSpend > 0 ? (
                                                        <span>Spesa min: <strong>€{(coupon.minSpend / 100).toFixed(2)}</strong></span>
                                                    ) : (
                                                        <span className="text-gray-400">Nessun minimo</span>
                                                    )}
                                                </div>
                                                {coupon.endDate && (
                                                    <div className="text-amber-700 mt-0.5 flex items-center gap-1">
                                                        <Clock size={11} />
                                                        Scade il {new Date(coupon.endDate).toLocaleDateString('it-IT')}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 font-mono text-xs">
                                                <span className="font-bold text-gray-900">{coupon.timesUsed}</span>
                                                <span className="text-gray-400"> / {coupon.usageLimit || '∞'}</span>
                                                <span className="text-[10px] text-gray-500 block">max {coupon.usageLimitPerUser || 1} p/cliente</span>
                                            </td>
                                            <td className="p-4">
                                                <button
                                                    onClick={() => handleToggleActive(coupon)}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-all ${
                                                        coupon.isActive
                                                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                    }`}
                                                >
                                                    {coupon.isActive ? <CheckCircle2 size={12} /> : <X size={12} />}
                                                    {coupon.isActive ? 'Attivo' : 'Disattivato'}
                                                </button>
                                            </td>
                                            <td className="p-4 sm:pr-6 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedCouponToSend(coupon.id);
                                                            setIsSendModalOpen(true);
                                                        }}
                                                        className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                                        title="Invia via email"
                                                    >
                                                        <Send size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => openEditModal(coupon)}
                                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                                        title="Modifica"
                                                    >
                                                        <Edit3 size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCoupon(coupon)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                                        title="Elimina"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
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

            {/* TAB 2: USAGES LOG */}
            {activeTab === 'usages' && (
                <div className="bg-white rounded-3xl border border-gray-150 shadow-xs overflow-hidden">
                    <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-gray-900">Storico degli Sconti Riscattati</h3>
                            <p className="text-xs text-gray-500">Elenco di tutti i codici sconto applicati negli ordini dei clienti</p>
                        </div>
                        <button onClick={fetchData} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                            <RefreshCw size={15} />
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-black uppercase tracking-wider text-gray-400">
                                    <th className="p-4 sm:px-6">Codice Sconto</th>
                                    <th className="p-4">Email Cliente</th>
                                    <th className="p-4">Ordine ID</th>
                                    <th className="p-4">Risparmio Concesso</th>
                                    <th className="p-4 sm:pr-6 text-right">Data & Ora</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {usages.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-12 text-gray-400">
                                            Nessun utilizzo registrato finora.
                                        </td>
                                    </tr>
                                ) : (
                                    usages.map((u) => (
                                        <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="p-4 sm:px-6 font-mono font-bold text-emerald-800">
                                                {u.coupon?.code || 'CODICE'}
                                            </td>
                                            <td className="p-4 font-mono text-xs text-gray-700">
                                                {u.customerEmail}
                                            </td>
                                            <td className="p-4 text-xs font-semibold text-gray-900">
                                                {u.orderId ? `#${u.orderId}` : '-'}
                                            </td>
                                            <td className="p-4 font-bold text-emerald-600">
                                                -€{(u.discountAmount / 100).toFixed(2)}
                                            </td>
                                            <td className="p-4 sm:pr-6 text-right text-xs text-gray-500">
                                                {new Date(u.usedAt).toLocaleDateString('it-IT', {
                                                    day: '2-digit', month: '2-digit', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 3: WELCOME SETTINGS CONFIGURATOR */}
            {activeTab === 'welcome' && (
                <div className="space-y-6 max-w-5xl">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-150 shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-2xl shadow-inner">
                                    🎁
                                </div>
                                <div>
                                    <h3 className="font-black text-xl text-gray-900 tracking-tight">Configura Sconti Automatici di Benvenuto</h3>
                                    <p className="text-xs text-gray-500">I codici, gli importi e le condizioni impostati qui vengono erogati automaticamente ai clienti.</p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSaveWelcomeSettings} className="space-y-8 mt-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* CARD 1: SCONTO REGISTRAZIONE */}
                                <div className={`p-6 rounded-3xl border-2 transition-all space-y-4 ${
                                    welcomeRegActive
                                        ? 'bg-emerald-50/40 border-emerald-300'
                                        : 'bg-gray-50 border-gray-200 opacity-80'
                                }`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">🍏</span>
                                            <div>
                                                <h4 className="font-extrabold text-base text-gray-900">Sconto Nuova Registrazione</h4>
                                                <p className="text-[11px] text-gray-500">Inviato dopo la verifica dell'account</p>
                                            </div>
                                        </div>

                                        <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-xs">
                                            <input
                                                type="checkbox"
                                                checked={welcomeRegActive}
                                                onChange={(e) => setWelcomeRegActive(e.target.checked)}
                                                className="w-4 h-4 accent-emerald-600 rounded"
                                            />
                                            <span className={`text-xs font-bold ${welcomeRegActive ? 'text-emerald-700' : 'text-gray-500'}`}>
                                                {welcomeRegActive ? 'Attivo' : 'Disattivato'}
                                            </span>
                                        </label>
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                                Codice Coupon
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={welcomeRegCode}
                                                onChange={(e) => setWelcomeRegCode(e.target.value.toUpperCase())}
                                                className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-gray-200 font-mono font-bold text-sm uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                                    Tipo Sconto
                                                </label>
                                                <select
                                                    value={welcomeRegType}
                                                    onChange={(e) => setWelcomeRegType(e.target.value as any)}
                                                    className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-gray-200 text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                                >
                                                    <option value="FIXED">Importo Fisso (€)</option>
                                                    <option value="PERCENTAGE">Percentuale (%)</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                                    Valore Sconto ({welcomeRegType === 'FIXED' ? '€' : '%'})
                                                </label>
                                                <input
                                                    type="number"
                                                    step={welcomeRegType === 'FIXED' ? '0.5' : '1'}
                                                    min="1"
                                                    required
                                                    value={welcomeRegValue}
                                                    onChange={(e) => setWelcomeRegValue(parseFloat(e.target.value))}
                                                    className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-gray-200 text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                                Spesa Minima Richiesta (€)
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={welcomeRegMinSpend}
                                                onChange={(e) => setWelcomeRegMinSpend(parseFloat(e.target.value) || 0)}
                                                className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-gray-200 text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                            />
                                            <span className="text-[10px] text-gray-400 mt-0.5 block">0 = Nessun minimo di spesa</span>
                                        </div>

                                        <div className="p-3 bg-white/80 rounded-xl border border-emerald-200/60 text-[11px] text-emerald-900 leading-relaxed">
                                            💡 <strong>Come viene recapitato:</strong> Il cliente riceve l'email di benvenuto speciale e vede a schermo il codice non appena attiva il proprio account su <code className="font-mono text-emerald-800">/verify-email</code>.
                                        </div>
                                    </div>
                                </div>

                                {/* CARD 2: SCONTO NEWSLETTER */}
                                <div className={`p-6 rounded-3xl border-2 transition-all space-y-4 ${
                                    welcomeNewsActive
                                        ? 'bg-teal-50/40 border-teal-300'
                                        : 'bg-gray-50 border-gray-200 opacity-80'
                                }`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">🌱</span>
                                            <div>
                                                <h4 className="font-extrabold text-base text-gray-900">Sconto Iscrizione Newsletter</h4>
                                                <p className="text-[11px] text-gray-500">Consegnato dopo il Double Opt-in</p>
                                            </div>
                                        </div>

                                        <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-xs">
                                            <input
                                                type="checkbox"
                                                checked={welcomeNewsActive}
                                                onChange={(e) => setWelcomeNewsActive(e.target.checked)}
                                                className="w-4 h-4 accent-teal-600 rounded"
                                            />
                                            <span className={`text-xs font-bold ${welcomeNewsActive ? 'text-teal-700' : 'text-gray-500'}`}>
                                                {welcomeNewsActive ? 'Attivo' : 'Disattivato'}
                                            </span>
                                        </label>
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                                Codice Coupon
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={welcomeNewsCode}
                                                onChange={(e) => setWelcomeNewsCode(e.target.value.toUpperCase())}
                                                className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-gray-200 font-mono font-bold text-sm uppercase focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                                    Tipo Sconto
                                                </label>
                                                <select
                                                    value={welcomeNewsType}
                                                    onChange={(e) => setWelcomeNewsType(e.target.value as any)}
                                                    className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-gray-200 text-xs font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                                >
                                                    <option value="PERCENTAGE">Percentuale (%)</option>
                                                    <option value="FIXED">Importo Fisso (€)</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                                    Valore Sconto ({welcomeNewsType === 'FIXED' ? '€' : '%'})
                                                </label>
                                                <input
                                                    type="number"
                                                    step={welcomeNewsType === 'FIXED' ? '0.5' : '1'}
                                                    min="1"
                                                    required
                                                    value={welcomeNewsValue}
                                                    onChange={(e) => setWelcomeNewsValue(parseFloat(e.target.value))}
                                                    className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-gray-200 text-xs font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                                Spesa Minima Richiesta (€)
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={welcomeNewsMinSpend}
                                                onChange={(e) => setWelcomeNewsMinSpend(parseFloat(e.target.value) || 0)}
                                                className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-gray-200 text-xs font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                            />
                                            <span className="text-[10px] text-gray-400 mt-0.5 block">0 = Nessun minimo di spesa</span>
                                        </div>

                                        <div className="p-3 bg-white/80 rounded-xl border border-teal-200/60 text-[11px] text-teal-900 leading-relaxed">
                                            💡 <strong>Come viene recapitato:</strong> L'iscritto vede il codice evidenziato nella pagina <code className="font-mono text-teal-800">/newsletter/conferma</code> non appena clicca sul pulsante verde dell'email di conferma.
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-150 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <p className="text-xs text-gray-500">
                                    Le modifiche avranno effetto immediato per tutti i nuovi iscritti e registrati.
                                </p>
                                <button
                                    type="submit"
                                    disabled={isSavingWelcome}
                                    className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    {isSavingWelcome ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <CheckCircle2 size={18} />
                                    )}
                                    Salva Configurazione Sconti Benvenuto
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CREATE / EDIT MODAL */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setIsEditModalOpen(false)}
                            className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1"
                        >
                            <X size={20} />
                        </button>

                        <h3 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                            <Tag className="w-5 h-5 text-emerald-600" />
                            {editingCoupon ? `Modifica Codice: ${editingCoupon.code}` : 'Crea Nuovo Codice Sconto'}
                        </h3>
                        <p className="text-xs text-gray-500 mb-6">
                            Imposta le regole, la spesa minima e i limiti di utilizzo del coupon.
                        </p>

                        <form onSubmit={handleSaveCoupon} className="space-y-4 text-xs">
                            {/* Code & Generate */}
                            <div>
                                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Codice Coupon *
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        required
                                        placeholder="Es. ESTATE10, BENVENUTO..."
                                        value={formCode}
                                        onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 font-mono font-bold text-sm uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={generateRandomCode}
                                        className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors cursor-pointer"
                                    >
                                        Genera
                                    </button>
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Descrizione / Note
                                </label>
                                <input
                                    type="text"
                                    placeholder="Es. Sconto 10% per inizio estate"
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                />
                            </div>

                            {/* Discount Type & Value */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Tipo di Sconto *
                                    </label>
                                    <select
                                        value={formDiscountType}
                                        onChange={(e) => setFormDiscountType(e.target.value as any)}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                    >
                                        <option value="PERCENTAGE">Percentuale (%)</option>
                                        <option value="FIXED">Importo Fisso (€)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Valore Sconto *
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step={formDiscountType === 'FIXED' ? '0.5' : '1'}
                                            min="0.5"
                                            required
                                            value={formDiscountValue}
                                            onChange={(e) => setFormDiscountValue(parseFloat(e.target.value))}
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                        />
                                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-bold text-gray-400">
                                            {formDiscountType === 'PERCENTAGE' ? '%' : '€'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Min Spend & Max Discount */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Spesa Minima (€)
                                    </label>
                                    <input
                                        type="number"
                                        step="1"
                                        min="0"
                                        placeholder="0 = Nessun minimo"
                                        value={formMinSpend}
                                        onChange={(e) => setFormMinSpend(e.target.value)}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Tetto Max Sconto (€)
                                    </label>
                                    <input
                                        type="number"
                                        step="1"
                                        placeholder="Opzionale (solo per %)"
                                        value={formMaxDiscount}
                                        onChange={(e) => setFormMaxDiscount(e.target.value)}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Usage Limits */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Limite Utilizzi Totali
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="Illimitato se vuoto"
                                        value={formUsageLimit}
                                        onChange={(e) => setFormUsageLimit(e.target.value)}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Limite per Cliente
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formUsageLimitPerUser}
                                        onChange={(e) => setFormUsageLimitPerUser(e.target.value)}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Start & End Dates */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Data Inizio
                                    </label>
                                    <input
                                        type="date"
                                        value={formStartDate}
                                        onChange={(e) => setFormStartDate(e.target.value)}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Data Fine (Scadenza)
                                    </label>
                                    <input
                                        type="date"
                                        value={formEndDate}
                                        onChange={(e) => setFormEndDate(e.target.value)}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Assigned email */}
                            <div>
                                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Riserva ad un'email specifica (Opzionale)
                                </label>
                                <input
                                    type="email"
                                    placeholder="Lascia vuoto per renderlo valido per tutti"
                                    value={formAssignedEmail}
                                    onChange={(e) => setFormAssignedEmail(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                />
                            </div>

                            {/* Special Toggles */}
                            <div className="pt-2 border-t border-gray-150 space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formIsForRegistration}
                                        onChange={(e) => {
                                            setFormIsForRegistration(e.target.checked);
                                            if (e.target.checked) setFormIsForNewsletter(false);
                                        }}
                                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                                    />
                                    <span className="font-bold text-gray-800">
                                        🍏 Usa come Sconto Benvenuto Nuova Registrazione Account
                                    </span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formIsForNewsletter}
                                        onChange={(e) => {
                                            setFormIsForNewsletter(e.target.checked);
                                            if (e.target.checked) setFormIsForRegistration(false);
                                        }}
                                        className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                                    />
                                    <span className="font-bold text-gray-800">
                                        🌱 Usa come Sconto Benvenuto Nuova Iscrizione Newsletter
                                    </span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formIsActive}
                                        onChange={(e) => setFormIsActive(e.target.checked)}
                                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                                    />
                                    <span className="font-bold text-gray-800">
                                        Attivo immediatamente
                                    </span>
                                </label>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold text-gray-700 transition-colors"
                                >
                                    Annulla
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-md shadow-emerald-600/20"
                                >
                                    {editingCoupon ? 'Salva Modifiche' : 'Crea Codice Sconto'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* SEND PROMO MODAL */}
            {isSendModalOpen && (
                <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setIsSendModalOpen(false)}
                            className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1"
                        >
                            <X size={20} />
                        </button>

                        <h3 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                            <Send className="w-5 h-5 text-amber-500" />
                            Invia Codice Sconto ai Clienti
                        </h3>
                        <p className="text-xs text-gray-500 mb-6">
                            Spedisci un'email brandizzata con il codice promozionale pronto da usare.
                        </p>

                        <form onSubmit={handleSendPromo} className="space-y-4 text-xs">
                            {/* Choose Coupon */}
                            <div>
                                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Seleziona Codice da Inviare *
                                </label>
                                <select
                                    value={selectedCouponToSend || ''}
                                    onChange={(e) => setSelectedCouponToSend(Number(e.target.value))}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                >
                                    {coupons.filter(c => c.isActive).map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.code} - {c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : `€${(c.discountValue / 100).toFixed(2)}`} {c.minSpend ? `(Min. €${(c.minSpend / 100).toFixed(2)})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Choose Target */}
                            <div>
                                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    A chi inviare l'email? *
                                </label>
                                <select
                                    value={sendTarget}
                                    onChange={(e) => setSendTarget(e.target.value as any)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                >
                                    <option value="SPECIFIC">🎯 Singolo Cliente Specifico</option>
                                    <option value="VIP_CUSTOMERS">👑 Clienti VIP (più ordini / spesa alta)</option>
                                    <option value="NEWSLETTER_SUBSCRIBERS">🌱 Tutti gli iscritti alla Newsletter</option>
                                    <option value="ALL_CUSTOMERS">👥 Tutti i Clienti Registrati</option>
                                </select>
                            </div>

                            {sendTarget === 'SPECIFIC' && (
                                <div>
                                    <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Email del Cliente *
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="cliente@esempio.it"
                                        value={sendSpecificEmail}
                                        onChange={(e) => setSendSpecificEmail(e.target.value)}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                    />
                                </div>
                            )}

                            {/* Custom Message */}
                            <div>
                                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Messaggio Personalizzato (Opzionale)
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Es. Ti ringraziamo per essere nostro cliente fedele! Abbiamo pensato ad un regalo per la tua prossima spesa..."
                                    value={sendCustomMessage}
                                    onChange={(e) => setSendCustomMessage(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                />
                            </div>

                            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 leading-relaxed">
                                <span className="font-bold">📧 Anteprima Consegna:</span> Il destinatario riceverà un'email curata con il logo di Ortofrutta Butti, il riquadro verde con il codice evidenziato e un pulsante per iniziare gli acquisti.
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsSendModalOpen(false)}
                                    className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold text-gray-700 transition-colors"
                                >
                                    Annulla
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSendingPromo}
                                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isSendingPromo ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Send size={15} />
                                    )}
                                    Invia Email Promozionale
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
export default CouponManager;
