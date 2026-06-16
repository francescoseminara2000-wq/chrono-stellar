import React from 'react';
import { useToastStore, ToastType } from '../../store/useToastStore';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle className="text-green-500" size={20} />,
    error: <AlertCircle className="text-red-500" size={20} />,
    info: <Info className="text-blue-500" size={20} />,
    warning: <AlertTriangle className="text-amber-500" size={20} />,
};

const bgColors: Record<ToastType, string> = {
    success: 'bg-green-50 border-green-100',
    error: 'bg-red-50 border-red-100',
    info: 'bg-blue-50 border-blue-100',
    warning: 'bg-amber-50 border-amber-100',
};

export const Toaster = ({ variant = 'fixed' }: { variant?: 'fixed' | 'inline' }) => {
    const { toasts, removeToast } = useToastStore();

    const containerStyles = variant === 'fixed'
        ? "fixed bottom-24 md:bottom-8 right-4 md:right-8 z-[9999] flex flex-col gap-3 max-w-md w-full pointer-events-none"
        : "relative mb-4 z-20 flex flex-col gap-2 w-full pointer-events-none";

    const itemStyles = variant === 'fixed'
        ? "animate-in fade-in slide-in-from-right-4"
        : "animate-in fade-in slide-in-from-left-4";

    return (
        <div className={containerStyles}>
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`
            pointer-events-auto flex items-center gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur-md
            transition-all ${itemStyles}
            ${bgColors[toast.type]}
            ${variant === 'inline' ? 'm-0 p-3 shadow-lg' : ''}
          `}
                >
                    <div className="shrink-0">
                        {React.cloneElement(icons[toast.type] as React.ReactElement, { size: variant === 'inline' ? 16 : 20 })}
                    </div>
                    <p className={`flex-1 font-bold text-gray-800 leading-tight ${variant === 'inline' ? 'text-[11px]' : 'text-sm'}`}>
                        {toast.message}
                    </p>
                    <button
                        onClick={() => removeToast(toast.id)}
                        className="shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={variant === 'inline' ? 14 : 16} />
                    </button>
                </div>
            ))}
        </div>
    );
};
