import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLoadingStore } from '../../store/useLoadingStore';
import { AppleLoader } from './AppleLoader';

export const LoadingOverlay: React.FC = () => {
    const { isLoading, message, subtext } = useLoadingStore();

    return (
        <AnimatePresence>
            {isLoading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="fixed inset-0 z-[99999] flex items-center justify-center bg-white/70 backdrop-blur-md px-4 select-none"
                    style={{ pointerEvents: 'auto' }}
                >
                    <motion.div
                        initial={{ scale: 0.85, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.85, opacity: 0, y: 10 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                        className="bg-white/95 border border-emerald-100 shadow-2xl rounded-3xl p-8 sm:p-10 max-w-md w-full flex flex-col items-center justify-center text-center relative overflow-hidden"
                    >
                        {/* Riflesso decorativo di sfondo */}
                        <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-100/50 rounded-full blur-2xl pointer-events-none" />
                        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-rose-100/40 rounded-full blur-2xl pointer-events-none" />

                        <AppleLoader 
                            size="xl" 
                            text={message || 'Caricamento in corso...'} 
                            subtext={subtext}
                        />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
