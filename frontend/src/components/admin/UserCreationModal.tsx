import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, UserPlus, Mail, Lock, Phone, Shield } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { SearchableSelect } from './SearchableSelect';

interface UserCreationModalProps {
    onClose: () => void;
    onUserCreated: () => void;
}

export const UserCreationModal: React.FC<UserCreationModalProps> = ({ onClose, onUserCreated }) => {
    const { token } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        role: 'CUSTOMER' // Default is Cliente
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const res = await fetch('/api/admin/customers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Errore durante la creazione dell\'utente');
            }

            onUserCreated();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white w-full max-w-md rounded-2xl shadow-xl flex flex-col overflow-hidden"
            >
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-nature-100 text-nature-600 rounded-xl">
                            <UserPlus size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">Crea Nuovo Utente</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X size={24} className="text-gray-500" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {error && (
                        <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
                            {error}
                        </div>
                    )}

                    <form id="create-user-form" onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-700 ml-1">Nome Completo</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-nature-500 outline-none"
                                placeholder="Mario Rossi"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-700 ml-1 flex items-center gap-1">
                                <Mail size={14} /> Email
                            </label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-nature-500 outline-none"
                                placeholder="mario@example.com"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-700 ml-1 flex items-center gap-1">
                                <Lock size={14} /> Password
                            </label>
                            <input
                                type="text"
                                required
                                minLength={6}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-nature-500 outline-none"
                                placeholder="Password sicura"
                            />
                            <p className="text-xs text-gray-400 ml-1 mt-1">L'utente la userà per il login. Potrà cambiarla in seguito.</p>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-700 ml-1 flex items-center gap-1">
                                <Phone size={14} /> Telefono
                            </label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-nature-500 outline-none"
                                placeholder="+39 333 1234567"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-700 ml-1 flex items-center gap-1 mb-1.5">
                                <Shield size={14} /> Ruolo
                            </label>
                            <SearchableSelect
                                options={[
                                    { value: 'CUSTOMER', label: 'Cliente' },
                                    { value: 'ADMIN', label: 'Amministratore' }
                                ]}
                                value={formData.role}
                                onChange={(value) => setFormData({ ...formData, role: value })}
                                placeholder="Seleziona Ruolo"
                            />
                        </div>
                    </form>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        Annulla
                    </button>
                    <button
                        type="submit"
                        form="create-user-form"
                        disabled={isLoading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-nature-600 text-white font-bold rounded-xl hover:bg-nature-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                    >
                        {isLoading ? 'Creazione...' : 'Crea Utente'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
