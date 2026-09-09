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
        cyber: {
          bg: '#0B0F17',
          card: '#131B29',
          border: '#1E293B',
          accent: '#38BDF8',
          danger: '#EF4444',
          warning: '#F59E0B',
          success: '#10B981',
          purple: '#8B5CF6'
        }
      }
    },
  },
  plugins: [],
}
