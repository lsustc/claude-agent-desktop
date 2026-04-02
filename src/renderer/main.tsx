import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import { initTheme } from './components/ThemePicker'

// Apply saved theme (or Tokyo Night default)
initTheme()
// Always keep dark class for any remaining dark: Tailwind utilities
document.documentElement.classList.add('dark')

const root = document.getElementById('root')!
createRoot(root).render(<App />)
