import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { User as UserIcon, MapPin, Phone, Save, Bell, Mail, ShieldCheck, Check, ShoppingBag, Sparkles, Navigation } from 'lucide-react';
import { sanitizeImageUrl } from '../utils/imageUrl';
import { SearchableSelect } from '../components/admin/SearchableSelect';
import { Link } from 'react-router-dom';

export const Profile = () => {
    const { user, token, login } = useAuthStore();
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
    const [cities, setCities] = useState<any[]>([]);
    const [avatars, setAvatars] = useState<string[]>([]);
    const [message, setMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isLocating, setIsLocating] = useState(false);

    useEffect(() => {
        fetch(`/api/delivery-zones`)
            .then(res => res.json())
            .then(data => { if (Array.isArray(data)) setCities(data); })
            .catch(console.error);

        fetch(`/api/avatars`)
            .then(res => res.json())
            .then(data => { if (Array.isArray(data)) setAvatars(data); })
            .catch(console.error);

        if (user) {
            setFormData({
                name: user.name || '',
                email: user.email,
                phone: user.phone || '+39 ',
                street: user.street || '',
                civic: user.civic || '',
                city: user.city || '',
                zipCode: user.zipCode || '',
                avatar: user.avatar || '',
                latitude: (user as any).latitude || null,
                longitude: (user as any).longitude || null,
                notificationPreference: user.notificationPreference || 'EMAIL'
            });
        }
    }, [user]);

    const handleCityChange = (selectedCity: string) => {
        const cityData = cities.find(c => c.city === selectedCity);
        setFormData(prev => ({
            ...prev,
            city: selectedCity,
            zipCode: cityData ? cityData.zipCode : ''
        }));
    };

    const handleLocateMe = () => {
        if (!navigator.geolocation) {
            alert("La geolocalizzazione non è supportata dal tuo browser");
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
            },
            (err) => {
                console.error(err);
                setIsLocating(false);
                alert("Impossibile recuperare la posizione GPS.");
            }
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage('');

        try {
            const res = await fetch(`/api/auth/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok) {
                login(token!, data.user);
                setMessage('Profilo aggiornato con successo!');
            } else {
                setMessage('Errore: ' + data.error);
            }
        } catch (err) {
            console.error(err);
            setMessage('Errore di connessione');
        } finally {
            setIsSaving(false);
        }
    };

    if (!user) return (
        <div className="min-h-screen bg-gradient-to-br from-nature-50 via-gray-50 to-emerald-50/30 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 max-w-md text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto text-2xl">
                    🔒
                </div>
                <h2 className="text-2xl font-black text-gray-900">Accesso Richiesto</h2>
                <p className="text-gray-500 text-sm">Effettua il login per accedere al tuo profilo e gestire i tuoi dati.</p>
                <Link to="/login" className="inline-block w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black rounded-2xl transition-all shadow-md">
                    Accedi Ora →
                </Link>
            </div>
        </div>
    );

    return (
        <div className="bg-gradient-to-br from-nature-50 via-gray-50 to-emerald-50/30 min-h-screen py-6 md:py-12 pb-24">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">

                {/* Hero Profile Header Card */}
                <div className="bg-gradient-to-r from-nature-900 via-emerald-950 to-nature-900 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
                        {/* Avatar Showcase */}
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-white/10 p-1.5 backdrop-blur-md shadow-2xl shrink-0 relative group">
                            <div className="w-full h-full rounded-2xl bg-nature-800 overflow-hidden flex items-center justify-center border border-white/20">
                                {formData.avatar ? (
                                    <img src={sanitizeImageUrl(formData.avatar)} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <UserIcon size={44} className="text-emerald-300" />
                                )}
                            </div>
                        </div>

                        {/* User Details Header */}
                        <div className="text-center sm:text-left space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                <h1 className="text-2xl sm:text-3xl font-black text-white truncate">{user.name || 'Cliente'}</h1>
                                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                    <ShieldCheck size={12} /> Cliente Registrato
                                </span>
                            </div>

                            <p className="text-emerald-200/80 text-xs sm:text-sm flex items-center justify-center sm:justify-start gap-1.5">
                                <Mail size={14} className="shrink-0" /> {user.email}
                            </p>

                            <div className="pt-2 flex flex-wrap justify-center sm:justify-start gap-3">
                                <Link
                                    to="/orders"
                                    className="px-4 py-2 bg-white/15 hover:bg-white/25 text-white font-black text-xs rounded-xl backdrop-blur-md transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                    <ShoppingBag size={14} /> I Miei Ordini
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {message && (
                    <div className={`p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 animate-in fade-in duration-200 ${
                        message.includes('Errore')
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}>
                        <Sparkles size={16} className="shrink-0" />
                        <span>{message}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Section 1: Dati Personali & Avatar */}
                    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
                        <h3 className="text-lg font-black text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                            <UserIcon size={20} className="text-emerald-600" /> Dati Personali e Avatar
                        </h3>

                        {/* Avatar Picker */}
                        <div className="space-y-3">
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Seleziona Avatar</label>
                            {avatars.length === 0 ? (
                                <p className="text-xs text-gray-400">Nessun avatar disponibile.</p>
                            ) : (
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                                    {avatars.map((avatar, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, avatar })}
                                            className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
                                                formData.avatar === avatar
                                                    ? 'border-emerald-600 ring-4 ring-emerald-500/20 shadow-md scale-105'
                                                    : 'border-gray-200 hover:border-emerald-300 opacity-80 hover:opacity-100'
                                            }`}
                                        >
                                            <img src={sanitizeImageUrl(avatar)} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                                            {formData.avatar === avatar && (
                                                <div className="absolute top-1 right-1 w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow">
                                                    <Check size={12} />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Inputs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Nome e Cognome *</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full p-3.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-bold text-gray-900"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                    <Phone size={14} className="text-emerald-600" /> Cellulare / WhatsApp *
                                </label>
                                <input
                                    required
                                    type="tel"
                                    className="w-full p-3.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-bold text-gray-900"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Indirizzo di Spedizione predefinito */}
                    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                <MapPin size={20} className="text-emerald-600" /> Indirizzo di Spedizione Predefinito
                            </h3>
                            <button
                                type="button"
                                onClick={handleLocateMe}
                                disabled={isLocating}
                                className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                                <Navigation size={13} className={isLocating ? 'animate-spin' : ''} />
                                {isLocating ? 'GPS...' : 'Posizione GPS'}
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-3 md:gap-4">
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Via / Piazza</label>
                                <input
                                    type="text"
                                    placeholder="Via Roma"
                                    className="w-full p-3.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-bold text-gray-900"
                                    value={formData.street}
                                    onChange={e => setFormData({ ...formData, street: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Civico</label>
                                <input
                                    type="text"
                                    placeholder="15"
                                    className="w-full p-3.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-bold text-gray-900"
                                    value={formData.civic}
                                    onChange={e => setFormData({ ...formData, civic: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 md:gap-4">
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
                                    className="w-full p-3.5 border border-gray-200 rounded-2xl bg-gray-50 text-gray-600 font-bold text-sm outline-none"
                                    value={formData.zipCode}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Canale Notifiche Pesatura */}
                    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 space-y-4">
                        <h3 className="text-lg font-black text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                            <Bell size={20} className="text-emerald-600" /> Preferenza Notifiche e Pesatura
                        </h3>
                        <p className="text-xs text-gray-500">Scegli come desideri ricevere le richieste di conferma pesatura e gli scontrini finali.</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, notificationPreference: 'EMAIL' })}
                                className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-3 ${
                                    formData.notificationPreference === 'EMAIL'
                                        ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 shadow-sm ring-2 ring-emerald-600/20 font-black'
                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                            >
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                                    <Mail size={20} />
                                </div>
                                <div>
                                    <div className="font-black text-sm">Email</div>
                                    <div className="text-[11px] text-gray-500">Messaggio di conferma via Email</div>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, notificationPreference: 'WHATSAPP' })}
                                className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-3 ${
                                    formData.notificationPreference === 'WHATSAPP'
                                        ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 shadow-sm ring-2 ring-emerald-600/20 font-black'
                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                            >
                                <div className="w-10 h-10 rounded-xl bg-green-100 text-green-800 flex items-center justify-center shrink-0">
                                    💬
                                </div>
                                <div>
                                    <div className="font-black text-sm">WhatsApp</div>
                                    <div className="text-[11px] text-gray-500">Notifica istantanea sul cellulare</div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Action Save Button */}
                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="w-full sm:w-auto px-10 py-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-black rounded-2xl shadow-xl shadow-emerald-700/20 text-base transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                        >
                            <Save size={20} />
                            {isSaving ? 'Salvataggio...' : 'Salva Modifiche Profilo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
