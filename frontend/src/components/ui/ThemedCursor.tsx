import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { Leaf, ArrowUpRight, ShoppingBag, ZoomIn, MessageCircle } from 'lucide-react';
import { useAppState } from '../../store/useAppState';

interface TrailParticle {
    id: number;
    x: number;
    y: number;
    size: number;
    rotation: number;
    color: string;
    type: 'dew' | 'pollen' | 'leaf';
}

interface ClickParticle {
    id: number;
    dx: number;
    dy: number;
    scale: number;
    rotation: number;
    content: string | 'leaf' | 'dew';
    color?: string;
}

interface ClickBurst {
    id: number;
    x: number;
    y: number;
    effect: 'botanical' | 'fruits' | 'ripple' | 'sparkles' | 'hearts' | 'fireworks' | 'none';
    color: string;
    particles: ClickParticle[];
}

export type CursorStyleType =
    | 'nature-arrow'
    | 'sprout'
    | 'leaf-trail'
    | 'smart-pill'
    | 'apple-harvest'
    | 'water-droplet'
    | 'artisan-stamp'
    | 'bee-flutter'
    | 'minimal-lens'
    | 'system';

export type ClickEffectType =
    | 'botanical'
    | 'fruits'
    | 'ripple'
    | 'sparkles'
    | 'hearts'
    | 'fireworks'
    | 'none';

interface ThemedCursorProps {
    previewStyle?: CursorStyleType;
    previewColor?: string;
    previewClickEffect?: ClickEffectType;
    isInteractivePreview?: boolean;
}

const FRUITS_POOL = ['🍎', '🍓', '🍋', '🥑', '🥕', '🍇', '🌿', '🍒', '🍊', '🥬'];
const SPARKLES_POOL = ['✨', '✦', '⭐', '💫', '⚡'];
const HEARTS_POOL = ['💚', '🌱', '🌿', '🍃', '🤍'];
const CONFETTI_COLORS = ['#16a34a', '#eab308', '#f97316', '#ef4444', '#10b981', '#3b82f6', '#ec4899'];

export const ThemedCursor: React.FC<ThemedCursorProps> = ({
    previewStyle,
    previewColor,
    previewClickEffect,
    isInteractivePreview = false
}) => {
    const { settings } = useAppState();
    const location = useLocation();

    // Check device capabilities
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const [hoverType, setHoverType] = useState<string>('default');
    const [isMouseDown, setIsMouseDown] = useState(false);
    const [isTextInput, setIsTextInput] = useState(false);
    const [mouseVelocity, setMouseVelocity] = useState(0);
    const [trailParticles, setTrailParticles] = useState<TrailParticle[]>([]);
    const [clickBursts, setClickBursts] = useState<ClickBurst[]>([]);

    const lastPosRef = useRef({ x: 0, y: 0, time: Date.now() });
    const particleIdRef = useRef(0);
    const burstIdRef = useRef(0);

    // Active configurations
    const activeStyle = (previewStyle || settings?.customCursorStyle || 'nature-arrow') as CursorStyleType;
    const activeColor = previewColor || settings?.customCursorColor || '#16a34a';
    const activeClickEffect = (previewClickEffect || settings?.customCursorClickEffect || 'botanical') as ClickEffectType;
    const isEnabled = isInteractivePreview ? true : (settings?.customCursorEnabled !== false);
    const isAdminActive = isInteractivePreview ? true : (settings?.customCursorActiveInAdmin || false);
    const isInsideAdmin = location.pathname.startsWith('/admin');

    // Motion values for smooth hardware-accelerated tracking
    const mouseX = useMotionValue(-100);
    const mouseY = useMotionValue(-100);

    // Springs for different movement characteristics
    const dotX = useSpring(mouseX, { damping: 45, stiffness: 600, mass: 0.1 });
    const dotY = useSpring(mouseY, { damping: 45, stiffness: 600, mass: 0.1 });

    const ringX = useSpring(mouseX, { damping: 26, stiffness: 220, mass: 0.4 });
    const ringY = useSpring(mouseY, { damping: 26, stiffness: 220, mass: 0.4 });

    const badgeX = useSpring(mouseX, { damping: 22, stiffness: 180, mass: 0.5 });
    const badgeY = useSpring(mouseY, { damping: 22, stiffness: 180, mass: 0.5 });

    const beeX = useSpring(mouseX, { damping: 18, stiffness: 140, mass: 0.6 });
    const beeY = useSpring(mouseY, { damping: 18, stiffness: 140, mass: 0.6 });

    // Touch screen detection
    useEffect(() => {
        const checkTouch = () => {
            const hasTouch = window.matchMedia('(pointer: coarse)').matches ||
                ('ontouchstart' in window) ||
                (navigator.maxTouchPoints > 0);
            setIsTouchDevice(hasTouch);
        };
        checkTouch();
        window.addEventListener('resize', checkTouch);
        return () => window.removeEventListener('resize', checkTouch);
    }, []);

    // Spawn rich click burst generator
    const spawnClickBurst = useCallback((x: number, y: number) => {
        if (activeClickEffect === 'none') return;

        const burstId = ++burstIdRef.current;
        const particles: ClickParticle[] = [];

        if (activeClickEffect === 'botanical') {
            for (let i = 0; i < 7; i++) {
                const angle = (i / 7) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
                const distance = 35 + Math.random() * 35;
                particles.push({
                    id: i,
                    dx: Math.cos(angle) * distance,
                    dy: Math.sin(angle) * distance,
                    scale: 0.8 + Math.random() * 0.5,
                    rotation: Math.random() * 360,
                    content: i % 2 === 0 ? 'leaf' : 'dew',
                    color: activeColor
                });
            }
        } else if (activeClickEffect === 'fruits') {
            const shuffled = [...FRUITS_POOL].sort(() => 0.5 - Math.random());
            for (let i = 0; i < 5; i++) {
                const angle = -Math.PI / 2 + (Math.random() * 1.4 - 0.7);
                const speed = 45 + Math.random() * 45;
                particles.push({
                    id: i,
                    dx: Math.cos(angle) * speed,
                    dy: Math.sin(angle) * speed,
                    scale: 0.9 + Math.random() * 0.4,
                    rotation: (Math.random() - 0.5) * 60,
                    content: shuffled[i % shuffled.length]
                });
            }
        } else if (activeClickEffect === 'sparkles') {
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const distance = 30 + Math.random() * 40;
                particles.push({
                    id: i,
                    dx: Math.cos(angle) * distance,
                    dy: Math.sin(angle) * distance,
                    scale: 0.8 + Math.random() * 0.6,
                    rotation: Math.random() * 180,
                    content: SPARKLES_POOL[i % SPARKLES_POOL.length]
                });
            }
        } else if (activeClickEffect === 'hearts') {
            for (let i = 0; i < 4; i++) {
                particles.push({
                    id: i,
                    dx: (Math.random() - 0.5) * 45,
                    dy: -(35 + Math.random() * 50),
                    scale: 0.9 + Math.random() * 0.4,
                    rotation: (Math.random() - 0.5) * 30,
                    content: HEARTS_POOL[i % HEARTS_POOL.length]
                });
            }
        } else if (activeClickEffect === 'fireworks') {
            for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI * 2 + (Math.random() * 0.3);
                const distance = 40 + Math.random() * 50;
                particles.push({
                    id: i,
                    dx: Math.cos(angle) * distance,
                    dy: Math.sin(angle) * distance,
                    scale: 0.7 + Math.random() * 0.6,
                    rotation: Math.random() * 360,
                    content: 'confetti',
                    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]
                });
            }
        }

        const newBurst: ClickBurst = {
            id: burstId,
            x,
            y,
            effect: activeClickEffect,
            color: activeColor,
            particles
        };

        setClickBursts(prev => [...prev.slice(-6), newBurst]);

        setTimeout(() => {
            setClickBursts(prev => prev.filter(b => b.id !== burstId));
        }, 750);
    }, [activeClickEffect, activeColor]);

    // Mouse movement and hover detection
    useEffect(() => {
        if (isTouchDevice || !isEnabled || activeStyle === 'system') return;
        if (isInsideAdmin && !isAdminActive && !isInteractivePreview) return;

        const handleMouseMove = (e: MouseEvent) => {
            mouseX.set(e.clientX);
            mouseY.set(e.clientY);

            if (!isVisible) setIsVisible(true);

            // Compute mouse velocity for water jelly or bee flutter
            const now = Date.now();
            const dt = Math.max(1, now - lastPosRef.current.time);
            const dist = Math.hypot(e.clientX - lastPosRef.current.x, e.clientY - lastPosRef.current.y);
            const vel = Math.min(1.6, dist / dt);
            setMouseVelocity(vel);

            // Trail for leaf-trail style
            if (activeStyle === 'leaf-trail') {
                if (dist > 18) {
                    lastPosRef.current = { x: e.clientX, y: e.clientY, time: now };
                    const types: ('dew' | 'pollen' | 'leaf')[] = ['dew', 'pollen', 'leaf'];
                    const chosenType = types[Math.floor(Math.random() * types.length)];
                    const newParticle: TrailParticle = {
                        id: ++particleIdRef.current,
                        x: e.clientX + (Math.random() * 8 - 4),
                        y: e.clientY + (Math.random() * 8 - 4),
                        size: chosenType === 'leaf' ? 12 : chosenType === 'pollen' ? 6 : 8,
                        rotation: Math.random() * 360,
                        color: activeColor,
                        type: chosenType
                    };

                    setTrailParticles(prev => [...prev.slice(-18), newParticle]);
                }
            } else {
                lastPosRef.current = { x: e.clientX, y: e.clientY, time: now };
            }

            // Inspect element under cursor
            const target = e.target as HTMLElement | null;
            if (!target) return;

            const isText = Boolean(target.closest('input, textarea, [contenteditable="true"]'));
            setIsTextInput(isText);

            const interactiveEl = target.closest('a, button, [role="button"], select, .cursor-pointer, [data-cursor]');
            if (interactiveEl) {
                setIsHovering(true);
                const customType = interactiveEl.getAttribute('data-cursor');
                if (customType) {
                    setHoverType(customType);
                } else if (interactiveEl.closest('.product-card') || interactiveEl.getAttribute('href')?.includes('/shop') || interactiveEl.getAttribute('href')?.includes('/product/')) {
                    setHoverType('product');
                } else if (interactiveEl.tagName === 'BUTTON' && (interactiveEl.textContent?.toLowerCase().includes('carrello') || interactiveEl.textContent?.toLowerCase().includes('aggiungi'))) {
                    setHoverType('cart');
                } else if (interactiveEl.tagName === 'IMG' || interactiveEl.querySelector('img')) {
                    setHoverType('zoom');
                } else if (interactiveEl.getAttribute('href')?.includes('wa.me') || interactiveEl.getAttribute('href')?.includes('tel:')) {
                    setHoverType('contact');
                } else {
                    setHoverType('link');
                }
            } else {
                setIsHovering(false);
                setHoverType('default');
            }
        };

        const handleMouseDown = (e: MouseEvent) => {
            setIsMouseDown(true);
            spawnClickBurst(e.clientX, e.clientY);
        };

        const handleMouseUp = () => setIsMouseDown(false);
        const handleMouseLeave = () => setIsVisible(false);
        const handleMouseEnter = () => setIsVisible(true);

        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleMouseUp);
        document.documentElement.addEventListener('mouseleave', handleMouseLeave);
        document.documentElement.addEventListener('mouseenter', handleMouseEnter);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mouseup', handleMouseUp);
            document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
            document.documentElement.removeEventListener('mouseenter', handleMouseEnter);
        };
    }, [isTouchDevice, isEnabled, activeStyle, activeColor, isInsideAdmin, isAdminActive, isInteractivePreview, isVisible, spawnClickBurst]);

    // Cleanup faded trail particles
    useEffect(() => {
        if (trailParticles.length === 0) return;
        const timer = setTimeout(() => {
            setTrailParticles(prev => prev.slice(1));
        }, 120);
        return () => clearTimeout(timer);
    }, [trailParticles]);

    // Don't render on touch or when system cursor is selected
    if (isTouchDevice || !isEnabled || activeStyle === 'system') return null;
    if (isInsideAdmin && !isAdminActive && !isInteractivePreview) return null;

    // Smart pill content resolver
    const getPillContent = () => {
        switch (hoverType) {
            case 'product':
                return { text: 'Scopri Reparto', icon: <Leaf size={12} className="text-emerald-400" /> };
            case 'cart':
                return { text: 'Nel Carrello', icon: <ShoppingBag size={12} className="text-amber-300" /> };
            case 'zoom':
                return { text: 'Dettagli', icon: <ZoomIn size={12} className="text-cyan-300" /> };
            case 'contact':
                return { text: 'Contatta', icon: <MessageCircle size={12} className="text-emerald-300" /> };
            default:
                return { text: 'Apri', icon: <ArrowUpRight size={12} className="text-white" /> };
        }
    };

    return (
        <div className="pointer-events-none fixed inset-0 z-[999999] overflow-hidden select-none">
            {/* CLICK BURSTS OVERLAY */}
            <AnimatePresence>
                {clickBursts.map(burst => (
                    <React.Fragment key={burst.id}>
                        {(burst.effect === 'botanical' || burst.effect === 'ripple') && (
                            <>
                                <motion.div
                                    initial={{ scale: 0.2, opacity: 0.9 }}
                                    animate={{ scale: burst.effect === 'ripple' ? 3.2 : 2.4, opacity: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.55, ease: 'easeOut' }}
                                    style={{
                                        left: burst.x,
                                        top: burst.y,
                                        borderColor: burst.color
                                    }}
                                    className="fixed w-12 h-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
                                />
                                <motion.div
                                    initial={{ scale: 0.1, opacity: 0.5 }}
                                    animate={{ scale: burst.effect === 'ripple' ? 4.5 : 3.0, opacity: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.7, ease: 'easeOut', delay: 0.05 }}
                                    style={{
                                        left: burst.x,
                                        top: burst.y,
                                        backgroundColor: `${burst.color}35`
                                    }}
                                    className="fixed w-10 h-10 -translate-x-1/2 -translate-y-1/2 rounded-full blur-xs"
                                />
                            </>
                        )}

                        {burst.particles.map(p => (
                            <motion.div
                                key={p.id}
                                initial={{
                                    x: burst.x,
                                    y: burst.y,
                                    scale: 0.2,
                                    opacity: 1,
                                    rotate: 0
                                }}
                                animate={{
                                    x: burst.x + p.dx,
                                    y: burst.y + p.dy,
                                    scale: p.scale,
                                    opacity: 0,
                                    rotate: p.rotation
                                }}
                                exit={{ opacity: 0 }}
                                transition={{
                                    duration: burst.effect === 'fruits' ? 0.65 : 0.52,
                                    ease: burst.effect === 'fruits' ? [0.15, 0.85, 0.35, 1.2] : 'easeOut'
                                }}
                                className="fixed -translate-x-1/2 -translate-y-1/2 flex items-center justify-center filter drop-shadow-xs"
                            >
                                {p.content === 'leaf' ? (
                                    <Leaf size={14} style={{ color: p.color || burst.color }} />
                                ) : p.content === 'dew' ? (
                                    <div
                                        className="w-2.5 h-2.5 rounded-full border border-white/70 bg-emerald-400 shadow-sm"
                                        style={{ backgroundColor: p.color || burst.color }}
                                    />
                                ) : p.content === 'confetti' ? (
                                    <div
                                        className="w-3 h-1.5 rounded-xs shadow-xs"
                                        style={{ backgroundColor: p.color || burst.color }}
                                    />
                                ) : (
                                    <span className="text-base leading-none select-none">
                                        {p.content}
                                    </span>
                                )}
                            </motion.div>
                        ))}
                    </React.Fragment>
                ))}
            </AnimatePresence>

            {/* CURSOR GRAPHICS (Hidden over text inputs) */}
            {!isTextInput && (
                <>
                    {/* STYLE 0: NATURE-ARROW (Freccia Botanica Evolutiva con Stati & Sprite) */}
                    {activeStyle === 'nature-arrow' && (
                        <>
                            {/* Halo / Aura on hover */}
                            <motion.div
                                style={{
                                    x: ringX,
                                    y: ringY,
                                    translateX: '-50%',
                                    translateY: '-50%',
                                    borderColor: `${activeColor}40`
                                }}
                                animate={{
                                    scale: isMouseDown ? 0.7 : isHovering ? 1.6 : 0.8,
                                    opacity: isVisible ? (isHovering ? 0.45 : 0.15) : 0,
                                    backgroundColor: isHovering ? `${activeColor}15` : 'transparent'
                                }}
                                transition={{ duration: 0.18 }}
                                className="w-10 h-10 rounded-full border border-dashed fixed pointer-events-none blur-[0.5px]"
                            />

                            {/* Main Arrow or Custom Sprite */}
                            <motion.div
                                style={{
                                    x: dotX,
                                    y: dotY,
                                    translateX: '-2px',
                                    translateY: '-2px'
                                }}
                                animate={{
                                    scale: isMouseDown ? 0.82 : isHovering ? 1.15 : 1,
                                    rotate: isMouseDown ? -8 : isHovering ? 12 : 0,
                                    opacity: isVisible ? 1 : 0
                                }}
                                transition={{ type: 'spring', damping: 18, stiffness: 350 }}
                                className="fixed filter drop-shadow-md select-none pointer-events-none"
                            >
                                {settings?.customCursorSpriteUrl ? (
                                    /* Custom Sprite Sheet Mode (5 frames of 48px each) */
                                    <div
                                        style={{
                                            width: '48px',
                                            height: '48px',
                                            backgroundImage: `url(${settings.customCursorSpriteUrl})`,
                                            backgroundRepeat: 'no-repeat',
                                            backgroundSize: '240px 48px',
                                            backgroundPosition: hoverType === 'cart'
                                                ? '-96px 0px'
                                                : hoverType === 'zoom'
                                                ? '-192px 0px'
                                                : isHovering
                                                ? '-48px 0px'
                                                : '0px 0px'
                                        }}
                                    />
                                ) : (
                                    /* Handcrafted Artisan Nature Arrow SVG */
                                    <div className="relative">
                                        {/* State: Zoom Lens */}
                                        {isHovering && hoverType === 'zoom' ? (
                                            <div className="relative -translate-x-2 -translate-y-2">
                                                <svg width="42" height="42" viewBox="0 0 36 36" fill="none">
                                                    {/* Outer Vine Wreath / Ghirlanda */}
                                                    <circle cx="16" cy="16" r="12" stroke="#ffffff" strokeWidth="3" />
                                                    <circle cx="16" cy="16" r="12" stroke={activeColor} strokeWidth="2.5" />
                                                    {/* Vine Leaf Accents */}
                                                    <path d="M26 8C27 5 30 5 31 7C31 9 29 11 26 10Z" fill="#86efac" stroke="#ffffff" strokeWidth="0.8" />
                                                    <path d="M6 22C4 24 4 27 6 28C8 28 9 26 8 24Z" fill="#86efac" stroke="#ffffff" strokeWidth="0.8" />
                                                    {/* Crystal Water Drop Lens */}
                                                    <circle cx="16" cy="16" r="10" fill="url(#lensWaterGrad)" opacity="0.65" />
                                                    <ellipse cx="13" cy="13" rx="3.5" ry="2" transform="rotate(-30 13 13)" fill="#ffffff" opacity="0.75" />
                                                    {/* Lens Handle */}
                                                    <path d="M25 25L33 33" stroke="#78350f" strokeWidth="3.5" strokeLinecap="round" />
                                                    <path d="M25 25L33 33" stroke="#a16207" strokeWidth="2" strokeLinecap="round" />
                                                    {/* Plus Icon inside Lens */}
                                                    <path d="M16 12V20M12 16H20" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
                                                    <defs>
                                                        <radialGradient id="lensWaterGrad" cx="0.4" cy="0.4" r="0.8">
                                                            <stop stopColor="#67e8f9" />
                                                            <stop offset="0.7" stopColor="#0284c7" />
                                                            <stop offset="1" stopColor="#0369a1" />
                                                        </radialGradient>
                                                    </defs>
                                                </svg>
                                            </div>
                                        ) : isHovering && hoverType === 'cart' ? (
                                            /* State: Cart - Arrow carrying rustic wicker basket */
                                            <div className="relative">
                                                <svg width="42" height="42" viewBox="0 0 38 38" fill="none">
                                                    {/* Outer White Border for maximum contrast */}
                                                    <path
                                                        d="M3 2C5 12 7 20 12 25C13.5 22.5 15.5 19.5 18 17.5C14 16 9 12 3 2Z"
                                                        fill="#ffffff"
                                                        stroke="#ffffff"
                                                        strokeWidth="3.5"
                                                        strokeLinejoin="round"
                                                    />
                                                    {/* Main Organic Leaf Body */}
                                                    <path
                                                        d="M3 2C5 12 7 20 12 25C13.5 22.5 15.5 19.5 18 17.5C14 16 9 12 3 2Z"
                                                        fill="url(#natureArrowGradCart)"
                                                        stroke={activeColor}
                                                        strokeWidth="1"
                                                    />
                                                    {/* Leaf Vein */}
                                                    <path d="M3 2C8 10 13 16 18 17.5" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
                                                    {/* Tendril Stem curving to basket */}
                                                    <path d="M18 17.5C21 16 23 18 24 21" stroke="#15803d" strokeWidth="1.8" strokeLinecap="round" />
                                                    {/* Wicker Basket Body */}
                                                    <g transform="translate(18, 17)">
                                                        {/* Basket Outline */}
                                                        <path d="M3 6L5 15C5.2 16 6 16.5 7 16.5H15C16 16.5 16.8 16 17 15L19 6H3Z" fill="#b45309" stroke="#ffffff" strokeWidth="1.2" />
                                                        {/* Wicker texture lines */}
                                                        <line x1="7" y1="7" x2="7" y2="15" stroke="#78350f" strokeWidth="0.8" />
                                                        <line x1="11" y1="7" x2="11" y2="16" stroke="#78350f" strokeWidth="0.8" />
                                                        <line x1="15" y1="7" x2="15" y2="15" stroke="#78350f" strokeWidth="0.8" />
                                                        {/* Fresh Red Apple inside basket */}
                                                        <circle cx="9" cy="5" r="3.5" fill="#ef4444" stroke="#ffffff" strokeWidth="0.7" />
                                                        {/* Fresh Orange inside basket */}
                                                        <circle cx="14" cy="5.5" r="3" fill="#f97316" stroke="#ffffff" strokeWidth="0.7" />
                                                        {/* Little green leaf on fruit */}
                                                        <path d="M9 2C10 1 12 2 11 3Z" fill="#22c55e" />
                                                    </g>
                                                    <defs>
                                                        <linearGradient id="natureArrowGradCart" x1="3" y1="2" x2="18" y2="25" gradientUnits="userSpaceOnUse">
                                                            <stop stopColor="#22c55e" />
                                                            <stop offset="0.6" stopColor={activeColor} />
                                                            <stop offset="1" stopColor="#14532d" />
                                                        </linearGradient>
                                                    </defs>
                                                </svg>
                                            </div>
                                        ) : isHovering ? (
                                            /* State: Hover / Link - Arrow blooming a delicate golden-white blossom */
                                            <div className="relative">
                                                <svg width="40" height="40" viewBox="0 0 36 36" fill="none">
                                                    {/* Outer Contrast Contour */}
                                                    <path
                                                        d="M3 2C5 12 7 20 12 25C13.8 22 16 19.5 18.5 17.5C14 16 9 12 3 2Z"
                                                        fill="#ffffff"
                                                        stroke="#ffffff"
                                                        strokeWidth="3.5"
                                                        strokeLinejoin="round"
                                                    />
                                                    {/* Organic Leaf Body with Vibrant Chlorophyll Gradient */}
                                                    <path
                                                        d="M3 2C5 12 7 20 12 25C13.8 22 16 19.5 18.5 17.5C14 16 9 12 3 2Z"
                                                        fill="url(#natureArrowGradHover)"
                                                    />
                                                    {/* Central Vein */}
                                                    <path d="M3 2C8 10 13 16 18.5 17.5" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.85" />
                                                    {/* Secondary Vine and Side Leaflet */}
                                                    <path d="M18.5 17.5C21 16 23 18 24 21C22 22 19 21 18.5 17.5Z" fill="#86efac" stroke="#ffffff" strokeWidth="0.8" />
                                                    {/* Morning Dew Droplet on tip */}
                                                    <circle cx="6" cy="7" r="1.8" fill="#ffffff" opacity="0.9" />
                                                    <circle cx="5.5" cy="6.5" r="0.6" fill="#ffffff" />
                                                    {/* Blooming Flower Blossom */}
                                                    <g transform="translate(16, 14)">
                                                        {/* Flower Glow Halo */}
                                                        <circle cx="6" cy="6" r="8" fill="#fef08a" opacity="0.35" className="animate-pulse" />
                                                        {/* 5 Ivory Petals */}
                                                        <circle cx="6" cy="2.5" r="2.4" fill="#ffffff" stroke="#fef08a" strokeWidth="0.5" />
                                                        <circle cx="9.5" cy="5" r="2.4" fill="#ffffff" stroke="#fef08a" strokeWidth="0.5" />
                                                        <circle cx="8" cy="9.5" r="2.4" fill="#ffffff" stroke="#fef08a" strokeWidth="0.5" />
                                                        <circle cx="4" cy="9.5" r="2.4" fill="#ffffff" stroke="#fef08a" strokeWidth="0.5" />
                                                        <circle cx="2.5" cy="5" r="2.4" fill="#ffffff" stroke="#fef08a" strokeWidth="0.5" />
                                                        {/* Golden Center Core */}
                                                        <circle cx="6" cy="6" r="2.6" fill="#eab308" />
                                                        <circle cx="6" cy="6" r="1.3" fill="#ca8a04" />
                                                    </g>
                                                    <defs>
                                                        <linearGradient id="natureArrowGradHover" x1="3" y1="2" x2="18.5" y2="25" gradientUnits="userSpaceOnUse">
                                                            <stop stopColor="#4ade80" />
                                                            <stop offset="0.5" stopColor={activeColor} />
                                                            <stop offset="1" stopColor="#15803d" />
                                                        </linearGradient>
                                                    </defs>
                                                </svg>
                                            </div>
                                        ) : (
                                            /* State: Default - Sleek, Sharp Living Plant Arrow */
                                            <div className="relative">
                                                <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
                                                    {/* Outer Clean Contrast Border */}
                                                    <path
                                                        d="M2.5 1.5C4.5 11 6.5 19 11.5 24C13.2 21 15.2 18.5 17.5 16.8C13 15.2 8.5 11.5 2.5 1.5Z"
                                                        fill="#ffffff"
                                                        stroke="#ffffff"
                                                        strokeWidth="3.2"
                                                        strokeLinejoin="round"
                                                    />
                                                    {/* Living Curved Leaf Body */}
                                                    <path
                                                        d="M2.5 1.5C4.5 11 6.5 19 11.5 24C13.2 21 15.2 18.5 17.5 16.8C13 15.2 8.5 11.5 2.5 1.5Z"
                                                        fill="url(#natureArrowGradDefault)"
                                                    />
                                                    {/* Elegant Leaf Midrib Vein */}
                                                    <path
                                                        d="M2.5 1.5C7 9.5 12 15 17.5 16.8"
                                                        stroke="#ffffff"
                                                        strokeWidth="1.2"
                                                        strokeLinecap="round"
                                                        opacity="0.8"
                                                    />
                                                    {/* Side Micro-Veins */}
                                                    <path d="M7 8C8.5 8.5 9.5 9.5 9.5 10.5" stroke="#ffffff" strokeWidth="0.7" strokeLinecap="round" opacity="0.6" />
                                                    <path d="M10 13C12 13.5 13 14.5 13 15.5" stroke="#ffffff" strokeWidth="0.7" strokeLinecap="round" opacity="0.6" />
                                                    {/* Curled Stem with Mini Leaflet */}
                                                    <path
                                                        d="M17.5 16.8C19.5 15.2 22.5 16.5 23.5 19C21.5 20.2 19 19.5 17.5 16.8Z"
                                                        fill="#86efac"
                                                        stroke="#ffffff"
                                                        strokeWidth="0.8"
                                                    />
                                                    {/* Glistening Morning Dewdrop on the blade */}
                                                    <circle cx="5.5" cy="7.5" r="1.6" fill="#67e8f9" opacity="0.9" />
                                                    <circle cx="5.2" cy="7" r="0.6" fill="#ffffff" />
                                                    <defs>
                                                        <linearGradient id="natureArrowGradDefault" x1="2.5" y1="1.5" x2="17.5" y2="24" gradientUnits="userSpaceOnUse">
                                                            <stop stopColor="#34d399" />
                                                            <stop offset="0.45" stopColor={activeColor} />
                                                            <stop offset="1" stopColor="#064e3b" />
                                                        </linearGradient>
                                                    </defs>
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        </>
                    )}

                    {/* STYLE 1: SPROUT (Magnetic Sprout & Dew) */}
                    {activeStyle === 'sprout' && (
                        <>
                            <motion.div
                                style={{
                                    x: ringX,
                                    y: ringY,
                                    translateX: '-50%',
                                    translateY: '-50%',
                                    borderColor: activeColor
                                }}
                                animate={{
                                    scale: isMouseDown ? 0.7 : isHovering ? 1.6 : 1,
                                    opacity: isVisible ? (isHovering ? 0.95 : 0.6) : 0,
                                    backgroundColor: isHovering ? `${activeColor}15` : 'transparent'
                                }}
                                transition={{ duration: 0.16, ease: 'easeOut' }}
                                className="w-10 h-10 rounded-full border-2 border-dashed fixed flex items-center justify-center backdrop-blur-[1px]"
                            >
                                {isHovering && (
                                    <motion.div
                                        initial={{ scale: 0, rotate: -30 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        exit={{ scale: 0 }}
                                        className="text-nature-800"
                                    >
                                        <Leaf size={14} style={{ color: activeColor }} />
                                    </motion.div>
                                )}
                            </motion.div>

                            <motion.div
                                style={{
                                    x: dotX,
                                    y: dotY,
                                    translateX: '-50%',
                                    translateY: '-50%',
                                    backgroundColor: activeColor
                                }}
                                animate={{
                                    scale: isMouseDown ? 0.5 : isHovering ? 0 : 1,
                                    opacity: isVisible ? 1 : 0
                                }}
                                transition={{ duration: 0.12 }}
                                className="w-2.5 h-2.5 rounded-full fixed shadow-sm shadow-black/20"
                            />
                        </>
                    )}

                    {/* STYLE 2: LEAF-TRAIL (Botanical Leaf with Dew & Pollen Trail) */}
                    {activeStyle === 'leaf-trail' && (
                        <>
                            <AnimatePresence>
                                {trailParticles.map(p => (
                                    <motion.div
                                        key={p.id}
                                        initial={{ opacity: 0.8, scale: 1, x: p.x, y: p.y }}
                                        animate={{
                                            opacity: 0,
                                            scale: 0.2,
                                            y: p.y + 14,
                                            rotate: p.rotation + 40
                                        }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.45, ease: 'easeOut' }}
                                        className="fixed -translate-x-1/2 -translate-y-1/2"
                                    >
                                        {p.type === 'leaf' ? (
                                            <Leaf size={p.size} style={{ color: activeColor }} className="opacity-70" />
                                        ) : p.type === 'pollen' ? (
                                            <div
                                                className="rounded-full shadow-xs"
                                                style={{ width: p.size, height: p.size, backgroundColor: '#fbbf24' }}
                                            />
                                        ) : (
                                            <div
                                                className="rounded-full border border-emerald-300 bg-white/70 backdrop-blur-xs shadow-xs"
                                                style={{ width: p.size, height: p.size }}
                                            />
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            <motion.div
                                style={{
                                    x: dotX,
                                    y: dotY,
                                    translateX: '-20%',
                                    translateY: '-20%'
                                }}
                                animate={{
                                    scale: isMouseDown ? 0.8 : isHovering ? 1.35 : 1,
                                    rotate: isHovering ? -15 : -35,
                                    opacity: isVisible ? 1 : 0
                                }}
                                transition={{ duration: 0.16, ease: 'easeOut' }}
                                className="fixed filter drop-shadow-md"
                            >
                                <svg width="28" height="28" viewBox="0 0 24 24" fill={activeColor} stroke="#ffffff" strokeWidth="1.2">
                                    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                                    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" stroke="#ffffff" strokeWidth="1.2" fill="none" />
                                </svg>
                            </motion.div>
                        </>
                    )}

                    {/* STYLE 3: SMART-PILL (Smart Context Cursor) */}
                    {activeStyle === 'smart-pill' && (
                        <>
                            <motion.div
                                style={{
                                    x: dotX,
                                    y: dotY,
                                    translateX: '-50%',
                                    translateY: '-50%',
                                    backgroundColor: activeColor
                                }}
                                animate={{
                                    scale: isMouseDown ? 0.6 : isHovering ? 1.2 : 1,
                                    opacity: isVisible ? 1 : 0
                                }}
                                transition={{ duration: 0.12 }}
                                className="w-2.5 h-2.5 rounded-full fixed shadow-sm"
                            />

                            {!isHovering && (
                                <motion.div
                                    style={{
                                        x: ringX,
                                        y: ringY,
                                        translateX: '-50%',
                                        translateY: '-50%',
                                        borderColor: `${activeColor}60`
                                    }}
                                    animate={{
                                        scale: isMouseDown ? 0.75 : 1,
                                        opacity: isVisible ? 0.5 : 0
                                    }}
                                    className="w-8 h-8 rounded-full border border-dashed fixed"
                                />
                            )}

                            <AnimatePresence>
                                {isHovering && (
                                    <motion.div
                                        style={{
                                            x: badgeX,
                                            y: badgeY,
                                            translateX: '16px',
                                            translateY: '-12px'
                                        }}
                                        initial={{ opacity: 0, scale: 0.7, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.7, y: 5 }}
                                        transition={{ duration: 0.16, ease: 'easeOut' }}
                                        className="fixed inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-900/90 text-white text-[11px] font-bold shadow-xl border border-white/20 backdrop-blur-md pointer-events-none"
                                    >
                                        {getPillContent().icon}
                                        <span>{getPillContent().text}</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </>
                    )}

                    {/* STYLE 4: APPLE-HARVEST (Mela Bio del Raccolto) */}
                    {activeStyle === 'apple-harvest' && (
                        <motion.div
                            style={{
                                x: dotX,
                                y: dotY,
                                translateX: '-30%',
                                translateY: '-20%'
                            }}
                            animate={{
                                scale: isMouseDown ? 0.8 : isHovering ? 1.3 : 1,
                                rotate: isHovering ? 18 : 0,
                                opacity: isVisible ? 1 : 0
                            }}
                            transition={{ type: 'spring', damping: 20, stiffness: 280 }}
                            className="fixed flex items-center justify-center filter drop-shadow-md"
                        >
                            <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
                                {/* Twig / Picciolo */}
                                <path d="M18 10C18 6 21 3 24 2" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" />
                                {/* Green Leaf on top */}
                                <path d="M18 8C19 4 23 4 25 5C25 7 22 9 18 8Z" fill={activeColor} stroke="#ffffff" strokeWidth="0.8" />
                                {/* Red Apple Body */}
                                <path
                                    d="M18 11C15 9 8 9 8 18C8 26 14 30 18 30C22 30 28 26 28 18C28 9 21 9 18 11Z"
                                    fill="url(#appleGrad)"
                                    stroke="#ffffff"
                                    strokeWidth="1.2"
                                />
                                <defs>
                                    <linearGradient id="appleGrad" x1="8" y1="9" x2="28" y2="30" gradientUnits="userSpaceOnUse">
                                        <stop stopColor="#ef4444" />
                                        <stop offset="0.6" stopColor="#dc2626" />
                                        <stop offset="1" stopColor="#991b1b" />
                                    </linearGradient>
                                </defs>
                            </svg>

                            {/* Floating mini basket on hover */}
                            {isHovering && (
                                <motion.div
                                    initial={{ scale: 0, y: 6 }}
                                    animate={{ scale: 1, y: -16 }}
                                    className="absolute -right-3 -top-2 text-sm select-none"
                                >
                                    🧺
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {/* STYLE 5: WATER-DROPLET (Goccia Salva-Freschezza Jelly) */}
                    {activeStyle === 'water-droplet' && (
                        <>
                            {/* Water Aura Ripple */}
                            <motion.div
                                style={{
                                    x: ringX,
                                    y: ringY,
                                    translateX: '-50%',
                                    translateY: '-50%'
                                }}
                                animate={{
                                    scale: isHovering ? 1.7 : 1,
                                    opacity: isVisible ? (isHovering ? 0.4 : 0.2) : 0
                                }}
                                transition={{ duration: 0.25 }}
                                className="w-12 h-12 rounded-full border border-cyan-400 bg-cyan-400/20 fixed blur-[1px]"
                            />

                            {/* Jelly Morphing Water Droplet */}
                            <motion.div
                                style={{
                                    x: dotX,
                                    y: dotY,
                                    translateX: '-50%',
                                    translateY: '-40%'
                                }}
                                animate={{
                                    scaleX: 1 - mouseVelocity * 0.12,
                                    scaleY: 1 + mouseVelocity * 0.2,
                                    scale: isMouseDown ? 0.7 : isHovering ? 1.35 : 1,
                                    opacity: isVisible ? 1 : 0
                                }}
                                transition={{ type: 'spring', damping: 14, stiffness: 220 }}
                                className="fixed filter drop-shadow-md"
                            >
                                <svg width="26" height="32" viewBox="0 0 24 30" fill="none">
                                    <path
                                        d="M12 2C12 2 3 13 3 19C3 24 7 28 12 28C17 28 21 24 21 19C21 13 12 2 12 2Z"
                                        fill="url(#waterGrad)"
                                        stroke="#ffffff"
                                        strokeWidth="1.2"
                                    />
                                    {/* Glass reflection highlight */}
                                    <ellipse cx="8" cy="18" rx="2.5" ry="4" transform="rotate(-25 8 18)" fill="#ffffff" opacity="0.65" />
                                    <defs>
                                        <linearGradient id="waterGrad" x1="12" y1="2" x2="12" y2="28" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#67e8f9" />
                                            <stop offset="0.7" stopColor="#06b6d4" />
                                            <stop offset="1" stopColor="#0891b2" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                            </motion.div>
                        </>
                    )}

                    {/* STYLE 6: ARTISAN-STAMP (Sigillo di Bottega & Marchio di Qualità) */}
                    {activeStyle === 'artisan-stamp' && (
                        <>
                            {/* Rotating Vintage Seal Ring */}
                            <motion.div
                                style={{
                                    x: ringX,
                                    y: ringY,
                                    translateX: '-50%',
                                    translateY: '-50%',
                                    borderColor: activeColor
                                }}
                                animate={{
                                    rotate: isHovering ? 180 : 360,
                                    scale: isMouseDown ? 0.8 : isHovering ? 1.4 : 1,
                                    opacity: isVisible ? 0.85 : 0
                                }}
                                transition={{
                                    rotate: { repeat: Infinity, duration: isHovering ? 3 : 12, ease: 'linear' },
                                    scale: { duration: 0.2 }
                                }}
                                className="w-12 h-12 rounded-full border-2 border-dashed fixed flex items-center justify-center"
                            >
                                <div
                                    className="w-10 h-10 rounded-full border border-dotted opacity-60"
                                    style={{ borderColor: activeColor }}
                                />
                            </motion.div>

                            {/* Center Quality Monogram */}
                            <motion.div
                                style={{
                                    x: dotX,
                                    y: dotY,
                                    translateX: '-50%',
                                    translateY: '-50%',
                                    backgroundColor: activeColor
                                }}
                                animate={{
                                    scale: isMouseDown ? 0.7 : 1,
                                    opacity: isVisible ? 1 : 0
                                }}
                                className="w-4 h-4 rounded-full fixed shadow-sm flex items-center justify-center text-[8px] font-black text-white"
                            >
                                ✦
                            </motion.div>
                        </>
                    )}

                    {/* STYLE 7: BEE-FLUTTER (Ape Impollinatrice dei Campi) */}
                    {activeStyle === 'bee-flutter' && (
                        <motion.div
                            style={{
                                x: beeX,
                                y: beeY,
                                translateX: '-40%',
                                translateY: '-40%'
                            }}
                            animate={{
                                scale: isMouseDown ? 0.8 : isHovering ? 1.4 : 1,
                                rotate: isHovering ? -10 : 8,
                                opacity: isVisible ? 1 : 0
                            }}
                            transition={{ type: 'spring', damping: 16, stiffness: 200 }}
                            className="fixed flex items-center justify-center select-none filter drop-shadow-md"
                        >
                            {/* Flapping Wings & Bee Body SVG */}
                            <svg width="34" height="34" viewBox="0 0 36 36" fill="none">
                                {/* Wing Left */}
                                <motion.ellipse
                                    cx="13"
                                    cy="11"
                                    rx="6"
                                    ry="3.5"
                                    transform="rotate(-35 13 11)"
                                    fill="#e0f2fe"
                                    stroke="#38bdf8"
                                    strokeWidth="1"
                                    opacity="0.8"
                                    animate={{ scaleY: [1, 0.4, 1] }}
                                    transition={{ repeat: Infinity, duration: 0.14 }}
                                />
                                {/* Wing Right */}
                                <motion.ellipse
                                    cx="23"
                                    cy="11"
                                    rx="6"
                                    ry="3.5"
                                    transform="rotate(35 23 11)"
                                    fill="#e0f2fe"
                                    stroke="#38bdf8"
                                    strokeWidth="1"
                                    opacity="0.8"
                                    animate={{ scaleY: [1, 0.4, 1] }}
                                    transition={{ repeat: Infinity, duration: 0.14 }}
                                />
                                {/* Striped Bee Body */}
                                <ellipse cx="18" cy="20" rx="7" ry="9" fill="#facc15" stroke="#78350f" strokeWidth="1.2" />
                                {/* Dark Stripes */}
                                <line x1="12" y1="18" x2="24" y2="18" stroke="#1c1917" strokeWidth="2" strokeLinecap="round" />
                                <line x1="13" y1="22" x2="23" y2="22" stroke="#1c1917" strokeWidth="2" strokeLinecap="round" />
                                {/* Stinger */}
                                <polygon points="18,29 16.5,32 19.5,32" fill="#1c1917" />
                                {/* Eyes */}
                                <circle cx="15.5" cy="14" r="1.5" fill="#1c1917" />
                                <circle cx="20.5" cy="14" r="1.5" fill="#1c1917" />
                            </svg>

                            {/* Sprout Flower on hover */}
                            {isHovering && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute -right-3 -bottom-1 text-sm select-none"
                                >
                                    🌸
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {/* STYLE 8: MINIMAL-LENS (Lente di Ingrandimento Botanica) */}
                    {activeStyle === 'minimal-lens' && (
                        <>
                            <motion.div
                                style={{
                                    x: ringX,
                                    y: ringY,
                                    translateX: '-50%',
                                    translateY: '-50%',
                                    borderColor: activeColor
                                }}
                                animate={{
                                    scale: isMouseDown ? 0.75 : isHovering ? 1.7 : 1,
                                    opacity: isVisible ? (isHovering ? 0.95 : 0.7) : 0,
                                    backgroundColor: isHovering ? `${activeColor}12` : 'rgba(255,255,255,0.06)'
                                }}
                                transition={{ duration: 0.18 }}
                                className="w-11 h-11 rounded-full border-2 fixed flex items-center justify-center backdrop-blur-[1px] shadow-sm"
                            >
                                {/* Lens Crosshairs */}
                                <div className="absolute inset-x-0 h-[1px] bg-emerald-500/30" />
                                <div className="absolute inset-y-0 w-[1px] bg-emerald-500/30" />
                            </motion.div>

                            <motion.div
                                style={{
                                    x: dotX,
                                    y: dotY,
                                    translateX: '-50%',
                                    translateY: '-50%',
                                    backgroundColor: activeColor
                                }}
                                animate={{
                                    scale: isMouseDown ? 0.6 : 1,
                                    opacity: isVisible ? 1 : 0
                                }}
                                className="w-2 h-2 rounded-full fixed shadow-xs"
                            />
                        </>
                    )}
                </>
            )}
        </div>
    );
};
