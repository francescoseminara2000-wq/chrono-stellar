import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import {
    User as UserIcon,
    MapPin,
    Phone,
    Save,
    Bell,
    Mail,
    ShieldCheck,
    Check,
    ShoppingBag,
    Navigation,
    Wallet,
    Gift,
    ArrowDownLeft,
    ArrowUpRight,
    CheckCircle2,
    AlertCircle,
    Lock,
    Eye,
    EyeOff,
    X,
    ChevronDown,
    ChevronUp,
    Send
} from 'lucide-react';
import { sanitizeImageUrl } from '../utils/imageUrl';
import { SearchableSelect } from '../components/admin/SearchableSelect';
import { Link, useSearchParams } from 'react-router-dom';

interface ToastMessage {
    id: number;
    type: 'success' | 'error' | 'info';
    text: string;
}

export const Profile = () => {
    const { user, token, login, updateUser } = useAuthStore();
    const [searchParams] = useSearchParams();

    // Wallet & Gift cards state
    const [walletData, setWalletData] = useState<{ balance: number; transactions: any[] } | null>(null);
    const [redeemCode, setRedeemCode] = useState(searchParams.get('redeem') || '');
    const [isRedeeming, setIsRedeeming] = useState(false);
    const [showTransactions, setShowTransactions] = useState(false);

    // Profile form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '+39 ',
        street: '',
        civic: '',
        city: '',
        zipCode: '',
        avatar: '',
        latitude: null as number | null,
        longitude: null as number | null,
        notificationPreference: 'EMAIL' as 'EMAIL' | 'WHATSAPP'
    });

    // Tracking if form has been initialized from user to avoid wallet-fetch overwrites
    const initializedUserIdRef = useRef<number | null>(null);

    // Ancillary data
    const [cities, setCities] = useState<any[]>([]);
    const [avatars, setAvatars] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isLocating, setIsLocating] = useState(false);

    // Toast feedback system
    const [toast, setToast] = useState<ToastMessage | null>(null);
    const toastTimeoutRef = useRef<any>(null);

    const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        setToast({ id: Date.now(), text, type });
        toastTimeoutRef.current = setTimeout(() => {
            setToast(null);
        }, 4000);
    };

    // Password change state
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        next: false,
        confirm: false
    });
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // Email resend state
    const [isResendingEmail, setIsResendingEmail] = useState(false);

    // 1. Initial Data Fetch: cities, avatars, fresh profile from /api/auth/me
    useEffect(() => {
        fetch(`/api/delivery-zones`)
            .then(res => res.json())
            .then(data => { if (Array.isArray(data)) setCities(data); })
            .catch(console.error);

        fetch(`/api/avatars`)
            .then(res => res.json())
            .then(data => { if (Array.isArray(data)) setAvatars(data); })
            .catch(console.error);

        // Fetch fresh user profile from backend to ensure avatar and all fields are in sync
        if (token) {
            fetch(`/api/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.ok ? res.json() : null)
                .then(freshUser => {
                    if (freshUser) {
                        updateUser(freshUser);
                        if (initializedUserIdRef.current !== freshUser.id) {
                            initializedUserIdRef.current = freshUser.id;
                            setFormData({
                                name: freshUser.name || '',
                                email: freshUser.email || '',
                                phone: freshUser.phone || '+39 ',
                                street: freshUser.street || '',
                                civic: freshUser.civic || '',
                                city: freshUser.city || '',
                                zipCode: freshUser.zipCode || '',
                                avatar: freshUser.avatar || '',
                                latitude: freshUser.latitude || null,
                                longitude: freshUser.longitude || null,
                                notificationPreference: freshUser.notificationPreference || 'EMAIL'
                            });
                        }
                    }
                })
                .catch(console.error);
        }
    }, [token]);

    // Initial population from user store if not already set
    useEffect(() => {
        if (user && initializedUserIdRef.current !== user.id) {
            initializedUserIdRef.current = user.id;
            setFormData({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '+39 ',
                street: user.street || '',
                civic: user.civic || '',
                city: user.city || '',
                zipCode: user.zipCode || '',
                avatar: user.avatar || '',
                latitude: user.latitude || null,
                longitude: user.longitude || null,
                notificationPreference: user.notificationPreference || 'EMAIL'
            });
        }
    }, [user]);

    // 2. Fetch Wallet data
    const fetchWallet = async () => {
        if (!token) return;
        try {
            const res = await fetch(`/api/wallet`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setWalletData(data);
                updateUser({ walletBalance: data.balance });
            }
        } catch (err) {
            console.error('Failed to fetch wallet:', err);
        }
    };

    useEffect(() => {
        fetchWallet();
    }, [token]);

    // 3. Redeem Gift Card
    const handleRedeem = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = redeemCode.trim();
        if (!code) return;
        setIsRedeeming(true);

        try {
            const res = await fetch(`/api/gift-cards/redeem`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ code })
            });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message || 'Buono Regalo accreditato con successo!', 'success');
                setRedeemCode('');
                await fetchWallet();
            } else {
                showToast(data.error || 'Errore durante il riscatto della Gift Card.', 'error');
            }
        } catch (err) {
            showToast('Errore di connessione con il server.', 'error');
        } finally {
            setIsRedeeming(false);
        }
    };

    // 4. City change helper
    const handleCityChange = (selectedCity: string) => {
        const cityData = cities.find(c => c.city === selectedCity);
        setFormData(prev => ({
            ...prev,
            city: selectedCity,
            zipCode: cityData ? cityData.zipCode : ''
        }));
    };

    // 5. GPS Locator
    const handleLocateMe = () => {
        if (!navigator.geolocation) {
            showToast('Geolocalizzazione non supportata dal tuo browser', 'error');
            return;
        }
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setFormData(prev => ({
                    ...prev,
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude
                }));
                setIsLocating(false);
                showToast('Coordinate GPS acquisite con successo!', 'success');
            },
            (err) => {
                console.error(err);
                setIsLocating(false);
                showToast('Impossibile recuperare la posizione GPS.', 'error');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    // 6. Resend verification email
    const handleResendVerification = async () => {
        if (!user?.email || isResendingEmail) return;
        setIsResendingEmail(true);
        try {
            const res = await fetch(`/api/auth/resend-verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email })
            });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message || 'Email di verifica inviata! Controlla la tua casella postale.', 'success');
            } else {
                showToast(data.error || 'Impossibile inviare l\'email di verifica.', 'error');
            }
        } catch (err) {
            showToast('Errore di connessione', 'error');
        } finally {
            setIsResendingEmail(false);
        }
    };

    // 7. Profile Save Submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Phone validation check
        const cleanPhone = formData.phone.replace(/[\s\-\(\)]/g, '');
        if (cleanPhone.length < 8) {
            showToast('Inserisci un numero di cellulare valido.', 'error');
            return;
        }

        setIsSaving(true);

        try {
            const payload = {
                ...formData,
                avatar: formData.avatar || null // ensure null when unset
            };

            const res = await fetch(`/api/auth/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok && data.user) {
                // Update zustand store with new user data
                login(token!, data.user);
                updateUser(data.user);
                showToast('Profilo aggiornato con successo!', 'success');
            } else {
                showToast('Errore: ' + (data.error || 'Salvataggio fallito'), 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Errore di connessione con il server', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // 8. Change Password Submit
    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            showToast('Le due nuove password non coincidono', 'error');
            return;
        }
        if (passwordData.newPassword.length < 6) {
            showToast('La nuova password deve contenere almeno 6 caratteri', 'error');
            return;
        }

        setIsChangingPassword(true);
        try {
            const res = await fetch(`/api/auth/change-password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword
                })
            });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message || 'Password aggiornata con successo!', 'success');
                setIsPasswordModalOpen(false);
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                showToast(data.error || 'Errore nel cambio password', 'error');
            }
        } catch (err) {
            showToast('Errore di connessione', 'error');
        } finally {
            setIsChangingPassword(false);
        }
    };

    if (!user) {
        return (
            <div className="min-h-[80vh] bg-gradient-to-br from-nature-50 via-gray-50 to-emerald-50/40 flex items-center justify-center p-4">
                <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-gray-100 max-w-sm w-full text-center space-y-4">
                    <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto text-2xl shadow-inner">
                        🔒
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Accesso Richiesto</h2>
                    <p className="text-gray-500 text-xs sm:text-sm">Effettua il login per accedere al tuo profilo e gestire i tuoi dati personali.</p>
                    <Link
                        to="/login"
                        className="inline-flex items-center justify-center w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white font-black text-sm rounded-2xl transition-all shadow-md cursor-pointer"
                    >
                        Accedi Ora →
                    </Link>
                </div>
            </div>
        );
    }

    const currentBalanceEuro = ((walletData?.balance ?? user.walletBalance ?? 0) / 100).toFixed(2);
    const isEmailVerified = user.isEmailVerified !== false;

    return (
        <div className="bg-gradient-to-br from-nature-50 via-slate-50 to-emerald-50/30 min-h-screen py-4 sm:py-8 pb-32">
            {/* Floating Toast Notification */}
            {toast && (
                <div className="fixed top-4 right-4 left-4 sm:left-auto sm:max-w-md z-50 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className={`p-4 rounded-2xl shadow-2xl border flex items-center justify-between gap-3 text-sm font-bold backdrop-blur-md ${
                        toast.type === 'error'
                            ? 'bg-red-900/95 text-white border-red-700 shadow-red-900/20'
                            : 'bg-emerald-900/95 text-white border-emerald-700 shadow-emerald-900/20'
                    }`}>
                        <div className="flex items-center gap-2.5 min-w-0">
                            {toast.type === 'error' ? (
                                <AlertCircle className="w-5 h-5 text-red-300 shrink-0" />
                            ) : (
                                <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
                            )}
                            <span className="truncate">{toast.text}</span>
                        </div>
                        <button
                            onClick={() => setToast(null)}
                            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 shrink-0 transition"
                            aria-label="Chiudi notifica"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}

            <div className="max-w-4xl mx-auto px-3.5 sm:px-6 space-y-4 sm:space-y-6">

                {/* HERO HEADER: Mobile-First, Ergonomic & Clean */}
                <div className="bg-gradient-to-br from-nature-950 via-emerald-950 to-nature-900 text-white rounded-3xl p-5 sm:p-7 shadow-xl relative overflow-hidden border border-emerald-900/40">
                    <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 relative z-10 text-center sm:text-left">
                        {/* Avatar Display with Active Selected Preview */}
                        <div className="relative group shrink-0">
                            <div className="w-22 h-22 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl bg-white/10 p-1.5 backdrop-blur-md shadow-2xl border border-white/20 overflow-hidden flex items-center justify-center">
                                {formData.avatar ? (
                                    <img
                                        src={sanitizeImageUrl(formData.avatar)}
                                        alt="Avatar"
                                        className="w-full h-full object-contain rounded-xl sm:rounded-2xl"
                                    />
                                ) : (
                                    <div className="w-full h-full rounded-xl sm:rounded-2xl bg-nature-800 flex items-center justify-center text-emerald-300">
                                        <UserIcon size={36} />
                                    </div>
                                )}
                            </div>
                            {formData.avatar && (
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, avatar: '' }))}
                                    title="Rimuovi Avatar"
                                    className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full shadow-md text-[10px] transition cursor-pointer"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>

                        {/* User Details & Quick Actions */}
                        <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                <h1 className="text-xl sm:text-2xl font-black text-white truncate max-w-full">
                                    {formData.name || user.name || 'Cliente'}
                                </h1>
                                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                    <ShieldCheck size={11} /> Cliente Registrato
                                </span>
                            </div>

                            <p className="text-emerald-200/80 text-xs sm:text-sm flex items-center justify-center sm:justify-start gap-1.5 truncate">
                                <Mail size={13} className="shrink-0 text-emerald-400" />
                                <span className="truncate">{user.email}</span>
                            </p>

                            {/* Email Verification Status Badge */}
                            <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                {isEmailVerified ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-800/80 px-2.5 py-0.5 rounded-full">
                                        <CheckCircle2 size={12} className="text-emerald-400" /> Email Verificata
                                    </span>
                                ) : (
                                    <div className="inline-flex items-center gap-1.5 bg-amber-950/80 border border-amber-600/40 px-2.5 py-1 rounded-xl text-[11px]">
                                        <span className="font-bold text-amber-300">Email non verificata</span>
                                        <button
                                            type="button"
                                            onClick={handleResendVerification}
                                            disabled={isResendingEmail}
                                            className="underline text-amber-200 hover:text-white font-bold ml-1 cursor-pointer disabled:opacity-50 flex items-center gap-1"
                                        >
                                            <Send size={10} /> {isResendingEmail ? 'Invio...' : 'Reinvia Link'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Header Buttons: Orders & Change Password */}
                            <div className="pt-2 flex flex-wrap justify-center sm:justify-start gap-2 sm:gap-2.5">
                                <Link
                                    to="/orders"
                                    className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-white/10 hover:bg-white/20 active:scale-[0.98] text-white font-black text-xs rounded-xl backdrop-blur-md transition-all flex items-center gap-1.5 cursor-pointer border border-white/10"
                                >
                                    <ShoppingBag size={14} className="text-emerald-300" /> I Miei Ordini
                                </Link>

                                <button
                                    type="button"
                                    onClick={() => setIsPasswordModalOpen(true)}
                                    className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-emerald-800/60 hover:bg-emerald-800/90 active:scale-[0.98] text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-emerald-600/40"
                                >
                                    <Lock size={13} className="text-emerald-300" /> Cambia Password
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SECTION 1: WALLET & GIFT CARDS */}
                <div className="bg-white p-5 sm:p-7 rounded-3xl shadow-sm border border-gray-100 space-y-4">
                    <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                                <Wallet className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-base sm:text-lg font-black text-gray-900 leading-tight">Il Mio Saldo</h2>
                                <p className="text-[11px] sm:text-xs text-gray-500">Credito scalabile ad ogni acquisto</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Disponibile</span>
                            <span className="text-xl sm:text-2xl font-black text-emerald-600">
                                € {currentBalanceEuro}
                            </span>
                        </div>
                    </div>

                    {/* Form Riscatto Gift Card */}
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50/70 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 space-y-2">
                        <div className="flex items-center gap-2">
                            <Gift className="w-4 h-4 text-emerald-700 shrink-0" />
                            <h3 className="font-bold text-xs sm:text-sm text-emerald-950">Hai un Buono Regalo o Gift Card?</h3>
                        </div>
                        <p className="text-[11px] sm:text-xs text-emerald-800/80">
                            Inserisci il codice per accreditare subito l'importo sul tuo saldo.
                        </p>

                        <form onSubmit={handleRedeem} className="flex flex-col sm:flex-row gap-2.5 pt-1">
                            <input
                                type="text"
                                placeholder="Es. GIFT-9A4B-8X2F"
                                value={redeemCode}
                                onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                                className="flex-1 px-3.5 py-2.5 sm:py-3 bg-white border border-emerald-300 rounded-xl text-xs sm:text-sm font-mono font-bold tracking-wider uppercase text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                            <button
                                type="submit"
                                disabled={isRedeeming || !redeemCode.trim()}
                                className="px-5 py-2.5 sm:py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {isRedeeming ? 'Caricamento...' : 'Carica sul Saldo'}
                            </button>
                        </form>
                    </div>

                    <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 pt-1 gap-2">
                        <Link to="/gift-cards" className="font-bold text-emerald-700 hover:text-emerald-800 underline flex items-center gap-1">
                            Regala una Gift Card →
                        </Link>

                        {walletData?.transactions && walletData.transactions.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setShowTransactions(!showTransactions)}
                                className="text-gray-500 hover:text-gray-800 font-bold flex items-center gap-1 cursor-pointer text-xs"
                            >
                                {showTransactions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                {showTransactions ? 'Nascondi Movimenti' : `Storico Movimenti (${walletData.transactions.length})`}
                            </button>
                        )}
                    </div>

                    {/* Storico Transazioni Saldo (Collapsible per evitare disordine su mobile) */}
                    {showTransactions && walletData?.transactions && (
                        <div className="pt-2 border-t border-gray-100 animate-in fade-in duration-200">
                            <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                                {walletData.transactions.map((tx: any) => (
                                    <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                                tx.amount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                                            }`}>
                                                {tx.amount > 0 ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-800">{tx.description}</div>
                                                <div className="text-[10px] text-gray-400">
                                                    {new Date(tx.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`font-bold font-mono text-xs sm:text-sm ${tx.amount > 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
                                            {tx.amount > 0 ? '+' : ''}{(tx.amount / 100).toFixed(2)} €
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* MAIN PROFILE FORM */}
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">

                    {/* SECTION 2: DATI PERSONALI & AVATAR PICKER */}
                    <div className="bg-white p-5 sm:p-7 rounded-3xl shadow-sm border border-gray-100 space-y-5">
                        <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                            <h2 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
                                <UserIcon size={18} className="text-emerald-600" /> Dati Personali
                            </h2>
                            {formData.avatar && (
                                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                    Avatar Selezionato
                                </span>
                            )}
                        </div>

                        {/* Avatar Picker: Touch-friendly horizontal scroll / grid */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                    Scegli il tuo Avatar
                                </label>
                                {formData.avatar && (
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, avatar: '' })}
                                        className="text-[11px] text-gray-400 hover:text-red-600 font-bold underline cursor-pointer"
                                    >
                                        Rimuovi Avatar
                                    </button>
                                )}
                            </div>

                            {avatars.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">Nessun avatar preimpostato disponibile.</p>
                            ) : (
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3 sm:gap-4 pt-1">
                                    {avatars.map((avatarUrl, idx) => {
                                        const isSelected = formData.avatar === avatarUrl;
                                        return (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, avatar: avatarUrl })}
                                                className={`relative aspect-square rounded-2xl sm:rounded-3xl p-2 transition-all cursor-pointer flex items-center justify-center ${
                                                    isSelected
                                                        ? 'border-2 border-emerald-600 bg-emerald-50/90 ring-4 ring-emerald-500/25 shadow-lg scale-105'
                                                        : 'border-2 border-gray-100 bg-slate-50/70 hover:border-emerald-300 hover:bg-emerald-50/40 hover:scale-105 shadow-2xs'
                                                }`}
                                            >
                                                <img
                                                    src={sanitizeImageUrl(avatarUrl)}
                                                    alt={`Avatar ${idx + 1}`}
                                                    className="w-full h-full object-contain drop-shadow-xs"
                                                />
                                                {isSelected && (
                                                    <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-md border-2 border-white">
                                                        <Check size={13} strokeWidth={3} />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Inputs: Name & Phone */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Nome e Cognome *
                                </label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Es. Mario Rossi"
                                    className="w-full p-3 sm:p-3.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-base sm:text-sm font-bold text-gray-900 bg-white"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                    <Phone size={13} className="text-emerald-600" /> Cellulare / WhatsApp *
                                </label>
                                <input
                                    required
                                    type="tel"
                                    placeholder="+39 333 1234567"
                                    className="w-full p-3 sm:p-3.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-base sm:text-sm font-bold text-gray-900 bg-white"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: INDIRIZZO DI SPEDIZIONE & GPS */}
                    <div className="bg-white p-5 sm:p-7 rounded-3xl shadow-sm border border-gray-100 space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h2 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
                                <MapPin size={18} className="text-emerald-600" /> Indirizzo di Spedizione
                            </h2>
                            <button
                                type="button"
                                onClick={handleLocateMe}
                                disabled={isLocating}
                                className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                                <Navigation size={12} className={isLocating ? 'animate-spin' : ''} />
                                <span>{isLocating ? 'GPS...' : 'Rileva GPS'}</span>
                            </button>
                        </div>

                        {formData.latitude && formData.longitude && (
                            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl px-3 py-2 text-[11px] font-bold text-emerald-900 flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                    📍 GPS attivo: {formData.latitude.toFixed(5)}, {formData.longitude.toFixed(5)}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, latitude: null, longitude: null }))}
                                    className="text-emerald-700 hover:text-red-600 underline cursor-pointer"
                                >
                                    Rimuovi
                                </button>
                            </div>
                        )}

                        <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Via / Piazza</label>
                                <input
                                    type="text"
                                    placeholder="Via Roma"
                                    className="w-full p-3 sm:p-3.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-base sm:text-sm font-bold text-gray-900"
                                    value={formData.street}
                                    onChange={e => setFormData({ ...formData, street: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Civico</label>
                                <input
                                    type="text"
                                    placeholder="15"
                                    className="w-full p-3 sm:p-3.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-base sm:text-sm font-bold text-gray-900"
                                    value={formData.civic}
                                    onChange={e => setFormData({ ...formData, civic: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Comune Servito</label>
                                <SearchableSelect
                                    options={[
                                        { value: '', label: 'Seleziona Comune' },
                                        ...cities.map(c => ({ value: c.city, label: c.city }))
                                    ]}
                                    value={formData.city}
                                    onChange={handleCityChange}
                                    placeholder="Seleziona Comune"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">CAP</label>
                                <input
                                    type="text"
                                    readOnly
                                    placeholder="CAP"
                                    className="w-full p-3 sm:p-3.5 border border-gray-200 rounded-2xl bg-gray-50 text-gray-600 font-bold text-base sm:text-sm outline-none"
                                    value={formData.zipCode}
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 4: NOTIFICHE E PESATURA */}
                    <div className="bg-white p-5 sm:p-7 rounded-3xl shadow-sm border border-gray-100 space-y-3">
                        <h2 className="text-base sm:text-lg font-black text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                            <Bell size={18} className="text-emerald-600" /> Preferenza Notifiche e Pesatura
                        </h2>
                        <p className="text-[11px] sm:text-xs text-gray-500">
                            Dove vuoi ricevere le conferme di pesatura dei prodotti freschi e lo scontrino finale?
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, notificationPreference: 'EMAIL' })}
                                className={`p-3.5 sm:p-4 rounded-2xl border-2 text-left transition cursor-pointer flex items-center gap-3 ${
                                    formData.notificationPreference === 'EMAIL'
                                        ? 'border-emerald-600 bg-emerald-50/90 text-emerald-950 shadow-sm ring-2 ring-emerald-600/20 font-black'
                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                            >
                                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                                    <Mail size={18} />
                                </div>
                                <div className="min-w-0">
                                    <div className="font-black text-xs sm:text-sm">Email</div>
                                    <div className="text-[10px] sm:text-[11px] text-gray-500 truncate">Messaggio riepilogativo nella casella di posta</div>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, notificationPreference: 'WHATSAPP' })}
                                className={`p-3.5 sm:p-4 rounded-2xl border-2 text-left transition cursor-pointer flex items-center gap-3 ${
                                    formData.notificationPreference === 'WHATSAPP'
                                        ? 'border-emerald-600 bg-emerald-50/90 text-emerald-950 shadow-sm ring-2 ring-emerald-600/20 font-black'
                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                            >
                                <div className="w-9 h-9 rounded-xl bg-green-100 text-green-800 flex items-center justify-center shrink-0 text-base">
                                    💬
                                </div>
                                <div className="min-w-0">
                                    <div className="font-black text-xs sm:text-sm">WhatsApp</div>
                                    <div className="text-[10px] sm:text-[11px] text-gray-500 truncate">Notifica istantanea sul tuo numero cellulare</div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* SAVE BUTTON: Sticky on mobile for quick access */}
                    <div className="fixed sm:static bottom-4 left-4 right-4 z-40 sm:z-auto sm:flex sm:justify-end pt-2">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="w-full sm:w-auto px-8 py-3.5 sm:py-4 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] disabled:opacity-50 text-white font-black rounded-2xl shadow-xl shadow-emerald-900/25 text-sm sm:text-base transition cursor-pointer flex items-center justify-center gap-2"
                        >
                            <Save size={18} />
                            {isSaving ? 'Salvataggio in corso...' : 'Salva Modifiche Profilo'}
                        </button>
                    </div>
                </form>
            </div>

            {/* MODAL CAMBIO PASSWORD */}
            {isPasswordModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-100 space-y-5">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                                    <Lock size={18} />
                                </div>
                                <h3 className="text-lg font-black text-gray-900">Cambia Password</h3>
                            </div>
                            <button
                                onClick={() => setIsPasswordModalOpen(false)}
                                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-xl hover:bg-gray-100 transition cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handlePasswordSubmit} className="space-y-4">
                            {/* Current Password */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Password Attuale *
                                </label>
                                <div className="relative">
                                    <input
                                        required
                                        type={showPasswords.current ? 'text' : 'password'}
                                        value={passwordData.currentPassword}
                                        onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                        className="w-full p-3 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-bold text-gray-900 outline-none"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* New Password */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Nuova Password (min. 6 caratteri) *
                                </label>
                                <div className="relative">
                                    <input
                                        required
                                        type={showPasswords.next ? 'text' : 'password'}
                                        value={passwordData.newPassword}
                                        onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                        className="w-full p-3 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-bold text-gray-900 outline-none"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords({ ...showPasswords, next: !showPasswords.next })}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPasswords.next ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Conferma Nuova Password *
                                </label>
                                <div className="relative">
                                    <input
                                        required
                                        type={showPasswords.confirm ? 'text' : 'password'}
                                        value={passwordData.confirmPassword}
                                        onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                        className="w-full p-3 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-bold text-gray-900 outline-none"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-2.5 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsPasswordModalOpen(false)}
                                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition cursor-pointer"
                                >
                                    Annulla
                                </button>
                                <button
                                    type="submit"
                                    disabled={isChangingPassword}
                                    className="flex-1 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition cursor-pointer shadow-md"
                                >
                                    {isChangingPassword ? 'Salvataggio...' : 'Aggiorna'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
