/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html", "./pages/**/*.html", "./js/**/*.js", "./src/styles/**/*.css"],
  theme: {
    extend: {
      fontFamily: {
        serif: ['var(--font-serif)', 'serif'],
        arabic: ['var(--font-arabic)', 'serif'],
        sans: ['var(--font-sans)', 'sans-serif'],
      },
      colors: {
        paper: 'var(--color-paper)',
        ink: 'var(--color-ink)',
      },
      backgroundImage: {
        'paper-texture': 'var(--paper-texture)',
        'squircle-gradient': 'var(--gradient-squircle)',
        'squircle-gradient-active': 'var(--gradient-squircle-active)',
        'squircle-gradient-inactive': 'var(--gradient-squircle-inactive)',
        'profile-gradient': 'var(--gradient-profile)',
        'id-card-gradient': 'var(--gradient-id-card)',
      },
      backgroundSize: {
        paper: 'var(--paper-texture-size)',
      },
    },
  },
  plugins: [],
}
