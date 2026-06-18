import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, Upload, Eye, EyeOff, Infinity as InfinityIcon, PackageX, X, Save, Info, ArrowUpDown, ArrowUp, ArrowDown, BarChart2, PackagePlus } from 'lucide-react';

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
    };

    return (
        <div className="-m-5 md:-m-8 p-5 md:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Gestione Prodotti</h1>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                    <button
                        onClick={() => setIsQuickStockOpen(true)}
                        className="bg-white border-2 border-nature-600 text-nature-700 px-5 py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-nature-50 transition-all font-bold w-full sm:w-auto"
                    >
                        <PackagePlus size={20} /> Rifornimento Rapido
                    </button>
                    <button
                        onClick={() => { setEditingProduct(null); resetForm(); setIsModalOpen(true); }}
                        className="bg-nature-600 text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-nature-700 transition-all shadow-lg shadow-nature-200 font-bold w-full sm:w-auto"
                    >
                        <Plus size={20} /> Nuovo Prodotto
                    </button>
                </div>
            </div>

            {/* Search + Sort Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                {/* Search */}
                <div className="relative flex-1">
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
                {/* Sort Controls */}
                <div className="flex gap-2">
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
                                className={`flex items-center gap-1 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all border ${isActive
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
            <div className="flex gap-2 bg-gray-100/50 p-2 rounded-[2rem] border border-gray-200 mb-8 overflow-x-auto custom-scrollbar no-scrollbar whitespace-nowrap">
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

            {/* Bulk Action Toolbar */}
            <AnimatePresence>
                {selectedIds.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 100, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: 100, x: '-50%' }}
                        className="fixed bottom-8 left-1/2 z-50 bg-white/80 backdrop-blur-xl px-2 py-2 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex items-center gap-2 border border-white/50"
                    >
                        <div className="flex items-center gap-3 px-4 py-2 bg-nature-600 text-white rounded-[1.5rem] shadow-lg shadow-nature-200">
                            <div className="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm">
                                {selectedIds.length}
                            </div>
                            <span className="font-bold text-sm hidden sm:inline">Prodotti</span>
                        </div>

                        <div className="flex items-center gap-1 p-1 bg-gray-50/50 rounded-[1.5rem] border border-gray-100">
                            <div className="flex items-center gap-1 px-2 border-r border-gray-200">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleBulkUpdate({ isAvailable: true })}
                                    className="p-3 text-nature-600 hover:bg-nature-50 rounded-2xl transition-all"
                                    title="Disponibile"
                                >
                                    <Eye size={22} />
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleBulkUpdate({ isAvailable: false })}
                                    className="p-3 text-gray-400 hover:bg-gray-100 rounded-2xl transition-all"
                                    title="Non Disponibile"
                                >
                                    <EyeOff size={22} />
                                </motion.button>
                            </div>

                            <div className="flex items-center gap-1 px-2 border-r border-gray-200">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleBulkUpdate({ allowBackorder: true })}
                                    className="p-3 text-sky-600 hover:bg-sky-50 rounded-2xl transition-all"
                                    title="Sempre Disponibile"
                                >
                                    <InfinityIcon size={22} />
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleBulkUpdate({ allowBackorder: false })}
                                    className="p-3 text-gray-400 hover:bg-gray-100 rounded-2xl transition-all"
                                    title="Solo con Scorta"
                                >
                                    <PackageX size={22} />
                                </motion.button>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.05, backgroundColor: '#fef2f2' }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleBulkDelete()}
                                className="p-3 text-red-500 hover:text-red-600 rounded-2xl transition-all"
                                title="Elimina Selezionati"
                            >
                                <Trash2 size={22} />
                            </motion.button>
                        </div>

                        <motion.button
                            whileHover={{ backgroundColor: '#f3f4f6' }}
                            onClick={() => setSelectedIds([])}
                            className="p-3 text-gray-400 hover:text-gray-600 rounded-full transition-all"
                            title="Annulla selezione"
                        >
                            <X size={20} />
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

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

            {/* Mobile Card View (Smartphone) */}
            <div className="lg:hidden flex flex-col gap-3">
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

                    return (
                        <div
                            key={product.id}
                            className={`flex flex-col gap-3 bg-white rounded-2xl shadow-sm border p-4 transition-colors relative
                                ${selectedIds.includes(product.id) ? 'bg-nature-50 border-nature-300 ring-2 ring-nature-200' : 'border-gray-100'}`}
                        >
                            {/* Header: Checkbox + Image + Details + Actions */}
                            <div className="flex gap-3 items-start relative pb-3 border-b border-gray-100">
                                <div className="mt-1 shrink-0" onClick={(e) => { e.stopPropagation(); toggleSelect(product.id); }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(product.id)}
                                        readOnly
                                        className="w-5 h-5 text-nature-600 rounded focus:ring-nature-500 cursor-pointer"
                                    />
                                </div>
                                <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-gray-100 bg-gray-50 relative">
                                    {product.imageUrl ? (
                                        <img src={sanitizeImageUrl(product.imageUrl)} alt={product.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Upload size={16} className="text-gray-300" />
                                        </div>
                                    )}
                                    <div className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${product.isAvailable ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                                </div>
                                <div className="min-w-0 flex-1 flex flex-col items-start gap-1">
                                    <h3 className="font-bold text-gray-900 leading-tight">{product.name}</h3>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                        <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md font-bold uppercase">
                                            {product.unitType}
                                        </span>
                                        {product.category && (
                                            <span className="text-[10px] bg-gray-50 px-1.5 py-0.5 rounded-md font-bold text-gray-600 flex items-center gap-1 border border-gray-200" style={{ borderColor: `${product.category.color}30` }}>
                                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: product.category.color }} />
                                                <span className="truncate max-w-[80px]">{product.category.name}</span>
                                            </span>
                                        )}
                                        {isEmpty && !product.allowBackorder && (
                                            <span className="text-[10px] bg-red-50 text-red-600 font-black px-1.5 py-0.5 rounded-md uppercase border border-red-100 shadow-sm animate-pulse">Esaurito</span>
                                        )}
                                    </div>
                                </div>

                                {/* Quick Menu Toggle (Standard Flex Flow) */}
                                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 shrink-0 -mt-1 -mr-1">
                                    <button onClick={() => setViewingStatsProduct(product)} className="p-1.5 text-purple-500 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-transparent hover:border-purple-200">
                                        <BarChart2 size={16} />
                                    </button>
                                    <button onClick={() => handleEdit(product)} className="p-1.5 text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-transparent hover:border-blue-200">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(product.id)} className="p-1.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-transparent hover:border-red-200">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Inputs Row */}
                            <div className="flex gap-3 h-[72px]">
                                <div className="flex-1 flex flex-col justify-end">
                                    <span className="flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase mb-1.5 pl-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div> Prezzo ({product.unitType})</span>
                                    <div className="relative mt-auto">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">€</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={currentPrice}
                                            onChange={(e) => setQuickEditData(prev => ({ ...prev, [product.id]: { ...prev[product.id], price: e.target.value } }))}
                                            className={`w-full bg-gray-50/80 border ${hasChanges?.price ? 'border-nature-400 ring-4 ring-nature-500/10' : 'border-gray-200'} rounded-xl pl-7 pr-3 py-2 text-sm font-black text-gray-800 focus:outline-none focus:bg-white focus:border-nature-400 transition-all`}
                                        />
                                    </div>
                                </div>
                                <div className="flex-1 flex flex-col justify-end">
                                    <span className="flex items-start gap-1 text-[10px] text-gray-400 font-bold uppercase mb-1 pl-1">
                                        <div className="w-1.5 h-1.5 rounded-full mt-1" style={{ backgroundColor: stockColor }}></div>
                                        <div className="flex flex-col">
                                            <span>Scorta</span>
                                            <span className="text-[9px] opacity-70 normal-case leading-none mt-0.5">Avviso a: {product.allowBackorder ? 'Mai' : threshold}</span>
                                        </div>
                                    </span>
                                    <div className="relative mt-auto">
                                        <input
                                            type="number"
                                            value={currentStock}
                                            onChange={(e) => setQuickEditData(prev => ({ ...prev, [product.id]: { ...prev[product.id], stockQuantity: e.target.value } }))}
                                            className={`w-full bg-gray-50/80 border ${hasChanges?.stockQuantity ? 'border-nature-400 ring-4 ring-nature-500/10' : 'border-gray-200'} rounded-xl px-3 py-2 text-sm font-black text-gray-800 ${product.allowBackorder ? 'text-sky-600' : ''} focus:outline-none focus:bg-white focus:border-nature-400 transition-all`}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Save Row (Only when changes present) */}
                            {hasChanges && (
                                <div className="flex gap-2 animate-in slide-in-from-top-2 fade-in duration-200 mt-1 pb-1">
                                    <button onClick={() => setQuickEditData(prev => { const n = { ...prev }; delete n[product.id]; return n; })} className="flex-1 flex items-center justify-center gap-2 p-2 text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-xs transition-colors">
                                        <X size={14} /> Annulla
                                    </button>
                                    <button onClick={() => handleInlineUpdate(product.id)} className="flex-1 flex items-center justify-center gap-2 p-2 bg-nature-600 text-white rounded-xl shadow-md shadow-nature-200/50 hover:bg-nature-700 font-bold text-xs transition-all active:scale-95">
                                        <Save size={14} /> Salva Rapido
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Modal */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-0 md:p-4 z-[60]">
                        <div className="bg-white w-full h-full md:h-auto md:max-h-[95vh] md:max-w-2xl md:rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-gray-800">{editingProduct ? 'Modifica Prodotto' : 'Nuovo Prodotto'}</h2>
                                <button onClick={() => setIsModalOpen(false)}><X className="text-gray-400 hover:text-gray-600" /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                                <form id="product-form" onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="col-span-2 md:col-span-1 space-y-2">
                                            <label className="text-sm font-bold text-gray-700">Categoria</label>
                                            <select
                                                value={formData.categoryId}
                                                onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500 outline-none transition-all bg-white"
                                            >
                                                <option value="">Nessuna Categoria</option>
                                                {categories.map(cat => (
                                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-span-2 md:col-span-1 space-y-2">
                                            <label className="block text-sm font-bold text-gray-700">Nome Prodotto</label>
                                            <input type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500 outline-none transition-all" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                        </div>

                                        <div className="col-span-2 md:col-span-1 space-y-2">
                                            <label className="block text-sm font-bold text-gray-700">Prezzo (€)</label>
                                            <input type="number" step="0.01" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500 outline-none transition-all" required value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                                        </div>

                                        <div className="col-span-2 md:col-span-1 space-y-2">
                                            <label className="block text-sm font-bold text-gray-700">Unità di Misura</label>
                                            <select className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500 outline-none transition-all bg-white" value={formData.unitType} onChange={e => setFormData({ ...formData, unitType: e.target.value })} >
                                                <option value="KG">Al KG</option>
                                                <option value="PZ">Al Pezzo</option>
                                                <option value="BOX">A Cassetta/Confezione</option>
                                            </select>
                                        </div>

                                        <div className="col-span-2 md:col-span-1 space-y-2">
                                            <label className="block text-sm font-bold text-gray-700">Giacenza Attuale ({formData.unitType})</label>
                                            <input type="number" step="0.01" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500 outline-none transition-all bg-nature-50/50 border-nature-200" required value={formData.stockQuantity} onChange={e => setFormData({ ...formData, stockQuantity: e.target.value })} />
                                        </div>

                                        <div className="col-span-2 md:col-span-1 space-y-2">
                                            <label className="block text-sm font-bold text-gray-700">Soglia Allerta ({formData.unitType})</label>
                                            <input type="number" step="0.01" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500 outline-none transition-all bg-red-50/30 border-red-200" required value={formData.lowStockThreshold} onChange={e => setFormData({ ...formData, lowStockThreshold: e.target.value })} />
                                        </div>

                                        <div className="col-span-2 flex flex-wrap items-center gap-6">
                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                <input type="checkbox" checked={formData.isVariableWeight} onChange={e => setFormData({ ...formData, isVariableWeight: e.target.checked })} className="w-5 h-5 text-nature-600 rounded focus:ring-nature-500 transition-all border-gray-300" />
                                                <span className="text-sm font-bold text-gray-700 group-hover:text-nature-600 transition-colors">Peso Variabile</span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                <input type="checkbox" checked={formData.allowBackorder} onChange={e => setFormData({ ...formData, allowBackorder: e.target.checked })} className="w-5 h-5 text-nature-600 rounded focus:ring-nature-500 transition-all border-gray-300" />
                                                <span className="text-sm font-bold text-nature-700 group-hover:text-nature-900 transition-colors">Vendi oltre scorta (Bypass)</span>
                                            </label>
                                        </div>

                                        {formData.isVariableWeight && (
                                            <div className="col-span-2 text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                                                Il prezzo finale verrà calcolato quando peserai il prodotto per l'ordine.
                                            </div>
                                        )}

                                        <div className="col-span-2 space-y-2">
                                            <label className="block text-sm font-bold text-gray-700">Descrizione</label>
                                            <textarea className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500 outline-none transition-all h-24 resize-none" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                                        </div>

                                        <div className="col-span-2 space-y-2">
                                            <label className="block text-sm font-bold text-gray-700">Consiglio dell'Esperto (AI Tips)</label>
                                            <textarea className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500 outline-none transition-all h-20 resize-none" placeholder="Es: Ottimo per risotti..." value={formData.seasonalTips} onChange={e => setFormData({ ...formData, seasonalTips: e.target.value })} />
                                        </div>

                                        <div className="col-span-2 space-y-2">
                                            <label className="block text-sm font-bold text-gray-700">Immagine</label>
                                            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:bg-nature-50/50 hover:border-nature-300 transition-colors cursor-pointer relative">
                                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={e => setFormData({ ...formData, image: e.target.files?.[0] || null })} />
                                                <Upload className="mx-auto text-gray-400 mb-2" />
                                                <p className="text-gray-500 font-medium text-sm">{formData.image ? (formData.image as File).name : 'Clicca o trascina una foto qui'}</p>
                                            </div>
                                        </div>
                                    </div>

                                </form>
                            </div>
                            <div className="p-6 border-t border-gray-100 flex justify-end gap-4 bg-gray-50/50">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors">Annulla</button>
                                <button type="submit" form="product-form" className="px-6 py-2.5 bg-nature-600 text-white font-bold rounded-xl hover:bg-nature-700 shadow-md transition-all active:scale-95">Salva Prodotto</button>
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
