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

export type ClickEffectType = 'botanical' | 'fruits' | 'ripple' | 'sparkles' | 'hearts' | 'fireworks' | 'none';

interface ThemedCursorProps {
    previewStyle?: 'sprout' | 'leaf-trail' | 'smart-pill' | 'system';
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
    const [trailParticles, setTrailParticles] = useState<TrailParticle[]>([]);
    const [clickBursts, setClickBursts] = useState<ClickBurst[]>([]);

    const lastPosRef = useRef({ x: 0, y: 0 });
    const particleIdRef = useRef(0);
    const burstIdRef = useRef(0);

    // Active configurations
    const activeStyle = previewStyle || settings?.customCursorStyle || 'sprout';
    const activeColor = previewColor || settings?.customCursorColor || '#16a34a';
    const activeClickEffect = (previewClickEffect || settings?.customCursorClickEffect || 'botanical') as ClickEffectType;
    const isEnabled = isInteractivePreview ? true : (settings?.customCursorEnabled !== false);
    const isAdminActive = isInteractivePreview ? true : (settings?.customCursorActiveInAdmin || false);
    const isInsideAdmin = location.pathname.startsWith('/admin');

    // Motion values for smooth hardware-accelerated tracking
    const mouseX = useMotionValue(-100);
    const mouseY = useMotionValue(-100);

    // Springs for smooth organic following
    const dotX = useSpring(mouseX, { damping: 45, stiffness: 600, mass: 0.1 });
    const dotY = useSpring(mouseY, { damping: 45, stiffness: 600, mass: 0.1 });

    const ringX = useSpring(mouseX, { damping: 26, stiffness: 220, mass: 0.4 });
    const ringY = useSpring(mouseY, { damping: 26, stiffness: 220, mass: 0.4 });

    const badgeX = useSpring(mouseX, { damping: 22, stiffness: 180, mass: 0.5 });
    const badgeY = useSpring(mouseY, { damping: 22, stiffness: 180, mass: 0.5 });

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
            // 7 radial particles: leaves and dew drops
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
            // 5 farm emojis bursting upwards like a fountain
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
            // 8 glittering starlight sparkles in all directions
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
            // 4 organic hearts floating upwards with wobble
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
            // 12 festive harvest confetti
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

        // Auto remove burst after animation finishes
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

            // Trail for leaf-trail style
            if (activeStyle === 'leaf-trail') {
                const dist = Math.hypot(e.clientX - lastPosRef.current.x, e.clientY - lastPosRef.current.y);
                if (dist > 18) {
                    lastPosRef.current = { x: e.clientX, y: e.clientY };
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
                        {/* Ripples for 'botanical' and 'ripple' */}
                        {(burst.effect === 'botanical' || burst.effect === 'ripple') && (
                            <>
                                {/* Primary Ripple Ring */}
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
                                {/* Secondary Soft Ambient Halo */}
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

                        {/* Particle Sprites */}
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
                    {/* STYLE 1: SPROUT (Magnetic Sprout & Dew) */}
                    {activeStyle === 'sprout' && (
                        <>
                            {/* Outer Magnetic Ring */}
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

                            {/* Center Dot */}
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
                            {/* Trailing Particles Pool */}
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
                                                style={{
                                                    width: p.size,
                                                    height: p.size,
                                                    backgroundColor: '#fbbf24'
                                                }}
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

                            {/* Main Botanical Leaf Pointer */}
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
                            {/* Center Dot */}
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

                            {/* Trailing Ring (when not hovering) */}
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

                            {/* Dynamic Context Pill Badge */}
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
                </>
            )}
        </div>
    );
};
