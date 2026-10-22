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

    // Su smartphone l'offset si adatta proporzionalmente per evitare che la scritta copra eccessivamente l'illustrazione
    const isOverlapping = effectiveTextOffset < 0;
    const mobileOffset = isOverlapping
        ? Math.round(effectiveTextOffset * 0.75)
        : Math.round(effectiveTextOffset * 0.85);

    // Assicura autoplay ultra-affidabile su smartphone (iOS Safari / Android) anche in risparmio energetico
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        video.defaultMuted = true;
        video.muted = true;
        video.playsInline = true;
        video.playbackRate = effectivePlaybackRate;

        const playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                // Se il browser o la modalità risparmio batteria blocca l'autoplay, sblocca al primo tocco o scroll
                const resumePlay = () => {
                    video.play().catch(() => {});
                    window.removeEventListener('touchstart', resumePlay);
                    window.removeEventListener('scroll', resumePlay);
                };
                window.addEventListener('touchstart', resumePlay, { passive: true, once: true });
                window.addEventListener('scroll', resumePlay, { passive: true, once: true });
            });
        }
    }, [effectivePlaybackRate, videoSrc]);

    return (
        <div className={`flex flex-col items-center justify-center select-none w-full max-w-full ${inline ? 'inline-flex' : ''} ${className}`}>
            {/* 
              Video MP4 animazione mela smangiucchiata -> intera (720x720 quadrato)
              mix-blend-multiply fonde lo sfondo #ffffff rendendolo trasparente.
              Su mobile la larghezza è vincolata a min(dimension, 72vw, 320px) per non debordare mai dallo schermo.
            */}
            <div 
                className="relative flex items-center justify-center overflow-hidden transition-all duration-200 aspect-square shrink-0"
                style={{ 
                    width: `min(${dimension}px, 72vw)`,
                    height: `min(${dimension}px, 72vw)`,
                    maxWidth: '320px',
                    maxHeight: '320px'
                }}
            >
                <video
                    ref={videoRef}
                    key={videoSrc}
                    src={videoSrc}
                    autoPlay
                    loop
                    muted
                    playsInline
                    // @ts-ignore
                    webkit-playsinline="true"
                    x5-playsinline="true"
                    preload="auto"
                    disablePictureInPicture
                    // @ts-ignore
                    disableRemotePlayback
                    controls={false}
                    className="w-full h-full object-contain pointer-events-none select-none mix-blend-multiply transform-gpu will-change-transform"
                />
            </div>

            {/* Frase di caricamento elegante (font script brand Ortofrutta Butti) con posizionamento e font clamp mobile-friendly */}
            {!hideText && cleanPhrase && (
                <div 
                    className="relative z-10 text-center pointer-events-none transition-all duration-150 px-3 w-full max-w-full flex justify-center mt-[var(--mobile-offset)] sm:mt-[var(--desktop-offset)]"
                    style={{ 
                        ['--mobile-offset' as any]: `${mobileOffset}px`,
                        ['--desktop-offset' as any]: `${effectiveTextOffset}px`
                    }}
                >
                    <p 
                        className="font-script tracking-wide flex items-center justify-center gap-1 select-none text-nature-950 whitespace-nowrap overflow-hidden text-ellipsis max-w-[95vw]"
                        style={{ 
                            // Su smartphone si adatta fluidamente tra 18px e la dimensione desktop impostata per evitare a capo sgradevoli
                            fontSize: `clamp(18px, 5.6vw, ${effectiveTextSize}px)`,
                            fontWeight: effectiveTextBold ? 700 : 400,
                            lineHeight: 1.15,
                            textShadow: isOverlapping 
                                ? '0 1px 3px rgba(255, 255, 255, 0.95), 0 2px 8px rgba(255, 255, 255, 0.85), 0 0 12px rgba(255, 255, 255, 0.9)' 
                                : '0 1px 2px rgba(0, 0, 0, 0.05)'
                        }}
                    >
                        <span className="truncate">{cleanPhrase}</span>
                        <span className="inline-flex text-emerald-700 tracking-normal font-sans font-bold text-[0.8em] shrink-0">
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
