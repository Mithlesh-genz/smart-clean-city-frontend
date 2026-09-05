/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './index.html',
        './src/**/*.{js,jsx,ts,tsx}',
    ],
    darkMode: 'class', // or 'media' if you prefer system preference
    theme: {
        extend: {
            colors: {
                // Primary brand color
                primary: {
                    DEFAULT: '#FF6B00',
                    hover: '#E85E00',
                    light: '#FF8C3A',
                    dark: '#CC5500',
                },
                // Background colors
                bg: {
                    DEFAULT: '#0A0A0A',
                    light: '#121212',
                    dark: '#050505',
                },
                // Card / surface colors
                card: {
                    DEFAULT: '#1A1A1A',
                    hover: '#242424',
                },
                // Border colors
                border: {
                    DEFAULT: '#2A2A2A',
                    light: '#3A3A3A',
                },
                // Status colors
                success: {
                    DEFAULT: '#22C55E',
                    light: '#4ADE80',
                },
                warning: {
                    DEFAULT: '#EAB308',
                    light: '#FACC15',
                },
                error: {
                    DEFAULT: '#EF4444',
                    light: '#F87171',
                },
                info: {
                    DEFAULT: '#3B82F6',
                    light: '#60A5FA',
                },
                // Gray scale for dark theme
                gray: {
                    50: '#F9FAFB',
                    100: '#F3F4F6',
                    200: '#E5E7EB',
                    300: '#D1D5DB',
                    400: '#9CA3AF',
                    500: '#6B7280',
                    600: '#4B5563',
                    700: '#374151',
                    800: '#1F2937',
                    900: '#111827',
                    950: '#030712',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
            },
            animation: {
                'spin-slow': 'spin 3s linear infinite',
                'pulse-soft': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'slide-up': 'slideUp 0.3s ease-out',
                'slide-down': 'slideDown 0.3s ease-out',
                'fade-in': 'fadeIn 0.3s ease-out',
            },
            keyframes: {
                slideUp: {
                    '0%': { transform: 'translateY(10px)', opacity: 0 },
                    '100%': { transform: 'translateY(0)', opacity: 1 },
                },
                slideDown: {
                    '0%': { transform: 'translateY(-10px)', opacity: 0 },
                    '100%': { transform: 'translateY(0)', opacity: 1 },
                },
                fadeIn: {
                    '0%': { opacity: 0 },
                    '100%': { opacity: 1 },
                },
            },
            backdropBlur: {
                xs: '2px',
            },
        },
    },
    plugins: [],
};