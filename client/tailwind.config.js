/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        wow: {
          gold:        '#E8A820',
          'gold-light':'#F5C518',
          'gold-dim':  '#9B7218',
          dark:        '#080C08',
          panel:       '#0D1209',
          'panel-hi':  '#131A0F',
          border:      '#1A2416',
          'border-hi': '#2A3822',
          text:        '#C0C49A',
          'text-dim':  '#6A6E52',
        },
      },
      fontFamily: {
        wow: ['"Cinzel"', 'serif'],
      },
      animation: {
        'slide-in':   'slideIn 0.25s ease-out',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
        'fade-in':    'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%':   { transform: 'translateX(-8px)', opacity: '0' },
          '100%': { transform: 'translateX(0)',     opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 6px rgba(232,168,32,0.25)' },
          '50%':      { boxShadow: '0 0 18px rgba(232,168,32,0.65)' },
        },
      },
    },
  },
  plugins: [],
}
