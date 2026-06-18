import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Search, PackagePlus, ArrowUp, ArrowDown, Save } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

interface Product {
    id: number;
    name: string;
    stockQuantity: number;
    unitType: string;
}

interface QuickStockModalProps {
    onClose: () => void;
    onUpdateComplete: () => void;
}

const QwertyKeyboard = ({ value, onChange }: { value: string, onChange: (v: string) => void }) => {
    const rows = [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
    ];

    const handleKey = (key: string) => onChange(value + key);
    const handleBackspace = () => onChange(value.slice(0, -1));
    const handleClear = () => onChange('');
    const handleSpace = () => onChange(value + ' ');

    return (
        <div className="flex flex-col gap-2 w-full animate-in slide-in-from-bottom-2 fade-in duration-200">
            <div className="flex justify-between items-center mb-1 px-1">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tastiera Testuale</span>
                <button type="button" onClick={handleClear} className="text-red-500 text-xs font-bold hover:bg-red-50 px-2 py-1 rounded">Pulisci</button>
            </div>
            {rows.map((row, i) => (
                <div key={i} className="flex justify-center gap-1">
                    {row.map(key => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => handleKey(key.toLowerCase())}
                            className="flex-1 min-w-[28px] max-w-[40px] h-12 bg-white border border-gray-200 shadow-sm rounded-lg flex items-center justify-center font-bold text-gray-700 hover:bg-nature-50 hover:border-nature-300 transition-colors active:scale-95 text-lg"
                        >
                            {key}
                        </button>
                    ))}
                    {i === 2 && (
                        <button
                            type="button"
                            onClick={handleBackspace}
                            className="flex-[1.5] max-w-[60px] h-12 bg-gray-100 border border-gray-200 shadow-sm rounded-lg flex items-center justify-center font-bold text-gray-700 hover:bg-gray-200 transition-colors active:scale-95"
                        >
                            <span className="text-xl">⌫</span>
                        </button>
                    )}
                </div>
            ))}
            <div className="flex justify-center gap-1 mt-1">
                <button
                    type="button"
                    onClick={handleSpace}
                    className="w-full max-w-[300px] h-12 bg-white border border-gray-200 shadow-sm rounded-lg flex items-center justify-center font-bold text-gray-400 hover:bg-gray-100 active:scale-95 uppercase text-xs tracking-wider"
                >
                    Spazio
                </button>
            </div>
        </div>
    );
};

const NumericKeyboard = ({ value, onChange }: { value: string, onChange: (v: string) => void }) => {
    const keys = [
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
        ['.', '0', '⌫']
    ];

    const handleKey = (key: string) => {
        if (key === '⌫') {
            onChange(value.slice(0, -1));
        } else if (key === '.') {
            if (!value.includes('.')) onChange(value + '.');
        } else {
            onChange(value + key);
        }
    };

    const handleClear = () => onChange('');

    return (
        <div className="flex flex-col gap-2 h-full w-full animate-in slide-in-from-bottom-2 fade-in duration-200">
            <div className="flex justify-between items-center mb-1 px-1">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tastierino Numerico</span>
                <button type="button" onClick={handleClear} className="text-red-500 text-xs font-bold hover:bg-red-50 px-2 py-1 rounded">Pulisci</button>
            </div>
            <div className="grid grid-cols-3 gap-2 flex-1">
                {keys.map((row, i) => (
                    <React.Fragment key={i}>
                        {row.map(k => (
                            <button
                                key={k}
                                type="button"
                                onClick={() => handleKey(k)}
                                className={`h-14 lg:h-16 flex items-center justify-center rounded-xl shadow-sm border border-gray-200 font-bold transition-all active:scale-95 ${k === '⌫' ? 'bg-red-50 text-red-500 hover:bg-red-100 border-red-100' : 'bg-white text-gray-800 text-2xl hover:bg-nature-50 border-gray-200'}`}
                            >
                                {k}
                            </button>
                        ))}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

export const QuickStockModal: React.FC<QuickStockModalProps> = ({ onClose, onUpdateComplete }) => {
    const { token } = useAuthStore();
    const [products, setProducts] = useState<Product[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [activeInput, setActiveInput] = useState<'search' | 'amount' | null>('search');

    // Form State
    const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');
    const [amount, setAmount] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingProducts, setIsFetchingProducts] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isTouchDevice, setIsTouchDevice] = useState(false);

    useEffect(() => {
        setIsTouchDevice(window.matchMedia('(pointer: coarse)').matches && window.innerWidth >= 768);
    }, []);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await fetch('/api/admin/products', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) throw new Error('Failed to fetch products');
                const data = await res.json();
                setProducts(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsFetchingProducts(false);
            }
        };
        fetchProducts();
    }, [token]);

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct || !amount) return;

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            setError('Inserire una quantità valida maggiore di zero.');
            return;
        }

        setIsLoading(true);
        setError('');
        setSuccessMessage('');

        try {
            const currentStock = Number(selectedProduct.stockQuantity) || 0;
            const newStock = adjustmentType === 'add'
                ? currentStock + numAmount
                : currentStock - numAmount;

            // Avoid negative stock unless specific business logic allows it
            if (newStock < 0) {
                throw new Error('La quantità non può essere negativa.');
            }

            const res = await fetch(`/api/admin/products/${selectedProduct.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ stockQuantity: newStock })
            });

            if (!res.ok) throw new Error("Errore durante l'aggiornamento del prodotto.");

            setSuccessMessage(`Scorta aggiornata con successo! Nuova quantità: ${newStock} ${selectedProduct.unitType}`);

            // Update local state to reflect change instantly if user tries again
            setSelectedProduct({ ...selectedProduct, stockQuantity: newStock });

            // Also update the list so if they deselect and reselect it's accurate
            setProducts(products.map(p => p.id === selectedProduct.id ? { ...p, stockQuantity: newStock } : p));
            setAmount('');

            // Notify parent to refresh main table behind the modal
            onUpdateComplete();

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-white z-[200]" onClick={() => setActiveInput(null)}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full h-full flex flex-col overflow-hidden bg-white"
            >
                <div className="p-4 lg:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-nature-100 text-nature-600 rounded-xl">
                            <PackagePlus size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">Rifornimento Rapido</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X size={24} className="text-gray-500" />
                    </button>
                </div>

                <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                    <div className="p-4 lg:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
                                {error}
                            </div>
                        )}

                        {successMessage && (
                            <div className="p-4 bg-green-50 rounded-2xl border border-green-100 flex flex-col items-center text-center space-y-3">
                                <span className="text-green-700 font-medium text-lg">{successMessage}</span>
                                <button
                                    type="button"
                                    onClick={() => { setSelectedProduct(null); setSuccessMessage(''); setActiveInput('search'); setSearchQuery(''); }}
                                    className="px-6 py-3 bg-white border-2 border-green-200 text-green-700 font-bold rounded-xl shadow-sm hover:bg-green-100 transition-colors active:scale-95 flex items-center gap-2"
                                >
                                    <Search size={18} /> Avanti col prossimo prodotto
                                </button>
                            </div>
                        )}

                        {/* Step 1: Select Product */}
                        {!selectedProduct ? (
                            <div className="space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="text"
                                        inputMode={isTouchDevice ? "none" : "text"}
                                        readOnly={isTouchDevice}
                                        placeholder="Cerca prodotto per nome..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveInput('search');
                                        }}
                                        className={`w-full pl-10 pr-4 py-3 rounded-xl border ${activeInput === 'search' ? 'border-nature-500 ring-2 ring-nature-500/20' : 'border-gray-200'} outline-none cursor-pointer`}
                                    />
                                </div>

                                <div className="border border-gray-100 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                                    {isFetchingProducts ? (
                                        <div className="p-8 text-center text-gray-500">Caricamento prodotti...</div>
                                    ) : filteredProducts.length === 0 ? (
                                        <div className="p-8 text-center text-gray-500">Nessun prodotto trovato.</div>
                                    ) : (
                                        <div className="divide-y divide-gray-50">
                                            {filteredProducts.map(product => (
                                                <button
                                                    key={product.id}
                                                    onClick={() => {
                                                        setSelectedProduct(product);
                                                        setError('');
                                                        setSuccessMessage('');
                                                        setActiveInput('amount');
                                                    }}
                                                    className="w-full text-left p-3 hover:bg-nature-50 flex justify-between items-center transition-colors"
                                                >
                                                    <span className="font-medium text-gray-800">{product.name}</span>
                                                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                        Stock: {product.stockQuantity} {product.unitType}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* Step 2: Manage Stock for Selected Product */
                            <form id="quick-stock-form" onSubmit={handleSubmit} className="space-y-6">
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center">
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">Prodotto Selezionato</p>
                                        <p className="font-bold text-gray-800">{selectedProduct.name}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-500 mb-1">Stock Attuale</p>
                                        <p className="font-bold text-nature-700 bg-nature-100 px-3 py-1 rounded-lg inline-block">
                                            {selectedProduct.stockQuantity} {selectedProduct.unitType}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex justify-center">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedProduct(null)}
                                        className="text-sm text-blue-600 hover:text-blue-800 underline"
                                    >
                                        Cambia Prodotto
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    <label className="block text-sm font-bold text-gray-700">Tipo Operazione</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setAdjustmentType('add')}
                                            className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${adjustmentType === 'add'
                                                ? 'border-green-500 bg-green-50 text-green-700'
                                                : 'border-gray-100 bg-white text-gray-500 hover:bg-gray-50'
                                                }`}
                                        >
                                            <ArrowUp size={20} />
                                            <span className="font-bold">Aggiungi</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAdjustmentType('subtract')}
                                            className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${adjustmentType === 'subtract'
                                                ? 'border-red-500 bg-red-50 text-red-700'
                                                : 'border-gray-100 bg-white text-gray-500 hover:bg-gray-50'
                                                }`}
                                        >
                                            <ArrowDown size={20} />
                                            <span className="font-bold">Sottrai</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-gray-700">Quantità</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            inputMode={isTouchDevice ? "none" : "text"}
                                            readOnly={isTouchDevice}
                                            required
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveInput('amount');
                                            }}
                                            className={`w-full p-4 pr-12 text-lg font-bold rounded-xl border ${activeInput === 'amount' ? 'border-nature-500 ring-2 ring-nature-500/20' : 'border-gray-200'} transition-all outline-none cursor-pointer bg-white`}
                                            placeholder="0.00"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                                            {selectedProduct.unitType}
                                        </span>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>

                    {/* Right Column / Bottom Row: Virtual Keyboards */}
                    {activeInput && isTouchDevice && (
                        <div className="p-4 lg:p-6 bg-gray-50 border-t flex flex-col lg:border-t-0 lg:border-l border-gray-100 shrink-0 lg:w-[450px] transition-all duration-300 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] lg:shadow-none z-10 w-full fixed lg:relative bottom-[76px] lg:bottom-0 left-0">
                            {activeInput === 'search' && <QwertyKeyboard value={searchQuery} onChange={setSearchQuery} />}
                            {activeInput === 'amount' && <NumericKeyboard value={amount} onChange={setAmount} />}
                        </div>
                    )}
                </div>

                <div className="p-4 lg:p-6 border-t border-gray-100 bg-white flex justify-end gap-3 shrink-0 fixed lg:relative bottom-0 left-0 w-full z-20">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        Chiudi
                    </button>
                    {selectedProduct && (
                        <button
                            type="submit"
                            form="quick-stock-form"
                            disabled={isLoading}
                            className="flex items-center gap-2 px-5 py-2.5 bg-nature-600 text-white font-bold rounded-xl hover:bg-nature-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                        >
                            {isLoading ? 'Salvataggio...' : (
                                <>
                                    <Save size={18} />
                                    Conferma
                                </>
                            )}
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
};
