/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bakwas: {
          50: '#e6fbf5',
          100: '#c2f4e6',
          200: '#8eebd4',
          300: '#4edbc0',
          400: '#1ec2a8',
          500: '#00a884', // Primary brand color
          600: '#00876b',
          700: '#006d57',
          800: '#005747',
          900: '#00473a',
          dark: '#0b141a',
          panel: '#111b21',
          hover: '#202c33',
          border: '#222e35',
          input: '#2a3942',
          sent: '#005c4b',
          received: '#202c33',
          lightBg: '#efeae2',
          lightPanel: '#ffffff',
          lightSent: '#d9fdd3',
          lightReceived: '#ffffff'
        }
      },
      fontFamily: {
        sans: [
          'Segoe UI',
          'Helvetica Neue',
          '-apple-system',
          'BlinkMacSystemFont',
          'Roboto',
          'sans-serif'
        ]
      }
    },
  },
  plugins: [],
}
