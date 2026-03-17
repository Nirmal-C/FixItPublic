/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        govNavy: {
          DEFAULT: '#002040',
          light:   '#003366',
          dark:    '#001428',
        },
        govBlue: {
          DEFAULT: '#0066BB',
          light:   '#0077C8',
          dark:    '#004A8F',
        },
        govGold: '#FFC72C',
        surface: {
          DEFAULT:   '#0C1829',
          secondary: '#0E2040',
          card:      '#122040',
        },
        accent: {
          emerald: '#10b981',
          amber:   '#f59e0b',
          rose:    '#f43f5e',
          cyan:    '#06b6d4',
        },
      },
      backgroundImage: {
        'gradient-gov':   'linear-gradient(135deg, #002040 0%, #003366 100%)',
        'gradient-blue':  'linear-gradient(135deg, #0066BB 0%, #004A8F 100%)',
      },
      boxShadow: {
        'card':       '0 1px 4px rgba(0,0,0,0.10)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.18)',
        'gov':        '0 2px 8px rgba(0,32,64,0.30)',
      },
      animation: {
        'fade-in':   'fadeIn 0.5s ease-out',
        'slide-up':  'slideUp 0.4s ease-out',
        'slide-down':'slideDown 0.3s ease-out',
        'shimmer':   'shimmer 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        slideDown: {
          '0%':   { transform: 'translateY(-12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',     opacity: '1' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
