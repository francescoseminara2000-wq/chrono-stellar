import React, { useState, useEffect } from 'react';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { useAppState } from '../store/useAppState';
import { Truck, Store, LogIn, User, ShoppingBag, Scale, AlertTriangle, X as XIcon, Clock, CreditCard, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { sanitizeImageUrl } from '../utils/imageUrl';
import { SearchableSelect } from '../components/admin/SearchableSelect';
import { motion } from 'framer-motion';

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
    const { settings } = useAppState();

    // Persisted states from localStorage

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

    const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>(() => {
        return localStorage.getItem('checkout_selectedTimeSlot') || '09:00 - 11:00';
    });

    const [registerUser, setRegisterUser] = useState<boolean>(() => {
        const saved = localStorage.getItem('checkout_registerUser');
        return saved === 'true';
    });

    const [changeAddress, setChangeAddress] = useState<boolean>(() => {
        const saved = localStorage.getItem('checkout_changeAddress');
        return saved === 'true';
    });

    const [paymentMethod, setPaymentMethod] = useState<'COD' | 'REVOLUT'>(() => {
        const saved = localStorage.getItem('checkout_paymentMethod');
        return (saved as any) || 'COD';
    });

    const [revolutCheckoutUrl, setRevolutCheckoutUrl] = useState<string | null>(null);
    const [lastOrderId, setLastOrderId] = useState<number | null>(null);
    const [simulatedSuccess, setSimulatedSuccess] = useState(false);
    const [showRevolutModal, setShowRevolutModal] = useState(false);
    const [isPayingRevolut, setIsPayingRevolut] = useState(false);

    const [deliveryZones, setDeliveryZones] = useState<any[]>([]);
    const [shippingCost, setShippingCost] = useState(0);
    const [submitted, setSubmitted] = useState(false);
    const [availableDates, setAvailableDates] = useState<Array<{ date: string; label: string }>>([]);

    // Save states to localStorage

    useEffect(() => {
        localStorage.setItem('checkout_paymentMethod', paymentMethod);
    }, [paymentMethod]);

    useEffect(() => {
        localStorage.setItem('checkout_deliveryMethod', deliveryMethod);
    }, [deliveryMethod]);

    useEffect(() => {
        localStorage.setItem('checkout_formData', JSON.stringify(formData));
    }, [formData]);

    useEffect(() => {
        localStorage.setItem('checkout_selectedDate', selectedDate);
    }, [selectedDate]);

    useEffect(() => {
        localStorage.setItem('checkout_selectedTimeSlot', selectedTimeSlot);
    }, [selectedTimeSlot]);

    useEffect(() => {
        localStorage.setItem('checkout_registerUser', registerUser.toString());
    }, [registerUser]);

    useEffect(() => {
        localStorage.setItem('checkout_changeAddress', changeAddress.toString());
    }, [changeAddress]);

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

    // Sync address fields with user profile if not overriding
    useEffect(() => {
        if (user && !changeAddress) {
            setFormData(prev => ({
                ...prev,
                street: user.street || '',
                civic: user.civic || '',
                city: user.city || '',
                zip: user.zipCode || '',
                latitude: user.latitude || undefined,
                longitude: user.longitude || undefined
            }));
        }
    }, [user, changeAddress]);

    // Automatically enable override if profile address is missing
    useEffect(() => {
        if (user && (!user.street || !user.city)) {
            setChangeAddress(true);
        }
    }, [user]);

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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationError, setValidationError] = useState('');

    const checkStock = async (): Promise<boolean> => {
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
            setStockIssues(issues);
            return issues.length === 0;
        } catch {
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError('');

        if (deliveryMethod === 'DELIVERY') {
            if (!formData.city) {
                setValidationError('Seleziona il comune di consegna.');
                return;
            }
            if (!formData.street.trim()) {
                setValidationError('Inserisci la via o piazza per la consegna.');
                return;
            }
        }
        if (!selectedDate) {
            setValidationError('Seleziona la data per la consegna o il ritiro.');
            return;
        }
        if (!formData.name.trim()) {
            setValidationError('Inserisci il tuo nome e cognome.');
            return;
        }
        if (!user && !formData.email.trim()) {
            setValidationError('Inserisci il tuo indirizzo email.');
            return;
        }
        if (!formData.phone.trim() || formData.phone.trim() === '+39') {
            setValidationError('Inserisci il tuo numero di telefono per i messaggi WhatsApp.');
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
            paymentMethod: paymentMethod,
            deliveryMethod,
            shippingAddress: deliveryMethod === 'DELIVERY'
                ? `${formData.street}, ${formData.civic} - ${formData.zip} ${formData.city}`
                : 'PICKUP',
            deliveryNotes: formData.notes,
            shippingCost: shippingCost,
            customerPhone: user?.phone || formData.phone,
            latitude: formData.latitude,
            longitude: formData.longitude,
            scheduledDate: selectedDate || null,
            scheduledTime: selectedTimeSlot || null,
            registerUser: !user && registerUser,
            street: formData.street,
            civic: formData.civic,
            city: formData.city,
            zipCode: formData.zip
        };

        try {
            const res = await fetch(`/api/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });

            if (res.ok) {
                const createdOrder = await res.json();
                if (createdOrder?.id) {
                    setLastOrderId(createdOrder.id);
                }
                const revolutUrl = createdOrder?.transaction?.metadata?.checkoutUrl;
                if (revolutUrl) {
                    setRevolutCheckoutUrl(revolutUrl);
                }

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
                localStorage.removeItem('checkout_selectedTimeSlot');
                localStorage.removeItem('checkout_registerUser');
                localStorage.removeItem('checkout_changeAddress');
                setRegisterUser(false);
                setChangeAddress(false);
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
                    <p className="text-gray-600 mb-6">
                        Abbiamo ricevuto la tua richiesta. {deliveryMethod === 'DELIVERY' ? 'Ti consegneremo la spesa' : 'Ti aspettiamo in negozio'} il prima possibile.
                        {user && <br />}
                        {user && <span className="text-sm font-bold text-nature-600">Puoi seguire lo stato dell'ordine nel tuo profilo.</span>}
                    </p>

                    {revolutCheckoutUrl && (
                        simulatedSuccess ? (
                            <div className="mb-6 p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2 animate-in fade-in duration-300">
                                <div className="font-extrabold text-emerald-800 text-sm flex items-center justify-center gap-2">
                                    <CheckCircle2 size={18} className="text-emerald-600" /> Pagamento Ricevuto con Successo!
                                </div>
                                <p className="text-xs text-emerald-700 font-medium">
                                    La transazione Revolut Pay è stata verificata e l'ordine è in preparazione.
                                </p>
                            </div>
                        ) : (
                            <div className="mb-6 p-5 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-3 text-left">
                                <div className="font-extrabold text-nature-900 text-sm flex items-center gap-2">
                                    <CreditCard size={18} className="text-nature-600" /> Completa il Pagamento Online
                                </div>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Clicca sul pulsante sottostante per aprire la finestra di pagamento sicuro **Revolut Pay Modal**:
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setShowRevolutModal(true)}
                                    className="inline-flex items-center justify-center gap-2 bg-nature-700 hover:bg-nature-800 text-white px-6 py-3.5 rounded-xl font-extrabold text-sm shadow-md transition-all w-full cursor-pointer active:scale-[0.98]"
                                >
                                    💳 Apri Finestra di Pagamento Revolut
                                </button>
                            </div>
                        )
                    )}

                    {/* Revolut Pay Popup Modal Overlay */}
                    {showRevolutModal && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                            <div className="bg-white max-w-md w-full rounded-3xl shadow-2xl overflow-hidden border border-nature-100 animate-in zoom-in-95 duration-200">
                                {/* Modal Header */}
                                <div className="bg-nature-900 text-white p-5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-2xl bg-emerald-500 text-nature-950 font-black text-sm flex items-center justify-center shadow-md">R</div>
                                        <div>
                                            <h3 className="font-extrabold text-sm text-white leading-tight">Revolut Pay Checkout</h3>
                                            <p className="text-[10px] text-nature-300">Ortofrutta Butti • Pagamento Sicuro SSL</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowRevolutModal(false)}
                                        className="w-8 h-8 rounded-full bg-nature-800 hover:bg-nature-700 text-nature-200 flex items-center justify-center transition-colors cursor-pointer"
                                    >
                                        <XIcon size={16} />
                                    </button>
                                </div>

                                {/* Modal Body */}
                                <div className="p-6 space-y-5">
                                    <div className="bg-nature-50/70 p-4 rounded-2xl border border-nature-200/70 flex items-center justify-between">
                                        <span className="text-xs font-bold text-gray-600">Importo Ordine</span>
                                        <span className="text-lg font-black text-nature-900">€ {(getEstimatedTotal() / 100 + shippingCost).toFixed(2)}</span>
                                    </div>

                                    {/* Revolut 1-Click Option */}
                                    <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-xl bg-nature-900 text-white font-black text-xs flex items-center justify-center">R</div>
                                                <span className="font-extrabold text-xs text-nature-900">Paga con App Revolut</span>
                                            </div>
                                            <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full font-bold">1-Click</span>
                                        </div>
                                        <p className="text-[11px] text-gray-600 leading-snug">
                                            Autorizza l'addebito istantaneo dall'applicazione Revolut sul tuo smartphone.
                                        </p>
                                    </div>

                                    <div className="text-center text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">— Oppure Carta di Credito / Debito —</div>

                                    {/* Credit Card Input Mock */}
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Numero Carta di Credito</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value="4532 •••• •••• 8892"
                                                    className="w-full bg-gray-50 text-nature-900 font-mono text-xs px-3.5 py-3 rounded-xl border border-gray-200 outline-none shadow-inner"
                                                />
                                                <span className="absolute right-3.5 top-3 text-xs font-black text-nature-700">VISA</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-700 mb-1">Scadenza</label>
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value="12 / 28"
                                                    className="w-full bg-gray-50 text-nature-900 font-mono text-xs px-3.5 py-3 rounded-xl border border-gray-200 outline-none shadow-inner"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-700 mb-1">CVC / CVV</label>
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value="•••"
                                                    className="w-full bg-gray-50 text-nature-900 font-mono text-xs px-3.5 py-3 rounded-xl border border-gray-200 outline-none shadow-inner"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <button
                                        type="button"
                                        disabled={isPayingRevolut}
                                        onClick={async () => {
                                            setIsPayingRevolut(true);
                                            await new Promise(r => setTimeout(r, 1200));
                                            if (lastOrderId) {
                                                await fetch('/api/revolut/simulate', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ orderId: lastOrderId })
                                                });
                                                setSimulatedSuccess(true);
                                            }
                                            setIsPayingRevolut(false);
                                            setShowRevolutModal(false);
                                        }}
                                        className="w-full bg-nature-700 hover:bg-nature-800 text-white font-extrabold py-3.5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                                    >
                                        {isPayingRevolut ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                Conferma Pagamento in corso...
                                            </>
                                        ) : (
                                            <>
                                                🔒 Conferma e Paga Ordine
                                            </>
                                        )}
                                    </button>

                                    <p className="text-[10px] text-gray-400 text-center font-medium">
                                        Transazione crittografata gestita da Revolut Merchant API
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <a href="/shop" className="bg-nature-600 text-white px-8 py-3 rounded-full font-bold hover:bg-nature-700 transition-colors inline-block mt-2">
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

    return (
        <>
            <div className="bg-gradient-to-br from-nature-50 via-gray-50 to-emerald-50/30 min-h-screen py-6 md:py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <span className="text-emerald-700 font-mono text-xs font-black uppercase tracking-widest block mb-1">Cassa Veloce</span>
                        <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight">Checkout Ordine</h1>
                        <p className="text-gray-500 text-xs md:text-sm mt-1">Verifica i dati e conferma la spesa con un click</p>
                    </div>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                        {/* Main Checkout Section (2 Columns width on Desktop) */}
                        <div className="lg:col-span-2 space-y-6">
                            
                            {/* SECTION 1: Metodo di Ricezione & Data/Fascia Oraria */}
                            <div className="bg-white p-5 md:p-7 rounded-3xl shadow-md border border-gray-100 space-y-5">
                                <h3 className="font-black text-lg md:text-xl text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                                    <Store size={22} className="text-emerald-600" /> 1. Metodo di Ricezione & Data
                                </h3>

                                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setDeliveryMethod('PICKUP')}
                                        className={`p-4 md:p-5 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all cursor-pointer ${
                                            deliveryMethod === 'PICKUP'
                                                ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 shadow-sm ring-2 ring-emerald-600/20 font-black'
                                                : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                                        }`}
                                    >
                                        <Store className="w-8 h-8" />
                                        <span className="font-black text-sm md:text-base">Ritiro in Negozio</span>
                                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-md">GRATIS</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setDeliveryMethod('DELIVERY')}
                                        className={`p-4 md:p-5 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all cursor-pointer ${
                                            deliveryMethod === 'DELIVERY'
                                                ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 shadow-sm ring-2 ring-emerald-600/20 font-black'
                                                : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                                        }`}
                                    >
                                        <Truck className="w-8 h-8" />
                                        <span className="font-black text-sm md:text-base">Consegna a Domicilio</span>
                                        <span className="text-[10px] text-gray-500 font-bold">A casa tua</span>
                                    </button>
                                </div>

                                {/* Select City (If Delivery) */}
                                {deliveryMethod === 'DELIVERY' && (
                                    <div className="space-y-2 pt-2">
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Comune di Consegna *</label>
                                        {user && !changeAddress ? (
                                            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-900 font-bold flex items-center justify-between">
                                                <span>📍 {formData.city || 'Nessun comune registrato'}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setChangeAddress(true)}
                                                    className="text-xs text-emerald-700 font-black hover:underline cursor-pointer"
                                                >
                                                    Cambia
                                                </button>
                                            </div>
                                        ) : (
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
                                        )}
                                    </div>
                                )}

                                {/* Date & Time Slot Selection */}
                                <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100 space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <Clock size={14} className="text-emerald-600" /> Data Richiesta per il {deliveryMethod === 'DELIVERY' ? 'Consegna' : 'Ritiro'} *
                                        </label>
                                        {availableDates.length === 0 ? (
                                            <p className="text-xs text-amber-700 font-bold bg-amber-50 p-3 rounded-xl">
                                                {deliveryMethod === 'DELIVERY' && !formData.city ? 'Seleziona un comune per vedere le date disponibili.' : 'Nessuna data disponibile.'}
                                            </p>
                                        ) : (
                                            <SearchableSelect
                                                options={availableDates.map(d => ({ value: d.date, label: d.label }))}
                                                value={selectedDate}
                                                onChange={setSelectedDate}
                                                placeholder="Seleziona Data"
                                            />
                                        )}
                                    </div>

                                    {selectedDate && availableDates.length > 0 && (
                                        <div className="pt-3 border-t border-gray-200/70 space-y-2">
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                                                <Clock size={14} className="text-emerald-600" /> Fascia Oraria *
                                            </label>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                {(settings?.deliveryTimeSlots || '09:00 - 11:00, 11:00 - 13:00, 15:00 - 17:00, 17:00 - 19:00')
                                                    .split(',')
                                                    .map(s => s.trim())
                                                    .filter(Boolean)
                                                    .map(slot => (
                                                        <button
                                                            key={slot}
                                                            type="button"
                                                            onClick={() => setSelectedTimeSlot(slot)}
                                                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-1.5 ${
                                                                selectedTimeSlot === slot
                                                                    ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm font-black'
                                                                    : 'bg-white text-gray-800 border-gray-200 hover:border-emerald-300 font-bold'
                                                            }`}
                                                        >
                                                            <span className="text-xs">{slot}</span>
                                                            <Clock size={12} className={selectedTimeSlot === slot ? 'text-emerald-300' : 'text-gray-400'} />
                                                        </button>
                                                    ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* SECTION 2: Dati Cliente & Indirizzo */}
                            <div className="bg-white p-5 md:p-7 rounded-3xl shadow-md border border-gray-100 space-y-4">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                    <h3 className="font-black text-lg md:text-xl text-gray-900 flex items-center gap-2">
                                        <User size={22} className="text-emerald-600" /> 2. Dati Cliente & Indirizzo
                                    </h3>
                                    {!user && (
                                        <Link to="/login" className="text-xs text-emerald-700 font-black flex items-center gap-1 hover:underline">
                                            <LogIn size={14} /> Accedi
                                        </Link>
                                    )}
                                </div>

                                {user && !changeAddress ? (
                                    <div className="bg-emerald-50/60 border border-emerald-200/80 p-4 rounded-2xl space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
                                                    {user.name ? user.name[0].toUpperCase() : 'U'}
                                                </div>
                                                <div>
                                                    <span className="font-black text-gray-900 text-sm block">{user.name}</span>
                                                    <span className="text-xs text-gray-500">{user.email} • {user.phone || formData.phone}</span>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setChangeAddress(true)}
                                                className="text-xs bg-white text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-xl font-bold hover:bg-emerald-100 transition-all cursor-pointer"
                                            >
                                                Modifica Dati
                                            </button>
                                        </div>

                                        {deliveryMethod === 'DELIVERY' && (
                                            <div className="pt-2 border-t border-emerald-200/60 text-xs font-bold text-gray-700">
                                                <span>🏠 Indirizzo: </span>
                                                <span>{formData.street} {formData.civic}, {formData.zip} {formData.city}</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Nome e Cognome *</label>
                                                <input
                                                    required
                                                    type="text"
                                                    placeholder="Mario Rossi"
                                                    className="w-full p-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-bold text-gray-900"
                                                    value={formData.name}
                                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Cellulare / WhatsApp *</label>
                                                <input
                                                    required
                                                    type="tel"
                                                    placeholder="+39 340 0000000"
                                                    className="w-full p-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-bold text-gray-900"
                                                    value={formData.phone}
                                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        {!user && (
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Indirizzo Email *</label>
                                                <input
                                                    required
                                                    type="email"
                                                    placeholder="mario@example.com"
                                                    className="w-full p-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-bold text-gray-900"
                                                    value={formData.email}
                                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                />
                                            </div>
                                        )}

                                        {deliveryMethod === 'DELIVERY' && (
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="col-span-2">
                                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Via / Piazza *</label>
                                                    <input
                                                        required
                                                        type="text"
                                                        placeholder="Via Roma"
                                                        className="w-full p-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-bold text-gray-900"
                                                        value={formData.street}
                                                        onChange={e => setFormData({ ...formData, street: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Civico</label>
                                                    <input
                                                        type="text"
                                                        placeholder="15"
                                                        className="w-full p-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-bold text-gray-900"
                                                        value={formData.civic}
                                                        onChange={e => setFormData({ ...formData, civic: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* SECTION 3: Metodo di Pagamento & Note */}
                            <div className="bg-white p-5 md:p-7 rounded-3xl shadow-md border border-gray-100 space-y-4">
                                <h3 className="font-black text-lg md:text-xl text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                                    <CreditCard size={22} className="text-emerald-600" /> 3. Metodo di Pagamento
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('COD')}
                                        className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-3 ${
                                            paymentMethod === 'COD'
                                                ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 shadow-sm ring-2 ring-emerald-600/20 font-black'
                                                : 'border-gray-200 bg-white hover:border-gray-300'
                                        }`}
                                    >
                                        <span className="text-2xl">💵</span>
                                        <div>
                                            <div className="font-black text-sm">Contanti / POS</div>
                                            <div className="text-[11px] text-gray-500">Alla consegna o al ritiro bancario</div>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('REVOLUT')}
                                        className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-3 ${
                                            paymentMethod === 'REVOLUT'
                                                ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 shadow-sm ring-2 ring-indigo-600/20 font-black'
                                                : 'border-gray-200 bg-white hover:border-gray-300'
                                        }`}
                                    >
                                        <span className="text-2xl">💳</span>
                                        <div>
                                            <div className="font-black text-sm">Revolut Pay / Carta</div>
                                            <div className="text-[11px] text-gray-500">Pagamento digitale sicuro online</div>
                                        </div>
                                    </button>
                                </div>

                                <div className="pt-2">
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Note aggiuntive (Opzionale)</label>
                                    <textarea
                                        placeholder="Note di consegna, citofono o istruzioni speciali per il corriere..."
                                        rows={2}
                                        className="w-full p-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-xs sm:text-sm font-bold text-gray-900"
                                        value={formData.notes}
                                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    />
                                </div>
                                <div className="pt-3">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-2xl shadow-xl shadow-emerald-600/20 text-base md:text-lg tracking-wide transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? 'Invio Ordine in corso...' : `🛒 Conferma e Invia Ordine • € ${(total / 100).toFixed(2)}`}
                                    </button>
                                </div>

                                {validationError && (
                                    <div className="p-4 bg-red-50 text-red-700 text-xs sm:text-sm font-bold rounded-2xl border border-red-200 flex items-center gap-2 animate-in fade-in duration-200">
                                        <AlertTriangle size={18} className="shrink-0" />
                                        <span>{validationError}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Order Sidebar Summary (Sticky 1 Column on Desktop) */}
                        <div className="lg:col-span-1">
                                <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 sticky top-24 space-y-6">
                                    <h3 className="font-black text-xl text-gray-900 pb-3 border-b border-gray-100 flex items-center gap-2">
                                        <ShoppingBag size={20} className="text-emerald-600" /> Il tuo Ordine ({items.length})
                                    </h3>

                                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
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

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-2xl shadow-xl shadow-emerald-600/20 text-base transition-all active:scale-[0.98] cursor-pointer mt-4"
                                >
                                    {isSubmitting ? 'Invio Ordine...' : `Conferma Ordine • € ${(total / 100).toFixed(2)}`}
                                </button>

                            </div>
                        </div>
                    </div>
                </form>
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
