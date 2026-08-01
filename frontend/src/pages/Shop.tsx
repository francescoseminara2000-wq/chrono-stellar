import { useEffect, useState, useCallback } from 'react';
import { useCartStore } from '../store/useCartStore';
import { Search, ArrowUp, ArrowDown, ArrowUpDown, X, LayoutGrid, List, Filter } from 'lucide-react';
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
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);

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

    const selectedCategoryName = categories.find(c => c.id.toString() === filterCategory)?.name;

    if (loading) return (
        <div className="flex justify-center items-center h-screen bg-nature-50">
            <div className="animate-pulse flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-nature-200 border-t-nature-600 rounded-full animate-spin"></div>
                <p className="text-nature-900 font-medium">Caricamento raccolto...</p>
            </div>
        </div>
    );

    return (
        <div className="bg-gray-50/50 min-h-screen pb-24">
            {/* Compact Hero Header */}
            <div className="bg-gradient-to-r from-nature-900 via-nature-850 to-emerald-950 text-white py-5 sm:py-7 relative overflow-hidden border-b border-nature-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex items-center justify-between">
                    <div>
                        <h1 className="font-script text-3xl sm:text-5xl text-nature-100 leading-tight">Il Nostro Raccolto</h1>
                        <p className="text-nature-200 text-xs sm:text-sm font-medium mt-0.5 max-w-lg">
                            Frutta e verdura fresca di stagione, coltivata con cura e selezionata ogni giorno.
                        </p>
                    </div>
                </div>
            </div>

            {/* STICKY SEARCH & FILTERS TOOLBAR */}
            <div className="sticky top-[64px] z-30 bg-white/95 backdrop-blur-md border-b border-gray-200/80 shadow-xs transition-all">
                <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5">
                    <div className="flex items-center gap-2">
                        {/* Search Input */}
                        <div className="relative flex-1 min-w-0">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Cerca prodotti..."
                                className="w-full pl-10 pr-8 py-2 rounded-xl bg-gray-100/90 border border-transparent focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all outline-none text-xs sm:text-sm font-medium text-gray-800"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    <X size={15} />
                                </button>
                            )}
                        </div>

                        {/* Dedicated Category Filter Button */}
                        {categories.length > 0 && (
                            <button
                                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all shrink-0 border ${filterCategory
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
                                    }`}
                            >
                                <Filter size={15} />
                                <span className="hidden xs:inline">{selectedCategoryName || 'Categorie'}</span>
                                {filterCategory && (
                                    <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                                )}
                            </button>
                        )}

                        {/* Sort Toggle Button */}
                        <div className="flex items-center gap-1 shrink-0 bg-gray-100 p-1 rounded-xl border border-gray-200">
                            {SORT_OPTIONS.map(s => {
                                const isActive = sortBy === s.key;
                                return (
                                    <button
                                        key={s.key}
                                        onClick={() => {
                                            if (isActive) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
                                            else { setSortBy(s.key); setSortOrder('asc'); }
                                        }}
                                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${isActive
                                            ? 'bg-white text-gray-900 shadow-2xs'
                                            : 'text-gray-500 hover:text-gray-800'
                                            }`}
                                    >
                                        <span>{s.label}</span>
                                        {isActive ? (
                                            sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                        ) : (
                                            <ArrowUpDown size={12} className="opacity-40" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* View Mode Toggle (Grid vs List) */}
                        <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 shrink-0">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-gray-400 hover:text-gray-700'}`}
                                title="Vista a griglia"
                            >
                                <LayoutGrid size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-gray-400 hover:text-gray-700'}`}
                                title="Vista a elenco"
                            >
                                <List size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Expandable Category Selection Drawer/Panel */}
                    {isCategoryOpen && categories.length > 0 && (
                        <div className="pt-3 border-t border-gray-150 mt-2.5 flex flex-wrap gap-1.5 animate-fadeIn">
                            <button
                                onClick={() => { setFilterCategory(''); setIsCategoryOpen(false); }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${filterCategory === ''
                                    ? 'bg-nature-900 text-white shadow-2xs'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                Tutte le categorie
                            </button>
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => {
                                        setFilterCategory(filterCategory === cat.id.toString() ? '' : cat.id.toString());
                                        setIsCategoryOpen(false);
                                    }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${filterCategory === cat.id.toString()
                                        ? 'text-white border-transparent shadow-2xs'
                                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                                        }`}
                                    style={filterCategory === cat.id.toString()
                                        ? { backgroundColor: cat.color }
                                        : {}
                                    }
                                >
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: filterCategory === cat.id.toString() ? 'white' : cat.color }}></span>
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mt-3">
                {/* Horizontal Quick Category Pills Scroll */}
                {categories.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-4">
                        <button
                            onClick={() => setFilterCategory('')}
                            className={`px-4 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all shrink-0 ${filterCategory === ''
                                ? 'bg-nature-900 text-white shadow-2xs'
                                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            Tutti
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setFilterCategory(filterCategory === cat.id.toString() ? '' : cat.id.toString())}
                                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all shrink-0 border ${filterCategory === cat.id.toString()
                                    ? 'text-white border-transparent shadow-2xs'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                    }`}
                                style={filterCategory === cat.id.toString()
                                    ? { backgroundColor: cat.color }
                                    : {}
                                }
                            >
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: filterCategory === cat.id.toString() ? 'white' : cat.color }}></span>
                                {cat.name}
                            </button>
                        ))}
                    </div>
                )}

                {/* Active Filter Indicator */}
                {filterCategory && (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 mb-4">
                        <span className="text-xs font-bold text-emerald-800">
                            Filtro attivo: <span className="font-black">{selectedCategoryName}</span>
                        </span>
                        <button
                            onClick={() => setFilterCategory('')}
                            className="text-xs text-emerald-700 font-black hover:underline flex items-center gap-1"
                        >
                            Mostra tutti <X size={14} />
                        </button>
                    </div>
                )}

                {/* Product List / Grid */}
                {products.length > 0 ? (
                    <div className={viewMode === 'grid'
                        ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-5"
                        : "flex flex-col gap-2.5"
                    }>
                        {products.map(product => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                onWeightSelect={setSelectedProductForWeight}
                                onUnitSelect={setSelectedProductForUnit}
                                viewMode={viewMode}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200 my-6">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Search size={28} className="text-gray-300" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Nessun prodotto trovato</h3>
                        <p className="text-xs text-gray-500">Prova a cercare qualcos'altro o resetta i filtri.</p>
                        <button
                            onClick={() => { setSearchTerm(''); setFilterCategory(''); }}
                            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl font-black text-xs shadow-2xs hover:bg-emerald-700"
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
