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

    // Reset selection when opening
    React.useEffect(() => {
        if (isOpen) setSelectedWeight(currentWeight || 1);
    }, [isOpen, currentWeight]);

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

                        {/* Presets Grid */}
                        <div className="grid grid-cols-3 gap-3 mb-8">
                            {displayWeights.map(weight => (
                                <button
                                    key={weight}
                                    onClick={() => setSelectedWeight(weight)}
                                    className={`py-3 rounded-xl font-bold text-lg border-2 transition-all ${selectedWeight === weight
                                            ? 'border-nature-600 bg-nature-50 text-nature-700'
                                            : 'border-gray-100 bg-white text-gray-600 hover:border-nature-200 shadow-sm'
                                        }`}
                                >
                                    {weight} kg
                                </button>
                            ))}
                        </div>

                        {/* Custom Input (Stepper) */}
                        <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl mb-8 border border-gray-100">
                            <button
                                onClick={() => setSelectedWeight(prev => Math.max(0.1, Number((prev - 0.1).toFixed(1))))}
                                className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center font-bold text-xl text-nature-600 active:scale-95 transition-transform"
                            >
                                -
                            </button>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-nature-900 leading-none">
                                    {selectedWeight.toFixed(1)} <span className="text-base text-gray-500 font-normal">kg</span>
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                    Circa € {((selectedWeight * unitPrice) / 100).toFixed(2)}
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedWeight(prev => Number((prev + 0.1).toFixed(1)))}
                                className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center font-bold text-xl text-nature-600 active:scale-95 transition-transform"
                            >
                                +
                            </button>
                        </div>

                        {/* Confirm Button */}
                        <button
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
