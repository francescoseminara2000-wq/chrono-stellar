import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { Trash2, Upload } from 'lucide-react';
import { sanitizeImageUrl } from '../../utils/imageUrl';
import { ConfirmModal } from '../../components/admin/ConfirmModal';

export const AvatarManager = () => {
    const { token } = useAuthStore();
    const [avatars, setAvatars] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState('');
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

    useEffect(() => {
        fetchAvatars();
    }, []);

    const fetchAvatars = async () => {
        try {
            const res = await fetch('/api/avatars');
            const data = await res.json();
            setAvatars(data);
        } catch (error) {
            console.error('Error fetching avatars:', error);
            setMessage('Errore nel caricamento degli avatar');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setMessage('');

        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await fetch('/api/admin/avatars', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (res.ok) {
                setMessage('Avatar caricato con successo');
                fetchAvatars();
            } else {
                setMessage('Errore nel caricamento');
            }
        } catch (error) {
            console.error('Error uploading avatar:', error);
            setMessage('Errore di connessione');
        } finally {
            setIsUploading(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleDelete = async (filename: string, force = false) => {
        if (!force) {
            setConfirmModal({
                isOpen: true,
                title: 'Elimina Avatar',
                message: 'Sei sicuro di voler eliminare questo avatar? Questa azione non può essere annullata.',
                onConfirm: () => handleDelete(filename, true)
            });
            return;
        }

        const name = filename.split('/').pop();

        try {
            const res = await fetch(`/api/admin/avatars/${name}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                setMessage('Avatar eliminato con successo');
                fetchAvatars();
            } else {
                setMessage('Errore durante l\'eliminazione');
            }
        } catch (error) {
            console.error('Error deleting avatar:', error);
            setMessage('Errore di connessione');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-nature-900">Gestione Avatar</h1>
                <div className="relative w-full sm:w-auto">
                    <input
                        type="file"
                        id="avatar-upload"
                        className="hidden"
                        accept="image/*"
                        onChange={handleUpload}
                        disabled={isUploading}
                    />
                    <label
                        htmlFor="avatar-upload"
                        className={`flex items-center justify-center gap-2 bg-nature-600 text-white px-5 py-3 rounded-2xl cursor-pointer hover:bg-nature-700 transition-all font-bold w-full sm:w-auto shadow-md ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <Upload size={20} />
                        {isUploading ? 'Caricamento...' : 'Carica Nuovo'}
                    </label>
                </div>
            </div>

            {message && (
                <div className={`p-4 rounded-lg text-sm font-bold ${message.includes('Errore') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {message}
                </div>
            )}

            {isLoading ? (
                <p>Caricamento...</p>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {avatars.map((avatar, index) => (
                        <div key={index} className="group relative aspect-square bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
                            <img
                                src={sanitizeImageUrl(avatar)}
                                alt={`Avatar ${index}`}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                    onClick={() => handleDelete(avatar)}
                                    className="p-2 bg-white text-red-600 rounded-full hover:bg-red-50 transition-colors"
                                    title="Elimina"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    ))}

                    {avatars.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">
                            Nessun avatar presente. Caricane uno per iniziare.
                        </div>
                    )}
                </div>
            )}
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
