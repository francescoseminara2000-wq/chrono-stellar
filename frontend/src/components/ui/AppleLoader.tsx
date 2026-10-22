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
    hideText?: boolean;
    textSize?: number;
    textBold?: boolean;
    textOffset?: number;
}

export const AppleLoader: React.FC<AppleLoaderProps> = ({
    size = 'md',
    text,
    inline = false,
    className = '',
    playbackRate,
    videoUrl,
    hideText = false,
    textSize,
    textBold,
    textOffset,
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

    // Frase di caricamento elegante: se text non fornito, usa quella delle impostazioni o default
    const displayPhrase = text !== undefined 
        ? text 
        : (settings?.appleLoaderPhrase || 'Caricando gli scaffali...');
    const cleanPhrase = displayPhrase ? displayPhrase.replace(/\.+$/, '').trim() : '';

    // Tipografia, grassetto e posizionamento verticale con eventuale sovrapposizione
    const effectiveTextSize = textSize ?? (settings?.appleLoaderTextSize && settings.appleLoaderTextSize > 0 ? settings.appleLoaderTextSize : 28);
    const effectiveTextBold = textBold !== undefined 
        ? textBold 
        : (settings?.appleLoaderTextBold !== undefined ? settings.appleLoaderTextBold : true);
    const effectiveTextOffset = textOffset !== undefined 
        ? textOffset 
        : (settings?.appleLoaderTextOffset !== undefined ? settings.appleLoaderTextOffset : 16);

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

            {/* Frase di caricamento elegante (font script brand Ortofrutta Butti) con posizionamento/sovrapposizione dinamico */}
            {!hideText && cleanPhrase && (
                <div 
                    className="relative z-10 text-center pointer-events-none transition-all duration-150 px-2"
                    style={{ marginTop: `${effectiveTextOffset}px` }}
                >
                    <p 
                        className="font-script tracking-wide flex items-center justify-center gap-1 select-none text-nature-950"
                        style={{ 
                            fontSize: `${effectiveTextSize}px`,
                            fontWeight: effectiveTextBold ? 700 : 400,
                            lineHeight: 1.15,
                            textShadow: effectiveTextOffset < 0 
                                ? '0 1px 3px rgba(255, 255, 255, 0.95), 0 2px 8px rgba(255, 255, 255, 0.8), 0 0 12px rgba(255, 255, 255, 0.9)' 
                                : '0 1px 2px rgba(0, 0, 0, 0.05)'
                        }}
                    >
                        <span>{cleanPhrase}</span>
                        <span className="inline-flex text-emerald-700 tracking-normal font-sans font-bold text-[0.8em]">
                            <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                            <span className="animate-bounce" style={{ animationDelay: '180ms' }}>.</span>
                            <span className="animate-bounce" style={{ animationDelay: '360ms' }}>.</span>
                        </span>
                    </p>
                </div>
            )}
        </div>
    );
};
