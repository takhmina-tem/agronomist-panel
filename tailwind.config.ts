import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f3faf5',
          100: '#e1f5e7',
          200: '#c4eace',
          300: '#97d8ac',
          400: '#63bd81',
          500: '#3f9f61',
          600: '#2f804c',
          700: '#28653f',
          800: '#245134',
          900: '#1f432d'
        }
      },
      boxShadow: {
        soft: '0 10px 35px rgba(15, 23, 42, 0.08)'
      }
    },
  },
  plugins: [],
};

export default config;
