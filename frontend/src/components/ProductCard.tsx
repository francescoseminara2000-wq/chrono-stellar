import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, Plus, Minus, Check } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { Link } from 'react-router-dom';
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
}

interface ProductCardProps {
    product: Product;
    onWeightSelect: (product: Product) => void;
    onUnitSelect?: (product: Product) => void;
    viewMode?: 'grid' | 'list';
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onWeightSelect, onUnitSelect, viewMode = 'grid' }) => {
    const { items, addItem, updateQuantity, updateItemUnit } = useCartStore();

    const cartItem = items.find(i => i.id === product.id);
    const [selectedUnit, setSelectedUnit] = React.useState<'KG' | 'PZ' | 'BOX'>(
        cartItem ? cartItem.unitType : product.unitType
    );

    React.useEffect(() => {
        if (cartItem) {
            setSelectedUnit(cartItem.unitType);
        }
    }, [cartItem]);

    const getProductQuantity = (productId: number) => {
        const item = items.find(i => i.id === productId);
        return item ? item.quantity : 0;
    };

    const quantity = getProductQuantity(product.id);

    if (viewMode === 'list') {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="group relative bg-white rounded-2xl p-3 border border-gray-150 shadow-2xs hover:shadow-md transition-all duration-300 flex items-center gap-3 sm:gap-4"
            >
                {/* Image */}
                <div className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-gray-50 shrink-0">
                    <Link to={`/shop/${product.id}`} className="block w-full h-full">
                        {product.imageUrl ? (
                            <img
                                src={sanitizeImageUrl(product.imageUrl)}
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-nature-300 font-script text-3xl">
                                {product.name[0]}
                            </div>
                        )}
                    </Link>
                    {quantity > 0 && (
                        <span className="absolute top-1.5 right-1.5 bg-nature-600 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-md border border-white">
                            {quantity}
                        </span>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        {product.unitType === 'KG' && (
                            <span className="bg-emerald-50 text-emerald-700 text-[9px] font-black px-1.5 py-0.5 rounded-md border border-emerald-100 flex items-center gap-0.5">
                                <Scale size={9} /> AL KG
                            </span>
                        )}
                        {product.isVariableWeight && (
                            <span className="bg-amber-50 text-amber-700 text-[9px] font-black px-1.5 py-0.5 rounded-md border border-amber-200">
                                PESO VARIABILE
                            </span>
                        )}
                    </div>

                    <Link to={`/shop/${product.id}`}>
                        <h3 className="text-sm sm:text-base font-black text-gray-900 group-hover:text-nature-700 transition-colors truncate">
                            {product.name}
                        </h3>
                    </Link>

                    <p className="text-xs text-gray-400 line-clamp-1 mt-0.5 font-medium hidden sm:block">
                        {product.description || "Freschezza garantita."}
                    </p>

                    <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-base sm:text-lg font-black text-nature-900">
                            €{(product.priceCents / 100).toFixed(2)}
                        </span>
                        <span className="text-[10px] sm:text-xs text-gray-500 font-medium">
                            /{product.isVariableWeight ? 'kg' : (product.unitType === 'BOX' ? 'box' : product.unitType.toLowerCase())}
                        </span>
                    </div>
                </div>

                {/* Action button */}
                <div className="shrink-0 flex items-center justify-end pl-1">
                    {selectedUnit === 'KG' ? (
                        <button
                            onClick={() => onWeightSelect(product)}
                            className={`px-3 py-2 rounded-xl flex items-center gap-1.5 font-black text-xs transition-all shadow-2xs whitespace-nowrap ${quantity > 0
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-nature-900 text-white hover:bg-nature-800'
                                }`}
                        >
                            {quantity > 0 ? (
                                <>
                                    <span>{quantity} kg</span>
                                    <Check size={14} />
                                </>
                            ) : (
                                <>
                                    <Scale size={14} />
                                    <span>Scegli</span>
                                </>
                            )}
                        </button>
                    ) : (
                        quantity > 0 ? (
                            <div className="flex items-center bg-gray-50 rounded-xl border border-gray-200 p-0.5 shadow-2xs">
                                <button
                                    onClick={() => updateQuantity(product.id, Math.max(0, quantity - 1))}
                                    className="w-7 h-7 flex items-center justify-center text-gray-700 hover:bg-white rounded-lg transition-colors"
                                >
                                    <Minus size={12} strokeWidth={3} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onUnitSelect?.(product)}
                                    className="w-7 text-center font-black text-xs text-gray-900"
                                >
                                    {quantity}
                                </button>
                                <button
                                    onClick={() => updateQuantity(product.id, quantity + 1)}
                                    className="w-7 h-7 flex items-center justify-center text-gray-700 hover:bg-white rounded-lg transition-colors"
                                >
                                    <Plus size={12} strokeWidth={3} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => addItem({ ...product, unitType: selectedUnit }, 1)}
                                className="w-9 h-9 bg-nature-900 text-white rounded-xl flex items-center justify-center hover:bg-nature-800 transition-all shadow-2xs"
                            >
                                <Plus size={18} strokeWidth={2.5} />
                            </button>
                        )
                    )}
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="group relative bg-white rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col h-full"
        >
            {/* Image Container */}
            <div className="relative aspect-[4/3] overflow-hidden bg-gray-50">
                <Link to={`/shop/${product.id}`}>
                    {product.imageUrl ? (
                        <img
                            src={sanitizeImageUrl(product.imageUrl)}
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-nature-200 font-script text-4xl sm:text-6xl">
                            {product.name[0]}
                        </div>
                    )}

                    {/* Overlay Gradient on Hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Link>

                {/* Badges */}
                <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-wrap gap-1.5 sm:gap-2 z-10">
                    {product.unitType === 'KG' && (
                        <span className="bg-white/90 backdrop-blur-sm text-nature-700 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full shadow-sm border border-white/50 flex items-center gap-1">
                            <Scale size={10} className="sm:w-3 sm:h-3" /> AL KG
                        </span>
                    )}
                    {product.isVariableWeight && (
                        <span className="bg-yellow-100/90 backdrop-blur-sm text-yellow-700 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full shadow-sm border border-white/50">
                            PESO VARIABILE
                        </span>
                    )}
                </div>

                {/* Quick Quantity Badge (if in cart) */}
                <AnimatePresence>
                    {quantity > 0 && (
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-nature-600 text-white text-[10px] sm:text-xs font-bold w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full shadow-lg border-2 border-white z-10"
                        >
                            {quantity}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Content */}
            <div className="p-3 sm:p-5 flex flex-col flex-grow">
                <div className="mb-2 sm:mb-4">
                    <Link to={`/shop/${product.id}`}>
                        <h3 className="text-base sm:text-xl font-bold text-gray-900 group-hover:text-nature-700 transition-colors line-clamp-1 mb-0.5 sm:mb-1">
                            {product.name}
                        </h3>
                    </Link>
                    <p className="text-xs sm:text-sm text-gray-500 line-clamp-2 min-h-[2.5em]">
                        {product.description || "Freschezza garantita dalla nostra selezione."}
                    </p>
                    {product.isVariableWeight && selectedUnit === 'PZ' && product.stepAmount > 0 && (
                        <span className="text-[10px] text-amber-700 font-bold bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-lg mt-1.5 inline-block w-fit shrink-0">
                            Pezzo da circa {product.stepAmount} kg
                        </span>
                    )}
                </div>

                {/* Unit Selector Tab for dual-unit items */}
                {product.unitType === 'KG' && product.isVariableWeight && product.stepAmount > 0 && (
                    <div className="flex bg-gray-100 p-0.5 rounded-lg mb-3 border border-gray-200/50 text-[11px] font-bold mt-2">
                        <button
                            type="button"
                            onClick={() => {
                                if (cartItem) {
                                    updateItemUnit(product.id, 'KG', 1);
                                } else {
                                    setSelectedUnit('KG');
                                }
                            }}
                            className={`flex-1 py-1.5 rounded-md transition-all text-center ${selectedUnit === 'KG' ? 'bg-white text-nature-950 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                        >
                            Al kg
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
                            className={`flex-1 py-1.5 rounded-md transition-all text-center ${selectedUnit === 'PZ' ? 'bg-white text-nature-950 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                        >
                            A pezzi
                        </button>
                    </div>
                )}

                <div className="mt-auto flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-3 pt-2">
                    {/* Price */}
                    <div className="flex flex-col shrink-0">
                        <span className="text-[10px] sm:text-xs text-gray-400 font-medium uppercase tracking-wider">Prezzo</span>
                        <div className="flex items-baseline gap-0.5 sm:gap-1">
                            <span className="text-lg sm:text-2xl font-bold text-nature-900">
                                €{(product.priceCents / 100).toFixed(2)}
                            </span>
                            <span className="text-[10px] sm:text-sm text-gray-500 font-medium">
                                /{product.isVariableWeight ? 'kg' : (product.unitType === 'BOX' ? 'box' : product.unitType.toLowerCase())}
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 w-full sm:w-auto flex justify-end shrink-0">
                        {selectedUnit === 'KG' ? (
                            <button
                                onClick={() => onWeightSelect(product)}
                                className={`
                                    w-full sm:w-auto min-w-[100px] h-8 sm:h-11 px-2 sm:px-4 rounded-lg sm:rounded-xl flex items-center justify-center gap-1 sm:gap-2 transition-all duration-300 font-bold shadow-sm whitespace-nowrap shrink-0
                                    ${quantity > 0
                                        ? 'bg-nature-100 text-nature-700 hover:bg-nature-200 border border-nature-200'
                                        : 'bg-nature-900 text-white hover:bg-nature-800 hover:shadow-lg hover:-translate-y-0.5'
                                    }
                                `}
                            >
                                {quantity > 0 ? (
                                    <>
                                        <span className="text-xs sm:text-lg">{quantity}</span>
                                        <span className="text-[9px] sm:text-xs opacity-70">kg</span>
                                        <Check size={12} className="sm:w-4 sm:h-4 ml-0.5 sm:ml-1" />
                                    </>
                                ) : (
                                    <>
                                        <Scale size={14} className="sm:w-5 sm:h-5" />
                                        <span className="text-[10px] sm:text-base">Scegli</span>
                                    </>
                                )}
                            </button>
                        ) : (
                            // Unit Types
                            quantity > 0 ? (
                                <div className="flex items-center justify-between w-full sm:w-auto bg-white rounded-lg sm:rounded-2xl border border-nature-200 shadow-sm h-8 sm:h-12 p-0.5 sm:p-1">
                                    <button
                                        onClick={() => updateQuantity(product.id, Math.max(0, quantity - 1))}
                                        className="w-6 sm:w-10 h-full flex items-center justify-center text-nature-600 hover:bg-nature-50 rounded-md sm:rounded-xl transition-colors"
                                    >
                                        <Minus size={12} className="sm:w-4 sm:h-4" strokeWidth={3} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onUnitSelect?.(product)}
                                        className="w-8 text-center bg-transparent border-none focus:outline-none outline-none font-bold text-[10px] sm:text-base text-nature-900 hover:text-nature-600 transition-colors py-1 px-0.5"
                                        title="Modifica con tastiera"
                                    >
                                        {quantity}
                                    </button>
                                    <button
                                        onClick={() => updateQuantity(product.id, quantity + 1)}
                                        className="w-6 sm:w-10 h-full flex items-center justify-center text-nature-600 hover:bg-nature-50 rounded-md sm:rounded-xl transition-colors"
                                    >
                                        <Plus size={12} className="sm:w-4 sm:h-4" strokeWidth={3} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => addItem({ ...product, unitType: selectedUnit }, 1)}
                                    className="w-full sm:w-12 h-8 sm:h-12 bg-nature-900 text-white rounded-lg sm:rounded-2xl flex items-center justify-center hover:bg-nature-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 shadow-sm"
                                >
                                    <Plus size={16} className="sm:w-6 sm:h-6" strokeWidth={2.5} />
                                    <span className="ml-1.5 text-[10px] sm:hidden font-bold">Agg.</span>
                                </button>
                            )
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
