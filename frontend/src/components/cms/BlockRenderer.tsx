import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Leaf, ArrowRight, ChevronDown, Check, Copy, Star, ShieldCheck, MapPin, Clock, Phone, MessageCircle, Navigation, Mail, Sparkles } from 'lucide-react';
import { useAppState } from '../../store/useAppState';
import { Block } from '../../pages/admin/PageManager';
import { ProductCard } from '../ProductCard';
import { WeightSelectorDrawer } from '../WeightSelectorDrawer';
import { QuantitySelectorDrawer } from '../QuantitySelectorDrawer';
import { useCartStore } from '../../store/useCartStore';
import { sanitizeImageUrl } from '../../utils/imageUrl';

interface BlockRendererProps {
    content: string; // The JSON stringified array of blocks
}

// Homogeneous, balanced vertical padding across sections
const getPaddingClass = (paddingY: string | undefined, defaultClass = 'py-14 md:py-20') => {
    if (!paddingY || paddingY === 'normal') return defaultClass;
    if (paddingY === 'compact') return 'py-9 md:py-12';
    if (paddingY === 'large') return 'py-16 md:py-24';
    return defaultClass;
};

// Section style resolver for guaranteed visual "stacco" (contrast & separation)
const getSectionStyle = (block: Block, index: number) => {
    const userBg = block.data?.bgColor;

    // 1. Explicit user background choice from CMS
    if (userBg && userBg !== 'default') {
        if (userBg === 'white') {
            return {
                bgClass: 'bg-white',
                isDark: false,
                isTinted: false,
                borderClass: 'border-b border-stone-200/60'
            };
        }
        if (userBg === 'gray') {
            return {
                bgClass: 'bg-[#f8f9f6] border-y border-stone-200/70',
                isDark: false,
                isTinted: true,
                borderClass: ''
            };
        }
        if (userBg === 'theme') {
            return {
                bgClass: 'bg-gradient-to-br from-nature-950 via-nature-900 to-emerald-950 text-white shadow-inner',
                isDark: true,
                isTinted: false,
                borderClass: ''
            };
        }
        if (userBg === 'dark') {
            return {
                bgClass: 'bg-[#0d1410] text-white shadow-inner',
                isDark: true,
                isTinted: false,
                borderClass: ''
            };
        }
    }

    // 2. Specialty branded blocks with their own rich backgrounds
    if (block.type === 'hero') {
        return {
            bgClass: 'bg-nature-950 text-white',
            isDark: true,
            isTinted: false,
            borderClass: ''
        };
    }
    if (block.type === 'bannerPromo') {
        return {
            bgClass: 'bg-gradient-to-r from-emerald-950 via-nature-900 to-emerald-900 text-white shadow-md',
            isDark: true,
            isTinted: false,
            borderClass: ''
        };
    }
    if (block.type === 'cta') {
        return {
            bgClass: 'bg-gradient-to-r from-amber-500 via-fruit-500 to-amber-600 text-white shadow-md',
            isDark: true,
            isTinted: false,
            borderClass: ''
        };
    }
    if (block.type === 'newsletter') {
        return {
            bgClass: 'bg-gradient-to-br from-nature-950 via-nature-900 to-stone-900 text-white shadow-inner',
            isDark: true,
            isTinted: false,
            borderClass: ''
        };
    }

    // 3. Auto-Alternating section contrast (Guaranteed "stacco")
    // When consecutive content blocks occur, they alternate between pure crisp white and soft warm stone/sage
    const isTinted = index % 2 !== 0;
    if (isTinted) {
        return {
            bgClass: 'bg-[#f7f8f5] border-y border-stone-200/70 shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]',
            isDark: false,
            isTinted: true,
            borderClass: ''
        };
    } else {
        return {
            bgClass: 'bg-white',
            isDark: false,
            isTinted: false,
            borderClass: 'border-b border-stone-150/50'
        };
    }
};

const getThemeTextColor = (isDark: boolean, type: 'title' | 'subtitle' | 'text' | 'link' | 'cardBg' | 'border') => {
    if (isDark) {
        if (type === 'title') return 'text-white drop-shadow-sm';
        if (type === 'subtitle') return 'text-white/80';
        if (type === 'text') return 'text-white/70';
        if (type === 'link') return 'text-fruit-300 hover:text-white';
        if (type === 'border') return 'border-white/10';
        if (type === 'cardBg') return 'bg-white/10 border-white/15 text-white shadow-none';
    }
    // Light mode
    if (type === 'title') return 'text-nature-900';
    if (type === 'subtitle') return 'text-gray-500';
    if (type === 'text') return 'text-gray-600';
    if (type === 'link') return 'text-fruit-600 hover:text-fruit-700';
    if (type === 'border') return 'border-gray-150';
    if (type === 'cardBg') return 'bg-white border-stone-200/80 text-gray-900 shadow-xs hover:shadow-lg';
    return '';
};

const SectionHeader = ({
    kicker,
    title,
    subtitle,
    isDark = false,
    className = "mb-10 md:mb-14"
}: {
    kicker?: string;
    title?: string;
    subtitle?: string;
    isDark?: boolean;
    className?: string;
}) => {
    if (!title && !subtitle && !kicker) return null;
    return (
        <div className={`text-center max-w-3xl mx-auto px-4 ${className}`}>
            {kicker && (
                <div className="mb-2.5">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                        isDark 
                            ? 'bg-white/15 text-emerald-300 border border-white/20' 
                            : 'bg-emerald-100/80 text-emerald-800 border border-emerald-200/60'
                    }`}>
                        <Sparkles size={11} className={isDark ? 'text-amber-300' : 'text-emerald-600'} />
                        <span>{kicker}</span>
                    </span>
                </div>
            )}
            {title && (
                <h2 className={`font-script text-3xl sm:text-4xl md:text-5xl leading-tight mb-3 drop-shadow-xs ${isDark ? 'text-white' : 'text-nature-900'}`}>
                    {title}
                </h2>
            )}
            <div className="w-24 h-1 bg-gradient-to-r from-fruit-400 via-amber-400 to-emerald-400 mx-auto rounded-full mb-3.5 shadow-2xs"></div>
            {subtitle && (
                <p className={`text-sm sm:text-base leading-relaxed ${isDark ? 'text-white/80' : 'text-gray-600'}`}>
                    {subtitle}
                </p>
            )}
        </div>
    );
};

const AnimatedSection = ({ children, className }: { children: React.ReactNode, className?: string }) => {
    return (
        <motion.section
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className={className}
        >
            {children}
        </motion.section>
    );
};

const DynamicIcon = ({ name, className }: { name: string, className?: string }) => {
    const IconComponent = (Icons as any)[name] || Icons.Star;
    return <IconComponent className={className || "w-7 h-7 text-emerald-700"} />;
};

const CouponCodeBox = ({ code }: { code: string }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 text-white font-mono font-bold text-sm transition-all cursor-pointer group shadow-2xs"
            title="Clicca per copiare il coupon"
        >
            <span className="text-white/80 font-sans text-xs uppercase tracking-wider">Codice:</span>
            <span className="text-amber-300 font-extrabold tracking-widest">{code}</span>
            {copied ? (
                <span className="text-[11px] bg-emerald-500 text-white px-2 py-0.5 rounded-md font-sans font-bold flex items-center gap-1 shadow-xs">
                    <Check size={12} /> Copiato!
                </span>
            ) : (
                <Copy size={14} className="opacity-70 group-hover:opacity-100 transition-opacity" />
            )}
        </button>
    );
};

const FeatureCard = ({
    iconName,
    iconType,
    iconUrl,
    title,
    description,
    index = 0,
    isDark
}: {
    iconName?: string;
    iconType?: string;
    iconUrl?: string;
    title: string;
    description: string;
    index?: number;
    isDark: boolean;
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.08 }}
            whileHover={{ y: -6 }}
            className={`p-7 sm:p-8 rounded-3xl border text-center flex flex-col items-center transition-all duration-300 group h-full ${
                isDark 
                    ? 'bg-white/10 border-white/15 text-white shadow-none hover:bg-white/15' 
                    : 'bg-white border-stone-200/80 text-gray-900 shadow-xs hover:shadow-xl hover:border-emerald-300'
                }`}
        >
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110 duration-300 shadow-xs ${
                isDark ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            }`}>
                {iconType === 'image' && iconUrl ? (
                    <img src={sanitizeImageUrl(iconUrl)} alt={title} className="w-9 h-9 object-contain" />
                ) : (
                    <DynamicIcon name={iconName || 'Star'} className={`w-8 h-8 ${isDark ? 'text-white' : 'text-emerald-700'}`} />
                )}
            </div>
            <h3 className={`text-lg sm:text-xl font-bold mb-2.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
            <p className={`text-sm ${isDark ? 'text-white/80' : 'text-gray-600'} leading-relaxed`}>{description}</p>
        </motion.div>
    );
};

const FAQItem = ({
    question,
    answer,
    index = 0,
    isDark
}: {
    question: string;
    answer: string;
    index?: number;
    isDark: boolean;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05, duration: 0.35 }}
            className="mb-3"
        >
            <div className={`border rounded-2xl overflow-hidden transition-all duration-200 ${isDark
                    ? (isOpen ? 'bg-white/20 border-white/30 ring-2 ring-white/10' : 'bg-white/10 border-white/10 hover:bg-white/15')
                    : (isOpen ? 'bg-white border-nature-400 ring-2 ring-nature-100 shadow-sm' : 'bg-white border-stone-200/80 hover:border-nature-300 shadow-2xs')
                }`}>
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full text-left px-5 py-4 sm:px-6 sm:py-4.5 flex justify-between items-center transition-colors cursor-pointer select-none group ${
                        isDark ? 'bg-transparent text-white' : 'bg-white hover:bg-stone-50/60'
                    }`}
                >
                    <span className={`font-bold text-base sm:text-lg pr-4 transition-colors ${isOpen
                            ? (isDark ? 'text-white' : 'text-nature-700')
                            : (isDark ? 'text-white/90 group-hover:text-white' : 'text-gray-800 group-hover:text-nature-700')
                        }`}>
                        {question}
                    </span>
                    <span className={`p-2 rounded-xl shrink-0 transition-transform duration-200 ${isOpen
                            ? (isDark ? 'bg-white/20 text-white rotate-180' : 'bg-nature-100 text-nature-700 rotate-180')
                            : (isDark ? 'bg-white/10 text-white/80 group-hover:bg-white/20' : 'bg-gray-100 text-gray-500 group-hover:bg-nature-50 group-hover:text-nature-700')
                        }`}>
                        <ChevronDown size={18} />
                    </span>
                </button>
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                        >
                            <div className={`px-5 pb-5 pt-1 text-sm sm:text-base leading-relaxed border-t ${isDark
                                    ? 'border-white/10 text-white/85'
                                    : 'border-stone-100 text-gray-600'
                                }`}>
                                {answer}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

const LatestProductsBlock = ({ block, style }: { block: any, style: { bgClass: string; isDark: boolean; borderClass: string } }) => {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { items, addItem, updateQuantity } = useCartStore();
    const [selectedProductForWeight, setSelectedProductForWeight] = useState<any | null>(null);
    const [selectedProductForUnit, setSelectedProductForUnit] = useState<any | null>(null);

    const getProductQuantity = (productId: number) => {
        const item = items.find(i => i.id === productId);
        return item ? item.quantity : 0;
    };

    useEffect(() => {
        fetch(`/api/products`)
            .then(res => res.json())
            .then(data => {
                const available = data.filter((p: any) => p.isAvailable);
                setProducts(available.slice(0, block.data.count || 4));
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching latest products:', err);
                setLoading(false);
            });
    }, [block.data.count]);

    const paddingClass = getPaddingClass(block.data.paddingY);

    if (loading) {
        return (
            <div className={`${paddingClass} ${style.bgClass} flex justify-center items-center`}>
                <div className={`animate-spin w-8 h-8 border-3 rounded-full ${style.isDark ? 'border-white/20 border-t-white' : 'border-nature-200 border-t-nature-600'}`}></div>
            </div>
        );
    }

    if (products.length === 0) return null;

    return (
        <AnimatedSection className={`${paddingClass} ${style.bgClass} ${style.borderClass} overflow-hidden`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionHeader
                    kicker="Catalogo Fresco"
                    title={block.data.title || 'Ultimi Arrivi in Bottega'}
                    subtitle="Prodotti freschi colti di recente e pronti per essere ordinati online."
                    isDark={style.isDark}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
                    {products.map(product => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            onWeightSelect={setSelectedProductForWeight}
                            onUnitSelect={setSelectedProductForUnit}
                        />
                    ))}
                </div>

                <div className="text-center mt-12">
                    <Link
                        to="/shop"
                        className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-nature-600 hover:bg-nature-700 text-white font-bold text-sm shadow-md transition-all hover:scale-105"
                    >
                        <span>Esplora Tutto il Catalogo</span>
                        <ArrowRight size={17} />
                    </Link>
                </div>
            </div>

            <WeightSelectorDrawer
                isOpen={!!selectedProductForWeight}
                onClose={() => setSelectedProductForWeight(null)}
                productName={selectedProductForWeight?.name || ''}
                currentWeight={selectedProductForWeight ? getProductQuantity(selectedProductForWeight.id) : 0}
                unitPrice={selectedProductForWeight?.priceCents || 0}
                onConfirm={(weight) => {
                    if (selectedProductForWeight) {
                        const product = selectedProductForWeight;
                        if (getProductQuantity(product.id) === 0) {
                            addItem({
                                id: product.id,
                                name: product.name,
                                priceCents: product.priceCents,
                                unitType: product.unitType,
                                isVariableWeight: product.isVariableWeight,
                                stepAmount: product.stepAmount,
                                imageUrl: product.imageUrl
                            }, weight);
                        } else {
                            updateQuantity(product.id, weight);
                        }
                    }
                }}
            />

            <QuantitySelectorDrawer
                isOpen={!!selectedProductForUnit}
                onClose={() => setSelectedProductForUnit(null)}
                productName={selectedProductForUnit?.name || ''}
                currentQty={selectedProductForUnit ? getProductQuantity(selectedProductForUnit.id) : 0}
                unitPrice={selectedProductForUnit?.priceCents || 0}
                unitType={selectedProductForUnit?.unitType as any}
                onConfirm={(qty) => {
                    if (selectedProductForUnit) {
                        const product = selectedProductForUnit;
                        if (getProductQuantity(product.id) === 0) {
                            addItem({
                                id: product.id,
                                name: product.name,
                                priceCents: product.priceCents,
                                unitType: product.unitType,
                                isVariableWeight: product.isVariableWeight,
                                stepAmount: product.stepAmount,
                                imageUrl: product.imageUrl
                            }, qty);
                        } else {
                            updateQuantity(product.id, qty);
                        }
                    }
                }}
            />
        </AnimatedSection>
    );
};

export const BlockRenderer: React.FC<BlockRendererProps> = ({ content }) => {
    const { settings } = useAppState();

    let blocks: Block[] = [];
    try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
            blocks = parsed;
        } else {
            blocks = [{ id: 'legacy', type: 'richText', data: { content } }];
        }
    } catch {
        blocks = [{ id: 'legacy', type: 'richText', data: { content } }];
    }

    if (!blocks || blocks.length === 0) return null;

    return (
        <div className="flex flex-col w-full">
            {blocks.map((block, index) => {
                const style = getSectionStyle(block, index);
                const paddingClass = getPaddingClass(block.data.paddingY);

                // Determine matching wave color for seamless hero bottom transition
                const nextBlock = index + 1 < blocks.length ? blocks[index + 1] : null;
                const nextStyle = nextBlock ? getSectionStyle(nextBlock, index + 1) : null;
                let waveFillClass = 'text-white';
                if (nextStyle) {
                    if (nextStyle.isTinted) {
                        waveFillClass = 'text-[#f7f8f5]';
                    } else if (nextStyle.isDark) {
                        waveFillClass = 'text-nature-950';
                    } else {
                        waveFillClass = 'text-white';
                    }
                }

                switch (block.type) {
                    case 'hero':
                        const heroHeight = block.data.paddingY === 'compact' 
                            ? 'min-h-[46vh] md:min-h-[52vh] pt-14 pb-12' 
                            : (block.data.paddingY === 'large' ? 'min-h-[72vh] md:min-h-[84vh] pt-20 pb-20' : 'min-h-[58vh] md:min-h-[68vh] pt-16 pb-16');
                        return (
                            <AnimatedSection key={block.id} className={`relative z-10 ${heroHeight} flex items-center justify-center overflow-hidden bg-gradient-to-br from-nature-950 via-nature-900 to-emerald-950 group`}>
                                {/* Background Image with Zoom & Dark Gradient Overlay */}
                                <motion.div
                                    initial={{ scale: 1.08 }}
                                    animate={{ scale: 1 }}
                                    transition={{ duration: 1.8, ease: "easeOut" }}
                                    className="absolute inset-0 z-0"
                                >
                                    <img
                                        src={sanitizeImageUrl(block.data.backgroundImage) || "https://images.unsplash.com/photo-1610832958506-aa56368176cf?q=80&w=2670&auto=format&fit=crop"}
                                        alt="Hero Background"
                                        className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-[8s]"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-nature-950 via-nature-900/70 to-black/45"></div>
                                    <div className="absolute inset-0 bg-radial from-transparent via-black/25 to-black/60"></div>
                                </motion.div>

                                <div className="relative z-20 text-center text-white px-4 max-w-4xl mx-auto w-full my-auto flex flex-col items-center">
                                    {/* Upper Badge */}
                                    {(block.data.badgeText || block.data.subtitle || settings?.tagline) && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9, y: -15 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            transition={{ duration: 0.6 }}
                                            className="inline-flex items-center gap-2 px-4 sm:px-5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-white text-xs sm:text-sm font-extrabold mb-4 sm:mb-5 shadow-lg tracking-wider uppercase"
                                        >
                                            <Leaf size={14} className="text-emerald-400 animate-pulse" />
                                            <span>{block.data.badgeText || settings?.tagline || 'Freschezza Quotidiana'}</span>
                                        </motion.div>
                                    )}

                                    {/* Main Title */}
                                    <motion.h1
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.7, delay: 0.1 }}
                                        className="font-script text-4xl sm:text-6xl md:text-7xl lg:text-8xl mb-3 sm:mb-4 text-white leading-[1.1] drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
                                    >
                                        {block.data.title || 'Benvenuto'}
                                    </motion.h1>

                                    {/* Subtitle */}
                                    {block.data.subtitle && (
                                        <motion.p
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.7, delay: 0.2 }}
                                            className="text-sm sm:text-base md:text-lg text-white/90 font-medium max-w-2xl mx-auto leading-relaxed mb-6 sm:mb-8 drop-shadow-sm px-2"
                                        >
                                            {block.data.subtitle}
                                        </motion.p>
                                    )}

                                    {/* Action Buttons */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.7, delay: 0.3 }}
                                        className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto"
                                    >
                                        {block.data.ctaText && block.data.ctaLink && (
                                            <Link
                                                to={block.data.ctaLink}
                                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold py-3.5 px-8 rounded-2xl text-sm sm:text-base shadow-lg shadow-emerald-950/40 hover:shadow-xl hover:scale-102 transition-all group border border-emerald-400/30"
                                            >
                                                <span>{block.data.ctaText}</span>
                                                <ArrowRight size={17} className="group-hover:translate-x-1 transition-transform" />
                                            </Link>
                                        )}

                                        {block.data.secondaryCtaText && block.data.secondaryCtaLink && (
                                            <Link
                                                to={block.data.secondaryCtaLink}
                                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-md text-white border border-white/30 font-bold py-3.5 px-6 rounded-2xl text-sm sm:text-base transition-all hover:scale-102"
                                            >
                                                <span>{block.data.secondaryCtaText}</span>
                                            </Link>
                                        )}
                                    </motion.div>
                                </div>

                                {/* Bottom Wave Divider matching next section background */}
                                <div className={`absolute bottom-0 left-0 w-full overflow-hidden leading-none z-10 translate-y-[1px] ${waveFillClass}`}>
                                    <svg className="relative block w-full h-[35px] sm:h-[55px] md:h-[75px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
                                        <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C89.71,114.62,204.34,74.52,321.39,56.44Z" className="fill-current"></path>
                                    </svg>
                                </div>
                            </AnimatedSection>
                        );

                    case 'bannerPromo':
                        return (
                            <AnimatedSection key={block.id} className={`${paddingClass} ${style.bgClass} relative overflow-hidden`}>
                                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                                    <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 sm:p-8 md:p-10 border-2 border-dashed border-white/25 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                                        <div className="space-y-3 text-center md:text-left flex-1">
                                            {block.data.badge && (
                                                <span className="inline-block px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-stone-950 font-black text-xs uppercase tracking-wider shadow-xs">
                                                    {block.data.badge}
                                                </span>
                                            )}
                                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white leading-tight">
                                                {block.data.title || 'Offerta Speciale'}
                                            </h2>
                                            {block.data.text && (
                                                <p className="text-white/85 text-sm sm:text-base max-w-xl leading-relaxed">
                                                    {block.data.text}
                                                </p>
                                            )}
                                            {block.data.couponCode && (
                                                <div className="pt-1">
                                                    <CouponCodeBox code={block.data.couponCode} />
                                                </div>
                                            )}
                                        </div>
                                        {block.data.ctaText && block.data.ctaLink && (
                                            <Link
                                                to={block.data.ctaLink}
                                                className="px-8 py-3.5 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-stone-950 font-black rounded-2xl shadow-lg transition-all hover:scale-105 whitespace-nowrap text-sm sm:text-base shrink-0"
                                            >
                                                {block.data.ctaText}
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </AnimatedSection>
                        );

                    case 'features':
                        const features = block.data.features && block.data.features.length > 0
                            ? block.data.features
                            : [
                                { icon: 'Leaf', title: 'Solo Stagionale', description: 'Selezioniamo rigorosamente frutta e verdura colte nelle 24h precedenti dai campi locali.' },
                                { icon: 'Truck', title: 'Consegna a Domicilio', description: 'Ricevi la tua spesa fresca direttamente a casa con imballi ecologici salva-freschezza.' },
                                { icon: 'CreditCard', title: 'Pagamento Flessibile', description: 'Paga comodamente online con carta o in contanti/POS direttamente alla consegna.' }
                            ];
                        return (
                            <AnimatedSection key={block.id} className={`${paddingClass} ${style.bgClass} ${style.borderClass} relative overflow-hidden`}>
                                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                                    <SectionHeader
                                        kicker="I Nostri Vantaggi"
                                        title={block.data.title || 'Perché Sceglierci'}
                                        subtitle="La qualità di un banco di fiducia con tutta la comodità dell'online."
                                        isDark={style.isDark}
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-7 lg:gap-8 items-stretch">
                                        {features.map((f: any, i: number) => (
                                            <FeatureCard key={i} index={i} iconName={f.icon} iconType={f.iconType} iconUrl={f.iconUrl} title={f.title} description={f.description} isDark={style.isDark} />
                                        ))}
                                    </div>
                                </div>
                            </AnimatedSection>
                        );

                    case 'imageText':
                        const isRight = block.data.imagePosition === 'right';
                        return (
                            <AnimatedSection key={block.id} className={`${paddingClass} ${style.bgClass} ${style.borderClass} overflow-hidden relative`}>
                                <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col ${isRight ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-10 lg:gap-16 relative z-10`}>
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.96 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.6 }}
                                        className="w-full md:w-1/2 relative group"
                                    >
                                        <div className="relative rounded-3xl overflow-hidden shadow-xl border border-stone-200/80 aspect-4/3 sm:aspect-16/10 md:aspect-4/3 w-full bg-stone-100">
                                            <img
                                                src={sanitizeImageUrl(block.data.imageUrl) || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80"}
                                                alt={block.data.title || "Immagine di sezione"}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-104"
                                            />
                                        </div>
                                    </motion.div>
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.6, delay: 0.15 }}
                                        className="w-full md:w-1/2 space-y-4"
                                    >
                                        <div
                                            className={`quill-content prose prose-nature prose-headings:font-script prose-headings:text-3xl sm:prose-headings:text-4xl md:prose-headings:text-5xl ${style.isDark ? 'quill-invert' : ''}`}
                                            dangerouslySetInnerHTML={{ __html: block.data.title || 'Titolo Sezione' }}
                                        />
                                        <div
                                            className={`quill-content prose prose-nature prose-p:text-gray-600 prose-p:leading-relaxed text-sm sm:text-base ${style.isDark ? 'quill-invert' : ''}`}
                                            dangerouslySetInnerHTML={{ __html: block.data.content || 'Testo descrittivo...' }}
                                        />
                                    </motion.div>
                                </div>
                            </AnimatedSection>
                        );

                    case 'cta':
                        return (
                            <AnimatedSection key={block.id} className={`${paddingClass} ${style.bgClass} relative overflow-hidden`}>
                                <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/20 text-white mb-3 backdrop-blur-xs">
                                        <Sparkles size={13} className="text-yellow-200" />
                                        <span>Ordinazione Veloce</span>
                                    </span>
                                    <h2 className="font-script text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-4 text-white drop-shadow-sm">
                                        {block.data.title || 'Pronto a Ricevere la Spesa Fresca?'}
                                    </h2>
                                    <p className="text-base sm:text-lg mb-8 max-w-2xl mx-auto leading-relaxed text-white/90">
                                        {block.data.text || 'Scegli la comodità del nostro catalogo online: ordina in pochi tocchi e ritira al banco o ricevi a domicilio.'}
                                    </p>

                                    {block.data.ctaText && block.data.ctaLink && (
                                        <Link
                                            to={block.data.ctaLink}
                                            className="inline-flex items-center gap-2.5 font-black py-4 px-9 rounded-2xl text-base shadow-xl hover:shadow-2xl hover:scale-105 transition-all group bg-white text-stone-900 hover:bg-stone-50"
                                        >
                                            <span>{block.data.ctaText}</span>
                                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                        </Link>
                                    )}
                                </div>
                            </AnimatedSection>
                        );

                    case 'testimonials':
                        return (
                            <AnimatedSection key={block.id} className={`${paddingClass} ${style.bgClass} ${style.borderClass} relative`}>
                                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                    <SectionHeader
                                        kicker="Opinioni Verificate"
                                        title={block.data.title || 'Dicono di Noi'}
                                        subtitle="La fiducia dei clienti è la nostra ricompensa più bella di ogni giornata."
                                        isDark={style.isDark}
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                                        {(block.data.testimonials || []).map((t: any, i: number) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, y: 20 }}
                                                whileInView={{ opacity: 1, y: 0 }}
                                                viewport={{ once: true }}
                                                transition={{ delay: i * 0.1, duration: 0.5 }}
                                                whileHover={{ y: -5 }}
                                                className={`p-7 sm:p-8 rounded-3xl border flex flex-col justify-between transition-all duration-300 h-full ${getThemeTextColor(style.isDark, 'cardBg')}`}
                                            >
                                                <div className="space-y-3.5">
                                                    <div className="flex items-center gap-1 text-amber-400">
                                                        {[...Array(5)].map((_, starIndex) => (
                                                            <Star
                                                                key={starIndex}
                                                                size={16}
                                                                className={starIndex < (t.rating || 5) ? 'fill-amber-400 text-amber-400' : (style.isDark ? 'text-white/20' : 'text-stone-200')}
                                                            />
                                                        ))}
                                                    </div>
                                                    <p className={`leading-relaxed italic text-sm sm:text-base ${style.isDark ? 'text-white/90' : 'text-gray-700'}`}>
                                                        "{t.content}"
                                                    </p>
                                                </div>

                                                <div className={`flex items-center gap-3.5 mt-6 pt-4 border-t ${getThemeTextColor(style.isDark, 'border')}`}>
                                                    <div className={`w-11 h-11 rounded-full overflow-hidden shrink-0 border ${style.isDark ? 'border-white/20 bg-white/10' : 'border-stone-200 bg-nature-100'}`}>
                                                        {t.avatarUrl ? (
                                                            <img src={sanitizeImageUrl(t.avatarUrl)} alt={t.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className={`w-full h-full flex items-center justify-center font-bold text-sm ${style.isDark ? 'text-white' : 'text-nature-700'}`}>
                                                                {t.name ? t.name.charAt(0).toUpperCase() : 'C'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className={`font-bold text-sm truncate ${style.isDark ? 'text-white' : 'text-gray-900'}`}>{t.name || 'Cliente'}</h4>
                                                        <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                                                            <Check size={11} /> Acquisto Verificato
                                                        </span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </AnimatedSection>
                        );

                    case 'imageGallery':
                        const isMasonry = block.data.layout === 'masonry';
                        const images = block.data.images || [];
                        return (
                            <AnimatedSection key={block.id} className={`${paddingClass} ${style.bgClass} ${style.borderClass} relative`}>
                                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                    <SectionHeader
                                        kicker="I Nostri Scatti"
                                        title={block.data.title || 'Galleria Fotografica'}
                                        subtitle="Uno sguardo da vicino ai nostri prodotti, ai campi e ai banchi di vendita."
                                        isDark={style.isDark}
                                    />
                                    <div className={isMasonry ? "columns-2 sm:columns-3 lg:columns-4 gap-4 space-y-4" : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5"}>
                                        {images.map((img: any, i: number) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                whileInView={{ opacity: 1, scale: 1 }}
                                                viewport={{ once: true }}
                                                transition={{ delay: i * 0.05, duration: 0.4 }}
                                                className={`break-inside-avoid rounded-3xl overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 group border border-stone-200/80 bg-stone-100 ${!isMasonry ? 'aspect-square' : ''}`}
                                            >
                                                <img
                                                    src={sanitizeImageUrl(img.url)}
                                                    alt={img.alt || 'Foto galleria'}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-106"
                                                    loading="lazy"
                                                />
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </AnimatedSection>
                        );

                    case 'latestProducts':
                        return <LatestProductsBlock key={block.id} block={block} style={style} />;

                    case 'faq':
                        return (
                            <AnimatedSection key={block.id} className={`${paddingClass} ${style.bgClass} ${style.borderClass} relative`}>
                                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                                    <SectionHeader
                                        kicker="Domande & Risposte"
                                        title={block.data.title || 'Domande Frequenti'}
                                        subtitle="Hai dubbi su ordini, pesate al banco o consegne? Ecco le risposte più comuni."
                                        isDark={style.isDark}
                                    />
                                    <div className="space-y-3">
                                        {(block.data.faqs || []).map((faq: any, i: number) => (
                                            <FAQItem key={i} index={i} question={faq.question} answer={faq.answer} isDark={style.isDark} />
                                        ))}
                                    </div>
                                </div>
                            </AnimatedSection>
                        );

                    case 'richText':
                        return (
                            <AnimatedSection key={block.id} className={`${paddingClass} ${style.bgClass} ${style.borderClass} relative`}>
                                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                                    {block.data.title && (
                                        <SectionHeader
                                            title={block.data.title}
                                            isDark={style.isDark}
                                        />
                                    )}
                                    <div
                                        className={`prose prose-nature max-w-none prose-base sm:prose-lg leading-relaxed prose-headings:font-script prose-headings:text-nature-900 prose-p:text-gray-600 prose-a:text-fruit-600 prose-img:rounded-3xl prose-img:shadow-lg hover:prose-a:text-fruit-700 transition-colors quill-content ${style.isDark ? 'quill-invert' : ''}`}
                                        dangerouslySetInnerHTML={{ __html: block.data.content || '' }}
                                    />
                                </div>
                            </AnimatedSection>
                        );

                    case 'newsletter':
                        return (
                            <AnimatedSection key={block.id} className={`${paddingClass} ${style.bgClass} relative overflow-hidden`}>
                                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                                    <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mx-auto mb-4 text-emerald-400 shadow-md">
                                        <Mail size={28} />
                                    </div>
                                    <h2 className="font-script text-3xl sm:text-4xl md:text-5xl mb-3 text-white drop-shadow-sm">
                                        {block.data.title || 'Iscriviti alla Nostra Newsletter'}
                                    </h2>
                                    <p className="text-sm sm:text-base mb-8 max-w-xl mx-auto text-white/80 leading-relaxed">
                                        {block.data.subtitle || 'Ricevi offerte esclusive, anticipazioni sui raccolti freschi e ricette deliziose ogni settimana.'}
                                    </p>

                                    <form className="max-w-md mx-auto" onSubmit={(e) => { e.preventDefault(); alert('Grazie per l\'iscrizione!'); }}>
                                        <div className="flex flex-col sm:flex-row gap-2 bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 shadow-xl">
                                            <input
                                                type="email"
                                                placeholder="Il tuo indirizzo email..."
                                                required
                                                className="flex-1 px-4 py-3 rounded-xl text-sm font-medium focus:outline-hidden bg-white text-gray-900 placeholder:text-gray-400"
                                            />
                                            <button
                                                type="submit"
                                                className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm tracking-wide shadow-md transition-all cursor-pointer whitespace-nowrap"
                                            >
                                                {block.data.buttonText || 'Iscriviti'}
                                            </button>
                                        </div>
                                    </form>
                                    <p className="text-xs mt-4 flex items-center justify-center gap-1.5 text-white/60">
                                        <ShieldCheck size={14} className="text-emerald-400" />
                                        <span>Rispettiamo la tua privacy. Nessun invio molesto o spam.</span>
                                    </p>
                                </div>
                            </AnimatedSection>
                        );

                    case 'stats':
                        return (
                            <AnimatedSection key={block.id} className={`${paddingClass} ${style.bgClass} ${style.borderClass} relative`}>
                                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                    {block.data.title && (
                                        <SectionHeader
                                            kicker="I Nostri Numeri"
                                            title={block.data.title}
                                            subtitle="I numeri che raccontano il nostro impegno quotidiano per la freschezza e la qualità."
                                            isDark={style.isDark}
                                        />
                                    )}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                                        {(block.data.stats || []).map((stat: any, i: number) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, y: 16 }}
                                                whileInView={{ opacity: 1, y: 0 }}
                                                viewport={{ once: true }}
                                                transition={{ delay: i * 0.08, duration: 0.5 }}
                                                className={`p-6 sm:p-7 rounded-3xl border text-center transition-all shadow-xs ${
                                                    style.isDark 
                                                        ? 'bg-white/10 border-white/15 text-white' 
                                                        : 'bg-white border-stone-200/80 text-gray-800 hover:shadow-md'
                                                    }`}
                                            >
                                                <div className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2 tracking-tight text-emerald-600">
                                                    {stat.value}
                                                </div>
                                                <p className={`text-xs sm:text-sm font-bold leading-snug ${style.isDark ? 'text-white/80' : 'text-gray-600'}`}>
                                                    {stat.label}
                                                </p>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </AnimatedSection>
                        );

                    case 'video':
                        const getEmbedUrl = (url: string) => {
                            if (!url) return '';
                            const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
                            if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&rel=0`;
                            return url;
                        };
                        const embedUrl = getEmbedUrl(block.data.videoUrl);

                        return (
                            <AnimatedSection key={block.id} className={`${paddingClass} ${style.bgClass} ${style.borderClass} relative`}>
                                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                                    {block.data.title && (
                                        <SectionHeader
                                            kicker="Video Esperienza"
                                            title={block.data.title}
                                            isDark={style.isDark}
                                        />
                                    )}
                                    <div className={`relative w-full rounded-3xl overflow-hidden shadow-2xl aspect-video bg-gray-950 border ${style.isDark ? 'border-white/20' : 'border-stone-200/80'}`}>
                                        {embedUrl ? (
                                            <iframe
                                                src={embedUrl}
                                                className="absolute inset-0 w-full h-full border-0"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                                title={block.data.title || "Video"}
                                            ></iframe>
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center text-white/50 text-sm font-medium">
                                                Nessun video collegato
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </AnimatedSection>
                        );

                    case 'categories':
                        const rawCategories = Array.isArray(block.data.categories) ? block.data.categories : [];
                        const fallbackImages = [
                            'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=800&q=80',
                            'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&q=80',
                            'https://images.unsplash.com/photo-1582979512210-99b6a53386f9?w=800&q=80',
                            'https://images.unsplash.com/photo-1509358271058-acd22cc93898?w=800&q=80'
                        ];
                        const defaultFallbackCategories = [
                            { title: 'Frutta Fresca', link: '/shop', imageUrl: fallbackImages[0] },
                            { title: 'Verdura di Stagione', link: '/shop', imageUrl: fallbackImages[1] },
                            { title: 'Agrumi & Bio', link: '/shop', imageUrl: fallbackImages[2] },
                            { title: 'Erbe & Aromi', link: '/shop', imageUrl: fallbackImages[3] }
                        ];
                        const categoriesList = rawCategories.length > 0 ? rawCategories : defaultFallbackCategories;

                        const gridColsClass = categoriesList.length === 1 
                            ? 'grid-cols-1 max-w-md mx-auto'
                            : categoriesList.length === 2
                            ? 'grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto'
                            : categoriesList.length === 3
                            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

                        return (
                            <AnimatedSection key={block.id} className={`${paddingClass} ${style.bgClass} ${style.borderClass} relative overflow-hidden`}>
                                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                                    <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 md:mb-10 gap-4">
                                        <div>
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-100/80 text-emerald-800 mb-2">
                                                <Sparkles size={11} className="text-emerald-600" />
                                                <span>I Nostri Reparti</span>
                                            </span>
                                            <h2 className={`font-script text-3xl sm:text-4xl md:text-5xl drop-shadow-xs ${style.isDark ? 'text-white' : 'text-nature-900'}`}>
                                                {block.data.title || 'Esplora le Nostre Categorie'}
                                            </h2>
                                            <div className="w-20 h-1 bg-gradient-to-r from-fruit-400 to-yellow-400 rounded-full mt-2"></div>
                                        </div>
                                        <Link to="/shop" className="group inline-flex items-center gap-2 font-bold text-sm text-fruit-600 hover:text-fruit-700 transition-colors">
                                            <span>Vedi tutto il catalogo</span>
                                            <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                                        </Link>
                                    </div>
                                    
                                    <div className={`grid ${gridColsClass} gap-4 sm:gap-6`}>
                                        {categoriesList.map((cat: any, i: number) => {
                                            const resolvedImg = (cat.imageUrl && cat.imageUrl.trim() !== '')
                                                ? sanitizeImageUrl(cat.imageUrl)
                                                : fallbackImages[i % fallbackImages.length];

                                            return (
                                                <Link 
                                                    to={cat.link || '/shop'} 
                                                    key={i} 
                                                    style={{ minHeight: '320px', height: '320px' }}
                                                    className="group relative w-full h-[320px] min-h-[320px] rounded-3xl overflow-hidden flex flex-col justify-end shadow-md hover:shadow-2xl transition-all duration-500 hover:-translate-y-1.5 border border-stone-200/80 bg-stone-900"
                                                >
                                                    {/* Background Image Container */}
                                                    <div className="absolute inset-0 bg-stone-800 pointer-events-none">
                                                        <img 
                                                            src={resolvedImg} 
                                                            alt={cat.title || 'Reparto'} 
                                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90"
                                                            loading="lazy"
                                                            onError={(e: any) => {
                                                                e.currentTarget.onerror = null;
                                                                e.currentTarget.src = fallbackImages[i % fallbackImages.length];
                                                            }}
                                                        />
                                                    </div>
                                                    
                                                    {/* Dark Vignette / Contrast Gradient */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent pointer-events-none transition-opacity duration-300"></div>
                                                    
                                                    {/* Card Labels & Actions */}
                                                    <div className="relative z-10 p-5 sm:p-6 w-full">
                                                        <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-xs text-white mb-2">
                                                            Reparto #{i + 1}
                                                        </span>
                                                        <h3 className="font-bold text-lg sm:text-xl text-white mb-1 drop-shadow-md">
                                                            {cat.title || 'Reparto Fresco'}
                                                        </h3>
                                                        <div className="flex items-center gap-1.5 text-fruit-300 text-xs font-semibold">
                                                            <span>Scopri prodotti</span>
                                                            <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                                                        </div>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            </AnimatedSection>
                        );

                    case 'storeInfo':
                        return (
                            <AnimatedSection key={block.id} className={`${paddingClass} ${style.bgClass} ${style.borderClass} relative`}>
                                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                                    <SectionHeader
                                        kicker="Contatti & Presidio"
                                        title={block.data.title || 'La Nostra Sede & Mercati'}
                                        subtitle="Siamo sempre a tua disposizione per consigli sui prodotti e preparazioni su misura."
                                        isDark={style.isDark}
                                    />
                                    
                                    {/* Bento Grid 4-Card layout */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        {/* Card 1: Sede */}
                                        <div className={`p-6 sm:p-7 rounded-3xl border transition-all ${
                                            style.isDark ? 'bg-white/10 border-white/15 text-white' : 'bg-white border-stone-200/80 shadow-xs'
                                        }`}>
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                                                    <MapPin size={22} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-xs text-stone-400 uppercase tracking-wider">Sede e Magazzino</h4>
                                                    <p className={`font-bold text-base mt-1 ${style.isDark ? 'text-white' : 'text-gray-900'}`}>
                                                        {block.data.address || 'Via Papa Giovanni XXIII, 12, Sirone (LC)'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card 2: Orari */}
                                        <div className={`p-6 sm:p-7 rounded-3xl border transition-all ${
                                            style.isDark ? 'bg-white/10 border-white/15 text-white' : 'bg-white border-stone-200/80 shadow-xs'
                                        }`}>
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
                                                    <Clock size={22} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-xs text-stone-400 uppercase tracking-wider">Orari di Apertura</h4>
                                                    <p className={`font-bold text-base mt-1 ${style.isDark ? 'text-white' : 'text-gray-900'}`}>
                                                        {block.data.hours || 'Lun - Sab: 07:30 - 19:30'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card 3: Telefono */}
                                        <div className={`p-6 sm:p-7 rounded-3xl border transition-all ${
                                            style.isDark ? 'bg-white/10 border-white/15 text-white' : 'bg-white border-stone-200/80 shadow-xs'
                                        }`}>
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 shadow-2xs">
                                                    <Phone size={22} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-xs text-stone-400 uppercase tracking-wider">Telefono Assistenza</h4>
                                                    <a href={`tel:${(block.data.phone || '+390341850123').replace(/[^0-9+]/g, '')}`} className="font-bold text-base mt-1 text-emerald-700 hover:underline block">
                                                        {block.data.phone || '+39 0341 850123'}
                                                    </a>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card 4: WhatsApp */}
                                        <div className={`p-6 sm:p-7 rounded-3xl border transition-all ${
                                            style.isDark ? 'bg-white/10 border-white/15 text-white' : 'bg-white border-stone-200/80 shadow-xs'
                                        }`}>
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                                                    <MessageCircle size={22} />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-xs text-stone-400 uppercase tracking-wider">WhatsApp Diretto</h4>
                                                    <a
                                                        href={`https://wa.me/${(block.data.whatsapp || '+393401234567').replace(/[^0-9]/g, '')}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1.5 mt-1 text-xs font-black text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-3.5 py-1.5 rounded-xl transition-colors"
                                                    >
                                                        <span>Scrivi su WhatsApp</span>
                                                        <ArrowRight size={13} />
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Google Maps Action Pill */}
                                    {block.data.googleMapsUrl && (
                                        <div className="text-center mt-6">
                                            <a
                                                href={block.data.googleMapsUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-2 text-sm font-bold text-white bg-nature-900 hover:bg-nature-800 px-6 py-3 rounded-2xl transition-all shadow-md hover:scale-102"
                                            >
                                                <Navigation size={16} />
                                                <span>Avvia Navigatore su Google Maps</span>
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </AnimatedSection>
                        );

                    default:
                        return null;
                }
            })}
        </div>
    );
};
