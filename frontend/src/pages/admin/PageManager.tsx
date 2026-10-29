import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import * as Icons from 'lucide-react';
import { Trash2, Edit, Plus, X, Globe, EyeOff, Check, LayoutTemplate } from 'lucide-react';
import ReactQuill, { Quill } from 'react-quill';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { sanitizeImageUrl } from '../../utils/imageUrl';
import { ConfirmModal } from '../../components/admin/ConfirmModal';
import { SearchableSelect } from '../../components/admin/SearchableSelect';
import { BlockRenderer } from '../../components/cms/BlockRenderer';


// Register Custom Fonts
const Font = Quill.import('formats/font');
Font.whitelist = ['nunito', 'dancing-script'];
Quill.register(Font, true);

const API_URL = '';

const AVAILABLE_ICONS = [
    'Leaf', 'Apple', 'Carrot', 'Wheat', 'Trees', 'Sprout', 'Sun', 'Droplets',
    'Truck', 'Store', 'ShoppingBasket', 'ShoppingCart', 'Package', 'Box',
    'CreditCard', 'Wallet', 'Banknote', 'Percent', 'Tag',
    'Clock', 'Calendar', 'Heart', 'Star', 'Award', 'BadgeCheck',
    'ThumbsUp', 'Shield', 'ShieldCheck', 'Users', 'MessageCircle',
    'Phone', 'MapPin', 'Mail', 'Info', 'CheckCircle', 'Zap', 'Flame', 'Smile'
];

const DynamicIcon = ({ name, size = 20, className = "" }: { name: string, size?: number, className?: string }) => {
    const IconComponent = (Icons as any)[name] || Icons.Star;
    return <IconComponent size={size} className={className} />;
};

const IconSelector = ({ value, onChange }: { value: string, onChange: (iconName: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2 border rounded-lg bg-white hover:bg-gray-50 text-sm h-10"
            >
                <div className="flex items-center gap-2">
                    <DynamicIcon name={value || 'Star'} size={18} className="text-nature-600" />
                    <span className="truncate">{value || 'Seleziona'}</span>
                </div>
                <Icons.ChevronDown size={14} className="text-gray-400" />
            </button>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute z-50 top-full left-0 mt-1 w-64 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl p-2 grid grid-cols-5 gap-1">
                        {AVAILABLE_ICONS.map(icon => (
                            <button
                                key={icon}
                                type="button"
                                onClick={() => {
                                    onChange(icon);
                                    setIsOpen(false);
                                }}
                                className={`p-2 rounded-lg flex items-center justify-center hover:bg-nature-50 hover:text-nature-600 transition-colors ${value === icon ? 'bg-nature-100 text-nature-700' : 'text-gray-600'}`}
                                title={icon}
                            >
                                <DynamicIcon name={icon} size={20} />
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

const QUILL_MODULES = {
    toolbar: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }, { 'font': ['nunito', 'dancing-script'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'align': [] }],
        ['clean']
    ]
};

const QUILL_FORMATS = [
    'header', 'font',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet',
    'align'
];

interface Page {
    id: number;
    slug: string;
    title: string;
    content: string;
    isPublished: boolean;
    updatedAt: string;
}

export type BlockType = 'hero' | 'features' | 'richText' | 'imageText' | 'cta' | 'faq' | 'latestProducts' | 'testimonials' | 'imageGallery' | 'newsletter' | 'stats' | 'video' | 'categories' | 'bannerPromo' | 'storeInfo';

export interface Block {
    id: string;
    type: BlockType;
    data: any;
}

export interface BlockDefinition {
    label: string;
    icon: any;
    description: string;
    category: 'Contenuto' | 'Marketing' | 'Social' | 'Store';
    color: {
        bg: string;
        text: string;
        ring: string;
        border: string;
        light: string;
    };
}

const BLOCK_DEFINITIONS: Record<BlockType, BlockDefinition> = {
    hero: {
        label: 'Hero / Copertina',
        icon: Icons.Image,
        description: 'Immagine grande a tutto schermo con titolo d\'impatto e bottoni di chiamata all\'azione.',
        category: 'Contenuto',
        color: { bg: 'bg-emerald-500', text: 'text-emerald-700', ring: 'ring-emerald-200', border: 'border-emerald-200', light: 'bg-emerald-50' }
    },
    bannerPromo: {
        label: 'Banner Promozioni',
        icon: Icons.Megaphone,
        description: 'Banner in evidenza con badge promozionale, testo e codice coupon sconto.',
        category: 'Marketing',
        color: { bg: 'bg-amber-500', text: 'text-amber-700', ring: 'ring-amber-200', border: 'border-amber-200', light: 'bg-amber-50' }
    },
    features: {
        label: 'Vantaggi / Servizi',
        icon: Icons.Sparkles,
        description: 'Punti di forza e servizi garantiti con icone Lucide o grafiche personalizzate.',
        category: 'Store',
        color: { bg: 'bg-indigo-500', text: 'text-indigo-700', ring: 'ring-indigo-200', border: 'border-indigo-200', light: 'bg-indigo-50' }
    },
    imageText: {
        label: 'Immagine & Testo',
        icon: Icons.LayoutTemplate,
        description: 'Layout affiancato bilanciato con supporto testo formattato e allineamento reversibile.',
        category: 'Contenuto',
        color: { bg: 'bg-purple-500', text: 'text-purple-700', ring: 'ring-purple-200', border: 'border-purple-200', light: 'bg-purple-50' }
    },
    cta: {
        label: 'Call to Action',
        icon: Icons.MousePointerClick,
        description: 'Box accattivante ad alta conversione per guidare l\'utente ad acquistare o scoprire.',
        category: 'Marketing',
        color: { bg: 'bg-rose-500', text: 'text-rose-700', ring: 'ring-rose-200', border: 'border-rose-200', light: 'bg-rose-50' }
    },
    faq: {
        label: 'FAQ / Domande Frequenti',
        icon: Icons.HelpCircle,
        description: 'Fisarmonica interattiva per rispondere con chiarezza ai dubbi tipici dei clienti.',
        category: 'Store',
        color: { bg: 'bg-sky-500', text: 'text-sky-700', ring: 'ring-sky-200', border: 'border-sky-200', light: 'bg-sky-50' }
    },
    latestProducts: {
        label: 'Ultimi Arrivi / Vetrina',
        icon: Icons.ShoppingBag,
        description: 'Griglia che carica in automatico gli ultimi prodotti freschi disponibili dal catalogo.',
        category: 'Store',
        color: { bg: 'bg-nature-600', text: 'text-nature-700', ring: 'ring-nature-200', border: 'border-nature-200', light: 'bg-nature-50' }
    },
    testimonials: {
        label: 'Recensioni Clienti',
        icon: Icons.MessageSquareQuote,
        description: 'Feedback con valutazione a stelle, foto avatar del cliente e citazione recensione.',
        category: 'Social',
        color: { bg: 'bg-yellow-500', text: 'text-yellow-700', ring: 'ring-yellow-200', border: 'border-yellow-200', light: 'bg-yellow-50' }
    },
    imageGallery: {
        label: 'Galleria Immagini',
        icon: Icons.Images,
        description: 'Raccolta fotografica con disposizione in griglia ordinata o masonry fluido.',
        category: 'Social',
        color: { bg: 'bg-pink-500', text: 'text-pink-700', ring: 'ring-pink-200', border: 'border-pink-200', light: 'bg-pink-50' }
    },
    newsletter: {
        label: 'Iscrizione Newsletter',
        icon: Icons.Mail,
        description: 'Modulo per stimolare l\'iscrizione alla newsletter offrendo vantaggi dedicati.',
        category: 'Marketing',
        color: { bg: 'bg-blue-500', text: 'text-blue-700', ring: 'ring-blue-200', border: 'border-blue-200', light: 'bg-blue-50' }
    },
    stats: {
        label: 'Statistiche & Numeri',
        icon: Icons.BarChart3,
        description: 'Indicatori di fiducia e risultati importanti (es. 100% Locale, +500 Clienti).',
        category: 'Social',
        color: { bg: 'bg-teal-500', text: 'text-teal-700', ring: 'ring-teal-200', border: 'border-teal-200', light: 'bg-teal-50' }
    },
    video: {
        label: 'Video Embed',
        icon: Icons.Video,
        description: 'Player video fluido per mostrare i campi coltivati o la preparazione degli ordini.',
        category: 'Social',
        color: { bg: 'bg-red-500', text: 'text-red-700', ring: 'ring-red-200', border: 'border-red-200', light: 'bg-red-50' }
    },
    categories: {
        label: 'Griglia Categorie',
        icon: Icons.LayoutGrid,
        description: 'Card visive con foto e link per guidare i visitatori tra i reparti del negozio.',
        category: 'Store',
        color: { bg: 'bg-orange-500', text: 'text-orange-700', ring: 'ring-orange-200', border: 'border-orange-200', light: 'bg-orange-50' }
    },
    storeInfo: {
        label: 'Info Sede & Orari',
        icon: Icons.Store,
        description: 'Box riepilogativo con indirizzo della bottega, orari, telefono fisso e WhatsApp.',
        category: 'Store',
        color: { bg: 'bg-cyan-600', text: 'text-cyan-700', ring: 'ring-cyan-200', border: 'border-cyan-200', light: 'bg-cyan-50' }
    },
    richText: {
        label: 'Testo Libero / HTML',
        icon: Icons.FileText,
        description: 'Editor completo per articoli lunghi, approfondimenti, regolamenti e policy.',
        category: 'Contenuto',
        color: { bg: 'bg-slate-600', text: 'text-slate-700', ring: 'ring-slate-200', border: 'border-slate-200', light: 'bg-slate-50' }
    }
};

const FormField = ({ label, hint, children, className = "" }: { label: string; hint?: string; children: React.ReactNode; className?: string }) => (
    <div className={`space-y-1.5 ${className}`}>
        <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">{label}</label>
            {hint && <span className="text-[11px] text-gray-400 font-normal">{hint}</span>}
        </div>
        {children}
    </div>
);

const FormInput = ({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        {...props}
        className={`w-full bg-white border border-gray-200 focus:border-nature-500 focus:ring-2 focus:ring-nature-500/15 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-800 placeholder:text-gray-400 transition-all ${className}`}
    />
);

const FormTextarea = ({ className = "", ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea
        {...props}
        className={`w-full bg-white border border-gray-200 focus:border-nature-500 focus:ring-2 focus:ring-nature-500/15 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-800 placeholder:text-gray-400 transition-all resize-y ${className}`}
    />
);

const ImageUploadBox = ({
    imageUrl,
    onUpload,
    onRemove,
    label = "Immagine",
    hint = "Consigliato JPG o PNG",
    aspectRatio = "aspect-video"
}: {
    imageUrl?: string;
    onUpload: (file: File) => void;
    onRemove?: () => void;
    label?: string;
    hint?: string;
    aspectRatio?: string;
}) => {
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">{label}</label>
                <span className="text-[11px] text-gray-400">{hint}</span>
            </div>
            {imageUrl ? (
                <div className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50 shadow-2xs">
                    <img src={sanitizeImageUrl(imageUrl)} alt="Preview" className={`w-full ${aspectRatio} object-cover`} />
                    <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity p-2">
                        <label className="cursor-pointer bg-white/95 hover:bg-white text-gray-800 font-semibold text-xs px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors">
                            <Icons.Upload size={14} />
                            <span>Sostituisci</span>
                            <input type="file" accept="image/*" className="hidden" onChange={e => {
                                if (e.target.files?.[0]) onUpload(e.target.files[0]);
                            }} />
                        </label>
                        {onRemove && (
                            <button
                                type="button"
                                onClick={onRemove}
                                className="bg-red-500 hover:bg-red-600 text-white font-semibold text-xs px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                                <Trash2 size={14} />
                                <span>Rimuovi</span>
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <label className="border-2 border-dashed border-gray-200 hover:border-nature-400 bg-gray-50/70 hover:bg-nature-50/40 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group">
                    <div className="w-10 h-10 rounded-xl bg-white shadow-2xs border border-gray-100 text-gray-400 group-hover:text-nature-600 flex items-center justify-center transition-colors">
                        <Icons.UploadCloud size={20} />
                    </div>
                    <div className="text-center">
                        <p className="text-xs font-semibold text-gray-700 group-hover:text-nature-700">Clicca per caricare un'immagine</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">PNG, JPG, WebP fino a 10MB</p>
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                        if (e.target.files?.[0]) onUpload(e.target.files[0]);
                    }} />
                </label>
            )}
        </div>
    );
};

const StarRatingInput = ({ value, onChange }: { value: number; onChange: (rating: number) => void }) => {
    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    onClick={() => onChange(star)}
                    className="p-1 rounded hover:scale-110 transition-transform focus:outline-hidden cursor-pointer"
                >
                    <Icons.Star
                        size={18}
                        className={star <= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                    />
                </button>
            ))}
            <span className="text-xs font-bold text-gray-600 ml-1.5">{value} / 5</span>
        </div>
    );
};

const SectionStylingControls = ({
    paddingY,
    bgColor,
    onPaddingChange,
    onBgChange
}: {
    paddingY?: string;
    bgColor?: string;
    onPaddingChange: (val: string) => void;
    onBgChange: (val: string) => void;
}) => {
    const paddings = [
        { value: 'compact', label: 'Compatta', icon: Icons.Minimize2 },
        { value: 'normal', label: 'Normale', icon: Icons.Maximize2 },
        { value: 'large', label: 'Ampia', icon: Icons.Expand }
    ];

    const bgColors = [
        { value: 'default', label: 'Auto', colorClass: 'bg-white border-dashed border-gray-300' },
        { value: 'white', label: 'Bianco', colorClass: 'bg-white border-gray-200' },
        { value: 'gray', label: 'Grigio', colorClass: 'bg-emerald-50/60 border-emerald-100' },
        { value: 'theme', label: 'Tema', colorClass: 'bg-nature-600 border-nature-600' },
        { value: 'dark', label: 'Scuro', colorClass: 'bg-nature-950 border-nature-950' }
    ];

    return (
        <div className="mt-6 pt-5 border-t border-gray-200/80 bg-white/70 -mx-4 -mb-4 p-4 rounded-b-2xl">
            <div className="flex items-center gap-2 mb-3">
                <Icons.SlidersHorizontal size={14} className="text-nature-600" />
                <h6 className="text-xs font-bold uppercase tracking-wider text-gray-700">Spaziature & Stile Sezione</h6>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                        Spaziatura Verticale
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {paddings.map(opt => {
                            const Icon = opt.icon;
                            const isSelected = (paddingY || 'normal') === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => onPaddingChange(opt.value)}
                                    className={`flex items-center justify-center gap-1.5 text-xs py-2 px-2.5 rounded-xl border font-semibold transition-all cursor-pointer ${
                                        isSelected
                                            ? 'bg-nature-600 border-nature-600 text-white shadow-2xs'
                                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                                    }`}
                                >
                                    <Icon size={12} className={isSelected ? 'text-white' : 'text-gray-400'} />
                                    <span>{opt.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                        Colore Sfondo
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                        {bgColors.map(opt => {
                            const isSelected = (bgColor || 'default') === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => onBgChange(opt.value)}
                                    className={`flex flex-col items-center gap-1 p-1.5 rounded-xl border transition-all cursor-pointer ${
                                        isSelected
                                            ? 'border-nature-600 ring-2 ring-nature-500/20 bg-nature-50/50'
                                            : 'border-gray-200 hover:border-gray-300 bg-white'
                                    }`}
                                    title={opt.label}
                                >
                                    <span className={`w-5 h-5 rounded-full border shadow-2xs ${opt.colorClass}`} />
                                    <span className={`text-[10px] font-medium truncate max-w-full ${isSelected ? 'text-nature-800 font-bold' : 'text-gray-500'}`}>
                                        {opt.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

const PageLinkSelector = ({
    value,
    onChange,
    pages,
    placeholder = "Seleziona Pagina Destinazione"
}: {
    value: string;
    onChange: (val: string) => void;
    pages: Page[];
    placeholder?: string;
}) => {
    const linkOptions = [
        { value: '/', label: '🏠 Home Page (/)' },
        { value: '/shop', label: '🍎 Catalogo Ortofrutta (/shop)' },
        { value: '/mercati', label: '📍 I Nostri Mercati (/mercati)' },
        { value: '/cart', label: '🛒 Carrello Spesa (/cart)' },
        { value: '/orders', label: '📦 I Miei Ordini (/orders)' },
        { value: '/profile', label: '👤 Il Mio Profilo (/profile)' },
        ...pages.map(p => ({
            value: `/pages/${p.slug}`,
            label: `📄 ${p.title} (/pages/${p.slug})`
        }))
    ];

    if (value && !linkOptions.some(o => o.value === value)) {
        linkOptions.unshift({ value, label: `🔗 URL: ${value}` });
    }

    return (
        <SearchableSelect
            options={linkOptions}
            value={value || ''}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full text-sm"
        />
    );
};

export const PageManager = () => {
    const { token } = useAuthStore();
    const [pages, setPages] = useState<Page[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Form State
    const [currentId, setCurrentId] = useState<number | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
    const [formData, setFormData] = useState({
        slug: '',
        title: '',
        isPublished: false
    });
    const [blocks, setBlocks] = useState<Block[]>([]);

    // Editor UI State
    const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
    const [addingAtIndex, setAddingAtIndex] = useState<number | null>(null);
    const [editorViewMode, setEditorViewMode] = useState<'editor' | 'preview'>('editor');

    const [error, setError] = useState('');

    // Markets Manager State
    const [isMarketsModalOpen, setIsMarketsModalOpen] = useState(false);
    const [markets, setMarkets] = useState<any[]>([]);
    const [isEditingMarket, setIsEditingMarket] = useState(false);
    const [selectedMarketId, setSelectedMarketId] = useState<number | null>(null);
    const [marketFormData, setMarketFormData] = useState({
        dayNum: 1,
        dayName: 'Lunedì',
        location: '',
        province: '',
        details: '',
        hours: '08:00 - 13:00',
        description: '',
        googleMapsUrl: '',
        imageUrl: ''
    });
    const [isSavingMarket, setIsSavingMarket] = useState(false);

    const fetchMarkets = async () => {
        try {
            const res = await fetch(`${API_URL}/api/markets`);
            if (res.ok) {
                const data = await res.json();
                setMarkets(data);
            }
        } catch (error) {
            console.error('Error fetching markets:', error);
        }
    };

    useEffect(() => {
        fetchPages();
        fetchMarkets();
    }, [token]);

    const fetchPages = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/pages`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPages(data);
            }
        } catch (error) {
            console.error('Error fetching pages:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetMarketForm = () => {
        setIsEditingMarket(false);
        setSelectedMarketId(null);
        setMarketFormData({
            dayNum: 1,
            dayName: 'Lunedì',
            location: '',
            province: 'LC',
            details: '',
            hours: '08:00 - 13:00',
            description: '',
            googleMapsUrl: '',
            imageUrl: ''
        });
    };

    const handleOpenMarketEdit = (market: any) => {
        setIsEditingMarket(true);
        setSelectedMarketId(market.id);
        setMarketFormData({
            dayNum: market.dayNum,
            dayName: market.dayName,
            location: market.location,
            province: market.province,
            details: market.details,
            hours: market.hours,
            description: market.description || '',
            googleMapsUrl: market.googleMapsUrl || '',
            imageUrl: market.imageUrl || ''
        });
    };

    const handleSaveMarket = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingMarket(true);
        const url = isEditingMarket
            ? `${API_URL}/api/admin/markets/${selectedMarketId}`
            : `${API_URL}/api/admin/markets`;
        const method = isEditingMarket ? 'PUT' : 'POST';

        const dayNames = ['', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
        const payload = {
            ...marketFormData,
            dayName: dayNames[marketFormData.dayNum] || 'Lunedì'
        };

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                fetchMarkets();
                handleResetMarketForm();
            } else {
                alert('Errore durante il salvataggio del mercato');
            }
        } catch (error) {
            console.error('Error saving market:', error);
        } finally {
            setIsSavingMarket(false);
        }
    };

    const handleDeleteMarket = async (id: number) => {
        if (!window.confirm('Sei sicuro di voler eliminare questo mercato?')) return;
        try {
            const res = await fetch(`${API_URL}/api/admin/markets/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchMarkets();
                if (selectedMarketId === id) {
                    handleResetMarketForm();
                }
            } else {
                alert('Errore durante l\'eliminazione del mercato');
            }
        } catch (error) {
            console.error('Error deleting market:', error);
        }
    };

    const handleMarketImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await fetch(`${API_URL}/api/admin/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                setMarketFormData(prev => ({
                    ...prev,
                    imageUrl: `${API_URL}${data.url}`
                }));
            } else {
                alert('Errore nel caricamento della foto del mercato');
            }
        } catch (error) {
            console.error('Upload market image error:', error);
        }
    };

    const handleOpenModal = (page?: Page) => {
        setError('');
        if (page) {
            setIsEditing(true);
            setCurrentId(page.id);
            setFormData({
                slug: page.slug,
                title: page.title,
                isPublished: page.isPublished
            });

            // Parse content to blocks
            try {
                const parsed = JSON.parse(page.content);
                if (Array.isArray(parsed)) {
                    setBlocks(parsed);
                } else {
                    // Fallback for old simple string content
                    setBlocks([{ id: Date.now().toString(), type: 'richText', data: { content: page.content } }]);
                }
            } catch {
                setBlocks([{ id: Date.now().toString(), type: 'richText', data: { content: page.content } }]);
            }
        } else {
            setIsEditing(false);
            setCurrentId(null);
            setFormData({ slug: '', title: '', isPublished: false });
            setBlocks([]);
        }
        setExpandedBlockId(null);
        setAddingAtIndex(null);
        setEditorViewMode('editor');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleDelete = async (id: number, force = false) => {
        if (!force) {
            setConfirmModal({
                isOpen: true,
                title: 'Elimina Pagina',
                message: 'Sei sicuro di voler eliminare questa pagina? Questa azione non può essere annullata.',
                onConfirm: () => handleDelete(id, true)
            });
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/admin/pages/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchPages();
            } else {
                alert('Errore durante l\'eliminazione');
            }
        } catch (error) {
            console.error('Error deleting page:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const url = isEditing
            ? `${API_URL}/api/admin/pages/${currentId}`
            : `${API_URL}/api/admin/pages`;

        const method = isEditing ? 'PUT' : 'POST';

        const payload = {
            ...formData,
            content: JSON.stringify(blocks) // Save blocks as JSON string
        };

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                fetchPages();
                handleCloseModal();
            } else {
                const data = await res.json();
                setError(data.error || 'Errore durante il salvataggio');
            }
        } catch (error) {
            console.error('Error saving page:', error);
            setError('Errore di connessione');
        }
    };

    const addBlock = (type: BlockType, insertIndex: number) => {
        const newBlock: Block = { id: Date.now().toString(), type, data: {} };
        if (type === 'hero') newBlock.data = { title: 'Titolo Hero', subtitle: 'Sottotitolo', ctaText: '', ctaLink: '', backgroundImage: '' };
        if (type === 'bannerPromo') newBlock.data = { badge: 'PROMO DEL MESE', title: 'Sconto 10% sul primo ordine', text: 'Inserisci il codice BENVENUTO al checkout', ctaText: 'Vai al Catalogo', ctaLink: '/shop', couponCode: 'BENVENUTO' };
        if (type === 'features') newBlock.data = { title: 'I Nostri Vantaggi', features: [] };
        if (type === 'richText') newBlock.data = { content: '' };
        if (type === 'imageText') newBlock.data = { title: 'Titolo Sezione', content: 'Testo...', imageUrl: '', imagePosition: 'left' };
        if (type === 'cta') newBlock.data = { title: 'Call to Action', text: 'Scopri di più', ctaText: 'Clicca Qui', ctaLink: '/', backgroundColor: 'fruit' };
        if (type === 'faq') newBlock.data = { title: 'Domande Frequenti', faqs: [] };
        if (type === 'latestProducts') newBlock.data = { title: 'Ultimi Arrivi', count: 4 };
        if (type === 'testimonials') newBlock.data = { title: 'Dicono di noi', testimonials: [] };
        if (type === 'imageGallery') newBlock.data = { title: 'Galleria', images: [], layout: 'grid' };
        if (type === 'newsletter') newBlock.data = { title: 'Iscriviti alla Newsletter', subtitle: 'Ricevi offerte esclusive e ricette di stagione' };
        if (type === 'stats') newBlock.data = { title: 'I Nostri Numeri', stats: [] };
        if (type === 'video') newBlock.data = { title: 'Guarda il Nostro Video', videoUrl: '' };
        if (type === 'categories') newBlock.data = { title: 'Le Nostre Categorie', categories: [] };
        if (type === 'storeInfo') newBlock.data = { title: 'La Nostra Sede', address: 'Via Papa Giovanni XXIII, Sirone (LC)', phone: '+39 0341 850123', whatsapp: '+393401234567', hours: 'Lun - Sab: 07:30 - 19:30' };

        const newBlocks = [...blocks];
        newBlocks.splice(insertIndex, 0, newBlock);
        setBlocks(newBlocks);
        setAddingAtIndex(null);
        setExpandedBlockId(newBlock.id);
    };

    const handleImageUpload = async (file: File, blockId: string, field: string = 'backgroundImage', featureIndex?: number, blockType?: string) => {
        const formData = new FormData();
        formData.append('image', file);
        try {
            const res = await fetch(`${API_URL}/api/admin/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            if (res.ok) {
                const data = await res.json();
                const imageUrl = `${API_URL}${data.url}`;

                if (featureIndex !== undefined) {
                    setBlocks(prev => prev.map(b => {
                        if (b.id === blockId) {
                            if (b.type === 'features' && (!blockType || blockType === 'features')) {
                                const newFeatures = [...b.data.features];
                                newFeatures[featureIndex].iconUrl = imageUrl;
                                newFeatures[featureIndex].iconType = 'image';
                                return { ...b, data: { ...b.data, features: newFeatures } };
                            } else if (b.type === 'categories' && blockType === 'categories') {
                                const newCategories = [...b.data.categories];
                                newCategories[featureIndex].imageUrl = imageUrl;
                                return { ...b, data: { ...b.data, categories: newCategories } };
                            }
                        }
                        return b;
                    }));
                } else {
                    updateBlockData(blockId, { [field]: imageUrl });
                }
            } else {
                alert('Errore caricamento immagine');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Errore di rete durante upload');
        }
    };

    const removeBlock = (id: string) => {
        setBlocks(blocks.filter(b => b.id !== id));
    };

    const duplicateBlock = (id: string) => {
        const index = blocks.findIndex(b => b.id === id);
        if (index === -1) return;
        const original = blocks[index];
        const duplicated: Block = {
            id: Date.now().toString(),
            type: original.type,
            data: JSON.parse(JSON.stringify(original.data))
        };
        const newBlocks = [...blocks];
        newBlocks.splice(index + 1, 0, duplicated);
        setBlocks(newBlocks);
        setExpandedBlockId(duplicated.id);
    };

    const moveBlock = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= blocks.length) return;
        const newBlocks = [...blocks];
        const [moved] = newBlocks.splice(index, 1);
        newBlocks.splice(targetIndex, 0, moved);
        setBlocks(newBlocks);
    };




    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return;
        const sourceIndex = result.source.index;
        const destinationIndex = result.destination.index;

        if (sourceIndex === destinationIndex) return;

        const newBlocks = Array.from(blocks);
        const [removed] = newBlocks.splice(sourceIndex, 1);
        newBlocks.splice(destinationIndex, 0, removed);
        
        setBlocks(newBlocks);
    };

    const updateBlockData = (id: string, partialData: any) => {
        setBlocks(blocks.map(b => b.id === id ? { ...b, data: { ...b.data, ...partialData } } : b));
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-nature-900">Pagine Statiche CMS</h2>
                    <p className="text-gray-500 text-sm">Costruisci e gestisci pagine tramite blocchi modulari.</p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                    <button
                        onClick={() => setIsMarketsModalOpen(true)}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-250 px-5 py-2.5 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
                    >
                        <Icons.MapPin size={20} />
                        <span>📍 Mercati Itineranti</span>
                    </button>
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-nature-600 hover:bg-nature-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <Plus size={20} />
                        <span>Nuova Pagina</span>
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nature-600"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pages.map((page) => (
                        <div key={page.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${page.isPublished ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                        <LayoutTemplate size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 truncate max-w-[150px]">{page.title}</h3>
                                        <p className="text-xs text-gray-400">/{page.slug}</p>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => handleOpenModal(page)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                                        <Edit size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(page.id)} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <p className="text-sm text-gray-500 mb-4 flex-1">
                                Aggiornata di recente
                            </p>

                            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                                <span className={`text-xs font-semibold flex items-center gap-1 px-2 py-1 rounded-md ${page.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {page.isPublished ? <><Globe size={12} /> Pubblicata</> : <><EyeOff size={12} /> Bozza</>}
                                </span>
                                <span className="text-xs text-gray-400">
                                    {new Date(page.updatedAt).toLocaleDateString('it-IT')}
                                </span>
                            </div>
                        </div>
                    ))}

                    {pages.length === 0 && (
                        <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-dashed border-gray-200">
                            <LayoutTemplate size={48} className="mx-auto text-gray-300 mb-4" />
                            <h3 className="text-lg font-bold text-gray-700 mb-1">Nessuna Pagina</h3>
                            <p className="text-gray-500">Non hai ancora creato nessuna pagina.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Modern Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-0 md:p-4">
                    <div className="bg-white w-full h-full md:h-auto md:max-h-[95vh] md:max-w-5xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 md:p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gray-50/50">
                            <div className="flex items-center gap-3">
                                <h3 className="text-xl font-bold text-gray-900">
                                    {isEditing ? 'Modifica Pagina' : 'Nuova Pagina'}
                                </h3>
                                {formData.title && (
                                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                        {formData.title}
                                    </span>
                                )}
                            </div>

                            {/* View Switcher Tabs (Edit Mode vs Smartphone Live Preview) */}
                            <div className="flex items-center gap-2">
                                <div className="flex items-center bg-gray-200/70 p-1 rounded-xl border border-gray-300/60">
                                    <button
                                        type="button"
                                        onClick={() => setEditorViewMode('editor')}
                                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${editorViewMode === 'editor'
                                            ? 'bg-white text-gray-900 shadow-2xs'
                                            : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                    >
                                        <Edit size={14} />
                                        <span>Editor Blocchi</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditorViewMode('preview')}
                                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${editorViewMode === 'preview'
                                            ? 'bg-emerald-600 text-white shadow-2xs'
                                            : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                    >
                                        <Icons.Smartphone size={14} />
                                        <span>Anteprima Smartphone</span>
                                    </button>
                                </div>
                                <button onClick={handleCloseModal} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 bg-gray-50/30">
                            {editorViewMode === 'preview' ? (
                                /* LIVE SMARTPHONE FRAME MOCKUP */
                                <div className="py-6 flex flex-col items-center justify-center bg-gray-100/70 rounded-3xl border border-gray-200/80 min-h-[600px]">
                                    <div className="text-center mb-4 space-y-1">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold uppercase tracking-wider">
                                            <Icons.Smartphone size={14} /> Anteprima Mobile in Tempo Reale
                                        </span>
                                        <p className="text-xs text-gray-500 font-medium">Così la pagina apparirà sullo smartphone dei tuoi clienti</p>
                                    </div>

                                    {/* Smartphone Frame */}
                                    <div className="w-[360px] sm:w-[380px] h-[670px] rounded-[48px] border-[12px] border-gray-900 bg-white shadow-2xl overflow-y-auto custom-scrollbar relative flex flex-col ring-1 ring-black/10">
                                        {/* Notch Speaker */}
                                        <div className="sticky top-0 z-50 bg-gray-900 h-6 w-full flex items-center justify-center rounded-b-2xl shrink-0">
                                            <div className="w-16 h-3 bg-black rounded-full"></div>
                                        </div>

                                        {/* Page Content inside Mobile Browser Viewport */}
                                        <div className="flex-1 bg-white">
                                            {blocks.length > 0 ? (
                                                <BlockRenderer content={JSON.stringify(blocks)} />
                                            ) : (
                                                <div className="text-center py-20 px-6 text-gray-400">
                                                    <Icons.Layout size={40} className="mx-auto mb-2 opacity-50" />
                                                    <p className="text-sm font-bold">Nessun blocco inserito.</p>
                                                    <p className="text-xs">Torna all'editor per aggiungere blocchi alla pagina.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <form id="page-form" onSubmit={handleSubmit} className="space-y-8">
                                    {error && (
                                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
                                            {error}
                                        </div>
                                    )}

                                    {/* Meta Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-700">Titolo Pagina <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.title}
                                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500 transition-colors"
                                                placeholder="Es. Chi Siamo"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-700">Slug (URL) <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.slug}
                                                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500 transition-colors bg-gray-50"
                                                placeholder="Es. chi-siamo"
                                            />
                                            <p className="text-xs text-gray-400 mt-1">L'indirizzo sarà: /pages/{formData.slug}</p>
                                        </div>
                                    </div>

                                    {/* Builder Area */}
                                    <div className="space-y-4">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-1 pb-1 border-b border-gray-100">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-xl bg-nature-100 text-nature-700 flex items-center justify-center shadow-2xs">
                                                    <LayoutTemplate size={18} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900 text-base leading-tight">
                                                        Struttura & Blocchi della Pagina
                                                    </h4>
                                                    <p className="text-xs text-gray-500 font-medium">
                                                        Trascina, riordina e personalizza i contenuti della pagina.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 border border-gray-200">
                                                    {blocks.length} {blocks.length === 1 ? 'sezione' : 'sezioni'}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setAddingAtIndex(blocks.length)}
                                                    className="bg-nature-600 hover:bg-nature-700 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                                                >
                                                    <Plus size={15} />
                                                    <span>Aggiungi Sezione</span>
                                                </button>
                                            </div>
                                        </div>

                                    {blocks.length === 0 ? (
                                        <div className="space-y-4">
                                            <div className="border-2 border-dashed border-gray-200 hover:border-nature-300 rounded-3xl p-10 text-center bg-white shadow-2xs transition-colors">
                                                <div className="w-14 h-14 rounded-2xl bg-nature-50 text-nature-600 flex items-center justify-center mx-auto mb-3">
                                                    <Icons.Layers size={28} />
                                                </div>
                                                <h5 className="font-bold text-gray-800 text-base mb-1">La pagina è vuota</h5>
                                                <p className="text-gray-500 text-xs max-w-sm mx-auto mb-5">Inizia aggiungendo la tua prima sezione modulare: puoi scegliere tra Hero copertina, Vantaggi, Catalogo, Recensioni e molto altro.</p>
                                                {addingAtIndex !== 0 && (
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setAddingAtIndex(0)} 
                                                        className="bg-nature-600 hover:bg-nature-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-colors inline-flex items-center gap-2 shadow-xs cursor-pointer"
                                                    >
                                                        <Plus size={16} /> Aggiungi la Prima Sezione
                                                    </button>
                                                )}
                                            </div>
                                            {addingAtIndex === 0 && (
                                                <BlockInserter index={0} onCancel={() => setAddingAtIndex(null)} onAdd={addBlock} />
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <DragDropContext onDragEnd={handleDragEnd}>
                                                <Droppable droppableId="blocks-list">
                                                    {(provided) => (
                                                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3 relative pb-6">
                                                            {blocks.map((block, index) => {
                                                                const isExpanded = expandedBlockId === block.id;
                                                                const def = BLOCK_DEFINITIONS[block.type] || BLOCK_DEFINITIONS.richText;
                                                                const Icon = def.icon;
                                                                
                                                                return (
                                                                    <div key={block.id}>
                                                                        {addingAtIndex === index && (
                                                                            <BlockInserter index={index} onCancel={() => setAddingAtIndex(null)} onAdd={addBlock} />
                                                                        )}
                                                                        
                                                                        <Draggable draggableId={block.id} index={index}>
                                                                            {(provided, snapshot) => (
                                                                                <div 
                                                                                    ref={provided.innerRef} 
                                                                                    {...provided.draggableProps} 
                                                                                    className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-2xs ${
                                                                                        isExpanded 
                                                                                            ? 'border-nature-500 ring-2 ring-nature-500/15 shadow-md' 
                                                                                            : 'border-gray-200 hover:border-gray-300'
                                                                                    } ${snapshot.isDragging ? 'z-50 ring-4 ring-nature-400 opacity-95 shadow-xl scale-[1.01]' : ''}`}
                                                                                >
                                                                                    {/* Block Accordion Header */}
                                                                                    <div 
                                                                                        className={`flex items-center justify-between px-3.5 py-3 cursor-pointer select-none transition-colors ${
                                                                                            isExpanded ? 'bg-gradient-to-r from-gray-50/90 to-nature-50/40 border-b border-gray-100' : 'bg-white hover:bg-gray-50/80'
                                                                                        }`}
                                                                                        onClick={() => setExpandedBlockId(isExpanded ? null : block.id)}
                                                                                    >
                                                                                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                                                                            <div 
                                                                                                {...provided.dragHandleProps} 
                                                                                                className="text-gray-300 hover:text-gray-600 p-1 cursor-grab active:cursor-grabbing rounded-lg hover:bg-gray-100 transition-colors shrink-0"
                                                                                                title="Trascina per riordinare"
                                                                                            >
                                                                                                <Icons.GripVertical size={18} />
                                                                                            </div>

                                                                                            <span className="text-[11px] font-black text-gray-400 font-mono w-5 shrink-0 text-center">
                                                                                                #{index + 1}
                                                                                            </span>

                                                                                            <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${def.color.light} ${def.color.text} border ${def.color.border}`}>
                                                                                                <Icon size={18} />
                                                                                            </span>

                                                                                            <div className="min-w-0">
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <h5 className="font-bold text-gray-900 text-sm tracking-tight truncate">
                                                                                                        {block.data.title || block.data.badge || def.label}
                                                                                                    </h5>
                                                                                                    <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md border shrink-0 ${def.color.light} ${def.color.text} ${def.color.border}`}>
                                                                                                        {def.category}
                                                                                                    </span>
                                                                                                </div>
                                                                                                <p className="text-xs text-gray-400 font-medium truncate">
                                                                                                    {def.label}
                                                                                                </p>
                                                                                            </div>
                                                                                        </div>
                                                                                        
                                                                                        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                                                                                            {/* Move Up */}
                                                                                            <button
                                                                                                type="button"
                                                                                                disabled={index === 0}
                                                                                                onClick={() => moveBlock(index, 'up')}
                                                                                                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors cursor-pointer"
                                                                                                title="Sposta Su"
                                                                                            >
                                                                                                <Icons.ChevronUp size={16} />
                                                                                            </button>

                                                                                            {/* Move Down */}
                                                                                            <button
                                                                                                type="button"
                                                                                                disabled={index === blocks.length - 1}
                                                                                                onClick={() => moveBlock(index, 'down')}
                                                                                                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors cursor-pointer"
                                                                                                title="Sposta Giù"
                                                                                            >
                                                                                                <Icons.ChevronDown size={16} />
                                                                                            </button>

                                                                                            {/* Duplicate */}
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => duplicateBlock(block.id)}
                                                                                                className="p-1.5 text-gray-400 hover:text-nature-700 hover:bg-nature-50 rounded-lg transition-colors cursor-pointer"
                                                                                                title="Duplica questa sezione"
                                                                                            >
                                                                                                <Icons.Copy size={16} />
                                                                                            </button>

                                                                                            {/* Delete */}
                                                                                            <button 
                                                                                                type="button" 
                                                                                                onClick={() => removeBlock(block.id)} 
                                                                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                                                                                title="Elimina sezione"
                                                                                            >
                                                                                                <Trash2 size={16} />
                                                                                            </button>

                                                                                            {/* Toggle Chevron */}
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => setExpandedBlockId(isExpanded ? null : block.id)}
                                                                                                className={`p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all cursor-pointer ${isExpanded ? 'rotate-180 text-nature-700' : ''}`}
                                                                                                title={isExpanded ? 'Comprimi' : 'Espandi'}
                                                                                            >
                                                                                                <Icons.ChevronDown size={17} />
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* Block Body (Editor) */}
                                                                                    {isExpanded && (
                                                                                        <div className="p-5 bg-gray-50/70 border-t border-gray-100 animate-in slide-in-from-top-1 duration-200">
                                                        {block.type === 'hero' && (
                                                            <div className="space-y-4">
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    <FormField label="Badge Superiore" hint="Es. Freschezza Quotidiana">
                                                                        <FormInput
                                                                            value={block.data.badgeText || ''}
                                                                            onChange={e => updateBlockData(block.id, { badgeText: e.target.value })}
                                                                            placeholder="Es. Raccolto Locale a Km 0"
                                                                        />
                                                                    </FormField>
                                                                    <FormField label="Titolo Principale" hint="Titolo ad alto impatto">
                                                                        <FormInput
                                                                            value={block.data.title || ''}
                                                                            onChange={e => updateBlockData(block.id, { title: e.target.value })}
                                                                            placeholder="Es. Il Gusto Autentico della Nostra Terra"
                                                                            className="font-bold text-gray-900"
                                                                        />
                                                                    </FormField>
                                                                    <FormField label="Sottotitolo / Descrizione" hint="Opzionale" className="md:col-span-2">
                                                                        <FormTextarea
                                                                            rows={2}
                                                                            value={block.data.subtitle || ''}
                                                                            onChange={e => updateBlockData(block.id, { subtitle: e.target.value })}
                                                                            placeholder="Breve presentazione o payoff del tuo store di ortofrutta..."
                                                                        />
                                                                    </FormField>
                                                                    <FormField label="Testo Bottone Principale">
                                                                        <FormInput
                                                                            value={block.data.ctaText || ''}
                                                                            onChange={e => updateBlockData(block.id, { ctaText: e.target.value })}
                                                                            placeholder="Es. Ordina Ora"
                                                                        />
                                                                    </FormField>
                                                                    <FormField label="Destinazione Bottone Principale">
                                                                        <PageLinkSelector
                                                                            value={block.data.ctaLink || ''}
                                                                            onChange={val => updateBlockData(block.id, { ctaLink: val })}
                                                                            pages={pages}
                                                                            placeholder="Seleziona Pagina Bottone Principale"
                                                                        />
                                                                    </FormField>
                                                                    <FormField label="Testo Secondo Bottone" hint="Opzionale">
                                                                        <FormInput
                                                                            value={block.data.secondaryCtaText || ''}
                                                                            onChange={e => updateBlockData(block.id, { secondaryCtaText: e.target.value })}
                                                                            placeholder="Es. I Nostri Mercati"
                                                                        />
                                                                    </FormField>
                                                                    <FormField label="Destinazione Secondo Bottone">
                                                                        <PageLinkSelector
                                                                            value={block.data.secondaryCtaLink || ''}
                                                                            onChange={val => updateBlockData(block.id, { secondaryCtaLink: val })}
                                                                            pages={pages}
                                                                            placeholder="Seleziona Pagina Secondo Bottone"
                                                                        />
                                                                    </FormField>
                                                                </div>
                                                                <ImageUploadBox
                                                                    label="Immagine di Sfondo Copertina"
                                                                    hint="Risoluzione consigliata 1920x1080px"
                                                                    imageUrl={block.data.backgroundImage}
                                                                    onUpload={file => handleImageUpload(file, block.id, 'backgroundImage')}
                                                                    onRemove={() => updateBlockData(block.id, { backgroundImage: '' })}
                                                                    aspectRatio="aspect-21/9"
                                                                />
                                                                <SectionStylingControls
                                                                    paddingY={block.data.paddingY}
                                                                    bgColor={block.data.bgColor}
                                                                    onPaddingChange={val => updateBlockData(block.id, { paddingY: val })}
                                                                    onBgChange={val => updateBlockData(block.id, { bgColor: val })}
                                                                />
                                                            </div>
                                                        )}

                                                        {block.type === 'bannerPromo' && (
                                                            <div className="space-y-4">
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    <FormField label="Badge Promozionale" hint="Es. PROMOZIONE DELLA SETTIMANA">
                                                                        <FormInput
                                                                            value={block.data.badge || ''}
                                                                            onChange={e => updateBlockData(block.id, { badge: e.target.value })}
                                                                            placeholder="Es. SCONTO BENVENUTO"
                                                                        />
                                                                    </FormField>
                                                                    <FormField label="Codice Coupon Sconto" hint="Verrà formattato in maiuscolo">
                                                                        <FormInput
                                                                            value={block.data.couponCode || ''}
                                                                            onChange={e => updateBlockData(block.id, { couponCode: e.target.value.toUpperCase() })}
                                                                            placeholder="Es. FRESCO10"
                                                                            className="font-mono uppercase tracking-wider font-bold"
                                                                        />
                                                                    </FormField>
                                                                    <FormField label="Titolo Offerta" className="md:col-span-2">
                                                                        <FormInput
                                                                            value={block.data.title || ''}
                                                                            onChange={e => updateBlockData(block.id, { title: e.target.value })}
                                                                            placeholder="Es. 10% di sconto su tutta la frutta di stagione"
                                                                            className="font-bold text-gray-900"
                                                                        />
                                                                    </FormField>
                                                                    <FormField label="Dettagli Offerta / Condizioni" className="md:col-span-2">
                                                                        <FormTextarea
                                                                            rows={2}
                                                                            value={block.data.text || ''}
                                                                            onChange={e => updateBlockData(block.id, { text: e.target.value })}
                                                                            placeholder="Valido su un acquisto minimo di €20. Valido solo online per questa settimana..."
                                                                        />
                                                                    </FormField>
                                                                    <FormField label="Testo Bottone">
                                                                        <FormInput
                                                                            value={block.data.ctaText || ''}
                                                                            onChange={e => updateBlockData(block.id, { ctaText: e.target.value })}
                                                                            placeholder="Es. Approfitta Ora"
                                                                        />
                                                                    </FormField>
                                                                    <FormField label="Destinazione Bottone">
                                                                        <PageLinkSelector
                                                                            value={block.data.ctaLink || ''}
                                                                            onChange={val => updateBlockData(block.id, { ctaLink: val })}
                                                                            pages={pages}
                                                                            placeholder="Seleziona Pagina Promozione"
                                                                        />
                                                                    </FormField>
                                                                </div>
                                                                <SectionStylingControls
                                                                    paddingY={block.data.paddingY}
                                                                    bgColor={block.data.bgColor}
                                                                    onPaddingChange={val => updateBlockData(block.id, { paddingY: val })}
                                                                    onBgChange={val => updateBlockData(block.id, { bgColor: val })}
                                                                />
                                                            </div>
                                                        )}

                                                        {block.type === 'features' && (
                                                            <div className="space-y-4">
                                                                <FormField label="Titolo Sezione" hint="Es. I Nostri Vantaggi Esclusivi">
                                                                    <FormInput
                                                                        value={block.data.title || ''}
                                                                        onChange={e => updateBlockData(block.id, { title: e.target.value })}
                                                                        placeholder="Es. Perché Scegliere Ortofrutta Butti"
                                                                        className="font-bold text-gray-900"
                                                                    />
                                                                </FormField>

                                                                <div className="space-y-3 pt-2">
                                                                    <div className="flex items-center justify-between">
                                                                        <label className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">
                                                                            Elementi Vantaggi ({(block.data.features || []).length})
                                                                        </label>
                                                                    </div>

                                                                    <div className="space-y-3">
                                                                        {(block.data.features || []).map((feature: any, fIndex: number) => (
                                                                            <div key={fIndex} className="p-4 bg-white border border-gray-200/90 rounded-2xl shadow-2xs space-y-3 transition-all hover:border-gray-300">
                                                                                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                                                                                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
                                                                                        #{fIndex + 1} Vantaggio
                                                                                    </span>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            const newFeatures = [...block.data.features];
                                                                                            newFeatures.splice(fIndex, 1);
                                                                                            updateBlockData(block.id, { features: newFeatures });
                                                                                        }}
                                                                                        className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                                                                                    >
                                                                                        <Trash2 size={13} />
                                                                                        <span>Rimuovi</span>
                                                                                    </button>
                                                                                </div>

                                                                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                                                                                    <div className="md:col-span-4 space-y-2">
                                                                                        <SearchableSelect
                                                                                            options={[
                                                                                                { value: 'lucide', label: '✨ Icona Vettoriale' },
                                                                                                { value: 'image', label: '🖼️ Immagine Caricata' }
                                                                                            ]}
                                                                                            value={feature.iconType || 'lucide'}
                                                                                            onChange={(value) => {
                                                                                                const newF = [...block.data.features];
                                                                                                newF[fIndex].iconType = value;
                                                                                                updateBlockData(block.id, { features: newF });
                                                                                            }}
                                                                                            placeholder="Tipo Icona"
                                                                                            className="w-full text-xs"
                                                                                        />
                                                                                        {(!feature.iconType || feature.iconType === 'lucide') ? (
                                                                                            <IconSelector
                                                                                                value={feature.icon || 'Star'}
                                                                                                onChange={(newIcon) => {
                                                                                                    const newF = [...block.data.features];
                                                                                                    newF[fIndex].icon = newIcon;
                                                                                                    updateBlockData(block.id, { features: newF });
                                                                                                }}
                                                                                            />
                                                                                        ) : (
                                                                                            <div className="space-y-1.5">
                                                                                                <input
                                                                                                    type="file"
                                                                                                    accept="image/*"
                                                                                                    className="w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
                                                                                                    onChange={(e) => {
                                                                                                        if (e.target.files?.[0]) handleImageUpload(e.target.files[0], block.id, '', fIndex, 'features');
                                                                                                    }}
                                                                                                />
                                                                                                {feature.iconUrl && (
                                                                                                    <div className="flex items-center gap-2 mt-1">
                                                                                                        <img src={sanitizeImageUrl(feature.iconUrl)} alt="Icon" className="w-8 h-8 rounded-lg object-contain bg-gray-50 border border-gray-200 p-0.5" />
                                                                                                        <span className="text-[11px] text-green-600 font-medium truncate">Caricata</span>
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>

                                                                                    <div className="md:col-span-8 space-y-2">
                                                                                        <FormInput
                                                                                            value={feature.title || ''}
                                                                                            onChange={e => {
                                                                                                const newF = [...block.data.features];
                                                                                                newF[fIndex].title = e.target.value;
                                                                                                updateBlockData(block.id, { features: newF });
                                                                                            }}
                                                                                            placeholder="Titolo Vantaggio (es. Raccolta Giornaliera)"
                                                                                            className="font-bold text-sm"
                                                                                        />
                                                                                        <FormInput
                                                                                            value={feature.description || ''}
                                                                                            onChange={e => {
                                                                                                const newF = [...block.data.features];
                                                                                                newF[fIndex].description = e.target.value;
                                                                                                updateBlockData(block.id, { features: newF });
                                                                                            }}
                                                                                            placeholder="Descrizione breve (es. Frutta e verdura colte nelle 24h precedenti)"
                                                                                            className="text-xs text-gray-600"
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const newF = [...(block.data.features || []), { icon: 'Leaf', title: 'Nuovo Vantaggio', description: 'Descrizione del servizio offerto...' }];
                                                                            updateBlockData(block.id, { features: newF });
                                                                        }}
                                                                        className="w-full py-2.5 px-4 border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                                                                    >
                                                                        <Plus size={15} />
                                                                        <span>Aggiungi Altro Vantaggio</span>
                                                                    </button>
                                                                </div>

                                                                <SectionStylingControls
                                                                    paddingY={block.data.paddingY}
                                                                    bgColor={block.data.bgColor}
                                                                    onPaddingChange={val => updateBlockData(block.id, { paddingY: val })}
                                                                    onBgChange={val => updateBlockData(block.id, { bgColor: val })}
                                                                />
                                                            </div>
                                                        )}

                                                        {block.type === 'imageText' && (
                                                            <div className="space-y-4">
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    <div>
                                                                        <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                                                                            Posizionamento Immagine
                                                                        </label>
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                            {[
                                                                                { value: 'left', label: 'Immagine a Sinistra', icon: Icons.AlignLeft },
                                                                                { value: 'right', label: 'Immagine a Destra', icon: Icons.AlignRight }
                                                                            ].map(opt => {
                                                                                const isSelected = (block.data.imagePosition || 'left') === opt.value;
                                                                                const Icon = opt.icon;
                                                                                return (
                                                                                    <button
                                                                                        key={opt.value}
                                                                                        type="button"
                                                                                        onClick={() => updateBlockData(block.id, { imagePosition: opt.value })}
                                                                                        className={`flex items-center justify-center gap-1.5 text-xs py-2 px-3 rounded-xl border font-bold transition-all cursor-pointer ${
                                                                                            isSelected
                                                                                                ? 'bg-purple-600 border-purple-600 text-white shadow-2xs'
                                                                                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                                                                        }`}
                                                                                    >
                                                                                        <Icon size={14} />
                                                                                        <span>{opt.label}</span>
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>

                                                                    <ImageUploadBox
                                                                        label="Immagine di Sezione"
                                                                        imageUrl={block.data.imageUrl}
                                                                        onUpload={file => handleImageUpload(file, block.id, 'imageUrl')}
                                                                        onRemove={() => updateBlockData(block.id, { imageUrl: '' })}
                                                                        aspectRatio="aspect-4/3"
                                                                    />
                                                                </div>

                                                                <div className="space-y-1.5">
                                                                    <label className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">
                                                                        Titolo Formattabile
                                                                    </label>
                                                                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
                                                                        <ReactQuill
                                                                            theme="snow"
                                                                            modules={QUILL_MODULES}
                                                                            formats={QUILL_FORMATS}
                                                                            value={block.data.title || ''}
                                                                            onChange={(content) => updateBlockData(block.id, { title: content })}
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-1.5">
                                                                    <label className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">
                                                                        Testo Descrittivo
                                                                    </label>
                                                                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
                                                                        <ReactQuill
                                                                            theme="snow"
                                                                            modules={QUILL_MODULES}
                                                                            formats={QUILL_FORMATS}
                                                                            value={block.data.content || ''}
                                                                            onChange={(content) => updateBlockData(block.id, { content })}
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <SectionStylingControls
                                                                    paddingY={block.data.paddingY}
                                                                    bgColor={block.data.bgColor}
                                                                    onPaddingChange={val => updateBlockData(block.id, { paddingY: val })}
                                                                    onBgChange={val => updateBlockData(block.id, { bgColor: val })}
                                                                />
                                                            </div>
                                                        )}

                                                        {block.type === 'cta' && (
                                                            <div className="space-y-4">
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    <FormField label="Titolo Chiamata all'Azione">
                                                                        <FormInput
                                                                            value={block.data.title || ''}
                                                                            onChange={e => updateBlockData(block.id, { title: e.target.value })}
                                                                            placeholder="Es. Vuoi Ricevere la Tua Spesa a Casa?"
                                                                            className="font-bold text-gray-900"
                                                                        />
                                                                    </FormField>
                                                                    <FormField label="Sottotitolo / Didascalia">
                                                                        <FormInput
                                                                            value={block.data.text || ''}
                                                                            onChange={e => updateBlockData(block.id, { text: e.target.value })}
                                                                            placeholder="Es. Ordina comodamente online e ritira al mercato o ricevi a domicilio."
                                                                        />
                                                                    </FormField>
                                                                    <FormField label="Testo del Bottone">
                                                                        <FormInput
                                                                            value={block.data.ctaText || ''}
                                                                            onChange={e => updateBlockData(block.id, { ctaText: e.target.value })}
                                                                            placeholder="Es. Esplora il Catalogo"
                                                                        />
                                                                    </FormField>
                                                                    <FormField label="Destinazione Bottone">
                                                                        <PageLinkSelector
                                                                            value={block.data.ctaLink || ''}
                                                                            onChange={val => updateBlockData(block.id, { ctaLink: val })}
                                                                            pages={pages}
                                                                            placeholder="Seleziona Pagina Destinazione"
                                                                        />
                                                                    </FormField>
                                                                </div>

                                                                <div>
                                                                    <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                                                                        Stile & Colore del Banner
                                                                    </label>
                                                                    <div className="grid grid-cols-2 gap-3">
                                                                        {[
                                                                            { value: 'fruit', label: 'Arancione Frutta (Brand)', color: 'bg-fruit-500 text-white' },
                                                                            { value: 'nature', label: 'Verde Natura (Bio)', color: 'bg-nature-600 text-white' }
                                                                        ].map(opt => {
                                                                            const isSelected = (block.data.backgroundColor || 'fruit') === opt.value;
                                                                            return (
                                                                                <button
                                                                                    key={opt.value}
                                                                                    type="button"
                                                                                    onClick={() => updateBlockData(block.id, { backgroundColor: opt.value })}
                                                                                    className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                                                                                        isSelected ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/30' : 'border-gray-200 bg-white hover:border-gray-300'
                                                                                    }`}
                                                                                >
                                                                                    <span className={`w-6 h-6 rounded-lg ${opt.color} flex items-center justify-center text-xs font-bold`}>✓</span>
                                                                                    <span className="text-xs font-bold text-gray-800">{opt.label}</span>
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>

                                                                <SectionStylingControls
                                                                    paddingY={block.data.paddingY}
                                                                    bgColor={block.data.bgColor}
                                                                    onPaddingChange={val => updateBlockData(block.id, { paddingY: val })}
                                                                    onBgChange={val => updateBlockData(block.id, { bgColor: val })}
                                                                />
                                                            </div>
                                                        )}

                                                        {block.type === 'faq' && (
                                                            <div className="space-y-4">
                                                                <FormField label="Titolo Sezione FAQ" hint="Es. Domande Frequenti">
                                                                    <FormInput
                                                                        value={block.data.title || ''}
                                                                        onChange={e => updateBlockData(block.id, { title: e.target.value })}
                                                                        placeholder="Es. Hai Domande? Ecco le Risposte Più Comuni"
                                                                        className="font-bold text-gray-900"
                                                                    />
                                                                </FormField>

                                                                <div className="space-y-3 pt-2">
                                                                    <label className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">
                                                                        Domande & Risposte ({(block.data.faqs || []).length})
                                                                    </label>

                                                                    <div className="space-y-3">
                                                                        {(block.data.faqs || []).map((faq: any, faqIndex: number) => (
                                                                            <div key={faqIndex} className="p-4 bg-white border border-gray-200/90 rounded-2xl shadow-2xs space-y-3 transition-all hover:border-gray-300">
                                                                                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                                                                    <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg">
                                                                                        #{faqIndex + 1} Domanda
                                                                                    </span>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            const newF = [...block.data.faqs];
                                                                                            newF.splice(faqIndex, 1);
                                                                                            updateBlockData(block.id, { faqs: newF });
                                                                                        }}
                                                                                        className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                                                                                    >
                                                                                        <Trash2 size={13} />
                                                                                        <span>Rimuovi</span>
                                                                                    </button>
                                                                                </div>

                                                                                <FormField label="Domanda">
                                                                                    <FormInput
                                                                                        value={faq.question || ''}
                                                                                        onChange={e => {
                                                                                            const newF = [...block.data.faqs];
                                                                                            newF[faqIndex].question = e.target.value;
                                                                                            updateBlockData(block.id, { faqs: newF });
                                                                                        }}
                                                                                        placeholder="Es. Come funziona la consegna a domicilio?"
                                                                                        className="font-semibold text-sm"
                                                                                    />
                                                                                </FormField>

                                                                                <FormField label="Risposta">
                                                                                    <FormTextarea
                                                                                        rows={2}
                                                                                        value={faq.answer || ''}
                                                                                        onChange={e => {
                                                                                            const newF = [...block.data.faqs];
                                                                                            newF[faqIndex].answer = e.target.value;
                                                                                            updateBlockData(block.id, { faqs: newF });
                                                                                        }}
                                                                                        placeholder="Spiega in dettaglio la risposta..."
                                                                                        className="text-xs text-gray-600"
                                                                                    />
                                                                                </FormField>
                                                                            </div>
                                                                        ))}
                                                                    </div>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const newF = [...(block.data.faqs || []), { question: 'Nuova Domanda Frequente?', answer: 'Inserisci qui la spiegazione dettagliata...' }];
                                                                            updateBlockData(block.id, { faqs: newF });
                                                                        }}
                                                                        className="w-full py-2.5 px-4 border-2 border-dashed border-sky-200 hover:border-sky-400 bg-sky-50/50 hover:bg-sky-50 text-sky-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                                                                    >
                                                                        <Plus size={15} />
                                                                        <span>Aggiungi Altra FAQ</span>
                                                                    </button>
                                                                </div>

                                                                <SectionStylingControls
                                                                    paddingY={block.data.paddingY}
                                                                    bgColor={block.data.bgColor}
                                                                    onPaddingChange={val => updateBlockData(block.id, { paddingY: val })}
                                                                    onBgChange={val => updateBlockData(block.id, { bgColor: val })}
                                                                />
                                                            </div>
                                                        )}

                                                        {block.type === 'latestProducts' && (
                                                            <div className="space-y-4">
                                                                <FormField label="Titolo Sezione Catalogo" hint="Es. I Nostri Ultimi Arrivi">
                                                                    <FormInput
                                                                        value={block.data.title || ''}
                                                                        onChange={e => updateBlockData(block.id, { title: e.target.value })}
                                                                        placeholder="Es. Freschi di Raccolta: I Nuovi Arrivi"
                                                                        className="font-bold text-gray-900"
                                                                    />
                                                                </FormField>

                                                                <div>
                                                                    <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                                                                        Numero di Prodotti da Mostrare
                                                                    </label>
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        {[2, 4, 6, 8, 12].map(num => (
                                                                            <button
                                                                                key={num}
                                                                                type="button"
                                                                                onClick={() => updateBlockData(block.id, { count: num })}
                                                                                className={`w-12 h-10 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                                                                                    (block.data.count || 4) === num
                                                                                        ? 'bg-nature-600 border-nature-600 text-white shadow-2xs'
                                                                                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                                                                }`}
                                                                            >
                                                                                {num}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                <div className="p-3.5 bg-nature-50 border border-nature-200 rounded-xl flex items-center gap-3 text-nature-800 text-xs">
                                                                    <Icons.Sparkles size={18} className="shrink-0 text-nature-600" />
                                                                    <p>
                                                                        Questa vetrina si aggiorna in tempo reale mostrando automaticamente i prodotti più recenti e disponibili del tuo catalogo.
                                                                    </p>
                                                                </div>

                                                                <SectionStylingControls
                                                                    paddingY={block.data.paddingY}
                                                                    bgColor={block.data.bgColor}
                                                                    onPaddingChange={val => updateBlockData(block.id, { paddingY: val })}
                                                                    onBgChange={val => updateBlockData(block.id, { bgColor: val })}
                                                                />
                                                            </div>
                                                        )}

                                                        {block.type === 'testimonials' && (
                                                            <div className="space-y-4">
                                                                <FormField label="Titolo Sezione Recensioni" hint="Es. Cosa Dicono i Nostri Clienti">
                                                                    <FormInput
                                                                        value={block.data.title || ''}
                                                                        onChange={e => updateBlockData(block.id, { title: e.target.value })}
                                                                        placeholder="Es. Parole Genuine da Chi Ci Sceglie Ogni Giorno"
                                                                        className="font-bold text-gray-900"
                                                                    />
                                                                </FormField>

                                                                <div className="space-y-3 pt-2">
                                                                    <label className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">
                                                                        Recensioni Clienti ({(block.data.testimonials || []).length})
                                                                    </label>

                                                                    <div className="space-y-3">
                                                                        {(block.data.testimonials || []).map((t: any, tIndex: number) => (
                                                                            <div key={tIndex} className="p-4 bg-white border border-gray-200/90 rounded-2xl shadow-2xs space-y-3 transition-all hover:border-gray-300">
                                                                                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                                                                    <span className="text-xs font-bold text-yellow-700 bg-yellow-50 px-2.5 py-1 rounded-lg">
                                                                                        #{tIndex + 1} Recensione
                                                                                    </span>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            const newT = [...block.data.testimonials];
                                                                                            newT.splice(tIndex, 1);
                                                                                            updateBlockData(block.id, { testimonials: newT });
                                                                                        }}
                                                                                        className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                                                                                    >
                                                                                        <Trash2 size={13} />
                                                                                        <span>Rimuovi</span>
                                                                                    </button>
                                                                                </div>

                                                                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                                                                                    <div className="md:col-span-3 flex items-center gap-3">
                                                                                        <div className="w-14 h-14 rounded-full bg-gray-100 border border-gray-200 overflow-hidden relative group/avatar shrink-0 flex items-center justify-center">
                                                                                            {t.avatarUrl ? (
                                                                                                <img src={sanitizeImageUrl(t.avatarUrl)} alt="Avatar" className="w-full h-full object-cover" />
                                                                                            ) : (
                                                                                                <Icons.User size={22} className="text-gray-400" />
                                                                                            )}
                                                                                            <label className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 cursor-pointer transition-opacity">
                                                                                                <Icons.Upload size={14} />
                                                                                                <input
                                                                                                    type="file"
                                                                                                    accept="image/*"
                                                                                                    className="hidden"
                                                                                                    onChange={(e) => {
                                                                                                        if (e.target.files?.[0]) handleImageUpload(e.target.files[0], block.id, '', tIndex, 'testimonials');
                                                                                                    }}
                                                                                                />
                                                                                            </label>
                                                                                        </div>
                                                                                        <span className="text-[11px] text-gray-500 font-medium">Foto Profilo</span>
                                                                                    </div>

                                                                                    <div className="md:col-span-5">
                                                                                        <FormField label="Nome e Cognome Cliente">
                                                                                            <FormInput
                                                                                                value={t.name || ''}
                                                                                                onChange={e => {
                                                                                                    const newT = [...block.data.testimonials];
                                                                                                    newT[tIndex].name = e.target.value;
                                                                                                    updateBlockData(block.id, { testimonials: newT });
                                                                                                }}
                                                                                                placeholder="Es. Mario Rossi (Lecco)"
                                                                                                className="font-bold text-sm"
                                                                                            />
                                                                                        </FormField>
                                                                                    </div>

                                                                                    <div className="md:col-span-4">
                                                                                        <FormField label="Valutazione">
                                                                                            <StarRatingInput
                                                                                                value={t.rating || 5}
                                                                                                onChange={rating => {
                                                                                                    const newT = [...block.data.testimonials];
                                                                                                    newT[tIndex].rating = rating;
                                                                                                    updateBlockData(block.id, { testimonials: newT });
                                                                                                }}
                                                                                            />
                                                                                        </FormField>
                                                                                    </div>
                                                                                </div>

                                                                                <FormField label="Testo della Recensione">
                                                                                    <FormTextarea
                                                                                        rows={2}
                                                                                        value={t.content || ''}
                                                                                        onChange={e => {
                                                                                            const newT = [...block.data.testimonials];
                                                                                            newT[tIndex].content = e.target.value;
                                                                                            updateBlockData(block.id, { testimonials: newT });
                                                                                        }}
                                                                                        placeholder="Cosa dice il cliente sulla freschezza, sul servizio e sulla cortesia..."
                                                                                        className="text-xs"
                                                                                    />
                                                                                </FormField>
                                                                            </div>
                                                                        ))}
                                                                    </div>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const newT = [...(block.data.testimonials || []), { name: 'Cliente Soddisfatto', rating: 5, content: 'Prodotti freschissimi e di stagione, personale sempre gentile e disponibile!' }];
                                                                            updateBlockData(block.id, { testimonials: newT });
                                                                        }}
                                                                        className="w-full py-2.5 px-4 border-2 border-dashed border-yellow-200 hover:border-yellow-400 bg-yellow-50/50 hover:bg-yellow-50 text-yellow-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                                                                    >
                                                                        <Plus size={15} />
                                                                        <span>Aggiungi Altra Recensione</span>
                                                                    </button>
                                                                </div>

                                                                <SectionStylingControls
                                                                    paddingY={block.data.paddingY}
                                                                    bgColor={block.data.bgColor}
                                                                    onPaddingChange={val => updateBlockData(block.id, { paddingY: val })}
                                                                    onBgChange={val => updateBlockData(block.id, { bgColor: val })}
                                                                />
                                                            </div>
                                                        )}

                                                        {block.type === 'imageGallery' && (
                                                            <div className="space-y-4">
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    <FormField label="Titolo Galleria Fotografica">
                                                                        <FormInput
                                                                            value={block.data.title || ''}
                                                                            onChange={e => updateBlockData(block.id, { title: e.target.value })}
                                                                            placeholder="Es. I Nostri Banchi e Campi di Raccolta"
                                                                            className="font-bold text-gray-900"
                                                                        />
                                                                    </FormField>

                                                                    <div>
                                                                        <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                                                                            Disposizione Galleria
                                                                        </label>
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                            {[
                                                                                { value: 'grid', label: 'Griglia Ordinata', icon: Icons.Grid },
                                                                                { value: 'masonry', label: 'Muro (Masonry)', icon: Icons.Columns }
                                                                            ].map(opt => {
                                                                                const isSelected = (block.data.layout || 'grid') === opt.value;
                                                                                const Icon = opt.icon;
                                                                                return (
                                                                                    <button
                                                                                        key={opt.value}
                                                                                        type="button"
                                                                                        onClick={() => updateBlockData(block.id, { layout: opt.value })}
                                                                                        className={`flex items-center justify-center gap-1.5 text-xs py-2 px-3 rounded-xl border font-bold transition-all cursor-pointer ${
                                                                                            isSelected
                                                                                                ? 'bg-pink-600 border-pink-600 text-white shadow-2xs'
                                                                                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                                                                        }`}
                                                                                    >
                                                                                        <Icon size={14} />
                                                                                        <span>{opt.label}</span>
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="p-5 border-2 border-dashed border-pink-200 rounded-2xl bg-pink-50/40 flex flex-col items-center justify-center gap-2 hover:bg-pink-50/70 transition-colors">
                                                                    <label className="cursor-pointer text-pink-700 font-bold flex flex-col items-center gap-2">
                                                                        <div className="w-12 h-12 bg-white shadow-2xs rounded-full flex items-center justify-center text-pink-600">
                                                                            <Icons.UploadCloud size={24} />
                                                                        </div>
                                                                        <span className="text-sm">Carica una o più immagini per la galleria</span>
                                                                        <span className="text-xs font-normal text-pink-500">Seleziona più foto contemporaneamente</span>
                                                                        <input
                                                                            type="file"
                                                                            accept="image/*"
                                                                            multiple
                                                                            className="hidden"
                                                                            onChange={async (e) => {
                                                                                if (e.target.files) {
                                                                                    for (let i = 0; i < e.target.files.length; i++) {
                                                                                        const file = e.target.files[i];
                                                                                        const formData = new FormData();
                                                                                        formData.append('image', file);
                                                                                        try {
                                                                                            const res = await fetch(`${API_URL}/api/admin/upload`, {
                                                                                                method: 'POST',
                                                                                                headers: { 'Authorization': `Bearer ${token}` },
                                                                                                body: formData
                                                                                            });
                                                                                            if (res.ok) {
                                                                                                const data = await res.json();
                                                                                                const imageUrl = `${API_URL}${data.url}`;
                                                                                                setBlocks(prev => prev.map(b => {
                                                                                                    if (b.id === block.id) {
                                                                                                        return { ...b, data: { ...b.data, images: [...(b.data.images || []), { url: imageUrl, alt: '' }] } };
                                                                                                    }
                                                                                                    return b;
                                                                                                }));
                                                                                            }
                                                                                        } catch (err) { console.error(err); }
                                                                                    }
                                                                                }
                                                                            }}
                                                                        />
                                                                    </label>
                                                                </div>

                                                                {block.data.images && block.data.images.length > 0 && (
                                                                    <div>
                                                                        <label className="block text-[11px] font-bold text-gray-500 mb-2 uppercase tracking-wider">
                                                                            Foto Inserite ({block.data.images.length})
                                                                        </label>
                                                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                                                            {block.data.images.map((img: any, imgIdx: number) => (
                                                                                <div key={imgIdx} className="relative aspect-square rounded-xl overflow-hidden group border border-gray-200 bg-gray-50 shadow-2xs">
                                                                                    <img src={sanitizeImageUrl(img.url)} alt="" className="w-full h-full object-cover" />
                                                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => {
                                                                                                const newImg = [...block.data.images];
                                                                                                newImg.splice(imgIdx, 1);
                                                                                                updateBlockData(block.id, { images: newImg });
                                                                                            }}
                                                                                            className="p-2 bg-red-500 hover:bg-red-600 rounded-full text-white shadow-sm transition-transform hover:scale-110 cursor-pointer"
                                                                                            title="Elimina foto"
                                                                                        >
                                                                                            <Trash2 size={14} />
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                <SectionStylingControls
                                                                    paddingY={block.data.paddingY}
                                                                    bgColor={block.data.bgColor}
                                                                    onPaddingChange={val => updateBlockData(block.id, { paddingY: val })}
                                                                    onBgChange={val => updateBlockData(block.id, { bgColor: val })}
                                                                />
                                                            </div>
                                                        )}

                                                        {block.type === 'richText' && (
                                                            <div className="space-y-4">
                                                                <FormField label="Titolo Blocco (Opzionale)">
                                                                    <FormInput
                                                                        value={block.data.title || ''}
                                                                        onChange={e => updateBlockData(block.id, { title: e.target.value })}
                                                                        placeholder="Es. La Nostra Storia e Tradizione di Famiglia"
                                                                        className="font-bold text-gray-900"
                                                                    />
                                                                </FormField>

                                                                <div className="space-y-1.5">
                                                                    <label className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">
                                                                        Contenuto Formattato (WYSIWYG)
                                                                    </label>
                                                                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
                                                                        <ReactQuill
                                                                            theme="snow"
                                                                            modules={QUILL_MODULES}
                                                                            formats={QUILL_FORMATS}
                                                                            value={block.data.content || ''}
                                                                            onChange={(content) => updateBlockData(block.id, { content })}
                                                                            className="min-h-[180px]"
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <SectionStylingControls
                                                                    paddingY={block.data.paddingY}
                                                                    bgColor={block.data.bgColor}
                                                                    onPaddingChange={val => updateBlockData(block.id, { paddingY: val })}
                                                                    onBgChange={val => updateBlockData(block.id, { bgColor: val })}
                                                                />
                                                            </div>
                                                        )}

                                                        {block.type === 'newsletter' && (
                                                            <div className="space-y-4">
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    <FormField label="Titolo Invito Newsletter">
                                                                        <FormInput
                                                                            value={block.data.title || ''}
                                                                            onChange={e => updateBlockData(block.id, { title: e.target.value })}
                                                                            placeholder="Es. Iscriviti per Ricevere le Nostre Offerte"
                                                                            className="font-bold text-gray-900"
                                                                        />
                                                                    </FormField>
                                                                    <FormField label="Testo Bottone di Iscrizione">
                                                                        <FormInput
                                                                            value={block.data.buttonText || ''}
                                                                            onChange={e => updateBlockData(block.id, { buttonText: e.target.value })}
                                                                            placeholder="Es. Iscriviti Subito"
                                                                        />
                                                                    </FormField>
                                                                    <FormField label="Sottotitolo / Vantaggio Iscrizione" className="md:col-span-2">
                                                                        <FormTextarea
                                                                            rows={2}
                                                                            value={block.data.subtitle || ''}
                                                                            onChange={e => updateBlockData(block.id, { subtitle: e.target.value })}
                                                                            placeholder="Es. Riceverai uno sconto del 10% sul tuo primo acquisto e aggiornamenti sui raccolti di stagione."
                                                                        />
                                                                    </FormField>
                                                                </div>

                                                                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3 text-blue-800 text-xs">
                                                                    <Icons.Mail size={18} className="shrink-0 text-blue-600" />
                                                                    <p>
                                                                        Il form include la validazione email automatica e la conformità al consenso privacy per raccogliere contatti genuini.
                                                                    </p>
                                                                </div>

                                                                <SectionStylingControls
                                                                    paddingY={block.data.paddingY}
                                                                    bgColor={block.data.bgColor}
                                                                    onPaddingChange={val => updateBlockData(block.id, { paddingY: val })}
                                                                    onBgChange={val => updateBlockData(block.id, { bgColor: val })}
                                                                />
                                                            </div>
                                                        )}

                                                        {block.type === 'stats' && (
                                                            <div className="space-y-4">
                                                                <FormField label="Titolo Sezione Statistiche" hint="Es. I Nostri Numeri">
                                                                    <FormInput
                                                                        value={block.data.title || ''}
                                                                        onChange={e => updateBlockData(block.id, { title: e.target.value })}
                                                                        placeholder="Es. La Nostra Passione in Numeri Concreti"
                                                                        className="font-bold text-gray-900"
                                                                    />
                                                                </FormField>

                                                                <div className="space-y-3 pt-2">
                                                                    <label className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">
                                                                        Metriche & Dati ({(block.data.stats || []).length})
                                                                    </label>

                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                        {(block.data.stats || []).map((stat: any, sIdx: number) => (
                                                                            <div key={sIdx} className="p-4 bg-white border border-gray-200/90 rounded-2xl shadow-2xs space-y-3 transition-all hover:border-gray-300">
                                                                                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                                                                    <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg">
                                                                                        #{sIdx + 1} Dato
                                                                                    </span>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            const newS = [...block.data.stats];
                                                                                            newS.splice(sIdx, 1);
                                                                                            updateBlockData(block.id, { stats: newS });
                                                                                        }}
                                                                                        className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                                                                                    >
                                                                                        <Trash2 size={13} />
                                                                                        <span>Rimuovi</span>
                                                                                    </button>
                                                                                </div>

                                                                                <FormField label="Valore / Numero" hint="Es. 100%, 500+, 24h">
                                                                                    <FormInput
                                                                                        value={stat.value || ''}
                                                                                        onChange={e => {
                                                                                            const newS = [...block.data.stats];
                                                                                            newS[sIdx].value = e.target.value;
                                                                                            updateBlockData(block.id, { stats: newS });
                                                                                        }}
                                                                                        placeholder="Es. 100%"
                                                                                        className="font-black text-lg text-teal-700"
                                                                                    />
                                                                                </FormField>

                                                                                <FormField label="Etichetta / Didascalia">
                                                                                    <FormInput
                                                                                        value={stat.label || ''}
                                                                                        onChange={e => {
                                                                                            const newS = [...block.data.stats];
                                                                                            newS[sIdx].label = e.target.value;
                                                                                            updateBlockData(block.id, { stats: newS });
                                                                                        }}
                                                                                        placeholder="Es. Freschezza e Filiera Corta Garantita"
                                                                                        className="text-sm font-medium"
                                                                                    />
                                                                                </FormField>
                                                                            </div>
                                                                        ))}
                                                                    </div>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const newS = [...(block.data.stats || []), { value: '100%', label: 'Nuova Metrica o Traguardo' }];
                                                                            updateBlockData(block.id, { stats: newS });
                                                                        }}
                                                                        className="w-full py-2.5 px-4 border-2 border-dashed border-teal-200 hover:border-teal-400 bg-teal-50/50 hover:bg-teal-50 text-teal-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                                                                    >
                                                                        <Plus size={15} />
                                                                        <span>Aggiungi Altra Statistica</span>
                                                                    </button>
                                                                </div>

                                                                <SectionStylingControls
                                                                    paddingY={block.data.paddingY}
                                                                    bgColor={block.data.bgColor}
                                                                    onPaddingChange={val => updateBlockData(block.id, { paddingY: val })}
                                                                    onBgChange={val => updateBlockData(block.id, { bgColor: val })}
                                                                />
                                                            </div>
                                                        )}

                                                        {block.type === 'video' && (
                                                            <div className="space-y-4">
                                                                <FormField label="Titolo Sezione Video (Opzionale)">
                                                                    <FormInput
                                                                        value={block.data.title || ''}
                                                                        onChange={e => updateBlockData(block.id, { title: e.target.value })}
                                                                        placeholder="Es. Scopri Come Selezioniamo la Nostra Frutta"
                                                                        className="font-bold text-gray-900"
                                                                    />
                                                                </FormField>

                                                                <FormField label="Link Video YouTube o Vimeo" hint="Incolla l'URL completo del video">
                                                                    <FormInput
                                                                        type="url"
                                                                        value={block.data.videoUrl || ''}
                                                                        onChange={e => updateBlockData(block.id, { videoUrl: e.target.value })}
                                                                        placeholder="Es. https://www.youtube.com/watch?v=..."
                                                                        className="font-mono text-sm"
                                                                    />
                                                                </FormField>

                                                                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800 text-xs">
                                                                    <Icons.Video size={18} className="shrink-0 text-red-600" />
                                                                    <p>
                                                                        Il player video verrà renderizzato a tutto schermo e responsive 16:9 con supporto ai controlli nativi e streaming veloce.
                                                                    </p>
                                                                </div>

                                                                <SectionStylingControls
                                                                    paddingY={block.data.paddingY}
                                                                    bgColor={block.data.bgColor}
                                                                    onPaddingChange={val => updateBlockData(block.id, { paddingY: val })}
                                                                    onBgChange={val => updateBlockData(block.id, { bgColor: val })}
                                                                />
                                                            </div>
                                                        )}

                                                        {block.type === 'categories' && (
                                                            <div className="space-y-4">
                                                                <FormField label="Titolo Sezione Categorie" hint="Es. Esplora per Reparto">
                                                                    <FormInput
                                                                        value={block.data.title || ''}
                                                                        onChange={e => updateBlockData(block.id, { title: e.target.value })}
                                                                        placeholder="Es. Cosa Vuoi Mettere nel Carrello Oggi?"
                                                                        className="font-bold text-gray-900"
                                                                    />
                                                                </FormField>

                                                                <div className="space-y-3 pt-2">
                                                                    <label className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">
                                                                        Box Categorie ({(block.data.categories || []).length})
                                                                    </label>

                                                                    <div className="space-y-3">
                                                                        {(block.data.categories || []).map((cat: any, cIdx: number) => (
                                                                            <div key={cIdx} className="p-4 bg-white border border-gray-200/90 rounded-2xl shadow-2xs space-y-3 transition-all hover:border-gray-300">
                                                                                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                                                                    <span className="text-xs font-bold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-lg">
                                                                                        #{cIdx + 1} Categoria
                                                                                    </span>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            const newC = [...block.data.categories];
                                                                                            newC.splice(cIdx, 1);
                                                                                            updateBlockData(block.id, { categories: newC });
                                                                                        }}
                                                                                        className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                                                                                    >
                                                                                        <Trash2 size={13} />
                                                                                        <span>Rimuovi</span>
                                                                                    </button>
                                                                                </div>

                                                                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                                                                                    <div className="md:col-span-4">
                                                                                        <ImageUploadBox
                                                                                            label="Foto Categoria"
                                                                                            imageUrl={cat.imageUrl}
                                                                                            onUpload={file => handleImageUpload(file, block.id, '', cIdx, 'categories')}
                                                                                            onRemove={() => {
                                                                                                const newC = [...block.data.categories];
                                                                                                newC[cIdx].imageUrl = '';
                                                                                                updateBlockData(block.id, { categories: newC });
                                                                                            }}
                                                                                            aspectRatio="aspect-16/10"
                                                                                        />
                                                                                    </div>

                                                                                    <div className="md:col-span-8 space-y-3">
                                                                                        <FormField label="Nome Categoria">
                                                                                            <FormInput
                                                                                                value={cat.title || ''}
                                                                                                onChange={e => {
                                                                                                    const newC = [...block.data.categories];
                                                                                                    newC[cIdx].title = e.target.value;
                                                                                                    updateBlockData(block.id, { categories: newC });
                                                                                                }}
                                                                                                placeholder="Es. Frutta Fresca di Stagione"
                                                                                                className="font-bold text-sm"
                                                                                            />
                                                                                        </FormField>

                                                                                        <FormField label="Pagina o Reparto di Destinazione">
                                                                                            <PageLinkSelector
                                                                                                value={cat.link || ''}
                                                                                                onChange={val => {
                                                                                                    const newC = [...block.data.categories];
                                                                                                    newC[cIdx].link = val;
                                                                                                    updateBlockData(block.id, { categories: newC });
                                                                                                }}
                                                                                                pages={pages}
                                                                                                placeholder="Seleziona Pagina Destinazione"
                                                                                            />
                                                                                        </FormField>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const newC = [...(block.data.categories || []), { title: 'Nuovo Reparto', link: '/shop' }];
                                                                            updateBlockData(block.id, { categories: newC });
                                                                        }}
                                                                        className="w-full py-2.5 px-4 border-2 border-dashed border-orange-200 hover:border-orange-400 bg-orange-50/50 hover:bg-orange-50 text-orange-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                                                                    >
                                                                        <Plus size={15} />
                                                                        <span>Aggiungi Altra Categoria</span>
                                                                    </button>
                                                                </div>

                                                                <SectionStylingControls
                                                                    paddingY={block.data.paddingY}
                                                                    bgColor={block.data.bgColor}
                                                                    onPaddingChange={val => updateBlockData(block.id, { paddingY: val })}
                                                                    onBgChange={val => updateBlockData(block.id, { bgColor: val })}
                                                                />
                                                            </div>
                                                        )}

                                                        {block.type === 'storeInfo' && (
                                                            <div className="space-y-4">
                                                                <FormField label="Titolo Sezione Sede">
                                                                    <FormInput
                                                                        value={block.data.title || ''}
                                                                        onChange={e => updateBlockData(block.id, { title: e.target.value })}
                                                                        placeholder="Es. Vieni a Trovarci in Bottega o al Banco"
                                                                        className="font-bold text-gray-900"
                                                                    />
                                                                </FormField>

                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    <FormField label="Indirizzo Completo">
                                                                        <FormInput
                                                                            value={block.data.address || ''}
                                                                            onChange={e => updateBlockData(block.id, { address: e.target.value })}
                                                                            placeholder="Es. Via Papa Giovanni XXIII, 12, Sirone (LC)"
                                                                        />
                                                                    </FormField>
                                                                    <FormField label="Orari di Apertura">
                                                                        <FormInput
                                                                            value={block.data.hours || ''}
                                                                            onChange={e => updateBlockData(block.id, { hours: e.target.value })}
                                                                            placeholder="Es. Lun - Sab: 07:30 - 19:30"
                                                                        />
                                                                    </FormField>
                                                                    <FormField label="Telefono Fisso">
                                                                        <FormInput
                                                                            value={block.data.phone || ''}
                                                                            onChange={e => updateBlockData(block.id, { phone: e.target.value })}
                                                                            placeholder="Es. +39 0341 850123"
                                                                        />
                                                                    </FormField>
                                                                    <FormField label="Recapito WhatsApp">
                                                                        <FormInput
                                                                            value={block.data.whatsapp || ''}
                                                                            onChange={e => updateBlockData(block.id, { whatsapp: e.target.value })}
                                                                            placeholder="Es. +39 340 1234567"
                                                                        />
                                                                    </FormField>
                                                                    <FormField label="Link Google Maps" hint="Link per avviare il navigatore" className="md:col-span-2">
                                                                        <FormInput
                                                                            type="url"
                                                                            value={block.data.googleMapsUrl || ''}
                                                                            onChange={e => updateBlockData(block.id, { googleMapsUrl: e.target.value })}
                                                                            placeholder="Es. https://maps.google.com/?q=..."
                                                                        />
                                                                    </FormField>
                                                                </div>

                                                                <SectionStylingControls
                                                                    paddingY={block.data.paddingY}
                                                                    bgColor={block.data.bgColor}
                                                                    onPaddingChange={val => updateBlockData(block.id, { paddingY: val })}
                                                                    onBgChange={val => updateBlockData(block.id, { bgColor: val })}
                                                                />
                                                            </div>
                                                        )}
                                                                                    </div>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </Draggable>
                                                                    </div>
                                                                );
                                                            })}
                                                            
                                                            {/* Add block to the very end */}
                                                            {blocks.length > 0 && addingAtIndex !== blocks.length && (
                                                               <div className="py-3 text-center">
                                                                   <button 
                                                                        type="button" 
                                                                        onClick={() => setAddingAtIndex(blocks.length)} 
                                                                        className="bg-white border-2 border-dashed border-nature-300 text-nature-700 hover:bg-nature-50/70 hover:border-nature-500 px-6 py-2.5 rounded-2xl font-bold text-xs transition-all inline-flex items-center gap-2 shadow-2xs cursor-pointer"
                                                                    >
                                                                        <Plus size={16} /> Aggiungi Sezione Qui in Coda
                                                                    </button>
                                                               </div>
                                                            )}
                                                            {addingAtIndex === blocks.length && (
                                                                <BlockInserter index={blocks.length} onCancel={() => setAddingAtIndex(null)} onAdd={addBlock} />
                                                            )}
                                                        </div>
                                                    )}
                                                </Droppable>
                                            </DragDropContext>
                                        </div>
                                    )}
                                </div>

                                <label className="flex items-center gap-3 p-4 bg-white hover:bg-gray-50 rounded-2xl border border-gray-100 cursor-pointer transition-colors group shadow-2xs">
                                    <div className="relative flex items-center justify-center">
                                        <input
                                            type="checkbox"
                                            checked={formData.isPublished}
                                            onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                                            className="peer sr-only"
                                        />
                                        <div className={`w-6 h-6 rounded flex items-center justify-center transition-colors border-2 ${formData.isPublished ? 'bg-nature-500 border-nature-500' : 'bg-white border-gray-300 group-hover:border-nature-400'}`}>
                                            {formData.isPublished && <Check size={16} className="text-white" />}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-800 text-sm">Pubblica online</p>
                                        <p className="text-xs text-gray-500">Se disattivato, la pagina sarà salvata come bozza invisibile al pubblico.</p>
                                    </div>
                                </label>
                            </form>
                        )}
                    </div>

                    <div className="p-5 md:p-6 border-t border-gray-100 flex flex-col md:flex-row justify-end gap-3 bg-white">
                        <button
                            type="button"
                            onClick={handleCloseModal}
                            className="order-2 md:order-1 px-6 py-3 text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-xl font-bold md:font-medium transition-colors cursor-pointer"
                        >
                            Annulla
                        </button>
                        <button
                            type="submit"
                            form="page-form"
                            className="order-1 md:order-2 px-6 py-3 bg-nature-600 hover:bg-nature-700 text-white rounded-xl font-bold md:font-medium transition-colors shadow-sm cursor-pointer"
                        >
                            {isEditing ? 'Salva Modifiche' : 'Crea Pagina'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Markets Manager Modal */}
            {isMarketsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-emerald-50">
                            <div>
                                <h2 className="text-xl font-black text-emerald-950 flex items-center gap-2">
                                    <Icons.MapPin size={22} className="text-emerald-700 animate-bounce" /> Gestione Mercati Itineranti
                                </h2>
                                <p className="text-xs text-emerald-800/80 font-bold">Aggiungi, modifica o rimuovi i comuni serviti itineranti di Ortofrutta Butti.</p>
                            </div>
                            <button
                                onClick={() => { setIsMarketsModalOpen(false); handleResetMarketForm(); }}
                                className="w-10 h-10 rounded-full bg-white/50 text-emerald-950 flex items-center justify-center hover:bg-white hover:shadow-sm transition-all cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content Area (Split Screen) */}
                        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2">
                            {/* Left Panel: Current Markets List */}
                            <div className="p-6 overflow-y-auto border-r border-gray-100 space-y-4">
                                <h3 className="font-black text-sm text-gray-400 uppercase tracking-wider">Mercati Attivi ({markets.length})</h3>
                                <div className="space-y-2.5">
                                    {markets.map(market => (
                                        <div
                                            key={market.id}
                                            onClick={() => handleOpenMarketEdit(market)}
                                            className={`p-4 rounded-2xl border-2 text-left cursor-pointer transition-all flex items-start justify-between gap-3 relative group overflow-hidden ${
                                                selectedMarketId === market.id
                                                    ? 'border-emerald-600 bg-emerald-50/50 shadow-sm font-black'
                                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                            }`}
                                        >
                                            <div className="flex gap-3">
                                                {market.imageUrl && (
                                                    <div className="w-12 h-12 rounded-xl bg-gray-55 overflow-hidden shrink-0 border border-gray-150 flex items-center justify-center">
                                                        <img src={sanitizeImageUrl(market.imageUrl)} alt={market.location} className="w-full h-full object-cover" />
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-black text-sm text-gray-900 flex items-center gap-1.5">
                                                        <span>{market.location}</span>
                                                        <span className="text-[10px] text-gray-400 font-bold bg-gray-100 px-1.5 py-0.5 rounded">{market.province}</span>
                                                    </div>
                                                    <span className="text-xs text-gray-400 font-bold">{market.dayName} • {market.hours}</span>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteMarket(market.id);
                                                }}
                                                className="p-1.5 text-red-500 opacity-0 group-hover:opacity-100 bg-red-50 hover:bg-red-100 rounded-lg transition-all"
                                                title="Elimina mercato"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right Panel: Edit / Create Form */}
                            <div className="p-6 overflow-y-auto bg-gray-50/50">
                                <form onSubmit={handleSaveMarket} className="space-y-4">
                                    <h3 className="font-black text-sm text-gray-400 uppercase tracking-wider">
                                        {isEditingMarket ? 'Modifica Mercato' : 'Aggiungi Nuovo Mercato'}
                                    </h3>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Giorno della Settimana</label>
                                        <select
                                            className="w-full p-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none text-xs font-bold text-gray-900"
                                            value={marketFormData.dayNum}
                                            onChange={e => setMarketFormData({ ...marketFormData, dayNum: parseInt(e.target.value, 10) })}
                                        >
                                            <option value={1}>Lunedì</option>
                                            <option value={2}>Martedì</option>
                                            <option value={3}>Mercoledì</option>
                                            <option value={4}>Giovedì</option>
                                            <option value={5}>Venerdì</option>
                                            <option value={6}>Sabato</option>
                                            <option value={7}>Domenica</option>
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Comune</label>
                                            <input
                                                required
                                                type="text"
                                                placeholder="es. Magreglio"
                                                className="w-full p-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none text-xs font-bold text-gray-900"
                                                value={marketFormData.location}
                                                onChange={e => setMarketFormData({ ...marketFormData, location: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Provincia</label>
                                            <input
                                                required
                                                type="text"
                                                maxLength={2}
                                                placeholder="es. LC"
                                                className="w-full p-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none text-xs font-bold text-gray-900 uppercase"
                                                value={marketFormData.province}
                                                onChange={e => setMarketFormData({ ...marketFormData, province: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Dettagli / Indirizzo Posizionamento</label>
                                        <input
                                            required
                                            type="text"
                                            placeholder="es. Piazza Roma / Centro"
                                            className="w-full p-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none text-xs font-bold text-gray-900"
                                            value={marketFormData.details}
                                            onChange={e => setMarketFormData({ ...marketFormData, details: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Orari di Esposizione</label>
                                        <input
                                            required
                                            type="text"
                                            placeholder="es. 08:00 - 13:00"
                                            className="w-full p-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none text-xs font-bold text-gray-900"
                                            value={marketFormData.hours}
                                            onChange={e => setMarketFormData({ ...marketFormData, hours: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Google Maps Link</label>
                                        <input
                                            type="url"
                                            placeholder="https://maps.google.com/?q=..."
                                            className="w-full p-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none text-xs font-bold text-gray-900"
                                            value={marketFormData.googleMapsUrl}
                                            onChange={e => setMarketFormData({ ...marketFormData, googleMapsUrl: e.target.value })}
                                        />
                                    </div>

                                    {/* Market Photo Upload Section */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Foto del Mercato</label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleMarketImageUpload}
                                                className="hidden"
                                                id="market-photo-file"
                                            />
                                            <label
                                                htmlFor="market-photo-file"
                                                className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-xs cursor-pointer flex items-center gap-1.5"
                                            >
                                                <Icons.Upload size={14} /> Carica Foto
                                            </label>
                                            {marketFormData.imageUrl && (
                                                <button
                                                    type="button"
                                                    onClick={() => setMarketFormData(prev => ({ ...prev, imageUrl: '' }))}
                                                    className="text-xs text-red-500 hover:underline font-bold"
                                                >
                                                    Rimuovi
                                                </button>
                                            )}
                                        </div>
                                        {marketFormData.imageUrl && (
                                            <div className="mt-2.5 w-full h-32 rounded-2xl overflow-hidden border border-gray-200 bg-white">
                                                <img src={sanitizeImageUrl(marketFormData.imageUrl)} alt="Preview" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Descrizione del Mercato</label>
                                        <textarea
                                            required
                                            rows={3}
                                            placeholder="Descrivi brevemente il mercato, i nostri prodotti tipici esposti, etc..."
                                            className="w-full p-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none text-xs font-bold text-gray-900"
                                            value={marketFormData.description}
                                            onChange={e => setMarketFormData({ ...marketFormData, description: e.target.value })}
                                        />
                                    </div>

                                    <div className="flex gap-2.5 pt-2">
                                        <button
                                            type="submit"
                                            disabled={isSavingMarket}
                                            className="flex-1 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-black rounded-xl text-xs shadow transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                                        >
                                            <Check size={14} />
                                            {isSavingMarket ? 'Salvataggio...' : (isEditingMarket ? 'Salva Modifiche' : 'Aggiungi')}
                                        </button>
                                        {isEditingMarket && (
                                            <button
                                                type="button"
                                                onClick={handleResetMarketForm}
                                                className="py-3 px-4 bg-gray-100 hover:bg-gray-250 text-gray-600 font-bold rounded-xl text-xs transition-all cursor-pointer"
                                            >
                                                Annulla
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>
                        </div>
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

const BlockInserter = ({ index, onCancel, onAdd }: { index: number, onCancel: () => void, onAdd: (type: BlockType, index: number) => void }) => {
    const [selectedCat, setSelectedCat] = useState<'Tutti' | 'Contenuto' | 'Marketing' | 'Social' | 'Store'>('Tutti');

    const categories: Array<'Tutti' | 'Contenuto' | 'Marketing' | 'Social' | 'Store'> = ['Tutti', 'Contenuto', 'Marketing', 'Social', 'Store'];

    const filteredBlocks = Object.entries(BLOCK_DEFINITIONS).filter(([_, def]) => {
        if (selectedCat === 'Tutti') return true;
        return def.category === selectedCat;
    });

    return (
        <div className="my-6 relative border-2 border-dashed border-nature-300 bg-white/95 rounded-3xl p-6 md:p-7 shadow-lg animate-in fade-in zoom-in-95 duration-200">
            <button 
                type="button" 
                onClick={onCancel}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                title="Chiudi"
            >
                <X size={18} />
            </button>

            <div className="text-center max-w-lg mx-auto mb-6">
                <div className="w-10 h-10 rounded-xl bg-nature-100 text-nature-700 flex items-center justify-center mx-auto mb-2 shadow-2xs">
                    <Icons.PlusCircle size={22} />
                </div>
                <h4 className="font-black text-gray-900 text-lg">Aggiungi una Sezione</h4>
                <p className="text-xs text-gray-500 mt-0.5">Scegli tra 15 tipologie di blocchi personalizzabili per costruire la pagina perfetta.</p>
                
                {/* Category Filter Pills */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 mt-4">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedCat(cat)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                selectedCat === cat
                                    ? 'bg-nature-600 text-white shadow-2xs'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[460px] overflow-y-auto custom-scrollbar p-1">
                {filteredBlocks.map(([type, def]) => {
                    const Icon = def.icon;
                    return (
                        <button
                            key={type}
                            type="button"
                            onClick={() => onAdd(type as BlockType, index)}
                            className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs hover:shadow-md hover:border-nature-500 hover:ring-2 hover:ring-nature-500/15 transition-all text-left group flex gap-3.5 cursor-pointer relative overflow-hidden"
                        >
                            <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs ${def.color.light} ${def.color.text} border ${def.color.border}`}>
                                <Icon size={22} />
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                    <h5 className="font-bold text-gray-900 text-sm tracking-tight truncate group-hover:text-nature-700 transition-colors">
                                        {def.label}
                                    </h5>
                                    <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border shrink-0 ${def.color.light} ${def.color.text} ${def.color.border}`}>
                                        {def.category}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                                    {def.description}
                                </p>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
