import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { Search, Mail, Phone, Calendar, ShoppingBag, TrendingUp, ArrowLeft, Edit2, Save, X, Bell, Camera, Trash2, UserPlus, Shield } from 'lucide-react';
import { sanitizeImageUrl } from '../../utils/imageUrl';
import { UserCreationModal } from '../../components/admin/UserCreationModal';

interface CustomerStats {
    totalOrders: number;
    totalSpent: number;
}

interface OrderSummary {
    id: number;
    finalTotal: number | null;
    estimatedTotal: number;
    createdAt: string;
    status: string;
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
    stats: CustomerStats;
    orders: OrderSummary[];
}

export const CustomerManager = () => {
    const { token } = useAuthStore();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [search, setSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<Partial<Customer> & { password?: string }>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [availableAvatars, setAvailableAvatars] = useState<string[]>([]);
    const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);

    const API_URL = '';

    useEffect(() => {
        if (token) fetchCustomers();
    }, [token]);

    const fetchCustomers = () => {
        fetch(`${API_URL}/api/admin/customers`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setCustomers(data);
                } else {
                    console.error('Invalid response format', data);
                }
            })
            .catch(err => console.error('Fetch error:', err));
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase()) ||
        (c.phone && c.phone.includes(search))
    );

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
            password: ''
        });
        setIsEditing(true);
        // Load existing avatars for the gallery
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
            } else {
                alert('Errore durante il caricamento dell\'immagine.');
            }
        } catch {
            alert('Errore di connessione.');
        } finally {
            setIsUploadingAvatar(false);
            // Refresh the gallery after upload
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
                // update local state
                setCustomers(customers.map(c => c.id === updated.id ? { ...c, ...updated } : c));
                setSelectedCustomer({ ...selectedCustomer, ...updated });
                setIsEditing(false);
            } else {
                const err = await res.json();
                alert(`Errore: ${err.error}`);
            }
        } catch (error) {
            console.error('Save error:', error);
            alert('Errore di connessione durante il salvataggio.');
        } finally {
            setIsSaving(false);
        }
    };

    const renderStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            PENDING: 'bg-yellow-100 text-yellow-700',
            WEIGHING_COMPLETED: 'bg-blue-100 text-blue-700',
            OUT_FOR_DELIVERY: 'bg-purple-100 text-purple-700',
            DELIVERED: 'bg-green-100 text-green-700',
            CANCELLED: 'bg-red-100 text-red-700',
        };
        const labels: Record<string, string> = {
            PENDING: 'In Attesa',
            WEIGHING_COMPLETED: 'Pesato',
            OUT_FOR_DELIVERY: 'In Consegna',
            DELIVERED: 'Consegnato',
            CANCELLED: 'Annullato',
        };
        return (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles[status]}`}>
                {labels[status] || status}
            </span>
        );
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 -m-5 md:-m-8 p-5 md:p-8 overflow-y-auto custom-scrollbar leading-relaxed">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Utenti & Clienti</h1>
                <button
                    onClick={() => setIsCreationModalOpen(true)}
                    className="bg-nature-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-nature-700 transition-all shadow-md font-bold"
                >
                    <UserPlus size={18} /> <span className="hidden sm:inline">Nuovo Utente</span>
                </button>
            </div>

            <div className={`grid grid-cols-1 ${selectedCustomer ? 'lg:grid-cols-3' : ''} gap-6 flex-1 min-h-0`}>

                {/* LISTA CLIENTI */}
                <div className={`flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${selectedCustomer ? 'hidden lg:flex lg:col-span-1' : 'flex-1'}`}>
                    <div className="p-4 border-b border-gray-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Cerca cliente (nome, email, telefono)"
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-nature-500 outline-none text-sm"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {filteredCustomers.map(customer => (
                            <div
                                key={customer.id}
                                onClick={() => setSelectedCustomer(customer)}
                                className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedCustomer?.id === customer.id
                                    ? 'border-nature-500 ring-1 ring-nature-500 bg-nature-50/50'
                                    : 'border-gray-100 hover:border-nature-200 hover:bg-gray-50'
                                    }`}
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-nature-100 flex items-center justify-center text-nature-600 font-bold overflow-hidden shrink-0">
                                        {customer.avatar ? (
                                            <img src={sanitizeImageUrl(customer.avatar)} alt="avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            customer.name.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-gray-900 truncate">{customer.name}</h3>
                                            {customer.role === 'ADMIN' && (
                                                <span className="flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                                    <Shield size={10} /> ADMIN
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 truncate">{customer.email}</p>
                                    </div>
                                </div>
                                <div className="flex justify-between items-end border-t border-gray-100/60 pt-2 mt-2">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-gray-400 font-medium">Ordini</span>
                                        <span className="text-sm font-bold text-gray-700">{customer.stats.totalOrders}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] text-gray-400 font-medium">Speso</span>
                                        <span className="text-sm font-bold text-nature-600">€ {(customer.stats.totalSpent / 100).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {filteredCustomers.length === 0 && (
                            <div className="text-center py-10 text-gray-400">Nessun cliente trovato</div>
                        )}
                    </div>
                </div>

                {/* DETTAGLIO CLIENTE & STORICO (Visibile solo se selezionato) */}
                {selectedCustomer && (
                    <div className="flex flex-col bg-white rounded-2xl shadow-lg border border-gray-100 lg:col-span-2 overflow-hidden relative">
                        {/* Mobile Back Button */}
                        <div className="lg:hidden p-4 border-b border-gray-100 flex items-center gap-3">
                            <button onClick={() => setSelectedCustomer(null)} className="p-2 bg-gray-50 rounded-lg text-gray-600">
                                <ArrowLeft size={20} />
                            </button>
                            <h2 className="font-bold">Torna all'elenco</h2>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                            <div className="flex flex-col md:flex-row gap-6 items-start mb-8">
                                <div className="w-24 h-24 rounded-2xl bg-nature-100 flex items-center justify-center text-3xl font-bold text-nature-600 shadow-inner overflow-hidden shrink-0">
                                    {selectedCustomer.avatar ? (
                                        <img src={sanitizeImageUrl(selectedCustomer.avatar)} alt="avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        selectedCustomer.name.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div className="flex-1 w-full space-y-4">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-2xl font-bold text-gray-900">{selectedCustomer.name}</h2>
                                            {selectedCustomer.role === 'ADMIN' && (
                                                <span className="flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[10px] font-bold h-fit">
                                                    <Shield size={10} /> ADMIN
                                                </span>
                                            )}
                                            {!isEditing && (
                                                <button onClick={() => handleEditCustomer(selectedCustomer)} className="p-1.5 text-gray-400 hover:text-nature-600 hover:bg-nature-50 rounded-lg transition-colors" title="Modifica Cliente">
                                                    <Edit2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                            <Calendar size={14} /> Registrato il {new Date(selectedCustomer.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <a href={`mailto:${selectedCustomer.email}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><Mail size={16} /></div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Email</p>
                                                <p className="text-sm font-medium text-gray-900 truncate">{selectedCustomer.email}</p>
                                            </div>
                                        </a>
                                        {selectedCustomer.phone && (
                                            <a href={`tel:${selectedCustomer.phone}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                                <div className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center shrink-0"><Phone size={16} /></div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Telefono</p>
                                                    <p className="text-sm font-medium text-gray-900 truncate">{selectedCustomer.phone}</p>
                                                </div>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* UPDATE FORM */}
                            {isEditing && (
                                <div className="mb-8 p-5 bg-gray-50 border border-gray-200 rounded-2xl">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-gray-900 text-lg">Modifica Dati Cliente</h3>
                                        <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Avatar Upload */}
                                        <div className="md:col-span-2 flex items-center gap-4 pb-4 border-b border-gray-200">
                                            <div className="relative shrink-0">
                                                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-nature-100 flex items-center justify-center text-2xl font-bold text-nature-600 border-2 border-gray-200">
                                                    {editData.avatar ? (
                                                        <img src={sanitizeImageUrl(editData.avatar)} alt="avatar" className="w-full h-full object-cover" />
                                                    ) : (
                                                        selectedCustomer?.name.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                {isUploadingAvatar && (
                                                    <div className="absolute inset-0 bg-white/70 rounded-2xl flex items-center justify-center">
                                                        <div className="w-5 h-5 border-2 border-nature-500 border-t-transparent rounded-full animate-spin" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Foto Profilo</p>
                                                <label className="flex items-center gap-2 px-3 py-1.5 bg-nature-50 border border-nature-200 rounded-xl text-xs font-bold text-nature-700 cursor-pointer hover:bg-nature-100 transition-colors">
                                                    <Camera size={13} />
                                                    {isUploadingAvatar ? 'Caricamento...' : 'Carica immagine'}
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
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-600 hover:bg-red-100 transition-colors"
                                                    >
                                                        <Trash2 size={12} /> Rimuovi foto
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {/* Avatar Gallery */}
                                        {availableAvatars.length > 0 && (
                                            <div className="md:col-span-2">
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Scegli tra gli avatar esistenti</p>
                                                <div className="flex gap-2 overflow-x-auto pb-1">
                                                    {availableAvatars.map(url => (
                                                        <button
                                                            key={url}
                                                            type="button"
                                                            onClick={() => setEditData(prev => ({ ...prev, avatar: url }))}
                                                            className={`shrink-0 w-12 h-12 rounded-xl overflow-hidden border-2 transition-all ${editData.avatar === url
                                                                ? 'border-nature-500 ring-2 ring-nature-400/50 scale-105'
                                                                : 'border-gray-200 hover:border-nature-300'
                                                                }`}
                                                        >
                                                            <img src={sanitizeImageUrl(url)} alt="avatar" className="w-full h-full object-cover" />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Nome Completo</label>
                                            <input type="text" className="w-full p-2 border border-gray-200 rounded-xl text-sm" value={editData.name || ''} onChange={e => setEditData({ ...editData, name: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Email</label>
                                            <input type="email" className="w-full p-2 border border-gray-200 rounded-xl text-sm" value={editData.email || ''} onChange={e => setEditData({ ...editData, email: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Telefono</label>
                                            <input type="text" className="w-full p-2 border border-gray-200 rounded-xl text-sm" value={editData.phone || ''} onChange={e => setEditData({ ...editData, phone: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Nuova Password (lascia vuoto per non cambiare)</label>
                                            <input type="password" placeholder="••••••••" className="w-full p-2 border border-gray-200 rounded-xl text-sm" value={editData.password || ''} onChange={e => setEditData({ ...editData, password: e.target.value })} />
                                        </div>
                                        <div className="md:col-span-2 grid grid-cols-4 gap-2">
                                            <div className="col-span-2">
                                                <label className="block text-xs font-bold text-gray-500 mb-1">Via</label>
                                                <input type="text" className="w-full p-2 border border-gray-200 rounded-xl text-sm" value={editData.street || ''} onChange={e => setEditData({ ...editData, street: e.target.value })} />
                                            </div>
                                            <div className="col-span-1">
                                                <label className="block text-xs font-bold text-gray-500 mb-1">Civico</label>
                                                <input type="text" className="w-full p-2 border border-gray-200 rounded-xl text-sm" value={editData.civic || ''} onChange={e => setEditData({ ...editData, civic: e.target.value })} />
                                            </div>
                                            <div className="col-span-4 md:col-span-1 border-t md:border-none pt-2 md:pt-0">
                                            </div>
                                            <div className="col-span-3">
                                                <label className="block text-xs font-bold text-gray-500 mb-1">Città</label>
                                                <input type="text" className="w-full p-2 border border-gray-200 rounded-xl text-sm" value={editData.city || ''} onChange={e => setEditData({ ...editData, city: e.target.value })} />
                                            </div>
                                            <div className="col-span-1">
                                                <label className="block text-xs font-bold text-gray-500 mb-1">CAP</label>
                                                <input type="text" className="w-full p-2 border border-gray-200 rounded-xl text-sm" value={editData.zipCode || ''} onChange={e => setEditData({ ...editData, zipCode: e.target.value })} />
                                            </div>
                                        </div>
                                        <div className="md:col-span-2 mt-2">
                                            <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><Bell size={12} /> Preferenza Notifiche Ordine</label>
                                            <div className="flex gap-4 mt-2">
                                                <label className={`flex-1 flex items-center justify-center p-2 rounded-lg border-2 cursor-pointer transition-all ${editData.notificationPreference === 'EMAIL' ? 'border-nature-600 bg-white' : 'border-transparent bg-gray-100 text-gray-500'}`}>
                                                    <input type="radio" name="pref" value="EMAIL" checked={editData.notificationPreference === 'EMAIL'} onChange={() => setEditData({ ...editData, notificationPreference: 'EMAIL' })} className="hidden" />
                                                    <span className="font-bold text-xs">Email</span>
                                                </label>
                                                <label className={`flex-1 flex items-center justify-center p-2 rounded-lg border-2 cursor-pointer transition-all ${editData.notificationPreference === 'WHATSAPP' ? 'border-green-500 bg-white' : 'border-transparent bg-gray-100 text-gray-500'}`}>
                                                    <input type="radio" name="pref" value="WHATSAPP" checked={editData.notificationPreference === 'WHATSAPP'} onChange={() => setEditData({ ...editData, notificationPreference: 'WHATSAPP' })} className="hidden" />
                                                    <span className="font-bold text-xs text-green-700">WhatsApp</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-5 flex justify-end gap-2">
                                        <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">Annulla</button>
                                        <button onClick={handleSaveCustomer} disabled={isSaving} className="px-4 py-2 text-sm font-bold text-white bg-nature-900 hover:bg-nature-800 rounded-xl transition-colors flex items-center gap-2">
                                            <Save size={16} /> {isSaving ? 'Salvataggio...' : 'Salva Modifiche'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Statistiche Totali */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                                <div className="bg-nature-50 p-6 rounded-2xl border border-nature-100 relative overflow-hidden">
                                    <ShoppingBag size={80} className="absolute -right-4 -bottom-4 text-nature-200/50" />
                                    <p className="text-sm font-bold text-nature-800 mb-1 relative z-10">Ordini Effettuati</p>
                                    <p className="text-3xl font-black text-nature-600 relative z-10">{selectedCustomer.stats.totalOrders}</p>
                                </div>
                                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 relative overflow-hidden">
                                    <TrendingUp size={80} className="absolute -right-4 -bottom-4 text-blue-200/50" />
                                    <p className="text-sm font-bold text-blue-800 mb-1 relative z-10">Valore Totale (LTV)</p>
                                    <p className="text-3xl font-black text-blue-600 relative z-10">€ {(selectedCustomer.stats.totalSpent / 100).toFixed(2)}</p>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">Cronologia Ordini</h3>
                            <div className="space-y-3">
                                {selectedCustomer.orders.map(order => (
                                    <div key={order.id} className="flex gap-4 p-4 border border-gray-100 rounded-xl hover:shadow-md transition-shadow bg-white">
                                        <div className="hidden md:flex flex-col items-center justify-center w-16 h-16 bg-gray-50 rounded-xl shrink-0">
                                            <span className="text-xs text-gray-400 font-bold uppercase">Ord</span>
                                            <span className="text-lg font-black text-gray-800">#{order.id}</span>
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="md:hidden font-bold text-gray-800">Ordine #{order.id}</div>
                                                <div className="text-sm text-gray-500">
                                                    {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                {renderStatusBadge(order.status)}
                                            </div>
                                            <div className="text-gray-900 font-bold mt-2">
                                                € {((order.finalTotal || order.estimatedTotal) / 100).toFixed(2)}
                                                {!order.finalTotal && <span className="text-xs text-gray-400 font-normal ml-1">(stimato)</span>}
                                            </div>
                                        </div>
                                        {/* Optional Link to Order Detail if you want deep linking */}
                                    </div>
                                ))}
                                {selectedCustomer.orders.length === 0 && (
                                    <p className="text-gray-400 italic">Nessun ordine effettuato da questo cliente.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {isCreationModalOpen && (
                <UserCreationModal
                    onClose={() => setIsCreationModalOpen(false)}
                    onUserCreated={() => {
                        setIsCreationModalOpen(false);
                        fetchCustomers();
                    }}
                />
            )}
        </div>
    );
};
