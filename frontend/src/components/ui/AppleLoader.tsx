import React, { useRef, useEffect } from 'react';
import { useAppState } from '../../store/useAppState';
import { sanitizeImageUrl } from '../../utils/imageUrl';

export interface AppleLoaderProps {
    size?: 'sm' | 'md' | 'lg' | 'xl' | number;
    text?: string;
    subtext?: string;
    inline?: boolean;
    className?: string;
    playbackRate?: number;
    videoUrl?: string;
}

export const AppleLoader: React.FC<AppleLoaderProps> = ({
    size = 'md',
    text,
    subtext,
    inline = false,
    className = '',
    playbackRate,
    videoUrl,
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const { settings } = useAppState();
    const effectivePlaybackRate = playbackRate ?? (settings?.appleLoaderPlaybackRate && settings.appleLoaderPlaybackRate > 0 ? settings.appleLoaderPlaybackRate : 1.0);
    const videoSrc = videoUrl || (settings?.appleLoaderVideoUrl ? sanitizeImageUrl(settings.appleLoaderVideoUrl) : '/apple-loader.mp4?v=4');

    // Risoluzione dimensioni ottimali per il video (mela e loader scalabili da impostazioni)
    const baseDimension = settings?.appleLoaderDimension && settings.appleLoaderDimension > 0 
        ? settings.appleLoaderDimension 
        : 200;

    let dimension = baseDimension;
    if (typeof size === 'number') {
        dimension = size;
    } else {
        const scale = baseDimension / 200;
        switch (size) {
            case 'sm': dimension = Math.round(110 * scale); break;
            case 'md': dimension = Math.round(190 * scale); break;
            case 'lg': dimension = Math.round(250 * scale); break;
            case 'xl': dimension = Math.round(300 * scale); break;
        }
    }

    // Assicura autoplay su tutti i browser mobili e desktop e applica velocita di riproduzione
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.defaultMuted = true;
            videoRef.current.muted = true;
            videoRef.current.playbackRate = effectivePlaybackRate;
            videoRef.current.play().catch(() => {
                // Autoplay policy fallback: muted play
            });
        }
    }, [effectivePlaybackRate]);

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
                    key={videoSrc}
                    src={videoSrc}
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
