import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface DateTimePickerProps {
    date: string; // YYYY-MM-DD
    time: string; // HH:MM
    onChange: (date: string, time: string) => void;
}

const MONTHS_IT = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

const DAYS_WEEK_IT = ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do'];

const POPULAR_TIMES = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
    '20:00'
];

export const DateTimePicker: React.FC<DateTimePickerProps> = ({ date, time, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Parse incoming values or fallback to current local time
    const initialDate = date ? new Date(date) : new Date();
    const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
    const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth()); // 0-indexed

    // Local temporary selections to apply on confirm
    const [tempDate, setTempDate] = useState(date);
    const [tempTime, setTempTime] = useState(time || '12:00');

    // Hour and minute split for precise adjustments
    const [customHour, setCustomHour] = useState(tempTime ? tempTime.split(':')[0] : '12');
    const [customMinute, setCustomMinute] = useState(tempTime ? tempTime.split(':')[1] : '00');

    useEffect(() => {
        setTempDate(date);
        if (date) {
            const parsed = new Date(date);
            setCurrentYear(parsed.getFullYear());
            setCurrentMonth(parsed.getMonth());
        }
    }, [date]);

    useEffect(() => {
        setTempTime(time || '12:00');
        const parts = (time || '12:00').split(':');
        setCustomHour(parts[0] || '12');
        setCustomMinute(parts[1] || '00');
    }, [time]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Generate Calendar Grid
    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year: number, month: number) => {
        // Return 0 for Mon, 1 for Tue... 6 for Sun
        const day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1;
    };

    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);

    const handlePrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(prev => prev - 1);
        } else {
            setCurrentMonth(prev => prev - 1);
        }
    };

    const handleNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(prev => prev + 1);
        } else {
            setCurrentMonth(prev => prev + 1);
        }
    };

    const handleSelectDay = (dayNum: number) => {
        const paddedMonth = String(currentMonth + 1).padStart(2, '0');
        const paddedDay = String(dayNum).padStart(2, '0');
        const selectedDateStr = `${currentYear}-${paddedMonth}-${paddedDay}`;
        setTempDate(selectedDateStr);
    };

    const handleSelectPopularTime = (t: string) => {
        setTempTime(t);
        const parts = t.split(':');
        setCustomHour(parts[0]);
        setCustomMinute(parts[1]);
    };

    const handleCustomTimeChange = (h: string, m: string) => {
        setCustomHour(h);
        setCustomMinute(m);
        setTempTime(`${h}:${m}`);
    };

    const handleConfirm = () => {
        onChange(tempDate, tempTime);
        setIsOpen(false);
    };

    const handleClear = () => {
        onChange('', '');
        setTempDate('');
        setTempTime('12:00');
        setIsOpen(false);
    };

    // Format current value to display on the button
    const getFormattedValue = () => {
        if (!date) return 'Non programmato';
        const [y, m, d] = date.split('-');
        const dateStr = `${d}/${m}/${y}`;
        const timeStr = time ? ` alle ${time}` : '';
        return `${dateStr}${timeStr}`;
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-250 rounded-xl text-xs font-bold text-gray-700 bg-white hover:border-nature-500 hover:ring-1 hover:ring-nature-500/20 outline-none transition-all shadow-sm"
            >
                <span className="flex items-center gap-2 truncate">
                    <CalendarIcon size={14} className="text-blue-500 shrink-0" />
                    <span className="truncate">{getFormattedValue()}</span>
                </span>
                <Clock size={14} className="text-gray-400 shrink-0" />
            </button>

            {isOpen && (
                <div className="absolute left-0 mt-2 p-4 bg-white border border-gray-200 rounded-2xl shadow-xl z-[100] w-[320px] sm:w-[540px] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                        {/* Calendar Column */}
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-3">
                                <button
                                    type="button"
                                    onClick={handlePrevMonth}
                                    className="p-1 text-gray-400 hover:text-gray-750 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="text-xs font-extrabold text-gray-750">
                                    {MONTHS_IT[currentMonth]} {currentYear}
                                </span>
                                <button
                                    type="button"
                                    onClick={handleNextMonth}
                                    className="p-1 text-gray-400 hover:text-gray-750 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>

                            {/* Calendar weekdays header */}
                            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">
                                {DAYS_WEEK_IT.map(d => (
                                    <div key={d}>{d}</div>
                                ))}
                            </div>

                            {/* Calendar days grid */}
                            <div className="grid grid-cols-7 gap-1">
                                {/* Empty placeholders */}
                                {Array.from({ length: firstDayIndex }).map((_, idx) => (
                                    <div key={`empty-${idx}`} className="w-8 h-8"></div>
                                ))}

                                {/* Real days */}
                                {Array.from({ length: daysInMonth }).map((_, idx) => {
                                    const dayNum = idx + 1;
                                    const paddedMonth = String(currentMonth + 1).padStart(2, '0');
                                    const paddedDay = String(dayNum).padStart(2, '0');
                                    const dateStr = `${currentYear}-${paddedMonth}-${paddedDay}`;
                                    const isSelected = tempDate === dateStr;

                                    return (
                                        <button
                                            key={`day-${dayNum}`}
                                            type="button"
                                            onClick={() => handleSelectDay(dayNum)}
                                            className={`
                                                w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all
                                                ${isSelected
                                                    ? 'bg-nature-600 text-white shadow-sm font-black'
                                                    : 'text-gray-700 hover:bg-nature-50 hover:text-nature-700'
                                                }
                                            `}
                                        >
                                            {dayNum}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Divider on Desktop */}
                        <div className="hidden sm:block w-[1px] bg-gray-100 self-stretch"></div>

                        {/* Time Slots Column */}
                        <div className="w-full sm:w-[200px] flex flex-col">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Clock size={12} className="text-blue-505" /> Seleziona Orario
                            </span>

                            {/* Popular slots grid */}
                            <div className="grid grid-cols-4 sm:grid-cols-3 gap-1 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar mb-3">
                                {POPULAR_TIMES.map(t => {
                                    const isSelected = tempTime === t;
                                    return (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => handleSelectPopularTime(t)}
                                            className={`
                                                py-1 px-1.5 rounded-md text-[10px] font-bold text-center border transition-all
                                                ${isSelected
                                                    ? 'bg-blue-600 text-white border-transparent font-black'
                                                    : 'border-gray-100 hover:border-blue-400 text-gray-600 hover:bg-blue-55/20'
                                                }
                                            `}
                                        >
                                            {t}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Custom Picker inputs */}
                            <div className="border-t border-gray-100 pt-3 mt-auto">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block mb-1">Ora personalizzata</span>
                                <div className="flex items-center gap-1">
                                    <select
                                        value={customHour}
                                        onChange={(e) => handleCustomTimeChange(e.target.value, customMinute)}
                                        className="flex-1 p-1 border border-gray-205 rounded-lg text-xs font-bold bg-white text-gray-700 outline-none"
                                    >
                                        {Array.from({ length: 24 }).map((_, idx) => {
                                            const h = String(idx).padStart(2, '0');
                                            return <option key={h} value={h}>{h}</option>;
                                        })}
                                    </select>
                                    <span className="text-gray-400 font-bold">:</span>
                                    <select
                                        value={customMinute}
                                        onChange={(e) => handleCustomTimeChange(customHour, e.target.value)}
                                        className="flex-1 p-1 border border-gray-205 rounded-lg text-xs font-bold bg-white text-gray-700 outline-none"
                                    >
                                        {Array.from({ length: 60 }).map((_, idx) => {
                                            const m = String(idx).padStart(2, '0');
                                            return <option key={m} value={m}>{m}</option>;
                                        })}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex justify-between items-center border-t border-gray-100 pt-3 mt-4">
                        <button
                            type="button"
                            onClick={handleClear}
                            className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 font-bold text-[10px] rounded-lg transition-colors uppercase tracking-wider"
                        >
                            Cancella
                        </button>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="px-3 py-1.5 bg-gray-50 text-gray-500 hover:bg-gray-100 font-bold text-[10px] rounded-lg transition-colors uppercase tracking-wider"
                            >
                                Annulla
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                className="px-3 py-1.5 bg-nature-600 text-white hover:bg-nature-700 font-bold text-[10px] rounded-lg transition-colors flex items-center gap-1 uppercase tracking-wider shadow-sm"
                            >
                                <Check size={12} /> Conferma
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
