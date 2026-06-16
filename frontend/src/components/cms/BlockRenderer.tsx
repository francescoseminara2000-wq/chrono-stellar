import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Leaf, ArrowRight, ChevronDown } from 'lucide-react';
import { useAppState } from '../../store/useAppState';
import { Block } from '../../pages/admin/PageManager';
import { ProductCard } from '../ProductCard';
import { WeightSelectorDrawer } from '../WeightSelectorDrawer';
import { useCartStore } from '../../store/useCartStore';
import { sanitizeImageUrl } from '../../utils/imageUrl';


interface BlockRendererProps {
    content: string; // The JSON stringified array of blocks
}

const AnimatedSection = ({ children, className }: { children: React.ReactNode, className?: string }) => {
    return (
        <motion.section
            initial={{ opacity: 0, y: 30, scale: 0.98, filter: 'blur(5px)' }}
            whileInView={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} // smoother apple-like ease
            className={className}
        >
            {children}
        </motion.section>
    );
};

const LatestProductsBlock = ({ block, overlapClasses }: { block: any, overlapClasses?: string }) => {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { items, addItem, updateQuantity } = useCartStore();
    const [selectedProductForWeight, setSelectedProductForWeight] = useState<any | null>(null);

    const getProductQuantity = (productId: number) => {
        const item = items.find(i => i.id === productId);
        return item ? item.quantity : 0;
    };

    useEffect(() => {
        fetch(`/api/products`)
            .then(res => res.json())
            .then(data => {
                const available = data.filter((p: any) => p.isAvailable);
                // Assume the API returns newest first, or we just slice the first N for display
                setProducts(available.slice(0, block.data.count || 4));
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching latest products:', err);
                setLoading(false);
            });
    }, [block.data.count]);

    if (loading) return (
        <div className={`py-24 flex justify-center bg-white ${overlapClasses || ''}`}>
            <div className="animate-spin w-8 h-8 border-4 border-nature-200 border-t-nature-600 rounded-full"></div>
        </div>
    );

    if (products.length === 0) return null;

    return (
        <AnimatedSection className={`py-12 md:py-16 overflow-hidden bg-white ${overlapClasses || ''}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-10 md:mb-12">
                    <h2 className="font-script text-4xl md:text-5xl text-nature-900 mb-4">{block.data.title || 'Ultimi Arrivi'}</h2>
                    <div className="w-24 h-1.5 bg-gradient-to-r from-fruit-400 to-yellow-400 mx-auto rounded-full shadow-sm"></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                    {products.map(product => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            onWeightSelect={setSelectedProductForWeight}
                        />
                    ))}
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
        </AnimatedSection>
    );
};

const DynamicIcon = ({ name, className }: { name: string, className?: string }) => {
    const IconComponent = (Icons as any)[name] || Icons.Star;
    return <IconComponent className={className || "w-12 h-12 text-nature-600"} />;
};

const FeatureCard = ({ iconName, iconType, iconUrl, title, description, index = 0 }: { iconName?: string, iconType?: string, iconUrl?: string, title: string, description: string, index?: number }) => (
    <motion.div
        initial={{ opacity: 0, y: 40, rotateX: 15 }}
        whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.8, delay: index * 0.1, type: "spring", bounce: 0.4 }}
        whileHover={{ y: -8, scale: 1.02 }}
        className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 text-center flex flex-col items-center hover:shadow-2xl transition-shadow duration-300 group"
    >
        <div className="w-20 h-20 bg-nature-50 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-nature-100 transition-colors group-hover:scale-110 duration-300">
            {iconType === 'image' && iconUrl ? (
                <img src={sanitizeImageUrl(iconUrl)} alt={title} className="w-10 h-10 object-contain" />
            ) : (
                <DynamicIcon name={iconName || 'Star'} />
            )}
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
        <p className="text-gray-500 leading-relaxed">{description}</p>
    </motion.div>
);

const FAQItem = ({ question, answer, index = 0 }: { question: string, answer: string, index?: number }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            className="mb-4"
        >
            <div className={`border rounded-[1.5rem] bg-white overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 ${isOpen ? 'border-fruit-300 ring-2 ring-fruit-50' : 'border-gray-100 hover:border-nature-200'}`}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full text-left px-6 py-5 flex justify-between items-center bg-white hover:bg-nature-50/50 transition-colors group"
                >
                    <span className={`font-bold text-lg pr-4 transition-colors ${isOpen ? 'text-fruit-600' : 'text-gray-900 group-hover:text-nature-700'}`}>{question}</span>
                    <span className={`p-2.5 rounded-full flex-shrink-0 transition-all duration-300 ${isOpen ? 'bg-fruit-100 text-fruit-600 rotate-180' : 'bg-nature-50 text-nature-600 group-hover:bg-nature-100'}`}>
                        <ChevronDown size={20} className="transition-transform duration-300" />
                    </span>
                </button>
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                            <div className="px-6 pb-6 pt-2 text-gray-600 leading-relaxed bg-white">
                                {answer}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
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
                // We never overlap the hero. If the current block follows the hero, we don't overlap to let the wave be visible.
                const prevBlockWasHero = index > 0 && blocks[index - 1].type === 'hero';
                const shouldOverlap = index > 0 && !prevBlockWasHero;
                const overlapClasses = shouldOverlap ? "z-20 -mt-8 md:-mt-12 rounded-t-[3rem] shadow-[0_-15px_40px_rgba(0,0,0,0.03)]" : (index > 0 ? "relative z-20" : ""); // Ensure z-index is maintained even without negative margin

                // Determine the background color of the next block to seamlessly blend the wave cutout
                let nextBgColor = 'text-white';
                if (index + 1 < blocks.length) {
                    const nextBlock = blocks[index + 1];
                    if (['features', 'stats', 'categories', 'latestProducts'].includes(nextBlock.type)) nextBgColor = 'text-white';
                    else if (nextBlock.type === 'hero' || nextBlock.type === 'newsletter') nextBgColor = 'text-nature-900';
                    else if (nextBlock.type === 'cta') nextBgColor = 'text-white';
                    else {
                        nextBgColor = (index + 1) % 2 === 0 ? 'text-white' : 'text-nature-50';
                    }
                }

                switch (block.type) {
                    case 'hero':
                        return (
                            <AnimatedSection key={block.id} className={`relative z-[50] min-h-[60vh] md:min-h-[70vh] flex items-center justify-center pt-20 overflow-hidden bg-nature-900 group ${shouldOverlap ? '-mt-8 md:-mt-12 rounded-t-[3rem] shadow-[0_-15px_40px_rgba(0,0,0,0.03)]' : ''}`}>
                                <motion.div 
                                    initial={{ scale: 1.15 }}
                                    animate={{ scale: 1 }}
                                    transition={{ duration: 2, ease: "easeOut" }}
                                    className="absolute inset-0 z-0"
                                >
                                    <img
                                        src={sanitizeImageUrl(block.data.backgroundImage) || "https://images.unsplash.com/photo-1610832958506-aa56368176cf?q=80&w=2670&auto=format&fit=crop"}
                                        alt="Hero Background"
                                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-[10s]"
                                    />
                                    {/* Premium Gradient Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-nature-900/90 via-nature-900/40 to-black/30"></div>
                                </motion.div>
                                
                                <div className="relative z-[45] text-center text-white px-4 max-w-5xl mx-auto w-full mb-8 md:mb-10">
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8, y: -20, filter: 'blur(5px)' }}
                                        animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                                        transition={{ duration: 1, type: "spring", bounce: 0.5 }}
                                        className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-white text-nature-900 text-sm font-bold mb-8 shadow-xl tracking-wide uppercase"
                                    >
                                        <Leaf size={16} className="text-fruit-500" />
                                        {block.data.subtitle || settings?.tagline || 'Freschezza Quotidiana'}
                                    </motion.div>
                                    
                                    <motion.h1
                                        initial={{ opacity: 0, y: 50, filter: 'blur(10px)' }}
                                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                        transition={{ duration: 1.2, delay: 0.2, type: "spring", bounce: 0.3 }}
                                        className="font-script text-7xl md:text-9xl mb-6 text-white leading-tight drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
                                    >
                                        {block.data.title || 'Benvenuto'}
                                    </motion.h1>

                                    {block.data.ctaText && block.data.ctaLink && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 30 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 1, delay: 0.3 }}
                                            className="mt-10"
                                        >
                                            <Link
                                                to={block.data.ctaLink}
                                                className="inline-flex items-center gap-3 bg-[linear-gradient(90deg,#f97316,#ea580c)] text-white font-black py-5 px-12 rounded-full text-lg shadow-[0_10px_30px_rgba(234,88,12,0.4)] hover:shadow-[0_15px_40px_rgba(234,88,12,0.6)] hover:scale-105 hover:-translate-y-1 transition-all border border-transparent group"
                                            >
                                                {block.data.ctaText}
                                                <ArrowRight strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                                            </Link>
                                        </motion.div>
                                    )}
                                </div>
                                {/* Bottom Wave Decoration - Keeps z-[30] to overlap next block, but allows text container (z-[40]) to stay above it */}
                                <div className={`absolute bottom-0 left-0 w-full overflow-hidden leading-none z-[30] translate-y-[1px] ${nextBgColor} drop-shadow-[0_-5px_15px_rgba(0,0,0,0.05)]`}>
                                    <svg className="relative block w-full h-[60px] md:h-[100px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
                                        <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C89.71,114.62,204.34,74.52,321.39,56.44Z" className="fill-current"></path>
                                    </svg>
                                </div>
                            </AnimatedSection>
                        );

                    case 'features':
                        const features = block.data.features && block.data.features.length > 0
                            ? block.data.features
                            : [
                                { icon: 'Leaf', title: 'Solo Stagionale', description: 'Selezioniamo rigorosamente frutta e verdura...' },
                                { icon: 'Truck', title: 'Consegna a Domicilio', description: 'Ricevi la tua spesa fresca direttamente a casa...' },
                                { icon: 'CreditCard', title: 'Pagamento Sicuro', description: 'Paga in totale sicurezza online o alla consegna.' }
                            ];
                        return (
                            <AnimatedSection key={block.id} className={`py-16 md:py-24 bg-white relative overflow-hidden ${overlapClasses}`}>
                                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-nature-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-fruit-50 rounded-full blur-3xl opacity-50 translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
                                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                                    <div className="text-center mb-12 md:mb-20">
                                        <h2 className="font-script text-4xl md:text-5xl lg:text-6xl text-nature-900 mb-4 md:mb-6">{block.data.title || 'Perché Sceglierci'}</h2>
                                        <div className="w-24 h-1.5 bg-gradient-to-r from-fruit-400 to-yellow-400 mx-auto rounded-full shadow-sm"></div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 lg:gap-12">
                                        {features.map((f: any, i: number) => (
                                            <FeatureCard key={i} index={i} iconName={f.icon} iconType={f.iconType} iconUrl={f.iconUrl} title={f.title} description={f.description} />
                                        ))}
                                    </div>
                                </div>
                            </AnimatedSection>
                        );

                    case 'imageText':
                        const isRight = block.data.imagePosition === 'right';
                        return (
                            <AnimatedSection key={block.id} className={`py-16 md:py-24 overflow-hidden ${index % 2 === 0 ? 'bg-nature-50' : 'bg-white'} relative ${index > 0 ? 'z-20 -mt-8 md:-mt-12 rounded-t-[3rem] shadow-[0_-15px_40px_rgba(0,0,0,0.03)]' : ''}`}>
                                <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col ${isRight ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-12 lg:gap-20 relative z-10`}>
                                    <motion.div
                                        initial={{ opacity: 0, x: isRight ? 50 : -50, filter: 'blur(10px)' }}
                                        whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                                        viewport={{ once: true, margin: "-100px" }}
                                        transition={{ duration: 1, type: "spring", bounce: 0.4 }}
                                        className="md:w-1/2 relative group"
                                    >
                                        <div className={`absolute -inset-4 ${isRight ? 'bg-gradient-to-tr' : 'bg-gradient-to-tl'} from-fruit-100 to-nature-100 rounded-[3rem] z-0 transform ${isRight ? 'rotate-3 group-hover:rotate-6' : '-rotate-3 group-hover:-rotate-6'} transition-transform duration-700 opacity-70`}></div>
                                        <img
                                            src={sanitizeImageUrl(block.data.imageUrl) || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80"}
                                            alt={block.data.title || "Image"}
                                            className="relative z-10 rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] object-cover aspect-square md:aspect-[4/3] w-full transition-transform duration-700 group-hover:scale-[1.02]"
                                        />
                                    </motion.div>
                                    <motion.div
                                        initial={{ opacity: 0, x: isRight ? -30 : 30, filter: 'blur(5px)' }}
                                        whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                                        viewport={{ once: true, margin: "-100px" }}
                                        transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                                        className="md:w-1/2 space-y-6"
                                    >
                                        <div
                                            className="quill-content prose prose-lg prose-nature prose-headings:font-script prose-headings:text-4xl md:prose-headings:text-5xl lg:prose-headings:text-6xl prose-headings:text-nature-900"
                                            dangerouslySetInnerHTML={{ __html: block.data.title || 'Titolo Sezione' }}
                                        />
                                        <div
                                            className="quill-content prose prose-lg prose-nature prose-p:text-gray-600 prose-p:leading-relaxed"
                                            dangerouslySetInnerHTML={{ __html: block.data.content || 'Testo descrittivo...' }}
                                        />
                                    </motion.div>
                                </div>
                            </AnimatedSection>
                        );

                    case 'cta':
                        return (
                            <AnimatedSection key={block.id} className={`py-16 md:py-24 bg-gradient-to-r from-fruit-500 to-yellow-400 relative overflow-hidden ${overlapClasses}`}>
                                <div className="absolute inset-0 bg-nature-900/10 z-0 mix-blend-overlay"></div>
                                <div className="absolute top-0 right-0 w-96 h-96 bg-white/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 mix-blend-overlay"></div>
                                <div className="absolute bottom-0 left-0 w-96 h-96 bg-yellow-400/20 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/3 mix-blend-overlay"></div>

                                <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                                    <motion.h2 
                                        initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
                                        whileInView={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.8, type: "spring", bounce: 0.5 }}
                                        className="font-script text-4xl md:text-5xl lg:text-6xl mb-6 md:mb-8 text-white drop-shadow-md"
                                    >
                                        {block.data.title || 'Pronto a Ordinare?'}
                                    </motion.h2>
                                    <motion.p 
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.8, delay: 0.2 }}
                                        className="text-xl md:text-2xl text-white/90 mb-6 md:mb-8 max-w-2xl mx-auto leading-relaxed"
                                    >
                                        {block.data.text || 'Scopri la nostra selezione di prodotti freschi di stagione.'}
                                    </motion.p>

                                    {block.data.ctaText && block.data.ctaLink && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 30, scale: 0.9 }}
                                            whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 0.8, delay: 0.4, type: "spring", bounce: 0.6 }}
                                        >
                                            <Link
                                                to={block.data.ctaLink}
                                                className="inline-flex items-center gap-2 bg-white text-nature-900 font-bold py-4 px-10 rounded-full text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all group"
                                            >
                                                {block.data.ctaText}
                                                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                                            </Link>
                                        </motion.div>
                                    )}
                                </div>
                            </AnimatedSection>
                        );

                    case 'testimonials':
                        return (
                            <AnimatedSection key={block.id} className={`py-16 md:py-24 ${index % 2 === 0 ? 'bg-white' : 'bg-nature-50'} relative ${overlapClasses}`}>
                                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                    <div className="text-center mb-10 md:mb-16">
                                        <h2 className="font-script text-4xl md:text-5xl lg:text-6xl text-nature-900 mb-4">{block.data.title || 'Dicono di noi'}</h2>
                                        <div className="w-24 h-1.5 bg-gradient-to-r from-fruit-400 to-yellow-400 mx-auto rounded-full shadow-sm"></div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                                        {(block.data.testimonials || []).map((t: any, i: number) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, y: 40, scale: 0.95, filter: 'blur(5px)' }}
                                                whileInView={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                                                viewport={{ once: true, margin: "-50px" }}
                                                transition={{ delay: i * 0.15, duration: 0.8, type: "spring", bounce: 0.4 }}
                                                whileHover={{ y: -8, scale: 1.02 }}
                                                className={`bg-white p-8 md:p-10 rounded-[2rem] shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] border border-gray-100/50 flex flex-col relative hover:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.15)] transition-all duration-300 ${i % 2 !== 0 ? 'lg:translate-y-8' : ''}`}
                                            >
                                                <div className="absolute top-6 right-8 opacity-10 pointer-events-none">
                                                    <span className="font-script text-[8rem] leading-none text-nature-600">"</span>
                                                </div>
                                                <p className="text-gray-600 leading-relaxed italic relative z-10 flex-1 text-lg">"{t.content}"</p>
                                                <div className="flex items-center gap-5 mt-8 relative z-10 pt-6 border-t border-gray-100">
                                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-nature-100 to-nature-200 overflow-hidden shadow-inner ring-4 ring-white">
                                                        {t.avatarUrl ? (
                                                            <img src={sanitizeImageUrl(t.avatarUrl)} alt={t.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-nature-600 font-bold text-xl">
                                                                {t.name ? t.name.charAt(0).toUpperCase() : '?'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-gray-900 text-lg">{t.name || 'Cliente Anonimo'}</h4>
                                                        <div className="flex gap-1 mt-1 text-fruit-400">
                                                            {[...Array(5)].map((_, starIndex) => (
                                                                <Icons.Star key={starIndex} size={16} className={starIndex < (t.rating || 5) ? 'fill-current drop-shadow-sm' : 'text-gray-200'} />
                                                            ))}
                                                        </div>
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
                            <AnimatedSection key={block.id} className={`py-12 md:py-16 ${index % 2 === 0 ? 'bg-white' : 'bg-nature-50'} relative ${overlapClasses}`}>
                                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                    {block.data.title && (
                                        <div className="text-center mb-10 md:mb-12">
                                            <h2 className="font-script text-4xl md:text-5xl text-nature-900 mb-4">{block.data.title}</h2>
                                            <div className="w-24 h-1.5 bg-gradient-to-r from-fruit-400 to-yellow-400 mx-auto rounded-full shadow-sm"></div>
                                        </div>
                                    )}
                                    <div className={isMasonry ? "columns-1 sm:columns-2 lg:columns-3 gap-4 lg:gap-6 space-y-4 lg:space-y-6" : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"}>
                                        {images.map((img: any, i: number) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)', rotate: Math.random() * 10 - 5 }}
                                                whileInView={{ opacity: 1, scale: 1, filter: 'blur(0px)', rotate: 0 }}
                                                viewport={{ once: true, margin: "-50px" }}
                                                transition={{ delay: i * 0.08, duration: 0.8, type: "spring", bounce: 0.5 }}
                                                className={`break-inside-avoid rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 group cursor-pointer ${!isMasonry ? 'aspect-square' : ''}`}
                                            >
                                                <img
                                                    src={sanitizeImageUrl(img.url)}
                                                    alt={img.alt || 'Gallery image'}
                                                    className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${!isMasonry ? 'absolute inset-0' : ''}`}
                                                    loading="lazy"
                                                />
                                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </AnimatedSection>
                        );

                    case 'latestProducts':
                        return <LatestProductsBlock key={block.id} block={block} overlapClasses={overlapClasses} />;

                    case 'faq':
                        return (
                            <AnimatedSection key={block.id} className={`py-12 md:py-16 ${index % 2 === 0 ? 'bg-white' : 'bg-nature-50'} relative ${overlapClasses}`}>
                                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                                    <div className="text-center mb-10 md:mb-12">
                                        <h2 className="font-script text-4xl md:text-5xl text-nature-900 mb-4">{block.data.title || 'Domande Frequenti'}</h2>
                                        <div className="w-24 h-1.5 bg-gradient-to-r from-fruit-400 to-yellow-400 mx-auto rounded-full shadow-sm"></div>
                                    </div>
                                    <div className="space-y-4">
                                        {(block.data.faqs || []).map((faq: any, i: number) => (
                                            <FAQItem key={i} index={i} question={faq.question} answer={faq.answer} />
                                        ))}
                                    </div>
                                </div>
                            </AnimatedSection>
                        );

                    case 'richText':
                        return (
                            <AnimatedSection key={block.id} className={`py-10 md:py-16 ${index % 2 === 0 ? 'bg-white' : 'bg-nature-50'} relative ${overlapClasses}`}>
                                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                                    <div
                                        className="prose prose-nature max-w-none prose-base md:prose-lg leading-loose prose-headings:font-script prose-headings:text-nature-900 prose-p:text-gray-600 prose-a:text-fruit-600 prose-img:rounded-3xl prose-img:shadow-xl hover:prose-a:text-fruit-700 transition-colors quill-content"
                                        dangerouslySetInnerHTML={{ __html: block.data.content || '' }}
                                    />
                                </div>
                            </AnimatedSection>
                        );

                    case 'newsletter':
                        return (
                            <AnimatedSection key={block.id} className={`py-12 md:py-24 relative overflow-hidden ${overlapClasses}`}>
                                {/* Decorative background elements */}
                                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-nature-800 to-nature-900 -z-20"></div>
                                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[150%] bg-nature-700/30 rotate-12 blur-3xl rounded-full -z-10 mix-blend-overlay"></div>
                                <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[120%] bg-fruit-600/20 -rotate-12 blur-3xl rounded-full -z-10 mix-blend-overlay"></div>
                                
                                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                                    <div className="inline-flex items-center justify-center p-4 bg-white/10 backdrop-blur-md rounded-2xl mb-6 shadow-2xl border border-white/20">
                                        <Icons.Mail size={40} className="text-fruit-400 drop-shadow-lg" />
                                    </div>
                                    <h2 className="font-script text-4xl md:text-5xl lg:text-6xl text-white mb-6 drop-shadow-md">{block.data.title || 'Iscriviti alla Newsletter'}</h2>
                                    <p className="text-xl text-nature-100 mb-10 max-w-2xl mx-auto font-medium">{block.data.subtitle || 'Rimani aggiornato sulle nostre offerte e novità'}</p>
                                    
                                    <form className="max-w-md mx-auto relative group" onSubmit={(e) => { e.preventDefault(); alert('Iscrizione effettuata! (Demo)'); }}>
                                        <div className="absolute -inset-1 bg-gradient-to-r from-fruit-400 to-yellow-400 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-500"></div>
                                        <div className="relative flex flex-col sm:flex-row gap-2 bg-white/10 backdrop-blur-xl p-2 rounded-3xl border border-white/20 shadow-2xl">
                                            <input 
                                                type="email" 
                                                placeholder="Il tuo indirizzo email..." 
                                                required
                                                className="flex-1 px-6 py-4 rounded-full bg-white/90 text-nature-900 font-medium focus:outline-none focus:ring-2 focus:ring-fruit-400 placeholder-nature-400"
                                            />
                                            <button 
                                                type="submit" 
                                                className="px-8 py-4 rounded-full bg-gradient-to-r from-fruit-500 to-fruit-600 text-white font-bold tracking-wide shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-nature-900 focus:ring-fruit-400"
                                            >
                                                {block.data.buttonText || 'Iscriviti Ora'}
                                            </button>
                                        </div>
                                    </form>
                                    <p className="text-sm text-nature-300 mt-6 flex items-center justify-center gap-2">
                                        <Icons.ShieldCheck size={16} /> Rispettiamo la tua privacy. Niente spam.
                                    </p>
                                </div>
                            </AnimatedSection>
                        );

                    case 'stats':
                        return (
                            <AnimatedSection key={block.id} className={`py-16 md:py-24 bg-white relative ${overlapClasses}`}>
                                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                    {block.data.title && (
                                        <div className="text-center mb-12 md:mb-16">
                                            <h2 className="font-script text-4xl md:text-5xl lg:text-6xl text-nature-900 mb-4">{block.data.title}</h2>
                                            <div className="w-24 h-1.5 bg-gradient-to-r from-fruit-400 to-yellow-400 mx-auto rounded-full shadow-sm"></div>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 lg:gap-12">
                                        {(block.data.stats || []).map((stat: any, i: number) => (
                                            <motion.div 
                                                key={i}
                                                initial={{ opacity: 0, y: 30 }}
                                                whileInView={{ opacity: 1, y: 0 }}
                                                viewport={{ once: true }}
                                                transition={{ delay: i * 0.1, duration: 0.6 }}
                                                className="text-center group"
                                            >
                                                <div className="relative inline-block mb-4">
                                                    <div className="absolute inset-0 bg-fruit-100 rounded-full scale-[1.5] -z-10 group-hover:scale-[1.7] transition-transform duration-500 opacity-50"></div>
                                                    <span className="text-4xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-nature-700 to-nature-900 drop-shadow-sm group-hover:from-fruit-600 group-hover:to-fruit-800 transition-all">
                                                        {stat.value}
                                                    </span>
                                                </div>
                                                <p className="text-lg md:text-xl font-bold text-gray-600 group-hover:text-nature-700 transition-colors mt-2">{stat.label}</p>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </AnimatedSection>
                        );

                    case 'video':
                        // Helper to extract youtube ID
                        const getEmbedUrl = (url: string) => {
                            if (!url) return '';
                            const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
                            if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&rel=0`;
                            return url; // assume vimeo or other embeddable if not youtube, though risky without full strict parsing
                        };
                        const embedUrl = getEmbedUrl(block.data.videoUrl);

                        return (
                            <AnimatedSection key={block.id} className={`py-12 md:py-24 ${index % 2 === 0 ? 'bg-white' : 'bg-nature-50'} relative ${overlapClasses}`}>
                                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                                    {block.data.title && (
                                        <div className="text-center mb-10">
                                            <h2 className="font-script text-4xl md:text-5xl lg:text-6xl text-nature-900 mb-4">{block.data.title}</h2>
                                            <div className="w-24 h-1.5 bg-gradient-to-r from-fruit-400 to-yellow-400 mx-auto rounded-full shadow-sm"></div>
                                        </div>
                                    )}
                                    <div className="relative w-full rounded-[2rem] overflow-hidden shadow-2xl aspect-video group bg-gray-900 ring-4 ring-white/50">
                                        {embedUrl ? (
                                            <iframe
                                                src={embedUrl}
                                                className="absolute inset-0 w-full h-full border-0"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                                title={block.data.title || "Video"}
                                            ></iframe>
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center text-white/50 text-xl font-medium bg-nature-900/10">
                                                Nessun video inserito
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </AnimatedSection>
                        );

                    case 'categories':
                        return (
                            <AnimatedSection key={block.id} className={`py-16 md:py-24 relative overflow-hidden bg-white ${overlapClasses}`}>
                                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                                    {block.data.title && (
                                        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 md:mb-12 gap-6">
                                            <div>
                                                <h2 className="font-script text-4xl md:text-5xl lg:text-6xl text-nature-900 mb-4">{block.data.title}</h2>
                                                <div className="w-24 h-1.5 bg-gradient-to-r from-fruit-400 to-yellow-400 rounded-full shadow-sm"></div>
                                            </div>
                                            <Link to="/shop" className="group inline-flex items-center gap-2 text-fruit-600 font-bold hover:text-fruit-700 transition-colors">
                                                Vedi tutti i prodotti
                                                <span className="w-8 h-8 rounded-full bg-fruit-100 flex items-center justify-center group-hover:bg-fruit-200 transition-colors">
                                                    <ArrowRight size={16} />
                                                </span>
                                            </Link>
                                        </div>
                                    )}
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {(block.data.categories || []).map((cat: any, i: number) => (
                                            <Link to={cat.link || '/shop'} key={i} className="group relative h-80 rounded-[2rem] overflow-hidden block shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                                                <div className="absolute inset-0 bg-nature-200">
                                                    {cat.imageUrl && (
                                                        <img 
                                                            src={sanitizeImageUrl(cat.imageUrl)} 
                                                            alt={cat.title} 
                                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                        />
                                                    )}
                                                </div>
                                                {/* Gradient overlay for text readability */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-nature-900/90 via-nature-900/30 to-transparent transition-opacity duration-300 group-hover:opacity-90"></div>
                                                
                                                <div className="absolute inset-x-0 bottom-0 p-8 transform transition-transform duration-500 group-hover:translate-y-0 translate-y-2">
                                                    <h3 className="font-bold text-2xl text-white mb-2">{cat.title}</h3>
                                                    <div className="flex items-center gap-2 text-fruit-300 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 transform -translate-x-4 group-hover:translate-x-0">
                                                        <span>Esplora</span> <ArrowRight size={16} />
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
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
