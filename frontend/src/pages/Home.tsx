import React, { useRef, useState, useEffect } from 'react';
import { ArrowRight, Leaf, Truck, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppState } from '../store/useAppState';
import { BlockRenderer } from '../components/cms/BlockRenderer';

const API_URL = '';

export const Home = () => {
    const heroRef = useRef<HTMLDivElement>(null);
    const [cmsContent, setCmsContent] = useState<string | null>(null);

    useEffect(() => {
        const fetchHomeContent = async () => {
            try {
                const res = await fetch(`${API_URL}/api/pages/home`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.isPublished && data.content) {
                        setCmsContent(data.content);
                    }
                }
            } catch (error) {
                console.error("Home page CMS fetch failed:", error);
                // Graceful fallback to static content
            }
        };
        fetchHomeContent();
    }, []);

    const { settings } = useAppState();

    return (
        <div className="flex flex-col min-h-screen font-sans selection:bg-nature-200 selection:text-nature-900">
            {cmsContent ? (
                <BlockRenderer content={cmsContent} />
            ) : (
                <>
                    {/* Hero Section (Static Fallback) */}
                    <section ref={heroRef} className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden bg-nature-50">
                        {/* Background Details */}
                        <div className="absolute inset-0 z-0">
                            <img
                                src="https://images.unsplash.com/photo-1610832958506-aa56368176cf?q=80&w=2670&auto=format&fit=crop"
                                alt="Fresh Market"
                                className="w-full h-full object-cover object-center brightness-50"
                            />
                        </div>

                        <div className="relative z-10 text-center text-white px-4 max-w-5xl mx-auto w-full mb-12">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm justify-center font-bold mb-8 shadow-sm"
                            >
                                <Leaf size={16} className="text-fruit-400" />
                                {settings?.tagline || 'Freschezza Quotidiana'}
                            </motion.div>

                            <motion.h1
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                                className="font-script text-7xl md:text-9xl mb-6 text-white drop-shadow-2xl"
                            >
                                Freschezza Quotidiana
                            </motion.h1>

                            <motion.p
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
                                className="font-sans text-xl md:text-3xl mb-10 font-light text-nature-50 tracking-wide max-w-2xl mx-auto"
                            >
                                La qualità e la freschezza dell'ortofrutta, direttamente a casa tua.
                            </motion.p>

                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 1, ease: "easeOut", delay: 0.6 }}
                                className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                            >
                                <Link
                                    to="/shop"
                                    className="inline-flex items-center gap-3 bg-fruit-500 hover:bg-fruit-600 text-white font-bold py-4 px-10 rounded-full text-lg transition-all hover:scale-105 shadow-xl hover:shadow-2xl"
                                >
                                    Inizia la Spesa
                                    <ArrowRight />
                                </Link>
                                <Link
                                    to="/about"
                                    className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white font-bold py-4 px-10 rounded-full text-lg transition-all border border-white/30"
                                >
                                    Chi Siamo
                                </Link>
                            </motion.div>
                        </div>

                        {/* Scroll Indicator */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1, duration: 1 }}
                            className="absolute bottom-10 left-1/2 transform -translate-x-1/2 text-white animate-bounce"
                        >
                            <div className="w-6 h-10 border-2 border-white rounded-full flex justify-center p-1">
                                <div className="w-1 h-3 bg-white rounded-full"></div>
                            </div>
                        </motion.div>
                    </section>

                    {/* Features */}
                    <section className="py-24 bg-nature-50 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-gray-900/5 to-transparent pointer-events-none"></div>
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="text-center mb-16">
                                <h2 className="font-script text-5xl text-nature-900 mb-4">Perché Sceglierci</h2>
                                <div className="w-24 h-1 bg-fruit-400 mx-auto rounded-full"></div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                <FeatureCard
                                    icon={<Leaf className="w-12 h-12 text-nature-600" />}
                                    title="Solo Stagionale"
                                    description="Selezioniamo solo il meglio che la natura offre in ogni periodo dell'anno."
                                    delay={0.1}
                                />
                                <FeatureCard
                                    icon={<Truck className="w-12 h-12 text-nature-600" />}
                                    title="Consegna Comoda"
                                    description="Scegli tu se ritirare in negozio o ricevere la spesa a domicilio."
                                    delay={0.3}
                                />
                                <FeatureCard
                                    icon={<CreditCard className="w-12 h-12 text-nature-600" />}
                                    title="Pagamento Sicuro"
                                    description="Paga comodamente in contanti alla consegna, senza stress."
                                    delay={0.5}
                                />
                            </div>
                        </div>
                    </section>

                    {/* About Preview */}
                    <section className="py-24 bg-white overflow-hidden">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center gap-16">
                            <motion.div
                                initial={{ opacity: 0, x: -50 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true, margin: "-100px" }}
                                transition={{ duration: 0.8 }}
                                className="md:w-1/2 relative"
                            >
                                <div className="absolute -top-4 -left-4 w-full h-full border-4 border-nature-200 rounded-2xl z-0 transform -rotate-2"></div>
                                <img
                                    src="https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=2574&auto=format&fit=crop"
                                    alt="Our Store"
                                    className="relative z-10 rounded-2xl shadow-2xl transform transition-transform hover:scale-[1.02] duration-500"
                                />
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, x: 50 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true, margin: "-100px" }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                                className="md:w-1/2 space-y-8"
                            >
                                <h2 className="font-script text-6xl text-nature-900 leading-tight">
                                    La Nostra <span className="text-fruit-500">Storia</span>
                                </h2>
                                <div className="space-y-6 text-lg text-gray-600 leading-relaxed font-light">
                                    <p>
                                        Da oltre trent'anni, <strong className="text-nature-800 font-bold">"{settings?.siteName || 'La nostra attività'}"</strong> è sinonimo di qualità e fiducia.
                                        Quello che è iniziato come un piccolo banco di frutta è oggi un punto di riferimento per chi cerca
                                        sapori autentici e genuini.
                                    </p>
                                    <p>
                                        Non vendiamo solo frutta e verdura; offriamo un'esperienza di gusto, consigliando
                                        i nostri clienti come farebbero dei vecchi amici.
                                    </p>
                                </div>
                                <Link to="/about" className="group inline-flex items-center gap-3 text-nature-700 font-bold text-lg hover:text-fruit-600 transition-colors">
                                    <span className="border-b-2 border-nature-200 group-hover:border-fruit-400 transition-colors">Scopri di più su di noi</span>
                                    <ArrowRight size={20} className="transform group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </motion.div>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
};

const FeatureCard = ({ icon, title, description, delay }: { icon: React.ReactNode, title: string, description: string, delay: number }) => (
    <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5, delay }}
        className="bg-white p-10 rounded-3xl shadow-xl hover:shadow-2xl transition-all border-b-8 border-nature-100 hover:border-fruit-400 group relative -top-0 hover:-top-2"
    >
        <div className="bg-nature-50 w-24 h-24 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-nature-100 transition-colors">
            <div className="transform group-hover:scale-110 transition-transform duration-300">
                {icon}
            </div>
        </div>
        <h3 className="font-serif text-3xl font-bold text-nature-900 mb-4 group-hover:text-fruit-600 transition-colors">{title}</h3>
        <p className="text-gray-500 leading-relaxed text-lg">{description}</p>
    </motion.div>
);
