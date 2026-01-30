/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html", "./js/**/*.js"],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Spectral', 'serif'],
        arabic: ['Traditional Arabic', 'Arabic Typesetting', 'Amiri', 'serif'],
      },
      colors: {
        paper: '#f5f5f0',
        ink: '#1a1a1a',
      },
      backgroundImage: {
        'paper-texture': 'linear-gradient(rgba(245, 245, 240, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(245, 245, 240, 0.2) 1px, transparent 1px)',
      },
      backgroundSize: {
        paper: '20px 20px',
      },
    },
  },
  plugins: [],
}
