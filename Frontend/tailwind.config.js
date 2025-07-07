// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        veg: {
          50:  '#f3faf4',
          100: '#daf0db',
          200: '#b4e0b8',
          300: '#88cf93',
          400: '#5fbd71',
          500: '#2e7d32',   // primary button / accent
          600: '#256d29',
          700: '#1e5a22',   // navbar text
          800: '#16461a',
          900: '#0d2e10',
        },
      },
    },
  },
  plugins: [],
};
