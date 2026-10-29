import React, { useEffect, useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { Leaf, ArrowUpRight, ShoppingBag, ZoomIn, MessageCircle } from 'lucide-react';
import { useAppState } from '../../store/useAppState';

interface Particle {
    id: number;
    x: number;
    y: number;
    size: number;
    rotation: number;
    color: string;
    type: 'dew' | 'pollen' | 'leaf';
}

interface ThemedCursorProps {
    previewStyle?: 'sprout' | 'leaf-trail' | 'smart-pill' | 'system';
    previewColor?: string;
    isInteractivePreview?: boolean;
}

export const ThemedCursor: React.FC<ThemedCursorProps> = ({
    previewStyle,
    previewColor,
    isInteractivePreview = false
}) => {
    const { settings } = useAppState();
    const location = useLocation();

    // Check if device is touch-only
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const [hoverType, setHoverType] = useState<string>('default');
    const [isMouseDown, setIsMouseDown] = useState(false);
    const [isTextInput, setIsTextInput] = useState(false);
    const [particles, setParticles] = useState<Particle[]>([]);
    const lastPosRef = useRef({ x: 0, y: 0 });
    const particleIdRef = useRef(0);

    // Active configuration
    const activeStyle = previewStyle || settings?.customCursorStyle || 'sprout';
    const activeColor = previewColor || settings?.customCursorColor || '#16a34a';
    const isEnabled = isInteractivePreview ? true : (settings?.customCursorEnabled !== false);
    const isAdminActive = isInteractivePreview ? true : (settings?.customCursorActiveInAdmin || false);
    const isInsideAdmin = location.pathname.startsWith('/admin');

    // Motion values for smooth hardware-accelerated tracking
    const mouseX = useMotionValue(-100);
    const mouseY = useMotionValue(-100);

    // Spring configs for responsive inner dot vs lazy trailing ring
    const dotX = useSpring(mouseX, { damping: 45, stiffness: 600, mass: 0.1 });
    const dotY = useSpring(mouseY, { damping: 45, stiffness: 600, mass: 0.1 });

    const ringX = useSpring(mouseX, { damping: 26, stiffness: 220, mass: 0.4 });
    const ringY = useSpring(mouseY, { damping: 26, stiffness: 220, mass: 0.4 });

    const badgeX = useSpring(mouseX, { damping: 22, stiffness: 180, mass: 0.5 });
    const badgeY = useSpring(mouseY, { damping: 22, stiffness: 180, mass: 0.5 });

    // Detect touch screen
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

    // Mouse movement and hover detection
    useEffect(() => {
        if (isTouchDevice || !isEnabled || activeStyle === 'system') return;
        if (isInsideAdmin && !isAdminActive && !isInteractivePreview) return;

        const handleMouseMove = (e: MouseEvent) => {
            mouseX.set(e.clientX);
            mouseY.set(e.clientY);

            if (!isVisible) setIsVisible(true);

            // Particle generation for 'leaf-trail'
            if (activeStyle === 'leaf-trail') {
                const dist = Math.hypot(e.clientX - lastPosRef.current.x, e.clientY - lastPosRef.current.y);
                if (dist > 18) {
                    lastPosRef.current = { x: e.clientX, y: e.clientY };
                    const types: ('dew' | 'pollen' | 'leaf')[] = ['dew', 'pollen', 'leaf'];
                    const chosenType = types[Math.floor(Math.random() * types.length)];
                    const newParticle: Particle = {
                        id: ++particleIdRef.current,
                        x: e.clientX + (Math.random() * 8 - 4),
                        y: e.clientY + (Math.random() * 8 - 4),
                        size: chosenType === 'leaf' ? 12 : chosenType === 'pollen' ? 6 : 8,
                        rotation: Math.random() * 360,
                        color: activeColor,
                        type: chosenType
                    };

                    setParticles(prev => [...prev.slice(-18), newParticle]);
                }
            }

            // Context target inspection
            const target = e.target as HTMLElement | null;
            if (!target) return;

            // Check if hovering an interactive element
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

        const handleMouseDown = () => setIsMouseDown(true);
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
    }, [isTouchDevice, isEnabled, activeStyle, activeColor, isInsideAdmin, isAdminActive, isInteractivePreview, isVisible]);

    // Cleanup faded particles
    useEffect(() => {
        if (particles.length === 0) return;
        const timer = setTimeout(() => {
            setParticles(prev => prev.slice(1));
        }, 120);
        return () => clearTimeout(timer);
    }, [particles]);

    // Don't render on touch or when system cursor is selected
    if (isTouchDevice || !isEnabled || activeStyle === 'system') return null;
    if (isInsideAdmin && !isAdminActive && !isInteractivePreview) return null;

    // Smart pill label resolver
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
            {/* If over text input, hide custom cursor to keep natural text selection */}
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
                                    scale: isMouseDown ? 0.75 : isHovering ? 1.6 : 1,
                                    opacity: isVisible ? (isHovering ? 0.95 : 0.6) : 0,
                                    backgroundColor: isHovering ? `${activeColor}15` : 'transparent'
                                }}
                                transition={{ duration: 0.18, ease: 'easeOut' }}
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

                            {/* Center Precise Dot */}
                            <motion.div
                                style={{
                                    x: dotX,
                                    y: dotY,
                                    translateX: '-50%',
                                    translateY: '-50%',
                                    backgroundColor: activeColor
                                }}
                                animate={{
                                    scale: isMouseDown ? 0.6 : isHovering ? 0 : 1,
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
                            {/* Particles Pool */}
                            <AnimatePresence>
                                {particles.map(p => (
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
                                    scale: isMouseDown ? 0.85 : isHovering ? 1.35 : 1,
                                    rotate: isHovering ? -15 : -35,
                                    opacity: isVisible ? 1 : 0
                                }}
                                transition={{ duration: 0.18, ease: 'easeOut' }}
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
                                        scale: isMouseDown ? 0.8 : 1,
                                        opacity: isVisible ? 0.5 : 0
                                    }}
                                    className="w-8 h-8 rounded-full border border-dashed fixed"
                                />
                            )}

                            {/* Dynamic Context Pill Badge (when hovering) */}
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
                                        transition={{ duration: 0.18, ease: 'easeOut' }}
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
