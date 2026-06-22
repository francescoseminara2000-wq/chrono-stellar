import React, { useState, useEffect } from 'react';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { Truck, Store, LogIn, User, ShoppingBag, Scale, AlertTriangle, X as XIcon, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LocationPicker } from '../components/LocationPicker';
import { sanitizeImageUrl } from '../utils/imageUrl';
import { SearchableSelect } from '../components/admin/SearchableSelect';
import { motion, AnimatePresence } from 'framer-motion';

interface CheckoutFormData {
    name: string;
    email: string;
    phone: string;
    street: string;
    civic: string;
    city: string;
    zip: string;
    notes: string;
    latitude?: number;
    longitude?: number;
}

export const Checkout = () => {
    const { items, getEstimatedTotal, clearCart, updateQuantity, removeItem } = useCartStore();
    const { user } = useAuthStore();

    // Persisted states from localStorage
    const [step, setStep] = useState<number>(() => {
        const saved = localStorage.getItem('checkout_step');
        return saved ? parseInt(saved, 10) : 1;
    });

    const [deliveryMethod, setDeliveryMethod] = useState<'PICKUP' | 'DELIVERY'>(() => {
        const saved = localStorage.getItem('checkout_deliveryMethod');
        return (saved === 'PICKUP' || saved === 'DELIVERY') ? saved : 'PICKUP';
    });

    const [formData, setFormData] = useState<CheckoutFormData>(() => {
        const saved = localStorage.getItem('checkout_formData');
        if (saved) {
            try { return JSON.parse(saved); } catch {}
        }
        return {
            name: '',
            email: '',
            phone: '+39 ',
            street: '',
            civic: '',
            city: '',
            zip: '',
            notes: '',
            latitude: undefined,
            longitude: undefined
        };
    });

    const [selectedDate, setSelectedDate] = useState<string>(() => {
        return localStorage.getItem('checkout_selectedDate') || '';
    });

    const [deliveryZones, setDeliveryZones] = useState<any[]>([]);
    const [shippingCost, setShippingCost] = useState(0);
    const [submitted, setSubmitted] = useState(false);
    const [availableDates, setAvailableDates] = useState<Array<{ date: string; label: string }>>([]);

    // Save states to localStorage
    useEffect(() => {
        localStorage.setItem('checkout_step', step.toString());
    }, [step]);

    useEffect(() => {
        localStorage.setItem('checkout_deliveryMethod', deliveryMethod);
    }, [deliveryMethod]);

    useEffect(() => {
        localStorage.setItem('checkout_formData', JSON.stringify(formData));
    }, [formData]);

    useEffect(() => {
        localStorage.setItem('checkout_selectedDate', selectedDate);
    }, [selectedDate]);

    // Fetch available dates based on delivery method and selected city
    useEffect(() => {
        if (deliveryMethod === 'DELIVERY' && !formData.city) {
            setAvailableDates([]);
            setSelectedDate('');
            return;
        }

        const query = deliveryMethod === 'DELIVERY'
            ? `?method=DELIVERY&city=${encodeURIComponent(formData.city)}`
            : `?method=PICKUP`;

        fetch(`/api/logistics/available-dates${query}`)
            .then(res => {
                if (!res.ok) throw new Error();
                return res.json();
            })
            .then((dates: Array<{ date: string; label: string }>) => {
                setAvailableDates(dates);
                // Pre-select first date if current selection is empty or not in the list
                if (dates.length > 0) {
                    const isSelectedValid = dates.some(d => d.date === selectedDate);
                    if (!selectedDate || !isSelectedValid) {
                        setSelectedDate(dates[0].date);
                    }
                } else {
                    setSelectedDate('');
                }
            })
            .catch(err => {
                console.error('Error fetching available dates:', err);
                setAvailableDates([]);
                setSelectedDate('');
            });
    }, [deliveryMethod, formData.city]);

    // Fetch Delivery Zones
    useEffect(() => {
        fetch(`/api/delivery-zones`)
            .then(res => res.json())
            .then(data => setDeliveryZones(data))
            .catch(console.error);
    }, []);

    // Auto-fill form data when user logs in (only if draft is empty)
    useEffect(() => {
        if (user) {
            setFormData(prev => {
                const hasDraft = prev.name || prev.phone !== '+39 ';
                if (hasDraft) return prev;
                return {
                    ...prev,
                    name: user.name || '',
                    email: user.email || '',
                    phone: user.phone || '',
                    street: user.street || '',
                    civic: user.civic || '',
                    city: user.city || '',
                    zip: user.zipCode || '',
                    latitude: user.latitude || undefined,
                    longitude: user.longitude || undefined
                };
            });

            // Set shipping cost if city is populated
            if (user.city) {
                const zone = deliveryZones.find(z => z.city === user.city);
                if (zone) {
                    setShippingCost(zone.shippingCost);
                }
            }
        }
    }, [user, deliveryZones]);

    // Handle City Selection
    const handleCityChange = (selectedCity: string) => {
        const zone = deliveryZones.find(z => z.city === selectedCity);
        if (zone) {
            setFormData(prev => ({
                ...prev,
                city: zone.city,
                zip: zone.zipCode
            }));
            setShippingCost(zone.shippingCost);
        } else {
            setFormData(prev => ({ ...prev, city: selectedCity }));
            setShippingCost(0);
        }
    };

    // Reset shipping cost if Pickup
    useEffect(() => {
        if (deliveryMethod === 'PICKUP') {
            setShippingCost(0);
        } else {
            const zone = deliveryZones.find(z => z.city === formData.city);
            if (zone) setShippingCost(zone.shippingCost);
        }
    }, [deliveryMethod, formData.city, deliveryZones]);

    const total = getEstimatedTotal() + shippingCost;
    const isEstimated = items.some(i => i.isVariableWeight);

    // Stock issues found: { id, name, requested, available, unitType }
    const [stockIssues, setStockIssues] = useState<Array<{
        id: number; name: string;
        requested: number; available: number; unitType: string;
    }>>([]);
    const [showStockModal, setShowStockModal] = useState(false);
    const [validating, setValidating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const checkStock = async (): Promise<boolean> => {
        setValidating(true);
        try {
            const res = await fetch(`/api/products`);
            const available: any[] = await res.json();
            const issues: typeof stockIssues = [];

            for (const item of items) {
                const stock = available.find(p => p.id === item.id);
                if (!stock) {
                    issues.push({ id: item.id, name: item.name, requested: item.quantity, available: 0, unitType: item.unitType });
                } else if (!stock.allowBackorder && item.quantity > stock.stockQuantity) {
                    issues.push({ id: item.id, name: item.name, requested: item.quantity, available: stock.stockQuantity, unitType: item.unitType });
                }
            }
            setValidating(false);
            setStockIssues(issues);
            return issues.length === 0;
        } catch {
            setValidating(false);
            return true;
        }
    };

    const handleAutoFix = () => {
        for (const issue of stockIssues) {
            if (issue.available <= 0) {
                removeItem(issue.id);
            } else {
                updateQuantity(issue.id, issue.available);
            }
        }
        setStockIssues([]);
        setShowStockModal(false);
    };

    const [validationError, setValidationError] = useState('');

    const handleNextStep = () => {
        setValidationError('');
        if (step === 1) {
            if (deliveryMethod === 'DELIVERY') {
                if (!formData.city) {
                    setValidationError('Seleziona il comune di consegna.');
                    return;
                }
            }
            if (!selectedDate) {
                setValidationError('Seleziona la data per la consegna/ritiro.');
                return;
            }
        } else if (step === 2) {
            if (!formData.name.trim()) {
                setValidationError('Inserisci il tuo nome e cognome.');
                return;
            }
            if (!user && !formData.email.trim()) {
                setValidationError('Inserisci il tuo indirizzo email.');
                return;
            }
            if (!user && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
                setValidationError('Inserisci un indirizzo email valido.');
                return;
            }
            if (!formData.phone.trim() || formData.phone.trim() === '+39') {
                setValidationError('Inserisci il tuo numero di telefono.');
                return;
            }
        } else if (step === 3 && deliveryMethod === 'DELIVERY') {
            if (!formData.street.trim()) {
                setValidationError('Inserisci la via o piazza per la consegna.');
                return;
            }
            if (!formData.civic.trim()) {
                setValidationError('Inserisci il numero civico.');
                return;
            }
        }
        
        setStep(step + 1);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Prevent submit on enter key if we are not on the last step
        const totalSteps = deliveryMethod === 'DELIVERY' ? 4 : 3;
        if (step < totalSteps) {
            return;
        }

        setIsSubmitting(true);

        const isValid = await checkStock();
        if (!isValid) {
            setIsSubmitting(false);
            setShowStockModal(true);
            return;
        }

        const orderData = {
            userId: user?.id || null,
            customerName: user?.name || formData.name,
            customerEmail: user?.email || formData.email,
            items: items.map(i => ({ id: i.id, quantity: i.quantity, orderedUnit: i.unitType })),
            paymentMethod: 'COD',
            deliveryMethod,
            shippingAddress: deliveryMethod === 'DELIVERY'
                ? `${formData.street}, ${formData.civic} - ${formData.zip} ${formData.city}`
                : 'PICKUP',
            deliveryNotes: formData.notes,
            shippingCost: shippingCost,
            customerPhone: user?.phone || formData.phone,
            latitude: formData.latitude,
            longitude: formData.longitude,
            scheduledDate: selectedDate || null
        };

        try {
            const res = await fetch(`/api/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });

            if (res.ok) {
                // Keep the loading screen for a minimum of 1.5s for a premium feel
                await new Promise(resolve => setTimeout(resolve, 1500));
                setIsSubmitting(false);
                setSubmitted(true);
                clearCart();
                // Clear localStorage drafts
                localStorage.removeItem('checkout_step');
                localStorage.removeItem('checkout_deliveryMethod');
                localStorage.removeItem('checkout_formData');
                localStorage.removeItem('checkout_selectedDate');
            } else {
                setIsSubmitting(false);
                const errData = await res.json().catch(() => ({}));
                alert(errData.error || 'Errore durante l\'ordine');
            }
        } catch (err) {
            setIsSubmitting(false);
            console.error(err);
            alert('Errore di connessione');
        }
    };

    if (isSubmitting) {
        return (
            <div className="min-h-screen bg-nature-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white p-8 rounded-3xl shadow-xl max-w-md text-center flex flex-col items-center gap-6 border border-gray-100 animate-in fade-in duration-300"
                >
                    {/* Pulsing Loading Spinner & Icon */}
                    <div className="relative flex items-center justify-center w-24 h-24">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 border-4 border-nature-200 border-t-nature-600 rounded-full"
                        />
                        <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                            className="w-16 h-16 bg-nature-50 rounded-2xl flex items-center justify-center text-nature-600 shadow-inner"
                        >
                            <ShoppingBag size={32} />
                        </motion.div>
                    </div>

                    <div>
                        <h2 className="font-bold text-xl text-nature-900">Invio dell'ordine...</h2>
                        <p className="text-sm text-gray-500 mt-2">
                            Stiamo verificando la disponibilità dei prodotti e registrando il tuo ordine. Attendi qualche istante.
                        </p>
                    </div>

                    {/* Progress dots */}
                    <div className="flex gap-1.5 mt-2">
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                animate={{ y: [0, -5, 0] }}
                                transition={{
                                    duration: 0.6,
                                    repeat: Infinity,
                                    delay: i * 0.15,
                                    ease: "easeInOut"
                                }}
                                className="w-2.5 h-2.5 bg-nature-600 rounded-full"
                            />
                        ))}
                    </div>
                </motion.div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-nature-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-nature-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                    </div>
                    <h2 className="font-script text-4xl text-nature-900 mb-4">Grazie per il tuo ordine!</h2>
                    <p className="text-gray-600 mb-8">
                        Abbiamo ricevuto la tua richiesta. {deliveryMethod === 'DELIVERY' ? 'Ti consegneremo la spesa' : 'Ti aspettiamo in negozio'} il prima possibile.
                        {user && <br />}
                        {user && <span className="text-sm font-bold text-nature-600">Puoi seguire lo stato dell'ordine nel tuo profilo.</span>}
                    </p>
                    <a href="/shop" className="bg-nature-600 text-white px-8 py-3 rounded-full font-bold hover:bg-nature-700 transition-colors">
                        Torna allo Shop
                    </a>
                </div>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-20 text-center">
                <h2 className="text-2xl font-bold text-gray-400">Il carrello è vuoto</h2>
                <a href="/shop" className="text-nature-600 underline mt-4 inline-block">Torna a fare la spesa</a>
            </div>
        );
    }

    const steps = [
        { id: 1, label: 'Spedizione', desc: 'Metodo e Data' },
        { id: 2, label: 'Contatti', desc: 'I tuoi dati' }
    ];
    if (deliveryMethod === 'DELIVERY') {
        steps.push({ id: 3, label: 'Indirizzo', desc: 'Via e Mappa' });
    }
    const finalStepIndex = deliveryMethod === 'DELIVERY' ? 4 : 3;
    steps.push({ id: finalStepIndex, label: 'Conferma', desc: 'Riepilogo' });

    return (
        <>
            <div className="bg-gray-50 min-h-screen py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <h1 className="font-script text-3xl md:text-5xl text-nature-900 mb-8 text-center">Checkout</h1>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Form Wizard */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
                            
                            {/* Visual Progress Stepper */}
                            <div className="mb-8 border-b border-gray-100 pb-6">
                                <div className="flex flex-row justify-between items-center gap-2 overflow-x-auto py-1">
                                    {steps.map((s, idx) => {
                                        const isCompleted = s.id < step;
                                        const isActive = s.id === step;
                                        return (
                                            <React.Fragment key={s.id}>
                                                <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all duration-300 ${
                                                        isCompleted
                                                            ? 'bg-nature-600 border-nature-600 text-white shadow-sm'
                                                            : isActive
                                                                ? 'bg-white border-nature-600 text-nature-600 shadow-sm ring-4 ring-nature-50'
                                                                : 'bg-white border-gray-200 text-gray-400'
                                                    }`}>
                                                        {isCompleted ? '✓' : s.id}
                                                    </div>
                                                    <div className="text-left leading-tight hidden sm:block">
                                                        <span className={`block font-bold text-xs ${isActive || isCompleted ? 'text-nature-900' : 'text-gray-400'}`}>
                                                            {s.label}
                                                        </span>
                                                        <span className="text-[9px] text-gray-400 font-medium whitespace-nowrap">{s.desc}</span>
                                                    </div>
                                                </div>
                                                {idx < steps.length - 1 && (
                                                    <div className={`h-0.5 flex-1 min-w-[20px] max-w-[80px] rounded transition-colors duration-300 ${
                                                        s.id < step ? 'bg-nature-600' : 'bg-gray-200'
                                                    }`} />
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            </div>

                            {!user && step === 1 && (
                                <div className="mb-6 bg-blue-50 p-4 rounded-xl flex items-center justify-between">
                                    <span className="text-blue-800 text-sm">Hai già un account?</span>
                                    <Link to="/login" className="flex items-center gap-2 text-blue-600 font-bold text-sm hover:underline">
                                        <LogIn size={16} /> Accedi per velocizzare
                                    </Link>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between">
                                <div className="flex-1">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={step}
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            {/* STEP 1: CONSEGNA & DATA */}
                                            {step === 1 && (
                                                <div className="space-y-6">
                                                    <div>
                                                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-nature-900">
                                                            <Store size={20} className="text-nature-500" /> Scegli il Metodo di Consegna
                                                        </h3>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <button
                                                                type="button"
                                                                onClick={() => setDeliveryMethod('PICKUP')}
                                                                className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all duration-300 ${deliveryMethod === 'PICKUP' ? 'border-nature-500 bg-nature-50 text-nature-700 ring-2 ring-nature-500/10' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                                                            >
                                                                <Store size={36} />
                                                                <span className="font-bold text-base">Ritiro in Negozio</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setDeliveryMethod('DELIVERY')}
                                                                className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all duration-300 ${deliveryMethod === 'DELIVERY' ? 'border-nature-500 bg-nature-50 text-nature-700 ring-2 ring-nature-500/10' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                                                            >
                                                                <Truck size={36} />
                                                                <span className="font-bold text-base">Consegna a Casa</span>
                                                            </button>
                                                        </div>

                                                        {/* Delivery City selector */}
                                                        {deliveryMethod === 'DELIVERY' && (
                                                            <div className="mt-6 space-y-2">
                                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                                                                    Comune di Consegna
                                                                </label>
                                                                <SearchableSelect
                                                                     options={[
                                                                         { value: '', label: 'Seleziona Comune' },
                                                                         ...deliveryZones.map(zone => ({
                                                                             value: zone.city,
                                                                             label: `${zone.city} (+€${(zone.shippingCost / 100).toFixed(2)})`
                                                                         }))
                                                                     ]}
                                                                     value={formData.city}
                                                                     onChange={handleCityChange}
                                                                     placeholder="Seleziona Comune"
                                                                 />
                                                            </div>
                                                        )}

                                                        {/* Available Dates UI */}
                                                        <div className="mt-6 p-5 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                                                            {deliveryMethod === 'PICKUP' ? (
                                                                <div className="space-y-2">
                                                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none flex items-center gap-1.5">
                                                                        <Clock size={12} className="text-nature-600" /> Data di Ritiro Richiesta
                                                                    </label>
                                                                    {availableDates.length === 0 ? (
                                                                        <p className="text-sm text-red-500 font-bold">Nessun giorno di ritiro disponibile.</p>
                                                                    ) : (
                                                                        <SearchableSelect
                                                                            options={availableDates.map(d => ({ value: d.date, label: d.label }))}
                                                                            value={selectedDate}
                                                                            onChange={setSelectedDate}
                                                                            placeholder="Seleziona Data"
                                                                            className="mt-1"
                                                                        />
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div>
                                                                    {!formData.city ? (
                                                                        <p className="text-sm text-gray-500 font-medium text-center py-2">Seleziona un comune per visualizzare le date di consegna disponibili.</p>
                                                                    ) : (
                                                                        <div className="space-y-2">
                                                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none flex items-center gap-1.5">
                                                                                <Clock size={12} className="text-nature-600" /> Data di Consegna Richiesta
                                                                            </label>
                                                                            {availableDates.length === 0 ? (
                                                                                <p className="text-sm text-red-500 font-bold">Nessuna data di consegna disponibile per questo comune.</p>
                                                                            ) : (
                                                                                <SearchableSelect
                                                                                    options={availableDates.map(d => ({ value: d.date, label: d.label }))}
                                                                                    value={selectedDate}
                                                                                    onChange={setSelectedDate}
                                                                                    placeholder="Seleziona Data"
                                                                                    className="mt-1"
                                                                                />
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* STEP 2: DATI PERSONALI */}
                                            {step === 2 && (
                                                <div className="space-y-6">
                                                    <h3 className="font-bold text-lg text-nature-900 flex items-center gap-2">
                                                        <User size={20} className="text-nature-500" /> Informazioni di Contatto
                                                    </h3>

                                                    {user && (
                                                        <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                                                            <User size={16} className="text-nature-500" /> Loggato come <strong>{user.name}</strong> ({user.email})
                                                        </div>
                                                    )}

                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nome e Cognome</label>
                                                            <input
                                                                required
                                                                type="text"
                                                                placeholder="Mario Rossi"
                                                                className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500 outline-none transition-shadow"
                                                                value={formData.name}
                                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                            />
                                                        </div>

                                                        {!user && (
                                                            <div>
                                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Indirizzo Email</label>
                                                                <input
                                                                    required
                                                                    type="email"
                                                                    placeholder="mario.rossi@example.com"
                                                                    className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500 outline-none transition-shadow"
                                                                    value={formData.email}
                                                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                                />
                                                            </div>
                                                        )}

                                                        <div>
                                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Numero di Telefono</label>
                                                            <input
                                                                required
                                                                type="tel"
                                                                placeholder="+39 333 1234567"
                                                                className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500 outline-none transition-shadow"
                                                                value={formData.phone}
                                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* STEP 3: INDIRIZZO E MAPPA */}
                                            {step === 3 && deliveryMethod === 'DELIVERY' && (
                                                <div className="space-y-6">
                                                    <h3 className="font-bold text-lg text-nature-900 flex items-center gap-2">
                                                        <Truck size={20} className="text-nature-500" /> Indirizzo di Spedizione
                                                    </h3>

                                                    <div className="space-y-4">
                                                        <div className="grid grid-cols-3 gap-4">
                                                            <div className="col-span-2">
                                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Via / Piazza</label>
                                                                <input
                                                                    required
                                                                    type="text"
                                                                    placeholder="Via Roma"
                                                                    className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500 outline-none transition-shadow"
                                                                    value={formData.street}
                                                                    onChange={e => setFormData({ ...formData, street: e.target.value })}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Civico</label>
                                                                <input
                                                                    required
                                                                    type="text"
                                                                    placeholder="12"
                                                                    className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500 outline-none transition-shadow"
                                                                    value={formData.civic}
                                                                    onChange={e => setFormData({ ...formData, civic: e.target.value })}
                                                                />
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="grid grid-cols-3 gap-4">
                                                            <div>
                                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">CAP</label>
                                                                <input
                                                                    required
                                                                    type="text"
                                                                    className="w-full p-3.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed outline-none"
                                                                    readOnly
                                                                    value={formData.zip}
                                                                />
                                                            </div>
                                                            <div className="col-span-2">
                                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Comune</label>
                                                                <input
                                                                    required
                                                                    type="text"
                                                                    className="w-full p-3.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed outline-none"
                                                                    readOnly
                                                                    value={formData.city}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Location Picker in Checkout */}
                                                        <div className="pt-4 border-t border-gray-100">
                                                            <div className="flex items-center gap-3 mb-4">
                                                                <div className="w-10 h-10 bg-nature-100 text-nature-600 rounded-full flex items-center justify-center">
                                                                    <Truck size={20} />
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-bold text-gray-900 leading-none">Punto di Consegna Geocalizzato</h4>
                                                                    <p className="text-[11px] text-gray-400 mt-1">Trascina il segnaposto sulla mappa per la massima precisione.</p>
                                                                </div>
                                                            </div>

                                                            <LocationPicker
                                                                initialLat={formData.latitude}
                                                                initialLng={formData.longitude}
                                                                onLocationSelect={(lat, lng) => setFormData({ ...formData, latitude: lat, longitude: lng })}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* STEP 4 (Step 3 if PICKUP): NOTE & CONFERMA */}
                                            {((step === 4 && deliveryMethod === 'DELIVERY') || (step === 3 && deliveryMethod === 'PICKUP')) && (
                                                <div className="space-y-6">
                                                    <h3 className="font-bold text-lg text-nature-900 flex items-center gap-2">
                                                        <ShoppingBag size={20} className="text-nature-500" /> Riepilogo & Conferma Finale
                                                    </h3>

                                                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-3.5">
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-gray-500">Metodo di Consegna:</span>
                                                            <span className="font-bold text-nature-900">{deliveryMethod === 'DELIVERY' ? 'Consegna a domicilio' : 'Ritiro in negozio'}</span>
                                                        </div>
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-gray-500">Cliente:</span>
                                                            <span className="font-bold text-nature-900">{formData.name}</span>
                                                        </div>
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-gray-500">Telefono:</span>
                                                            <span className="font-bold text-nature-900">{formData.phone}</span>
                                                        </div>
                                                        {deliveryMethod === 'DELIVERY' && (
                                                            <div className="flex justify-between text-sm">
                                                                <span className="text-gray-500 shrink-0">Indirizzo:</span>
                                                                <span className="font-bold text-nature-900 text-right">{formData.street}, {formData.civic} - {formData.zip} {formData.city}</span>
                                                            </div>
                                                        )}
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-gray-500">Data Richiesta:</span>
                                                            <span className="font-bold text-nature-600">
                                                                {availableDates.find(d => d.date === selectedDate)?.label || selectedDate}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Note aggiuntive per l'ordine (opzionale)</label>
                                                        <textarea
                                                            placeholder="Note di orario, istruzioni specifiche di consegna, citofono o altro..."
                                                            rows={4}
                                                            className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500 outline-none transition-shadow resize-y text-sm"
                                                            value={formData.notes}
                                                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    </AnimatePresence>
                                </div>

                                {/* Validation Message Banner */}
                                {validationError && (
                                    <div className="mt-4 p-3.5 bg-red-50 text-red-600 text-sm font-semibold rounded-xl border border-red-100 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <AlertTriangle size={16} className="shrink-0" />
                                        <span>{validationError}</span>
                                    </div>
                                )}

                                {/* Navigation Action Bar */}
                                <div className="flex justify-between items-center gap-4 mt-8 pt-6 border-t border-gray-100">
                                    {step > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => { setValidationError(''); setStep(step - 1); }}
                                            className="px-6 py-3 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600 rounded-xl font-bold transition-colors select-none"
                                        >
                                            ← Indietro
                                        </button>
                                    )}
                                    
                                    {step < finalStepIndex ? (
                                        <button
                                            key="btn-next"
                                            type="button"
                                            onClick={handleNextStep}
                                            className="px-8 py-3 bg-nature-600 hover:bg-nature-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-colors ml-auto select-none"
                                        >
                                            Avanti →
                                        </button>
                                    ) : (
                                        <button
                                            key="btn-submit"
                                            type="submit"
                                            disabled={validating}
                                            className="px-10 py-3.5 bg-nature-600 hover:bg-nature-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-black rounded-xl shadow-lg hover:shadow-xl transition-all ml-auto text-base tracking-wide select-none active:scale-[0.98]"
                                        >
                                            {validating ? 'Verifica scorte...' : 'Conferma Ordine ✓'}
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>

                        {/* Order Sidebar Summary */}
                        <div className="bg-white p-6 rounded-3xl shadow-sm h-fit border border-gray-100">
                            <h3 className="font-script text-3xl text-nature-900 mb-6 pb-4 border-b border-gray-100">Il tuo Ordine</h3>

                            <div className="space-y-4 mb-6 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                {items.map(item => (
                                    <div key={item.id} className="flex gap-4 items-center p-1.5 rounded-xl">
                                        {/* Image */}
                                        <div className="w-14 h-14 rounded-xl bg-gray-50 overflow-hidden flex-shrink-0 border border-gray-100 flex items-center justify-center">
                                            {item.imageUrl ? (
                                                <img src={sanitizeImageUrl(item.imageUrl)} alt={item.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <ShoppingBag size={20} className="text-gray-300" />
                                            )}
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-nature-900 line-clamp-1 text-sm">{item.name}</h4>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {item.quantity} {item.unitType === 'PZ' ? 'pz' : item.unitType}
                                                {item.isVariableWeight && item.unitType === 'PZ' ? ` (circa ${(item.quantity * item.stepAmount).toFixed(1)} kg)` : ''} x € {(item.priceCents / 100).toFixed(2)}
                                            </p>
                                        </div>

                                        {/* Total Price */}
                                        <div className="font-bold text-nature-900 text-sm whitespace-nowrap">
                                            € {((item.priceCents * item.quantity * ((item.isVariableWeight && item.unitType === 'PZ') ? item.stepAmount : 1)) / 100).toFixed(2)}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-3 pt-4 border-t border-gray-100">
                                <div className="flex justify-between text-gray-600 text-sm">
                                    <span>Subtotale</span>
                                    <span>€ {(getEstimatedTotal() / 100).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600 text-sm">
                                    <span>Spedizione</span>
                                    <span className={shippingCost === 0 ? 'text-green-600 font-medium' : ''}>
                                        {shippingCost > 0 ? `€ ${(shippingCost / 100).toFixed(2)}` : 'Gratis'}
                                    </span>
                                </div>

                                <div className="flex justify-between font-bold text-2xl text-nature-900 pt-2">
                                    <span>Totale</span>
                                    <span>€ {(total / 100).toFixed(2)}</span>
                                </div>

                                {isEstimated && (
                                    <div className="bg-yellow-50 text-yellow-800 text-xs p-3.5 rounded-xl border border-yellow-100 flex gap-2 items-start mt-3">
                                        <Scale size={14} className="mt-0.5 flex-shrink-0" />
                                        <span>Il prezzo finale potrebbe variare leggermente dopo la pesatura dei prodotti freschi.</span>
                                    </div>
                                )}

                                <p className="text-xs text-gray-400 mt-4 text-center">
                                    Pagamento in contanti alla consegna o al ritiro
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stock Warning Modal */}
            {showStockModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        {/* Header */}
                        <div className="bg-amber-50 px-6 pt-6 pb-4 flex items-start gap-4">
                            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0">
                                <AlertTriangle size={24} className="text-amber-600" />
                            </div>
                            <div>
                                <h2 className="font-bold text-lg text-gray-900">Scorte insufficienti</h2>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    Alcuni articoli nel carrello superano la disponibilità attuale. Vuoi correggere automaticamente le quantità?
                                </p>
                            </div>
                            <button onClick={() => setShowStockModal(false)} className="ml-auto text-gray-400 hover:text-gray-600 shrink-0">
                                <XIcon size={20} />
                            </button>
                        </div>

                        {/* Issue list */}
                        <div className="px-6 py-4 space-y-3 max-h-64 overflow-y-auto">
                            {stockIssues.map(issue => {
                                const unit = issue.unitType === 'KG' ? 'kg' : issue.unitType === 'PZ' ? 'pz' : 'conf';
                                return (
                                    <div key={issue.id} className="flex items-center gap-3 bg-red-50 rounded-2xl px-4 py-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-gray-900 text-sm truncate">{issue.name}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                Richiesti: <span className="font-bold text-red-600">{issue.requested} {unit}</span>
                                                {' → '}
                                                {issue.available > 0
                                                    ? <span className="font-bold text-green-600">ridotto a {issue.available} {unit}</span>
                                                    : <span className="font-bold text-red-600">rimosso (esaurito)</span>
                                                }
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Actions */}
                        <div className="px-6 pb-6 flex gap-3">
                            <button
                                onClick={() => setShowStockModal(false)}
                                className="flex-1 py-3 rounded-2xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleAutoFix}
                                className="flex-1 py-3 rounded-2xl font-bold text-white bg-nature-600 hover:bg-nature-700 shadow-lg shadow-nature-200 transition-all active:scale-95"
                            >
                                ✓ Correggi Carrello
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
