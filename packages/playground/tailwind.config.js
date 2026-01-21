/**
 * Tailwind CSS Configuration
 */

module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          850: '#1a202c',
          900: '#111827',
          950: '#0f172a',
        },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "'Courier New'", 'monospace'],
        sans: ["'Inter'", 'sans-serif'],
      },
      animation: {
        float: 'float 3s ease-in-out infinite',
        glow: 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%, 100%': {
            boxShadow: '0 0 5px rgba(168, 85, 247, 0.5)',
          },
          '50%': {
            boxShadow: '0 0 20px rgba(168, 85, 247, 0.8)',
          },
        },
      },
      boxShadow: {
        inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.3)',
        glow: '0 0 20px rgba(168, 85, 247, 0.5)',
      },
    },
  },
  plugins: [],
};
