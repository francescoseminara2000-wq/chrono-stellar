import React, { useState, useEffect } from 'react';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { Truck, Store, CreditCard, LogIn, User, ShoppingBag, Scale, AlertTriangle, X as XIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LocationPicker } from '../components/LocationPicker';
import { sanitizeImageUrl } from '../utils/imageUrl';

export const Checkout = () => {
    const { items, getEstimatedTotal, clearCart, updateQuantity, removeItem } = useCartStore();
    const { user } = useAuthStore();


    const [deliveryMethod, setDeliveryMethod] = useState<'PICKUP' | 'DELIVERY'>('PICKUP');
    const [deliveryZones, setDeliveryZones] = useState<any[]>([]);
    const [shippingCost, setShippingCost] = useState(0);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '+39 ',
        street: '',
        civic: '',
        city: '',
        zip: '',
        notes: '',
        latitude: undefined as number | undefined,
        longitude: undefined as number | undefined
    });
    const [submitted, setSubmitted] = useState(false);

    // Fetch Delivery Zones
    useEffect(() => {
        fetch(`/api/delivery-zones`)
            .then(res => res.json())
            .then(data => setDeliveryZones(data))
            .catch(console.error);
    }, []);

    // Auto-fill form data when user logs in
    useEffect(() => {
        if (user) {
            setFormData(prev => ({
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
            }));

            // Auto-set shipping cost if city is populated
            if (user.city) {
                // Wait for deliveryZones to load potentially, or filter immediately if loaded.
                const zone = deliveryZones.find(z => z.city === user.city);
                if (zone) {
                    setShippingCost(zone.shippingCost);
                }
            }
        }
    }, [user, deliveryZones]);

    // Handle City Selection
    const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedCity = e.target.value;
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
            // Re-apply shipping cost if city is selected
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const isValid = await checkStock();
        if (!isValid) { setShowStockModal(true); return; }

        // Simulate API call
        const orderData = {
            userId: user?.id || null,
            customerName: user?.name || formData.name,
            customerEmail: user?.email || formData.email,
            items: items.map(i => ({ id: i.id, quantity: i.quantity })),
            paymentMethod: 'COD',
            deliveryMethod,
            shippingAddress: deliveryMethod === 'DELIVERY'
                ? `${formData.street}, ${formData.civic} - ${formData.zip} ${formData.city}`
                : 'PICKUP',
            deliveryNotes: formData.notes,
            shippingCost: shippingCost,
            customerPhone: user?.phone || formData.phone,
            latitude: formData.latitude,
            longitude: formData.longitude
        };

        try {
            const res = await fetch(`/api/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });

            if (res.ok) {
                setSubmitted(true);
                clearCart();
            } else {
                const errData = await res.json().catch(() => ({}));
                alert(errData.error || 'Errore durante l\'ordine');
            }
        } catch (err) {
            console.error(err);
            alert('Errore di connessione');
        }
    };

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

    return (
        <>
            <div className="bg-gray-50 min-h-screen py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <h1 className="font-script text-3xl md:text-5xl text-nature-900 mb-8 text-center">Checkout</h1>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Form */}
                        <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm">

                            {!user && (
                                <div className="mb-8 bg-blue-50 p-4 rounded-xl flex items-center justify-between">
                                    <span className="text-blue-800 text-sm">Hai già un account?</span>
                                    <Link to="/login" className="flex items-center gap-2 text-blue-600 font-bold text-sm hover:underline">
                                        <LogIn size={16} /> Accedi per velocizzare
                                    </Link>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                        <CreditCard size={20} /> Metodo di Consegna
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setDeliveryMethod('PICKUP')}
                                            className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${deliveryMethod === 'PICKUP' ? 'border-nature-500 bg-nature-50 text-nature-700' : 'border-gray-200 text-gray-500'}`}
                                        >
                                            <Store size={32} />
                                            <span className="font-bold">Ritiro in Negozio</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDeliveryMethod('DELIVERY')}
                                            className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${deliveryMethod === 'DELIVERY' ? 'border-nature-500 bg-nature-50 text-nature-700' : 'border-gray-200 text-gray-500'}`}
                                        >
                                            <Truck size={32} />
                                            <span className="font-bold">Consegna a Casa</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="font-bold text-lg">I tuoi dati</h3>

                                    {user && (
                                        <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 p-2 rounded-lg mb-2">
                                            <User size={16} /> Loggato come <strong>{user.name}</strong> ({user.email})
                                        </div>
                                    )}

                                    <input
                                        required
                                        type="text"
                                        placeholder="Nome e Cognome"
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nature-500 outline-none"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />

                                    {!user && (
                                        <input
                                            required
                                            type="email"
                                            placeholder="Email"
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nature-500 outline-none"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    )}
                                    <input
                                        required
                                        type="tel"
                                        placeholder="Numero di Telefono"
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nature-500 outline-none"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}

                                    />

                                    {deliveryMethod === 'DELIVERY' && (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="col-span-2">
                                                    <input
                                                        required
                                                        type="text"
                                                        placeholder="Via / Piazza"
                                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nature-500 outline-none"
                                                        value={formData.street}
                                                        onChange={e => setFormData({ ...formData, street: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <input
                                                        required
                                                        type="text"
                                                        placeholder="Civico"
                                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nature-500 outline-none"
                                                        value={formData.civic}
                                                        onChange={e => setFormData({ ...formData, civic: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div>
                                                    <input
                                                        required
                                                        type="text"
                                                        placeholder="CAP"
                                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nature-500 outline-none bg-gray-100"
                                                        readOnly
                                                        value={formData.zip}
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <select
                                                        required
                                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nature-500 outline-none bg-white"
                                                        value={formData.city}
                                                        onChange={handleCityChange}
                                                    >
                                                        <option value="">Seleziona Comune</option>
                                                        {deliveryZones.map(zone => (
                                                            <option key={zone.id} value={zone.city}>
                                                                {zone.city} (+€{(zone.shippingCost / 100).toFixed(2)})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Location Picker in Checkout */}
                                            <div className="pt-6 border-t border-gray-100">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-10 h-10 bg-nature-100 text-nature-600 rounded-full flex items-center justify-center">
                                                        <Truck size={20} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-gray-900 leading-none">Punto di Consegna</h4>
                                                        <p className="text-xs text-gray-500 mt-1">Trascina il segnaposto o usa il cerca per precisione assoluta.</p>
                                                    </div>
                                                </div>

                                                <LocationPicker
                                                    initialLat={formData.latitude}
                                                    initialLng={formData.longitude}
                                                    onLocationSelect={(lat, lng) => setFormData({ ...formData, latitude: lat, longitude: lng })}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <textarea
                                        placeholder="Note aggiuntive (opzionale)"
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nature-500 outline-none"
                                        value={formData.notes}
                                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={validating}
                                    className="w-full bg-nature-600 hover:bg-nature-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 disabled:hover:translate-y-0 transition-all text-xl mt-4"
                                >
                                    {validating ? 'Verifica scorte...' : 'Conferma Ordine'}
                                </button>
                            </form>
                        </div>

                        {/* Application Summary */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm h-fit border border-gray-100">
                            <h3 className="font-script text-3xl text-nature-900 mb-6 pb-4 border-b border-gray-100">Il tuo Ordine</h3>

                            <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {items.map(item => (
                                    <div key={item.id} className="flex gap-4 items-center p-2 rounded-xl">
                                        {/* Image */}
                                        <div className="w-16 h-16 rounded-xl bg-gray-50 overflow-hidden flex-shrink-0 border border-gray-100 flex items-center justify-center">
                                            {item.imageUrl ? (
                                                <img src={sanitizeImageUrl(item.imageUrl)} alt={item.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <ShoppingBag size={24} className="text-gray-300" />
                                            )}
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-nature-900 line-clamp-1 text-sm">{item.name}</h4>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {item.quantity} {item.unitType === 'PZ' ? 'pz' : item.unitType} x € {(item.priceCents / 100).toFixed(2)}
                                            </p>
                                        </div>

                                        {/* Total Price */}
                                        <div className="font-bold text-nature-900 text-sm whitespace-nowrap">
                                            € {((item.priceCents * item.quantity) / 100).toFixed(2)}
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
                                    <div className="bg-yellow-50 text-yellow-800 text-xs p-3 rounded-xl border border-yellow-100 flex gap-2 items-start mt-2">
                                        <Scale size={14} className="mt-0.5 flex-shrink-0" />
                                        <span>Il prezzo finale potrebbe variare leggermente dopo la pesatura dei prodotti freschi.</span>
                                    </div>
                                )}

                                <p className="text-xs text-gray-400 mt-4 text-center">
                                    Pagamento in contanti alla consegna/ritiro
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
