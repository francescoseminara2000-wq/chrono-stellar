import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, Upload, Eye, EyeOff, Infinity as InfinityIcon, PackageX, X, Save, Info, ArrowUpDown, ArrowUp, ArrowDown, BarChart2, PackagePlus, ListFilter, Sliders, Tag, Euro, FileText, ChefHat, Scale, Package, AlertTriangle, Image, Check } from 'lucide-react';

import { sanitizeImageUrl } from '../../utils/imageUrl';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import { ConfirmModal } from '../../components/admin/ConfirmModal';
import { ProductStatsModal } from '../../components/admin/ProductStatsModal';
import { QuickStockModal } from '../../components/admin/QuickStockModal';

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
    stockQuantity: number;
    lowStockThreshold: number;
    allowBackorder: boolean;
    seasonalTips?: string;
    categoryId?: number;
    category?: { id: number, name: string, color: string };
}

export const ProductManager = () => {
    const { token } = useAuthStore();
    const [products, setProducts] = useState<Product[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isQuickStockOpen, setIsQuickStockOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [viewingStatsProduct, setViewingStatsProduct] = useState<Product | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
    const [showSearch, setShowSearch] = useState(false);
    const [showFilter, setShowFilter] = useState(false);
    const [showSort, setShowSort] = useState(false);
    const [mobileQuickEditId, setMobileQuickEditId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'base' | 'pricing'>('base');

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        unitType: 'KG',
        isVariableWeight: false,
        stepAmount: '1',
        stockQuantity: '0',
        lowStockThreshold: '0',
        allowBackorder: false,
        seasonalTips: '',
        categoryId: '',
        image: null as File | null
    });

    const API_URL = '';
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [quickEditData, setQuickEditData] = useState<Record<number, { price?: string, stockQuantity?: string }>>({});
    const [categories, setCategories] = useState<any[]>([]);
    const [filterCategory, setFilterCategory] = useState<string>('');
    const [search, setSearch] = useState<string>('');
    const [sortBy, setSortBy] = useState<string>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    const fetchProducts = useCallback(() => {
        const params = new URLSearchParams();
        if (filterCategory) params.append('categoryId', filterCategory);
        if (search) params.append('search', search);
        if (sortBy) params.append('sortBy', sortBy);
        if (sortOrder) params.append('sortOrder', sortOrder);

        const queryString = params.toString();
        const url = `/api/admin/products${queryString ? `?${queryString}` : ''}`;

        fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setProducts(data);
                else setProducts([]);
            })
            .catch(err => {
                console.error('Error:', err);
                setProducts([]);
            });
    }, [token, filterCategory, search, sortBy, sortOrder]);

    const fetchCategories = useCallback(() => {
        fetch(`${API_URL}/api/admin/categories`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => { if (Array.isArray(data)) setCategories(data); })
            .catch(err => console.error('Error fetching categories:', err));
    }, [token]);

    useEffect(() => {
        if (token) {
            fetchProducts();
            fetchCategories();
        }
    }, [fetchProducts, fetchCategories]);

    const toggleSelectAll = () => {
        if (selectedIds.length === products.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(products.map(p => p.id));
        }
    };

    const toggleSelect = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = async (force = false) => {
        if (!force) {
            setConfirmModal({
                isOpen: true,
                title: 'Elimina Prodotti',
                message: `Sei sicuro di voler eliminare ${selectedIds.length} prodotti? Questa azione non può essere annullata.`,
                onConfirm: () => handleBulkDelete(true)
            });
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/admin/products/bulk`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ids: selectedIds })
            });

            if (res.ok) {
                fetchProducts();
                setSelectedIds([]);
            }
        } catch (error) {
            console.error('Bulk delete error:', error);
        }
    };

    const handleDelete = async (id: number, force = false) => {
        if (!force) {
            setConfirmModal({
                isOpen: true,
                title: 'Elimina Prodotto',
                message: 'Sei sicuro di voler eliminare questo prodotto? Questa azione non può essere annullata.',
                onConfirm: () => handleDelete(id, true)
            });
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/admin/products/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) fetchProducts();
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    const handleBulkUpdate = async (updateData: any) => {
        try {
            const res = await fetch(`${API_URL}/api/admin/products/bulk`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ids: selectedIds, data: updateData })
            });

            if (res.ok) {
                fetchProducts();
                setSelectedIds([]);
            }
        } catch (error) {
            console.error('Bulk update error:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const data = new FormData();
        data.append('name', formData.name);
        data.append('description', formData.description);
        // Convert price to cents needed by backend
        const priceCents = Math.round(parseFloat(formData.price.replace(',', '.')) * 100);
        data.append('priceCents', priceCents.toString());
        data.append('unitType', formData.unitType);
        data.append('isVariableWeight', String(formData.isVariableWeight));
        data.append('stepAmount', formData.stepAmount);
        data.append('stockQuantity', formData.stockQuantity);
        data.append('lowStockThreshold', formData.lowStockThreshold);
        data.append('allowBackorder', String(formData.allowBackorder));
        data.append('seasonalTips', formData.seasonalTips);
        data.append('categoryId', formData.categoryId);
        if (formData.image) {
            data.append('image', formData.image);
        }

        const url = editingProduct
            ? `/api/admin/products/${editingProduct.id}`
            : `/api/admin/products`;

        const method = editingProduct ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Authorization': `Bearer ${token}` },
            body: data
        });

        if (res.ok) {
            setIsModalOpen(false);
            setEditingProduct(null);
            resetForm();
            fetchProducts();
        }
    };

    const handleInlineUpdate = async (id: number) => {
        const updates = quickEditData[id];
        if (!updates) return;

        const body: any = {};
        if (updates.price !== undefined) {
            body.priceCents = Math.round(parseFloat(updates.price.replace(',', '.')) * 100);
        }
        if (updates.stockQuantity !== undefined) {
            body.stockQuantity = parseFloat(updates.stockQuantity.replace(',', '.'));
        }

        try {
            const res = await fetch(`${API_URL}/api/admin/products/${id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                setQuickEditData(prev => {
                    const newData = { ...prev };
                    delete newData[id];
                    return newData;
                });
                fetchProducts();
            }
        } catch (error) {
            console.error('Inline update error:', error);
        }
    };



    // ...

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            description: product.description || '',
            price: (product.priceCents / 100).toString(),
            unitType: product.unitType,
            isVariableWeight: product.isVariableWeight,
            stepAmount: product.stepAmount.toString(),
            stockQuantity: product.stockQuantity.toString(),
            lowStockThreshold: product.lowStockThreshold.toString(),
            allowBackorder: product.allowBackorder,
            seasonalTips: product.seasonalTips || '',
            categoryId: product.categoryId?.toString() || '',
            image: null
        });
        setActiveTab('base');
        setIsModalOpen(true);
    };


    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            price: '',
            unitType: 'KG',
            isVariableWeight: false,
            stepAmount: '1',
            stockQuantity: '0',
            lowStockThreshold: '0',
            allowBackorder: false,
            seasonalTips: '',
            categoryId: '',
            image: null
        });
        setActiveTab('base');
    };

    return (
        <div className="-m-5 lg:-m-8 p-5 lg:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 lg:mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Gestione Prodotti</h1>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:items-center sm:gap-3 w-full sm:w-auto">
                    <button
                        onClick={() => setIsQuickStockOpen(true)}
                        className="bg-white border-2 border-nature-600 text-nature-700 px-2 py-3 rounded-2xl flex items-center justify-center gap-1.5 hover:bg-nature-50 transition-all font-bold text-[11px] xs:text-xs sm:text-sm lg:text-base min-w-0 w-full"
                    >
                        <PackagePlus size={16} className="shrink-0" />
                        <span className="truncate">Rifornimento Rapido</span>
                    </button>
                    <button
                        onClick={() => { setEditingProduct(null); resetForm(); setIsModalOpen(true); }}
                        className="bg-nature-600 text-white px-2 py-3 rounded-2xl flex items-center justify-center gap-1.5 hover:bg-nature-700 transition-all shadow-lg shadow-nature-200 font-bold text-[11px] xs:text-xs sm:text-sm lg:text-base min-w-0 w-full"
                    >
                        <Plus size={16} className="shrink-0" />
                        <span className="truncate">Nuovo Prodotto</span>
                    </button>
                </div>
            </div>

            {/* Mobile Toolbar Toggle Buttons */}
            <div className="flex lg:hidden gap-2 mb-4">
                <button
                    onClick={() => {
                        setShowSearch(!showSearch);
                        setShowFilter(false);
                        setShowSort(false);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                        showSearch || search
                            ? 'bg-nature-600 text-white border-transparent shadow-sm'
                            : 'bg-white text-gray-500 border-gray-200 shadow-sm'
                    }`}
                >
                    <Search size={14} />
                    <span>Cerca</span>
                    {search && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>}
                </button>
                <button
                    onClick={() => {
                        setShowFilter(!showFilter);
                        setShowSearch(false);
                        setShowSort(false);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                        showFilter || filterCategory
                            ? 'bg-nature-600 text-white border-transparent shadow-sm'
                            : 'bg-white text-gray-500 border-gray-200 shadow-sm'
                    }`}
                >
                    <ListFilter size={14} />
                    <span>Filtra</span>
                    {filterCategory && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>}
                </button>
                <button
                    onClick={() => {
                        setShowSort(!showSort);
                        setShowSearch(false);
                        setShowFilter(false);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                        showSort
                            ? 'bg-nature-600 text-white border-transparent shadow-sm'
                            : 'bg-white text-gray-500 border-gray-200 shadow-sm'
                    }`}
                >
                    <ArrowUpDown size={14} />
                    <span>Ordina</span>
                </button>
            </div>

            {/* Search Input Panel */}
            <div className={`${showSearch ? 'block' : 'hidden'} lg:block mb-4`}>
                <div className="relative w-full">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Cerca prodotto..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-gray-200 bg-white text-sm font-medium focus:ring-2 focus:ring-nature-500/20 outline-none transition-all"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Sort Controls Panel */}
            <div className={`${showSort ? 'block' : 'hidden'} lg:block mb-4`}>
                <div className="flex gap-2 flex-wrap">
                    {[
                        { key: 'name', label: 'Nome' },
                        { key: 'price', label: 'Prezzo' },
                        { key: 'stock', label: 'Scorta' },
                    ].map(s => {
                        const isActive = sortBy === s.key;
                        return (
                            <button
                                key={s.key}
                                onClick={() => {
                                    if (isActive) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
                                    else { setSortBy(s.key); setSortOrder('asc'); }
                                }}
                                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all border ${isActive
                                    ? 'bg-nature-600 text-white border-transparent shadow-md shadow-nature-200'
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-nature-300 hover:text-nature-700'
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

            {/* Category Filter Pills */}
            <div className={`flex gap-2 bg-gray-100/50 p-2 rounded-[2rem] border border-gray-200 mb-4 lg:mb-8 overflow-x-auto custom-scrollbar no-scrollbar whitespace-nowrap ${showFilter ? 'block' : 'hidden'} lg:flex`}>
                <button
                    onClick={() => setFilterCategory('')}
                    className={`
                        px-6 py-2.5 rounded-[1.5rem] font-bold text-sm transition-all
                        ${filterCategory === ''
                            ? 'bg-white text-nature-900 shadow-sm ring-1 ring-black/5'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                        }
                    `}
                >
                    Tutti i Prodotti
                </button>
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setFilterCategory(cat.id.toString())}
                        className={`
                            flex items-center gap-2 px-6 py-2.5 rounded-[1.5rem] font-bold text-sm transition-all
                            ${filterCategory === cat.id.toString()
                                ? 'bg-white text-nature-900 shadow-sm ring-1 ring-black/5'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                            }
                        `}
                    >
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }}></div>
                        {cat.name}
                    </button>
                ))}
            </div>


            {/* Responsive Table (Desktop / Tablet) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-w-0 hidden lg:block">
                <div className="overflow-x-auto w-full" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 18rem)' }}>
                    <table className="min-w-[800px] w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                        <colgroup><col style={{ width: '3%' }} /><col style={{ width: '30%' }} /><col style={{ width: '13%' }} /><col style={{ width: '12%' }} /><col style={{ width: '12%' }} /><col style={{ width: '10%' }} /><col style={{ width: '8%' }} /></colgroup>
                        <thead className="sticky top-0 z-10" style={{ position: 'sticky', top: 0 }}>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="py-3 pl-5 pr-0">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.length === products.length && products.length > 0}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 text-nature-600 rounded focus:ring-nature-500 cursor-pointer"
                                    />
                                </th>
                                <th className="py-3 px-8 text-left text-xs font-black text-gray-400 uppercase tracking-wider">Prodotto</th>
                                <th className="py-3 px-8 text-left text-xs font-black text-gray-400 uppercase tracking-wider">Categoria</th>
                                <th className="py-3 px-8 text-left text-xs font-black text-gray-400 uppercase tracking-wider">Prezzo</th>
                                <th className="py-3 px-8 text-left text-xs font-black text-gray-400 uppercase tracking-wider">Scorta</th>
                                <th className="py-3 px-8 text-left text-xs font-black text-gray-400 uppercase tracking-wider">Stato</th>
                                <th className="py-3 pl-8 pr-8 text-right text-xs font-black text-gray-400 uppercase tracking-wider">Azioni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {products.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center">
                                        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                            <Plus size={28} className="text-gray-300" />
                                        </div>
                                        <p className="text-gray-400 font-medium">Nessun prodotto trovato.</p>
                                        <p className="text-gray-300 text-sm mt-1">Prova a cambiare i filtri o aggiungi un nuovo prodotto.</p>
                                    </td>
                                </tr>
                            )}
                            {products.map(product => {
                                const hasChanges = quickEditData[product.id];
                                const currentPrice = hasChanges?.price !== undefined ? hasChanges.price : (product.priceCents / 100).toFixed(2);
                                const currentStock = hasChanges?.stockQuantity !== undefined ? hasChanges.stockQuantity : product.stockQuantity.toString();

                                // Stock health
                                const stockNum = parseFloat(currentStock) || 0;
                                const threshold = product.lowStockThreshold || 1;
                                const stockPct = Math.min((stockNum / (threshold * 3)) * 100, 100);
                                const isLow = !product.allowBackorder && stockNum <= threshold && stockNum > 0;
                                const isEmpty = !product.allowBackorder && stockNum <= 0;
                                const stockColor = isEmpty ? '#ef4444' : isLow ? '#f59e0b' : '#10b981';

                                return (
                                    <tr
                                        key={product.id}
                                        className={`hover:bg-blue-50/30 transition-colors group ${selectedIds.includes(product.id) ? 'bg-nature-50/40' : 'even:bg-gray-50/50'
                                            }`}
                                    >
                                        {/* Checkbox */}
                                        <td className="py-4 pl-5 pr-0 align-middle">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(product.id)}
                                                onChange={() => toggleSelect(product.id)}
                                                className="w-4 h-4 text-nature-600 rounded focus:ring-nature-500 cursor-pointer"
                                            />
                                        </td>

                                        {/* Product */}
                                        <td className="py-4 px-8 align-middle">
                                            <div className="flex items-center gap-3">
                                                {/* Image */}
                                                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-gray-100 bg-gray-50 relative">
                                                    {product.imageUrl ? (
                                                        <img
                                                            src={sanitizeImageUrl(product.imageUrl)}
                                                            alt={product.name}
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center gap-0.5">
                                                            <Upload size={12} className="text-gray-300" />
                                                        </div>
                                                    )}
                                                    <div className={`absolute top-1 right-1 w-2 h-2 rounded-full border border-white ${product.isAvailable ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                                                </div>
                                                {/* Name + status tags */}
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="font-bold text-gray-900 text-sm leading-tight truncate">{product.name}</p>
                                                        {product.seasonalTips && (
                                                            <div className="group/tip relative">
                                                                <Info size={12} className="text-nature-400 cursor-help" />
                                                                <div className="absolute left-0 bottom-full mb-2 hidden group-hover/tip:block w-48 p-2 bg-nature-900 text-white text-[10px] rounded-lg shadow-xl z-20">
                                                                    {product.seasonalTips}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wide">
                                                            {product.unitType === 'BOX' ? 'Cassetta' : product.unitType}{product.isVariableWeight ? ' · Var.' : ''}
                                                        </span>
                                                        {product.allowBackorder && (
                                                            <span className="text-[10px] bg-sky-50 text-sky-600 font-black px-1.5 py-0.5 rounded-md uppercase tracking-wide border border-sky-100">∞</span>
                                                        )}
                                                        {isEmpty && (
                                                            <span className="text-[10px] bg-red-50 text-red-600 font-black px-1.5 py-0.5 rounded-md uppercase tracking-wide border border-red-100">Esaurito</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Category */}
                                        <td className="py-4 px-8 align-middle">
                                            {product.category ? (
                                                <span
                                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border"
                                                    style={{
                                                        backgroundColor: `${product.category.color}15`,
                                                        color: product.category.color,
                                                        borderColor: `${product.category.color}30`
                                                    }}
                                                >
                                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: product.category.color }} />
                                                    {product.category.name}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-300">—</span>
                                            )}
                                        </td>

                                        {/* Price */}
                                        <td className="py-4 px-8 align-middle">
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={currentPrice}
                                                    onChange={(e) => setQuickEditData(prev => ({ ...prev, [product.id]: { ...prev[product.id], price: e.target.value } }))}
                                                    className={`w-full bg-gray-50 border ${hasChanges?.price ? 'border-nature-400 ring-2 ring-nature-500/10' : 'border-gray-200'} rounded-xl px-3 py-2 text-sm font-black text-gray-800 focus:ring-2 focus:ring-nature-500/20 outline-none transition-all pr-8`}
                                                />
                                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 pointer-events-none">
                                                    /{product.unitType}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Stock */}
                                        <td className="py-4 px-8 align-middle">
                                            <div className="flex items-center gap-1.5 mb-1.5">
                                                <input
                                                    type="text"
                                                    value={currentStock}
                                                    onChange={(e) => setQuickEditData(prev => ({ ...prev, [product.id]: { ...prev[product.id], stockQuantity: e.target.value } }))}
                                                    className={`w-16 bg-gray-50 border ${hasChanges?.stockQuantity ? 'border-nature-400 ring-2 ring-nature-500/10' : 'border-gray-200'} rounded-xl px-2.5 py-2 text-sm font-black text-gray-800 focus:ring-2 focus:ring-nature-500/20 outline-none transition-all`}
                                                />
                                                <span className="text-[10px] font-bold text-gray-400">/ {product.lowStockThreshold}</span>
                                            </div>
                                            {!product.allowBackorder && (
                                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-500"
                                                        style={{ width: `${stockPct}%`, backgroundColor: stockColor }}
                                                    />
                                                </div>
                                            )}
                                            {product.allowBackorder && (
                                                <div className="text-[10px] text-sky-500 font-bold">∞ Ordini liberi</div>
                                            )}
                                        </td>

                                        {/* Status */}
                                        <td className="py-4 px-8 align-middle">
                                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide inline-flex items-center gap-1 ${product.isAvailable
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                : 'bg-gray-100 text-gray-400 border border-gray-200'
                                                }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${product.isAvailable ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                                {product.isAvailable ? 'Attivo' : 'Nascosto'}
                                            </span>
                                        </td>

                                        {/* Actions */}
                                        <td className="py-4 pl-3 pr-5 align-middle">
                                            <div className="flex justify-end gap-1.5">
                                                {hasChanges ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleInlineUpdate(product.id)}
                                                            className="p-2 bg-nature-600 text-white rounded-xl hover:bg-nature-700 transition-all shadow-md shadow-nature-100"
                                                            title="Salva modifiche"
                                                        >
                                                            <Save size={15} />
                                                        </button>
                                                        <button
                                                            onClick={() => setQuickEditData(prev => { const n = { ...prev }; delete n[product.id]; return n; })}
                                                            className="p-2 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 transition-all"
                                                            title="Annulla"
                                                        >
                                                            <X size={15} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className="flex gap-2 justify-end">
                                                        <button
                                                            onClick={() => setViewingStatsProduct(product)}
                                                            className="p-2 bg-gray-100 text-gray-500 rounded-xl hover:bg-purple-50 hover:text-purple-600 transition-colors opacity-0 group-hover:opacity-100"
                                                            title="Statistiche Prodotto"
                                                        >
                                                            <BarChart2 size={15} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleEdit(product)}
                                                            className="p-2 bg-gray-100 text-gray-500 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                                                            title="Modifica completa"
                                                        >
                                                            <Edit2 size={15} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(product.id)}
                                                            className="p-2 bg-gray-100 text-gray-500 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                                            title="Elimina"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div> {/* end inner scroll div */}
            </div>

            <div className="lg:hidden flex flex-col gap-3 pb-32">
                {products.length === 0 && (
                    <div className="py-12 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Plus size={28} className="text-gray-300" />
                        </div>
                        <p className="text-gray-400 font-medium">Nessun prodotto trovato.</p>
                        <p className="text-gray-300 text-sm mt-1">Prova a cambiare i filtri.</p>
                    </div>
                )}

                {/* Mobile Select All */}
                {products.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex items-center gap-3 active:scale-[0.98] transition-all" onClick={toggleSelectAll}>
                        <input
                            type="checkbox"
                            checked={selectedIds.length === products.length && products.length > 0}
                            readOnly
                            className="w-5 h-5 text-nature-600 rounded focus:ring-nature-500 cursor-pointer pointer-events-none"
                        />
                        <span className="text-sm font-bold text-gray-700">Seleziona Tutti</span>
                    </div>
                )}

                {products.map(product => {
                    const hasChanges = quickEditData[product.id];
                    const currentPrice = hasChanges?.price !== undefined ? hasChanges.price : (product.priceCents / 100).toFixed(2);
                    const currentStock = hasChanges?.stockQuantity !== undefined ? hasChanges.stockQuantity : product.stockQuantity.toString();

                    const stockNum = parseFloat(currentStock) || 0;
                    const threshold = product.lowStockThreshold || 1;
                    const isLow = !product.allowBackorder && stockNum <= threshold && stockNum > 0;
                    const isEmpty = !product.allowBackorder && stockNum <= 0;
                    const stockColor = isEmpty ? '#ef4444' : isLow ? '#f59e0b' : '#10b981';

                    const isQuickEditing = mobileQuickEditId === product.id;

                    return (
                        <div
                            key={product.id}
                            className={`flex flex-col gap-2.5 bg-white rounded-xl shadow-sm border p-3.5 transition-colors relative
                                ${selectedIds.includes(product.id) ? 'bg-nature-50 border-nature-300 ring-1 ring-nature-200' : 'border-gray-100'}`}
                        >
                            {/* Main Compact Row */}
                            <div className="flex items-center gap-3 justify-between w-full min-w-0">
                                {/* Left Side: Checkbox + Image + Details */}
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="shrink-0" onClick={(e) => { e.stopPropagation(); toggleSelect(product.id); }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(product.id)}
                                            readOnly
                                            className="w-4.5 h-4.5 text-nature-600 rounded focus:ring-nature-500 cursor-pointer pointer-events-none"
                                        />
                                    </div>
                                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-gray-100 bg-gray-50 relative shadow-sm">
                                        {product.imageUrl ? (
                                            <img src={sanitizeImageUrl(product.imageUrl)} alt={product.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Upload size={16} className="text-gray-300" />
                                            </div>
                                        )}
                                        <div className={`absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full border border-white shadow-sm ${product.isAvailable ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-extrabold text-gray-900 leading-tight text-base truncate" title={product.name}>
                                            {product.name}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                            <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md font-black uppercase tracking-wider">
                                                {product.unitType}
                                            </span>
                                            {product.category && (
                                                <span className="text-[10px] bg-gray-50 px-2 py-0.5 rounded-md font-black text-gray-600 flex items-center gap-1 border border-gray-200" style={{ borderColor: `${product.category.color}30` }}>
                                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: product.category.color }} />
                                                    <span className="truncate max-w-[80px]">{product.category.name}</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Price & Stock (Enlarged and aligned to the right) */}
                                <div className="text-right shrink-0 min-w-[80px]">
                                    <p className="text-base font-black text-nature-950">€ {currentPrice}</p>
                                    <p className="text-xs font-bold text-gray-400 mt-0.5">
                                        Scorta: <span className="font-extrabold" style={{ color: stockColor }}>{product.allowBackorder ? '∞' : currentStock}</span>
                                    </p>
                                </div>
                            </div>

                            {/* Second Row: Action Buttons */}
                            <div className="flex justify-between items-center border-t border-gray-100/60 pt-2.5 mt-0.5">
                                {/* Left Side Availability Status Badge */}
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1 ${product.isAvailable
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                    : 'bg-gray-100 text-gray-400 border border-gray-200'
                                    }`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${product.isAvailable ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                    {product.isAvailable ? 'Attivo' : 'Nascosto'}
                                </span>

                                {/* Right Side Action Buttons */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {!isQuickEditing ? (
                                        <>
                                            <button 
                                                onClick={() => setMobileQuickEditId(product.id)} 
                                                className="p-1.5 text-nature-600 bg-nature-50 hover:bg-nature-100 rounded-lg border border-transparent flex items-center justify-center"
                                                title="Modifica Rapida"
                                            >
                                                <Sliders size={16} />
                                            </button>
                                            <button onClick={() => setViewingStatsProduct(product)} className="p-1.5 text-purple-500 bg-purple-50 hover:bg-purple-100 rounded-lg border border-transparent flex items-center justify-center">
                                                <BarChart2 size={16} />
                                            </button>
                                            <button onClick={() => handleEdit(product)} className="p-1.5 text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-lg border border-transparent flex items-center justify-center">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(product.id)} className="p-1.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg border border-transparent flex items-center justify-center">
                                                <Trash2 size={16} />
                                            </button>
                                        </>
                                    ) : (
                                        <button 
                                            onClick={() => {
                                                setMobileQuickEditId(null);
                                                setQuickEditData(prev => { const n = { ...prev }; delete n[product.id]; return n; });
                                            }} 
                                            className="px-2.5 py-1 text-xs font-black text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg border border-transparent flex items-center justify-center gap-1"
                                            title="Chiudi Modifica"
                                        >
                                            <X size={14} /> Annulla
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Inputs Row (Only when editing this item) */}
                            {isQuickEditing && (
                                <div className="flex gap-3 border-t border-gray-100/60 pt-3 mt-1 animate-in slide-in-from-top-1 fade-in duration-200">
                                    <div className="flex-1 flex flex-col">
                                        <span className="text-[9px] text-gray-400 font-bold uppercase mb-1 pl-0.5">Prezzo</span>
                                        <div className="relative">
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">€</span>
                                            <input
                                                type="text"
                                                value={currentPrice}
                                                onChange={(e) => setQuickEditData(prev => ({ ...prev, [product.id]: { ...prev[product.id], price: e.target.value } }))}
                                                className={`w-full bg-gray-50/80 border ${hasChanges?.price ? 'border-nature-400 ring-2 ring-nature-500/10' : 'border-gray-200'} rounded-xl pl-6 pr-3 py-2 text-sm font-black text-gray-800 focus:outline-none focus:bg-white focus:border-nature-400 transition-all`}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex-1 flex flex-col">
                                        <span className="text-[9px] text-gray-400 font-bold uppercase mb-1 pl-0.5">Scorta</span>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={currentStock}
                                                onChange={(e) => setQuickEditData(prev => ({ ...prev, [product.id]: { ...prev[product.id], stockQuantity: e.target.value } }))}
                                                className={`w-full bg-gray-50/80 border ${hasChanges?.stockQuantity ? 'border-nature-400 ring-2 ring-nature-500/10' : 'border-gray-200'} rounded-xl px-3 py-2 text-sm font-black text-gray-800 ${product.allowBackorder ? 'text-sky-600' : ''} focus:outline-none focus:bg-white focus:border-nature-400 transition-all`}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-end gap-1.5">
                                        <button 
                                            onClick={async () => {
                                                await handleInlineUpdate(product.id);
                                                setMobileQuickEditId(null);
                                            }} 
                                            disabled={!hasChanges}
                                            className={`p-2.5 rounded-xl shadow-md font-bold text-xs transition-all ${
                                                hasChanges 
                                                    ? 'bg-nature-600 text-white hover:bg-nature-700 active:scale-95' 
                                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            }`}
                                        >
                                            <Save size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Modal */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 z-[60]">
                        <div className="bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            
                            {/* Header */}
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2">
                                        {editingProduct ? (
                                            <>
                                                <span className="w-2 h-6 bg-nature-600 rounded-full"></span>
                                                Modifica Prodotto
                                            </>
                                        ) : (
                                            <>
                                                <span className="w-2 h-6 bg-emerald-600 rounded-full"></span>
                                                Nuovo Prodotto
                                            </>
                                        )}
                                    </h2>
                                    <p className="text-xs text-gray-400 mt-1">Inserisci i dettagli e le giacenze dell'articolo.</p>
                                </div>
                                <button 
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-2 bg-gray-100 rounded-full hover:bg-red-50 hover:text-red-600 transition-all active:scale-90"
                                >
                                    <X size={20} className="transition-transform duration-300 hover:rotate-90" />
                                </button>
                            </div>

                            {/* Tab Bar Selector */}
                            <div className="flex bg-gray-100/80 p-1.5 mx-6 mt-6 rounded-2xl border border-gray-200/50 text-sm font-bold">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('base')}
                                    className={`flex-1 py-3 rounded-xl transition-all text-center flex items-center justify-center gap-2 ${activeTab === 'base' ? 'bg-white text-nature-950 shadow-md shadow-gray-200/50' : 'text-gray-500 hover:text-gray-800'}`}
                                >
                                    <Tag size={16} />
                                    Dettagli Base
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('pricing')}
                                    className={`flex-1 py-3 rounded-xl transition-all text-center flex items-center justify-center gap-2 ${activeTab === 'pricing' ? 'bg-white text-nature-950 shadow-md shadow-gray-200/50' : 'text-gray-500 hover:text-gray-800'}`}
                                >
                                    <Euro size={16} />
                                    Prezzo & Inventario
                                </button>
                            </div>

                            {/* Form Body */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                                <form id="product-form" onSubmit={handleSubmit} className="space-y-6">
                                    
                                    {/* TAB 1: Base Info */}
                                    {activeTab === 'base' && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-250">
                                            <div className="grid grid-cols-2 gap-4 sm:gap-6">
                                                
                                                <div className="col-span-2 sm:col-span-1 space-y-2">
                                                    <label className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                                        <Tag size={12} className="text-nature-600" /> Categoria
                                                    </label>
                                                    <select
                                                        value={formData.categoryId}
                                                        onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500 outline-none transition-all bg-white font-medium text-gray-800 shadow-sm"
                                                    >
                                                        <option value="">Nessuna Categoria</option>
                                                        {categories.map(cat => (
                                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="col-span-2 sm:col-span-1 space-y-2">
                                                    <label className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                                        <FileText size={12} className="text-nature-600" /> Nome Prodotto
                                                    </label>
                                                    <input 
                                                        type="text" 
                                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500 outline-none transition-all font-medium text-gray-800 shadow-sm" 
                                                        required 
                                                        value={formData.name} 
                                                        onChange={e => setFormData({ ...formData, name: e.target.value })} 
                                                        placeholder="es. Melone Cantalupo"
                                                    />
                                                </div>

                                                <div className="col-span-2 space-y-2">
                                                    <label className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                                        <FileText size={12} className="text-nature-600" /> Descrizione
                                                    </label>
                                                    <textarea 
                                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500 outline-none transition-all h-24 resize-none font-medium text-gray-800 shadow-sm" 
                                                        value={formData.description} 
                                                        onChange={e => setFormData({ ...formData, description: e.target.value })} 
                                                        placeholder="Inserisci una breve descrizione del prodotto..."
                                                    />
                                                </div>

                                                <div className="col-span-2 space-y-2">
                                                    <label className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                                        <ChefHat size={12} className="text-nature-600" /> Consiglio dell'Esperto (AI Tips)
                                                    </label>
                                                    <textarea 
                                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500 outline-none transition-all h-20 resize-none font-medium text-gray-800 shadow-sm" 
                                                        placeholder="Es: Perfetto abbinato con il prosciutto crudo, servire fresco..." 
                                                        value={formData.seasonalTips} 
                                                        onChange={e => setFormData({ ...formData, seasonalTips: e.target.value })} 
                                                    />
                                                </div>

                                                <div className="col-span-2 space-y-2">
                                                    <label className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                                        <Image size={12} className="text-nature-600" /> Immagine Prodotto
                                                    </label>
                                                    
                                                    {/* Custom Upload Area with Live Preview */}
                                                    <div className="group relative border-2 border-dashed border-gray-200 rounded-2xl p-4 text-center hover:bg-nature-50/50 hover:border-nature-300 transition-all cursor-pointer overflow-hidden min-h-[140px] flex items-center justify-center bg-gray-50/30">
                                                        <input 
                                                            type="file" 
                                                            className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                                                            accept="image/*" 
                                                            onChange={e => setFormData({ ...formData, image: e.target.files?.[0] || null })} 
                                                        />
                                                        
                                                        {/* Preview container */}
                                                        {formData.image || (editingProduct && editingProduct.imageUrl) ? (
                                                            <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                                                                <div className="w-20 h-20 rounded-xl overflow-hidden border border-gray-200/60 shadow-sm shrink-0 bg-white relative">
                                                                    <img 
                                                                        src={formData.image ? URL.createObjectURL(formData.image) : (editingProduct?.imageUrl ? sanitizeImageUrl(editingProduct.imageUrl) : '')} 
                                                                        alt="Preview" 
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                </div>
                                                                <div className="text-left overflow-hidden pr-8">
                                                                    <p className="text-sm font-bold text-gray-850 truncate">
                                                                        {formData.image ? formData.image.name : 'Immagine attuale salvata'}
                                                                    </p>
                                                                    <p className="text-xs text-gray-400 mt-1">Trascina o clicca qui per sostituire l'immagine.</p>
                                                                </div>
                                                                
                                                                {/* Reset Button */}
                                                                {formData.image && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            setFormData({ ...formData, image: null });
                                                                        }}
                                                                        className="absolute right-4 top-4 p-1.5 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors z-20"
                                                                        title="Rimuovi nuova foto"
                                                                    >
                                                                        <X size={14} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-1">
                                                                <Upload className="mx-auto text-gray-400 mb-2 transition-transform duration-300 group-hover:-translate-y-1" size={24} />
                                                                <p className="text-gray-700 font-bold text-sm">Trascina o clicca qui per inserire la foto</p>
                                                                <p className="text-[10px] text-gray-400">Supporta PNG, JPG o WEBP</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                            </div>
                                        </div>
                                    )}

                                    {/* TAB 2: Pricing & Inventory */}
                                    {activeTab === 'pricing' && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-250">
                                            <div className="grid grid-cols-2 gap-4 sm:gap-6">
                                                
                                                <div className="col-span-2 sm:col-span-1 space-y-2">
                                                    <label className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                                        <Euro size={12} className="text-nature-600" /> Prezzo Unitario (€)
                                                    </label>
                                                    <div className="relative rounded-xl shadow-sm">
                                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                            <span className="text-gray-400 font-bold text-sm">€</span>
                                                        </div>
                                                        <input 
                                                            type="number" 
                                                            step="0.01" 
                                                            className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500 outline-none transition-all font-bold text-gray-800" 
                                                            required 
                                                            value={formData.price} 
                                                            onChange={e => setFormData({ ...formData, price: e.target.value })} 
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="col-span-2 sm:col-span-1 space-y-2">
                                                    <label className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                                        <Scale size={12} className="text-nature-600" /> Unità di Vendita Base
                                                    </label>
                                                    <select 
                                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500 outline-none transition-all bg-white font-medium text-gray-805" 
                                                        value={formData.unitType} 
                                                        onChange={e => setFormData({ ...formData, unitType: e.target.value })} 
                                                    >
                                                        <option value="KG">Al KG</option>
                                                        <option value="PZ">Al Pezzo (PZ)</option>
                                                        <option value="BOX">A Cassetta/Confezione (BOX)</option>
                                                    </select>
                                                </div>

                                                <div className="col-span-2 sm:col-span-1 space-y-2">
                                                    <label className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                                        <Package size={12} className="text-nature-600" /> Giacenza Attuale ({formData.unitType})
                                                    </label>
                                                    <input 
                                                        type="number" 
                                                        step="0.01" 
                                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500 outline-none transition-all bg-nature-50/30 border-nature-200/50 font-bold text-gray-800" 
                                                        required 
                                                        value={formData.stockQuantity} 
                                                        onChange={e => setFormData({ ...formData, stockQuantity: e.target.value })} 
                                                    />
                                                </div>

                                                <div className="col-span-2 sm:col-span-1 space-y-2">
                                                    <label className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                                        <AlertTriangle size={12} className="text-red-500" /> Soglia Allerta Scorte ({formData.unitType})
                                                    </label>
                                                    <input 
                                                        type="number" 
                                                        step="0.01" 
                                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500 outline-none transition-all bg-red-50/20 border-red-200/50 font-bold text-gray-800" 
                                                        required 
                                                        value={formData.lowStockThreshold} 
                                                        onChange={e => setFormData({ ...formData, lowStockThreshold: e.target.value })} 
                                                    />
                                                </div>

                                                {/* Switches container */}
                                                <div className="col-span-2 bg-gray-50/80 p-4 sm:p-6 rounded-2xl border border-gray-200/40 space-y-5">
                                                    
                                                    {/* Toggle 1: Peso Variabile */}
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <span className="block text-sm font-bold text-gray-800">Peso Variabile</span>
                                                            <span className="block text-xs text-gray-400 mt-0.5">Il prodotto ha un peso effettivo non determinabile esattamente a priori (es. Anguria).</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, isVariableWeight: !formData.isVariableWeight })}
                                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0 ${formData.isVariableWeight ? 'bg-nature-600' : 'bg-gray-200'}`}
                                                        >
                                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isVariableWeight ? 'translate-x-6' : 'translate-x-1'}`} />
                                                        </button>
                                                    </div>

                                                    {/* Toggle 2: Vendi oltre scorta */}
                                                    <div className="flex items-center justify-between border-t border-gray-200/60 pt-4">
                                                        <div>
                                                            <span className="block text-sm font-bold text-gray-800">Consenti ordini oltre la scorta (Bypass)</span>
                                                            <span className="block text-xs text-gray-400 mt-0.5">Permette ai clienti di ordinare l'articolo anche se la giacenza è zero.</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, allowBackorder: !formData.allowBackorder })}
                                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0 ${formData.allowBackorder ? 'bg-nature-600' : 'bg-gray-200'}`}
                                                        >
                                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.allowBackorder ? 'translate-x-6' : 'translate-x-1'}`} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Variable Weight parameters (Conditional Reveal) */}
                                                {formData.isVariableWeight && (
                                                    <div className="col-span-2 space-y-4 animate-in slide-in-from-top-3 duration-300">
                                                        <div className="space-y-2 bg-amber-50/40 p-4 sm:p-5 rounded-2xl border border-amber-200/40">
                                                            <div className="flex items-center gap-2 text-amber-800 font-bold text-sm mb-2">
                                                                <Scale size={16} />
                                                                Configurazione Peso Variabile
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="col-span-2 sm:col-span-1 space-y-1.5">
                                                                    <label className="block text-xs font-bold text-gray-700">Peso Indicativo Pezzo (kg)</label>
                                                                    <input 
                                                                        type="number" 
                                                                        step="0.01" 
                                                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500 outline-none bg-white font-bold text-gray-800 text-sm shadow-sm" 
                                                                        value={formData.stepAmount} 
                                                                        onChange={e => setFormData({ ...formData, stepAmount: e.target.value })} 
                                                                        placeholder="es. 1.5 per anguria" 
                                                                    />
                                                                </div>
                                                                <div className="col-span-2 sm:col-span-1 flex items-center">
                                                                    <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                                                                        Imposta un valore superiore a 0 per permettere l'acquisto alternativo a pezzi, calcolando un peso stimato. Lascia 0 per l'acquisto esclusivo a peso (kg).
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="text-xs text-amber-700 bg-amber-50 p-4 rounded-xl border border-amber-100/50 flex items-center gap-2">
                                                            <AlertTriangle size={16} className="shrink-0" />
                                                            <span>Il prezzo finale effettivo verrà ricalcolato ed applicato in fase di pesatura manuale da parte dell'amministratore.</span>
                                                        </div>
                                                    </div>
                                                )}

                                            </div>
                                        </div>
                                    )}

                                </form>
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-gray-100 flex justify-end gap-4 bg-gray-50/50">
                                <button 
                                    type="button" 
                                    onClick={() => setIsModalOpen(false)} 
                                    className="px-6 py-3 text-gray-600 font-bold hover:bg-gray-200/50 rounded-xl transition-all active:scale-95"
                                >
                                    Annulla
                                </button>
                                <button 
                                    type="submit" 
                                    form="product-form" 
                                    className="px-6 py-3 bg-nature-600 text-white font-bold rounded-xl hover:bg-nature-700 shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2"
                                >
                                    <Check size={18} />
                                    Salva Prodotto
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {viewingStatsProduct && (
                <ProductStatsModal
                    product={viewingStatsProduct}
                    onClose={() => setViewingStatsProduct(null)}
                />
            )}

            {isQuickStockOpen && (
                <QuickStockModal
                    onClose={() => setIsQuickStockOpen(false)}
                    onUpdateComplete={() => fetchProducts()}
                />
            )}


            {/* Bulk Action Toolbar */}
            <AnimatePresence>
                {selectedIds.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 100, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: 100, x: '-50%' }}
                        className="fixed bottom-20 sm:bottom-8 left-1/2 z-[60] bg-white/80 backdrop-blur-xl px-1.5 py-1.5 sm:px-2 sm:py-2 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex items-center gap-1.5 sm:gap-2 border border-white/50 w-auto max-w-[95%] sm:max-w-none"
                    >
                        <div className="flex items-center gap-2 sm:gap-3 px-3 py-1.5 sm:px-4 sm:py-2 bg-nature-600 text-white rounded-[1.5rem] shadow-lg shadow-nature-200">
                            <div className="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm">
                                {selectedIds.length}
                            </div>
                            <span className="font-bold text-sm hidden sm:inline">Prodotti</span>
                        </div>

                        <div className="flex items-center gap-0.5 sm:gap-1 p-0.5 sm:p-1 bg-gray-50/50 rounded-[1.5rem] border border-gray-100">
                            <div className="flex items-center gap-0.5 sm:gap-1 px-1 sm:px-2 border-r border-gray-200">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleBulkUpdate({ isAvailable: true })}
                                    className="p-2 sm:p-3 text-nature-600 hover:bg-nature-50 rounded-2xl transition-all"
                                    title="Disponibile"
                                >
                                    <Eye size={22} />
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleBulkUpdate({ isAvailable: false })}
                                    className="p-2 sm:p-3 text-gray-400 hover:bg-gray-100 rounded-2xl transition-all"
                                    title="Non Disponibile"
                                >
                                    <EyeOff size={22} />
                                </motion.button>
                            </div>

                            <div className="flex items-center gap-0.5 sm:gap-1 px-1 sm:px-2 border-r border-gray-200">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleBulkUpdate({ allowBackorder: true })}
                                    className="p-2 sm:p-3 text-sky-600 hover:bg-sky-50 rounded-2xl transition-all"
                                    title="Sempre Disponibile"
                                >
                                    <InfinityIcon size={22} />
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleBulkUpdate({ allowBackorder: false })}
                                    className="p-2 sm:p-3 text-gray-400 hover:bg-gray-100 rounded-2xl transition-all"
                                    title="Solo con Scorta"
                                >
                                    <PackageX size={22} />
                                </motion.button>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.05, backgroundColor: '#fef2f2' }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleBulkDelete()}
                                className="p-2 sm:p-3 text-red-500 hover:text-red-600 rounded-2xl transition-all"
                                title="Elimina Selezionati"
                            >
                                <Trash2 size={22} />
                            </motion.button>
                        </div>

                        <motion.button
                            whileHover={{ backgroundColor: '#f3f4f6' }}
                            onClick={() => setSelectedIds([])}
                            className="p-2 sm:p-3 text-gray-400 hover:text-gray-600 rounded-full transition-all"
                            title="Annulla selezione"
                        >
                            <X size={20} />
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

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
