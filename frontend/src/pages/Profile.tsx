import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { User, MapPin, Phone, Save, Bell } from 'lucide-react';

import { LocationPicker } from '../components/LocationPicker';
import { sanitizeImageUrl } from '../utils/imageUrl';

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

    useEffect(() => {
        fetch(`/api/delivery-zones`)
            .then(res => res.json())
            .then(data => setCities(data))
            .catch(console.error);

        fetch(`/api/avatars`)
            .then(res => res.json())
            .then(data => setAvatars(data))
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
                notificationPreference: (user as any).notificationPreference || 'EMAIL'
            });
        }
    }, [user]);

    const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedCity = e.target.value;
        const cityData = cities.find(c => c.city === selectedCity);
        setFormData(prev => ({
            ...prev,
            city: selectedCity,
            zipCode: cityData ? cityData.zipCode : ''
        }));
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

    if (!user) return <div className="p-8 text-center text-gray-500">Effettua il login per vedere il tuo profilo.</div>;

    return (
        <div className="min-h-screen bg-nature-50 py-12 px-4">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="bg-white rounded-2xl shadow-sm p-8">
                    <div className="flex items-center gap-4 mb-8 pb-4 border-b border-gray-100">
                        <div className="w-16 h-16 bg-nature-100 rounded-full flex items-center justify-center text-nature-600 overflow-hidden relative border-2 border-white shadow-sm">
                            {formData.avatar ? (
                                <img src={sanitizeImageUrl(formData.avatar)} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <User size={32} />
                            )}
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-nature-900">Il Mio Profilo</h1>
                            <p className="text-gray-500">Gestisci i tuoi dati personali e di spedizione</p>
                        </div>
                    </div>

                    {message && (
                        <div className={`p-4 rounded-xl mb-6 text-sm font-bold ${message.includes('Errore') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                            {message}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Avatar Selection */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-3">Scegli il tuo Avatar</label>
                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                                {avatars.map((avatar, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, avatar })}
                                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${formData.avatar === avatar ? 'border-nature-600 ring-2 ring-nature-200 ring-offset-2' : 'border-transparent hover:border-nature-200'}`}
                                    >
                                        <img src={sanitizeImageUrl(avatar)} alt={`Avatar ${index + 1}`} className="w-full h-full object-cover" />
                                        {formData.avatar === avatar && (
                                            <div className="absolute inset-0 bg-nature-900/10 flex items-center justify-center">
                                                <div className="bg-nature-600 text-white p-1 rounded-full shadow-sm">
                                                    <User size={12} fill="currentColor" />
                                                </div>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nome Completo</label>
                                <input
                                    type="text"
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-nature-500 outline-none"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    disabled
                                    className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                                    value={formData.email}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                                <Phone size={16} /> Telefono
                            </label>
                            <input
                                type="tel"
                                placeholder="Il tuo numero per contattarti alla consegna"
                                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-nature-500 outline-none"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>

                        {/* Notification Preference Selector */}
                        <div className="bg-nature-50 p-4 rounded-xl border border-nature-100">
                            <label className="flex items-center text-sm font-bold text-gray-700 mb-3 gap-2">
                                <Bell size={16} className="text-nature-600" />
                                Preferenza Notifiche Ordine
                            </label>
                            <div className="flex gap-4">
                                <label className={`flex-1 flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all ${formData.notificationPreference === 'EMAIL' ? 'border-nature-600 bg-white shadow-sm' : 'border-transparent bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                                    <input
                                        type="radio"
                                        name="notificationPreference"
                                        value="EMAIL"
                                        checked={formData.notificationPreference === 'EMAIL'}
                                        onChange={() => setFormData({ ...formData, notificationPreference: 'EMAIL' })}
                                        className="hidden"
                                    />
                                    <span className="font-medium text-sm">Email</span>
                                </label>
                                <label className={`flex-1 flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all ${formData.notificationPreference === 'WHATSAPP' ? 'border-green-500 bg-white shadow-sm' : 'border-transparent bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                                    <input
                                        type="radio"
                                        name="notificationPreference"
                                        value="WHATSAPP"
                                        checked={formData.notificationPreference === 'WHATSAPP'}
                                        onChange={() => setFormData({ ...formData, notificationPreference: 'WHATSAPP' })}
                                        className="hidden"
                                    />
                                    <span className="font-medium text-sm text-green-700">WhatsApp</span>
                                </label>
                            </div>
                            <p className="text-xs text-gray-500 mt-2 text-center">Scegli come ricevere le conferme e gli aggiornamenti di consegna.</p>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-gray-100">
                            <h3 className="font-bold text-lg text-nature-900 flex items-center gap-2">
                                <MapPin size={20} /> Indirizzo di Spedizione
                            </h3>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Via / Piazza</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-nature-500 outline-none"
                                        value={formData.street}
                                        onChange={e => setFormData({ ...formData, street: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Civico</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-nature-500 outline-none"
                                        value={formData.civic}
                                        onChange={e => setFormData({ ...formData, civic: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Comune</label>
                                    <select
                                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-nature-500 outline-none bg-white"
                                        value={formData.city}
                                        onChange={handleCityChange}
                                    >
                                        <option value="">Seleziona Comune</option>
                                        {cities.map(c => (
                                            <option key={c.id} value={c.city}>{c.city}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">CAP</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
                                        readOnly
                                        value={formData.zipCode}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Location Picker */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Posizione Esatta (Opzionale)</label>
                            <p className="text-xs text-gray-500 mb-2">Seleziona la tua posizione sulla mappa per aiutare il corriere.</p>
                            <LocationPicker
                                initialLat={formData.latitude || undefined}
                                initialLng={formData.longitude || undefined}
                                onLocationSelect={(lat, lng) => setFormData({ ...formData, latitude: lat, longitude: lng })}
                            />
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="bg-nature-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-nature-800 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                <Save size={20} />
                                {isSaving ? 'Salvataggio...' : 'Salva Modifiche'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
