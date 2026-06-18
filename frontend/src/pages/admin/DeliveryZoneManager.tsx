import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { MapPin, Plus, Trash, X } from 'lucide-react';
import { ConfirmModal } from '../../components/admin/ConfirmModal';

interface DeliveryZone {
    id: number;
    city: string;
    zipCode: string;
    shippingCost: number;
    isActive: boolean;
    deliveryDays?: string;
}

export const DeliveryZoneManager = () => {
    const { token } = useAuthStore();
    const [zones, setZones] = useState<DeliveryZone[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentZone, setCurrentZone] = useState<Partial<DeliveryZone>>({});
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

    useEffect(() => {
        fetchZones();
    }, [token]);

    const fetchZones = () => {
        fetch(`/api/admin/delivery-zones`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(setZones)
            .catch(console.error);
    };

    const handleDelete = async (id: number, force = false) => {
        if (!force) {
            setConfirmModal({
                isOpen: true,
                title: 'Elimina Zona',
                message: 'Sei sicuro di voler eliminare questa zona? Questa azione non può essere annullata.',
                onConfirm: () => handleDelete(id, true)
            });
            return;
        }
        try {
            await fetch(`/api/admin/delivery-zones/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchZones();
        } catch (error) {
            console.error('Error deleting zone:', error);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = currentZone.id
            ? `/api/admin/delivery-zones/${currentZone.id}`
            : `/api/admin/delivery-zones`;

        const method = currentZone.id ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(currentZone)
            });

            if (res.ok) {
                setIsEditing(false);
                setCurrentZone({});
                fetchZones();
            }
        } catch (error) {
            console.error('Error saving zone:', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-800">Zone di Consegna</h1>
                <button
                    onClick={() => { setCurrentZone({ isActive: true, deliveryDays: '1,2,3,4,5,6' }); setIsEditing(true); }}
                    className="bg-nature-600 text-white px-5 py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-nature-700 transition-all font-bold w-full sm:w-auto shadow-md animate-in fade-in"
                >
                    <Plus size={20} /> Aggiungi Zona
                </button>
            </div>

            {/* Modal / Form */}
            {isEditing && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-0 md:p-4 z-[60]">
                    <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-md md:rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-xl font-bold text-gray-800">{currentZone.id ? 'Modifica Zona' : 'Nuova Zona'}</h2>
                            <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="text-gray-400 hover:text-gray-600" /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                            <form id="zone-form" onSubmit={handleSave} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-gray-700">Comune</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500 outline-none transition-all"
                                        value={currentZone.city || ''}
                                        onChange={e => setCurrentZone({ ...currentZone, city: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-gray-700">CAP</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500 outline-none transition-all"
                                        value={currentZone.zipCode || ''}
                                        onChange={e => setCurrentZone({ ...currentZone, zipCode: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-gray-700">Costo Spedizione (centesimi)</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500 outline-none transition-all"
                                        value={currentZone.shippingCost || ''}
                                        onChange={e => setCurrentZone({ ...currentZone, shippingCost: Number(e.target.value) })}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Es. 500 = 5.00€</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-gray-700">Giorni di Consegna Abilitati</label>
                                    <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-150">
                                        {[
                                            { value: 1, label: 'Lunedì' },
                                            { value: 2, label: 'Martedì' },
                                            { value: 3, label: 'Mercoledì' },
                                            { value: 4, label: 'Giovedì' },
                                            { value: 5, label: 'Venerdì' },
                                            { value: 6, label: 'Sabato' },
                                            { value: 0, label: 'Domenica' }
                                        ].map(day => {
                                            const daysArr = currentZone.deliveryDays 
                                                ? currentZone.deliveryDays.split(',') 
                                                : ['1', '2', '3', '4', '5', '6'];
                                            const isChecked = daysArr.includes(String(day.value));
                                            
                                            const handleDayToggle = () => {
                                                let newDaysArr = [...daysArr];
                                                if (isChecked) {
                                                    newDaysArr = newDaysArr.filter(d => d !== String(day.value));
                                                } else {
                                                    newDaysArr.push(String(day.value));
                                                }
                                                newDaysArr.sort();
                                                setCurrentZone({
                                                    ...currentZone,
                                                    deliveryDays: newDaysArr.join(',')
                                                });
                                            };

                                            return (
                                                <label key={day.value} className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer p-1 hover:bg-gray-100 rounded transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={handleDayToggle}
                                                        className="rounded border-gray-300 text-nature-600 focus:ring-nature-500"
                                                    />
                                                    <span>{day.label}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        checked={currentZone.isActive || false}
                                        onChange={e => setCurrentZone({ ...currentZone, isActive: e.target.checked })}
                                    />
                                    <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Attivo</label>
                                </div>
                            </form>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex justify-end bg-gray-50/50">
                            <button type="submit" form="zone-form" className="w-full bg-nature-600 text-white py-3 rounded-xl font-bold hover:bg-nature-700 shadow-md transition-all active:scale-95">
                                Salva Zona
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Responsive Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {zones.length === 0 && (
                    <div className="col-span-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-500">
                        Nessuna zona configurata. Aggiungi la tua prima zona di consegna.
                    </div>
                )}
                {zones.map(zone => (
                    <div key={zone.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:border-nature-200 transition-colors">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-nature-50 text-nature-600 flex items-center justify-center shrink-0">
                                    <MapPin size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg leading-tight">{zone.city}</h3>
                                    <p className="text-sm text-gray-500">{zone.zipCode}</p>
                                </div>
                            </div>
                            <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border ${zone.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                {zone.isActive ? 'Attiva' : 'Inattiva'}
                            </span>
                        </div>

                        <div className="flex justify-between items-end border-t border-gray-50 pt-4">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Costo Spedizione</p>
                                <p className="font-black text-gray-900 text-lg">€ {(zone.shippingCost / 100).toFixed(2)}</p>
                                <div className="mt-2 text-[10px] text-gray-500 bg-gray-50 p-1.5 rounded-lg border border-gray-100">
                                    <span className="font-bold text-gray-400">Giorni: </span>
                                    {zone.deliveryDays 
                                        ? zone.deliveryDays.split(',')
                                            .map(d => ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'][Number(d)])
                                            .join(', ')
                                        : 'Lun, Mar, Mer, Gio, Ven, Sab'}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setCurrentZone(zone); setIsEditing(true); }}
                                    className="p-2 bg-gray-50 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Modifica"
                                >
                                    <span className="text-sm font-bold md:hidden px-2">Modifica</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-edit-2 hidden md:block"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                </button>
                                <button
                                    onClick={() => handleDelete(zone.id)}
                                    className="p-2 bg-gray-50 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Elimina"
                                >
                                    <Trash size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <ConfirmModal
                isOpen={!!confirmModal}
                title={confirmModal?.title || ''}
                message={confirmModal?.message || ''}
                onConfirm={() => {
                    if (confirmModal) {
                        confirmModal.onConfirm();
                        setConfirmModal(null);
                    }
                }}
                onCancel={() => setConfirmModal(null)}
            />
        </div>
    );
};
