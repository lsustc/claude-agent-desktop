import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/globals.css'

// Restore dark mode preference
const theme = localStorage.getItem('theme')
if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  document.documentElement.classList.add('dark')
}

const root = document.getElementById('root')!
createRoot(root).render(<App />)
