/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        wow: {
          gold: '#C8A951',
          'gold-light': '#FFD700',
          dark: '#0A0A0F',
          panel: '#12121C',
          border: '#2A2A3E',
          text: '#C6C6C6',
        },
        tier: {
          low: '#22c55e',
          medium: '#eab308',
          ultra: '#ef4444',
        }
      },
      fontFamily: {
        wow: ['"Cinzel"', 'serif'],
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(200,169,81,0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(200,169,81,0.8)' },
        }
      }
    }
  },
  plugins: []
}
