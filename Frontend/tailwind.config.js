// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // ✅ Enable dark mode (controlled via class)
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Custom green shades for "veg" items
        veg: {
          50:  '#f5fef4',
          100: '#e6f8e0',
          200: '#c1eec1',
          300: '#99e199',
          400: '#66d466',
          500: '#33c733',
          600: '#2aa72a',
          700: '#218721',
          800: '#196919',
          900: '#124f12',
        },
        // Prediction-related colors
        prediction: {
          high: '#10b981',   // green
          medium: '#f59e0b', // orange
          low: '#ef4444',    // red
          bg: '#f8fafc',     // light background
        },
      },
      // Optional: extend spacing, fontSize, borderRadius, etc. here
      spacing: {
        '128': '32rem', // example custom spacing
      },
      borderRadius: {
        'xl': '1rem',
      },
    },
  },
  plugins: [],
};
