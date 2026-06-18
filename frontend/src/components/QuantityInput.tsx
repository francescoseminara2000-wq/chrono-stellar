import React, { useState, useEffect } from 'react';

interface QuantityInputProps {
    value: number;
    onChange: (val: number) => void;
    className?: string;
}

export const QuantityInput: React.FC<QuantityInputProps> = ({ value, onChange, className }) => {
    const [inputValue, setInputValue] = useState(String(value));

    useEffect(() => {
        setInputValue(String(value));
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, ''); // Keep only numbers
        setInputValue(raw);
        
        if (raw !== '') {
            const parsed = parseInt(raw, 10);
            if (parsed > 0) {
                onChange(parsed);
            }
        }
    };

    const handleBlur = () => {
        if (inputValue === '' || parseInt(inputValue, 10) <= 0) {
            onChange(0); // This will remove it from cart
        } else {
            onChange(parseInt(inputValue, 10));
        }
    };

    return (
        <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className={className || "w-8 text-center bg-transparent border-none focus:ring-0 focus:outline-none outline-none font-bold text-nature-900"}
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
        />
    );
};
