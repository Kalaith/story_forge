export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Story-focused color palette
        story: {
          primary: '#2563eb',
          secondary: '#7c3aed',
          accent: '#059669',
        },
      },
      fontFamily: {
        // Reading-focused typography
        serif: ['Georgia', 'serif'],
        mono: ['Monaco', 'monospace'],
      },
    },
  },
  plugins: [],
}