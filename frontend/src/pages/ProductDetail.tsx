import { useEffect, useState } from 'react';
import { trackProductVisit } from '../hooks/useAnalyticsTracker';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';
import { 
    ArrowLeft, ChefHat, ShoppingBasket, Scale, Plus, Minus, Truck, 
    ShieldCheck, Leaf, Info, Sparkles, Check, Share2, CornerDownRight
} from 'lucide-react';
import { motion } from 'framer-motion';
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
    isAvailable: boolean;
    seasonalTips?: string;
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
                <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 flex items-center justify-between">
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

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">

                {/* Main Product Showcase Section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">

                    {/* Left Column: Image Showcase & Value Badges (5 cols on lg) */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="lg:col-span-6 space-y-6"
                    >
                        <div className="relative aspect-[4/3] sm:aspect-square rounded-3xl overflow-hidden shadow-xl bg-white border border-gray-150 group">
                            {product.imageUrl ? (
                                <img
                                    src={sanitizeImageUrl(product.imageUrl)}
                                    alt={product.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-nature-200 font-script text-9xl bg-gradient-to-br from-emerald-50 to-nature-100">
                                    <span>{product.name[0]}</span>
                                </div>
                            )}

                            {/* Gradient Overlay for Top Badges */}
                            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/40 to-transparent pointer-events-none"></div>

                            {/* Badges Overlay */}
                            <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2 pointer-events-none">
                                <div className="flex flex-wrap gap-2">
                                    {product.unitType === 'KG' && (
                                        <span className="bg-white/95 backdrop-blur-md text-emerald-950 text-xs font-black px-3.5 py-1.5 rounded-full shadow-md flex items-center gap-1.5 border border-emerald-100">
                                            <Scale size={13} className="text-emerald-600" /> PESO VARIABILE AL KG
                                        </span>
                                    )}
                                    {product.unitType === 'PZ' && (
                                        <span className="bg-white/95 backdrop-blur-md text-nature-950 text-xs font-black px-3.5 py-1.5 rounded-full shadow-md flex items-center gap-1.5 border border-nature-100">
                                            <ShoppingBasket size={13} className="text-fruit-600" /> VENDITA A PEZZI
                                        </span>
                                    )}
                                </div>

                                {product.isAvailable ? (
                                    <span className="bg-emerald-600 text-white text-[11px] font-black px-3 py-1 rounded-full shadow-md uppercase tracking-wider flex items-center gap-1">
                                        <Check size={12} strokeWidth={3} /> Disponibile
                                    </span>
                                ) : (
                                    <span className="bg-red-600 text-white text-[11px] font-black px-3 py-1 rounded-full shadow-md uppercase tracking-wider">
                                        Esaurito
                                    </span>
                                )}
                            </div>

                            <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md p-3 rounded-2xl border border-white/40 shadow-lg flex items-center justify-between text-xs font-bold text-nature-900">
                                <span className="flex items-center gap-1.5">
                                    <Leaf size={15} className="text-emerald-600" /> Filiera Corta Garantita
                                </span>
                                <span className="text-gray-500 font-medium">Fresco di Giornata</span>
                            </div>
                        </div>

                        {/* Value Props 3-Grid */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-white p-3.5 rounded-2xl border border-gray-150 shadow-2xs flex flex-col items-center text-center gap-1.5">
                                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                                    <Sparkles size={18} />
                                </div>
                                <span className="text-xs font-extrabold text-gray-800">Alta Qualità</span>
                                <span className="text-[10px] text-gray-500 font-medium">Selezionato a mano</span>
                            </div>

                            <div className="bg-white p-3.5 rounded-2xl border border-gray-150 shadow-2xs flex flex-col items-center text-center gap-1.5">
                                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                                    <Truck size={18} />
                                </div>
                                <span className="text-xs font-extrabold text-gray-800">Consegna Fresca</span>
                                <span className="text-[10px] text-gray-500 font-medium">A casa o al mercato</span>
                            </div>

                            <div className="bg-white p-3.5 rounded-2xl border border-gray-150 shadow-2xs flex flex-col items-center text-center gap-1.5">
                                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                                    <ShieldCheck size={18} />
                                </div>
                                <span className="text-xs font-extrabold text-gray-800">Peso Corretto</span>
                                <span className="text-[10px] text-gray-500 font-medium">Pesato al momento</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right Column: Information & Purchase Box (7 cols on lg) */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="lg:col-span-6 flex flex-col h-full"
                    >
                        {/* Subtitle / Category Pill */}
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-900 font-extrabold rounded-full text-xs uppercase tracking-wider">
                                Ortofrutta di Stagione
                            </span>
                            <span className="text-xs text-gray-400 font-medium">• Codice #{product.id}</span>
                        </div>

                        {/* Title */}
                        <h1 className="font-script text-4xl sm:text-6xl text-nature-950 mb-3 leading-tight">
                            {product.name}
                        </h1>

                        {/* Price Card Container */}
                        <div className="bg-gradient-to-r from-emerald-900 via-nature-900 to-emerald-950 text-white p-5 rounded-3xl shadow-xl mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-emerald-800/40">
                            <div>
                                <span className="text-xs font-bold text-emerald-300 uppercase tracking-widest block mb-0.5">Prezzo di Listino</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                                        €{formattedPrice}
                                    </span>
                                    <span className="text-sm font-bold text-emerald-200">
                                        / {product.isVariableWeight ? 'kg' : (product.unitType === 'BOX' ? 'conf.' : product.unitType.toLowerCase())}
                                    </span>
                                </div>
                            </div>

                            {product.isVariableWeight && selectedUnit === 'PZ' && product.stepAmount > 0 && (
                                <div className="bg-white/15 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/20 text-xs font-bold text-emerald-100 flex items-center gap-2">
                                    <Info size={16} className="text-amber-300 shrink-0" />
                                    <span>Pezzo da circa <strong className="text-white">{product.stepAmount} kg</strong></span>
                                </div>
                            )}
                        </div>

                        {/* Product Description */}
                        <div className="mb-6 bg-white p-5 rounded-3xl border border-gray-150 shadow-2xs">
                            <h3 className="font-bold text-gray-900 text-sm mb-2 flex items-center gap-2">
                                <Leaf size={16} className="text-emerald-600" /> Descrizione del Prodotto
                            </h3>
                            <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                                {product.description || "Raccolto fresco selezionato a mano con cura. Garantiamo il massimo del sapore naturale ed autentico direttamente dai nostri produttori di fiducia."}
                            </p>
                        </div>

                        {/* Expert Seasonal Advice Box */}
                        {product.seasonalTips && (
                            <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 p-5 rounded-3xl border border-amber-200/80 mb-6 relative overflow-hidden shadow-2xs">
                                <div className="flex items-start gap-3.5 relative z-10">
                                    <div className="bg-amber-500 text-white p-2.5 rounded-2xl shadow-md shrink-0">
                                        <ChefHat size={22} />
                                    </div>
                                    <div>
                                        <h4 className="font-extrabold text-amber-950 text-sm mb-1">
                                            Consigli in Cucina & Conservazione
                                        </h4>
                                        <p className="text-amber-900/90 text-xs sm:text-sm italic leading-relaxed">
                                            "{product.seasonalTips}"
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Interactive Unit Switcher & Cart Action Box */}
                        <div className="mt-auto bg-white p-5 sm:p-6 rounded-3xl border border-emerald-200/80 shadow-xl space-y-4">
                            
                            {/* Dual Unit Selector Switcher */}
                            {product.unitType === 'KG' && product.isVariableWeight && product.stepAmount > 0 && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                        Modalità d'Acquisto
                                    </label>
                                    <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200/80 text-xs font-bold">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (cartItem) {
                                                    updateItemUnit(product.id, 'KG', 1);
                                                } else {
                                                    setSelectedUnit('KG');
                                                }
                                            }}
                                            className={`flex-1 py-2.5 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${selectedUnit === 'KG' ? 'bg-emerald-700 text-white shadow-md font-extrabold' : 'text-gray-600 hover:text-gray-900'}`}
                                        >
                                            <Scale size={15} />
                                            <span>Vendita al Kg</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (cartItem) {
                                                    updateItemUnit(product.id, 'PZ', 1);
                                                } else {
                                                    setSelectedUnit('PZ');
                                                }
                                            }}
                                            className={`flex-1 py-2.5 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${selectedUnit === 'PZ' ? 'bg-emerald-700 text-white shadow-md font-extrabold' : 'text-gray-600 hover:text-gray-900'}`}
                                        >
                                            <ShoppingBasket size={15} />
                                            <span>Vendita a Pezzi</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Stepper / Action Controls */}
                            <div className="space-y-3">
                                {selectedUnit === 'KG' ? (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedProductForWeight(product)}
                                        className="w-full bg-emerald-800 hover:bg-emerald-900 text-white py-4 px-6 rounded-2xl font-black text-base sm:text-lg shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-between group"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <Scale size={22} className="group-hover:rotate-12 transition-transform" />
                                            <span>{currentQty > 0 ? `${currentQty} kg nel Carrello` : 'Scegli Peso & Aggiungi'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs bg-white/20 px-3 py-1.5 rounded-xl font-bold">
                                            <span>€{formattedEstimatedTotal} stimati</span>
                                            <CornerDownRight size={14} />
                                        </div>
                                    </button>
                                ) : (
                                    currentQty > 0 ? (
                                        <div className="flex items-center justify-between bg-emerald-50 rounded-2xl p-2 border border-emerald-200 shadow-inner">
                                            <button
                                                type="button"
                                                onClick={() => updateQuantity(product.id, Math.max(0, currentQty - 1))}
                                                className="w-12 h-12 bg-white rounded-xl shadow-md text-emerald-900 flex items-center justify-center hover:bg-emerald-100 transition-all active:scale-90"
                                            >
                                                <Minus strokeWidth={3} size={20} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedProductForUnit(product)}
                                                className="flex flex-col items-center justify-center py-1 px-4 cursor-pointer"
                                            >
                                                <span className="font-black text-2xl text-emerald-950 leading-none">{currentQty}</span>
                                                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">pezzi nel carrello</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => updateQuantity(product.id, currentQty + 1)}
                                                className="w-12 h-12 bg-emerald-800 rounded-xl shadow-md text-white flex items-center justify-center hover:bg-emerald-900 transition-all active:scale-90"
                                            >
                                                <Plus strokeWidth={3} size={20} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => addItem({ ...product, unitType: selectedUnit }, 1)}
                                            className="w-full bg-emerald-800 hover:bg-emerald-900 text-white py-4 px-6 rounded-2xl font-black text-base sm:text-lg shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <ShoppingBasket size={22} className="group-hover:scale-110 transition-transform" />
                                                <span>Aggiungi al Carrello</span>
                                            </div>
                                            <span className="text-xs bg-white/20 px-3 py-1.5 rounded-xl font-bold">
                                                €{formattedPrice}
                                            </span>
                                        </button>
                                    )
                                )}
                            </div>

                            {/* Weighing Reassurance Notice */}
                            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200/80 flex items-center gap-2.5 text-xs text-gray-600 font-medium">
                                <Info size={16} className="text-emerald-600 shrink-0" />
                                <span>Il peso esatto e l'importo finale vengono verificati alla pesatura prima della spedizione.</span>
                            </div>
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

        </div>
    );
};
