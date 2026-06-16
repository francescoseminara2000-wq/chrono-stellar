export interface ThemeShades {
    nature50: string;
    nature100: string;
    nature500: string;
    nature600: string;
    nature900: string;
    fruit500: string;
}

export const PRESET_THEMES: Record<string, ThemeShades> = {
    green: {
        nature50: '#f2fcf5',
        nature100: '#e1f8e8',
        nature500: '#22c55e',
        nature600: '#16a34a',
        nature900: '#14532d',
        fruit500: '#ef4444'
    },
    blue: {
        nature50: '#f0f7ff',
        nature100: '#e0f2fe',
        nature500: '#0ea5e9',
        nature600: '#0284c7',
        nature900: '#0c4a6e',
        fruit500: '#f97316'
    },
    purple: {
        nature50: '#faf5ff',
        nature100: '#f3e8ff',
        nature500: '#a855f7',
        nature600: '#9333ea',
        nature900: '#581c87',
        fruit500: '#e11d48'
    },
    orange: {
        nature50: '#fff7ed',
        nature100: '#ffedd5',
        nature500: '#f97316',
        nature600: '#ea580c',
        nature900: '#7c2d12',
        fruit500: '#06b6d4'
    },
    amber: {
        nature50: '#fefdf0',
        nature100: '#fef9c3',
        nature500: '#eab308',
        nature600: '#ca8a04',
        nature900: '#854d0e',
        fruit500: '#6366f1'
    }
};

function hexToHsl(hex: string): { h: number; s: number; l: number } {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
        hex = hex.split('').map(x => x + x).join('');
    }
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
}

function hslToHex(h: number, s: number, l: number): string {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

export function generateShades(primaryHex: string, accentHex: string): ThemeShades {
    const primaryHsl = hexToHsl(primaryHex);
    return {
        nature50: hslToHex(primaryHsl.h, Math.min(primaryHsl.s, 15), 98),
        nature100: hslToHex(primaryHsl.h, Math.min(primaryHsl.s, 25), 94),
        nature500: primaryHex,
        nature600: hslToHex(primaryHsl.h, primaryHsl.s, Math.max(primaryHsl.l - 10, 15)),
        nature900: hslToHex(primaryHsl.h, Math.min(primaryHsl.s + 10, 100), 20),
        fruit500: accentHex
    };
}

export function getThemeColors(settings: any): ThemeShades {
    if (!settings || !settings.colorTheme) {
        return PRESET_THEMES.green;
    }

    const theme = settings.colorTheme;
    if (theme === 'custom' && settings.primaryColor && settings.accentColor) {
        try {
            return generateShades(settings.primaryColor, settings.accentColor);
        } catch (e) {
            console.error('Error generating custom shades:', e);
            return PRESET_THEMES.green;
        }
    }

    return PRESET_THEMES[theme] || PRESET_THEMES.green;
}
