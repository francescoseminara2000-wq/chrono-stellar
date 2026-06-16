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
                    500: 'var(--color-nature-500, #22c55e)',
                    600: 'var(--color-nature-600, #16a34a)',
                    900: 'var(--color-nature-900, #14532d)',
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
