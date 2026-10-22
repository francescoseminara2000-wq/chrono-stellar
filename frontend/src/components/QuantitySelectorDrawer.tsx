import React from 'react';
import { X, Check, Delete, Minus, Plus, RotateCcw } from 'lucide-react';
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
        } else if (key === 'clear') {
            newVal = '1';
        } else {
            // Number typed (no decimals allowed for PZ/BOX)
            if (newVal === '0') {
                newVal = key;
            } else {
                if (newVal.length < 3) {
                    newVal = newVal + key;
                }
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
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-[70] p-5 sm:p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] max-w-md mx-auto max-h-[94vh] flex flex-col justify-between overflow-y-auto border-t border-gray-100"
                    >
                        {/* Mobile Pull Handle Pill */}
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-3 shrink-0" />

                        {/* Modal Header */}
                        <div className="flex justify-between items-center mb-4 shrink-0">
                            <div>
                                <h3 className="text-lg sm:text-xl font-black text-nature-900">{productName}</h3>
                                <p className="text-xs text-gray-500 font-bold">
                                    Prezzo: € {(unitPrice / 100).toFixed(2)} / {labelLower}
                                </p>
                            </div>
                            <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors cursor-pointer shrink-0">
                                <X size={20} className="text-gray-600" />
                            </button>
                        </div>

                        {/* Tab Selector */}
                        <div className="flex bg-gray-100/90 p-1 rounded-2xl mb-4 border border-gray-200/40">
                            <button
                                type="button"
                                onClick={() => setShowKeypad(false)}
                                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                                    !showKeypad ? 'bg-white text-emerald-950 shadow-sm font-extrabold' : 'text-gray-500 hover:text-gray-800'
                                }`}
                            >
                                Valori Rapidi
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowKeypad(true)}
                                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                                    showKeypad ? 'bg-white text-emerald-950 shadow-sm font-extrabold' : 'text-gray-500 hover:text-gray-800'
                                }`}
                            >
                                Tastiera Numerica
                            </button>
                        </div>

                        {/* Digital Scale Display Box (Sopra la tastiera / presets) */}
                        <div className="flex items-center justify-between bg-gradient-to-br from-emerald-50/80 via-white to-nature-50/50 p-4 sm:p-5 rounded-2xl mb-4 border border-emerald-100/90 shadow-xs">
                            <button
                                type="button"
                                onClick={() => handleStepQty(-1)}
                                className="w-12 h-12 bg-white hover:bg-emerald-50 text-emerald-800 rounded-xl shadow-xs border border-emerald-200/70 font-bold text-2xl flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                                title="Diminuisci 1"
                            >
                                <Minus size={20} className="stroke-[2.5]" />
                            </button>

                            <div className="text-center px-2">
                                <div className="text-4xl sm:text-5xl font-black text-nature-950 font-mono tracking-tight leading-none flex items-baseline justify-center gap-1.5">
                                    <span>{showKeypad ? (keypadInput || '0') : selectedQty}</span>
                                    <span className="text-xl sm:text-2xl font-bold text-emerald-700 font-sans">{labelLower}</span>
                                </div>
                                <div className="text-xs sm:text-sm font-semibold text-gray-500 mt-1.5">
                                    Totale stimato: <span className="text-emerald-900 font-extrabold font-mono">€ {((selectedQty * unitPrice) / 100).toFixed(2)}</span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => handleStepQty(1)}
                                className="w-12 h-12 bg-white hover:bg-emerald-50 text-emerald-800 rounded-xl shadow-xs border border-emerald-200/70 font-bold text-2xl flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                                title="Aumenta 1"
                            >
                                <Plus size={20} className="stroke-[2.5]" />
                            </button>
                        </div>

                        {/* Presets or Full-Width Keypad Content */}
                        {showKeypad ? (
                            <div className="w-full mb-4 animate-in fade-in zoom-in-95 duration-150">
                                <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                        <button
                                            key={num}
                                            type="button"
                                            onClick={() => handleKeypadPress(String(num))}
                                            className="h-13 sm:h-14 rounded-2xl bg-white border border-gray-200/80 hover:bg-emerald-50/50 hover:border-emerald-300 text-xl font-bold text-gray-800 active:scale-95 transition-all shadow-xs flex items-center justify-center cursor-pointer"
                                        >
                                            {num}
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => handleKeypadPress('clear')}
                                        className="h-13 sm:h-14 rounded-2xl bg-gray-50 hover:bg-gray-100 border border-gray-200/80 text-gray-600 shadow-xs active:scale-95 transition-all flex items-center justify-center cursor-pointer gap-1 text-xs font-bold"
                                        title="Resetta a 1"
                                    >
                                        <RotateCcw size={15} />
                                        <span>Reset</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleKeypadPress('0')}
                                        className="h-13 sm:h-14 rounded-2xl bg-white border border-gray-200/80 hover:bg-emerald-50/50 hover:border-emerald-300 text-xl font-bold text-gray-800 active:scale-95 transition-all shadow-xs flex items-center justify-center cursor-pointer"
                                    >
                                        0
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleKeypadPress('backspace')}
                                        className="h-13 sm:h-14 rounded-2xl bg-rose-50 border border-rose-200/80 hover:bg-rose-100 text-rose-600 flex items-center justify-center active:scale-95 transition-all shadow-xs cursor-pointer"
                                        title="Cancella cifra"
                                    >
                                        <Delete size={22} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mb-4 w-full">
                                {displayQuantities.map(qty => (
                                    <button
                                        key={qty}
                                        type="button"
                                        onClick={() => handleSelectQty(qty)}
                                        className={`py-3.5 sm:py-4 rounded-2xl font-black text-base sm:text-lg border-2 transition-all cursor-pointer ${
                                            selectedQty === qty
                                                ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm ring-2 ring-emerald-600/20'
                                                : 'border-gray-100 bg-white text-gray-700 hover:border-emerald-200 hover:bg-gray-50 shadow-xs'
                                        }`}
                                    >
                                        {qty} {labelLower}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Confirm Button */}
                        <button
                            type="button"
                            onClick={() => {
                                onConfirm(selectedQty);
                                onClose();
                            }}
                            className="w-full bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white font-extrabold py-4 rounded-2xl shadow-lg transition-all text-base sm:text-lg flex items-center justify-center gap-2 cursor-pointer mt-1"
                        >
                            <Check size={22} className="stroke-[3]" />
                            <span>Conferma {selectedQty} {labelLower}</span>
                            <span className="opacity-60">•</span>
                            <span>€ {((selectedQty * unitPrice) / 100).toFixed(2)}</span>
                        </button>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
