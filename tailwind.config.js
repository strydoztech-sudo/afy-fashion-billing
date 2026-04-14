/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fff1f3',
          100: '#ffe4e8',
          200: '#fecdd5',
          300: '#fda4b4',
          400: '#fb7192',
          500: '#f43f6a',
          600: '#e11d4a',
          700: '#be1138',
          800: '#9f1239',
          900: '#881337',
        },
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
        body: ['system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
