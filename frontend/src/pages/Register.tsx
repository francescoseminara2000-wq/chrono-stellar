import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, Lock, Phone, MapPin, Building, Eye, EyeOff, CheckCircle2, ArrowRight, ArrowLeft, ShieldCheck, Sparkles, Check, Bell } from 'lucide-react';
import { sanitizeImageUrl } from '../utils/imageUrl';

const AVATAR_OPTIONS = [
    { id: 'apple', label: 'Mela', icon: '🍎' },
    { id: 'orange', label: 'Arancia', icon: '🍊' },
    { id: 'avocado', label: 'Avocado', icon: '🥑' },
    { id: 'carrot', label: 'Carota', icon: '🥕' },
    { id: 'strawberry', label: 'Fragola', icon: '🍓' },
    { id: 'lemon', label: 'Limone', icon: '🍋' },
    { id: 'peach', label: 'Pesca', icon: '🍑' },
    { id: 'grapes', label: 'Uva', icon: '🍇' },
    { id: 'cherries', label: 'Ciliegie', icon: '🍒' },
];

export const Register = () => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '+39 ',
        password: '',
        confirmPassword: '',
        street: '',
        civic: '',
        city: 'Valmadrera',
        zipCode: '23868',
        avatar: '🍎',
        notificationPreference: 'WHATSAPP',
        acceptTerms: true
    });

    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const [serverAvatars, setServerAvatars] = useState<string[]>([]);

    useEffect(() => {
        fetch('/api/avatars')
            .then(res => res.ok ? res.json() : [])
            .then(data => setServerAvatars(data))
            .catch(() => {});
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const isPasswordLengthOk = formData.password.length >= 8;
    const hasNumber = /\d/.test(formData.password);
    const passwordsMatch = formData.password.length > 0 && formData.password === formData.confirmPassword;

    const validateStep1 = () => {
        setError('');
        if (!formData.name.trim()) return setError('Inserisci il tuo nome e cognome.');
        if (!formData.email.trim() || !formData.email.includes('@')) return setError('Inserisci un indirizzo email valido.');
        if (!formData.phone.trim() || formData.phone.length < 8) return setError('Inserisci un numero di cellulare valido per WhatsApp.');
        if (!isPasswordLengthOk) return setError('La password deve contenere almeno 8 caratteri.');
        if (!passwordsMatch) return setError('Le password inserite non coincidono.');
        setStep(2);
    };

    const validateStep2 = () => {
        setError('');
        if (!formData.street.trim()) return setError('Inserisci l\'indirizzo di via/piazza.');
        if (!formData.city.trim()) return setError('Inserisci il comune.');
        setStep(3);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const res = await fetch(`/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    phone: formData.phone,
                    street: formData.street,
                    civic: formData.civic,
                    city: formData.city,
                    zipCode: formData.zipCode,
                    avatar: formData.avatar,
                    notificationPreference: formData.notificationPreference
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Errore durante la registrazione.');
            }

            setSuccessMessage(data.message || 'Registrazione completata con successo! Abbiamo inviato un\'email di conferma al tuo indirizzo.');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (successMessage) {
        return (
            <div className="min-h-screen bg-nature-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-2xl w-full max-w-lg text-center border border-emerald-100 animate-in zoom-in-95 duration-300">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Account Creato! 🎉</h2>
                    <p className="text-gray-600 text-sm leading-relaxed mb-8">{successMessage}</p>
                    <Link to="/login" className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 text-white font-black py-4 px-8 rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-98">
                        Accedi Ora <ArrowRight size={18} />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-nature-50 via-gray-50 to-emerald-50/40 flex items-center justify-center p-4 sm:p-6 py-12">
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-xl overflow-hidden relative">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-emerald-800 via-nature-900 to-emerald-950 p-6 sm:p-8 text-white relative">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-emerald-400 font-mono text-xs font-bold uppercase tracking-widest block mb-1">Passo {step} di 3</span>
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Crea il tuo Account</h1>
                            <p className="text-nature-200 text-xs sm:text-sm mt-1">Registrati per ordinare velocemente e tracciare la spesa pesata</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-emerald-400 font-bold border border-white/10 shrink-0">
                            <Sparkles size={24} />
                        </div>
                    </div>

                    {/* Stepper Indicator */}
                    <div className="flex gap-2 mt-6">
                        {[1, 2, 3].map((s) => (
                            <div
                                key={s}
                                className={`h-2 flex-1 rounded-full transition-all duration-500 ${
                                    s <= step ? 'bg-emerald-400 shadow-xs' : 'bg-white/20'
                                }`}
                            />
                        ))}
                    </div>
                </div>

                <div className="p-6 sm:p-8">
                    {error && (
                        <div className="bg-red-50 text-red-700 p-4 rounded-2xl mb-6 text-xs sm:text-sm font-bold border border-red-200 flex items-center gap-3 animate-in fade-in duration-200">
                            <span className="text-lg">⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* STEP 1: Personal Details & Security */}
                    {step === 1 && (
                        <div className="space-y-5 animate-in fade-in duration-300">
                            <h3 className="font-black text-gray-900 text-lg flex items-center gap-2 border-b border-gray-100 pb-3">
                                <User size={20} className="text-emerald-600" /> Credenziali e Contatti
                            </h3>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Nome e Cognome *</label>
                                <div className="relative">
                                    <User className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        name="name"
                                        required
                                        placeholder="Mario Rossi"
                                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-bold text-gray-900 transition-all"
                                        value={formData.name}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Email *</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                                        <input
                                            type="email"
                                            name="email"
                                            required
                                            placeholder="mario@example.com"
                                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-bold text-gray-900 transition-all"
                                            value={formData.email}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Cellulare / WhatsApp *</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                                        <input
                                            type="tel"
                                            name="phone"
                                            required
                                            placeholder="+39 340 0000000"
                                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-bold text-gray-900 transition-all"
                                            value={formData.phone}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Passwords with Eye Visibility Toggle */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Password *</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            required
                                            placeholder="••••••••"
                                            className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-bold text-gray-900 transition-all"
                                            value={formData.password}
                                            onChange={handleChange}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Conferma Password *</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            name="confirmPassword"
                                            required
                                            placeholder="••••••••"
                                            className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-bold text-gray-900 transition-all"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Password Validation Indicators */}
                            <div className="bg-gray-50 p-3 rounded-xl space-y-1 text-xs">
                                <div className="flex items-center gap-2 font-bold">
                                    <span className={isPasswordLengthOk ? 'text-emerald-600' : 'text-gray-400'}>
                                        {isPasswordLengthOk ? '✓' : '○'} Almeno 8 caratteri
                                    </span>
                                    <span className={hasNumber ? 'text-emerald-600 ml-3' : 'text-gray-400 ml-3'}>
                                        {hasNumber ? '✓' : '○'} Almeno 1 numero
                                    </span>
                                </div>
                                {formData.confirmPassword.length > 0 && (
                                    <div className={`font-bold ${passwordsMatch ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {passwordsMatch ? '✓ Le password coincidono' : '✗ Le password non coincidono'}
                                    </div>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={validateStep1}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98 mt-4"
                            >
                                Continua (Indirizzo) <ArrowRight size={18} />
                            </button>
                        </div>
                    )}

                    {/* STEP 2: Pre-filled Delivery Address & Preferences */}
                    {step === 2 && (
                        <div className="space-y-5 animate-in fade-in duration-300">
                            <h3 className="font-black text-gray-900 text-lg flex items-center gap-2 border-b border-gray-100 pb-3">
                                <MapPin size={20} className="text-emerald-600" /> Indirizzo di Consegna Preferito
                            </h3>
                            <p className="text-xs text-gray-500">I tuoi futuri ordini verranno precompilati in 1-click senza dover digitare nulla alla cassa!</p>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Via / Piazza *</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            name="street"
                                            required
                                            placeholder="Via Roma"
                                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-bold text-gray-900 transition-all"
                                            value={formData.street}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Civico</label>
                                    <input
                                        type="text"
                                        name="civic"
                                        placeholder="15/B"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-bold text-gray-900 transition-all"
                                        value={formData.civic}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Comune *</label>
                                    <div className="relative">
                                        <Building className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            name="city"
                                            required
                                            placeholder="Valmadrera"
                                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-bold text-gray-900 transition-all"
                                            value={formData.city}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">CAP</label>
                                    <input
                                        type="text"
                                        name="zipCode"
                                        placeholder="23868"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-bold text-gray-900 transition-all"
                                        value={formData.zipCode}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            {/* WhatsApp Notification Preference */}
                            <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/80 space-y-2">
                                <label className="block text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                                    <Bell size={16} className="text-emerald-700" /> Notifiche Ordini & Pesatura
                                </label>
                                <p className="text-xs text-emerald-900/90 leading-relaxed">Come desideri ricevere l'aggiornamento pesatura ed il tracciamento della tua spesa?</p>
                                <div className="flex items-center gap-4 pt-1">
                                    <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-gray-800">
                                        <input
                                            type="radio"
                                            name="notificationPreference"
                                            value="WHATSAPP"
                                            checked={formData.notificationPreference === 'WHATSAPP'}
                                            onChange={handleChange}
                                            className="text-emerald-600 focus:ring-emerald-500"
                                        />
                                        💬 WhatsApp & Email (Consigliato)
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-600">
                                        <input
                                            type="radio"
                                            name="notificationPreference"
                                            value="EMAIL"
                                            checked={formData.notificationPreference === 'EMAIL'}
                                            onChange={handleChange}
                                            className="text-emerald-600 focus:ring-emerald-500"
                                        />
                                        ✉️ Solo Email
                                    </label>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="py-4 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <ArrowLeft size={18} /> Indietro
                                </button>
                                <button
                                    type="button"
                                    onClick={validateStep2}
                                    className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                                >
                                    Scegli Avatar <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Choose Avatar & Complete */}
                    {step === 3 && (
                        <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-300">
                            <h3 className="font-black text-gray-900 text-lg flex items-center gap-2 border-b border-gray-100 pb-3">
                                <Sparkles size={20} className="text-emerald-600" /> Scegli il tuo Avatar Profilo
                            </h3>
                            <p className="text-xs text-gray-500">Seleziona un'icona simpatica per personalizzare il tuo account e la tua spesa!</p>

                            {/* Avatar Grid */}
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                                {AVATAR_OPTIONS.map((av) => (
                                    <button
                                        key={av.id}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, avatar: av.icon })}
                                        className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer relative ${
                                            formData.avatar === av.icon
                                                ? 'border-emerald-600 bg-emerald-50 scale-105 shadow-md ring-2 ring-emerald-600/20'
                                                : 'border-gray-200/80 bg-white hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        <span className="text-3xl">{av.icon}</span>
                                        <span className="text-[10px] font-bold text-gray-700">{av.label}</span>
                                        {formData.avatar === av.icon && (
                                            <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-emerald-600 text-white rounded-full flex items-center justify-center">
                                                <Check size={10} />
                                            </div>
                                        )}
                                    </button>
                                ))}

                                {serverAvatars.map((avPath) => (
                                    <button
                                        key={avPath}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, avatar: avPath })}
                                        className={`p-2 rounded-2xl border-2 transition-all flex items-center justify-center cursor-pointer relative overflow-hidden h-20 ${
                                            formData.avatar === avPath
                                                ? 'border-emerald-600 bg-emerald-50 scale-105 shadow-md'
                                                : 'border-gray-200/80 bg-white hover:border-gray-300'
                                        }`}
                                    >
                                        <img src={sanitizeImageUrl(avPath)} alt="Avatar" className="w-full h-full object-cover rounded-xl" />
                                    </button>
                                ))}
                            </div>

                            {/* Terms Checkbox */}
                            <div className="pt-2 border-t border-gray-100">
                                <label className="flex items-start gap-3 cursor-pointer text-xs font-bold text-gray-600">
                                    <input
                                        type="checkbox"
                                        checked={formData.acceptTerms}
                                        onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
                                        className="mt-0.5 text-emerald-600 rounded focus:ring-emerald-500"
                                    />
                                    <span>Accetto i termini di servizio e le condizioni per la consegna ed il tracciamento della spesa.</span>
                                </label>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    className="py-4 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <ArrowLeft size={18} /> Indietro
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !formData.acceptTerms}
                                    className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-2xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98 text-base"
                                >
                                    {isSubmitting ? (
                                        <span className="flex items-center gap-2">
                                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                            Creazione Account...
                                        </span>
                                    ) : (
                                        <>
                                            Completa Registrazione <ShieldCheck size={20} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Footer Login Link */}
                    <div className="mt-8 text-center pt-4 border-t border-gray-100">
                        <p className="text-xs text-gray-500 font-bold">
                            Hai già un account?{' '}
                            <Link to="/login" className="text-emerald-700 font-black hover:underline">
                                Accedi al tuo Account
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
