import React from 'react';
import { useToastStore, ToastType } from '../../store/useToastStore';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 className="text-emerald-600" size={22} />,
    error: <AlertCircle className="text-red-600" size={22} />,
    info: <Info className="text-blue-600" size={22} />,
    warning: <AlertTriangle className="text-amber-600" size={22} />,
};

const bgColors: Record<ToastType, string> = {
    success: 'bg-white border-emerald-300 text-emerald-950 shadow-emerald-500/10',
    error: 'bg-white border-red-300 text-red-950 shadow-red-500/10',
    info: 'bg-white border-blue-300 text-blue-950 shadow-blue-500/10',
    warning: 'bg-white border-amber-300 text-amber-950 shadow-amber-500/10',
};

const accentLine: Record<ToastType, string> = {
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-amber-500',
};

export const Toaster = ({ variant = 'fixed' }: { variant?: 'fixed' | 'inline' }) => {
    const { toasts, removeToast } = useToastStore();

    const containerStyles = variant === 'fixed'
        ? "fixed top-6 right-4 sm:right-6 z-[99999] flex flex-col gap-3 max-w-md w-full pointer-events-none"
        : "relative mb-4 z-20 flex flex-col gap-2 w-full pointer-events-none";

    const itemStyles = variant === 'fixed'
        ? "animate-in fade-in slide-in-from-right-8 duration-300"
        : "animate-in fade-in slide-in-from-top-2";

    return (
        <div className={containerStyles}>
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`
                        pointer-events-auto flex items-start gap-3.5 p-4 rounded-2xl border-2 shadow-2xl backdrop-blur-md relative overflow-hidden
                        transition-all ${itemStyles}
                        ${bgColors[toast.type]}
                    `}
                >
                    {/* Left Accent Bar */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${accentLine[toast.type]}`} />

                    <div className="shrink-0 pt-0.5 pl-1">
                        {icons[toast.type]}
                    </div>
                    
                    <div className="flex-1 min-w-0 pr-2">
                        {toast.title && (
                            <h4 className="font-black text-sm text-gray-900 leading-tight mb-1 tracking-tight">
                                {toast.title}
                            </h4>
                        )}
                        <p className="font-bold text-gray-700 text-xs leading-relaxed whitespace-pre-line">
                            {toast.message}
                        </p>
                    </div>

                    <button
                        onClick={() => removeToast(toast.id)}
                        className="shrink-0 p-1 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer rounded-lg hover:bg-gray-100"
                    >
                        <X size={16} />
                    </button>
                </div>
            ))}
        </div>
    );
};
