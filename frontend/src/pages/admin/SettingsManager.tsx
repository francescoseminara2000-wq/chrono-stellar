import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import {
    Save, Globe, Phone, MapPin, Megaphone,
    MessageSquare, User as UserIcon, Upload, Trash2,
    Plus, Edit2, X, Tag
} from 'lucide-react';
import { useToastStore } from '../../store/useToastStore';
import { LocationPicker } from '../../components/LocationPicker';
import { sanitizeImageUrl } from '../../utils/imageUrl';
import { useAppState } from '../../store/useAppState';

const API_URL = import.meta.env.VITE_API_URL || '';

// --- Components ---

const TemplateField = ({ label, field, value, tags, onInsertTag, onChange, textareaRef }: any) => (
    <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <label className="text-sm font-bold text-gray-700">{label}</label>
            <div className="flex flex-wrap gap-1">
                {tags.map((tag: any) => (
                    <button
                        key={tag}
                        type="button"
                        onClick={() => onInsertTag(field, `[${tag}]`)}
                        className="px-2 py-1 text-[10px] uppercase font-bold bg-nature-50 text-nature-600 border border-nature-200 rounded-md hover:bg-nature-100 transition-colors"
                    >
                        +{tag}
                    </button>
                ))}
            </div>
        </div>
        <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500 transition-colors text-sm font-sans"
        />
    </div>
);

export const SettingsManager = () => {
    const { token } = useAuthStore();
    const [activeTab, setActiveTab] = useState('general');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { addToast } = useToastStore();
    const { fetchSettings: refreshGlobalSettings } = useAppState();

    // --- Settings State ---
    const [formData, setFormData] = useState({
        siteName: '', tagline: '', contactEmail: '', contactPhone: '', contactAddress: '',
        openingHours: '', announcementText: '', announcementActive: false,
        waTemplateCreated: '', waTemplateWeighing: '', waTemplateOutForDelivery: '',
        waTemplatePickupReady: '', waTemplateDelivered: '', waTemplateCancelled: '',
        latitude: null as number | null, longitude: null as number | null,
        logoUrl: null as string | null,
        colorTheme: 'green',
        primaryColor: '#16a34a',
        accentColor: '#ef4444'
    });

    const refs = {
        waTemplateCreated: useRef<HTMLTextAreaElement>(null),
        waTemplateWeighing: useRef<HTMLTextAreaElement>(null),
        waTemplateOutForDelivery: useRef<HTMLTextAreaElement>(null),
        waTemplatePickupReady: useRef<HTMLTextAreaElement>(null),
        waTemplateDelivered: useRef<HTMLTextAreaElement>(null),
        waTemplateCancelled: useRef<HTMLTextAreaElement>(null),
    };

    // --- Delivery Zones State ---
    const [zones, setZones] = useState<any[]>([]);
    const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
    const [currentZone, setCurrentZone] = useState<any>({ city: '', zipCode: '', shippingCost: 0, isActive: true });

    // --- Avatars State ---
    const [avatars, setAvatars] = useState<string[]>([]);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);

    // --- Categories State ---
    const [categories, setCategories] = useState<any[]>([]);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [currentCategory, setCurrentCategory] = useState<any>({ name: '', color: '#1e3f20' });

    useEffect(() => {
        if (token) {
            fetchAllData();
        }
    }, [token]);

    const fetchAllData = async () => {
        setIsLoading(true);
        try {
            await Promise.all([
                fetchSettings(),
                fetchZones(),
                fetchAvatars(),
                fetchCategories()
            ]);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Settings Logic ---
    const fetchSettings = async () => {
        const res = await fetch(`${API_URL}/api/settings`);
        if (res.ok) {
            const data = await res.json();
            setFormData({
                siteName: data.siteName || '',
                tagline: data.tagline || '',
                contactEmail: data.contactEmail || '',
                contactPhone: data.contactPhone || '',
                contactAddress: data.contactAddress || '',
                openingHours: data.openingHours || '',
                announcementText: data.announcementText || '',
                announcementActive: data.announcementActive || false,
                waTemplateCreated: data.waTemplateCreated || '',
                waTemplateWeighing: data.waTemplateWeighing || '',
                waTemplateOutForDelivery: data.waTemplateOutForDelivery || '',
                waTemplatePickupReady: data.waTemplatePickupReady || '',
                waTemplateDelivered: data.waTemplateDelivered || '',
                waTemplateCancelled: data.waTemplateCancelled || '',
                latitude: data.latitude || null,
                longitude: data.longitude || null,
                logoUrl: data.logoUrl || null,
                colorTheme: data.colorTheme || 'green',
                primaryColor: data.primaryColor || '#16a34a',
                accentColor: data.accentColor || '#ef4444'
            });
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploadingLogo(true);
        const data = new FormData();
        data.append('image', file);
        try {
            const res = await fetch(`${API_URL}/api/admin/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: data
            });
            if (res.ok) {
                const result = await res.json();
                setFormData(prev => ({ ...prev, logoUrl: result.url }));
                addToast('Logo caricato con successo!', 'success');
            } else {
                addToast('Errore durante il caricamento del logo.', 'error');
            }
        } catch (err) {
            addToast('Errore di connessione al server.', 'error');
        } finally {
            setIsUploadingLogo(false);
            e.target.value = '';
        }
    };

    const handleInsertTag = (field: keyof typeof formData, tag: string) => {
        const ref = (refs as any)[field];
        if (!ref?.current) return;
        const textarea = ref.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = (formData as any)[field] as string;
        const newValue = text.substring(0, start) + tag + text.substring(end);
        setFormData(prev => ({ ...prev, [field]: newValue }));
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + tag.length, start + tag.length);
        }, 0);
    };

    const handleSettingsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                addToast('Impostazioni salvate con successo!', 'success');
                refreshGlobalSettings();
            } else {
                addToast('Errore durante il salvataggio.', 'error');
            }
        } catch (err) {
            addToast('Errore di connessione al server.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // --- Zones Logic ---
    const fetchZones = async () => {
        const res = await fetch(`${API_URL}/api/admin/delivery-zones`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) setZones(await res.json());
    };

    const handleZoneSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = currentZone.id ? `${API_URL}/api/admin/delivery-zones/${currentZone.id}` : `${API_URL}/api/admin/delivery-zones`;
        const method = currentZone.id ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(currentZone)
        });
        if (res.ok) {
            setIsZoneModalOpen(false);
            fetchZones();
        }
    };

    const deleteZone = async (id: number) => {
        if (!confirm('Eliminare zona?')) return;
        await fetch(`${API_URL}/api/admin/delivery-zones/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchZones();
    };

    // --- Avatars Logic ---
    const fetchAvatars = async () => {
        const res = await fetch(`${API_URL}/api/avatars`);
        if (res.ok) setAvatars(await res.json());
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploadingAvatar(true);
        const data = new FormData();
        data.append('image', file);
        const res = await fetch(`${API_URL}/api/admin/avatars`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: data
        });
        if (res.ok) {
            fetchAvatars();
            addToast('Avatar caricato con successo!', 'success');
        } else {
            addToast('Errore durante il caricamento dell\'avatar.', 'error');
        }
        setIsUploadingAvatar(false);
        e.target.value = '';
    };

    const deleteAvatar = async (path: string) => {
        if (!confirm('Eliminare avatar?')) return;
        const name = path.split('/').pop();
        await fetch(`${API_URL}/api/admin/avatars/${name}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchAvatars();
    };

    // --- Categories Logic ---
    const fetchCategories = async () => {
        const res = await fetch(`${API_URL}/api/admin/categories`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) setCategories(await res.json());
    };

    const handleCategorySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = currentCategory.id ? `${API_URL}/api/admin/categories/${currentCategory.id}` : `${API_URL}/api/admin/categories`;
        const method = currentCategory.id ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                name: currentCategory.name,
                color: currentCategory.color
            })
        });
        if (res.ok) {
            setIsCategoryModalOpen(false);
            fetchCategories();
            addToast('Categoria salvata!', 'success');
        } else {
            addToast('Errore nel salvataggio categoria.', 'error');
        }
    };

    const deleteCategory = async (id: number) => {
        if (!confirm('Eliminare categoria? I prodotti associati rimarranno senza categoria.')) return;
        const res = await fetch(`${API_URL}/api/admin/categories/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            fetchCategories();
            addToast('Categoria eliminata.', 'success');
        } else {
            addToast('Errore nell\'eliminazione.', 'error');
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nature-600"></div>
            </div>
        );
    }

    const tabs = [
        { id: 'general', label: 'Generale', icon: <Globe size={18} /> },
        { id: 'whatsapp', label: 'WhatsApp', icon: <MessageSquare size={18} /> },
        { id: 'zones', label: 'Zone', icon: <MapPin size={18} /> },
        { id: 'categories', label: 'Categorie', icon: <Tag size={18} /> },
        { id: 'avatars', label: 'Avatar', icon: <UserIcon size={18} /> },
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-nature-900">Impostazioni Pannello</h2>
                    <p className="text-gray-500 text-sm">Configura l'identità del sito, le notifiche e i contenuti.</p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-full overflow-x-auto custom-scrollbar">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap
                            ${activeTab === tab.id
                                ? 'bg-white text-nature-900 shadow-sm ring-1 ring-black/5'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                            }
                        `}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>


            {/* Tab Content */}
            <div className="mt-8">
                {activeTab === 'general' && (
                    <form onSubmit={handleSettingsSubmit} className="space-y-8 animate-in fade-in duration-300">
                        {/* Identità */}
                        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-purple-600"><Globe size={20} /> Identità del Sito</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Nome Negozio</label>
                                    <input type="text" value={formData.siteName} onChange={e => setFormData({ ...formData, siteName: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-nature-500/20" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Tagline (Homepage)</label>
                                    <input type="text" value={formData.tagline} onChange={e => setFormData({ ...formData, tagline: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-nature-500/20" />
                                </div>
                            </div>
                        </div>

                        {/* Logo Customization */}
                        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-indigo-600"><Upload size={20} /> Logo del Sito</h3>
                            <div className="flex flex-col md:flex-row items-center gap-8">
                                <div className="w-32 h-32 bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 flex items-center justify-center p-2 relative group shrink-0">
                                    <img src={formData.logoUrl ? sanitizeImageUrl(formData.logoUrl) : "/logo.png"} className="w-full h-full object-contain" alt="Logo Preview" />
                                    {formData.logoUrl && (
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, logoUrl: null })}
                                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white font-bold text-xs rounded-2xl"
                                        >
                                            <Trash2 size={18} className="mr-1 text-red-400" /> Rimuovi
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-3 flex-1 w-full">
                                    <label className="text-sm font-bold text-gray-700 block">Carica Logo Personalizzato</label>
                                    <p className="text-xs text-gray-400 mb-2">PNG trasparente consigliato. Verrà visualizzato nella barra di navigazione e nell'area amministrativa.</p>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            id="site-logo-upload"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleLogoUpload}
                                            disabled={isUploadingLogo}
                                        />
                                        <label
                                            htmlFor="site-logo-upload"
                                            className="inline-flex items-center gap-2 bg-nature-50 border border-nature-200 text-nature-700 px-6 py-3 rounded-xl font-bold cursor-pointer hover:bg-nature-100 transition-colors text-sm shadow-sm"
                                        >
                                            <Upload size={18} /> {isUploadingLogo ? 'Caricamento...' : 'Seleziona File'}
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Theme Customization */}
                        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-emerald-600"><Globe size={20} /> Palette Colori</h3>
                            <p className="text-sm text-gray-500 mb-6">Scegli una tavolozza di colori predefinita o crea una combinazione personalizzata per riflettere il tuo brand.</p>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-8">
                                {[
                                    { id: 'green', name: 'Foresta (Default)', primary: '#16a34a', accent: '#ef4444' },
                                    { id: 'blue', name: 'Oceano', primary: '#0284c7', accent: '#f97316' },
                                    { id: 'purple', name: 'Nobile', primary: '#9333ea', accent: '#e11d48' },
                                    { id: 'orange', name: 'Tramonto', primary: '#ea580c', accent: '#06b6d4' },
                                    { id: 'amber', name: 'Sole', primary: '#ca8a04', accent: '#6366f1' },
                                    { id: 'custom', name: 'Personalizzato', primary: formData.primaryColor || '#16a34a', accent: formData.accentColor || '#ef4444', isCustom: true },
                                ].map(theme => (
                                    <button
                                        key={theme.id}
                                        type="button"
                                        onClick={() => setFormData({ 
                                            ...formData, 
                                            colorTheme: theme.id,
                                            primaryColor: theme.isCustom ? formData.primaryColor : theme.primary,
                                            accentColor: theme.isCustom ? formData.accentColor : theme.accent
                                        })}
                                        className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-between gap-3 relative overflow-hidden ${
                                            formData.colorTheme === theme.id 
                                                ? 'border-nature-600 bg-nature-50/20 ring-2 ring-nature-600/10 shadow-sm' 
                                                : 'border-gray-100 bg-gray-50/50 hover:bg-white hover:border-gray-200'
                                        }`}
                                    >
                                        <span className="text-xs font-bold text-gray-700">{theme.name}</span>
                                        <div className="flex gap-1.5 justify-center mt-1">
                                            {theme.id === 'custom' ? (
                                                <div className="flex gap-1">
                                                    <div className="w-5 h-5 rounded-full border border-gray-200 shadow-sm" style={{ backgroundColor: formData.primaryColor }}></div>
                                                    <div className="w-5 h-5 rounded-full border border-gray-200 shadow-sm" style={{ backgroundColor: formData.accentColor }}></div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="w-5 h-5 rounded-full shadow-sm" style={{ backgroundColor: theme.primary }}></div>
                                                    <div className="w-5 h-5 rounded-full shadow-sm" style={{ backgroundColor: theme.accent }}></div>
                                                </>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {formData.colorTheme === 'custom' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-50/50 rounded-2xl border border-gray-100 animate-in slide-in-from-top-2 duration-200">
                                    <div className="space-y-3">
                                        <label className="text-sm font-bold text-gray-700 block">Colore Primario (Brand)</label>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="color"
                                                value={formData.primaryColor || '#16a34a'}
                                                onChange={e => setFormData({ ...formData, primaryColor: e.target.value })}
                                                className="w-12 h-12 rounded-lg cursor-pointer border-none p-0 overflow-hidden shadow-sm"
                                            />
                                            <input
                                                type="text"
                                                value={formData.primaryColor || '#16a34a'}
                                                onChange={e => setFormData({ ...formData, primaryColor: e.target.value })}
                                                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-mono uppercase focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-sm font-bold text-gray-700 block">Colore Accento (Frutta / Dettagli)</label>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="color"
                                                value={formData.accentColor || '#ef4444'}
                                                onChange={e => setFormData({ ...formData, accentColor: e.target.value })}
                                                className="w-12 h-12 rounded-lg cursor-pointer border-none p-0 overflow-hidden shadow-sm"
                                            />
                                            <input
                                                type="text"
                                                value={formData.accentColor || '#ef4444'}
                                                onChange={e => setFormData({ ...formData, accentColor: e.target.value })}
                                                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-mono uppercase focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Contatti */}
                        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-blue-600"><Phone size={20} /> Contatti & Orari</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <input placeholder="Email" type="email" value={formData.contactEmail} onChange={e => setFormData({ ...formData, contactEmail: e.target.value })} className="px-4 py-3 rounded-xl border border-gray-200" />
                                <input placeholder="Telefono" value={formData.contactPhone} onChange={e => setFormData({ ...formData, contactPhone: e.target.value })} className="px-4 py-3 rounded-xl border border-gray-200" />
                                <input placeholder="Indirizzo" value={formData.contactAddress} onChange={e => setFormData({ ...formData, contactAddress: e.target.value })} className="px-4 py-3 rounded-xl border border-gray-200" />
                                <input placeholder="Orari" value={formData.openingHours} onChange={e => setFormData({ ...formData, openingHours: e.target.value })} className="px-4 py-3 rounded-xl border border-gray-200" />
                            </div>

                            <div className="space-y-4 pt-4 border-t border-gray-50">
                                <label className="text-sm font-bold text-gray-700 block mb-2">Posizione Riferimento Negozio (Mappa Logistica)</label>
                                <LocationPicker
                                    initialLat={formData.latitude || undefined}
                                    initialLng={formData.longitude || undefined}
                                    onLocationSelect={(lat, lng) => setFormData({ ...formData, latitude: lat, longitude: lng })}
                                />
                            </div>
                        </div>

                        {/* Banner */}
                        <div className="bg-amber-50 rounded-3xl p-6 md:p-8 border border-amber-200 shadow-sm">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-amber-600"><Megaphone size={20} /> Banner Avvisi</h3>
                            <div className="space-y-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={formData.announcementActive} onChange={e => setFormData({ ...formData, announcementActive: e.target.checked })} className="w-5 h-5" />
                                    <span className="font-bold">Attiva Banner in Home</span>
                                </label>
                                <input placeholder="Testo avviso..." value={formData.announcementText} onChange={e => setFormData({ ...formData, announcementText: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-amber-300" />
                            </div>
                        </div>

                        <div className="flex justify-end p-4 sticky bottom-6 z-20">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="bg-nature-900 text-white px-10 py-4 rounded-2xl font-bold shadow-2xl hover:bg-black transition-all flex items-center gap-2"
                            >
                                {isSaving ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Save size={20} />}
                                <span>Salva Generale</span>
                            </button>
                        </div>
                    </form>
                )}

                {activeTab === 'whatsapp' && (
                    <form onSubmit={handleSettingsSubmit} className="space-y-8 animate-in fade-in duration-300">
                        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-green-600"><MessageSquare size={20} /> Template WhatsApp</h3>
                            <p className="text-sm text-gray-500 mb-8">Personalizza i messaggi automatici inviati ai clienti.</p>
                            <div className="space-y-8">
                                <TemplateField label="1. Ordine Ricevuto" field="waTemplateCreated" value={formData.waTemplateCreated} tags={['id', 'cliente', 'prodotti']} onInsertTag={handleInsertTag} onChange={(v: any) => setFormData({ ...formData, waTemplateCreated: v })} textareaRef={refs.waTemplateCreated} />
                                <TemplateField label="2. Pesatura Completa" field="waTemplateWeighing" value={formData.waTemplateWeighing} tags={['id', 'cliente', 'totale', 'prodotti']} onInsertTag={handleInsertTag} onChange={(v: any) => setFormData({ ...formData, waTemplateWeighing: v })} textareaRef={refs.waTemplateWeighing} />
                                <TemplateField label="3. In Consegna" field="waTemplateOutForDelivery" value={formData.waTemplateOutForDelivery} tags={['id', 'cliente', 'totale', 'indirizzo', 'note']} onInsertTag={handleInsertTag} onChange={(v: any) => setFormData({ ...formData, waTemplateOutForDelivery: v })} textareaRef={refs.waTemplateOutForDelivery} />
                                <TemplateField label="4. Pronto al Ritiro" field="waTemplatePickupReady" value={formData.waTemplatePickupReady} tags={['id', 'cliente', 'totale']} onInsertTag={handleInsertTag} onChange={(v: any) => setFormData({ ...formData, waTemplatePickupReady: v })} textareaRef={refs.waTemplatePickupReady} />
                            </div>
                        </div>

                        <div className="flex justify-end p-4 sticky bottom-6 z-20">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="bg-green-600 text-white px-10 py-4 rounded-2xl font-bold shadow-2xl hover:bg-green-700 transition-all flex items-center gap-2"
                            >
                                {isSaving ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Save size={20} />}
                                <span>Salva Template</span>
                            </button>
                        </div>
                    </form>
                )}



                {activeTab === 'zones' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold flex items-center gap-2 text-orange-600"><MapPin size={20} /> Zone di Consegna</h3>
                            <button
                                onClick={() => { setCurrentZone({ city: '', zipCode: '', shippingCost: 0, isActive: true }); setIsZoneModalOpen(true); }}
                                className="bg-nature-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold hover:bg-nature-700"
                            >
                                <Plus size={18} /> Nuova Zona
                            </button>
                        </div>
                        <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="p-4 text-xs font-bold uppercase text-gray-500">Comune</th>
                                        <th className="p-4 text-xs font-bold uppercase text-gray-500">CAP</th>
                                        <th className="p-4 text-xs font-bold uppercase text-gray-500">Costo Consegna</th>
                                        <th className="p-4 text-xs font-bold uppercase text-gray-500">Stato</th>
                                        <th className="p-4 text-xs font-bold uppercase text-gray-500 text-right">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {zones.map(zone => (
                                        <tr key={zone.id} className="hover:bg-gray-50/50">
                                            <td className="p-4 font-bold">{zone.city}</td>
                                            <td className="p-4 text-sm text-gray-500">{zone.zipCode}</td>
                                            <td className="p-4 font-bold text-nature-700">€ {(zone.shippingCost / 100).toFixed(2)}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-black ${zone.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                                    {zone.isActive ? 'Attivo' : 'Inattivo'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => { setCurrentZone(zone); setIsZoneModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                                                    <button onClick={() => deleteZone(zone.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'avatars' && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold flex items-center gap-2 text-indigo-600"><UserIcon size={20} /> Libreria Avatar</h3>
                            <div className="relative">
                                <input type="file" id="tab-avatar-upload" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={isUploadingAvatar} />
                                <label htmlFor="tab-avatar-upload" className="bg-nature-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold cursor-pointer hover:bg-nature-700 shadow-md">
                                    <Upload size={18} /> {isUploadingAvatar ? 'Caricamento...' : 'Aggiungi Icona'}
                                </label>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-4">
                            {avatars.map((avatar, idx) => (
                                <div key={idx} className="group relative aspect-square bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 hover:ring-2 hover:ring-nature-500 transition-all">
                                    <img src={sanitizeImageUrl(avatar)} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <button onClick={() => deleteAvatar(avatar)} className="p-2 bg-white text-red-600 rounded-full"><Trash2 size={18} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'categories' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold flex items-center gap-2 text-cyan-600"><Tag size={20} /> Gestione Categorie</h3>
                            <button
                                onClick={() => { setCurrentCategory({ name: '', color: '#1e3f20' }); setIsCategoryModalOpen(true); }}
                                className="bg-nature-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold hover:bg-nature-700 shadow-md"
                            >
                                <Plus size={18} /> Nuova Categoria
                            </button>
                        </div>
                        <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="p-4 text-xs font-bold uppercase text-gray-500">Nome Categoria</th>
                                        <th className="p-4 text-xs font-bold uppercase text-gray-500 text-right">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {categories.map(cat => (
                                        <tr key={cat.id} className="hover:bg-gray-50/50">
                                            <td className="p-4 font-bold text-gray-800">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }}></div>
                                                    {cat.name}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => { setCurrentCategory(cat); setIsCategoryModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                                                    <button onClick={() => deleteCategory(cat.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {categories.length === 0 && (
                                        <tr>
                                            <td colSpan={2} className="p-8 text-center text-gray-400 italic">Nessuna categoria definita.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Sub-Modals for Pages and Zones */}

            {isZoneModalOpen && (
                <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-0 md:p-4">
                    <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-md md:rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <form onSubmit={handleZoneSubmit} className="flex flex-col h-full">
                            <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
                                <h3 className="text-xl font-bold">{currentZone.id ? 'Modifica Zona' : 'Nuova Zona'}</h3>
                                <button type="button" onClick={() => setIsZoneModalOpen(false)}><X /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                <input placeholder="Comune" required value={currentZone.city} onChange={e => setCurrentZone({ ...currentZone, city: e.target.value })} className="w-full px-4 py-2 border rounded-xl" />
                                <input placeholder="CAP" required value={currentZone.zipCode} onChange={e => setCurrentZone({ ...currentZone, zipCode: e.target.value })} className="w-full px-4 py-2 border rounded-xl" />
                                <input placeholder="Costo Spedizione (centesimi)" type="number" required value={currentZone.shippingCost} onChange={e => setCurrentZone({ ...currentZone, shippingCost: Number(e.target.value) })} className="w-full px-4 py-2 border rounded-xl" />
                            </div>
                            <div className="p-6 border-t bg-gray-50/50 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsZoneModalOpen(false)} className="px-6 py-2">Annulla</button>
                                <button type="submit" className="bg-nature-600 text-white px-8 py-2 rounded-xl font-bold">Salva Zona</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isCategoryModalOpen && (
                <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-0 md:p-4">
                    <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-md md:rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <form onSubmit={handleCategorySubmit} className="flex flex-col h-full">
                            <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
                                <h3 className="text-xl font-bold">{currentCategory.id ? 'Modifica Categoria' : 'Nuova Categoria'}</h3>
                                <button type="button" onClick={() => setIsCategoryModalOpen(false)}><X /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Nome Categoria</label>
                                    <input placeholder="Es. Frutta, Verdura..." required value={currentCategory.name} onChange={e => setCurrentCategory({ ...currentCategory, name: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-nature-500/20 outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Colore Categoria</label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="color"
                                            value={currentCategory.color || '#1e3f20'}
                                            onChange={e => setCurrentCategory({ ...currentCategory, color: e.target.value })}
                                            className="w-12 h-12 rounded-lg cursor-pointer border-none p-0 overflow-hidden"
                                        />
                                        <input
                                            type="text"
                                            value={currentCategory.color || '#1e3f20'}
                                            onChange={e => setCurrentCategory({ ...currentCategory, color: e.target.value })}
                                            className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-mono uppercase"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 border-t bg-gray-50/50 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="px-6 py-2 font-bold text-gray-500">Annulla</button>
                                <button type="submit" className="bg-nature-600 text-white px-8 py-2 rounded-xl font-bold shadow-lg shadow-nature-100">Salva Categoria</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
