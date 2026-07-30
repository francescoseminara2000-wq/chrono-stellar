import React from 'react';
import { X, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface WeightSelectorDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    productName: string;
    currentWeight: number;
    unitPrice: number;
    onConfirm: (weight: number) => void;
}

export const WeightSelectorDrawer: React.FC<WeightSelectorDrawerProps> = ({
    isOpen,
    onClose,
    productName,
    currentWeight,
    unitPrice,
    onConfirm
}) => {
    // Common weights in KG
    const presetWeights = [0.5, 1, 1.5, 2, 2.5, 3];

    // If current weight is not in presets, add it temporarily (unless 0)
    const displayWeights = currentWeight > 0 && !presetWeights.includes(currentWeight)
        ? [...presetWeights, currentWeight].sort((a, b) => a - b)
        : presetWeights;

    const [selectedWeight, setSelectedWeight] = React.useState(currentWeight || 1);
    const [showKeypad, setShowKeypad] = React.useState(false);
    const [keypadInput, setKeypadInput] = React.useState(String(currentWeight || 1));

    // Reset selection when opening
    React.useEffect(() => {
        if (isOpen) {
            const w = currentWeight || 1;
            setSelectedWeight(w);
            setKeypadInput(String(w));
            setShowKeypad(false);
        }
    }, [isOpen, currentWeight]);

    const handleSelectWeight = (w: number) => {
        setSelectedWeight(w);
        setKeypadInput(String(w));
    };

    const handleStepWeight = (step: number) => {
        setSelectedWeight(prev => {
            const newVal = Math.max(0.1, Number((prev + step).toFixed(1)));
            setKeypadInput(String(newVal));
            return newVal;
        });
    };

    const handleKeypadPress = (key: string) => {
        let newVal = keypadInput;
        if (key === 'backspace') {
            newVal = newVal.slice(0, -1);
            if (newVal === '') newVal = '0';
        } else if (key === '.') {
            if (!newVal.includes('.')) {
                newVal = newVal === '' ? '0.' : newVal + '.';
            }
        } else {
            // Number typed
            if (newVal === '0') {
                newVal = key;
            } else {
                newVal = newVal + key;
            }
        }

        setKeypadInput(newVal);

        const parsed = parseFloat(newVal);
        if (!isNaN(parsed) && parsed >= 0) {
            setSelectedWeight(parsed);
        }
    };

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
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-[70] p-5 sm:p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] max-w-md mx-auto max-h-[92vh] flex flex-col justify-between overflow-y-auto border-t border-gray-100"
                    >
                        {/* Mobile Pull Handle Pill */}
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-3 shrink-0" />

                        <div className="flex justify-between items-center mb-4 shrink-0">
                            <div>
                                <h3 className="text-lg sm:text-xl font-black text-nature-900">{productName}</h3>
                                <p className="text-xs text-gray-500 font-bold">Seleziona la quantità in kg desiderata</p>
                            </div>
                            <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors cursor-pointer shrink-0">
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
                                        onClick={() => handleKeypadPress('.')}
                                        className="h-12 rounded-xl bg-white border border-gray-200/60 hover:bg-nature-50 hover:border-nature-300 text-lg font-black text-gray-805 active:scale-95 transition-all shadow-sm flex items-center justify-center"
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
                                {displayWeights.map(weight => (
                                    <button
                                        key={weight}
                                        type="button"
                                        onClick={() => handleSelectWeight(weight)}
                                        className={`py-3 rounded-xl font-bold text-lg border-2 transition-all ${selectedWeight === weight
                                                ? 'border-nature-600 bg-nature-50 text-nature-700'
                                                : 'border-gray-100 bg-white text-gray-600 hover:border-nature-200 shadow-sm'
                                            }`}
                                    >
                                        {weight} kg
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Custom Input (Stepper) */}
                        <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl mb-8 border border-gray-100">
                            <button
                                type="button"
                                onClick={() => handleStepWeight(-0.1)}
                                className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center font-bold text-xl text-nature-600 active:scale-95 transition-transform"
                            >
                                -
                            </button>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-nature-900 leading-none">
                                    {showKeypad ? (keypadInput || '0') : selectedWeight.toFixed(1)} <span className="text-base text-gray-500 font-normal">kg</span>
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                    Circa € {((selectedWeight * unitPrice) / 100).toFixed(2)}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleStepWeight(0.1)}
                                className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center font-bold text-xl text-nature-600 active:scale-95 transition-transform"
                            >
                                +
                            </button>
                        </div>

                        {/* Confirm Button */}
                        <button
                            type="button"
                            onClick={() => {
                                onConfirm(selectedWeight);
                                onClose();
                            }}
                            className="w-full bg-nature-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-nature-700 active:scale-95 transition-all text-lg flex items-center justify-center gap-2"
                        >
                            <Check size={24} />
                            Conferma {selectedWeight} kg
                        </button>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
