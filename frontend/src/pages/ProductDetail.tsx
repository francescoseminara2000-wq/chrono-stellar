import { useEffect, useState, useMemo } from 'react';
import { trackProductVisit } from '../hooks/useAnalyticsTracker';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';
import { 
    ArrowLeft, ChefHat, ShoppingBasket, Scale, Plus, Minus, 
    Leaf, Info, Share2, CornerDownRight, ShieldCheck, ChevronDown,
    ChevronLeft, ChevronRight, Maximize2, X, Images
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { WeightSelectorDrawer } from '../components/WeightSelectorDrawer';
import { QuantitySelectorDrawer } from '../components/QuantitySelectorDrawer';
import { ProductCard } from '../components/ProductCard';
import { ProductShareModal } from '../components/ProductShareModal';
import { sanitizeImageUrl } from '../utils/imageUrl';

interface Product {
    id: number;
    name: string;
    description: string;
    priceCents: number;
    unitType: 'KG' | 'PZ' | 'BOX';
    isVariableWeight: boolean;
    stepAmount: number;
    imageUrl?: string;
    images?: string | string[];
    isAvailable: boolean;
    seasonalTips?: string;
    origin?: string;
    caliber?: string;
    commercialCategory?: string;
    category?: { id: number; name: string; color: string };
}

export const ProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState<Product | null>(null);
    const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const { items, addItem, updateQuantity, updateItemUnit } = useCartStore();
    const [selectedProductForWeight, setSelectedProductForWeight] = useState<Product | null>(null);
    const [selectedProductForUnit, setSelectedProductForUnit] = useState<Product | null>(null);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [touchStartX, setTouchStartX] = useState<number | null>(null);

    const cartItem = product ? items.find(i => i.id === product.id) : null;
    const [selectedUnit, setSelectedUnit] = useState<'KG' | 'PZ' | 'BOX'>('KG');

    useEffect(() => {
        if (product) {
            const cItem = items.find(i => i.id === product.id);
            if (cItem) {
                setSelectedUnit(cItem.unitType);
            } else {
                setSelectedUnit(product.unitType);
            }
        }
    }, [items, product]);

    const getProductQuantity = (productId: number) => {
        const item = items.find(i => i.id === productId);
        return item ? item.quantity : 0;
    };

    const galleryImages = useMemo<string[]>(() => {
        if (!product) return [];
        let list: string[] = [];
        if (product.images) {
            if (Array.isArray(product.images)) {
                list = product.images.filter(Boolean);
            } else if (typeof product.images === 'string') {
                try {
                    const parsed = JSON.parse(product.images);
                    if (Array.isArray(parsed)) {
                        list = parsed.filter(Boolean);
                    }
                } catch (e) {
                    if (product.images.trim()) list = [product.images.trim()];
                }
            }
        }
        if (list.length === 0 && product.imageUrl) {
            list = [product.imageUrl];
        } else if (product.imageUrl && !list.includes(product.imageUrl)) {
            list = [product.imageUrl, ...list];
        }
        return list;
    }, [product]);

    useEffect(() => {
        setActiveImageIndex(0);
    }, [product?.id]);

    const handlePrevImage = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (galleryImages.length <= 1) return;
        setActiveImageIndex(prev => (prev === 0 ? galleryImages.length - 1 : prev - 1));
    };

    const handleNextImage = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (galleryImages.length <= 1) return;
        setActiveImageIndex(prev => (prev === galleryImages.length - 1 ? 0 : prev + 1));
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStartX(e.touches[0].clientX);
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX === null || galleryImages.length <= 1) return;
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchStartX - touchEndX;
        if (diff > 45) {
            handleNextImage();
        } else if (diff < -45) {
            handlePrevImage();
        }
        setTouchStartX(null);
    };

    useEffect(() => {
        if (!isLightboxOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsLightboxOpen(false);
            if (e.key === 'ArrowLeft') handlePrevImage();
            if (e.key === 'ArrowRight') handleNextImage();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isLightboxOpen, galleryImages.length]);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setLoading(true);
        fetch(`/api/products`)
            .then(res => res.json())
            .then((data: Product[]) => {
                const found = data.find(p => p.id === Number(id));
                setProduct(found || null);
                if (found) {
                    trackProductVisit(found.id, `/shop/${found.id}`);

                    // Dynamically set page title & Open Graph tags for social sharing
                    const formattedPrice = (found.priceCents / 100).toFixed(2);
                    const unitStr = found.isVariableWeight ? 'kg' : (found.unitType === 'BOX' ? 'conf.' : 'pz');
                    document.title = `${found.name} - €${formattedPrice}/${unitStr} | Ortofrutta Butti`;

                    const updateMeta = (property: string, content: string) => {
                        let tag = document.querySelector(`meta[property="${property}"]`);
                        if (!tag) {
                            tag = document.createElement('meta');
                            tag.setAttribute('property', property);
                            document.head.appendChild(tag);
                        }
                        tag.setAttribute('content', content);
                    };

                    updateMeta('og:title', `${found.name} - €${formattedPrice}/${unitStr} | Ortofrutta Butti`);
                    updateMeta('og:description', found.description || `Scopri ${found.name} fresco di giornata su Ortofrutta Butti Sirone.`);
                    if (found.imageUrl) {
                        updateMeta('og:image', sanitizeImageUrl(found.imageUrl));
                    }
                }

                // Filter related products
                setRelatedProducts(data.filter(p => p.id !== Number(id) && p.isAvailable).slice(0, 4));
                setLoading(false);
            })
            .catch(err => {
                console.error("Error loading product", err);
                setLoading(false);
            });
    }, [id]);

    const handleShare = () => {
        setIsShareModalOpen(true);
    };

    if (loading) return (
        <div className="flex flex-col justify-center items-center h-screen bg-nature-50/50">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                <Leaf className="absolute inset-0 m-auto text-emerald-600 animate-pulse" size={24} />
            </div>
            <p className="mt-4 font-bold text-emerald-900 text-sm tracking-wide">Caricamento prodotto...</p>
        </div>
    );

    if (!product) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-nature-50/50 p-6 text-center">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mb-4 shadow-inner">
                <ShoppingBasket size={36} />
            </div>
            <h2 className="text-3xl font-script text-nature-950 mb-2">Prodotto non trovato</h2>
            <p className="text-gray-500 mb-6 max-w-sm">Il prodotto che stai cercando potrebbe non essere più disponibile o essere stato rimosso.</p>
            <Link to="/shop" className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-2xl shadow-md transition-all hover:scale-105">
                Torna al Raccolto
            </Link>
        </div>
    );

    const currentQty = getProductQuantity(product.id);
    const formattedPrice = (product.priceCents / 100).toFixed(2);
    const estimatedWeightPerPiece = product.stepAmount > 0 ? product.stepAmount : 0.5;

    // Calculate estimated total price for quantity selection
    const estimatedTotalCents = selectedUnit === 'KG'
        ? (currentQty > 0 ? currentQty * product.priceCents : product.priceCents)
        : (currentQty > 0 ? Math.round(currentQty * estimatedWeightPerPiece * product.priceCents) : Math.round(1 * estimatedWeightPerPiece * product.priceCents));

    const formattedEstimatedTotal = (estimatedTotalCents / 100).toFixed(2);

    return (
        <div className="bg-gradient-to-b from-nature-50/70 via-white to-nature-50/40 min-h-screen pb-32">
            
            {/* Sticky Navigation Bar - Flush against main header */}
            <div className="sticky top-[56px] sm:top-[60px] md:top-[64px] z-30 bg-white/95 backdrop-blur-md border-b border-gray-200/80 shadow-xs transition-all">
                <div className="max-w-[1650px] mx-auto px-3 sm:px-6 lg:px-8 py-2 flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-700 hover:text-emerald-700 bg-gray-100 hover:bg-emerald-50 px-3.5 py-1.5 rounded-xl transition-all border border-gray-200/70"
                    >
                        <ArrowLeft size={16} />
                        <span>Torna al Raccolto</span>
                    </button>

                    <div className="hidden md:flex items-center gap-3">
                        <span className="font-bold text-gray-900 text-sm truncate max-w-xs">{product.name}</span>
                        <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
                            €{formattedPrice} / {product.isVariableWeight ? 'kg' : (product.unitType === 'BOX' ? 'conf.' : 'pz')}
                        </span>
                    </div>

                    <button
                        onClick={handleShare}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-emerald-700 bg-gray-100 hover:bg-emerald-50 px-3 py-1.5 rounded-xl transition-all"
                        title="Condividi prodotto"
                    >
                        <Share2 size={15} />
                        <span className="hidden sm:inline">Condividi</span>
                    </button>
                </div>
            </div>

            <div className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 mt-6">

                {/* Main Product Showcase Section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">

                    {/* Left Column: Clean Gourmet Photo Showcase (Cortilia / Eataly Style) */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="lg:col-span-5 xl:col-span-5 lg:sticky lg:top-24 self-start flex justify-center lg:justify-start"
                    >
                        <div className="relative rounded-3xl overflow-hidden bg-white shadow-sm border border-gray-200/80 w-full max-w-[420px] xl:max-w-[450px] group flex flex-col">
                            {/* Main Carousel Frame */}
                            <div 
                                className="relative aspect-square w-full overflow-hidden bg-gradient-to-b from-gray-50/50 to-white select-none"
                                onTouchStart={handleTouchStart}
                                onTouchEnd={handleTouchEnd}
                            >
                                {galleryImages.length > 0 ? (
                                    <div className="relative w-full h-full">
                                        <AnimatePresence mode="wait">
                                            <motion.img
                                                key={galleryImages[activeImageIndex] || activeImageIndex}
                                                src={sanitizeImageUrl(galleryImages[activeImageIndex])}
                                                alt={`${product.name} - Immagine ${activeImageIndex + 1}`}
                                                initial={{ opacity: 0.2, scale: 0.98 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0.2, scale: 1.01 }}
                                                transition={{ duration: 0.2, ease: "easeOut" }}
                                                className="w-full h-full object-cover cursor-zoom-in"
                                                onClick={() => setIsLightboxOpen(true)}
                                            />
                                        </AnimatePresence>

                                        {/* Magnify Hint Button */}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsLightboxOpen(true);
                                            }}
                                            className="absolute bottom-3 right-3 p-2 rounded-full bg-white/85 hover:bg-white text-gray-700 shadow-md backdrop-blur-md transition-all active:scale-95 border border-white/70 z-10"
                                            title="Ingrandisci immagine"
                                        >
                                            <Maximize2 size={15} />
                                        </button>

                                        {/* Previous & Next Carousel Arrows */}
                                        {galleryImages.length > 1 && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={handlePrevImage}
                                                    className="absolute left-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 hover:bg-white text-gray-800 shadow-md backdrop-blur-md flex items-center justify-center transition-all active:scale-90 border border-white/70 z-10 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 hover:opacity-100"
                                                    aria-label="Foto precedente"
                                                >
                                                    <ChevronLeft size={20} className="-ml-0.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleNextImage}
                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 hover:bg-white text-gray-800 shadow-md backdrop-blur-md flex items-center justify-center transition-all active:scale-90 border border-white/70 z-10 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 hover:opacity-100"
                                                    aria-label="Foto successiva"
                                                >
                                                    <ChevronRight size={20} className="-mr-0.5" />
                                                </button>

                                                {/* Counter Badge */}
                                                <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm pointer-events-none z-10">
                                                    <Images size={12} className="text-white/80" />
                                                    <span>{activeImageIndex + 1} / {galleryImages.length}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-nature-200 font-script text-9xl">
                                        <span>{product.name[0]}</span>
                                    </div>
                                )}

                                {/* Subtle Discreet Badges */}
                                <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between pointer-events-none z-10">
                                    <span className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-gray-800 shadow-2xs border border-gray-200/60 flex items-center gap-1.5">
                                        {product.unitType === 'KG' ? (
                                            <>
                                                <Scale size={13} className="text-emerald-700" />
                                                <span>Peso Variabile</span>
                                            </>
                                        ) : (
                                            <>
                                                <ShoppingBasket size={13} className="text-gray-700" />
                                                <span>Vendita a Pezzi</span>
                                            </>
                                        )}
                                    </span>

                                    {product.isAvailable ? (
                                        <span className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-emerald-800 shadow-2xs border border-emerald-200/60 flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                                            <span>Disponibile</span>
                                        </span>
                                    ) : (
                                        <span className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-red-700 shadow-2xs border border-red-200 flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-red-600"></span>
                                            <span>Esaurito</span>
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Multi-image Thumbnail Strip (visible only when multiple images exist) */}
                            {galleryImages.length > 1 && (
                                <div className="px-3 py-2.5 bg-gray-50/90 border-t border-gray-150/70 flex items-center gap-2 overflow-x-auto scrollbar-none">
                                    {galleryImages.map((imgUrl, idx) => {
                                        const isActive = idx === activeImageIndex;
                                        return (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => setActiveImageIndex(idx)}
                                                className={`relative shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${
                                                    isActive
                                                        ? 'border-emerald-600 ring-2 ring-emerald-500/30 scale-105 shadow-sm opacity-100'
                                                        : 'border-transparent hover:border-gray-300 opacity-60 hover:opacity-100'
                                                }`}
                                                aria-label={`Visualizza immagine ${idx + 1}`}
                                            >
                                                <img
                                                    src={sanitizeImageUrl(imgUrl)}
                                                    alt={`Miniatura ${idx + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Minimal Bottom Bar */}
                            <div className="px-4 py-2.5 bg-gray-50/80 border-t border-gray-150/70 flex items-center justify-between text-xs text-gray-500 font-medium">
                                <span className="flex items-center gap-1.5">
                                    <Leaf size={14} className="text-emerald-700" />
                                    <span>Filiera corta garantita</span>
                                </span>
                                <span className="text-emerald-800 font-bold text-xs">
                                    Fresco di giornata
                                </span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right Column: Bottega Gourmet & Minimal Chic */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="lg:col-span-7 flex flex-col"
                    >
                        {/* Category & Title Header */}
                        <div className="mb-4">
                            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-800 block mb-1">
                                {product.category?.name || 'Ortofrutta di Stagione'}
                            </span>
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-950 tracking-tight leading-tight mb-2">
                                {product.name}
                            </h1>
                            <p className="text-sm text-gray-500 font-medium flex items-center gap-2">
                                <span>Origine: <strong className="text-gray-800">{product.origin || 'Italia'}</strong></span>
                                {product.commercialCategory && (
                                    <>
                                        <span>•</span>
                                        <span>Categoria <strong className="text-gray-800">{product.commercialCategory}</strong></span>
                                    </>
                                )}
                            </p>
                        </div>

                        {/* Hero Buy Box (Cortilia/Eataly Style) */}
                        <div className="bg-emerald-50/60 rounded-3xl p-5 sm:p-6 border border-emerald-200/70 shadow-xs mb-6 space-y-4">
                            {/* Price Row */}
                            <div className="flex items-baseline justify-between pb-3.5 border-b border-emerald-200/60">
                                <div>
                                    <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-0.5">
                                        Prezzo al pubblico
                                    </span>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-3xl sm:text-4xl font-black text-gray-950 tracking-tight">
                                            €{formattedPrice}
                                        </span>
                                        <span className="text-sm font-semibold text-gray-600">
                                            / {product.isVariableWeight ? 'kg' : (product.unitType === 'BOX' ? 'conf.' : 'pz')}
                                        </span>
                                    </div>
                                </div>

                                {product.isVariableWeight && selectedUnit === 'PZ' && product.stepAmount > 0 && (
                                    <span className="text-xs font-bold text-emerald-900 bg-emerald-100/80 px-3 py-1.5 rounded-xl border border-emerald-200">
                                        Circa {product.stepAmount} kg a pezzo
                                    </span>
                                )}
                            </div>

                            {/* Unit Switcher (if variable weight) */}
                            {product.unitType === 'KG' && product.isVariableWeight && product.stepAmount > 0 && (
                                <div>
                                    <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1.5">
                                        Come preferisci acquistare?
                                    </label>
                                    <div className="grid grid-cols-2 gap-2 bg-white p-1 rounded-2xl border border-emerald-200/70 text-xs font-bold">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (cartItem) updateItemUnit(product.id, 'KG', 1);
                                                else setSelectedUnit('KG');
                                            }}
                                            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                                selectedUnit === 'KG' 
                                                    ? 'bg-emerald-800 text-white shadow-xs font-black' 
                                                    : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                        >
                                            <Scale size={14} />
                                            <span>Al Chilo (Kg)</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (cartItem) updateItemUnit(product.id, 'PZ', 1);
                                                else setSelectedUnit('PZ');
                                            }}
                                            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                                selectedUnit === 'PZ' 
                                                    ? 'bg-emerald-800 text-white shadow-xs font-black' 
                                                    : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                        >
                                            <ShoppingBasket size={14} />
                                            <span>Al Pezzo</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Action Button */}
                            <div className="space-y-2.5">
                                {selectedUnit === 'KG' ? (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedProductForWeight(product)}
                                        className="w-full bg-emerald-800 hover:bg-emerald-900 active:scale-98 text-white py-3.5 px-6 rounded-2xl font-bold text-base shadow-md shadow-emerald-900/15 transition-all flex items-center justify-between group cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <Scale size={20} className="group-hover:rotate-12 transition-transform" />
                                            <span>{currentQty > 0 ? `${currentQty} kg nel Carrello` : 'Scegli il Peso & Aggiungi'}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs bg-white/20 px-3 py-1.5 rounded-xl font-bold">
                                            <span>€{formattedEstimatedTotal} stimati</span>
                                            <CornerDownRight size={13} />
                                        </div>
                                    </button>
                                ) : (
                                    currentQty > 0 ? (
                                        <div className="flex items-center justify-between bg-white rounded-2xl p-1.5 border border-emerald-200/80 shadow-2xs">
                                            <button
                                                type="button"
                                                onClick={() => updateQuantity(product.id, Math.max(0, currentQty - 1))}
                                                className="w-11 h-11 bg-gray-100 rounded-xl text-emerald-950 flex items-center justify-center hover:bg-gray-200 transition-all active:scale-90 cursor-pointer"
                                            >
                                                <Minus strokeWidth={2.5} size={18} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedProductForUnit(product)}
                                                className="flex flex-col items-center justify-center py-1 px-4 cursor-pointer"
                                            >
                                                <span className="font-black text-2xl text-emerald-950 leading-none">{currentQty}</span>
                                                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">pezzi nel carrello</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => updateQuantity(product.id, currentQty + 1)}
                                                className="w-11 h-11 bg-emerald-800 rounded-xl text-white flex items-center justify-center hover:bg-emerald-900 transition-all active:scale-90 cursor-pointer"
                                            >
                                                <Plus strokeWidth={2.5} size={18} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => addItem({ ...product, unitType: selectedUnit }, 1)}
                                            className="w-full bg-emerald-800 hover:bg-emerald-900 active:scale-98 text-white py-3.5 px-6 rounded-2xl font-bold text-base shadow-md shadow-emerald-900/15 transition-all flex items-center justify-between group cursor-pointer"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <ShoppingBasket size={20} className="group-hover:scale-110 transition-transform" />
                                                <span>Aggiungi al Carrello</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs bg-white/20 px-3 py-1.5 rounded-xl font-bold">
                                                <span>€{formattedPrice}</span>
                                                <CornerDownRight size={13} />
                                            </div>
                                        </button>
                                    )
                                )}

                                <p className="text-[11px] text-gray-500 text-center flex items-center justify-center gap-1.5 pt-1">
                                    <Info size={13} className="text-emerald-700 shrink-0" />
                                    <span>Importo verificato con scontrino alla pesatura prima della consegna</span>
                                </p>
                            </div>
                        </div>

                        {/* Natural Flowing Description */}
                        <div className="mb-6">
                            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-2">
                                Descrizione
                            </h3>
                            <p className="text-gray-700 text-sm sm:text-base leading-relaxed">
                                {product.description || "Frutta e verdura fresca raccolta ogni giorno direttamente dai produttori di fiducia, garantendo gusto autentico e massima freschezza."}
                            </p>
                        </div>

                        {/* Chef's Advice (Refined Culinary Note, not an orange box) */}
                        {product.seasonalTips && (
                            <div className="p-4 rounded-2xl bg-amber-50/70 border-l-4 border-amber-500 mb-6 flex items-start gap-3.5">
                                <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                                    <ChefHat size={16} />
                                </div>
                                <div>
                                    <span className="text-xs font-extrabold uppercase tracking-wider text-amber-950 block mb-0.5">
                                        Il Consiglio in Cucina
                                    </span>
                                    <p className="text-xs sm:text-sm text-amber-900/90 italic leading-relaxed">
                                        "{product.seasonalTips}"
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Traceability & Harvest Details Accordion (Discreet & Collapsible) */}
                        <div className="border-t border-b border-gray-200 py-3 mt-auto">
                            <button
                                type="button"
                                onClick={() => setShowDetails(!showDetails)}
                                className="w-full flex items-center justify-between text-left py-1 group cursor-pointer"
                            >
                                <div className="flex items-center gap-2">
                                    <ShieldCheck size={17} className="text-emerald-800" />
                                    <span className="font-bold text-sm text-gray-900 group-hover:text-emerald-800 transition-colors">
                                        Tracciabilità e Dettagli del Raccolto
                                    </span>
                                </div>
                                <ChevronDown 
                                    size={17} 
                                    className={`text-gray-400 group-hover:text-emerald-800 transition-transform duration-200 ${showDetails ? 'rotate-180' : ''}`} 
                                />
                            </button>

                            {showDetails && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="pt-3 pb-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs"
                                >
                                    <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-150">
                                        <span className="text-gray-400 font-medium block mb-0.5 text-[10px] uppercase tracking-wider">Provenienza</span>
                                        <span className="font-bold text-gray-900">{product.origin || 'Italia'}</span>
                                    </div>
                                    <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-150">
                                        <span className="text-gray-400 font-medium block mb-0.5 text-[10px] uppercase tracking-wider">Calibro</span>
                                        <span className="font-bold text-gray-900">{product.caliber || 'Standard'}</span>
                                    </div>
                                    <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-150">
                                        <span className="text-gray-400 font-medium block mb-0.5 text-[10px] uppercase tracking-wider">Categoria</span>
                                        <span className="font-bold text-gray-900">{product.commercialCategory ? `Cat. ${product.commercialCategory}` : 'Cat. I'}</span>
                                    </div>
                                    <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-150">
                                        <span className="text-gray-400 font-medium block mb-0.5 text-[10px] uppercase tracking-wider">Codice Articolo</span>
                                        <span className="font-bold text-gray-600 font-mono">#{product.id}</span>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Related Products Section */}
                {relatedProducts.length > 0 && (
                    <div className="mt-20 md:mt-28 border-t border-gray-200/80 pt-12">
                        <div className="flex items-end justify-between mb-8">
                            <div>
                                <span className="text-xs font-black uppercase tracking-widest text-emerald-700 block mb-1">
                                    Consigliati per te
                                </span>
                                <h2 className="font-script text-4xl sm:text-5xl text-nature-950">
                                    Potrebbe Piacerti Anche
                                </h2>
                            </div>
                            <Link to="/shop" className="hidden md:inline-flex items-center gap-1.5 text-emerald-700 font-bold hover:text-emerald-800 transition-colors text-sm">
                                <span>Vedi tutto il raccolto</span>
                                <ArrowLeft size={16} className="rotate-180" />
                            </Link>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                            {relatedProducts.map(p => (
                                <ProductCard
                                    key={p.id}
                                    product={p}
                                    onWeightSelect={setSelectedProductForWeight}
                                    onUnitSelect={setSelectedProductForUnit}
                                />
                            ))}
                        </div>
                    </div>
                )}

            </div>

            {/* Sticky Mobile Action Bar (Smartphone Bottom Bar) */}
            <div className="block md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200/90 p-3 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
                <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
                    <div className="flex flex-col shrink-0">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            {currentQty > 0 ? 'Totale Stimato' : 'Prezzo'}
                        </span>
                        <span className="text-lg sm:text-xl font-black text-emerald-950 leading-tight">
                            €{currentQty > 0 ? formattedEstimatedTotal : formattedPrice}
                            <span className="text-[11px] font-bold text-gray-500"> / {product.isVariableWeight ? 'kg' : (product.unitType === 'BOX' ? 'conf.' : 'pz')}</span>
                        </span>
                    </div>

                    <div className="flex-1">
                        {selectedUnit === 'KG' ? (
                            <button
                                type="button"
                                onClick={() => setSelectedProductForWeight(product)}
                                className="w-full bg-emerald-800 hover:bg-emerald-900 active:scale-95 text-white py-3 px-4 rounded-xl font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-transform"
                            >
                                <Scale size={18} />
                                <span>{currentQty > 0 ? `${currentQty} kg nel carrello` : 'Scegli Peso & Aggiungi'}</span>
                            </button>
                        ) : (
                            currentQty > 0 ? (
                                <div className="flex items-center justify-between bg-emerald-50 rounded-xl p-1 border border-emerald-200 shadow-inner">
                                    <button
                                        type="button"
                                        onClick={() => updateQuantity(product.id, Math.max(0, currentQty - 1))}
                                        className="w-9 h-9 bg-white rounded-lg text-emerald-900 flex items-center justify-center shadow-2xs active:scale-90"
                                    >
                                        <Minus size={16} strokeWidth={3} />
                                    </button>
                                    <span className="font-black text-sm text-emerald-950 px-2">{currentQty} pz</span>
                                    <button
                                        type="button"
                                        onClick={() => updateQuantity(product.id, currentQty + 1)}
                                        className="w-9 h-9 bg-emerald-800 rounded-lg text-white flex items-center justify-center shadow-2xs active:scale-90"
                                    >
                                        <Plus size={16} strokeWidth={3} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => addItem({ ...product, unitType: selectedUnit }, 1)}
                                    className="w-full bg-emerald-800 hover:bg-emerald-900 active:scale-95 text-white py-3 px-4 rounded-xl font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-transform"
                                >
                                    <ShoppingBasket size={18} />
                                    <span>Aggiungi al Carrello</span>
                                </button>
                            )
                        )}
                    </div>
                </div>
            </div>

            {/* Weight Drawer */}
            <WeightSelectorDrawer
                isOpen={!!selectedProductForWeight}
                onClose={() => setSelectedProductForWeight(null)}
                productName={selectedProductForWeight?.name || ''}
                currentWeight={selectedProductForWeight ? getProductQuantity(selectedProductForWeight.id) : 0}
                unitPrice={selectedProductForWeight?.priceCents || 0}
                onConfirm={(weight) => {
                    if (selectedProductForWeight) {
                        if (getProductQuantity(selectedProductForWeight.id) === 0) {
                            addItem({ ...selectedProductForWeight, unitType: 'KG' }, weight);
                        } else {
                            updateItemUnit(selectedProductForWeight.id, 'KG', weight);
                        }
                    }
                }}
            />

            {/* Unit Drawer */}
            <QuantitySelectorDrawer
                isOpen={!!selectedProductForUnit}
                onClose={() => setSelectedProductForUnit(null)}
                productName={selectedProductForUnit?.name || ''}
                currentQty={selectedProductForUnit ? getProductQuantity(selectedProductForUnit.id) : 0}
                unitPrice={selectedProductForUnit?.priceCents || 0}
                unitType={selectedProductForUnit && selectedProductForUnit.unitType === 'KG' ? 'PZ' : (selectedProductForUnit?.unitType as any || 'PZ')}
                onConfirm={(qty) => {
                    if (selectedProductForUnit) {
                        const unit = selectedProductForUnit.unitType === 'KG' ? 'PZ' : selectedProductForUnit.unitType;
                        if (getProductQuantity(selectedProductForUnit.id) === 0) {
                            addItem({ ...selectedProductForUnit, unitType: unit }, qty);
                        } else {
                            updateItemUnit(selectedProductForUnit.id, unit, qty);
                        }
                    }
                }}
            />

            {/* Product Advanced Share Modal & Story Card Generator */}
            {product && (
                <ProductShareModal
                    isOpen={isShareModalOpen}
                    onClose={() => setIsShareModalOpen(false)}
                    product={product}
                />
            )}

            {/* Gallery Fullscreen Lightbox Zoom Modal */}
            <AnimatePresence>
                {isLightboxOpen && galleryImages.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6"
                        onClick={() => setIsLightboxOpen(false)}
                    >
                        {/* Top bar */}
                        <div className="flex items-center justify-between text-white z-10" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-sm sm:text-base text-gray-200 truncate max-w-[200px] sm:max-w-md">
                                    {product?.name}
                                </span>
                                {galleryImages.length > 1 && (
                                    <span className="text-xs font-semibold px-2.5 py-1 bg-white/10 rounded-full text-gray-300">
                                        {activeImageIndex + 1} / {galleryImages.length}
                                    </span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsLightboxOpen(false)}
                                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all active:scale-95"
                                title="Chiudi (Esc)"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Center Stage Image */}
                        <div 
                            className="relative flex-1 flex items-center justify-center my-4 overflow-hidden" 
                            onClick={e => e.stopPropagation()}
                            onTouchStart={handleTouchStart}
                            onTouchEnd={handleTouchEnd}
                        >
                            {galleryImages.length > 1 && (
                                <button
                                    type="button"
                                    onClick={handlePrevImage}
                                    className="absolute left-2 sm:left-4 z-20 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-md flex items-center justify-center transition-all active:scale-90"
                                    aria-label="Precedente"
                                >
                                    <ChevronLeft size={26} className="-ml-0.5" />
                                </button>
                            )}

                            <motion.img
                                key={activeImageIndex}
                                src={sanitizeImageUrl(galleryImages[activeImageIndex])}
                                alt={`${product?.name} - Zoom`}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl select-none"
                            />

                            {galleryImages.length > 1 && (
                                <button
                                    type="button"
                                    onClick={handleNextImage}
                                    className="absolute right-2 sm:right-4 z-20 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-md flex items-center justify-center transition-all active:scale-90"
                                    aria-label="Successiva"
                                >
                                    <ChevronRight size={26} className="-mr-0.5" />
                                </button>
                            )}
                        </div>

                        {/* Bottom Thumbnail Strip in Lightbox */}
                        {galleryImages.length > 1 && (
                            <div 
                                className="flex items-center justify-center gap-2 overflow-x-auto py-2 z-10 scrollbar-none"
                                onClick={e => e.stopPropagation()}
                            >
                                {galleryImages.map((imgUrl, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setActiveImageIndex(idx)}
                                        className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                                            idx === activeImageIndex
                                                ? 'border-emerald-400 scale-110 shadow-lg ring-2 ring-emerald-400/50'
                                                : 'border-white/20 opacity-50 hover:opacity-100'
                                        }`}
                                    >
                                        <img
                                            src={sanitizeImageUrl(imgUrl)}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};
