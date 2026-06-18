import { useState } from 'react';
import { ShoppingBasket, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';
import { sanitizeImageUrl } from '../utils/imageUrl';
import { WeightSelectorDrawer } from './WeightSelectorDrawer';
import { QuantitySelectorDrawer } from './QuantitySelectorDrawer';

export const CartSummary: React.FC = () => {
    const { items, getEstimatedTotal, hasVariableWeightItems, removeItem, updateQuantity } = useCartStore();
    const [selectedProductForWeight, setSelectedProductForWeight] = useState<any | null>(null);
    const [selectedProductForUnit, setSelectedProductForUnit] = useState<any | null>(null);

    const totalCents = getEstimatedTotal();
    const hasVariable = hasVariableWeightItems();
    const totalFormatted = (totalCents / 100).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });

    if (items.length === 0) {
        return (
            <div className="p-12 text-center bg-white rounded-3xl shadow-sm border border-gray-100">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
                    <ShoppingBasket size={40} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Il tuo carrello è vuoto</h3>
                <p className="text-gray-500 mb-8">Non hai ancora aggiunto prodotti freschi.</p>
                <Link to="/shop" className="inline-block bg-nature-600 text-white px-8 py-3 rounded-full font-bold hover:bg-nature-700 transition-colors shadow-lg shadow-nature-100">
                    Inizia lo Shopping
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-100/50 border border-white overflow-hidden">
            {/* Header */}
            <div className="bg-nature-50 px-6 py-4 border-b border-nature-100 flex justify-between items-center">
                <h2 className="text-lg font-bold text-nature-900 flex items-center gap-2">
                    <ShoppingBasket size={20} /> Carrello <span className="text-nature-600 font-normal">({items.length} prodotti)</span>
                </h2>
            </div>

            <div className="p-6">
                <div className="space-y-6">
                    {items.map((item) => (
                        <div key={item.id} className="flex gap-4 items-start group">
                            {/* Image */}
                            <div className="w-20 h-20 bg-gray-50 rounded-2xl overflow-hidden shrink-0 border border-gray-100">
                                {item.imageUrl ? (
                                    <img src={sanitizeImageUrl(item.imageUrl)} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                        {item.name[0]}
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="font-bold text-gray-900 leading-tight">{item.name}</h3>
                                    <button
                                        onClick={() => removeItem(item.id)}
                                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <p className="text-sm text-gray-500 mb-3">
                                    € {(item.priceCents / 100).toFixed(2)} / {item.unitType === 'BOX' ? 'conf.' : item.unitType.toLowerCase()}
                                    {item.isVariableWeight && <span className="ml-2 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-bold">~Peso</span>}
                                </p>

                                <div className="flex items-center justify-between">
                                    {/* Edit Quantity */}
                                    {item.unitType === 'KG' ? (
                                        <button
                                            type="button"
                                            onClick={() => setSelectedProductForWeight({
                                                id: item.id,
                                                name: item.name,
                                                priceCents: item.priceCents,
                                                unitType: item.unitType,
                                                isVariableWeight: item.isVariableWeight,
                                                stepAmount: item.stepAmount,
                                                imageUrl: item.imageUrl,
                                                quantity: item.quantity
                                            })}
                                            className="flex items-center gap-2 text-sm font-bold text-nature-900 bg-nature-50 px-3 py-1.5 rounded-lg border border-nature-100 hover:bg-nature-100 transition-colors cursor-pointer"
                                            title="Modifica peso"
                                        >
                                            {item.quantity} kg
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1 border border-gray-100">
                                            <button
                                                onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}
                                                className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm text-gray-600 hover:text-nature-600 font-bold disabled:opacity-50"
                                            >
                                                -
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedProductForUnit({
                                                    id: item.id,
                                                    name: item.name,
                                                    priceCents: item.priceCents,
                                                    unitType: item.unitType,
                                                    isVariableWeight: item.isVariableWeight,
                                                    stepAmount: item.stepAmount,
                                                    imageUrl: item.imageUrl,
                                                    quantity: item.quantity
                                                })}
                                                className="w-8 text-center bg-transparent border-none focus:outline-none outline-none font-bold text-sm text-gray-900 hover:text-nature-600 transition-colors py-1"
                                                title="Modifica con tastiera"
                                            >
                                                {item.quantity}
                                            </button>
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm text-gray-600 hover:text-nature-600 font-bold"
                                            >
                                                +
                                            </button>
                                        </div>
                                    )}

                                    <span className="font-bold text-lg text-nature-900">
                                        {((item.priceCents * item.quantity) / 100).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="border-t border-dashed border-gray-200 my-6"></div>

                {/* Totals */}
                <div className="space-y-2">
                    <div className="flex justify-between items-end">
                        <span className="text-gray-500 font-medium">Totale Stimato</span>
                        <span className="text-3xl font-bold text-nature-900">{totalFormatted}</span>
                    </div>
                    {hasVariable && (
                        <p className="text-xs text-right text-gray-400">* Prezzo finale soggetto a pesatura</p>
                    )}
                </div>

                <Link to="/checkout" className="block w-full bg-nature-900 text-white font-bold py-4 rounded-xl shadow-lg shadow-nature-900/20 hover:bg-nature-800 active:scale-[0.99] transition-all text-center mt-6 text-lg tracking-wide">
                    Procedi al Checkout <span className="ml-2">→</span>
                </Link>
            </div>

            {/* Drawers */}
            <WeightSelectorDrawer
                isOpen={!!selectedProductForWeight}
                onClose={() => setSelectedProductForWeight(null)}
                productName={selectedProductForWeight?.name || ''}
                currentWeight={selectedProductForWeight ? selectedProductForWeight.quantity : 0}
                unitPrice={selectedProductForWeight?.priceCents || 0}
                onConfirm={(weight) => {
                    if (selectedProductForWeight) {
                        updateQuantity(selectedProductForWeight.id, weight);
                    }
                }}
            />

            <QuantitySelectorDrawer
                isOpen={!!selectedProductForUnit}
                onClose={() => setSelectedProductForUnit(null)}
                productName={selectedProductForUnit?.name || ''}
                currentQty={selectedProductForUnit ? selectedProductForUnit.quantity : 0}
                unitPrice={selectedProductForUnit?.priceCents || 0}
                unitType={selectedProductForUnit?.unitType as any}
                onConfirm={(qty) => {
                    if (selectedProductForUnit) {
                        updateQuantity(selectedProductForUnit.id, qty);
                    }
                }}
            />
        </div>
    );
};
