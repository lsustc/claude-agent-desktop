import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

export default {
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: 'inherit',
            a: { color: '#2563eb', textDecoration: 'underline', '&:hover': { color: '#1d4ed8' } },
            strong: { color: 'inherit' },
            h1: { color: 'inherit' },
            h2: { color: 'inherit' },
            h3: { color: 'inherit' },
            h4: { color: 'inherit' },
            code: { color: 'inherit' },
            blockquote: { color: 'inherit', borderLeftColor: '#d1d5db' },
            hr: { borderColor: '#e5e7eb' },
            'ol > li::marker': { color: '#6b7280' },
            'ul > li::marker': { color: '#6b7280' },
          }
        },
        invert: {
          css: {
            a: { color: '#60a5fa', '&:hover': { color: '#93bbfd' } },
            blockquote: { borderLeftColor: '#4b5563' },
            hr: { borderColor: '#374151' },
            'ol > li::marker': { color: '#9ca3af' },
            'ul > li::marker': { color: '#9ca3af' },
          }
        }
      }
    }
  },
  plugins: [typography]
} satisfies Config
