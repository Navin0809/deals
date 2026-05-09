export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif']
      },
      boxShadow: {
        glass: '0 20px 70px rgba(15, 23, 42, 0.10)',
        lift: '0 10px 35px rgba(15, 23, 42, 0.12)'
      }
    }
  },
  plugins: []
};
