/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Source Sans Pro', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      colors: {
        'fixie-light-dust': '#f8f7f4',
        'fixie-dust': '#edece3',
        'fixie-charcoal': '#1f1e1e',
        'fixie-ripe-salmon': '#fa7661',
        'fixie-fresh-salmon': '#de6350',
        'fixie-air': '#dbeef5',
        'fixie-light-gray': '#dbdbdd',
        'fixie-dark-gray': '#6d6c6c',
        'fixie-white': '#ffffff',
      },
    },
  },
  plugins: [],
};
