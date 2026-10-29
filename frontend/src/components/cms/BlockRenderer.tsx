import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Leaf, ArrowRight, ChevronDown, Check, Copy, Star, ShieldCheck, MapPin, Clock, Phone, MessageCircle, Navigation, Mail } from 'lucide-react';
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
const getPaddingClass = (paddingY: string | undefined, defaultClass = 'py-12 md:py-16') => {
    if (!paddingY || paddingY === 'normal') return defaultClass;
    if (paddingY === 'compact') return 'py-8 md:py-10';
    if (paddingY === 'large') return 'py-16 md:py-24';
    return defaultClass;
};

const getBgClass = (bgColor: string | undefined, defaultClass = 'bg-white') => {
    if (!bgColor || bgColor === 'default') return defaultClass;
    if (bgColor === 'white') return 'bg-white';
    if (bgColor === 'gray') return 'bg-emerald-50/40';
    if (bgColor === 'theme') return 'bg-nature-900 text-white';
    if (bgColor === 'dark') return 'bg-gray-950 text-white';
    return defaultClass;
};

const getThemeTextColor = (bgColor: string | undefined, type: 'title' | 'subtitle' | 'text' | 'link' | 'cardBg' | 'border') => {
    const isDark = bgColor === 'theme' || bgColor === 'dark';
    if (isDark) {
        if (type === 'title') return 'text-white drop-shadow-sm';
        if (type === 'subtitle') return 'text-white/80';
        if (type === 'text') return 'text-white/70';
        if (type === 'link') return 'text-fruit-300 hover:text-white';
        if (type === 'border') return 'border-white/10';
        if (type === 'cardBg') return 'bg-white/10 border-white/15 text-white shadow-none';
    }
    // Default light cases
    if (type === 'title') return 'text-nature-900';
    if (type === 'subtitle') return 'text-gray-500';
    if (type === 'text') return 'text-gray-600';
    if (type === 'link') return 'text-fruit-600 hover:text-fruit-700';
    if (type === 'border') return 'border-gray-150';
    if (type === 'cardBg') return 'bg-white border-gray-100 text-gray-900 shadow-xs hover:shadow-md';
    return '';
};

const SectionHeader = ({
    title,
    subtitle,
    isDark = false,
    className = "mb-8 md:mb-12"
}: {
    title?: string;
    subtitle?: string;
    isDark?: boolean;
    className?: string;
}) => {
    if (!title && !subtitle) return null;
    return (
        <div className={`text-center max-w-3xl mx-auto px-4 ${className}`}>
            {title && (
                <h2 className={`font-script text-3xl sm:text-4xl md:text-5xl leading-tight mb-3 ${isDark ? 'text-white drop-shadow-sm' : 'text-nature-900'}`}>
                    {title}
                </h2>
            )}
            <div className="w-20 h-1 bg-gradient-to-r from-fruit-400 via-amber-400 to-emerald-400 mx-auto rounded-full mb-3 shadow-2xs"></div>
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
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className={className}
        >
            {children}
        </motion.section>
    );
};

const DynamicIcon = ({ name, className }: { name: string, className?: string }) => {
    const IconComponent = (Icons as any)[name] || Icons.Star;
    return <IconComponent className={className || "w-7 h-7 text-nature-600"} />;
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
            title="Clicca per copiare il codice sconto"
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
    sectionBgColor
}: {
    iconName?: string;
    iconType?: string;
    iconUrl?: string;
    title: string;
    description: string;
    index?: number;
    sectionBgColor?: string;
}) => {
    const isDark = sectionBgColor === 'theme' || sectionBgColor === 'dark';
    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.08 }}
            whileHover={{ y: -5 }}
            className={`p-6 sm:p-7 rounded-3xl border text-center flex flex-col items-center transition-all duration-300 group h-full ${
                isDark 
                    ? 'bg-white/10 border-white/15 text-white shadow-none' 
                    : 'bg-white border-gray-100 text-gray-900 shadow-xs hover:shadow-lg hover:border-nature-200'
            }`}
        >
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-300 shadow-2xs ${
                isDark ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700 border border-emerald-100/60'
            }`}>
                {iconType === 'image' && iconUrl ? (
                    <img src={sanitizeImageUrl(iconUrl)} alt={title} className="w-9 h-9 object-contain" />
                ) : (
                    <DynamicIcon name={iconName || 'Star'} className={`w-8 h-8 ${isDark ? 'text-white' : 'text-emerald-700'}`} />
                )}
            </div>
            <h3 className={`text-lg sm:text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
            <p className={`text-sm ${isDark ? 'text-white/80' : 'text-gray-600'} leading-relaxed`}>{description}</p>
        </motion.div>
    );
};

const FAQItem = ({
    question,
    answer,
    index = 0,
    sectionBgColor
}: {
    question: string;
    answer: string;
    index?: number;
    sectionBgColor?: string;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const isDark = sectionBgColor === 'theme' || sectionBgColor === 'dark';
    return (
        <motion.div 
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.06, duration: 0.4 }}
            className="mb-3"
        >
            <div className={`border rounded-2xl overflow-hidden transition-all duration-200 ${
                isDark 
                    ? (isOpen ? 'bg-white/20 border-white/30 ring-2 ring-white/10' : 'bg-white/10 border-white/10 hover:bg-white/15')
                    : (isOpen ? 'bg-white border-nature-400 ring-2 ring-nature-100 shadow-sm' : 'bg-white border-gray-200/80 hover:border-nature-300 shadow-2xs')
            }`}>
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full text-left px-5 py-4 sm:px-6 sm:py-4.5 flex justify-between items-center transition-colors cursor-pointer select-none group ${
                        isDark ? 'bg-transparent text-white' : 'bg-white hover:bg-gray-50/70'
                    }`}
                >
                    <span className={`font-bold text-base sm:text-lg pr-4 transition-colors ${
                        isOpen 
                            ? (isDark ? 'text-white' : 'text-nature-700') 
                            : (isDark ? 'text-white/90 group-hover:text-white' : 'text-gray-800 group-hover:text-nature-700')
                    }`}>
                        {question}
                    </span>
                    <span className={`p-2 rounded-xl shrink-0 transition-transform duration-200 ${
                        isOpen 
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
                            <div className={`px-5 pb-5 pt-1 text-sm sm:text-base leading-relaxed border-t ${
                                isDark 
                                    ? 'border-white/10 text-white/85' 
                                    : 'border-gray-100 text-gray-600'
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

const LatestProductsBlock = ({ block }: { block: any }) => {
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

    const bgClass = getBgClass(block.data.bgColor, 'bg-white');
    const paddingClass = getPaddingClass(block.data.paddingY, 'py-12 md:py-16');
    const isDark = block.data.bgColor === 'theme' || block.data.bgColor === 'dark';

    if (loading) {
        return (
            <div className={`${paddingClass} ${bgClass} flex justify-center items-center`}>
                <div className={`animate-spin w-8 h-8 border-3 rounded-full ${isDark ? 'border-white/20 border-t-white' : 'border-nature-200 border-t-nature-600'}`}></div>
            </div>
        );
    }

    if (products.length === 0) return null;

    return (
        <AnimatedSection className={`${paddingClass} ${bgClass} overflow-hidden`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionHeader
                    title={block.data.title || 'Ultimi Arrivi'}
                    subtitle="Prodotti freschi di giornata appena colti e subito disponibili nel catalogo."
                    isDark={isDark}
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

                <div className="text-center mt-10">
                    <Link
                        to="/shop"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-nature-600 hover:bg-nature-700 text-white font-bold text-sm shadow-sm transition-all hover:scale-105"
                    >
                        <span>Esplora l'Intero Catalogo</span>
                        <ArrowRight size={16} />
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
                // Determine seamless background for hero bottom transition
                let nextBgClass = 'text-white';
                if (index + 1 < blocks.length) {
                    const nextBlock = blocks[index + 1];
                    if (nextBlock.data?.bgColor === 'gray') nextBgClass = 'text-emerald-50';
                    else if (nextBlock.data?.bgColor === 'theme') nextBgClass = 'text-nature-900';
                    else if (nextBlock.data?.bgColor === 'dark') nextBgClass = 'text-gray-950';
                    else if (nextBlock.type === 'hero' || nextBlock.type === 'newsletter') nextBgClass = 'text-nature-950';
                    else nextBgClass = 'text-white';
                }

                switch (block.type) {
                    case 'hero':
                        const heroHeight = block.data.paddingY === 'compact' 
                            ? 'min-h-[44vh] md:min-h-[50vh] pt-14 pb-12' 
                            : (block.data.paddingY === 'large' ? 'min-h-[70vh] md:min-h-[82vh] pt-20 pb-20' : 'min-h-[56vh] md:min-h-[66vh] pt-16 pb-16');
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
                                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold py-3.5 px-8 rounded-xl text-sm sm:text-base shadow-lg shadow-emerald-950/40 hover:shadow-xl hover:scale-102 transition-all group border border-emerald-400/30"
                                            >
                                                <span>{block.data.ctaText}</span>
                                                <ArrowRight size={17} className="group-hover:translate-x-1 transition-transform" />
                                            </Link>
                                        )}

                                        {block.data.secondaryCtaText && block.data.secondaryCtaLink && (
                                            <Link
                                                to={block.data.secondaryCtaLink}
                                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-md text-white border border-white/30 font-bold py-3.5 px-6 rounded-xl text-sm sm:text-base transition-all hover:scale-102"
                                            >
                                                <span>{block.data.secondaryCtaText}</span>
                                            </Link>
                                        )}
                                    </motion.div>
                                </div>

                                {/* Bottom Wave Divider */}
                                <div className={`absolute bottom-0 left-0 w-full overflow-hidden leading-none z-10 translate-y-[1px] ${nextBgClass}`}>
                                    <svg className="relative block w-full h-[35px] sm:h-[55px] md:h-[75px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
                                        <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C89.71,114.62,204.34,74.52,321.39,56.44Z" className="fill-current"></path>
                                    </svg>
                                </div>
                            </AnimatedSection>
                        );

                    case 'bannerPromo':
                        const bpBgClass = getBgClass(block.data.bgColor, 'bg-gradient-to-r from-emerald-950 via-nature-900 to-emerald-900 text-white');
                        const bpPadding = getPaddingClass(block.data.paddingY, 'py-10 md:py-14');
                        return (
                            <AnimatedSection key={block.id} className={`${bpPadding} ${bpBgClass} relative overflow-hidden`}>
                                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                                    <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 sm:p-8 md:p-10 border border-white/20 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                                        <div className="space-y-3 text-center md:text-left flex-1">
                                            {block.data.badge && (
                                                <span className="inline-block px-3.5 py-1 rounded-full bg-amber-400 text-nature-950 font-black text-xs uppercase tracking-wider shadow-xs">
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
                                                className="px-8 py-3.5 bg-amber-400 hover:bg-amber-300 text-nature-950 font-black rounded-xl shadow-md transition-all hover:scale-105 whitespace-nowrap text-sm sm:text-base shrink-0"
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
                                { icon: 'Leaf', title: 'Solo Stagionale', description: 'Selezioniamo rigorosamente frutta e verdura colte nelle 24h precedenti.' },
                                { icon: 'Truck', title: 'Consegna a Domicilio', description: 'Ricevi la tua spesa fresca direttamente a casa con imballi ecologici.' },
                                { icon: 'CreditCard', title: 'Pagamento Flessibile', description: 'Paga comodamente online con carta o in contanti/POS alla consegna.' }
                            ];
                        const featBgClass = getBgClass(block.data.bgColor, 'bg-white');
                        const featPadding = getPaddingClass(block.data.paddingY, 'py-12 md:py-16');
                        const featIsDark = block.data.bgColor === 'theme' || block.data.bgColor === 'dark';
                        return (
                            <AnimatedSection key={block.id} className={`${featPadding} ${featBgClass} relative overflow-hidden`}>
                                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                                    <SectionHeader
                                        title={block.data.title || 'Perché Sceglierci'}
                                        subtitle="La qualità di un banco artigianale con tutta la comodità dell'online."
                                        isDark={featIsDark}
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 lg:gap-8 items-stretch">
                                        {features.map((f: any, i: number) => (
                                            <FeatureCard key={i} index={i} iconName={f.icon} iconType={f.iconType} iconUrl={f.iconUrl} title={f.title} description={f.description} sectionBgColor={block.data.bgColor} />
                                        ))}
                                    </div>
                                </div>
                            </AnimatedSection>
                        );

                    case 'imageText':
                        const isRight = block.data.imagePosition === 'right';
                        const itBgClass = getBgClass(block.data.bgColor, index % 2 === 0 ? 'bg-emerald-50/40' : 'bg-white');
                        const itPadding = getPaddingClass(block.data.paddingY, 'py-12 md:py-16');
                        const itIsDark = block.data.bgColor === 'theme' || block.data.bgColor === 'dark';
                        return (
                            <AnimatedSection key={block.id} className={`${itPadding} ${itBgClass} overflow-hidden relative`}>
                                <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col ${isRight ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-8 lg:gap-14 relative z-10`}>
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.96 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.6 }}
                                        className="w-full md:w-1/2 relative group"
                                    >
                                        <div className="relative rounded-3xl overflow-hidden shadow-lg border border-gray-150 aspect-4/3 sm:aspect-16/10 md:aspect-4/3 w-full bg-gray-100">
                                            <img
                                                src={sanitizeImageUrl(block.data.imageUrl) || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80"}
                                                alt={block.data.title || "Immagine di sezione"}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-103"
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
                                            className={`quill-content prose prose-nature prose-headings:font-script prose-headings:text-3xl sm:prose-headings:text-4xl md:prose-headings:text-5xl ${itIsDark ? 'quill-invert' : ''}`}
                                            dangerouslySetInnerHTML={{ __html: block.data.title || 'Titolo Sezione' }}
                                        />
                                        <div
                                            className={`quill-content prose prose-nature prose-p:text-gray-600 prose-p:leading-relaxed text-sm sm:text-base ${itIsDark ? 'quill-invert' : ''}`}
                                            dangerouslySetInnerHTML={{ __html: block.data.content || 'Testo descrittivo...' }}
                                        />
                                    </motion.div>
                                </div>
                            </AnimatedSection>
                        );

                    case 'cta':
                        const ctaBgClass = getBgClass(block.data.bgColor, 'bg-gradient-to-r from-fruit-500 to-amber-500');
                        const ctaPadding = getPaddingClass(block.data.paddingY, 'py-12 md:py-16');
                        const ctaIsDark = block.data.bgColor === 'theme' || block.data.bgColor === 'dark' || !block.data.bgColor || block.data.bgColor === 'default';
                        return (
                            <AnimatedSection key={block.id} className={`${ctaPadding} ${ctaBgClass} relative overflow-hidden`}>
                                <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                                    <h2 className={`font-script text-3xl sm:text-4xl md:text-5xl mb-4 drop-shadow-sm ${ctaIsDark ? 'text-white' : 'text-nature-900'}`}>
                                        {block.data.title || 'Pronto a Ricevere la Spesa Fresca?'}
                                    </h2>
                                    <p className={`text-base sm:text-lg mb-8 max-w-2xl mx-auto leading-relaxed ${ctaIsDark ? 'text-white/90' : 'text-gray-600'}`}>
                                        {block.data.text || 'Scegli la comodità del nostro catalogo online: ordina in pochi tocchi e ritira al banco o ricevi a domicilio.'}
                                    </p>

                                    {block.data.ctaText && block.data.ctaLink && (
                                        <Link
                                            to={block.data.ctaLink}
                                            className={`inline-flex items-center gap-2.5 font-bold py-3.5 px-8 rounded-xl text-sm sm:text-base shadow-lg hover:shadow-xl hover:scale-105 transition-all group ${
                                                ctaIsDark ? 'bg-white text-nature-900 hover:bg-gray-50' : 'bg-nature-600 text-white hover:bg-nature-700'
                                            }`}
                                        >
                                            <span>{block.data.ctaText}</span>
                                            <ArrowRight size={17} className="group-hover:translate-x-1 transition-transform" />
                                        </Link>
                                    )}
                                </div>
                            </AnimatedSection>
                        );

                    case 'testimonials':
                        const testBgClass = getBgClass(block.data.bgColor, index % 2 === 0 ? 'bg-white' : 'bg-emerald-50/40');
                        const testPadding = getPaddingClass(block.data.paddingY, 'py-12 md:py-16');
                        const testIsDark = block.data.bgColor === 'theme' || block.data.bgColor === 'dark';
                        return (
                            <AnimatedSection key={block.id} className={`${testPadding} ${testBgClass} relative`}>
                                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                    <SectionHeader
                                        title={block.data.title || 'Dicono di Noi'}
                                        subtitle="La fiducia dei clienti è la nostra ricompensa più bella."
                                        isDark={testIsDark}
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 items-stretch">
                                        {(block.data.testimonials || []).map((t: any, i: number) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, y: 20 }}
                                                whileInView={{ opacity: 1, y: 0 }}
                                                viewport={{ once: true }}
                                                transition={{ delay: i * 0.1, duration: 0.5 }}
                                                whileHover={{ y: -4 }}
                                                className={`p-6 sm:p-7 rounded-3xl border flex flex-col justify-between transition-all duration-300 h-full ${getThemeTextColor(block.data.bgColor, 'cardBg')}`}
                                            >
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-1 text-amber-400">
                                                        {[...Array(5)].map((_, starIndex) => (
                                                            <Star
                                                                key={starIndex}
                                                                size={16}
                                                                className={starIndex < (t.rating || 5) ? 'fill-current' : (testIsDark ? 'text-white/20' : 'text-gray-200')}
                                                            />
                                                        ))}
                                                    </div>
                                                    <p className={`leading-relaxed italic text-sm sm:text-base ${testIsDark ? 'text-white/90' : 'text-gray-600'}`}>
                                                        "{t.content}"
                                                    </p>
                                                </div>

                                                <div className={`flex items-center gap-3.5 mt-6 pt-4 border-t ${getThemeTextColor(block.data.bgColor, 'border')}`}>
                                                    <div className={`w-11 h-11 rounded-full overflow-hidden shrink-0 border ${testIsDark ? 'border-white/20 bg-white/10' : 'border-gray-200 bg-nature-100'}`}>
                                                        {t.avatarUrl ? (
                                                            <img src={sanitizeImageUrl(t.avatarUrl)} alt={t.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className={`w-full h-full flex items-center justify-center font-bold text-sm ${testIsDark ? 'text-white' : 'text-nature-700'}`}>
                                                                {t.name ? t.name.charAt(0).toUpperCase() : 'C'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className={`font-bold text-sm truncate ${testIsDark ? 'text-white' : 'text-gray-900'}`}>{t.name || 'Cliente Verificato'}</h4>
                                                        <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
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
                        const galBgClass = getBgClass(block.data.bgColor, index % 2 === 0 ? 'bg-white' : 'bg-emerald-50/40');
                        const galPadding = getPaddingClass(block.data.paddingY, 'py-12 md:py-16');
                        const galIsDark = block.data.bgColor === 'theme' || block.data.bgColor === 'dark';
                        return (
                            <AnimatedSection key={block.id} className={`${galPadding} ${galBgClass} relative`}>
                                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                    <SectionHeader
                                        title={block.data.title || 'Galleria Fotografica'}
                                        subtitle="Uno sguardo da vicino ai nostri prodotti, ai campi e ai banchi di vendita."
                                        isDark={galIsDark}
                                    />
                                    <div className={isMasonry ? "columns-2 sm:columns-3 lg:columns-4 gap-4 space-y-4" : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5"}>
                                        {images.map((img: any, i: number) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                whileInView={{ opacity: 1, scale: 1 }}
                                                viewport={{ once: true }}
                                                transition={{ delay: i * 0.05, duration: 0.4 }}
                                                className={`break-inside-avoid rounded-2xl overflow-hidden shadow-2xs hover:shadow-lg transition-all duration-300 group border border-gray-150 bg-gray-100 ${!isMasonry ? 'aspect-square' : ''}`}
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
                        return <LatestProductsBlock key={block.id} block={block} />;

                    case 'faq':
                        const faqBgClass = getBgClass(block.data.bgColor, index % 2 === 0 ? 'bg-white' : 'bg-emerald-50/40');
                        const faqPadding = getPaddingClass(block.data.paddingY, 'py-12 md:py-16');
                        const faqIsDark = block.data.bgColor === 'theme' || block.data.bgColor === 'dark';
                        return (
                            <AnimatedSection key={block.id} className={`${faqPadding} ${faqBgClass} relative`}>
                                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                                    <SectionHeader
                                        title={block.data.title || 'Domande Frequenti'}
                                        subtitle="Hai dubbi su ordini, pesate al banco o consegne? Ecco tutte le risposte."
                                        isDark={faqIsDark}
                                    />
                                    <div className="space-y-3">
                                        {(block.data.faqs || []).map((faq: any, i: number) => (
                                            <FAQItem key={i} index={i} question={faq.question} answer={faq.answer} sectionBgColor={block.data.bgColor} />
                                        ))}
                                    </div>
                                </div>
                            </AnimatedSection>
                        );

                    case 'richText':
                        const rtBgClass = getBgClass(block.data.bgColor, index % 2 === 0 ? 'bg-white' : 'bg-emerald-50/40');
                        const rtPadding = getPaddingClass(block.data.paddingY, 'py-10 md:py-14');
                        const rtIsDark = block.data.bgColor === 'theme' || block.data.bgColor === 'dark';
                        return (
                            <AnimatedSection key={block.id} className={`${rtPadding} ${rtBgClass} relative`}>
                                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                                    {block.data.title && (
                                        <SectionHeader
                                            title={block.data.title}
                                            isDark={rtIsDark}
                                        />
                                    )}
                                    <div
                                        className={`prose prose-nature max-w-none prose-base sm:prose-lg leading-relaxed prose-headings:font-script prose-headings:text-nature-900 prose-p:text-gray-600 prose-a:text-fruit-600 prose-img:rounded-2xl prose-img:shadow-md hover:prose-a:text-fruit-700 transition-colors quill-content ${rtIsDark ? 'quill-invert' : ''}`}
                                        dangerouslySetInnerHTML={{ __html: block.data.content || '' }}
                                    />
                                </div>
                            </AnimatedSection>
                        );

                    case 'newsletter':
                        const newsBgClass = getBgClass(block.data.bgColor, 'bg-gradient-to-br from-nature-950 via-nature-900 to-emerald-950 text-white');
                        const newsPadding = getPaddingClass(block.data.paddingY, 'py-12 md:py-16');
                                                return (
                            <AnimatedSection key={block.id} className={`${newsPadding} ${newsBgClass} relative overflow-hidden`}>
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
                        const statsBgClass = getBgClass(block.data.bgColor, 'bg-white');
                        const statsPadding = getPaddingClass(block.data.paddingY, 'py-12 md:py-16');
                        const statsIsDark = block.data.bgColor === 'theme' || block.data.bgColor === 'dark';
                        return (
                            <AnimatedSection key={block.id} className={`${statsPadding} ${statsBgClass} relative`}>
                                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                    {block.data.title && (
                                        <SectionHeader
                                            title={block.data.title}
                                            subtitle="I numeri che raccontano il nostro impegno quotidiano per la freschezza."
                                            isDark={statsIsDark}
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
                                                className={`p-6 rounded-2xl border text-center transition-all ${
                                                    statsIsDark 
                                                        ? 'bg-white/10 border-white/15 text-white' 
                                                        : 'bg-emerald-50/50 border-emerald-100/70 text-gray-800'
                                                }`}
                                            >
                                                <div className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2 tracking-tight text-emerald-600">
                                                    {stat.value}
                                                </div>
                                                <p className={`text-xs sm:text-sm font-bold leading-snug ${statsIsDark ? 'text-white/80' : 'text-gray-600'}`}>
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
                        const vidBgClass = getBgClass(block.data.bgColor, index % 2 === 0 ? 'bg-white' : 'bg-emerald-50/40');
                        const vidPadding = getPaddingClass(block.data.paddingY, 'py-12 md:py-16');
                        const vidIsDark = block.data.bgColor === 'theme' || block.data.bgColor === 'dark';

                        return (
                            <AnimatedSection key={block.id} className={`${vidPadding} ${vidBgClass} relative`}>
                                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                                    {block.data.title && (
                                        <SectionHeader
                                            title={block.data.title}
                                            isDark={vidIsDark}
                                        />
                                    )}
                                    <div className={`relative w-full rounded-3xl overflow-hidden shadow-xl aspect-video bg-gray-950 border ${vidIsDark ? 'border-white/20' : 'border-gray-200'}`}>
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
                        const catBgClass = getBgClass(block.data.bgColor, 'bg-white');
                        const catPadding = getPaddingClass(block.data.paddingY, 'py-12 md:py-16');
                                                return (
                            <AnimatedSection key={block.id} className={`${catPadding} ${catBgClass} relative overflow-hidden`}>
                                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                                    <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 md:mb-10 gap-4">
                                        <div>
                                            <h2 className={`font-script text-3xl sm:text-4xl md:text-5xl mb-2 ${getThemeTextColor(block.data.bgColor, 'title')}`}>
                                                {block.data.title || 'Esplora i Nostri Reparti'}
                                            </h2>
                                            <div className="w-20 h-1 bg-gradient-to-r from-fruit-400 to-yellow-400 rounded-full"></div>
                                        </div>
                                        <Link to="/shop" className={`group inline-flex items-center gap-1.5 font-bold text-sm transition-colors ${getThemeTextColor(block.data.bgColor, 'link')}`}>
                                            <span>Vedi tutto il catalogo</span>
                                            <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                                        </Link>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                                        {(block.data.categories || []).map((cat: any, i: number) => (
                                            <Link 
                                                to={cat.link || '/shop'} 
                                                key={i} 
                                                className="group relative h-64 sm:h-72 rounded-3xl overflow-hidden block shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-150"
                                            >
                                                <div className="absolute inset-0 bg-nature-100">
                                                    {cat.imageUrl && (
                                                        <img 
                                                            src={sanitizeImageUrl(cat.imageUrl)} 
                                                            alt={cat.title} 
                                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-108"
                                                        />
                                                    )}
                                                </div>
                                                <div className="absolute inset-0 bg-gradient-to-t from-nature-950/85 via-nature-950/25 to-transparent transition-opacity duration-300"></div>
                                                
                                                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 transform transition-transform duration-300">
                                                    <h3 className="font-bold text-lg sm:text-xl text-white mb-1 drop-shadow-sm">{cat.title}</h3>
                                                    <div className="flex items-center gap-1.5 text-fruit-300 text-xs font-semibold">
                                                        <span>Scopri prodotti</span>
                                                        <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </AnimatedSection>
                        );

                    case 'storeInfo':
                        const siBgClass = getBgClass(block.data.bgColor, 'bg-white');
                        const siPadding = getPaddingClass(block.data.paddingY, 'py-12 md:py-16');
                        const siIsDark = block.data.bgColor === 'theme' || block.data.bgColor === 'dark';
                        return (
                            <AnimatedSection key={block.id} className={`${siPadding} ${siBgClass} relative`}>
                                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                                    <SectionHeader
                                        title={block.data.title || 'La Nostra Sede & Contatti'}
                                        subtitle="Siamo sempre a tua disposizione per consigli sulla freschezza e preparazioni su misura."
                                        isDark={siIsDark}
                                    />
                                    <div className={`p-6 sm:p-8 rounded-3xl border shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6 ${
                                        siIsDark ? 'bg-white/10 border-white/20 text-white' : 'bg-emerald-50/40 border-emerald-100 text-gray-800'
                                    }`}>
                                        <div className="space-y-5">
                                            <div className="flex items-start gap-3.5">
                                                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                                                    <MapPin size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-xs text-gray-400 uppercase tracking-wider">Sede e Magazzino</h4>
                                                    <p className="font-bold text-base mt-0.5 text-gray-900">{block.data.address || 'Via Papa Giovanni XXIII, 12, Sirone (LC)'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3.5">
                                                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                                                    <Clock size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-xs text-gray-400 uppercase tracking-wider">Orari di Apertura</h4>
                                                    <p className="font-bold text-sm mt-0.5 text-gray-800">{block.data.hours || 'Lun - Sab: 07:30 - 19:30'}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-5">
                                            <div className="flex items-start gap-3.5">
                                                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                                                    <Phone size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-xs text-gray-400 uppercase tracking-wider">Telefono e Assistenza</h4>
                                                    <a href={`tel:${(block.data.phone || '+390341850123').replace(/[^0-9+]/g, '')}`} className="font-bold text-sm mt-0.5 text-nature-700 hover:underline block">
                                                        {block.data.phone || '+39 0341 850123'}
                                                    </a>
                                                    {block.data.whatsapp && (
                                                        <a
                                                            href={`https://wa.me/${block.data.whatsapp.replace(/[^0-9]/g, '')}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-xl transition-colors"
                                                        >
                                                            <MessageCircle size={14} /> Chatta su WhatsApp
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                            {block.data.googleMapsUrl && (
                                                <div className="pt-1">
                                                    <a
                                                        href={block.data.googleMapsUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-2 text-xs font-bold text-white bg-nature-900 hover:bg-nature-800 px-4 py-2.5 rounded-xl transition-all shadow-xs"
                                                    >
                                                        <Navigation size={14} /> Apri Indicazioni Stradali
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
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
