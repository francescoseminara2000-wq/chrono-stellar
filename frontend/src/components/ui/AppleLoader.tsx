import React, { useRef, useEffect } from 'react';

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
    const videoRef = useRef<HTMLVideoElement>(null);

    // Risoluzione dimensioni ottimali per il video (ora quadrato 1:1)
    let dimension = 130;
    if (typeof size === 'number') {
        dimension = size;
    } else {
        switch (size) {
            case 'sm': dimension = 72; break;
            case 'md': dimension = 130; break;
            case 'lg': dimension = 170; break;
            case 'xl': dimension = 220; break;
        }
    }

    // Assicura autoplay su tutti i browser mobili e desktop
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.defaultMuted = true;
            videoRef.current.muted = true;
            videoRef.current.play().catch(() => {
                // Autoplay policy fallback: muted play
            });
        }
    }, []);

    return (
        <div className={`flex flex-col items-center justify-center select-none ${inline ? 'inline-flex' : ''} ${className}`}>
            <div 
                className="relative flex items-center justify-center overflow-hidden"
                style={{ width: dimension, height: dimension }}
            >
                {/* 
                  Video MP4 animazione mela smangiucchiata -> intera (720x720 quadrato)
                  mix-blend-multiply fonde lo sfondo #ffffff rendendolo trasparente
                */}
                <video
                    ref={videoRef}
                    src="/apple-loader.mp4?v=2"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    disablePictureInPicture
                    className="w-full h-full object-contain pointer-events-none select-none mix-blend-multiply"
                />
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
