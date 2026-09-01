import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#f7f5ef',
        ink: '#19352f',
        forest: '#1f5c4a',
        mint: '#dff2e8',
        coral: '#ed765d',
        sun: '#f4c76b',
        stone: '#756f64'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Georgia', 'ui-serif', 'serif']
      },
      boxShadow: {
        card: '0 14px 40px rgba(31, 92, 74, 0.09)'
      }
    }
  },
  plugins: []
} satisfies Config
