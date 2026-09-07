/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#0a0f11',
          card: '#101719',
          'card-hover': '#141e20',
          border: '#1b282a',
          mint: '#10b981',
          'mint-bright': '#00f5a0',
          'mint-dark': '#092e26',
          'mint-light': '#34d399',
        },
      },
    },
  },
  plugins: [],
}
