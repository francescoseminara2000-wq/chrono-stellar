import React, { useEffect, useState, useCallback } from 'react';
import { useCartStore } from '../store/useCartStore';
import { Search, ArrowUp, ArrowDown, ArrowUpDown, X } from 'lucide-react';
import { WeightSelectorDrawer } from '../components/WeightSelectorDrawer';
import { QuantitySelectorDrawer } from '../components/QuantitySelectorDrawer';
import { ProductCard } from '../components/ProductCard';

interface Category {
    id: number;
    name: string;
    color: string;
}

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
    categoryId?: number;
    category?: { id: number; name: string; color: string };
}

const API_URL = '';

export const Shop = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('');
    const [sortBy, setSortBy] = useState<string>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const { items, addItem, updateItemUnit } = useCartStore();
    const [selectedProductForWeight, setSelectedProductForWeight] = useState<Product | null>(null);
    const [selectedProductForUnit, setSelectedProductForUnit] = useState<Product | null>(null);

    const getProductQuantity = (productId: number) => {
        const item = items.find(i => i.id === productId);
        return item ? item.quantity : 0;
    };

    const fetchProducts = useCallback(() => {
        const params = new URLSearchParams();
        if (filterCategory) params.append('categoryId', filterCategory);
        if (searchTerm) params.append('search', searchTerm);
        if (sortBy) params.append('sortBy', sortBy);
        if (sortOrder) params.append('sortOrder', sortOrder);

        const queryString = params.toString();
        const url = `/api/products${queryString ? `?${queryString}` : ''}`;

        fetch(url)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setProducts(data);
                else setProducts([]);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching products:', err);
                setLoading(false);
            });
    }, [filterCategory, searchTerm, sortBy, sortOrder]);

    useEffect(() => {
        fetch(`${API_URL}/api/categories`)
            .then(res => res.json())
            .then(data => { if (Array.isArray(data)) setCategories(data); })
            .catch(() => { });
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const SORT_OPTIONS = [
        { key: 'name', label: 'A-Z' },
        { key: 'price', label: 'Prezzo' },
    ];

    if (loading) return (
        <div className="flex justify-center items-center h-screen bg-nature-50">
            <div className="animate-pulse flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-nature-200 border-t-nature-600 rounded-full animate-spin"></div>
                <p className="text-nature-900 font-medium">Caricamento raccolto...</p>
            </div>
        </div>
    );

    return (
        <div className="bg-gray-50/50 min-h-screen pb-20">
            {/* Hero Header */}
            <div className="bg-nature-900 text-white py-16 md:py-24 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 pattern-dots"></div>
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-nature-800 rounded-full blur-3xl opacity-50"></div>
                <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-nature-700/50 rounded-full blur-3xl opacity-50"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="max-w-2xl">
                        <h1 className="font-script text-5xl md:text-7xl mb-4 text-nature-100">Il Nostro Raccolto</h1>
                        <p className="text-nature-200 text-lg md:text-xl leading-relaxed">
                            Esplora la nostra selezione di frutta e verdura di stagione.
                            Coltivata con passione, raccolta al momento giusto e portata direttamente sulla tua tavola.
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
                {/* Search & Sort Bar */}
                <div className="bg-white rounded-2xl shadow-xl p-4 md:p-6 mb-6 flex flex-col md:flex-row justify-between items-center gap-4 border border-gray-100/50 backdrop-blur-sm">
                    {/* Search */}
                    <div className="relative w-full md:w-96 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-nature-500 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Cerca tra i prodotti..."
                            className="w-full pl-12 pr-10 py-3 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-nature-500 focus:ring-4 focus:ring-nature-500/10 transition-all duration-300 outline-none placeholder:text-gray-400 font-medium text-gray-700"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Sort Controls */}
                    <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap shrink-0">Ordina:</span>
                        {SORT_OPTIONS.map(s => {
                            const isActive = sortBy === s.key;
                            return (
                                <button
                                    key={s.key}
                                    onClick={() => {
                                        if (isActive) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
                                        else { setSortBy(s.key); setSortOrder('asc'); }
                                    }}
                                    className={`flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap shrink-0 ${isActive
                                        ? 'bg-nature-900 text-white shadow-lg shadow-nature-900/20'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    {s.label}
                                    {isActive ? (
                                        sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                                    ) : (
                                        <ArrowUpDown size={14} className="opacity-40" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Category Pills */}
                {categories.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-8">
                        <button
                            onClick={() => setFilterCategory('')}
                            className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all shrink-0 ${filterCategory === ''
                                ? 'bg-nature-900 text-white shadow-lg shadow-nature-900/20'
                                : 'bg-white text-gray-600 border border-gray-200 hover:border-nature-300 hover:text-nature-700'
                                }`}
                        >
                            Tutti i prodotti
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setFilterCategory(filterCategory === cat.id.toString() ? '' : cat.id.toString())}
                                className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all shrink-0 border ${filterCategory === cat.id.toString()
                                    ? 'text-white shadow-lg border-transparent'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-opacity-50'
                                    }`}
                                style={filterCategory === cat.id.toString()
                                    ? { backgroundColor: cat.color, borderColor: cat.color }
                                    : { '--hover-color': cat.color } as React.CSSProperties
                                }
                            >
                                <div
                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: filterCategory === cat.id.toString() ? 'rgba(255,255,255,0.7)' : cat.color }}
                                ></div>
                                {cat.name}
                            </button>
                        ))}
                    </div>
                )}

                {/* Product Grid */}
                {products.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 md:gap-8">
                        {products.map(product => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                onWeightSelect={setSelectedProductForWeight}
                                onUnitSelect={setSelectedProductForUnit}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search size={32} className="text-gray-300" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Nessun prodotto trovato</h3>
                        <p className="text-gray-500">Prova a cercare qualcos'altro o cambia i filtri.</p>
                        <button
                            onClick={() => { setSearchTerm(''); setFilterCategory(''); }}
                            className="mt-6 text-nature-600 font-bold hover:underline"
                        >
                            Mostra tutto il raccolto
                        </button>
                    </div>
                )}
            </div>

            {/* Weight Selector Drawer */}
            <WeightSelectorDrawer
                isOpen={!!selectedProductForWeight}
                onClose={() => setSelectedProductForWeight(null)}
                productName={selectedProductForWeight?.name || ''}
                currentWeight={selectedProductForWeight ? getProductQuantity(selectedProductForWeight.id) : 0}
                unitPrice={selectedProductForWeight?.priceCents || 0}
                onConfirm={(weight) => {
                    if (selectedProductForWeight) {
                        const product = selectedProductForWeight;
                        if (getProductQuantity(product.id) === 0) {
                            addItem({
                                id: product.id,
                                name: product.name,
                                priceCents: product.priceCents,
                                unitType: 'KG',
                                isVariableWeight: product.isVariableWeight,
                                stepAmount: product.stepAmount,
                                imageUrl: product.imageUrl
                            }, weight);
                        } else {
                            updateItemUnit(product.id, 'KG', weight);
                        }
                    }
                }}
            />

            {/* Quantity Selector Drawer */}
            <QuantitySelectorDrawer
                isOpen={!!selectedProductForUnit}
                onClose={() => setSelectedProductForUnit(null)}
                productName={selectedProductForUnit?.name || ''}
                currentQty={selectedProductForUnit ? getProductQuantity(selectedProductForUnit.id) : 0}
                unitPrice={selectedProductForUnit?.priceCents || 0}
                unitType={selectedProductForUnit && selectedProductForUnit.unitType === 'KG' ? 'PZ' : (selectedProductForUnit?.unitType as any || 'PZ')}
                onConfirm={(qty) => {
                    if (selectedProductForUnit) {
                        const product = selectedProductForUnit;
                        const unit = product.unitType === 'KG' ? 'PZ' : product.unitType;
                        if (getProductQuantity(product.id) === 0) {
                            addItem({
                                id: product.id,
                                name: product.name,
                                priceCents: product.priceCents,
                                unitType: unit as any,
                                isVariableWeight: product.isVariableWeight,
                                stepAmount: product.stepAmount,
                                imageUrl: product.imageUrl
                            }, qty);
                        } else {
                            updateItemUnit(product.id, unit as any, qty);
                        }
                    }
                }}
            />
        </div>
    );
};
