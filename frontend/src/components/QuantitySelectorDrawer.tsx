import React from 'react';
import { X, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface QuantitySelectorDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    productName: string;
    currentQty: number;
    unitPrice: number;
    unitType: 'PZ' | 'BOX';
    onConfirm: (qty: number) => void;
}

export const QuantitySelectorDrawer: React.FC<QuantitySelectorDrawerProps> = ({
    isOpen,
    onClose,
    productName,
    currentQty,
    unitPrice,
    unitType,
    onConfirm
}) => {
    // Common quantities for units
    const presetQuantities = [1, 2, 3, 4, 6, 8, 10, 12, 15];

    // If current qty is not in presets, add it temporarily (unless 0)
    const displayQuantities = currentQty > 0 && !presetQuantities.includes(currentQty)
        ? [...presetQuantities, currentQty].sort((a, b) => a - b)
        : presetQuantities;

    const [selectedQty, setSelectedQty] = React.useState(currentQty || 1);
    const [showKeypad, setShowKeypad] = React.useState(false);
    const [keypadInput, setKeypadInput] = React.useState(String(currentQty || 1));

    // Reset selection when opening
    React.useEffect(() => {
        if (isOpen) {
            const q = currentQty || 1;
            setSelectedQty(q);
            setKeypadInput(String(q));
            setShowKeypad(false);
        }
    }, [isOpen, currentQty]);

    const handleSelectQty = (q: number) => {
        setSelectedQty(q);
        setKeypadInput(String(q));
    };

    const handleStepQty = (step: number) => {
        setSelectedQty(prev => {
            const newVal = Math.max(1, prev + step);
            setKeypadInput(String(newVal));
            return newVal;
        });
    };

    const handleKeypadPress = (key: string) => {
        let newVal = keypadInput;
        if (key === 'backspace') {
            newVal = newVal.slice(0, -1);
            if (newVal === '') newVal = '0';
        } else {
            // Number typed (no decimals allowed for PZ/BOX)
            if (newVal === '0') {
                newVal = key;
            } else {
                newVal = newVal + key;
            }
        }

        setKeypadInput(newVal);

        const parsed = parseInt(newVal, 10);
        if (!isNaN(parsed) && parsed >= 0) {
            setSelectedQty(parsed);
        }
    };

    const labelLower = unitType === 'BOX' ? 'box' : 'pz';

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[70] p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] max-w-md mx-auto"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-nature-900">{productName}</h3>
                                <p className="text-sm text-gray-500">Seleziona la quantità desiderata</p>
                            </div>
                            <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                                <X size={20} className="text-gray-600" />
                            </button>
                        </div>

                        {/* Tab Selector */}
                        <div className="flex bg-gray-100/80 p-1 rounded-xl mb-6 border border-gray-200/30">
                            <button
                                type="button"
                                onClick={() => setShowKeypad(false)}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${!showKeypad ? 'bg-white text-nature-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                            >
                                Valori Rapidi
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowKeypad(true)}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${showKeypad ? 'bg-white text-nature-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                            >
                                Tastiera Numerica
                            </button>
                        </div>

                        {/* Presets or Keypad Content */}
                        {showKeypad ? (
                            <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 mb-6 max-w-[280px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <div className="grid grid-cols-3 gap-2">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                        <button
                                            key={num}
                                            type="button"
                                            onClick={() => handleKeypadPress(String(num))}
                                            className="h-12 rounded-xl bg-white border border-gray-200/60 hover:bg-nature-50 hover:border-nature-300 text-lg font-bold text-gray-800 active:scale-95 transition-all shadow-sm flex items-center justify-center"
                                        >
                                            {num}
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        disabled
                                        className="h-12 rounded-xl bg-gray-100 border border-gray-200/30 text-lg font-bold text-gray-300 flex items-center justify-center cursor-not-allowed"
                                    >
                                        .
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleKeypadPress('0')}
                                        className="h-12 rounded-xl bg-white border border-gray-200/60 hover:bg-nature-50 hover:border-nature-300 text-lg font-bold text-gray-800 active:scale-95 transition-all shadow-sm flex items-center justify-center"
                                    >
                                        0
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleKeypadPress('backspace')}
                                        className="h-12 rounded-xl bg-red-50 border border-red-100 hover:bg-red-105 hover:border-red-200 text-lg font-bold text-red-600 flex items-center justify-center active:scale-95 transition-all shadow-sm"
                                    >
                                        ⌫
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-3 mb-6">
                                {displayQuantities.map(qty => (
                                    <button
                                        key={qty}
                                        type="button"
                                        onClick={() => handleSelectQty(qty)}
                                        className={`py-3 rounded-xl font-bold text-lg border-2 transition-all ${selectedQty === qty
                                                ? 'border-nature-600 bg-nature-50 text-nature-700'
                                                : 'border-gray-100 bg-white text-gray-600 hover:border-nature-200 shadow-sm'
                                            }`}
                                    >
                                        {qty} {labelLower}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Custom Input (Stepper) */}
                        <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl mb-8 border border-gray-100">
                            <button
                                type="button"
                                onClick={() => handleStepQty(-1)}
                                className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center font-bold text-xl text-nature-600 active:scale-95 transition-transform"
                            >
                                -
                            </button>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-nature-900 leading-none">
                                    {showKeypad ? (keypadInput || '0') : selectedQty} <span className="text-base text-gray-500 font-normal">{labelLower}</span>
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                    Prezzo: € {((selectedQty * unitPrice) / 100).toFixed(2)}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleStepQty(1)}
                                className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center font-bold text-xl text-nature-600 active:scale-95 transition-transform"
                            >
                                +
                            </button>
                        </div>

                        {/* Confirm Button */}
                        <button
                            type="button"
                            onClick={() => {
                                onConfirm(selectedQty);
                                onClose();
                            }}
                            className="w-full bg-nature-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-nature-700 active:scale-95 transition-all text-lg flex items-center justify-center gap-2"
                        >
                            <Check size={24} />
                            Conferma {selectedQty} {labelLower}
                        </button>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
