/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        desktop: {
          bg: '#090a0f',
          surface: '#12141c',
          card: '#181b24',
          border: '#262a36',
          hover: '#222634',
          muted: '#71788e',
          text: '#f1f3f7',
          accent: '#3b82f6',
          danger: '#ef4444',
          success: '#10b981'
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'Menlo', 'Consolas', 'monospace']
      },
      transitionDuration: {
        '150': '150ms',
      }
    },
  },
  plugins: [],
}
