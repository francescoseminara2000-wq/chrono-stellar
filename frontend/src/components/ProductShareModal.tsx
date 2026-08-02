import React, { useState, useRef } from 'react';
import { 
    X, Share2, Copy, Check, MessageCircle, Facebook, Send, Download, 
    Leaf, Image as ImageIcon, Smartphone, Zap
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
    const [activeTab, setActiveTab] = useState<'quick' | 'story'>('story'); // Default to story preview
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

    const handleNativeLinkShare = () => {
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

    // Helper to generate vertical 9:16 story PNG File object
    const generateStoryImageFile = (): Promise<File> => {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const width = 1080;
            const height = 1920;
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            if (!ctx) return reject('Canvas context error');

            // 1. Ultra Modern Dark Gradient Background
            const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
            bgGradient.addColorStop(0, '#064e3b');   // emerald-900
            bgGradient.addColorStop(0.4, '#022c22'); // emerald-950
            bgGradient.addColorStop(0.8, '#064e3b'); // emerald-900
            bgGradient.addColorStop(1, '#022c22');   // emerald-950
            ctx.fillStyle = bgGradient;
            ctx.fillRect(0, 0, width, height);

            // 2. Radial Glow Highlight Behind Image
            const radialGlow = ctx.createRadialGradient(width / 2, 700, 50, width / 2, 700, 650);
            radialGlow.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
            radialGlow.addColorStop(0.7, 'rgba(16, 185, 129, 0.08)');
            radialGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = radialGlow;
            ctx.fillRect(0, 0, width, height);

            // 3. Top Glassmorphic Pill Banner
            ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
            ctx.beginPath();
            ctx.roundRect(140, 110, 800, 120, 60);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.font = 'bold 44px Nunito, sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText('🔥 PRODOTTO DI STAGIONE • ORTOFRUTTA BUTTI', width / 2, 185);

            const img = new Image();
            img.crossOrigin = 'anonymous';
            const imgUrl = product.imageUrl ? sanitizeImageUrl(product.imageUrl) : '';

            const drawRestOfCard = () => {
                // 5. Title & Tagline Box
                ctx.font = 'normal 96px "Dancing Script", Georgia, serif';
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
                ctx.shadowBlur = 25;
                ctx.fillText(product.name, width / 2, 1340);
                ctx.shadowBlur = 0;

                ctx.font = 'bold 36px Nunito, sans-serif';
                ctx.fillStyle = '#a7f3d0';
                ctx.fillText('FRESCHEZZA DI GIORNATA • RACCOLTO SIRONE (LC)', width / 2, 1420);

                // 6. Price Tag Badge (Golden Amber Pill)
                const priceText = `€${formattedPrice} / ${product.isVariableWeight ? 'kg' : (product.unitType === 'BOX' ? 'conf.' : 'pz')}`;
                ctx.fillStyle = '#fbbf24'; // amber-400
                ctx.beginPath();
                ctx.roundRect(width / 2 - 340, 1480, 680, 160, 80);
                ctx.fill();

                ctx.font = 'black 68px Nunito, sans-serif';
                ctx.fillStyle = '#022c22';
                ctx.fillText(priceText, width / 2, 1582);

                // 7. Footer Prompt
                ctx.font = 'bold 38px Nunito, sans-serif';
                ctx.fillStyle = '#ffffff';
                ctx.fillText('✨ Tocca o visita ortofruttabutti.it per ordinare', width / 2, 1780);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], `storia-ortofrutta-${product.id}.png`, { type: 'image/png' });
                        resolve(file);
                    } else {
                        reject('Blob creation failed');
                    }
                }, 'image/png');
            };

            // 4. Draw Image or Placeholder Card
            if (imgUrl) {
                img.onload = () => {
                    ctx.save();
                    ctx.beginPath();
                    ctx.roundRect(140, 270, 800, 960, 60);
                    ctx.clip();
                    ctx.drawImage(img, 140, 270, 800, 960);
                    ctx.restore();
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.lineWidth = 4;
                    ctx.stroke();
                    drawRestOfCard();
                };
                img.onerror = () => {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                    ctx.beginPath();
                    ctx.roundRect(140, 270, 800, 960, 60);
                    ctx.fill();
                    drawRestOfCard();
                };
                img.src = imgUrl;
            } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.beginPath();
                ctx.roundRect(140, 270, 800, 960, 60);
                ctx.fill();
                drawRestOfCard();
            }
        });
    };

    // Direct Instant Share to Instagram Stories / TikTok / WA via System Sheet
    const handleDirectSocialShare = async () => {
        setIsGeneratingImage(true);
        try {
            const file = await generateStoryImageFile();

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: product.name,
                    text: shareMessage
                });
            } else {
                // Fallback: Download file directly
                const url = URL.createObjectURL(file);
                const a = document.createElement('a');
                a.href = url;
                a.download = file.name;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (err) {
            console.log("Share cancelled or failed", err);
        } finally {
            setIsGeneratingImage(false);
        }
    };

    // Manual Download File
    const handleDownloadStoryCard = async () => {
        setIsGeneratingImage(true);
        try {
            const file = await generateStoryImageFile();
            const url = URL.createObjectURL(file);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Error generating story card PNG", err);
        } finally {
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

                    {/* Navigation Tabs (Story Card 9:16 vs Quick Share) */}
                    <div className="flex bg-gray-100/80 p-1 mx-4 mt-4 rounded-2xl border border-gray-200/60 text-xs font-bold">
                        <button
                            type="button"
                            onClick={() => setActiveTab('story')}
                            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                activeTab === 'story' ? 'bg-emerald-700 text-white shadow-2xs font-extrabold' : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <ImageIcon size={14} />
                            <span>Card Storie (Instagram/TikTok)</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('quick')}
                            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                activeTab === 'quick' ? 'bg-white text-emerald-900 shadow-2xs font-extrabold' : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <Share2 size={14} />
                            <span>Link Rapido</span>
                        </button>
                    </div>

                    {/* Modal Body */}
                    <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1">
                        {activeTab === 'story' ? (
                            /* VERTICAL 9:16 SOCIAL STORY CARD TAB */
                            <div className="flex flex-col items-center justify-center space-y-4">
                                <div className="text-center space-y-1">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-black uppercase tracking-wider">
                                        <Zap size={14} className="text-amber-500" /> Pronta per Storie & Reel
                                    </span>
                                    <p className="text-xs text-gray-500 font-medium">Tocca per aprire direttamente su Instagram o TikTok</p>
                                </div>

                                {/* Vertical Story Preview Box (9:16 Aspect Ratio) */}
                                <div 
                                    ref={storyCardRef}
                                    className="w-[250px] sm:w-[270px] aspect-[9/16] rounded-3xl bg-gradient-to-b from-emerald-900 via-emerald-950 to-emerald-900 border-4 border-emerald-500/30 shadow-2xl p-4 flex flex-col justify-between items-center relative overflow-hidden text-center group"
                                >
                                    {/* Decorative Ambient Radial */}
                                    <div className="absolute inset-0 bg-radial from-emerald-400/20 via-transparent to-transparent pointer-events-none"></div>

                                    {/* Story Header */}
                                    <div className="relative z-10 w-full bg-white/15 backdrop-blur-md py-1.5 px-3 rounded-full border border-white/20 text-[10px] font-black text-white tracking-wider uppercase flex items-center justify-center gap-1">
                                        <Leaf size={11} className="text-emerald-400" />
                                        <span>Ortofrutta Butti • Sirone</span>
                                    </div>

                                    {/* Main Product Image Container */}
                                    <div className="relative z-10 w-full h-[52%] rounded-2xl overflow-hidden shadow-xl bg-black/20 border border-white/20 my-2">
                                        {product.imageUrl ? (
                                            <img 
                                                src={sanitizeImageUrl(product.imageUrl)} 
                                                alt={product.name} 
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
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
                                        <div className="pt-1.5">
                                            <span className="inline-block bg-amber-400 text-nature-950 font-black px-4 py-1 rounded-full text-xs shadow-lg">
                                                €{formattedPrice} / {product.isVariableWeight ? 'kg' : (product.unitType === 'BOX' ? 'conf.' : 'pz')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Story Footer */}
                                    <div className="relative z-10 pt-2 border-t border-white/10 w-full text-[10px] font-bold text-white/80">
                                        ✨ Ordina online su ortofruttabutti.it
                                    </div>
                                </div>

                                {/* Direct Social Share & Download Buttons Container */}
                                <div className="w-full space-y-2.5 pt-2">
                                    <button
                                        type="button"
                                        onClick={handleDirectSocialShare}
                                        disabled={isGeneratingImage}
                                        className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 active:scale-98 text-white font-black rounded-2xl text-xs sm:text-sm shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer border border-emerald-500/30"
                                    >
                                        <Smartphone size={18} />
                                        <span>{isGeneratingImage ? 'Preparazione Card in Corso...' : '📲 Apri & Condividi su Instagram / TikTok'}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleDownloadStoryCard}
                                        disabled={isGeneratingImage}
                                        className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <Download size={15} />
                                        <span>Salva Immagine PNG</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
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
                                            onClick={handleNativeLinkShare}
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
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
