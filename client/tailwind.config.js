/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { library: { 50: '#eef4ff', 600: '#3b4bd8', 700: '#2f3ab5', 900: '#1a2050' } },
    },
  },
  plugins: [],
};
