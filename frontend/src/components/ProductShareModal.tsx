import React, { useState, useRef } from 'react';
import { 
    X, Share2, Copy, Check, MessageCircle, Facebook, Send, Download, 
    Sparkles, Leaf, Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { sanitizeImageUrl } from '../utils/imageUrl';

interface Product {
    id: number;
    name: string;
    description: string;
    priceCents: number;
    unitType: 'KG' | 'PZ' | 'BOX';
    isVariableWeight: boolean;
    stepAmount: number;
    imageUrl?: string;
    isAvailable: boolean;
}

interface ProductShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product;
}

export const ProductShareModal: React.FC<ProductShareModalProps> = ({
    isOpen,
    onClose,
    product
}) => {
    const [activeTab, setActiveTab] = useState<'quick' | 'story'>('quick');
    const [copied, setCopied] = useState(false);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const storyCardRef = useRef<HTMLDivElement>(null);

    if (!isOpen || !product) return null;

    const productUrl = window.location.href;
    const formattedPrice = (product.priceCents / 100).toFixed(2);
    const shareMessage = `🍎 *${product.name}* a solo €${formattedPrice}/${product.isVariableWeight ? 'kg' : (product.unitType === 'BOX' ? 'conf.' : 'pz')}! Scopri la freschezza di giornata su Ortofrutta Butti: ${productUrl}`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(productUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handleWhatsAppShare = () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, '_blank');
    };

    const handleFacebookShare = () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`, '_blank');
    };

    const handleTelegramShare = () => {
        window.open(`https://t.me/share/url?url=${encodeURIComponent(productUrl)}&text=${encodeURIComponent(`*${product.name}* - Ortofrutta Butti`)}`, '_blank');
    };

    const handleNativeShare = () => {
        if (navigator.share) {
            navigator.share({
                title: product.name,
                text: shareMessage,
                url: productUrl
            }).catch(() => {});
        } else {
            handleCopyLink();
        }
    };

    // Canvas exporter for vertical 9:16 story image download
    const handleDownloadStoryCard = async () => {
        setIsGeneratingImage(true);
        try {
            const canvas = document.createElement('canvas');
            const width = 1080;
            const height = 1920;
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            if (!ctx) return;

            // Background Gradient (Nature Green & Dark Emerald)
            const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
            bgGradient.addColorStop(0, '#064e3b');   // emerald-900
            bgGradient.addColorStop(0.5, '#022c22'); // emerald-950
            bgGradient.addColorStop(1, '#064e3b');   // emerald-900
            ctx.fillStyle = bgGradient;
            ctx.fillRect(0, 0, width, height);

            // Subtle Decorative Radial Glow
            const radialGlow = ctx.createRadialGradient(width / 2, height / 3, 50, width / 2, height / 3, 600);
            radialGlow.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
            radialGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = radialGlow;
            ctx.fillRect(0, 0, width, height);

            // Header Banner
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.beginPath();
            ctx.roundRect(140, 100, 800, 110, 55);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.font = 'bold 42px Nunito, sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText('🌿 ORTOFRUTTA BUTTI • SIRONE', width / 2, 170);

            // Product Image Drawing with Fallback
            const img = new Image();
            img.crossOrigin = 'anonymous';
            const imgUrl = product.imageUrl ? sanitizeImageUrl(product.imageUrl) : '';

            const drawRestOfCard = () => {
                // Product Name
                ctx.font = 'normal 95px "Dancing Script", cursive, Georgia';
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
                ctx.shadowBlur = 20;
                ctx.fillText(product.name, width / 2, 1320);
                ctx.shadowBlur = 0;

                // Tagline Badge
                ctx.font = 'bold 36px Nunito, sans-serif';
                ctx.fillStyle = '#a7f3d0';
                ctx.fillText('FRESCHEZZA DI GIORNATA • RACCOLTO LOCALE', width / 2, 1400);

                // Price Tag Pill
                ctx.fillStyle = '#f59e0b'; // amber-500
                ctx.beginPath();
                ctx.roundRect(width / 2 - 320, 1460, 640, 160, 80);
                ctx.fill();

                ctx.font = 'black 65px Nunito, sans-serif';
                ctx.fillStyle = '#022c22';
                ctx.fillText(`€${formattedPrice} / ${product.isVariableWeight ? 'kg' : (product.unitType === 'BOX' ? 'conf.' : 'pz')}`, width / 2, 1560);

                // Footer Prompt
                ctx.font = 'bold 38px Nunito, sans-serif';
                ctx.fillStyle = '#ffffff';
                ctx.fillText('🛒 Ordina online su ortofruttabutti.it', width / 2, 1770);

                // Trigger Download
                const dataUrl = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.download = `storia-ortofrutta-${product.id}.png`;
                link.href = dataUrl;
                link.click();
                setIsGeneratingImage(false);
            };

            if (imgUrl) {
                img.onload = () => {
                    ctx.save();
                    ctx.beginPath();
                    ctx.roundRect(140, 260, 800, 950, 60);
                    ctx.clip();
                    ctx.drawImage(img, 140, 260, 800, 950);
                    ctx.restore();
                    drawRestOfCard();
                };
                img.onerror = () => {
                    // Draw Placeholder
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
                    ctx.beginPath();
                    ctx.roundRect(140, 260, 800, 950, 60);
                    ctx.fill();
                    drawRestOfCard();
                };
                img.src = imgUrl;
            } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
                ctx.beginPath();
                ctx.roundRect(140, 260, 800, 950, 60);
                ctx.fill();
                drawRestOfCard();
            }

        } catch (err) {
            console.error("Error generating story card PNG", err);
            setIsGeneratingImage(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Modal Header */}
                    <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                                <Share2 size={18} />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-gray-900 text-base">Condividi Prodotto</h3>
                                <p className="text-xs text-gray-500 font-medium truncate max-w-[220px] sm:max-w-xs">{product.name}</p>
                            </div>
                        </div>

                        <button 
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Navigation Tabs (Quick Share vs Story Card 9:16) */}
                    <div className="flex bg-gray-100/80 p-1 mx-4 mt-4 rounded-2xl border border-gray-200/60 text-xs font-bold">
                        <button
                            type="button"
                            onClick={() => setActiveTab('quick')}
                            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                activeTab === 'quick' ? 'bg-white text-emerald-900 shadow-2xs font-extrabold' : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <Share2 size={14} />
                            <span>Condivisione Rapida</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('story')}
                            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                activeTab === 'story' ? 'bg-emerald-700 text-white shadow-2xs font-extrabold' : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <ImageIcon size={14} />
                            <span>Card Storie (9:16)</span>
                        </button>
                    </div>

                    {/* Modal Body */}
                    <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1">
                        {activeTab === 'quick' ? (
                            <div className="space-y-5">
                                {/* Social Share Grid */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                                        Condividi sui Social & App
                                    </label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {/* WhatsApp */}
                                        <button
                                            type="button"
                                            onClick={handleWhatsAppShare}
                                            className="p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-emerald-900 transition-all hover:scale-105 group cursor-pointer"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                                                <MessageCircle size={20} />
                                            </div>
                                            <span className="text-xs font-bold">WhatsApp</span>
                                        </button>

                                        {/* Facebook */}
                                        <button
                                            type="button"
                                            onClick={handleFacebookShare}
                                            className="p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-blue-900 transition-all hover:scale-105 group cursor-pointer"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                                                <Facebook size={20} />
                                            </div>
                                            <span className="text-xs font-bold">Facebook</span>
                                        </button>

                                        {/* Telegram */}
                                        <button
                                            type="button"
                                            onClick={handleTelegramShare}
                                            className="p-3 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-sky-900 transition-all hover:scale-105 group cursor-pointer"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                                                <Send size={20} />
                                            </div>
                                            <span className="text-xs font-bold">Telegram</span>
                                        </button>

                                        {/* Device Share Sheet */}
                                        <button
                                            type="button"
                                            onClick={handleNativeShare}
                                            className="p-3 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-800 transition-all hover:scale-105 group cursor-pointer"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-gray-800 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                                                <Share2 size={20} />
                                            </div>
                                            <span className="text-xs font-bold">Altro...</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Copy Link Box */}
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        Link Diretto Prodotto
                                    </label>
                                    <div className="flex gap-2 p-1.5 bg-gray-50 border border-gray-200 rounded-2xl items-center">
                                        <input
                                            type="text"
                                            readOnly
                                            value={productUrl}
                                            className="flex-1 px-3 py-1.5 text-xs text-gray-700 bg-transparent outline-none font-mono truncate"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleCopyLink}
                                            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                                                copied ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-800 text-white hover:bg-emerald-900'
                                            }`}
                                        >
                                            {copied ? <Check size={14} /> : <Copy size={14} />}
                                            <span>{copied ? 'Copiato!' : 'Copia Link'}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* VERTICAL 9:16 SOCIAL STORY CARD TAB */
                            <div className="flex flex-col items-center justify-center space-y-4">
                                <div className="text-center space-y-1">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider">
                                        <Sparkles size={13} /> Formato Storie Instagram / WhatsApp / TikTok
                                    </span>
                                    <p className="text-xs text-gray-500 font-medium">Anteprima card pronta per la pubblicazione sui social</p>
                                </div>

                                {/* Vertical Story Preview Box (9:16 Aspect Ratio) */}
                                <div 
                                    ref={storyCardRef}
                                    className="w-[260px] sm:w-[280px] aspect-[9/16] rounded-3xl bg-gradient-to-b from-emerald-900 via-emerald-950 to-emerald-900 border-4 border-emerald-700/50 shadow-2xl p-5 flex flex-col justify-between items-center relative overflow-hidden text-center"
                                >
                                    {/* Decorative Radial Background */}
                                    <div className="absolute inset-0 bg-radial from-emerald-500/20 via-transparent to-transparent pointer-events-none"></div>

                                    {/* Story Header */}
                                    <div className="relative z-10 w-full bg-white/15 backdrop-blur-md py-1.5 px-3 rounded-full border border-white/20 text-[11px] font-extrabold text-white tracking-wider uppercase flex items-center justify-center gap-1">
                                        <Leaf size={12} className="text-emerald-400" />
                                        <span>Ortofrutta Butti • Sirone</span>
                                    </div>

                                    {/* Main Product Image Container */}
                                    <div className="relative z-10 w-full h-[52%] rounded-2xl overflow-hidden shadow-xl bg-black/20 border border-white/20 my-2">
                                        {product.imageUrl ? (
                                            <img 
                                                src={sanitizeImageUrl(product.imageUrl)} 
                                                alt={product.name} 
                                                className="w-full h-full object-cover" 
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center font-script text-7xl text-white/30">
                                                {product.name[0]}
                                            </div>
                                        )}
                                    </div>

                                    {/* Story Text Info */}
                                    <div className="relative z-10 w-full space-y-1">
                                        <h4 className="font-script text-3xl sm:text-4xl text-white leading-tight drop-shadow-md">
                                            {product.name}
                                        </h4>
                                        <p className="text-[10px] text-emerald-200 font-extrabold uppercase tracking-widest">
                                            Freschezza di Giornata
                                        </p>

                                        {/* Price Tag Pill */}
                                        <div className="pt-2">
                                            <span className="inline-block bg-amber-400 text-nature-950 font-black px-4 py-1.5 rounded-full text-sm shadow-lg">
                                                €{formattedPrice} / {product.isVariableWeight ? 'kg' : (product.unitType === 'BOX' ? 'conf.' : 'pz')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Story Footer */}
                                    <div className="relative z-10 pt-2 border-t border-white/10 w-full text-[10px] font-bold text-white/80">
                                        🛒 Ordina online su ortofruttabutti.it
                                    </div>
                                </div>

                                {/* Download Story Card Button */}
                                <button
                                    type="button"
                                    onClick={handleDownloadStoryCard}
                                    disabled={isGeneratingImage}
                                    className="w-full sm:w-auto px-6 py-3.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-2xl text-xs sm:text-sm shadow-lg transition-all hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                >
                                    <Download size={16} />
                                    <span>{isGeneratingImage ? 'Generazione Card...' : 'Scarica Immagine per Storie (PNG)'}</span>
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
