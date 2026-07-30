/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                nature: {
                    50: 'var(--color-nature-50, #f2fcf5)',
                    100: 'var(--color-nature-100, #e1f8e8)',
                    200: 'var(--color-nature-200, #c3f1d1)',
                    300: 'var(--color-nature-300, #95e4b2)',
                    400: 'var(--color-nature-400, #5ed08d)',
                    500: 'var(--color-nature-500, #22c55e)',
                    600: 'var(--color-nature-600, #16a34a)',
                    700: 'var(--color-nature-700, #15803d)',
                    800: 'var(--color-nature-800, #166534)',
                    900: 'var(--color-nature-900, #14532d)',
                    950: 'var(--color-nature-950, #052e16)',
                },
                fruit: {
                    500: 'var(--color-fruit-500, #ef4444)',
                }
            },
            fontFamily: {
                script: ['"Dancing Script"', 'cursive'],
                sans: ['"Nunito"', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
