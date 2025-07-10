// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
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
      },
    },
  },
  plugins: [],
};
