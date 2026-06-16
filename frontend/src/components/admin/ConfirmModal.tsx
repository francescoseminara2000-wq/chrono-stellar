import React from 'react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Conferma',
    cancelText = 'Annulla',
    onConfirm,
    onCancel
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-[#0c2e19]/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl border border-nature-100 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
                <h3 className="font-black text-lg text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm mb-6">{message}</p>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-xl font-bold transition-colors text-sm"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-5 py-2.5 bg-nature-600 hover:bg-nature-700 text-white rounded-xl font-bold shadow-md transition-colors text-sm"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
