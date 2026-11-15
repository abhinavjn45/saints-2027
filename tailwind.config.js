/** Tailwind build config. The compiled output (assets/styles/tailwind.css) is committed,
 *  so the site needs no build step to deploy. Rebuild with `npm run build:css`. */
module.exports = {
  content: ['./*.html', './assets/js/**/*.js'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef3fb', 100: '#dce6f5', 200: '#b9cceb', 300: '#8aa8d8', 400: '#5a80c0',
          500: '#3a5fa3', 600: '#25447f', 700: '#1a3466', 800: '#122650', 900: '#0c1c3d', 950: '#081330',
        },
        accent: { 400: '#d9b44a', 500: '#c49a2c', 600: '#a67f1d' },
        dark: '#0f0e17',
      },
      fontFamily: {
        sans:    ['Inter', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
      },
    },
  },
};
