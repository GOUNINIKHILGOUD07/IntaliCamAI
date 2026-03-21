/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: 'var(--color-bg-base)',
          800: 'var(--color-bg-panel)',
          700: 'var(--color-border)',
          600: 'var(--color-border-light)',
        },
        primary: {
          DEFAULT: '#6366f1', // Indigo/Purple accent
          hover: '#4f46e5',
        },
        accent: '#eab308', // Yellow for warnings (Alerts Today)
        danger: '#dc2626', // Red for offline/threats
        safe: '#10b981', // Green for online/live
        safe_bg: 'rgba(16, 185, 129, 0.1)', // Green tint background
        danger_bg: 'rgba(220, 38, 38, 0.1)', // Red tint background
        text: {
          main: 'var(--color-text-main)',
          muted: 'var(--color-text-muted)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
