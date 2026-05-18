import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // HoloShell natural phenomena palette (D.049-D.051)
        dark: '#05070f',
        'deep-blue': '#0a1422',
        'accent-blue': '#88aacc',
        holo: {
          dark: '#05070f',
          deep: '#0a1422',
          accent: '#88aacc',
        },
      },
    },
  },
  plugins: [],
};

export default config;
