export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        kadosh: {
          black: 'var(--kadosh-black)',
          white: 'var(--kadosh-white)',
          gray: 'var(--kadosh-gray)',
          taupe: 'var(--kadosh-taupe)',
        },
      },
    },
  },
  plugins: [],
};
