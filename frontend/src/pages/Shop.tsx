import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';
import { Search, X, LayoutGrid, List, SlidersHorizontal, Check, RotateCcw } from 'lucide-react';
import { WeightSelectorDrawer } from '../components/WeightSelectorDrawer';
import { QuantitySelectorDrawer } from '../components/QuantitySelectorDrawer';
import { ProductCard } from '../components/ProductCard';
import { motion, AnimatePresence } from 'framer-motion';
import { AppleLoader } from '../components/ui/AppleLoader';
import { useAppState } from '../store/useAppState';

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
    origin?: string;
    caliber?: string;
    commercialCategory?: string;
    categoryId?: number;
    category?: { id: number; name: string; color: string };
}

const API_URL = '';

export const Shop = () => {
    const [searchParams] = useSearchParams();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('');
    const [sortBy, setSortBy] = useState<string>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

    const { items, addItem, updateItemUnit } = useCartStore();
    const [selectedProductForWeight, setSelectedProductForWeight] = useState<Product | null>(null);
    const [selectedProductForUnit, setSelectedProductForUnit] = useState<Product | null>(null);

    const getProductQuantity = (productId: number) => {
        const item = items.find(i => i.id === productId);
        return item ? item.quantity : 0;
    };

    const { settings } = useAppState();
    const minDurationMs = Math.max(2000, ((settings?.appleLoaderMinDuration ?? 2) * 1000));

    const fetchProducts = useCallback(() => {
        setLoading(true);
        const startTime = Date.now();
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
            })
            .catch(err => {
                console.error('Error fetching products:', err);
            })
            .finally(() => {
                const elapsed = Date.now() - startTime;
                const delay = Math.max(0, minDurationMs - elapsed);
                setTimeout(() => {
                    setLoading(false);
                }, delay);
            });
    }, [filterCategory, searchTerm, sortBy, sortOrder, minDurationMs]);

    useEffect(() => {
        fetch(`${API_URL}/api/categories`)
            .then(res => res.json())
            .then(data => { if (Array.isArray(data)) setCategories(data); })
            .catch(() => { });
    }, []);

    useEffect(() => {
        const catName = searchParams.get('category');
        const catId = searchParams.get('categoryId');
        if (catId) {
            setFilterCategory(catId);
        } else if (catName && categories.length > 0) {
            const found = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
            if (found) {
                setFilterCategory(found.id.toString());
            }
        }
    }, [searchParams, categories]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const isFilterActive = Boolean(filterCategory || sortBy !== 'name' || sortOrder !== 'asc');
    const selectedCategoryObj = categories.find(c => c.id.toString() === filterCategory);

    const renderFilterControls = (isSidebar: boolean = false) => (
        <div className="space-y-5">
            {/* Category Section */}
            <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider block">
                        Filtra per Categoria
                    </span>
                    {filterCategory && (
                        <button
                            onClick={() => setFilterCategory('')}
                            className="text-[11px] text-emerald-700 font-bold hover:underline cursor-pointer"
                        >
                            Tutte
                        </button>
                    )}
                </div>
                <div className={isSidebar ? "flex flex-col gap-1.5 max-h-[320px] overflow-y-auto pr-1" : "flex flex-wrap gap-2"}>
                    <button
                        onClick={() => setFilterCategory('')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between border cursor-pointer ${filterCategory === ''
                            ? 'bg-nature-900 text-white border-nature-900 shadow-2xs font-black'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                            }`}
                    >
                        <span className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                            <span>Tutte le categorie</span>
                        </span>
                        {filterCategory === '' && <Check size={14} />}
                    </button>
                    {categories.map(cat => {
                        const isSelected = filterCategory === cat.id.toString();
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setFilterCategory(isSelected ? '' : cat.id.toString())}
                                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between border cursor-pointer ${isSelected
                                    ? 'text-white border-transparent shadow-2xs font-black'
                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300'
                                    }`}
                                style={isSelected ? { backgroundColor: cat.color || '#10b981' } : {}}
                            >
                                <span className="flex items-center gap-2 truncate">
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: isSelected ? 'white' : (cat.color || '#10b981') }}></span>
                                    <span className="truncate">{cat.name}</span>
                                </span>
                                {isSelected && <Check size={14} className="shrink-0 ml-1" />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Sorting Section */}
            <div className="space-y-2.5">
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider block">
                    Ordina I Prodotti
                </span>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => { setSortBy('name'); setSortOrder('asc'); }}
                        className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${sortBy === 'name' && sortOrder === 'asc'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-black shadow-2xs'
                            : 'bg-gray-50 border-gray-200 text-gray-700 font-bold hover:bg-gray-100'
                            }`}
                    >
                        <span className="text-xs block">Nome (A-Z)</span>
                        <span className="text-[10px] text-gray-400 font-normal">Alfabetico cresc.</span>
                    </button>

                    <button
                        onClick={() => { setSortBy('name'); setSortOrder('desc'); }}
                        className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${sortBy === 'name' && sortOrder === 'desc'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-black shadow-2xs'
                            : 'bg-gray-50 border-gray-200 text-gray-700 font-bold hover:bg-gray-100'
                            }`}
                    >
                        <span className="text-xs block">Nome (Z-A)</span>
                        <span className="text-[10px] text-gray-400 font-normal">Alfabetico decresc.</span>
                    </button>

                    <button
                        onClick={() => { setSortBy('price'); setSortOrder('asc'); }}
                        className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${sortBy === 'price' && sortOrder === 'asc'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-black shadow-2xs'
                            : 'bg-gray-50 border-gray-200 text-gray-700 font-bold hover:bg-gray-100'
                            }`}
                    >
                        <span className="text-xs block">Prezzo (€ ↑)</span>
                        <span className="text-[10px] text-gray-400 font-normal">Dal più economico</span>
                    </button>

                    <button
                        onClick={() => { setSortBy('price'); setSortOrder('desc'); }}
                        className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${sortBy === 'price' && sortOrder === 'desc'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-black shadow-2xs'
                            : 'bg-gray-50 border-gray-200 text-gray-700 font-bold hover:bg-gray-100'
                            }`}
                    >
                        <span className="text-xs block">Prezzo (€ ↓)</span>
                        <span className="text-[10px] text-gray-400 font-normal">Dal più caro</span>
                    </button>
                </div>
            </div>

            {/* Quick Reset if active */}
            {isFilterActive && (
                <div className="pt-2">
                    <button
                        onClick={() => {
                            setFilterCategory('');
                            setSortBy('name');
                            setSortOrder('asc');
                            setSearchTerm('');
                        }}
                        className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                        <RotateCcw size={13} />
                        <span>Reimposta Filtri</span>
                    </button>
                </div>
            )}
        </div>
    );

    if (loading) return (
        <div className="flex justify-center items-center min-h-[70vh] bg-nature-50/40">
            <AppleLoader 
                size="lg" 
                text="Caricamento del banco ortofrutta..." 
                subtext="Stiamo selezionando i migliori prodotti freschi di giornata" 
            />
        </div>
    );

    return (
        <div className="bg-gray-50/50 min-h-screen pb-24">
            {/* STICKY SEARCH & CONTROL BAR - Soft emerald non-white container background, clean white inputs */}
            <div className="sticky top-[56px] sm:top-[60px] md:top-[64px] z-30 bg-emerald-50/95 backdrop-blur-md border-b border-emerald-200/80 shadow-xs transition-all">
                <div className="max-w-[1720px] mx-auto px-3 sm:px-6 lg:px-8 py-2">
                    <div className="flex items-center gap-2">
                        {/* Search Input - Clean White Card */}
                        <div className="relative flex-1 min-w-0">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Cerca tra i prodotti..."
                                className="w-full pl-10 pr-8 py-2.5 rounded-2xl bg-white border border-emerald-200/70 text-gray-900 placeholder:text-gray-400 font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all outline-none text-xs sm:text-sm shadow-2xs"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {/* Dedicated Filter & Sort Icon Button (Visible on mobile/tablet, hidden on desktop where sidebar is displayed) */}
                        <button
                            onClick={() => setIsFilterModalOpen(true)}
                            className={`lg:hidden relative p-2.5 rounded-2xl flex items-center justify-center transition-all cursor-pointer shrink-0 border shadow-2xs ${isFilterActive
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white hover:bg-emerald-100/50 text-gray-700 border-emerald-200/70'
                                }`}
                            title="Filtri e Ordinamento"
                        >
                            <SlidersHorizontal size={18} />
                            {isFilterActive && (
                                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-white animate-pulse"></span>
                            )}
                        </button>

                        {/* View Mode Toggle Button */}
                        <div className="flex items-center bg-white p-1 rounded-2xl border border-emerald-200/70 shrink-0 shadow-2xs">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-xl transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-gray-400 hover:text-gray-700'}`}
                                title="Vista a griglia"
                            >
                                <LayoutGrid size={17} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded-xl transition-all cursor-pointer ${viewMode === 'list' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-gray-400 hover:text-gray-700'}`}
                                title="Vista a elenco"
                            >
                                <List size={17} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Compact Intro Header */}
            <div className="bg-gradient-to-r from-nature-900 via-nature-850 to-emerald-950 text-white py-4 sm:py-5 border-b border-nature-800">
                <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
                    <div>
                        <h1 className="font-script text-2xl sm:text-4xl text-nature-100 leading-tight">Il Nostro Raccolto</h1>
                        <p className="text-nature-200 text-[11px] sm:text-xs font-medium mt-0.5">
                            Frutta e verdura fresca di stagione selezionata ogni giorno per te.
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content Area: Products on Left, Filters Sidebar on Right on Desktop */}
            <div className="max-w-[1720px] mx-auto px-3 sm:px-6 lg:px-8 mt-4">
                <div className="flex flex-col lg:flex-row items-start gap-6">
                    {/* LEFT COLUMN: Products Grid & Active Filter Pills */}
                    <main className="flex-1 min-w-0 w-full">
                        {/* Active Filters Bar (If filter is set) */}
                        {filterCategory && (
                            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-150 rounded-2xl px-3.5 py-2 mb-3.5 shadow-2xs">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedCategoryObj?.color || '#10b981' }}></span>
                                    <span className="text-xs font-bold text-emerald-900">
                                        Categoria: <span className="font-black">{selectedCategoryObj?.name}</span>
                                    </span>
                                    <span className="text-[11px] text-emerald-600 font-medium">
                                        ({products.length} {products.length === 1 ? 'prodotto' : 'prodotti'})
                                    </span>
                                </div>
                                <button
                                    onClick={() => setFilterCategory('')}
                                    className="text-xs text-emerald-700 font-black hover:underline flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-emerald-200 cursor-pointer"
                                >
                                    Mostra tutti <X size={13} />
                                </button>
                            </div>
                        )}

                        {/* Product List / Grid */}
                        {products.length > 0 ? (
                            <div className={viewMode === 'grid'
                                ? "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5"
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
                                    className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl font-black text-xs shadow-2xs hover:bg-emerald-700 cursor-pointer"
                                >
                                    Mostra tutto il raccolto
                                </button>
                            </div>
                        )}
                    </main>

                    {/* RIGHT COLUMN: Desktop Filters & Sorting Sidebar */}
                    <aside className="hidden lg:block w-72 xl:w-80 shrink-0 sticky top-[124px] self-start">
                        <div className="bg-white rounded-3xl p-5 border border-emerald-150/80 shadow-xs space-y-4">
                            {/* Sidebar Header */}
                            <div className="flex items-center justify-between pb-3.5 border-b border-gray-100">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                                        <SlidersHorizontal size={16} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-sm text-gray-900 leading-tight">Filtri e Ordina</h3>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Personalizza il raccolto</span>
                                    </div>
                                </div>
                                {isFilterActive && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                                        Attivi
                                    </span>
                                )}
                            </div>

                            {/* Sidebar Filter & Sort Controls */}
                            {renderFilterControls(true)}
                        </div>
                    </aside>
                </div>
            </div>

            {/* DEDICATED FILTER & SORT MODAL (MOBILE / TABLET) */}
            <AnimatePresence>
                {isFilterModalOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsFilterModalOpen(false)}
                            className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[110]"
                        />

                        {/* Modal Panel */}
                        <motion.div
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                            className="fixed bottom-0 inset-x-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md z-[111] bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[85vh] flex flex-col justify-between border border-gray-150"
                        >
                            <div>
                                {/* Modal Header */}
                                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                                            <SlidersHorizontal size={18} />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-lg text-gray-900 leading-tight">Filtri e Ordinamento</h3>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Personalizza il raccolto</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsFilterModalOpen(false)}
                                        className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-all cursor-pointer"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Modal Controls */}
                                <div className="py-2">
                                    {renderFilterControls(false)}
                                </div>
                            </div>

                            {/* Modal Actions */}
                            <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3 mt-4">
                                <button
                                    onClick={() => {
                                        setFilterCategory('');
                                        setSortBy('name');
                                        setSortOrder('asc');
                                        setSearchTerm('');
                                    }}
                                    className="px-4 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                    <RotateCcw size={14} />
                                    <span>Reset</span>
                                </button>
                                <button
                                    onClick={() => setIsFilterModalOpen(false)}
                                    className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all text-center cursor-pointer"
                                >
                                    Mostra Risultati ({products.length})
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

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
