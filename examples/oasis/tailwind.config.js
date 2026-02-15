/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Meadow color palette - Mediterranean Plaza aesthetic
        meadow: {
          // Sky colors
          'sky': '#5DADE2',
          'sky-light': '#87CEEB',
          'sky-dark': '#3498DB',

          // Ground/Nature colors
          'grass': '#7CB342',
          'grass-light': '#9CCC65',
          'grass-dark': '#558B2F',

          // Warm accent colors
          'cream': '#FFF8E7',
          'cream-light': '#FFFEF9',
          'cream-dark': '#F5E6D3',
          'terracotta': '#D2691E',
          'terracotta-light': '#E8A87C',
          'sunlight': '#FFD54F',
          'golden': '#FFC107',

          // Text colors
          'text': '#3D2914',
          'text-muted': '#6B5344',
          'text-light': '#8B7355',

          // Semantic colors
          'success': '#43A047',
          'warning': '#FB8C00',
          'error': '#E53935',
          'info': '#5DADE2',
        },
        // Keep oasis as alias for backwards compatibility during transition
        oasis: {
          bg: '#FFFEF9',
          surface: '#FFF8E7',
          'surface-light': '#F5E6D3',
          primary: '#7CB342',
          'primary-light': '#9CCC65',
          secondary: '#5DADE2',
          success: '#43A047',
          warning: '#FB8C00',
          error: '#E53935',
          text: '#3D2914',
          'text-muted': '#6B5344',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'meadow': '0 4px 20px rgba(61, 41, 20, 0.08)',
        'meadow-lg': '0 8px 40px rgba(61, 41, 20, 0.12)',
        'meadow-inner': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.8)',
        'sunlight': '0 0 60px rgba(255, 213, 79, 0.3)',
        'grass': '0 4px 20px rgba(124, 179, 66, 0.2)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'cloud-drift': 'cloudDrift 60s linear infinite',
        'cloud-drift-slow': 'cloudDrift 90s linear infinite',
        'grass-sway': 'grassSway 4s ease-in-out infinite',
        'leaf-fall': 'leafFall 8s linear infinite',
        'sparkle': 'sparkle 2s ease-in-out infinite',
        'sunbeam': 'sunbeam 6s ease-in-out infinite',
        'gentle-bounce': 'gentleBounce 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        cloudDrift: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100vw)' },
        },
        grassSway: {
          '0%, 100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
        leafFall: {
          '0%': { transform: 'translateY(-10px) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(100vh) rotate(360deg)', opacity: '0' },
        },
        sparkle: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' },
        },
        sunbeam: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '0.6' },
        },
        gentleBounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
      backgroundImage: {
        'sky-gradient': 'linear-gradient(180deg, #87CEEB 0%, #5DADE2 50%, #B8E2F2 100%)',
        'meadow-gradient': 'linear-gradient(180deg, #9CCC65 0%, #7CB342 100%)',
        'sunlight-overlay': 'radial-gradient(circle at 80% 10%, rgba(255, 213, 79, 0.25) 0%, transparent 50%)',
        'cream-gradient': 'linear-gradient(135deg, #FFFEF9 0%, #FFF8E7 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      borderRadius: {
        'pill': '9999px',
      },
    },
  },
  plugins: [],
}
