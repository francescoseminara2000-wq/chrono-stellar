import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';
import { ArrowLeft, ChefHat, ShoppingBasket, Scale, Plus, Minus, Star, Truck, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { WeightSelectorDrawer } from '../components/WeightSelectorDrawer';
import { QuantitySelectorDrawer } from '../components/QuantitySelectorDrawer';
import { ProductCard } from '../components/ProductCard';
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
    const [product, setProduct] = useState<Product | null>(null);
    const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const { items, addItem, updateQuantity } = useCartStore();
    const [selectedProductForWeight, setSelectedProductForWeight] = useState<Product | null>(null);
    const [selectedProductForUnit, setSelectedProductForUnit] = useState<Product | null>(null);

    const getProductQuantity = (productId: number) => {
        const item = items.find(i => i.id === productId);
        return item ? item.quantity : 0;
    };

    useEffect(() => {
        window.scrollTo(0, 0); // Scroll to top on navigation
        setLoading(true);
        fetch(`/api/products`)
            .then(res => res.json())
            .then((data: Product[]) => {
                const found = data.find(p => p.id === Number(id));
                setProduct(found || null);

                // Mock related products (just take first 3 that aren't this one)
                setRelatedProducts(data.filter(p => p.id !== Number(id)).slice(0, 4));
                setLoading(false);
            })
            .catch(err => {
                console.error("Error loading product", err);
                setLoading(false);
            });
    }, [id]);

    if (loading) return (
        <div className="flex justify-center items-center h-screen bg-nature-50">
            <div className="animate-pulse flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-nature-200 border-t-nature-600 rounded-full animate-spin"></div>
            </div>
        </div>
    );

    if (!product) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-nature-50 text-nature-900">
            <h2 className="text-3xl font-script mb-4">Prodotto non trovato</h2>
            <Link to="/shop" className="text-nature-600 font-bold hover:underline">Torna allo Shop</Link>
        </div>
    );

    const quantity = getProductQuantity(product.id);

    return (
        <div className="bg-nature-50/50 min-h-screen pb-20 pt-24 md:pt-32">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Navigation */}
                <Link to="/shop" className="inline-flex items-center text-gray-500 hover:text-nature-700 mb-8 transition-colors font-medium group">
                    <div className="bg-white p-2 rounded-full shadow-sm mr-3 group-hover:scale-110 transition-transform">
                        <ArrowLeft size={18} />
                    </div>
                    Torna al Raccolto
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">

                    {/* Left Column: Image Gallery */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                        className="space-y-6"
                    >
                        <div className="relative aspect-[4/3] rounded-[2.5rem] overflow-hidden shadow-2xl bg-white border border-gray-100">
                            {product.imageUrl ? (
                                <img
                                    src={sanitizeImageUrl(product.imageUrl)}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-nature-200 font-script text-9xl bg-nature-50">
                                    {product.name[0]}
                                </div>
                            )}

                            {/* Floating Badges */}
                            <div className="absolute top-6 left-6 flex flex-col gap-3">
                                {product.unitType === 'KG' && (
                                    <span className="bg-white/95 backdrop-blur-md text-nature-800 text-xs font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                                        <Scale size={14} className="text-nature-600" /> VENDITA A PESO
                                    </span>
                                )}
                                {product.isVariableWeight && (
                                    <span className="bg-yellow-50/95 backdrop-blur-md text-yellow-800 text-xs font-bold px-4 py-2 rounded-full shadow-lg border border-yellow-100">
                                        PESO VARIABILE
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Value Props Row */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center text-center gap-2">
                                <Star className="text-fruit-500 fill-fruit-500" size={20} />
                                <span className="text-xs font-bold text-gray-600">Alta Qualità</span>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center text-center gap-2">
                                <Truck className="text-nature-600" size={20} />
                                <span className="text-xs font-bold text-gray-600">Consegna Rapida</span>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center text-center gap-2">
                                <ShieldCheck className="text-nature-600" size={20} />
                                <span className="text-xs font-bold text-gray-600">Garanzia Freschezza</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right Column: Product Details */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="flex flex-col h-full"
                    >
                        <div className="mb-2 flex items-center gap-2">
                            <span className="text-nature-600 font-bold uppercase tracking-widest text-xs">Frutta di Stagione</span>
                            <div className="h-px bg-nature-200 flex-grow"></div>
                        </div>

                        <h1 className="font-script text-6xl md:text-7xl text-nature-900 mb-6 leading-tight">{product.name}</h1>

                        <div className="flex items-end gap-3 mb-8">
                            <span className="text-4xl font-bold text-nature-900">
                                €{(product.priceCents / 100).toFixed(2)}
                            </span>
                            <span className="text-xl text-gray-500 font-medium mb-1">
                                / {product.unitType === 'BOX' ? 'conf.' : product.unitType.toLowerCase()}
                            </span>
                        </div>

                        <p className="text-gray-600 text-lg leading-relaxed mb-8 border-l-4 border-nature-200 pl-6">
                            {product.description || "Coltivato con cura dai nostri agricoltori di fiducia, selezionato a mano per garantirti la massima freschezza e un sapore autentico."}
                        </p>

                        {/* Tips Section */}
                        {product.seasonalTips && (
                            <div className="bg-fruit-50/50 p-6 rounded-3xl border border-fruit-100 mb-10 relative">
                                <div className="flex items-start gap-4">
                                    <div className="bg-white p-3 rounded-full text-fruit-600 shadow-sm border border-fruit-100 flex-shrink-0">
                                        <ChefHat size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-fruit-900 mb-2 font-display text-lg">
                                            L'Esperto Consiglia
                                        </h3>
                                        <p className="text-fruit-800/80 italic text-base leading-relaxed">
                                            "{product.seasonalTips}"
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-auto bg-white p-6 rounded-[2rem] shadow-xl border border-gray-100">
                            <div className="flex flex-col md:flex-row gap-4 items-stretch">
                                {/* Controller Logic */}
                                {product.unitType === 'KG' ? (
                                    <button
                                        onClick={() => setSelectedProductForWeight(product)}
                                        className="flex-1 bg-nature-900 hover:bg-nature-800 text-white py-4 px-8 rounded-2xl font-bold text-lg shadow-lg shadow-nature-900/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                                    >
                                        {quantity > 0 ? (
                                            <>
                                                <div className="flex flex-col items-start leading-none">
                                                    <span className="text-[10px] opacity-70 uppercase tracking-wider">Modifica Peso</span>
                                                    <span>{quantity} kg nel carrello</span>
                                                </div>
                                                <Scale size={24} className="ml-auto" />
                                            </>
                                        ) : (
                                            <>
                                                <span>Scegli Peso & Aggiungi</span>
                                                <Scale size={24} />
                                            </>
                                        )}
                                    </button>
                                ) : (
                                    // Unit Logic
                                    quantity > 0 ? (
                                        <div className="flex-1 flex items-center justify-between bg-nature-50 rounded-2xl p-2 border border-nature-200">
                                            <button
                                                onClick={() => updateQuantity(product.id, Math.max(0, quantity - 1))}
                                                className="w-14 h-14 bg-white rounded-xl shadow-sm text-nature-900 flex items-center justify-center hover:bg-white/80 transition-colors"
                                            >
                                                <Minus strokeWidth={3} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedProductForUnit(product)}
                                                className="w-12 text-center bg-transparent border-none focus:outline-none outline-none font-bold text-2xl text-nature-900 hover:text-nature-600 transition-colors py-2"
                                                title="Modifica con tastiera"
                                            >
                                                {quantity}
                                            </button>
                                            <button
                                                onClick={() => updateQuantity(product.id, quantity + 1)}
                                                className="w-14 h-14 bg-nature-900 rounded-xl shadow-md text-white flex items-center justify-center hover:bg-nature-800 transition-colors"
                                            >
                                                <Plus strokeWidth={3} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => addItem({ ...product }, 1)}
                                            className="flex-1 bg-nature-900 hover:bg-nature-800 text-white py-4 px-8 rounded-2xl font-bold text-lg shadow-lg shadow-nature-900/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                                        >
                                            <ShoppingBasket />
                                            Aggiungi al Carrello
                                        </button>
                                    )
                                )}
                            </div>
                        </div>

                    </motion.div>
                </div>

                {/* Related Products Section */}
                <div className="mt-24 md:mt-32 border-t border-gray-200 pt-16">
                    <div className="flex items-end justify-between mb-12">
                        <div>
                            <h2 className="font-script text-5xl text-nature-900 mb-2">Potrebbe piacerti anche</h2>
                            <p className="text-gray-500">Altri prodotti freschi scelti per te.</p>
                        </div>
                        <Link to="/shop" className="hidden md:block text-nature-600 font-bold hover:underline">Vedi tutti &rarr;</Link>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 md:gap-8">
                        {relatedProducts.map(p => (
                             <ProductCard
                                 key={p.id}
                                 product={p}
                                 onWeightSelect={setSelectedProductForWeight}
                                 onUnitSelect={setSelectedProductForUnit}
                             />
                         ))}
                    </div>
                    <div className="mt-8 text-center md:hidden">
                        <Link to="/shop" className="text-nature-600 font-bold hover:underline">Vedi tutti &rarr;</Link>
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
                                addItem({ ...selectedProductForWeight }, weight);
                            } else {
                                updateQuantity(selectedProductForWeight.id, weight);
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
                    unitType={selectedProductForUnit?.unitType as any}
                    onConfirm={(qty) => {
                        if (selectedProductForUnit) {
                            if (getProductQuantity(selectedProductForUnit.id) === 0) {
                                addItem({ ...selectedProductForUnit }, qty);
                            } else {
                                updateQuantity(selectedProductForUnit.id, qty);
                            }
                        }
                    }}
                />

            </div>
        </div>
    );
};
