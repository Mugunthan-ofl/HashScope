/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        theme: {
          bg: 'var(--bg-app)',
          surface: 'var(--bg-surface)',
          'surface-hover': 'var(--bg-surface-hover)',
          'surface-sec': 'var(--bg-surface-secondary)',
          input: 'var(--bg-input)',
          sidebar: 'var(--bg-sidebar)',
          header: 'var(--bg-header)',
          tableheader: 'var(--bg-table-header)',
          border: 'var(--border-color)',
          'border-subtle': 'var(--border-subtle)',
          text: 'var(--text-primary)',
          'text-sec': 'var(--text-secondary)',
          'text-muted': 'var(--text-muted)',
          accent: 'var(--accent)',
          'accent-hover': 'var(--accent-hover)',
          'accent-bg': 'var(--accent-bg)',
          'accent-border': 'var(--accent-border)',
          'accent-text': 'var(--accent-text)',
          success: 'var(--success)',
          'success-bg': 'var(--success-bg)',
          'success-border': 'var(--success-border)',
          warning: 'var(--warning)',
          'warning-bg': 'var(--warning-bg)',
          'warning-border': 'var(--warning-border)',
          'warning-text': 'var(--warning-text)',
          error: 'var(--error)',
          'error-bg': 'var(--error-bg)',
          'error-border': 'var(--error-border)',
          'error-text': 'var(--error-text)',
        },
        brand: {
          bg: '#0a0f11',
          card: '#101719',
          'card-hover': '#141e20',
          border: '#1b282a',
          mint: '#10b981',
          'mint-bright': '#00f5a0',
          'mint-dark': '#092e26',
          'mint-light': '#34d399',
        },
      },
      boxShadow: {
        'theme-lg': '0 10px 25px -5px var(--shadow-color), 0 8px 10px -6px var(--shadow-color)',
        'theme-md': '0 4px 12px 0 var(--shadow-color)',
      }
    },
  },
  plugins: [],
}
