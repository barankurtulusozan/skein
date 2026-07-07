/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0E1116',
        surface: '#171B22',
        outline: '#2A2F3A',
        primary: '#F2A65A',
        success: '#3DDC97',
        running: '#5B8DEF',
        error: '#FF6B6B',
        warning: '#E0A93E',
        'text-primary': '#F5F6F8',
        'text-muted': '#9AA1AC',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
