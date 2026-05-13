/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        treasury: {
          primary: '#1e40af',
          secondary: '#3b82f6',
          accent: '#dc2626',
          success: '#16a34a',
          warning: '#f59e0b',
          danger: '#dc2626',
          info: '#0284c7'
        }
      }
    },
  },
  plugins: [],
}