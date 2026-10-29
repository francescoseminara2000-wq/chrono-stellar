import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import {
    Search,
    Mail,
    Phone,
    Calendar,
    ShoppingBag,
    TrendingUp,
    ArrowLeft,
    Edit2,
    Save,
    X,
    Bell,
    Camera,
    Trash2,
    UserPlus,
    Shield,
    Wallet,
    MapPin,
    ExternalLink,
    Download,
    Filter,
    ArrowUpDown,
    Plus,
    Minus,
    Crown,
    MessageCircle,
    Coins
} from 'lucide-react';
import { sanitizeImageUrl } from '../../utils/imageUrl';
import { UserCreationModal } from '../../components/admin/UserCreationModal';
import { ConfirmModal } from '../../components/admin/ConfirmModal';

interface OrderSummary {
    id: number;
    finalTotal: number | null;
    estimatedTotal: number;
    createdAt: string;
    status: string;
    deliveryMethod?: 'PICKUP' | 'DELIVERY';
    scheduledDate?: string | null;
    scheduledTime?: string | null;
    itemsCount?: number;
}

interface CustomerStats {
    totalOrders: number;
    totalSpent: number;
}

interface Customer {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    city: string | null;
    street: string | null;
    civic: string | null;
    zipCode: string | null;
    notificationPreference: 'EMAIL' | 'WHATSAPP';
    createdAt: string;
    avatar: string | null;
    role?: string;
    walletBalance: number;
    stats: CustomerStats;
    orders: OrderSummary[];
}

export const CustomerManager = () => {
    const { token } = useAuthStore();
    const { addToast, addRichToast } = useToastStore();
    const navigate = useNavigate();

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<'ALL' | 'CUSTOMER' | 'ADMIN'>('ALL');
    const [segmentFilter, setSegmentFilter] = useState<'ALL' | 'ACTIVE' | 'NEW' | 'VIP' | 'HAS_WALLET'>('ALL');
    const [sortBy, setSortBy] = useState<'recent' | 'spent' | 'orders' | 'wallet' | 'name'>('recent');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<Partial<Customer> & { password?: string }>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [availableAvatars, setAvailableAvatars] = useState<string[]>([]);
    const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);

    // Wallet adjustment modal state
    const [walletModal, setWalletModal] = useState<{
        isOpen: boolean;
        customer: Customer | null;
        amount: string;
        action: 'CREDIT' | 'DEBIT';
        description: string;
        isSubmitting: boolean;
    }>({
        isOpen: false,
        customer: null,
        amount: '',
        action: 'CREDIT',
        description: '',
        isSubmitting: false
    });

    // Confirmation modal state
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    } | null>(null);

    const API_URL = '';

    useEffect(() => {
        if (token) fetchCustomers();
    }, [token]);

    const fetchCustomers = async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/customers`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    setCustomers(data);
                    // Sync selected customer if present
                    if (selectedCustomer) {
                        const fresh = data.find(c => c.id === selectedCustomer.id);
                        if (fresh) setSelectedCustomer(fresh);
                    }
                }
            } else {
                addToast('Impossibile caricare l\'elenco clienti.', 'error');
            }
        } catch (err) {
            console.error('Fetch error:', err);
            addToast('Errore di connessione al server.', 'error');
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    // Calculate Global KPIs
    const metrics = useMemo(() => {
        const totalCustomers = customers.length;
        const totalAdmins = customers.filter(c => c.role === 'ADMIN').length;
        const totalRegularCustomers = totalCustomers - totalAdmins;
        const totalSpentAll = customers.reduce((sum, c) => sum + (c.stats.totalSpent || 0), 0);
        const totalOrdersAll = customers.reduce((sum, c) => sum + (c.stats.totalOrders || 0), 0);
        const aov = totalOrdersAll > 0 ? (totalSpentAll / totalOrdersAll) / 100 : 0;
        const activeCount = customers.filter(c => c.stats.totalOrders > 0).length;
        const activePercentage = totalCustomers > 0 ? Math.round((activeCount / totalCustomers) * 100) : 0;
        const totalWalletLiability = customers.reduce((sum, c) => sum + (c.walletBalance || 0), 0) / 100;

        return {
            totalCustomers,
            totalAdmins,
            totalRegularCustomers,
            totalSpentAll: (totalSpentAll / 100).toFixed(2),
            aov: aov.toFixed(2),
            activeCount,
            activePercentage,
            totalWalletLiability: totalWalletLiability.toFixed(2)
        };
    }, [customers]);

    // Filter and Sort Customers
    const filteredCustomers = useMemo(() => {
        return customers
            .filter(c => {
                // Search query
                const q = search.trim().toLowerCase();
                const matchesSearch =
                    !q ||
                    c.name.toLowerCase().includes(q) ||
                    c.email.toLowerCase().includes(q) ||
                    (c.phone && c.phone.includes(q)) ||
                    (c.city && c.city.toLowerCase().includes(q));

                if (!matchesSearch) return false;

                // Role filter
                if (roleFilter !== 'ALL' && c.role !== roleFilter) return false;

                // Segment filter
                const isVIP = (c.stats.totalSpent >= 10000 || c.stats.totalOrders >= 4);
                if (segmentFilter === 'ACTIVE' && c.stats.totalOrders === 0) return false;
                if (segmentFilter === 'NEW' && c.stats.totalOrders > 0) return false;
                if (segmentFilter === 'VIP' && !isVIP) return false;
                if (segmentFilter === 'HAS_WALLET' && (!c.walletBalance || c.walletBalance <= 0)) return false;

                return true;
            })
            .sort((a, b) => {
                let cmp = 0;
                if (sortBy === 'recent') {
                    cmp = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                } else if (sortBy === 'spent') {
                    cmp = (b.stats.totalSpent || 0) - (a.stats.totalSpent || 0);
                } else if (sortBy === 'orders') {
                    cmp = (b.stats.totalOrders || 0) - (a.stats.totalOrders || 0);
                } else if (sortBy === 'wallet') {
                    cmp = (b.walletBalance || 0) - (a.walletBalance || 0);
                } else if (sortBy === 'name') {
                    cmp = a.name.localeCompare(b.name);
                }
                return sortDirection === 'desc' ? cmp : -cmp;
            });
    }, [customers, search, roleFilter, segmentFilter, sortBy, sortDirection]);

    const handleEditCustomer = (customer: Customer) => {
        setEditData({
            name: customer.name,
            email: customer.email,
            phone: customer.phone || '',
            street: customer.street || '',
            civic: customer.civic || '',
            city: customer.city || '',
            zipCode: customer.zipCode || '',
            notificationPreference: customer.notificationPreference || 'EMAIL',
            avatar: customer.avatar || null,
            role: customer.role || 'CUSTOMER',
            password: ''
        });
        setIsEditing(true);

        fetch(`${API_URL}/api/avatars`)
            .then(r => r.json())
            .then(data => Array.isArray(data) && setAvailableAvatars(data))
            .catch(() => { });
    };

    const handleAvatarUpload = async (file: File) => {
        setIsUploadingAvatar(true);
        try {
            const formData = new FormData();
            formData.append('image', file);
            const res = await fetch(`${API_URL}/api/admin/avatars`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            if (res.ok) {
                const data = await res.json();
                setEditData(prev => ({ ...prev, avatar: data.url }));
                addToast('Foto profilo caricata!', 'success');
            } else {
                addToast('Errore durante il caricamento dell\'immagine.', 'error');
            }
        } catch {
            addToast('Errore di connessione durante l\'upload.', 'error');
        } finally {
            setIsUploadingAvatar(false);
            fetch(`${API_URL}/api/avatars`)
                .then(r => r.json())
                .then(data => Array.isArray(data) && setAvailableAvatars(data))
                .catch(() => { });
        }
    };

    const handleSaveCustomer = async () => {
        if (!selectedCustomer) return;
        setIsSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/customers/${selectedCustomer.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(editData)
            });
            if (res.ok) {
                const updated = await res.json();
                setCustomers(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
                setSelectedCustomer(prev => prev ? { ...prev, ...updated } : null);
                setIsEditing(false);
                addToast(`Dati di ${updated.name} aggiornati con successo!`, 'success');
            } else {
                const err = await res.json();
                addToast(`Errore: ${err.error || 'Impossibile salvare'}`, 'error');
            }
        } catch (error) {
            console.error('Save error:', error);
            addToast('Errore di connessione durante il salvataggio.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteCustomer = (customer: Customer) => {
        if (customer.stats.totalOrders > 0) {
            setConfirmModal({
                isOpen: true,
                title: 'Eliminazione Non Consentita',
                message: `Il cliente "${customer.name}" possiede ${customer.stats.totalOrders} ordini registrati nello storico. Per obblighi di tracciabilità e contabilità fiscale, l'account non può essere cancellato. Puoi eventualmente declassarlo o modificare i suoi recapiti.`,
                onConfirm: () => setConfirmModal(null)
            });
            return;
        }

        setConfirmModal({
            isOpen: true,
            title: 'Conferma Eliminazione Cliente',
            message: `Sei sicuro di voler eliminare definitivamente l'account di "${customer.name}" (${customer.email})? Questa operazione è irreversibile.`,
            onConfirm: async () => {
                try {
                    const res = await fetch(`${API_URL}/api/admin/customers/${customer.id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        setCustomers(prev => prev.filter(c => c.id !== customer.id));
                        if (selectedCustomer?.id === customer.id) {
                            setSelectedCustomer(null);
                        }
                        addToast(`Cliente "${customer.name}" eliminato.`, 'info');
                    } else {
                        const err = await res.json();
                        addToast(`Errore: ${err.error || 'Eliminazione non riuscita'}`, 'error');
                    }
                } catch {
                    addToast('Errore di rete durante l\'eliminazione.', 'error');
                }
            }
        });
    };

    const handleOpenWalletModal = (customer: Customer) => {
        setWalletModal({
            isOpen: true,
            customer,
            amount: '',
            action: 'CREDIT',
            description: '',
            isSubmitting: false
        });
    };

    const handleConfirmWalletAdjustment = async () => {
        if (!walletModal.customer) return;
        const rawAmount = parseFloat(walletModal.amount.replace(',', '.'));
        if (isNaN(rawAmount) || rawAmount <= 0) {
            addToast('Inserisci un importo valido maggiore di zero.', 'warning');
            return;
        }

        const centsDelta = Math.round(rawAmount * 100) * (walletModal.action === 'CREDIT' ? 1 : -1);
        const currentBalance = walletModal.customer.walletBalance || 0;
        if (walletModal.action === 'DEBIT' && currentBalance + centsDelta < 0) {
            addToast('Il saldo non può diventare negativo.', 'warning');
            return;
        }

        setWalletModal(prev => ({ ...prev, isSubmitting: true }));
        try {
            const res = await fetch(`${API_URL}/api/admin/customers/${walletModal.customer.id}/wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    amountCents: centsDelta,
                    description: walletModal.description || (walletModal.action === 'CREDIT' ? 'Ricarica manuale credito' : 'Rettifica manuale credito')
                })
            });

            if (res.ok) {
                const data = await res.json();
                const newBalance = data.walletBalance;

                setCustomers(prev =>
                    prev.map(c => c.id === walletModal.customer!.id ? { ...c, walletBalance: newBalance } : c)
                );
                if (selectedCustomer && selectedCustomer.id === walletModal.customer.id) {
                    setSelectedCustomer(prev => prev ? { ...prev, walletBalance: newBalance } : null);
                }

                addRichToast(
                    'Borsellino Aggiornato!',
                    `${walletModal.action === 'CREDIT' ? 'Accreditati' : 'Addebitati'} € ${rawAmount.toFixed(2)} a ${walletModal.customer.name}. Nuovo saldo: € ${(newBalance / 100).toFixed(2)}`,
                    'success'
                );

                setWalletModal({
                    isOpen: false,
                    customer: null,
                    amount: '',
                    action: 'CREDIT',
                    description: '',
                    isSubmitting: false
                });
            } else {
                const err = await res.json();
                addToast(`Errore: ${err.error || 'Operazione fallita'}`, 'error');
                setWalletModal(prev => ({ ...prev, isSubmitting: false }));
            }
        } catch (err) {
            console.error('Wallet adjust error:', err);
            addToast('Errore di connessione al server.', 'error');
            setWalletModal(prev => ({ ...prev, isSubmitting: false }));
        }
    };

    const handleExportCSV = () => {
        if (filteredCustomers.length === 0) {
            addToast('Nessun cliente da esportare con i filtri attuali.', 'warning');
            return;
        }

        const headers = [
            'ID',
            'Nome Completo',
            'Email',
            'Telefono',
            'Città',
            'Indirizzo',
            'Civico',
            'CAP',
            'Ruolo',
            'Preferenza Notifiche',
            'Saldo Borsellino (€)',
            'Totale Ordini',
            'Totale Speso LTV (€)',
            'Data Registrazione'
        ];

        const rows = filteredCustomers.map(c => [
            c.id,
            `"${(c.name || '').replace(/"/g, '""')}"`,
            `"${(c.email || '').replace(/"/g, '""')}"`,
            `"${(c.phone || '').replace(/"/g, '""')}"`,
            `"${(c.city || '').replace(/"/g, '""')}"`,
            `"${(c.street || '').replace(/"/g, '""')}"`,
            `"${(c.civic || '').replace(/"/g, '""')}"`,
            `"${(c.zipCode || '').replace(/"/g, '""')}"`,
            c.role || 'CUSTOMER',
            c.notificationPreference || 'EMAIL',
            ((c.walletBalance || 0) / 100).toFixed(2),
            c.stats.totalOrders || 0,
            ((c.stats.totalSpent || 0) / 100).toFixed(2),
            new Date(c.createdAt).toLocaleDateString('it-IT')
        ]);

        const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clienti_orto_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        addToast(`Esportati ${filteredCustomers.length} clienti in CSV!`, 'success');
    };

    const formatWhatsAppUrl = (phone: string, name: string) => {
        let clean = phone.replace(/\D/g, '');
        if (clean.length === 10 && !clean.startsWith('39')) {
            clean = '39' + clean;
        }
        const text = encodeURIComponent(`Ciao ${name}! Ti contattiamo da L'Orto di Franci in merito al tuo account ed ai tuoi ordini. Come possiamo aiutarti?`);
        return `https://wa.me/${clean}?text=${text}`;
    };

    const renderStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
            WEIGHING_COMPLETED: 'bg-blue-100 text-blue-800 border-blue-200',
            OUT_FOR_DELIVERY: 'bg-purple-100 text-purple-800 border-purple-200',
            DELIVERED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
            CANCELLED: 'bg-red-100 text-red-800 border-red-200',
        };
        const labels: Record<string, string> = {
            PENDING: 'In Attesa',
            WEIGHING_COMPLETED: 'Pesato',
            OUT_FOR_DELIVERY: 'In Consegna',
            DELIVERED: 'Consegnato',
            CANCELLED: 'Annullato',
        };
        return (
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
                {labels[status] || status}
            </span>
        );
    };

    return (
        <div className="flex flex-col h-full bg-[#f8faf9] -m-5 md:-m-8 p-4 sm:p-6 md:p-8 overflow-y-auto custom-scrollbar leading-relaxed">
            {/* Header & Global Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-nature-700 text-white flex items-center justify-center font-black shadow-md shadow-nature-700/20">
                            👥
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Gestione Clienti & CRM</h1>
                            <p className="text-xs sm:text-sm text-gray-500 font-semibold mt-0.5">Anagrafica, Borsellino Digitale, Storico Ordini e Fidelizzazione</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                    <button
                        type="button"
                        onClick={handleExportCSV}
                        className="px-4 py-2.5 bg-white hover:bg-gray-50 active:scale-95 text-gray-700 font-black text-xs sm:text-sm rounded-xl border border-gray-200 shadow-2xs flex items-center gap-2 transition-all cursor-pointer"
                        title="Esporta elenco filtrato in CSV"
                    >
                        <Download size={16} className="text-gray-500" />
                        <span>Esporta CSV</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsCreationModalOpen(true)}
                        className="px-4 py-2.5 bg-nature-600 hover:bg-nature-700 active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl shadow-md shadow-nature-600/30 flex items-center gap-2 transition-all cursor-pointer"
                    >
                        <UserPlus size={16} />
                        <span>Nuovo Utente</span>
                    </button>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                {/* 1. Totale Clienti */}
                <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs relative overflow-hidden">
                    <div className="flex items-center justify-between text-gray-400 mb-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-gray-500">Totale Utenti</span>
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center text-xs">
                            👤
                        </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-gray-900 leading-none">
                        {metrics.totalCustomers}
                    </div>
                    <div className="text-[11px] font-bold text-gray-500 mt-2">
                        {metrics.totalRegularCustomers} clienti • {metrics.totalAdmins} admin
                    </div>
                </div>

                {/* 2. Fatturato Totale (LTV) */}
                <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs relative overflow-hidden">
                    <div className="flex items-center justify-between text-gray-400 mb-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-gray-500">Fatturato LTV</span>
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                            <TrendingUp size={14} />
                        </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-blue-900 leading-none">
                        € {metrics.totalSpentAll}
                    </div>
                    <div className="text-[11px] font-bold text-blue-600 mt-2">
                        Valore storico generato
                    </div>
                </div>

                {/* 3. Scontrino Medio (AOV) */}
                <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs relative overflow-hidden">
                    <div className="flex items-center justify-between text-gray-400 mb-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-gray-500">Scontrino Medio</span>
                        <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                            <ShoppingBag size={14} />
                        </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-gray-900 leading-none">
                        € {metrics.aov}
                    </div>
                    <div className="text-[11px] font-bold text-amber-700 mt-2">
                        Media spesa per ordine
                    </div>
                </div>

                {/* 4. Clienti Attivi & Borsellino */}
                <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs relative overflow-hidden">
                    <div className="flex items-center justify-between text-gray-400 mb-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-gray-500">Borsellino Circolante</span>
                        <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                            <Wallet size={14} />
                        </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-purple-900 leading-none">
                        € {metrics.totalWalletLiability}
                    </div>
                    <div className="text-[11px] font-bold text-emerald-700 mt-2">
                        {metrics.activePercentage}% clienti hanno ordinato
                    </div>
                </div>
            </div>

            {/* Filter & Control Bar */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200/90 shadow-2xs mb-6 space-y-3">
                <div className="flex flex-col md:flex-row gap-3">
                    {/* Search Field */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                        <input
                            type="text"
                            placeholder="Cerca cliente per nome, email, telefono o città..."
                            className="w-full pl-10 pr-9 py-2.5 bg-gray-50/80 hover:bg-gray-50 focus:bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-nature-500/30 focus:border-nature-500 outline-none text-xs sm:text-sm font-bold text-gray-800 transition-all placeholder:text-gray-400"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                            >
                                <X size={15} />
                            </button>
                        )}
                    </div>

                    {/* Sorting selector */}
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-xs font-bold text-gray-700">
                            <ArrowUpDown size={14} className="text-gray-400" />
                            <span>Ordina:</span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="bg-transparent font-black text-gray-900 outline-none cursor-pointer"
                            >
                                <option value="recent">Più Recenti</option>
                                <option value="spent">Maggior Spesa (LTV)</option>
                                <option value="orders">Più Ordini</option>
                                <option value="wallet">Saldo Borsellino</option>
                                <option value="name">Nome (A-Z)</option>
                            </select>
                        </div>

                        <button
                            type="button"
                            onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                            className="p-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-gray-600 transition-colors cursor-pointer"
                            title={sortDirection === 'desc' ? 'Decrescente' : 'Crescente'}
                        >
                            {sortDirection === 'desc' ? '↓' : '↑'}
                        </button>
                    </div>
                </div>

                {/* Segment Chips & Role Filters */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100 flex-wrap">
                    {/* Segment Filter Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 mr-1 flex items-center gap-1">
                            <Filter size={12} /> Filtra:
                        </span>
                        {[
                            { id: 'ALL', label: 'Tutti' },
                            { id: 'ACTIVE', label: 'Attivi (con ordini)' },
                            { id: 'VIP', label: '👑 Top VIP' },
                            { id: 'HAS_WALLET', label: '👛 Con Borsellino' },
                            { id: 'NEW', label: 'Nuovi (0 ordini)' },
                        ].map(s => (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => setSegmentFilter(s.id as any)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${segmentFilter === s.id
                                    ? 'bg-nature-700 text-white shadow-2xs'
                                    : 'bg-gray-100/80 hover:bg-gray-100 text-gray-600 border border-transparent'
                                    }`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>

                    {/* Role Filter Chips */}
                    <div className="flex items-center gap-1">
                        {(['ALL', 'CUSTOMER', 'ADMIN'] as const).map(r => (
                            <button
                                key={r}
                                type="button"
                                onClick={() => setRoleFilter(r)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${roleFilter === r
                                    ? 'bg-gray-900 text-white'
                                    : 'bg-gray-50 hover:bg-gray-100 text-gray-500'
                                    }`}
                            >
                                {r === 'ALL' ? 'Tutti i ruoli' : r === 'CUSTOMER' ? 'Solo Clienti' : 'Solo Admin'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main CRM Grid: Left List + Right Detail */}
            <div className={`grid grid-cols-1 ${selectedCustomer ? 'lg:grid-cols-12' : ''} gap-6 flex-1 min-h-0`}>

                {/* LEFT LIST COLUMN */}
                <div className={`flex flex-col bg-white rounded-3xl shadow-sm border border-gray-200/90 overflow-hidden ${selectedCustomer ? 'hidden lg:flex lg:col-span-5 xl:col-span-4' : 'flex-1'}`}>
                    <div className="p-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <span className="text-xs font-black uppercase tracking-wider text-gray-500">
                            Clienti ({filteredCustomers.length})
                        </span>
                        {isLoading && (
                            <span className="text-xs font-bold text-nature-600 animate-pulse">Aggiornamento...</span>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
                        {filteredCustomers.map(customer => {
                            const isSelected = selectedCustomer?.id === customer.id;
                            const isVIP = (customer.stats.totalSpent >= 10000 || customer.stats.totalOrders >= 4);

                            return (
                                <div
                                    key={customer.id}
                                    onClick={() => {
                                        setSelectedCustomer(customer);
                                        setIsEditing(false);
                                    }}
                                    className={`group p-3.5 rounded-2xl border transition-all cursor-pointer relative ${isSelected
                                        ? 'border-nature-500 ring-2 ring-nature-500/20 bg-nature-50/40 shadow-xs'
                                        : 'border-gray-200/80 hover:border-nature-300 hover:bg-gray-50/80 shadow-2xs'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Avatar with fixed dimensions */}
                                        <div className="w-12 h-12 min-w-[48px] min-h-[48px] max-w-[48px] max-h-[48px] rounded-2xl bg-nature-100 border border-nature-200/80 flex items-center justify-center text-nature-800 font-black text-base overflow-hidden shrink-0 shadow-2xs relative">
                                            {customer.avatar ? (
                                                <img src={sanitizeImageUrl(customer.avatar)} alt="" className="w-full h-full object-cover rounded-2xl block" />
                                            ) : (
                                                customer.name.charAt(0).toUpperCase()
                                            )}
                                            {isVIP && (
                                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-amber-950 rounded-full flex items-center justify-center border border-white shadow-2xs">
                                                    <Crown size={9} />
                                                </span>
                                            )}
                                        </div>

                                        {/* Customer Core Info */}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-1 mb-0.5">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <h3 className="font-black text-sm text-gray-900 truncate leading-snug">
                                                        {customer.name}
                                                    </h3>
                                                    {customer.role === 'ADMIN' && (
                                                        <span className="px-1.5 py-0.2 bg-purple-100 text-purple-700 border border-purple-200 rounded-md text-[9px] font-black uppercase shrink-0 flex items-center gap-0.5">
                                                            <Shield size={9} /> ADMIN
                                                        </span>
                                                    )}
                                                </div>

                                                <span className="text-xs font-black text-gray-900 shrink-0">
                                                    € {(customer.stats.totalSpent / 100).toFixed(2)}
                                                </span>
                                            </div>

                                            <p className="text-[11px] font-bold text-gray-400 truncate mb-2">
                                                {customer.email}
                                            </p>

                                            {/* Micro-metrics & Quick Badges */}
                                            <div className="flex items-center justify-between text-[11px] gap-2 pt-2 border-t border-gray-100/80">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-extrabold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                                                        {customer.stats.totalOrders} ordini
                                                    </span>

                                                    {customer.walletBalance > 0 && (
                                                        <span className="font-black text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded-md text-[10px]">
                                                            Borsellino: € {(customer.walletBalance / 100).toFixed(2)}
                                                        </span>
                                                    )}
                                                </div>

                                                {customer.phone && (
                                                    <span className="text-[10px] font-semibold text-gray-400">
                                                        {customer.city || 'Italia'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {filteredCustomers.length === 0 && (
                            <div className="text-center py-16 px-4">
                                <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center mx-auto mb-3 text-xl">
                                    🔍
                                </div>
                                <h4 className="font-black text-gray-800 text-sm">Nessun cliente trovato</h4>
                                <p className="text-xs text-gray-400 font-medium mt-1">Prova a cambiare i parametri di ricerca o i filtri attivi.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT DETAIL PANEL (CRM Hub) */}
                {selectedCustomer ? (
                    <div className="flex flex-col bg-white rounded-3xl shadow-lg border border-gray-200/90 lg:col-span-7 xl:col-span-8 overflow-hidden">
                        {/* Mobile Back Button Bar */}
                        <div className="lg:hidden p-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <button
                                type="button"
                                onClick={() => setSelectedCustomer(null)}
                                className="flex items-center gap-2 text-xs font-black text-gray-700 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-2xs"
                            >
                                <ArrowLeft size={14} /> Torna all'elenco clienti
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 custom-scrollbar">

                            {/* 1. Header Profilo & Quick Action Bar */}
                            <div className="bg-gradient-to-br from-[#0c2e19]/5 via-emerald-50/30 to-white p-5 sm:p-6 rounded-3xl border border-nature-200/70 shadow-2xs">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 sm:w-20 sm:h-20 min-w-[64px] min-h-[64px] max-w-[80px] max-h-[80px] rounded-3xl bg-nature-700 text-white font-black text-2xl flex items-center justify-center overflow-hidden shrink-0 shadow-md shadow-nature-700/20 border-2 border-white relative">
                                            {selectedCustomer.avatar ? (
                                                <img src={sanitizeImageUrl(selectedCustomer.avatar)} alt="" className="w-full h-full object-cover rounded-3xl block" />
                                            ) : (
                                                selectedCustomer.name.charAt(0).toUpperCase()
                                            )}
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                                                    {selectedCustomer.name}
                                                </h2>
                                                {selectedCustomer.role === 'ADMIN' ? (
                                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 border border-purple-200 rounded-md text-[10px] font-black uppercase flex items-center gap-1">
                                                        <Shield size={11} /> ADMIN
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md text-[10px] font-black uppercase">
                                                        CLIENTE
                                                    </span>
                                                )}
                                                {(selectedCustomer.stats.totalSpent >= 10000 || selectedCustomer.stats.totalOrders >= 4) && (
                                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-md text-[10px] font-black flex items-center gap-1 shadow-2xs">
                                                        <Crown size={11} /> CLIENTE TOP VIP
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-3 text-xs text-gray-500 font-bold mt-1.5 flex-wrap">
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={13} className="text-gray-400" />
                                                    Iscritto il {new Date(selectedCustomer.createdAt).toLocaleDateString('it-IT')}
                                                </span>
                                                <span>•</span>
                                                <span className="text-gray-400 font-medium">ID #{selectedCustomer.id}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                                        {!isEditing ? (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => handleEditCustomer(selectedCustomer)}
                                                    className="px-3.5 py-2 bg-white hover:bg-gray-50 active:scale-95 text-gray-700 font-black text-xs rounded-xl border border-gray-200 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                                                    title="Modifica Anagrafica"
                                                >
                                                    <Edit2 size={13} />
                                                    <span>Modifica</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteCustomer(selectedCustomer)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                                                    title="Elimina Cliente"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setIsEditing(false)}
                                                className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                                            >
                                                Chiudi Modifica
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Direct Contact Channels Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-5 pt-4 border-t border-nature-200/50">
                                    {/* Email Channel */}
                                    <a
                                        href={`mailto:${selectedCustomer.email}`}
                                        className="flex items-center gap-2.5 p-2.5 bg-white/90 hover:bg-white rounded-xl border border-gray-200/80 shadow-2xs transition-all group"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                            <Mail size={15} />
                                        </div>
                                        <div className="min-w-0">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block leading-tight">Email</span>
                                            <span className="text-xs font-bold text-gray-900 truncate block">{selectedCustomer.email}</span>
                                        </div>
                                    </a>

                                    {/* Phone Channel */}
                                    {selectedCustomer.phone ? (
                                        <a
                                            href={`tel:${selectedCustomer.phone}`}
                                            className="flex items-center gap-2.5 p-2.5 bg-white/90 hover:bg-white rounded-xl border border-gray-200/80 shadow-2xs transition-all group"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                                <Phone size={15} />
                                            </div>
                                            <div className="min-w-0">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block leading-tight">Telefono</span>
                                                <span className="text-xs font-bold text-gray-900 truncate block">{selectedCustomer.phone}</span>
                                            </div>
                                        </a>
                                    ) : (
                                        <div className="flex items-center gap-2.5 p-2.5 bg-gray-50/50 rounded-xl border border-dashed border-gray-200 opacity-60">
                                            <Phone size={15} className="text-gray-400 ml-2" />
                                            <span className="text-xs text-gray-400 font-bold">Nessun telefono</span>
                                        </div>
                                    )}

                                    {/* WhatsApp Direct Action */}
                                    {selectedCustomer.phone ? (
                                        <a
                                            href={formatWhatsAppUrl(selectedCustomer.phone, selectedCustomer.name)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center justify-between p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all group font-black text-xs cursor-pointer"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <MessageCircle size={16} className="shrink-0" />
                                                <span className="truncate">Chat WhatsApp</span>
                                            </div>
                                            <ExternalLink size={13} className="shrink-0 opacity-70 group-hover:opacity-100" />
                                        </a>
                                    ) : (
                                        <div className="flex items-center gap-2 p-2.5 bg-gray-50/50 rounded-xl border border-dashed border-gray-200 opacity-60">
                                            <span className="text-xs text-gray-400 font-bold">WhatsApp non disponibile</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* EDIT FORM (Appears right under header when editing) */}
                            {isEditing && (
                                <div className="p-5 sm:p-6 bg-white border-2 border-nature-500/40 rounded-3xl shadow-lg space-y-4 animate-in fade-in duration-200">
                                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <Edit2 size={16} className="text-nature-700" />
                                            <h3 className="font-black text-base text-gray-900">Modifica Dati & Recapiti Cliente</h3>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setIsEditing(false)}
                                            className="text-gray-400 hover:text-gray-600 cursor-pointer"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>

                                    {/* Avatar picker & uploader */}
                                    <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-2xl border border-gray-200/70">
                                        <div className="w-14 h-14 min-w-[56px] min-h-[56px] max-w-[56px] max-h-[56px] rounded-2xl bg-white border border-gray-200 overflow-hidden flex items-center justify-center font-black text-lg text-nature-800 shadow-2xs relative">
                                            {editData.avatar ? (
                                                <img src={sanitizeImageUrl(editData.avatar)} alt="" className="w-full h-full object-cover block" />
                                            ) : (
                                                selectedCustomer.name.charAt(0).toUpperCase()
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap">
                                            <label className="px-3 py-1.5 bg-nature-600 hover:bg-nature-700 text-white font-black text-xs rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all">
                                                <Camera size={13} />
                                                <span>{isUploadingAvatar ? 'Caricamento...' : 'Carica Nuova Foto'}</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    disabled={isUploadingAvatar}
                                                    onChange={e => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
                                                />
                                            </label>

                                            {editData.avatar && (
                                                <button
                                                    type="button"
                                                    onClick={() => setEditData(prev => ({ ...prev, avatar: null }))}
                                                    className="px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 font-extrabold text-xs rounded-xl border border-red-200 shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                                                >
                                                    <Trash2 size={12} /> Rimuovi
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Gallery existing avatars */}
                                    {availableAvatars.length > 0 && (
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1.5">Galleria Avatar</span>
                                            <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                                                {availableAvatars.map(url => (
                                                    <button
                                                        key={url}
                                                        type="button"
                                                        onClick={() => setEditData(prev => ({ ...prev, avatar: url }))}
                                                        className={`shrink-0 w-11 h-11 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${editData.avatar === url
                                                            ? 'border-nature-600 ring-2 ring-nature-400 scale-105'
                                                            : 'border-gray-200 hover:border-nature-300'
                                                            }`}
                                                    >
                                                        <img src={sanitizeImageUrl(url)} alt="" className="w-full h-full object-cover" />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Fields Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        <div>
                                            <label className="block text-[11px] font-black uppercase tracking-wider text-gray-600 mb-1">Nome Completo</label>
                                            <input
                                                type="text"
                                                className="w-full p-2.5 bg-gray-50 focus:bg-white border border-gray-200 focus:border-nature-500 rounded-xl text-xs sm:text-sm font-bold text-gray-900 outline-none"
                                                value={editData.name || ''}
                                                onChange={e => setEditData({ ...editData, name: e.target.value })}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-black uppercase tracking-wider text-gray-600 mb-1">Email</label>
                                            <input
                                                type="email"
                                                className="w-full p-2.5 bg-gray-50 focus:bg-white border border-gray-200 focus:border-nature-500 rounded-xl text-xs sm:text-sm font-bold text-gray-900 outline-none"
                                                value={editData.email || ''}
                                                onChange={e => setEditData({ ...editData, email: e.target.value })}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-black uppercase tracking-wider text-gray-600 mb-1">Telefono / WhatsApp</label>
                                            <input
                                                type="text"
                                                className="w-full p-2.5 bg-gray-50 focus:bg-white border border-gray-200 focus:border-nature-500 rounded-xl text-xs sm:text-sm font-bold text-gray-900 outline-none"
                                                value={editData.phone || ''}
                                                onChange={e => setEditData({ ...editData, phone: e.target.value })}
                                                placeholder="+39 333 1234567"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-black uppercase tracking-wider text-gray-600 mb-1">Ruolo Account</label>
                                            <select
                                                value={editData.role || 'CUSTOMER'}
                                                onChange={e => setEditData({ ...editData, role: e.target.value })}
                                                className="w-full p-2.5 bg-gray-50 focus:bg-white border border-gray-200 focus:border-nature-500 rounded-xl text-xs sm:text-sm font-black text-gray-900 outline-none cursor-pointer"
                                            >
                                                <option value="CUSTOMER">Cliente Standard</option>
                                                <option value="ADMIN">Amministratore (ADMIN)</option>
                                            </select>
                                        </div>

                                        {/* Address Section */}
                                        <div className="sm:col-span-2 grid grid-cols-4 gap-2.5 pt-2 border-t border-gray-100">
                                            <div className="col-span-3">
                                                <label className="block text-[11px] font-black uppercase tracking-wider text-gray-600 mb-1">Via / Piazza</label>
                                                <input
                                                    type="text"
                                                    className="w-full p-2.5 bg-gray-50 focus:bg-white border border-gray-200 focus:border-nature-500 rounded-xl text-xs sm:text-sm font-bold text-gray-900 outline-none"
                                                    value={editData.street || ''}
                                                    onChange={e => setEditData({ ...editData, street: e.target.value })}
                                                />
                                            </div>
                                            <div className="col-span-1">
                                                <label className="block text-[11px] font-black uppercase tracking-wider text-gray-600 mb-1">Civico</label>
                                                <input
                                                    type="text"
                                                    className="w-full p-2.5 bg-gray-50 focus:bg-white border border-gray-200 focus:border-nature-500 rounded-xl text-xs sm:text-sm font-bold text-gray-900 outline-none text-center"
                                                    value={editData.civic || ''}
                                                    onChange={e => setEditData({ ...editData, civic: e.target.value })}
                                                />
                                            </div>
                                            <div className="col-span-3">
                                                <label className="block text-[11px] font-black uppercase tracking-wider text-gray-600 mb-1">Città</label>
                                                <input
                                                    type="text"
                                                    className="w-full p-2.5 bg-gray-50 focus:bg-white border border-gray-200 focus:border-nature-500 rounded-xl text-xs sm:text-sm font-bold text-gray-900 outline-none"
                                                    value={editData.city || ''}
                                                    onChange={e => setEditData({ ...editData, city: e.target.value })}
                                                />
                                            </div>
                                            <div className="col-span-1">
                                                <label className="block text-[11px] font-black uppercase tracking-wider text-gray-600 mb-1">CAP</label>
                                                <input
                                                    type="text"
                                                    className="w-full p-2.5 bg-gray-50 focus:bg-white border border-gray-200 focus:border-nature-500 rounded-xl text-xs sm:text-sm font-bold text-gray-900 outline-none text-center"
                                                    value={editData.zipCode || ''}
                                                    onChange={e => setEditData({ ...editData, zipCode: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        {/* Notification Preference */}
                                        <div className="sm:col-span-2 pt-2 border-t border-gray-100">
                                            <label className="block text-[11px] font-black uppercase tracking-wider text-gray-600 mb-2 flex items-center gap-1.5">
                                                <Bell size={13} className="text-gray-500" /> Canale Notifiche Preferito
                                            </label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditData({ ...editData, notificationPreference: 'EMAIL' })}
                                                    className={`p-3 rounded-xl border-2 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${editData.notificationPreference === 'EMAIL'
                                                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 shadow-2xs'
                                                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    <Mail size={15} className="text-blue-600" />
                                                    <span>Email</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditData({ ...editData, notificationPreference: 'WHATSAPP' })}
                                                    className={`p-3 rounded-xl border-2 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${editData.notificationPreference === 'WHATSAPP'
                                                        ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 shadow-2xs'
                                                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    <MessageCircle size={15} className="text-emerald-600" />
                                                    <span>WhatsApp Ufficiale</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Optional Password Reset */}
                                        <div className="sm:col-span-2 pt-2 border-t border-gray-100">
                                            <label className="block text-[11px] font-black uppercase tracking-wider text-gray-600 mb-1">
                                                Reimposta Password (lascia vuoto se invariata)
                                            </label>
                                            <input
                                                type="password"
                                                placeholder="Nuova password sicura..."
                                                className="w-full p-2.5 bg-gray-50 focus:bg-white border border-gray-200 focus:border-nature-500 rounded-xl text-xs sm:text-sm font-bold text-gray-900 outline-none"
                                                value={editData.password || ''}
                                                onChange={e => setEditData({ ...editData, password: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                                        <button
                                            type="button"
                                            onClick={() => setIsEditing(false)}
                                            className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                                        >
                                            Annulla
                                        </button>
                                        <button
                                            type="button"
                                            disabled={isSaving}
                                            onClick={handleSaveCustomer}
                                            className="px-5 py-2.5 bg-nature-700 hover:bg-nature-800 active:scale-95 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                        >
                                            <Save size={15} />
                                            <span>{isSaving ? 'Salvataggio...' : 'Salva Modifiche'}</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* 2. Sezione Borsellino & Indirizzo Spedizione (Due colonne) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Card Borsellino Elettronico */}
                                <div className="bg-gradient-to-br from-purple-50/60 to-white p-5 rounded-3xl border border-purple-200/80 shadow-2xs flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-[11px] font-black uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                                                <Wallet size={15} className="text-purple-700" />
                                                Borsellino Digitale
                                            </span>
                                            <span className="text-[10px] font-black bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md">
                                                Credito Spesa
                                            </span>
                                        </div>

                                        <div className="text-3xl font-black text-purple-950 leading-none">
                                            € {((selectedCustomer.walletBalance || 0) / 100).toFixed(2)}
                                        </div>
                                        <p className="text-xs font-semibold text-purple-700/80 mt-1.5">
                                            Utilizzabile automaticamente dal cliente al checkout ordini.
                                        </p>
                                    </div>

                                    <div className="pt-4 mt-4 border-t border-purple-100 flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleOpenWalletModal(selectedCustomer)}
                                            className="w-full py-2.5 px-3 bg-purple-700 hover:bg-purple-800 active:scale-95 text-white font-black text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                        >
                                            <Coins size={14} />
                                            <span>Ricarica / Rettifica Saldo</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Card Indirizzo di Consegna */}
                                <div className="bg-gray-50/60 p-5 rounded-3xl border border-gray-200/80 shadow-2xs flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-[11px] font-black uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                                                <MapPin size={15} className="text-nature-700" />
                                                Indirizzo Consegna
                                            </span>
                                            <span className="text-[10px] font-extrabold text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-md">
                                                {selectedCustomer.city || 'Non impostata'}
                                            </span>
                                        </div>

                                        {selectedCustomer.street ? (
                                            <div className="space-y-1">
                                                <p className="text-sm font-black text-gray-900">
                                                    {selectedCustomer.street} {selectedCustomer.civic && `, ${selectedCustomer.civic}`}
                                                </p>
                                                <p className="text-xs font-bold text-gray-600">
                                                    {selectedCustomer.zipCode && `${selectedCustomer.zipCode} `}{selectedCustomer.city}
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-400 font-semibold italic">
                                                Nessun indirizzo salvato nel profilo cliente.
                                            </p>
                                        )}
                                    </div>

                                    {selectedCustomer.street && (
                                        <div className="pt-4 mt-4 border-t border-gray-200/60">
                                            <a
                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedCustomer.street} ${selectedCustomer.civic || ''}, ${selectedCustomer.city || ''} ${selectedCustomer.zipCode || ''}`)}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="w-full py-2.5 px-3 bg-white hover:bg-gray-100 active:scale-95 text-gray-800 font-black text-xs rounded-xl border border-gray-200 shadow-2xs transition-all flex items-center justify-center gap-1.5"
                                            >
                                                <MapPin size={13} className="text-nature-700" />
                                                <span>Apri su Google Maps</span>
                                                <ExternalLink size={12} className="opacity-50" />
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 3. Statistiche Chiave Personali */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200/80">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">Ordini Totali</span>
                                    <span className="text-xl font-black text-gray-900">{selectedCustomer.stats.totalOrders}</span>
                                </div>
                                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200/80">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">Spesa Totale (LTV)</span>
                                    <span className="text-xl font-black text-emerald-800">€ {(selectedCustomer.stats.totalSpent / 100).toFixed(2)}</span>
                                </div>
                                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200/80">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">Media Ordine</span>
                                    <span className="text-xl font-black text-blue-900">
                                        € {selectedCustomer.stats.totalOrders > 0
                                            ? ((selectedCustomer.stats.totalSpent / selectedCustomer.stats.totalOrders) / 100).toFixed(2)
                                            : '0.00'}
                                    </span>
                                </div>
                                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200/80">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">Ultimo Ordine</span>
                                    <span className="text-xs font-black text-gray-800 block truncate mt-1">
                                        {selectedCustomer.orders.length > 0
                                            ? new Date(selectedCustomer.orders[0].createdAt).toLocaleDateString('it-IT')
                                            : 'Nessuno'}
                                    </span>
                                </div>
                            </div>

                            {/* 4. Cronologia Ordini Cliente */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <ShoppingBag size={17} className="text-nature-700" />
                                        <h3 className="font-black text-base text-gray-900">
                                            Cronologia Ordini ({selectedCustomer.orders.length})
                                        </h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/admin/orders')}
                                        className="text-xs font-black text-nature-700 hover:text-nature-800 flex items-center gap-1 cursor-pointer"
                                    >
                                        <span>Vai a Gestione Ordini</span>
                                        <ExternalLink size={12} />
                                    </button>
                                </div>

                                <div className="space-y-2.5">
                                    {selectedCustomer.orders.map(order => (
                                        <div
                                            key={order.id}
                                            className="p-3.5 bg-gray-50/70 hover:bg-gray-50 rounded-2xl border border-gray-200/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-11 h-11 rounded-xl bg-white border border-gray-200 font-mono font-black text-sm text-gray-800 flex items-center justify-center shrink-0 shadow-2xs">
                                                    #{order.id}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                        {renderStatusBadge(order.status)}
                                                        <span className="text-[11px] font-extrabold text-gray-500">
                                                            {order.deliveryMethod === 'DELIVERY' ? '🚚 Consegna a Domicilio' : '🏪 Ritiro in Negozio'}
                                                        </span>
                                                        {order.itemsCount !== undefined && order.itemsCount > 0 && (
                                                            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                                                {order.itemsCount} articoli
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs font-semibold text-gray-500">
                                                        Ordinato il {new Date(order.createdAt).toLocaleDateString('it-IT')} alle {new Date(order.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200/50">
                                                <div className="text-left sm:text-right">
                                                    <span className="text-base font-black text-gray-900 block leading-tight">
                                                        € {((order.finalTotal || order.estimatedTotal) / 100).toFixed(2)}
                                                    </span>
                                                    {!order.finalTotal && (
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                                            Stimato
                                                        </span>
                                                    )}
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => navigate('/admin/orders')}
                                                    className="px-3 py-1.5 bg-white hover:bg-gray-100 active:scale-95 text-gray-800 font-black text-xs rounded-xl border border-gray-200 shadow-2xs flex items-center gap-1 cursor-pointer transition-all"
                                                >
                                                    <span>Apri Ordine</span>
                                                    <ExternalLink size={11} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {selectedCustomer.orders.length === 0 && (
                                        <div className="text-center py-8 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                                            <p className="text-xs text-gray-400 font-bold">Nessun ordine effettuato finora da questo cliente.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="hidden lg:flex lg:col-span-7 xl:col-span-8 flex-col items-center justify-center bg-white rounded-3xl border border-gray-200/90 shadow-2xs p-12 text-center">
                        <div className="w-16 h-16 rounded-3xl bg-nature-50 border border-nature-200/70 text-nature-800 flex items-center justify-center text-3xl mb-4 shadow-inner">
                            👥
                        </div>
                        <h3 className="text-lg font-black text-gray-900">Seleziona un Cliente</h3>
                        <p className="text-xs text-gray-400 font-semibold max-w-sm mt-1.5 leading-relaxed">
                            Fai clic su un cliente dall'elenco a sinistra per visualizzare la scheda anagrafica, gestire il borsellino, consultare lo storico acquisti e contattarlo direttamente.
                        </p>
                    </div>
                )}
            </div>

            {/* MODAL: Ricarica / Rettifica Borsellino */}
            {walletModal.isOpen && walletModal.customer && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[110] animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center">
                                    <Wallet size={20} />
                                </div>
                                <div>
                                    <h3 className="font-black text-base text-gray-900">Gestione Borsellino</h3>
                                    <p className="text-xs font-bold text-gray-500">{walletModal.customer.name}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setWalletModal(prev => ({ ...prev, isOpen: false }))}
                                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Current Balance Notice */}
                        <div className="p-3.5 bg-purple-50/60 rounded-2xl border border-purple-200 flex items-center justify-between">
                            <span className="text-xs font-black text-purple-900 uppercase tracking-wider">Saldo Attuale</span>
                            <span className="text-xl font-black text-purple-950 leading-none">
                                € {((walletModal.customer.walletBalance || 0) / 100).toFixed(2)}
                            </span>
                        </div>

                        {/* Action Selector: Credit vs Debit */}
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setWalletModal(prev => ({ ...prev, action: 'CREDIT' }))}
                                className={`py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${walletModal.action === 'CREDIT'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                <Plus size={14} /> Acccredito (+)
                            </button>
                            <button
                                type="button"
                                onClick={() => setWalletModal(prev => ({ ...prev, action: 'DEBIT' }))}
                                className={`py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${walletModal.action === 'DEBIT'
                                    ? 'bg-red-600 text-white shadow-xs'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                <Minus size={14} /> Addebito / Rettifica (-)
                            </button>
                        </div>

                        {/* Amount Input */}
                        <div>
                            <label className="block text-[11px] font-black uppercase tracking-wider text-gray-600 mb-1">
                                Importo (€)
                            </label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-black text-gray-400">€</span>
                                <input
                                    type="number"
                                    step="0.50"
                                    min="0.10"
                                    placeholder="10.00"
                                    value={walletModal.amount}
                                    onChange={(e) => setWalletModal(prev => ({ ...prev, amount: e.target.value }))}
                                    className="w-full pl-8 pr-4 py-2.5 bg-gray-50 focus:bg-white border-2 border-purple-300 focus:border-purple-600 rounded-xl text-lg font-black text-gray-900 outline-none"
                                />
                            </div>

                            {/* Quick chip presets */}
                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                {['5', '10', '20', '50'].map(val => (
                                    <button
                                        key={val}
                                        type="button"
                                        onClick={() => setWalletModal(prev => ({ ...prev, amount: val }))}
                                        className="px-2.5 py-1 bg-gray-100 hover:bg-purple-100 text-gray-700 hover:text-purple-900 font-extrabold text-[11px] rounded-lg cursor-pointer transition-colors"
                                    >
                                        +€{val}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Description field */}
                        <div>
                            <label className="block text-[11px] font-black uppercase tracking-wider text-gray-600 mb-1">
                                Motivazione / Causale
                            </label>
                            <input
                                type="text"
                                placeholder="Es: Buono fedeltà, Ricarica cassa, Rimborso..."
                                value={walletModal.description}
                                onChange={(e) => setWalletModal(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full p-2.5 bg-gray-50 focus:bg-white border border-gray-200 focus:border-purple-600 rounded-xl text-xs font-bold text-gray-900 outline-none"
                            />
                        </div>

                        {/* Modal Actions */}
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setWalletModal(prev => ({ ...prev, isOpen: false }))}
                                className="w-1/3 py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold text-xs rounded-xl cursor-pointer transition-colors"
                            >
                                Annulla
                            </button>
                            <button
                                type="button"
                                disabled={walletModal.isSubmitting}
                                onClick={handleConfirmWalletAdjustment}
                                className={`w-2/3 py-2.5 px-3 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${walletModal.action === 'CREDIT' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                                    }`}
                            >
                                <Coins size={14} />
                                <span>{walletModal.isSubmitting ? 'Aggiornamento...' : 'Conferma Operazione'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Creazione Nuovo Utente */}
            {isCreationModalOpen && (
                <UserCreationModal
                    onClose={() => setIsCreationModalOpen(false)}
                    onUserCreated={() => {
                        setIsCreationModalOpen(false);
                        fetchCustomers(true);
                        addToast('Nuovo utente creato con successo!', 'success');
                    }}
                />
            )}

            {/* Modal: Conferme generiche */}
            <ConfirmModal
                isOpen={!!confirmModal?.isOpen}
                title={confirmModal?.title || ''}
                message={confirmModal?.message || ''}
                onConfirm={() => {
                    if (confirmModal) {
                        confirmModal.onConfirm();
                        setConfirmModal(null);
                    }
                }}
                onCancel={() => setConfirmModal(null)}
            />
        </div>
    );
};
