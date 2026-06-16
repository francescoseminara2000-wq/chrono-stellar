import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Bell } from 'lucide-react';

export const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '+39 ',
        street: '',
        civic: '',
        city: '',
        zipCode: '',
        notificationPreference: 'EMAIL'
    });
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (formData.password !== formData.confirmPassword) {
            setError('Le password non coincidono');
            return;
        }

        try {
            const res = await fetch(`/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            setSuccessMessage(data.message || 'Registrazione completata. Controlla la tua email per verificare l\'account.');

        } catch (err: any) {
            setError(err.message);
        }
    };

    if (successMessage) {
        return (
            <div className="min-h-screen bg-nature-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Registrazione Completata!</h2>
                    <p className="text-gray-600 mb-6">{successMessage}</p>
                    <Link to="/login" className="inline-block bg-nature-900 text-white font-bold py-2 px-6 rounded-xl hover:bg-nature-800 transition-colors">
                        Vai al Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-nature-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="font-script text-4xl text-nature-900 mb-2">Benvenuto!</h1>
                    <p className="text-gray-500">Crea un account per ordinare velocemente</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Nome Completo</label>
                        <input
                            name="name"
                            required
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-nature-500 outline-none"
                            value={formData.name}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            name="email"
                            required
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-nature-500 outline-none"
                            value={formData.email}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
                        <input
                            type="password"
                            name="password"
                            required
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-nature-500 outline-none"
                            value={formData.password}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Conferma Password</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            required
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-nature-500 outline-none"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Telefono</label>
                        <input
                            type="tel"
                            name="phone"
                            required
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-nature-500 outline-none"
                            value={formData.phone}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Indirizzo (Via e Numero Civico)</label>
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                name="street"
                                placeholder="Via"
                                required
                                className="w-3/4 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-nature-500 outline-none"
                                value={formData.street}
                                onChange={handleChange}
                            />
                            <input
                                type="text"
                                name="civic"
                                placeholder="N° Civico"
                                required
                                className="w-1/4 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-nature-500 outline-none"
                                value={formData.civic}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Città</label>
                        <input
                            type="text"
                            name="city"
                            required
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-nature-500 outline-none"
                            value={formData.city}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">CAP</label>
                        <input
                            type="text"
                            name="zipCode"
                            required
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-nature-500 outline-none"
                            value={formData.zipCode}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="bg-nature-50 p-4 rounded-xl border border-nature-100">
                        <label className="flex items-center text-sm font-bold text-gray-700 mb-3 gap-2">
                            <Bell size={16} className="text-nature-600" />
                            Preferenza Notifiche Ordine
                        </label>
                        <div className="flex gap-4">
                            <label className={`flex-1 flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all ${formData.notificationPreference === 'EMAIL' ? 'border-nature-600 bg-white shadow-sm' : 'border-transparent bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                                <input
                                    type="radio"
                                    name="notificationPreference"
                                    value="EMAIL"
                                    checked={formData.notificationPreference === 'EMAIL'}
                                    onChange={handleChange}
                                    className="hidden"
                                />
                                <span className="font-medium text-sm">Email</span>
                            </label>
                            <label className={`flex-1 flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all ${formData.notificationPreference === 'WHATSAPP' ? 'border-green-500 bg-white shadow-sm' : 'border-transparent bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                                <input
                                    type="radio"
                                    name="notificationPreference"
                                    value="WHATSAPP"
                                    checked={formData.notificationPreference === 'WHATSAPP'}
                                    onChange={handleChange}
                                    className="hidden"
                                />
                                <span className="font-medium text-sm text-green-700">WhatsApp</span>
                            </label>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 text-center">Scegli come ricevere le conferme e gli aggiornamenti di consegna.</p>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-nature-900 text-white font-bold py-3 rounded-xl hover:bg-nature-800 transition-colors flex items-center justify-center gap-2"
                    >
                        <UserPlus size={20} /> Crea Account
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-500">
                    Hai già un account? <Link to="/login" className="text-nature-600 font-bold hover:underline">Accedi qui</Link>
                </div>

                <div className="mt-4 text-center">
                    <Link to="/" className="text-xs text-gray-400 hover:text-gray-600">Torna alla Home</Link>
                </div>
            </div>
        </div>
    );
};
