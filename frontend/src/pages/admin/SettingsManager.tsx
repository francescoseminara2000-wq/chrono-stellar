import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import {
    Save, Globe, Phone, MapPin, Megaphone,
    MessageSquare, User as UserIcon, Upload, Trash2,
    Plus, Edit2, X, Tag, CreditCard, Scale,
    Image as ImageIcon, Compass, ArrowUp, ArrowDown,
    ExternalLink, BookOpen, CheckCircle2, Sparkles, Gauge, Clock, Play, Sliders, Type,
    Bold, MoveVertical, Smartphone, Monitor
} from 'lucide-react';
import { AppleLoader } from '../../components/ui/AppleLoader';
import { useToastStore } from '../../store/useToastStore';
import { LocationPicker } from '../../components/LocationPicker';
import { sanitizeImageUrl } from '../../utils/imageUrl';
import { useAppState, PageBackgroundConfig, PageBackgroundsMap, CustomNavItem, DEFAULT_NAV_ITEMS } from '../../store/useAppState';
import { AVAILABLE_PAGE_TARGETS } from '../../components/ui/PageBackground';
import { ConfirmModal } from '../../components/admin/ConfirmModal';

const API_URL = import.meta.env.VITE_API_URL || '';

const hexToRgba = (hex: string, alpha: number) => {
    let c = (hex || '').replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    if (isNaN(num)) return `rgba(187, 247, 208, ${alpha})`;
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// --- Components ---

const TemplateField = ({ label, field, value, tags, onInsertTag, onChange, textareaRef }: any) => (
    <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <label className="text-sm font-bold text-gray-700">{label}</label>
            <div className="flex flex-wrap gap-1">
                {tags.map((tag: string) => (
                    <button
                        key={tag}
                        type="button"
                        onClick={() => onInsertTag(field, tag)}
                        className="px-2 py-1 text-[11px] bg-nature-50 hover:bg-nature-100 text-nature-800 rounded font-mono transition-colors"
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
    const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

    // --- Settings State ---
    const [formData, setFormData] = useState({
        siteName: '', tagline: '', contactEmail: '', contactPhone: '', contactAddress: '',
        openingHours: '', announcementText: '', announcementActive: false,
        waTemplateCreated: '', waTemplateWeighing: '', waTemplateOutForDelivery: '',
        waTemplatePickupReady: '', waTemplateDelivered: '', waTemplateCancelled: '',
        waTemplateScheduled: '',
        latitude: null as number | null, longitude: null as number | null,
        logoUrl: null as string | null,
        colorTheme: 'green',
        primaryColor: '#16a34a',
        accentColor: '#ef4444',
        pickupCutoffHour: 12,
        deliveryCutoffHour: 12,
        deliveryTimeSlots: '09:00 - 11:00, 11:00 - 13:00, 15:00 - 17:00, 17:00 - 19:00',
        revolutApiKey: '',
        revolutEnvironment: 'sandbox',
        revolutEnabled: false,
        weighingTolerancePercent: 10,
        pageBackgrounds: {} as PageBackgroundsMap,
        customNavItems: DEFAULT_NAV_ITEMS as CustomNavItem[],
        navHoverOpacity: 75,
        navHoverColor: '#bbf7d0',
        appleLoaderPlaybackRate: 1.0,
        appleLoaderMinDuration: 2,
        appleLoaderVideoUrl: null as string | null,
        appleLoaderDimension: 200,
        appleLoaderPhrase: 'Caricando gli scaffali...',
        appleLoaderTextSize: 28,
        appleLoaderTextBold: true,
        appleLoaderTextOffset: 16,
        headerLogoSize: 80
    });

    // --- Navigation Management State ---
    const [cmsPages, setCmsPages] = useState<any[]>([]);
    const [isNavModalOpen, setIsNavModalOpen] = useState(false);
    const [editingNavId, setEditingNavId] = useState<string | null>(null);
    const [navForm, setNavForm] = useState<{
        label: string;
        type: 'PAGE' | 'CATEGORY' | 'CUSTOM';
        target: string;
        url: string;
        isActive: boolean;
    }>({
        label: '',
        type: 'PAGE',
        target: '/',
        url: '/',
        isActive: true
    });

    const refs = {
        waTemplateCreated: useRef<HTMLTextAreaElement>(null),
        waTemplateWeighing: useRef<HTMLTextAreaElement>(null),
        waTemplateOutForDelivery: useRef<HTMLTextAreaElement>(null),
        waTemplatePickupReady: useRef<HTMLTextAreaElement>(null),
        waTemplateDelivered: useRef<HTMLTextAreaElement>(null),
        waTemplateCancelled: useRef<HTMLTextAreaElement>(null),
        waTemplateScheduled: useRef<HTMLTextAreaElement>(null),
    };

    // --- Delivery Zones State ---
    const [zones, setZones] = useState<any[]>([]);
    const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
    const [currentZone, setCurrentZone] = useState<any>({ city: '', zipCode: '', shippingCost: 0, isActive: true });

    // --- Avatars State ---
    const [avatars, setAvatars] = useState<string[]>([]);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [isUploadingLoaderVideo, setIsUploadingLoaderVideo] = useState(false);

    // --- Categories State ---
    const [categories, setCategories] = useState<any[]>([]);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [currentCategory, setCurrentCategory] = useState<any>({ name: '', color: '#1e3f20' });
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

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
                fetchCategories(),
                fetchCmsPages()
            ]);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCmsPages = async () => {
        try {
            const res = await fetch(`${API_URL}/api/admin/pages`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) setCmsPages(await res.json());
        } catch (e) {
            console.error('Error fetching CMS pages:', e);
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
                waTemplateScheduled: data.waTemplateScheduled || '',
                latitude: data.latitude || null,
                longitude: data.longitude || null,
                logoUrl: data.logoUrl || null,
                colorTheme: data.colorTheme || 'green',
                primaryColor: data.primaryColor || '#16a34a',
                accentColor: data.accentColor || '#ef4444',
                pickupCutoffHour: data.pickupCutoffHour !== undefined ? data.pickupCutoffHour : 12,
                deliveryCutoffHour: data.deliveryCutoffHour !== undefined ? data.deliveryCutoffHour : 12,
                deliveryTimeSlots: data.deliveryTimeSlots || '09:00 - 11:00, 11:00 - 13:00, 15:00 - 17:00, 17:00 - 19:00',
                revolutApiKey: data.revolutApiKey || '',
                revolutEnvironment: data.revolutEnvironment || 'sandbox',
                revolutEnabled: Boolean(data.revolutEnabled),
                weighingTolerancePercent: data.weighingTolerancePercent !== undefined ? data.weighingTolerancePercent : 10,
                pageBackgrounds: typeof data.pageBackgrounds === 'string'
                    ? (() => { try { return JSON.parse(data.pageBackgrounds); } catch (e) { return {}; } })()
                    : (data.pageBackgrounds || {}),
                customNavItems: typeof data.customNavItems === 'string'
                    ? (() => { try { return JSON.parse(data.customNavItems); } catch (e) { return DEFAULT_NAV_ITEMS; } })()
                    : (Array.isArray(data.customNavItems) && data.customNavItems.length > 0 ? data.customNavItems : DEFAULT_NAV_ITEMS),
                navHoverOpacity: data.navHoverOpacity !== undefined && data.navHoverOpacity !== null ? Number(data.navHoverOpacity) : 75,
                navHoverColor: data.navHoverColor || '#bbf7d0',
                appleLoaderPlaybackRate: data.appleLoaderPlaybackRate !== undefined && data.appleLoaderPlaybackRate !== null ? Number(data.appleLoaderPlaybackRate) : 1.0,
                appleLoaderMinDuration: data.appleLoaderMinDuration !== undefined && data.appleLoaderMinDuration !== null ? Number(data.appleLoaderMinDuration) : 2,
                appleLoaderVideoUrl: data.appleLoaderVideoUrl || null,
                appleLoaderDimension: data.appleLoaderDimension !== undefined && data.appleLoaderDimension !== null ? Number(data.appleLoaderDimension) : 200,
                appleLoaderPhrase: data.appleLoaderPhrase || 'Caricando gli scaffali...',
                appleLoaderTextSize: data.appleLoaderTextSize !== undefined && data.appleLoaderTextSize !== null ? Number(data.appleLoaderTextSize) : 28,
                appleLoaderTextBold: data.appleLoaderTextBold !== undefined ? Boolean(data.appleLoaderTextBold) : true,
                appleLoaderTextOffset: data.appleLoaderTextOffset !== undefined && data.appleLoaderTextOffset !== null ? Number(data.appleLoaderTextOffset) : 16,
                headerLogoSize: data.headerLogoSize !== undefined && data.headerLogoSize !== null ? Number(data.headerLogoSize) : 80
            });
        }
    };

    const handleLoaderVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validExts = ['.mp4', '.webm', '.mov'];
        const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!validExts.includes(fileExt) && !file.type.startsWith('video/')) {
            addToast('Seleziona un file video valido (.mp4, .webm, .mov)', 'error');
            return;
        }

        setIsUploadingLoaderVideo(true);
        const uploadData = new FormData();
        uploadData.append('video', file);

        try {
            const res = await fetch(`${API_URL}/api/admin/loader-video/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: uploadData
            });

            if (res.ok) {
                const result = await res.json();
                setFormData(prev => ({ ...prev, appleLoaderVideoUrl: result.url }));
                refreshGlobalSettings();
                addToast('🎬 Video animazione caricato e salvato con successo!', 'success', 5000);
            } else {
                const err = await res.json().catch(() => ({}));
                addToast(`Errore caricamento video: ${err.error || 'Errore server'}`, 'error');
            }
        } catch (err) {
            console.error('Error uploading loader video:', err);
            addToast('Errore di connessione durante il caricamento del video.', 'error');
        } finally {
            setIsUploadingLoaderVideo(false);
            e.target.value = '';
        }
    };

    const handleResetLoaderVideo = async () => {
        setFormData(prev => ({ ...prev, appleLoaderVideoUrl: null }));
        try {
            const res = await fetch(`${API_URL}/api/admin/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ ...formData, appleLoaderVideoUrl: null })
            });
            if (res.ok) {
                refreshGlobalSettings();
                addToast('🍎 Video originale della mela ripristinato!', 'success');
            }
        } catch (e) {
            addToast('Errore durante il ripristino del video predefinito.', 'error');
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
                addToast('🖼️ Logo caricato con successo! Ricordati di cliccare su "Salva Impostazioni" per applicare le modifiche.', 'success', 6000);
            } else {
                const errorData = await res.json().catch(() => ({}));
                addToast(`Errore caricamento logo: ${errorData.error || 'Errore durante il caricamento'}`, 'error');
            }
        } catch (err) {
            console.error('Logo upload error:', err);
            addToast('Errore di connessione durante il caricamento del logo.', 'error');
        } finally {
            setIsUploadingLogo(false);
            e.target.value = '';
        }
    };

    const [uploadingBgKey, setUploadingBgKey] = useState<string | null>(null);

    const handleBackgroundUpload = async (pageKey: string, file: File) => {
        setUploadingBgKey(pageKey);
        const data = new FormData();
        data.append('image', file);
        try {
            const res = await fetch(`${API_URL}/api/admin/backgrounds/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: data
            });
            if (res.ok) {
                const result = await res.json();
                setFormData(prev => ({
                    ...prev,
                    pageBackgrounds: {
                        ...prev.pageBackgrounds,
                        [pageKey]: {
                            ...(prev.pageBackgrounds[pageKey] || { opacity: 30, blur: 0, isFixed: false, isActive: true }),
                            imageUrl: result.url,
                            isActive: true
                        }
                    }
                }));
                addToast('🖼️ Sfondo caricato! Clicca su "Salva Sfondi" per confermare.', 'success');
            } else {
                const err = await res.json().catch(() => ({}));
                addToast(`Errore caricamento sfondo: ${err.error || 'Errore server'}`, 'error');
            }
        } catch (err) {
            addToast('Errore di connessione durante il caricamento dello sfondo.', 'error');
        } finally {
            setUploadingBgKey(null);
        }
    };

    const updatePageBackground = (pageKey: string, updates: Partial<PageBackgroundConfig>) => {
        setFormData(prev => ({
            ...prev,
            pageBackgrounds: {
                ...prev.pageBackgrounds,
                [pageKey]: {
                    ...(prev.pageBackgrounds[pageKey] || { imageUrl: '', opacity: 30, blur: 0, isFixed: false, isActive: true }),
                    ...updates
                }
            }
        }));
    };

    const removePageBackground = (pageKey: string) => {
        setFormData(prev => {
            const updated = { ...prev.pageBackgrounds };
            delete updated[pageKey];
            return { ...prev, pageBackgrounds: updated };
        });
        addToast('Sfondo rimosso.', 'info');
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

    const deleteZone = async (id: number, force = false) => {
        if (!force) {
            setConfirmModal({
                isOpen: true,
                title: 'Elimina Zona',
                message: 'Sei sicuro di voler eliminare questa zona?',
                onConfirm: () => deleteZone(id, true)
            });
            return;
        }
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

    const deleteAvatar = async (path: string, force = false) => {
        if (!force) {
            setConfirmModal({
                isOpen: true,
                title: 'Elimina Avatar',
                message: 'Sei sicuro di voler eliminare questo avatar?',
                onConfirm: () => deleteAvatar(path, true)
            });
            return;
        }
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

    const deleteCategory = async (id: number, force = false) => {
        if (!force) {
            setConfirmModal({
                isOpen: true,
                title: 'Elimina Categoria',
                message: 'Sei sicuro di voler eliminare questa categoria? I prodotti associati rimarranno senza categoria.',
                onConfirm: () => deleteCategory(id, true)
            });
            return;
        }
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

    // --- Navigation Items Logic ---
    const handleOpenAddNavModal = () => {
        setEditingNavId(null);
        setNavForm({
            label: '',
            type: 'PAGE',
            target: '/',
            url: '/',
            isActive: true
        });
        setIsNavModalOpen(true);
    };

    const handleOpenEditNavModal = (item: CustomNavItem) => {
        setEditingNavId(item.id);
        setNavForm({
            label: item.label,
            type: item.type,
            target: item.target,
            url: item.url,
            isActive: item.isActive !== false
        });
        setIsNavModalOpen(true);
    };

    const handleNavFormTypeChange = (type: 'PAGE' | 'CATEGORY' | 'CUSTOM') => {
        if (type === 'PAGE') {
            setNavForm(prev => ({
                ...prev,
                type,
                target: '/',
                url: '/',
                label: prev.label || 'Home'
            }));
        } else if (type === 'CATEGORY') {
            const firstCat = categories[0]?.name || '';
            setNavForm(prev => ({
                ...prev,
                type,
                target: firstCat,
                url: firstCat ? `/shop?category=${encodeURIComponent(firstCat)}` : '/shop',
                label: prev.label || firstCat
            }));
        } else {
            setNavForm(prev => ({
                ...prev,
                type,
                target: '',
                url: '',
                label: prev.label || ''
            }));
        }
    };

    const handleNavPageTargetChange = (target: string) => {
        let label = navForm.label;
        if (target === '/') label = 'Home';
        else if (target === '/shop') label = 'Nostri Prodotti';
        else if (target === '/mercati') label = 'I Nostri Mercati';
        else if (target === '/gift-cards') label = 'Gift Card';
        else {
            const cms = cmsPages.find(p => `/page/${p.slug}` === target);
            if (cms) label = cms.title;
        }
        setNavForm(prev => ({ ...prev, target, url: target, label: prev.label ? prev.label : label }));
    };

    const handleNavCategoryTargetChange = (categoryName: string) => {
        const computedUrl = `/shop?category=${encodeURIComponent(categoryName)}`;
        setNavForm(prev => ({
            ...prev,
            target: categoryName,
            url: computedUrl,
            label: prev.label ? prev.label : categoryName
        }));
    };

    const handleSaveNavModal = (e: React.FormEvent) => {
        e.preventDefault();
        if (!navForm.label.trim()) {
            addToast('Inserisci un nome visualizzato per la voce del menu.', 'error');
            return;
        }
        if (!navForm.url.trim()) {
            addToast('Specificare una destinazione o un URL valido.', 'error');
            return;
        }

        const currentItems = [...(formData.customNavItems || DEFAULT_NAV_ITEMS)];

        if (editingNavId) {
            const updated = currentItems.map(item => {
                if (item.id === editingNavId) {
                    return {
                        ...item,
                        label: navForm.label.trim(),
                        type: navForm.type,
                        target: navForm.target,
                        url: navForm.url.trim(),
                        isActive: navForm.isActive
                    };
                }
                return item;
            });
            setFormData(prev => ({ ...prev, customNavItems: updated }));
            addToast('Voce menu aggiornata!', 'success');
        } else {
            const newItem: CustomNavItem = {
                id: `nav-${Date.now()}`,
                label: navForm.label.trim(),
                type: navForm.type,
                target: navForm.target,
                url: navForm.url.trim(),
                isActive: navForm.isActive,
                order: currentItems.length + 1
            };
            setFormData(prev => ({ ...prev, customNavItems: [...currentItems, newItem] }));
            addToast('Nuova voce aggiunta al menu!', 'success');
        }

        setIsNavModalOpen(false);
    };

    const handleMoveNavItem = (index: number, direction: 'up' | 'down') => {
        const currentItems = [...(formData.customNavItems || DEFAULT_NAV_ITEMS)];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= currentItems.length) return;

        const temp = currentItems[index];
        currentItems[index] = currentItems[targetIndex];
        currentItems[targetIndex] = temp;

        const reordered = currentItems.map((item, idx) => ({ ...item, order: idx + 1 }));
        setFormData(prev => ({ ...prev, customNavItems: reordered }));
    };

    const handleToggleNavActive = (id: string) => {
        const currentItems = [...(formData.customNavItems || DEFAULT_NAV_ITEMS)];
        const updated = currentItems.map(item => item.id === id ? { ...item, isActive: !item.isActive } : item);
        setFormData(prev => ({ ...prev, customNavItems: updated }));
    };

    const handleDeleteNavItem = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Elimina Voce Menu',
            message: 'Sei sicuro di voler rimuovere questa voce dal menu di navigazione?',
            onConfirm: () => {
                const currentItems = [...(formData.customNavItems || DEFAULT_NAV_ITEMS)];
                const filtered = currentItems.filter(item => item.id !== id).map((item, idx) => ({ ...item, order: idx + 1 }));
                setFormData(prev => ({ ...prev, customNavItems: filtered }));
                addToast('Voce rimossa dal menu.', 'success');
            }
        });
    };

    const handleResetDefaultNav = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Ripristina Menu Predefinito',
            message: 'Tutte le voci attuali verranno sostituite con quelle iniziali (Home, Nostri Prodotti, I Nostri Mercati, Gift Card). Continuare?',
            onConfirm: () => {
                setFormData(prev => ({ ...prev, customNavItems: DEFAULT_NAV_ITEMS }));
                addToast('Menu reimpostato sui valori predefiniti.', 'success');
            }
        });
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
        { id: 'loader', label: 'Animazione Mela', icon: <Sparkles size={18} /> },
        { id: 'navigation', label: 'Menu Navigazione', icon: <Compass size={18} /> },
        { id: 'backgrounds', label: 'Sfondi Pagine', icon: <ImageIcon size={18} /> },
        { id: 'revolut', label: 'Pagamenti Revolut', icon: <CreditCard size={18} /> },
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

                            {/* Logo Size in Header Slider & Live Preview */}
                            <div className="mt-8 pt-6 border-t border-gray-100 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Sliders size={18} className="text-emerald-600" />
                                        <label className="text-sm font-bold text-gray-800">
                                            Dimensione Logo nella Barra Superiore (Header)
                                        </label>
                                    </div>
                                    <span className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-900 font-mono font-black text-xs">
                                        {formData.headerLogoSize || 80}px
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500">
                                    Regola la dimensione dell'illustrazione della mela e del nome del negozio nella barra in alto.
                                </p>

                                {/* Slider */}
                                <div className="space-y-2">
                                    <input
                                        type="range"
                                        min="50"
                                        max="130"
                                        step="2"
                                        value={formData.headerLogoSize || 80}
                                        onChange={(e) => setFormData({ ...formData, headerLogoSize: parseInt(e.target.value) })}
                                        className="w-full accent-nature-600 cursor-pointer h-2 bg-gray-200 rounded-lg appearance-none"
                                    />
                                    <div className="flex justify-between text-[11px] font-bold text-gray-400">
                                        <span>50px (Compatto)</span>
                                        <span>80px (Standard)</span>
                                        <span>130px (Maxi)</span>
                                    </div>
                                </div>

                                {/* Preset Buttons */}
                                <div className="space-y-1.5">
                                    <span className="text-[11px] font-bold text-gray-600 block">Preset Dimensioni:</span>
                                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                                        {[
                                            { label: '60px', value: 60 },
                                            { label: '70px', value: 70 },
                                            { label: '80px', value: 80 },
                                            { label: '95px', value: 95 },
                                            { label: '110px', value: 110 },
                                            { label: '125px', value: 125 },
                                        ].map(p => (
                                            <button
                                                key={p.value}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, headerLogoSize: p.value })}
                                                className={`py-1.5 px-1.5 text-center rounded-xl font-bold text-xs transition-all cursor-pointer ${
                                                    (formData.headerLogoSize || 80) === p.value
                                                        ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/20'
                                                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200/80'
                                                }`}
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Live Header Logo Preview */}
                                <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-100/90 mt-4">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block mb-2">
                                        Anteprima dal Vivo Barra Header
                                    </span>
                                    {(() => {
                                        const size = formData.headerLogoSize || 80;
                                        const scale = size / 80;
                                        return (
                                            <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-150 shadow-2xs overflow-hidden">
                                                <div 
                                                    className="relative flex items-center justify-center shrink-0 transition-all duration-200"
                                                    style={{ width: `${size}px`, height: `${size}px` }}
                                                >
                                                    <img
                                                        src={formData.logoUrl ? sanitizeImageUrl(formData.logoUrl) : "/logo.png"}
                                                        alt="Logo"
                                                        className="w-full h-full object-contain scale-115"
                                                    />
                                                </div>
                                                <div className="flex flex-col justify-center">
                                                    <span 
                                                        className="font-script text-nature-900 leading-none whitespace-nowrap"
                                                        style={{ fontSize: `${Math.round(36 * scale)}px` }}
                                                    >
                                                        <span className="text-nature-600">
                                                            {(formData.siteName || 'Ortofrutta Butti').split(' ')[0]}
                                                        </span>{' '}
                                                        {(formData.siteName || 'Ortofrutta Butti').substring((formData.siteName || 'Ortofrutta Butti').indexOf(' ') + 1)}
                                                    </span>
                                                    <span 
                                                        className="text-nature-600/90 font-sans tracking-[0.22em] uppercase font-bold mt-1"
                                                        style={{ fontSize: `${Math.round(11 * scale)}px` }}
                                                    >
                                                        {formData.tagline || 'FRESCHEZZA DI QUALITÀ'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })()}
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

                            <div className="border-t border-gray-100 pt-6 mb-6">
                                <h4 className="text-sm font-bold text-gray-700 mb-2">Orario Limite Ordini (Cut-off)</h4>
                                <p className="text-xs text-gray-400 mb-4">
                                    Specifica l'ora massima in cui inserire ordini per lo stesso giorno (fuso orario Europe/Rome). Oltre questo orario, la prima data utile slitterà al giorno successivo.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500">Ora Limite Ritiro in Negozio (0-23)</label>
                                        <input 
                                            type="number" 
                                            min="0" 
                                            max="23" 
                                            value={formData.pickupCutoffHour} 
                                            onChange={e => setFormData({ ...formData, pickupCutoffHour: parseInt(e.target.value) || 0 })} 
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-nature-500/20" 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500">Ora Limite Consegna a Domicilio (0-23)</label>
                                        <input 
                                            type="number" 
                                            min="0" 
                                            max="23" 
                                            value={formData.deliveryCutoffHour} 
                                            onChange={e => setFormData({ ...formData, deliveryCutoffHour: parseInt(e.target.value) || 0 })} 
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-nature-500/20" 
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 pt-4 border-t border-gray-100">
                                    <label className="text-sm font-bold text-gray-700 block">Fasce Orarie Consegna / Ritiro (Predefinite)</label>
                                    <p className="text-xs text-gray-400">
                                        Inserisci le fasce orarie che i clienti potranno selezionare al Checkout, separate da una virgola.
                                    </p>
                                    <input
                                        type="text"
                                        placeholder="09:00 - 11:00, 11:00 - 13:00, 15:00 - 17:00, 17:00 - 19:00"
                                        value={formData.deliveryTimeSlots || ''}
                                        onChange={e => setFormData({ ...formData, deliveryTimeSlots: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-nature-500/20 text-sm font-mono"
                                    />
                                    {/* Preview buttons */}
                                    <div className="pt-2 flex flex-wrap gap-2">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider w-full block">Anteprima per i clienti:</span>
                                        {(formData.deliveryTimeSlots || '')
                                            .split(',')
                                            .map(s => s.trim())
                                            .filter(Boolean)
                                            .map((slot, idx) => (
                                                <span key={idx} className="px-3 py-1.5 bg-nature-50 text-nature-800 border border-nature-200 font-extrabold text-xs rounded-xl shadow-sm">
                                                    {slot}
                                                </span>
                                            ))}
                                    </div>
                                </div>
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

                        {/* Weighing Tolerance Setting */}
                        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-emerald-100">
                            <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-emerald-700">
                                <Scale size={20} /> Tolleranza Variazione Pesatura & Approvazione Cliente
                            </h3>
                            <p className="text-xs text-gray-500 mb-4">
                                Percentuale massima di variazione del prezzo complessivo pesato oltre la quale verrà inviato un link al cliente per l'approvazione manuale su WhatsApp / Email.
                            </p>

                            <div className="flex items-center gap-4 max-w-xs">
                                <div className="relative flex-1">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="1"
                                        value={formData.weighingTolerancePercent}
                                        onChange={e => setFormData({ ...formData, weighingTolerancePercent: Number(e.target.value) })}
                                        className="w-full px-4 py-3 border border-emerald-300 rounded-xl text-base font-black text-emerald-950 focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-gray-400 text-sm">%</span>
                                </div>
                                <span className="text-xs font-bold text-gray-600">Default: 10%</span>
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

                {activeTab === 'loader' && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        {/* Header Box */}
                        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-bold flex items-center gap-2 text-nature-800">
                                    <Sparkles size={22} className="text-emerald-600" /> Configurazione Animazione Mela & Loader
                                </h3>
                                <p className="text-xs text-gray-500 mt-1 max-w-2xl leading-relaxed">
                                    Personalizza la velocità del video MP4 (boomerang) e la durata minima di caricamento garantita quando i clienti accedono alla Home Page o al Catalogo Prodotti.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleSettingsSubmit}
                                disabled={isSaving}
                                className="bg-nature-900 text-white px-6 py-3 rounded-2xl font-bold shadow-md hover:bg-black transition-all flex items-center gap-2 self-start md:self-auto shrink-0 active:scale-95 cursor-pointer"
                            >
                                {isSaving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Save size={18} />}
                                <span>Salva Modifiche</span>
                            </button>
                        </div>

                        {/* Interactive Live Preview Box with Desktop / Smartphone Preview */}
                        <div className="bg-gradient-to-br from-emerald-50/60 via-white to-nature-50/40 rounded-3xl p-6 sm:p-8 shadow-sm border border-emerald-100/80 flex flex-col items-center justify-center text-center relative overflow-hidden">
                            <div className="flex flex-col sm:flex-row items-center justify-between w-full max-w-xl mb-4 gap-2.5">
                                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 shadow-2xs">
                                    <Play size={13} className="text-emerald-700" /> Anteprima dal Vivo
                                </span>

                                {/* Switcher Desktop vs Telefono (Mobile) */}
                                <div className="inline-flex items-center bg-white p-1 rounded-2xl border border-emerald-200/80 shadow-2xs">
                                    <button
                                        type="button"
                                        onClick={() => setPreviewDevice('desktop')}
                                        className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                                            previewDevice === 'desktop'
                                                ? 'bg-emerald-700 text-white shadow-xs'
                                                : 'text-gray-500 hover:text-gray-800'
                                        }`}
                                    >
                                        <Monitor size={14} /> Desktop
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPreviewDevice('mobile')}
                                        className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                                            previewDevice === 'mobile'
                                                ? 'bg-emerald-700 text-white shadow-xs'
                                                : 'text-gray-500 hover:text-gray-800'
                                        }`}
                                    >
                                        <Smartphone size={14} /> Telefono (Mobile)
                                    </button>
                                </div>
                            </div>
                            
                            {previewDevice === 'mobile' ? (
                                <div className="w-[310px] max-w-[90vw] h-[450px] bg-white rounded-[40px] border-[6px] border-gray-900 shadow-xl relative flex flex-col items-center justify-center p-4 my-2 overflow-hidden ring-1 ring-black/10">
                                    {/* Smartphone Notch */}
                                    <div className="w-24 h-4 bg-gray-900 rounded-b-xl absolute top-0 left-1/2 -translate-x-1/2 flex items-center justify-center">
                                        <div className="w-8 h-1 bg-gray-700 rounded-full mb-1"></div>
                                    </div>
                                    <div className="w-full flex flex-col items-center justify-center scale-95">
                                        <AppleLoader
                                            size={formData.appleLoaderDimension || 200}
                                            playbackRate={formData.appleLoaderPlaybackRate}
                                            videoUrl={formData.appleLoaderVideoUrl || undefined}
                                            text={formData.appleLoaderPhrase || 'Caricando gli scaffali...'}
                                            textSize={formData.appleLoaderTextSize}
                                            textBold={formData.appleLoaderTextBold}
                                            textOffset={formData.appleLoaderTextOffset}
                                        />
                                    </div>
                                    {/* Home indicator bar */}
                                    <div className="w-28 h-1 bg-gray-300 rounded-full absolute bottom-2 left-1/2 -translate-x-1/2"></div>
                                </div>
                            ) : (
                                <AppleLoader
                                    size={formData.appleLoaderDimension || 200}
                                    playbackRate={formData.appleLoaderPlaybackRate}
                                    videoUrl={formData.appleLoaderVideoUrl || undefined}
                                    text={formData.appleLoaderPhrase || 'Caricando gli scaffali...'}
                                    textSize={formData.appleLoaderTextSize}
                                    textBold={formData.appleLoaderTextBold}
                                    textOffset={formData.appleLoaderTextOffset}
                                />
                            )}

                            <p className="text-xs text-gray-500 font-medium mt-4">
                                {previewDevice === 'mobile' 
                                    ? 'Simulazione fedele su smartphone: font clamp fluido, proporzione automatica anti-debordo e offset calibrato.' 
                                    : 'Questa anteprima reagisce in tempo reale alle regolazioni sottostanti e al video caricato.'}
                            </p>
                        </div>

                        {/* File Upload / Video Replacement Card */}
                        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                                <div>
                                    <h4 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
                                        <Upload size={20} className="text-emerald-600" /> Sostituzione Video Animazione (MP4 / WebM)
                                    </h4>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Carica una nuova animazione video per sostituire quella predefinita della mela.
                                    </p>
                                </div>
                                {formData.appleLoaderVideoUrl ? (
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-black text-emerald-800">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                        Video Personalizzato Attivo
                                    </div>
                                ) : (
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 border border-gray-200 text-xs font-bold text-gray-600">
                                        Video Predefinito Attivo (/apple-loader.mp4)
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                                {/* Upload Actions */}
                                <div className="space-y-4">
                                    <div className="flex flex-wrap gap-3 items-center">
                                        <input
                                            type="file"
                                            id="loader-video-upload-input"
                                            className="hidden"
                                            accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                                            onChange={handleLoaderVideoUpload}
                                            disabled={isUploadingLoaderVideo}
                                        />
                                        <label
                                            htmlFor="loader-video-upload-input"
                                            className={`inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold text-sm text-white bg-emerald-800 hover:bg-emerald-700 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95 ${
                                                isUploadingLoaderVideo ? 'opacity-50 pointer-events-none' : ''
                                            }`}
                                        >
                                            {isUploadingLoaderVideo ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                    <span>Caricamento video in corso...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Upload size={18} />
                                                    <span>Carica Nuovo Video MP4</span>
                                                </>
                                            )}
                                        </label>

                                        {formData.appleLoaderVideoUrl && (
                                            <button
                                                type="button"
                                                onClick={handleResetLoaderVideo}
                                                className="inline-flex items-center gap-2 px-4 py-3.5 rounded-2xl font-bold text-xs text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-all cursor-pointer active:scale-95"
                                            >
                                                <Trash2 size={16} /> Ripristina Video Originale Mela
                                            </button>
                                        )}
                                    </div>

                                    {formData.appleLoaderVideoUrl && (
                                        <p className="text-xs text-gray-400 font-mono break-all">
                                            Percorso attivo: <span className="text-gray-700 font-semibold">{formData.appleLoaderVideoUrl}</span>
                                        </p>
                                    )}
                                </div>

                                {/* Guidelines note */}
                                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 text-xs text-gray-600 space-y-1.5 leading-relaxed">
                                    <p className="font-extrabold text-emerald-900 flex items-center gap-1.5">
                                        <Sparkles size={14} className="text-emerald-700" /> Linee guida consigliate:
                                    </p>
                                    <ul className="list-disc pl-4 space-y-1 text-[11px] text-gray-500">
                                        <li><strong>Formato</strong>: MP4 (H.264), WebM o MOV.</li>
                                        <li><strong>Risoluzione</strong>: Quadrato 1:1 (es. 720x720 o 500x500 px).</li>
                                        <li><strong>Sfondo</strong>: Bianco puro (<code>#FFFFFF</code>) per la trasparenza automatica.</li>
                                        <li><strong>Durata</strong>: Da 2 a 4 secondi (ottimale boomerang o loop continuo).</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Frase di Caricamento (Font Script) Card */}
                        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                                <div>
                                    <h4 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
                                        <Type size={20} className="text-emerald-600" /> Frase di Caricamento (Font Script Elegante)
                                    </h4>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Personalizza la scritta mostrata sotto la mela con il carattere corsivo distintivo del negozio.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-700 block">Testo Frase:</label>
                                    <input
                                        type="text"
                                        value={formData.appleLoaderPhrase}
                                        onChange={(e) => setFormData({ ...formData, appleLoaderPhrase: e.target.value })}
                                        placeholder="es. Caricando gli scaffali..."
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500 text-sm font-semibold"
                                    />
                                </div>

                                {/* Font Preview in real-time */}
                                <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-100 flex flex-col items-center justify-center text-center">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 mb-1">Resa Grafica con Font Script</span>
                                    <p className="font-script text-2xl sm:text-3xl font-bold text-nature-950 tracking-wide drop-shadow-2xs">
                                        {formData.appleLoaderPhrase || 'Caricando gli scaffali...'}
                                    </p>
                                </div>

                                {/* Preset Suggestions */}
                                <div className="space-y-2">
                                    <span className="text-xs font-bold text-gray-700 block">Frasi Suggerite:</span>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            'Caricando gli scaffali...',
                                            'Rifornendo il banco fresco...',
                                            'Selezionando i frutti migliori...',
                                            'Freschezza in arrivo...',
                                            'Preparando la qualità per te...',
                                        ].map(suggestion => (
                                            <button
                                                key={suggestion}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, appleLoaderPhrase: suggestion })}
                                                className={`py-2 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                                                    formData.appleLoaderPhrase === suggestion
                                                        ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/20'
                                                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200/70'
                                                }`}
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stile & Posizionamento Frase (Dimensione, Grassetto, Sovrapposizione) */}
                        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                                <div>
                                    <h4 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
                                        <Type size={20} className="text-emerald-600" /> Stile & Posizionamento Frase (Dimensione, Grassetto, Sovrapposizione)
                                    </h4>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Personalizza l'impatto visivo della frase: altezza del testo, intensità (grassetto) e altezza verticale con possibilità di sovrapporla alla mela.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Col 1: Dimensione Testo */}
                                <div className="p-5 bg-gray-50/70 rounded-2xl border border-gray-200/80 space-y-5">
                                    <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                                        <div className="flex items-center gap-2">
                                            <Type size={18} className="text-emerald-600" />
                                            <span className="font-extrabold text-gray-900 text-sm">Dimensione Testo</span>
                                        </div>
                                        <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-900 font-mono font-black text-xs">
                                            {formData.appleLoaderTextSize || 28}px
                                        </span>
                                    </div>

                                    <p className="text-xs text-gray-500">
                                        Regola la dimensione in pixel del font corsivo per renderlo più discreto o imponente.
                                    </p>

                                    {/* Slider */}
                                    <div className="space-y-2">
                                        <input
                                            type="range"
                                            min="18"
                                            max="52"
                                            step="1"
                                            value={formData.appleLoaderTextSize || 28}
                                            onChange={(e) => setFormData({ ...formData, appleLoaderTextSize: parseInt(e.target.value) })}
                                            className="w-full accent-nature-600 cursor-pointer h-2 bg-gray-200 rounded-lg appearance-none"
                                        />
                                        <div className="flex justify-between text-[11px] font-bold text-gray-400">
                                            <span>18px (Min)</span>
                                            <span>28px (Default)</span>
                                            <span>52px (Max)</span>
                                        </div>
                                    </div>

                                    {/* Presets */}
                                    <div className="space-y-1.5">
                                        <span className="text-[11px] font-bold text-gray-600 block">Preset Dimensioni:</span>
                                        <div className="grid grid-cols-3 gap-1.5">
                                            {[
                                                { label: '20px Piccolo', value: 20 },
                                                { label: '24px Discreto', value: 24 },
                                                { label: '28px Standard', value: 28 },
                                                { label: '34px Grande', value: 34 },
                                                { label: '40px Maxi', value: 40 },
                                                { label: '46px Titolo', value: 46 },
                                            ].map(p => (
                                                <button
                                                    key={p.value}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, appleLoaderTextSize: p.value })}
                                                    className={`py-1.5 px-1.5 text-center rounded-xl font-bold text-xs transition-all cursor-pointer ${
                                                        (formData.appleLoaderTextSize || 28) === p.value
                                                            ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/20'
                                                            : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
                                                    }`}
                                                >
                                                    {p.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Col 2: Grassetto (Font Weight) */}
                                <div className="p-5 bg-gray-50/70 rounded-2xl border border-gray-200/80 space-y-5 flex flex-col justify-between">
                                    <div className="space-y-5">
                                        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                                            <div className="flex items-center gap-2">
                                                <Bold size={18} className="text-emerald-600" />
                                                <span className="font-extrabold text-gray-900 text-sm">Spessore / Grassetto</span>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-xl font-mono font-black text-xs ${
                                                formData.appleLoaderTextBold
                                                    ? 'bg-emerald-100 text-emerald-900'
                                                    : 'bg-gray-200 text-gray-700'
                                            }`}>
                                                {formData.appleLoaderTextBold ? 'Grassetto (700)' : 'Normale (400)'}
                                            </span>
                                        </div>

                                        <p className="text-xs text-gray-500">
                                            Attiva il grassetto per rendere i tratti corsivi più spessi, marcati e chiaramente leggibili anche su dispositivi mobili.
                                        </p>

                                        {/* Weight Toggle Buttons */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, appleLoaderTextBold: false })}
                                                className={`py-3 px-3 rounded-2xl font-medium text-xs flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                                                    !formData.appleLoaderTextBold
                                                        ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm ring-2 ring-emerald-600/20'
                                                        : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-200'
                                                }`}
                                            >
                                                <span className="font-script text-lg">Normale (400)</span>
                                                <span className="text-[10px] opacity-80">Tratto sottile ed elegante</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, appleLoaderTextBold: true })}
                                                className={`py-3 px-3 rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                                                    formData.appleLoaderTextBold
                                                        ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm ring-2 ring-emerald-600/20'
                                                        : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-200'
                                                }`}
                                            >
                                                <span className="font-script text-lg font-bold">Grassetto (700)</span>
                                                <span className="text-[10px] opacity-80">Consigliato per leggibilità</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-3 bg-white rounded-xl border border-gray-200 text-center">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Anteprima Spessore</span>
                                        <span 
                                            className="font-script text-xl text-nature-950"
                                            style={{ fontWeight: formData.appleLoaderTextBold ? 700 : 400 }}
                                        >
                                            {formData.appleLoaderPhrase || 'Caricando gli scaffali...'}
                                        </span>
                                    </div>
                                </div>

                                {/* Col 3: Posizionamento Verticale & Sovrapposizione */}
                                <div className="p-5 bg-gray-50/70 rounded-2xl border border-gray-200/80 space-y-5">
                                    <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                                        <div className="flex items-center gap-2">
                                            <MoveVertical size={18} className="text-emerald-600" />
                                            <span className="font-extrabold text-gray-900 text-sm">Posizione & Sovrapposizione</span>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-xl font-mono font-black text-xs ${
                                            (formData.appleLoaderTextOffset ?? 16) < 0
                                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                                : 'bg-emerald-100 text-emerald-900'
                                        }`}>
                                            {(formData.appleLoaderTextOffset ?? 16) < 0
                                                ? `${formData.appleLoaderTextOffset}px (Sovrapposto)`
                                                : `+${formData.appleLoaderTextOffset ?? 16}px (Sotto)`}
                                        </span>
                                    </div>

                                    <p className="text-xs text-gray-500 leading-relaxed">
                                        I valori negativi <strong>spostano la frase in alto sovrapponendola alla mela</strong>. I valori positivi la distanziano verso il basso.
                                    </p>

                                    {/* Slider */}
                                    <div className="space-y-2">
                                        <input
                                            type="range"
                                            min="-90"
                                            max="50"
                                            step="2"
                                            value={formData.appleLoaderTextOffset !== undefined ? formData.appleLoaderTextOffset : 16}
                                            onChange={(e) => setFormData({ ...formData, appleLoaderTextOffset: parseInt(e.target.value) })}
                                            className="w-full accent-nature-600 cursor-pointer h-2 bg-gray-200 rounded-lg appearance-none"
                                        />
                                        <div className="flex justify-between text-[11px] font-bold text-gray-400">
                                            <span className="text-amber-700 font-black">-90px (Sovrapposizione alta)</span>
                                            <span>0px (A filo)</span>
                                            <span>+50px (Distanziato)</span>
                                        </div>
                                    </div>

                                    {/* Presets */}
                                    <div className="space-y-1.5">
                                        <span className="text-[11px] font-bold text-gray-600 block">Preset Posizionamento:</span>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {[
                                                { label: '+24px Distanziato', value: 24 },
                                                { label: '+14px Standard', value: 14 },
                                                { label: '0px A filo mela', value: 0 },
                                                { label: '-20px Sfiora base', value: -20 },
                                                { label: '-45px Sovrapposto', value: -45 },
                                                { label: '-70px Centro mela', value: -70 },
                                            ].map(p => (
                                                <button
                                                    key={p.value}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, appleLoaderTextOffset: p.value })}
                                                    className={`py-1.5 px-2 text-center rounded-xl font-bold text-xs transition-all cursor-pointer ${
                                                        (formData.appleLoaderTextOffset !== undefined ? formData.appleLoaderTextOffset : 16) === p.value
                                                            ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/20'
                                                            : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
                                                    }`}
                                                >
                                                    {p.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Controls Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Card 1: Velocità Riproduzione Video (Playback Rate) */}
                            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 space-y-6">
                                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <Gauge size={20} className="text-emerald-600" />
                                        <h4 className="font-extrabold text-gray-900 text-base">Velocità Video MP4</h4>
                                    </div>
                                    <span className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-900 font-mono font-black text-sm">
                                        {formData.appleLoaderPlaybackRate.toFixed(2)}x
                                    </span>
                                </div>

                                <p className="text-xs text-gray-500 leading-relaxed">
                                    Controlla il fattore di velocità di riproduzione (<code>playbackRate</code>) del video boomerang MP4 su tutti i loader del sito.
                                </p>

                                {/* Slider */}
                                <div className="space-y-2">
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="2.5"
                                        step="0.05"
                                        value={formData.appleLoaderPlaybackRate}
                                        onChange={(e) => setFormData({ ...formData, appleLoaderPlaybackRate: parseFloat(e.target.value) })}
                                        className="w-full accent-nature-600 cursor-pointer h-2 bg-gray-200 rounded-lg appearance-none"
                                    />
                                    <div className="flex justify-between text-[11px] font-bold text-gray-400">
                                        <span>0.5x (Lento)</span>
                                        <span>1.0x (Normale)</span>
                                        <span>2.5x (Veloce)</span>
                                    </div>
                                </div>

                                {/* Preset Buttons */}
                                <div className="space-y-2">
                                    <span className="text-xs font-bold text-gray-700 block">Preset Rapidi:</span>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { label: '0.75x Lento', value: 0.75 },
                                            { label: '1.0x Normale', value: 1.0 },
                                            { label: '1.25x Fluido', value: 1.25 },
                                            { label: '1.5x Rapido', value: 1.5 },
                                            { label: '1.75x Sprint', value: 1.75 },
                                            { label: '2.0x Max', value: 2.0 },
                                        ].map(preset => (
                                            <button
                                                key={preset.value}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, appleLoaderPlaybackRate: preset.value })}
                                                className={`py-2 px-2 text-center rounded-xl font-bold text-xs transition-all cursor-pointer ${
                                                    Math.abs(formData.appleLoaderPlaybackRate - preset.value) < 0.01
                                                        ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/20'
                                                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200/70'
                                                }`}
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Dimensione Video (in Pixel) */}
                            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 space-y-6">
                                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <Sliders size={20} className="text-emerald-600" />
                                        <h4 className="font-extrabold text-gray-900 text-base">Dimensione Video</h4>
                                    </div>
                                    <span className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-900 font-mono font-black text-sm">
                                        {formData.appleLoaderDimension || 200}px
                                    </span>
                                </div>

                                <p className="text-xs text-gray-500 leading-relaxed">
                                    Imposta la dimensione in pixel del video animato. I loader delle pagine scaleranno in proporzione a questo valore.
                                </p>

                                {/* Slider */}
                                <div className="space-y-2">
                                    <input
                                        type="range"
                                        min="120"
                                        max="400"
                                        step="10"
                                        value={formData.appleLoaderDimension || 200}
                                        onChange={(e) => setFormData({ ...formData, appleLoaderDimension: parseInt(e.target.value) })}
                                        className="w-full accent-nature-600 cursor-pointer h-2 bg-gray-200 rounded-lg appearance-none"
                                    />
                                    <div className="flex justify-between text-[11px] font-bold text-gray-400">
                                        <span>120px (Compatto)</span>
                                        <span>200px (Default)</span>
                                        <span>400px (Maxi)</span>
                                    </div>
                                </div>

                                {/* Preset Buttons */}
                                <div className="space-y-2">
                                    <span className="text-xs font-bold text-gray-700 block">Preset Dimensioni:</span>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { label: '150px', value: 150 },
                                            { label: '200px', value: 200 },
                                            { label: '250px', value: 250 },
                                            { label: '280px', value: 280 },
                                            { label: '320px', value: 320 },
                                            { label: '380px', value: 380 },
                                        ].map(preset => (
                                            <button
                                                key={preset.value}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, appleLoaderDimension: preset.value })}
                                                className={`py-2 px-2 text-center rounded-xl font-bold text-xs transition-all cursor-pointer ${
                                                    (formData.appleLoaderDimension || 200) === preset.value
                                                        ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/20'
                                                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200/70'
                                                }`}
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Card 3: Durata Minima Caricamento (Home & Prodotti) */}
                            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 space-y-6">
                                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <Clock size={20} className="text-emerald-600" />
                                        <h4 className="font-extrabold text-gray-900 text-base">Durata Minima Caricamento</h4>
                                    </div>
                                    <span className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-900 font-mono font-black text-sm">
                                        {formData.appleLoaderMinDuration}s
                                    </span>
                                </div>

                                <p className="text-xs text-gray-500 leading-relaxed">
                                    Imposta per quanti secondi l'animazione della mela deve restare visibile durante l'accesso iniziale alla <strong>Home Page</strong> e al <strong>Catalogo/Dettaglio Prodotti</strong> prima di mostrare il contenuto.
                                </p>

                                {/* Slider */}
                                <div className="space-y-2">
                                    <input
                                        type="range"
                                        min="1"
                                        max="6"
                                        step="1"
                                        value={formData.appleLoaderMinDuration}
                                        onChange={(e) => setFormData({ ...formData, appleLoaderMinDuration: parseInt(e.target.value) })}
                                        className="w-full accent-nature-600 cursor-pointer h-2 bg-gray-200 rounded-lg appearance-none"
                                    />
                                    <div className="flex justify-between text-[11px] font-bold text-gray-400">
                                        <span>1 secondo</span>
                                        <span>2 secondi (Consigliato)</span>
                                        <span>6 secondi</span>
                                    </div>
                                </div>

                                {/* Preset Buttons */}
                                <div className="space-y-2">
                                    <span className="text-xs font-bold text-gray-700 block">Scelta Rapida:</span>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[
                                            { label: '2 sec', value: 2 },
                                            { label: '3 sec', value: 3 },
                                            { label: '4 sec', value: 4 },
                                            { label: '5 sec', value: 5 },
                                        ].map(preset => (
                                            <button
                                                key={preset.value}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, appleLoaderMinDuration: preset.value })}
                                                className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                                                    formData.appleLoaderMinDuration === preset.value
                                                        ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/20'
                                                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200/70'
                                                }`}
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800">
                                    <Sparkles size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                    <span>
                                        Un valore di <strong>2 o 3 secondi</strong> offre il miglior compromesso tra spettacolarità visiva e rapidità di navigazione per l'utente.
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Save Action Footer */}
                        <div className="flex justify-end pt-4">
                            <button
                                type="button"
                                onClick={handleSettingsSubmit}
                                disabled={isSaving}
                                className="bg-nature-900 text-white px-10 py-4 rounded-2xl font-bold shadow-2xl hover:bg-black transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                            >
                                {isSaving ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Save size={20} />}
                                <span>Salva Configurazione Animazione Mela</span>
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'navigation' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Header Box */}
                        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-bold flex items-center gap-2 text-nature-800">
                                    <Compass size={22} className="text-emerald-600" /> Menu di Navigazione Personalizzato
                                </h3>
                                <p className="text-xs text-gray-500 mt-1 max-w-2xl leading-relaxed">
                                    Personalizza le voci della barra menu in alto. Puoi collegare <strong>pagine</strong> (Home, Mercati, Gift Card, pagine CMS), <strong>categorie di prodotti</strong> (es. Frutta, Verdura con filtro diretto sullo shop) oppure <strong>link personalizzati</strong>.
                                </p>
                            </div>
                            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                                <button
                                    type="button"
                                    onClick={handleResetDefaultNav}
                                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition cursor-pointer"
                                    title="Ripristina le 4 voci originali"
                                >
                                    Ripristina Predefinito
                                </button>
                                <button
                                    type="button"
                                    onClick={handleOpenAddNavModal}
                                    className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
                                >
                                    <Plus size={16} /> Aggiungi Voce
                                </button>
                            </div>
                        </div>

                        {/* Interactive Live Preview */}
                        <div className="bg-gradient-to-br from-nature-50/80 via-white to-nature-50/50 rounded-3xl p-6 border border-nature-200/80 shadow-xs space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <CheckCircle2 size={14} className="text-emerald-700" /> Anteprima Barra Desktop (Live)
                                </span>
                                <span className="text-[10px] text-gray-400 font-bold">
                                    {(formData.customNavItems || []).filter(i => i.isActive !== false).length} voci attive
                                </span>
                            </div>
                            <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-gray-150 flex items-center justify-start overflow-x-auto shadow-2xs">
                                <div className="bg-nature-50/90 border border-nature-200/80 rounded-full p-2 flex items-center gap-1.5 shadow-sm">
                                    {(formData.customNavItems || [])
                                        .filter(i => i.isActive !== false)
                                        .map((item, idx) => (
                                            <div
                                                key={item.id}
                                                className={`px-5 py-2 rounded-full text-xs font-bold transition-all select-none flex items-center gap-2 ${
                                                    idx === 0 
                                                        ? 'bg-gradient-to-r from-emerald-600 via-nature-600 to-emerald-700 text-white shadow-md' 
                                                        : 'text-nature-900/80 hover:text-emerald-800 bg-transparent'
                                                }`}
                                            >
                                                <span>{item.label}</span>
                                                {idx === 0 && (
                                                    <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)]" />
                                                )}
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>

                        {/* Hover Effect Calibration Card */}
                        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                                <div>
                                    <h4 className="text-base font-bold text-gray-800 flex items-center gap-2">
                                        <Sparkles size={18} className="text-emerald-600" /> Trasparenza & Colore Chip al Passaggio del Mouse (Hover)
                                    </h4>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Regola l'opacità e la tonalità verde del chip satinato quando l'utente passa sopra una voce del menu prima di selezionarla.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleSettingsSubmit}
                                    disabled={isSaving}
                                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
                                >
                                    <Save size={15} /> {isSaving ? 'Salvataggio...' : 'Salva Trasparenza'}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                                {/* Slider Controls */}
                                <div className="lg:col-span-7 space-y-5">
                                    {/* 1. Opacity Slider */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                                            <label htmlFor="navHoverOpacity" className="flex items-center gap-1.5">
                                                <span>Livello Opacità / Trasparenza</span>
                                            </label>
                                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-mono font-extrabold shadow-2xs">
                                                {formData.navHoverOpacity}%
                                            </span>
                                        </div>
                                        <input
                                            id="navHoverOpacity"
                                            type="range"
                                            min="10"
                                            max="100"
                                            step="5"
                                            value={formData.navHoverOpacity}
                                            onChange={e => setFormData({ ...formData, navHoverOpacity: Number(e.target.value) })}
                                            className="w-full h-2.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                                        />
                                        <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                                            <span>10% (Molto Trasparente)</span>
                                            <span>50% (Equilibrato)</span>
                                            <span>100% (Solido)</span>
                                        </div>
                                    </div>

                                    {/* 2. Color Tone Selector & Presets */}
                                    <div className="space-y-2 pt-2">
                                        <label className="block text-xs font-bold text-gray-700">
                                            Tonalità Colore Vetro
                                        </label>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {[
                                                { name: 'Menta Fresca', color: '#bbf7d0' },
                                                { name: 'Smeraldo Chiaro', color: '#a7f3d0' },
                                                { name: 'Erba / Salvia', color: '#86efac' },
                                                { name: 'Lime Vivace', color: '#d9f99d' },
                                                { name: 'Smeraldo Intenso', color: '#34d399' }
                                            ].map(preset => (
                                                <button
                                                    key={preset.color}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, navHoverColor: preset.color })}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                                                        formData.navHoverColor?.toLowerCase() === preset.color.toLowerCase()
                                                            ? 'border-emerald-600 ring-2 ring-emerald-500/30 bg-emerald-50 text-emerald-900 shadow-xs'
                                                            : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
                                                    }`}
                                                >
                                                    <span 
                                                        className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0" 
                                                        style={{ backgroundColor: preset.color }} 
                                                    />
                                                    <span>{preset.name}</span>
                                                </button>
                                            ))}
                                            <div className="flex items-center gap-1.5 pl-2 border-l border-gray-200">
                                                <input
                                                    type="color"
                                                    value={formData.navHoverColor || '#bbf7d0'}
                                                    onChange={e => setFormData({ ...formData, navHoverColor: e.target.value })}
                                                    className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 p-0.5 bg-white"
                                                    title="Scegli colore personalizzato"
                                                />
                                                <span className="text-[11px] font-mono text-gray-500">{formData.navHoverColor}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Live Interactive Test Box */}
                                <div className="lg:col-span-5 bg-gradient-to-b from-gray-50/80 to-white p-5 rounded-2xl border border-gray-200/70 text-center flex flex-col items-center justify-center space-y-3">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                        Prova Interattiva (Passa il mouse)
                                    </span>
                                    
                                    {/* Test Chip Container */}
                                    <div className="relative bg-nature-50/90 border border-nature-200/80 rounded-full p-2 shadow-sm inline-flex items-center gap-2">
                                        <div className="px-5 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-600 via-nature-600 to-emerald-700 text-white shadow-md flex items-center gap-2">
                                            <span>Home</span>
                                            <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                                        </div>
                                        
                                        {/* Interactive Hover Test Link */}
                                        <div 
                                            className="relative px-5 py-2 rounded-full text-xs font-bold text-nature-900/80 cursor-pointer select-none transition-all group"
                                        >
                                            <div 
                                                className="absolute inset-0 rounded-full backdrop-blur-md transition-opacity duration-200 opacity-90 group-hover:opacity-100 -z-10 shadow-xs border"
                                                style={{
                                                    backgroundColor: hexToRgba(formData.navHoverColor || '#bbf7d0', (formData.navHoverOpacity || 75) / 100),
                                                    borderColor: hexToRgba(formData.navHoverColor || '#bbf7d0', Math.min(1, ((formData.navHoverOpacity || 75) / 100) + 0.25))
                                                }}
                                            />
                                            <span>Passa sopra qui! ✨</span>
                                        </div>
                                    </div>
                                    
                                    <p className="text-[11px] text-gray-400">
                                        Il chip mostra in tempo reale l'effetto con opacità <strong>{formData.navHoverOpacity}%</strong>.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Nav Items List */}
                        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 space-y-4">
                            <h4 className="text-sm font-black text-gray-400 uppercase tracking-wider">
                                Voci del Menu e Ordinamento
                            </h4>

                            <div className="space-y-2.5">
                                {(formData.customNavItems || []).map((item, index) => (
                                    <div
                                        key={item.id}
                                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-all gap-3 ${
                                            item.isActive !== false
                                                ? 'bg-gray-50/70 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30'
                                                : 'bg-gray-100/60 border-gray-200/70 opacity-60'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            {/* Reorder Buttons */}
                                            <div className="flex flex-col gap-1 shrink-0">
                                                <button
                                                    type="button"
                                                    disabled={index === 0}
                                                    onClick={() => handleMoveNavItem(index, 'up')}
                                                    className="w-7 h-7 bg-white hover:bg-emerald-100 text-gray-600 hover:text-emerald-800 disabled:opacity-30 disabled:pointer-events-none rounded-lg border border-gray-200 flex items-center justify-center transition cursor-pointer"
                                                    title="Sposta su"
                                                >
                                                    <ArrowUp size={13} />
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={index === (formData.customNavItems || []).length - 1}
                                                    onClick={() => handleMoveNavItem(index, 'down')}
                                                    className="w-7 h-7 bg-white hover:bg-emerald-100 text-gray-600 hover:text-emerald-800 disabled:opacity-30 disabled:pointer-events-none rounded-lg border border-gray-200 flex items-center justify-center transition cursor-pointer"
                                                    title="Sposta giù"
                                                >
                                                    <ArrowDown size={13} />
                                                </button>
                                            </div>

                                            {/* Number Order */}
                                            <span className="w-7 h-7 rounded-lg bg-gray-200/80 text-gray-700 text-xs font-black flex items-center justify-center shrink-0">
                                                #{index + 1}
                                            </span>

                                            {/* Info */}
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-black text-gray-900 text-base">
                                                        {item.label}
                                                    </span>
                                                    {/* Type Badge */}
                                                    {item.type === 'PAGE' && (
                                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                                                            <BookOpen size={11} /> Pagina
                                                        </span>
                                                    )}
                                                    {item.type === 'CATEGORY' && (
                                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                                            <Tag size={11} /> Categoria
                                                        </span>
                                                    )}
                                                    {item.type === 'CUSTOM' && (
                                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                                                            <ExternalLink size={11} /> Link Custom
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 font-mono truncate mt-0.5" title={item.url}>
                                                    {item.url}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                            {/* Active Switch */}
                                            <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-gray-200 hover:border-emerald-300 transition text-xs font-bold text-gray-700">
                                                <input
                                                    type="checkbox"
                                                    checked={item.isActive !== false}
                                                    onChange={() => handleToggleNavActive(item.id)}
                                                    className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-500 cursor-pointer"
                                                />
                                                <span className={item.isActive !== false ? 'text-emerald-800' : 'text-gray-400'}>
                                                    {item.isActive !== false ? 'Attivo' : 'Nascosto'}
                                                </span>
                                            </label>

                                            {/* Edit */}
                                            <button
                                                type="button"
                                                onClick={() => handleOpenEditNavModal(item)}
                                                className="w-9 h-9 rounded-xl bg-white hover:bg-blue-50 text-gray-600 hover:text-blue-700 border border-gray-200 flex items-center justify-center transition cursor-pointer"
                                                title="Modifica voce"
                                            >
                                                <Edit2 size={15} />
                                            </button>

                                            {/* Delete */}
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteNavItem(item.id)}
                                                className="w-9 h-9 rounded-xl bg-white hover:bg-red-50 text-gray-600 hover:text-red-700 border border-gray-200 flex items-center justify-center transition cursor-pointer"
                                                title="Elimina voce"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Sticky Save Button */}
                        <div className="flex justify-end p-4 sticky bottom-6 z-20">
                            <button
                                type="button"
                                onClick={handleSettingsSubmit}
                                disabled={isSaving}
                                className="bg-nature-900 text-white px-10 py-4 rounded-2xl font-bold shadow-2xl hover:bg-black transition-all flex items-center gap-2 cursor-pointer active:scale-98"
                            >
                                {isSaving ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> : <Save size={20} />}
                                <span>Salva Menu di Navigazione</span>
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'backgrounds' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Header Box */}
                        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-bold flex items-center gap-2 text-nature-800">
                                    <ImageIcon size={22} className="text-emerald-600" /> Sfondi Personalizzati Pagine
                                </h3>
                                <p className="text-xs text-gray-500 mt-1 max-w-2xl">
                                    Carica immagini di sfondo per ciascuna rotta del sito o imposta uno sfondo globale. 
                                    Puoi regolare opacità, sfocatura ed effetto parallasse fisso per garantire la massima leggibilità di testi e prodotti.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleSettingsSubmit}
                                disabled={isSaving}
                                className="px-6 py-3 bg-nature-900 hover:bg-black text-white font-bold text-sm rounded-xl transition shadow-md flex items-center gap-2 cursor-pointer self-start md:self-auto shrink-0"
                            >
                                {isSaving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Save size={16} />}
                                <span>Salva Modifiche Sfondi</span>
                            </button>
                        </div>

                        {/* Grid of Pages */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {AVAILABLE_PAGE_TARGETS.map(target => {
                                const bg = formData.pageBackgrounds[target.key];
                                const hasImage = Boolean(bg?.imageUrl);
                                const isUploading = uploadingBgKey === target.key;

                                return (
                                    <div
                                        key={target.key}
                                        className={`bg-white rounded-3xl p-5 shadow-sm border transition-all flex flex-col justify-between ${
                                            target.key === 'default'
                                                ? 'border-emerald-300 ring-2 ring-emerald-500/20 md:col-span-2 lg:col-span-3'
                                                : 'border-gray-150 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="space-y-3">
                                            {/* Page Title & Path */}
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="font-black text-sm text-gray-900">{target.label}</h4>
                                                    <span className="text-[11px] font-mono text-gray-400">{target.path}</span>
                                                </div>
                                                {hasImage && (
                                                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                                        <span className="text-[11px] font-bold text-gray-500">
                                                            {bg.isActive !== false ? 'Attivo' : 'Spento'}
                                                        </span>
                                                        <input
                                                            type="checkbox"
                                                            checked={bg.isActive !== false}
                                                            onChange={e => updatePageBackground(target.key, { isActive: e.target.checked })}
                                                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                                                        />
                                                    </label>
                                                )}
                                            </div>

                                            {/* Preview Box or Upload Dropzone */}
                                            {hasImage ? (
                                                <div className="space-y-3">
                                                    <div className="relative aspect-video rounded-2xl overflow-hidden border border-gray-200 bg-gray-100 shadow-inner group">
                                                        {/* Simulated page background preview */}
                                                        <div
                                                            className="absolute inset-0 bg-cover bg-center transition-all"
                                                            style={{
                                                                backgroundImage: `url("${sanitizeImageUrl(bg.imageUrl)}")`,
                                                                opacity: (bg.opacity !== undefined ? bg.opacity : 30) / 100,
                                                                filter: bg.blur ? `blur(${bg.blur}px)` : undefined,
                                                            }}
                                                        />
                                                        {/* Simulated text card for contrast check */}
                                                        <div className="relative z-10 m-3 p-2 rounded-xl bg-white/90 backdrop-blur-xs border border-white/60 shadow-xs max-w-[200px]">
                                                            <div className="w-12 h-2 rounded bg-emerald-700/80 mb-1" />
                                                            <div className="w-24 h-1.5 rounded bg-gray-400 mb-0.5" />
                                                            <div className="w-16 h-1.5 rounded bg-gray-300" />
                                                        </div>

                                                        {/* Overlay actions on hover */}
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                            <label className="px-3 py-1.5 bg-white text-gray-800 rounded-xl text-xs font-bold cursor-pointer hover:bg-gray-100 shadow">
                                                                Sostituisci
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    className="hidden"
                                                                    onChange={e => {
                                                                        const f = e.target.files?.[0];
                                                                        if (f) handleBackgroundUpload(target.key, f);
                                                                    }}
                                                                />
                                                            </label>
                                                            <button
                                                                type="button"
                                                                onClick={() => removePageBackground(target.key)}
                                                                className="px-3 py-1.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 shadow flex items-center gap-1 cursor-pointer"
                                                            >
                                                                <Trash2 size={13} /> Rimuovi
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Controls: Opacity, Blur, Fixed */}
                                                    <div className="space-y-2.5 pt-1 text-xs">
                                                        <div>
                                                            <div className="flex justify-between font-bold text-gray-700 mb-1">
                                                                <span>Opacità Sfondo</span>
                                                                <span className="font-mono text-emerald-700">
                                                                    {bg.opacity !== undefined ? bg.opacity : 30}%
                                                                </span>
                                                            </div>
                                                            <input
                                                                type="range"
                                                                min="5"
                                                                max="90"
                                                                step="5"
                                                                value={bg.opacity !== undefined ? bg.opacity : 30}
                                                                onChange={e => updatePageBackground(target.key, { opacity: Number(e.target.value) })}
                                                                className="w-full accent-emerald-600 cursor-pointer"
                                                            />
                                                        </div>

                                                        <div>
                                                            <div className="flex justify-between font-bold text-gray-700 mb-1">
                                                                <span>Sfocatura (Blur)</span>
                                                                <span className="font-mono text-emerald-700">{bg.blur || 0}px</span>
                                                            </div>
                                                            <input
                                                                type="range"
                                                                min="0"
                                                                max="15"
                                                                step="1"
                                                                value={bg.blur || 0}
                                                                onChange={e => updatePageBackground(target.key, { blur: Number(e.target.value) })}
                                                                className="w-full accent-emerald-600 cursor-pointer"
                                                            />
                                                        </div>

                                                        <label className="flex items-center gap-2 pt-1 font-bold text-gray-700 cursor-pointer select-none">
                                                            <input
                                                                type="checkbox"
                                                                checked={Boolean(bg.isFixed)}
                                                                onChange={e => updatePageBackground(target.key, { isFixed: e.target.checked })}
                                                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                                                            />
                                                            <span>Effetto Parallasse (Fisso allo scorrimento)</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            ) : (
                                                <label className="border-2 border-dashed border-gray-200 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition group min-h-[160px]">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        disabled={isUploading}
                                                        onChange={e => {
                                                            const f = e.target.files?.[0];
                                                            if (f) handleBackgroundUpload(target.key, f);
                                                        }}
                                                    />
                                                    {isUploading ? (
                                                        <div className="flex flex-col items-center gap-2">
                                                            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-emerald-600" />
                                                            <span className="text-xs font-bold text-gray-500">Caricamento in corso...</span>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="w-10 h-10 rounded-xl bg-gray-100 group-hover:bg-emerald-100 text-gray-400 group-hover:text-emerald-700 flex items-center justify-center mb-2 transition-colors">
                                                                <Upload size={20} />
                                                            </div>
                                                            <span className="text-xs font-bold text-gray-700 group-hover:text-emerald-800">
                                                                Carica Sfondo
                                                            </span>
                                                            <span className="text-[10px] text-gray-400 mt-0.5">
                                                                JPG, PNG, WEBP fino a 8MB
                                                            </span>
                                                        </>
                                                    )}
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Sticky Save Button */}
                        <div className="flex justify-end p-4 sticky bottom-6 z-20">
                            <button
                                type="button"
                                onClick={handleSettingsSubmit}
                                disabled={isSaving}
                                className="bg-nature-900 text-white px-10 py-4 rounded-2xl font-bold shadow-2xl hover:bg-black transition-all flex items-center gap-2 cursor-pointer"
                            >
                                {isSaving ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> : <Save size={20} />}
                                <span>Salva Modifiche Sfondi</span>
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'revolut' && (
                    <form onSubmit={handleSettingsSubmit} className="space-y-8 animate-in fade-in duration-300">
                        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 space-y-6">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                                <div>
                                    <h3 className="text-xl font-bold flex items-center gap-2 text-indigo-600">
                                        <CreditCard size={22} /> Revolut Merchant API
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Abilita e gestisci i pagamenti online tramite Revolut Pay e Carte di Credito.
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.revolutEnabled}
                                        onChange={e => setFormData({ ...formData, revolutEnabled: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    <span className="ml-3 text-sm font-bold text-gray-700">
                                        {formData.revolutEnabled ? 'Attivo' : 'Disattivato'}
                                    </span>
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-700">Ambiente (Environment)</label>
                                    <select
                                        value={formData.revolutEnvironment}
                                        onChange={e => setFormData({ ...formData, revolutEnvironment: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 font-bold text-sm focus:ring-2 focus:ring-indigo-500/20"
                                    >
                                        <option value="sandbox">🧪 Sandbox (Test & Simulazione)</option>
                                        <option value="production">🚀 Produzione (Live)</option>
                                    </select>
                                    <p className="text-[11px] text-gray-400">
                                        Seleziona <strong>Sandbox</strong> per effettuare test con carte simulate senza addebiti reali.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-700">Chiave API Segreta (Secret API Key)</label>
                                    <input
                                        type="password"
                                        placeholder="sk_..."
                                        value={formData.revolutApiKey}
                                        onChange={e => setFormData({ ...formData, revolutApiKey: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 font-mono text-sm focus:ring-2 focus:ring-indigo-500/20"
                                    />
                                    <p className="text-[11px] text-gray-400">
                                        Copia la chiave segreta dal tuo account Revolut Business (Merchant API).
                                    </p>
                                </div>
                            </div>

                            <div className="bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100 text-xs text-indigo-900 space-y-2">
                                <div className="font-bold text-sm flex items-center gap-2">
                                    🔗 Endpoint Webhook Revolut
                                </div>
                                <p className="text-gray-600">
                                    Imposta il seguente URL Webhook nel tuo pannello Revolut Merchant per ricevere aggiornamenti in tempo reale:
                                </p>
                                <div className="p-2.5 bg-white rounded-xl border border-indigo-200 font-mono text-xs select-all break-all">
                                    {window.location.origin}/api/webhooks/revolut
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end p-4 sticky bottom-6 z-20">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-bold shadow-2xl hover:bg-indigo-700 transition-all flex items-center gap-2"
                            >
                                {isSaving ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Save size={20} />}
                                <span>Salva Impostazioni Revolut</span>
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
                                <TemplateField label="5. Programmazione Appuntamento" field="waTemplateScheduled" value={formData.waTemplateScheduled} tags={['id', 'cliente', 'data', 'ora', 'metodo']} onInsertTag={handleInsertTag} onChange={(v: any) => setFormData({ ...formData, waTemplateScheduled: v })} textareaRef={refs.waTemplateScheduled} />
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

            {/* Modal Aggiungi / Modifica Voce Menu */}
            {isNavModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-gray-100 relative my-8">
                        <button
                            type="button"
                            onClick={() => setIsNavModalOpen(false)}
                            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition cursor-pointer"
                        >
                            <X size={18} />
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                                <Compass size={22} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900">
                                    {editingNavId ? 'Modifica Voce Menu' : 'Nuova Voce Menu'}
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Configura l'etichetta e la destinazione del link
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSaveNavModal} className="space-y-5">
                            {/* Nome Visualizzato */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-black uppercase tracking-wider text-gray-600 block">
                                    Nome Visualizzato nel Menu
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Es. Frutta di Stagione, Offerte..."
                                    value={navForm.label}
                                    onChange={e => setNavForm(prev => ({ ...prev, label: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 text-sm font-bold text-gray-900 outline-none"
                                />
                            </div>

                            {/* Tipo di Link (3 Pills) */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-black uppercase tracking-wider text-gray-600 block">
                                    Tipo di Collegamento
                                </label>
                                <div className="grid grid-cols-3 gap-2 bg-gray-100 p-1 rounded-2xl">
                                    <button
                                        type="button"
                                        onClick={() => handleNavFormTypeChange('PAGE')}
                                        className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                                            navForm.type === 'PAGE'
                                                ? 'bg-white text-blue-900 shadow-xs'
                                                : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        <BookOpen size={13} />
                                        <span>Pagina</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleNavFormTypeChange('CATEGORY')}
                                        className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                                            navForm.type === 'CATEGORY'
                                                ? 'bg-white text-emerald-900 shadow-xs'
                                                : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        <Tag size={13} />
                                        <span>Categoria</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleNavFormTypeChange('CUSTOM')}
                                        className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                                            navForm.type === 'CUSTOM'
                                                ? 'bg-white text-purple-900 shadow-xs'
                                                : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        <ExternalLink size={13} />
                                        <span>Link Custom</span>
                                    </button>
                                </div>
                            </div>

                            {/* Destinazione in base al tipo */}
                            {navForm.type === 'PAGE' && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase tracking-wider text-gray-600 block">
                                        Seleziona Pagina
                                    </label>
                                    <select
                                        value={navForm.target}
                                        onChange={e => handleNavPageTargetChange(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 text-sm font-bold text-gray-900 outline-none bg-white cursor-pointer"
                                    >
                                        <optgroup label="Pagine Principali">
                                            <option value="/">🏠 Home Page (/)</option>
                                            <option value="/shop">🍎 Catalogo Ortofrutta (/shop)</option>
                                            <option value="/mercati">📍 I Nostri Mercati (/mercati)</option>
                                            <option value="/gift-cards">🎁 Buoni Regalo & Gift Card (/gift-cards)</option>
                                        </optgroup>
                                        {cmsPages.length > 0 && (
                                            <optgroup label="Pagine Personalizzate CMS">
                                                {cmsPages.map(p => (
                                                    <option key={p.id} value={`/page/${p.slug}`}>
                                                        📄 {p.title} (/page/{p.slug})
                                                    </option>
                                                ))}
                                            </optgroup>
                                        )}
                                    </select>
                                </div>
                            )}

                            {navForm.type === 'CATEGORY' && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase tracking-wider text-gray-600 block">
                                        Seleziona Categoria Prodotti
                                    </label>
                                    <select
                                        value={navForm.target}
                                        onChange={e => handleNavCategoryTargetChange(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 text-sm font-bold text-gray-900 outline-none bg-white cursor-pointer"
                                    >
                                        {categories.length === 0 ? (
                                            <option value="">Nessuna categoria trovata</option>
                                        ) : (
                                            categories.map(c => (
                                                <option key={c.id} value={c.name}>
                                                    🏷️ {c.name}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                    <p className="text-[11px] text-gray-500 mt-1">
                                        Genera automaticamente il link filtrato: <code className="font-mono text-emerald-800">{navForm.url}</code>
                                    </p>
                                </div>
                            )}

                            {navForm.type === 'CUSTOM' && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase tracking-wider text-gray-600 block">
                                        URL / Percorso
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Es. /offerte o https://..."
                                        value={navForm.url}
                                        onChange={e => setNavForm(prev => ({ ...prev, target: e.target.value, url: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 text-sm font-mono text-gray-900 outline-none"
                                    />
                                </div>
                            )}

                            {/* Attivo Checkbox */}
                            <div className="pt-2">
                                <label className="flex items-center gap-2.5 cursor-pointer text-sm font-bold text-gray-800">
                                    <input
                                        type="checkbox"
                                        checked={navForm.isActive}
                                        onChange={e => setNavForm(prev => ({ ...prev, isActive: e.target.checked }))}
                                        className="w-5 h-5 rounded text-emerald-700 focus:ring-emerald-500 cursor-pointer"
                                    />
                                    <span>Mostra questa voce nella barra di navigazione</span>
                                </label>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsNavModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition cursor-pointer"
                                >
                                    Annulla
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm shadow-md transition cursor-pointer active:scale-95"
                                >
                                    {editingNavId ? 'Aggiorna Voce' : 'Aggiungi Voce'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={!!confirmModal}
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
