import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface AppleLoaderProps {
    size?: 'sm' | 'md' | 'lg' | 'xl' | number;
    text?: string;
    subtext?: string;
    inline?: boolean;
    className?: string;
}

export const AppleLoader: React.FC<AppleLoaderProps> = ({
    size = 'md',
    text,
    subtext,
    inline = false,
    className = '',
}) => {
    // Steps:
    // 0: Smangiucchiata (3 morsi scavati, torsolo e semini visibili)
    // 1: Primo morso si ricompone (pop!)
    // 2: Secondo morso si ricompone (pop!)
    // 3: Terzo morso si ricompone -> Mela intera e tonda!
    // 4: Mela intera festeggia: rimbalzino felice, luccichio ✨ e fogliolina che ondeggia
    const [step, setStep] = useState<number>(0);

    useEffect(() => {
        let isMounted = true;
        const intervals = [500, 450, 450, 650, 600]; // Durata di ogni fase

        const runCycle = (currentStep: number) => {
            if (!isMounted) return;
            const nextStep = (currentStep + 1) % 5;
            const timer = setTimeout(() => {
                if (isMounted) {
                    setStep(nextStep);
                    runCycle(nextStep);
                }
            }, intervals[currentStep]);
            return timer;
        };

        const timer = runCycle(0);
        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, []);

    // Risoluzione dimensioni
    let dimension = 80;
    if (typeof size === 'number') {
        dimension = size;
    } else {
        switch (size) {
            case 'sm': dimension = 48; break;
            case 'md': dimension = 84; break;
            case 'lg': dimension = 120; break;
            case 'xl': dimension = 160; break;
        }
    }

    // Stato dei 3 morsi (true = ancora mancante / morso aperto; false = ricomposto / pelle rossa tornata)
    const bite1Missing = step === 0;
    const bite2Missing = step <= 1;
    const bite3Missing = step <= 2;
    const isFull = step >= 3;
    const isSparkling = step === 4;

    return (
        <div className={`flex flex-col items-center justify-center select-none ${inline ? 'inline-flex' : ''} ${className}`}>
            <div 
                className="relative flex items-center justify-center"
                style={{ width: dimension, height: dimension }}
            >
                {/* Micro aura luminosa calda alla base */}
                <div 
                    className="absolute inset-0 bg-red-400/15 rounded-full blur-xl pointer-events-none transition-opacity duration-500"
                    style={{ opacity: isFull ? 0.7 : 0.25 }}
                />

                <motion.svg
                    viewBox="0 0 120 120"
                    className="w-full h-full overflow-visible drop-shadow-sm"
                    animate={{
                        scale: isSparkling ? [1, 1.08, 1] : 1,
                        y: isSparkling ? [0, -4, 0] : 0,
                    }}
                    transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 15,
                    }}
                >
                    <defs>
                        {/* Sfumatura Rosso Mela Succosa */}
                        <radialGradient id="appleSkinGrad" cx="38%" cy="32%" r="68%">
                            <stop offset="0%" stopColor="#FB7185" />
                            <stop offset="35%" stopColor="#E11D48" />
                            <stop offset="78%" stopColor="#BE123C" />
                            <stop offset="100%" stopColor="#881337" />
                        </radialGradient>

                        {/* Sfumatura Polpa / Torsolo interno */}
                        <radialGradient id="appleCoreGrad" cx="45%" cy="50%" r="55%">
                            <stop offset="0%" stopColor="#FEFCE8" />
                            <stop offset="80%" stopColor="#FEF08A" />
                            <stop offset="100%" stopColor="#FDE047" />
                        </radialGradient>

                        {/* Sfumatura Fogliolina Smeraldo */}
                        <linearGradient id="appleLeafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#34D399" />
                            <stop offset="100%" stopColor="#059669" />
                        </linearGradient>

                        {/* Maschera per ritagliare i morsi dalla buccia rossa */}
                        <mask id="appleBiteMask">
                            {/* Il bianco mantiene la pelle rossa */}
                            <rect x="0" y="0" width="120" height="120" fill="white" />
                            
                            {/* I cerchi neri scavano via la buccia rossa per simulare il morso */}
                            {/* Morso 1: Alto a destra */}
                            <motion.circle
                                cx="88"
                                cy="45"
                                r="13"
                                fill="black"
                                animate={{
                                    scale: bite1Missing ? 1 : 0,
                                    opacity: bite1Missing ? 1 : 0,
                                }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 500,
                                    damping: 22,
                                }}
                                style={{ transformOrigin: '88px 45px' }}
                            />

                            {/* Morso 2: Centro a destra */}
                            <motion.circle
                                cx="95"
                                cy="65"
                                r="15"
                                fill="black"
                                animate={{
                                    scale: bite2Missing ? 1 : 0,
                                    opacity: bite2Missing ? 1 : 0,
                                }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 500,
                                    damping: 22,
                                }}
                                style={{ transformOrigin: '95px 65px' }}
                            />

                            {/* Morso 3: Basso a destra */}
                            <motion.circle
                                cx="87"
                                cy="83"
                                r="13"
                                fill="black"
                                animate={{
                                    scale: bite3Missing ? 1 : 0,
                                    opacity: bite3Missing ? 1 : 0,
                                }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 500,
                                    damping: 22,
                                }}
                                style={{ transformOrigin: '87px 83px' }}
                            />
                        </mask>
                    </defs>

                    {/* Picciolo in legno (marrone caldo) */}
                    <path
                        d="M 60 28 C 60 16, 68 12, 73 9"
                        fill="none"
                        stroke="#78350F"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                    />

                    {/* Fogliolina verde smeraldo (con animazione ondeggiante al completamento) */}
                    <motion.g
                        animate={{
                            rotate: isSparkling ? [0, 18, -8, 0] : [0, 2, 0],
                        }}
                        transition={{
                            duration: isSparkling ? 0.6 : 2,
                            ease: 'easeInOut',
                        }}
                        style={{ transformOrigin: '60px 24px' }}
                    >
                        <path
                            d="M 61 24 C 61 14, 76 10, 83 14 C 85 24, 71 28, 61 24 Z"
                            fill="url(#appleLeafGrad)"
                        />
                        {/* Nervatura foglia */}
                        <path
                            d="M 63 23 C 69 20, 75 17, 80 15"
                            fill="none"
                            stroke="#A7F3D0"
                            strokeWidth="1"
                            strokeLinecap="round"
                            opacity={0.8}
                        />
                    </motion.g>

                    {/* 1. LAYER SOTTOSTANTE: Polpa interna e semini (visibili quando la mela è smangiucchiata) */}
                    <g opacity={isFull ? 0 : 1} className="transition-opacity duration-300">
                        {/* Forma base della mela in colore polpa */}
                        <path
                            d="M 60 32 C 48 24, 22 26, 18 48 C 14 68, 26 98, 52 104 C 57 105, 59 103, 60 102 C 61 103, 63 105, 68 104 C 94 98, 106 68, 102 48 C 98 26, 72 24, 60 32 Z"
                            fill="url(#appleCoreGrad)"
                        />

                        {/* Semini della mela nel torsolo */}
                        <ellipse cx="64" cy="62" rx="2" ry="4" transform="rotate(18 64 62)" fill="#451A03" />
                        <ellipse cx="68" cy="71" rx="2" ry="4" transform="rotate(-15 68 71)" fill="#451A03" />

                        {/* Linea sottile del torsolo centrale */}
                        <path
                            d="M 60 42 C 58 55, 58 75, 60 90"
                            fill="none"
                            stroke="#EAB308"
                            strokeWidth="1.2"
                            strokeDasharray="2 3"
                            opacity={0.6}
                        />
                    </g>

                    {/* 2. LAYER PRINCIPALE: Buccia rossa con maschera dei morsi che si ricompongono */}
                    <path
                        d="M 60 32 C 48 24, 22 26, 18 48 C 14 68, 26 98, 52 104 C 57 105, 59 103, 60 102 C 61 103, 63 105, 68 104 C 94 98, 106 68, 102 48 C 98 26, 72 24, 60 32 Z"
                        fill="url(#appleSkinGrad)"
                        mask="url(#appleBiteMask)"
                    />

                    {/* Riflesso di luce lucido sulla guancia sinistra */}
                    <path
                        d="M 30 42 C 26 50, 26 65, 34 78"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                        opacity={0.35}
                    />

                    {/* Particelle di ricostruzione (scintilline che scattano quando il morso si richiude) */}
                    <AnimatePresence>
                        {step === 1 && (
                            <motion.g
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1.2 }}
                                exit={{ opacity: 0, scale: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <circle cx="94" cy="42" r="2.5" fill="#FB7185" />
                                <circle cx="102" cy="46" r="1.5" fill="#F43F5E" />
                            </motion.g>
                        )}
                        {step === 2 && (
                            <motion.g
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1.2 }}
                                exit={{ opacity: 0, scale: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <circle cx="102" cy="62" r="2.5" fill="#FB7185" />
                                <circle cx="107" cy="68" r="1.5" fill="#F43F5E" />
                            </motion.g>
                        )}
                        {step === 3 && (
                            <motion.g
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1.2 }}
                                exit={{ opacity: 0, scale: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <circle cx="95" cy="84" r="2.5" fill="#FB7185" />
                                <circle cx="101" cy="80" r="1.5" fill="#F43F5E" />
                            </motion.g>
                        )}
                    </AnimatePresence>

                    {/* Luccichio festoso ✨ quando la mela è integra al 100% */}
                    <AnimatePresence>
                        {isSparkling && (
                            <motion.g
                                initial={{ opacity: 0, scale: 0, rotate: -20 }}
                                animate={{ opacity: 1, scale: [0, 1.3, 1], rotate: 0 }}
                                exit={{ opacity: 0, scale: 0 }}
                                transition={{ duration: 0.45 }}
                                style={{ transformOrigin: '38px 36px' }}
                            >
                                {/* Stellina 4 punte */}
                                <path
                                    d="M 38 28 Q 38 36 46 36 Q 38 36 38 44 Q 38 36 30 36 Q 38 36 38 28 Z"
                                    fill="#FEF08A"
                                />
                                <circle cx="38" cy="36" r="2" fill="white" />
                            </motion.g>
                        )}
                    </AnimatePresence>
                </motion.svg>
            </div>

            {/* Testo di caricamento */}
            {text && (
                <div className="mt-3 text-center">
                    <p className="text-sm font-extrabold text-gray-800 tracking-tight flex items-center justify-center gap-1.5">
                        {text}
                        <span className="inline-flex">
                            <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                            <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                            <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                        </span>
                    </p>
                    {subtext && (
                        <p className="text-xs text-gray-400 font-medium mt-0.5 max-w-xs mx-auto">
                            {subtext}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};
