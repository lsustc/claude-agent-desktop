import { useEffect, useState } from 'react'

export type ThemeId = 'tokyo-night' | 'dracula' | 'catppuccin' | 'nord' | 'one-dark'

const THEMES: { id: ThemeId; name: string; bg: string; accent: string; text: string }[] = [
  { id: 'tokyo-night', name: 'Tokyo Night',  bg: '#1a1b26', accent: '#7aa2f7', text: '#a9b1d6' },
  { id: 'dracula',     name: 'Dracula',       bg: '#282a36', accent: '#bd93f9', text: '#f8f8f2' },
  { id: 'catppuccin',  name: 'Catppuccin',    bg: '#1e1e2e', accent: '#89b4fa', text: '#cdd6f4' },
  { id: 'nord',        name: 'Nord',          bg: '#2e3440', accent: '#88c0d0', text: '#d8dee9' },
  { id: 'one-dark',    name: 'One Dark Pro',  bg: '#282c34', accent: '#61afef', text: '#abb2bf' },
]

export function applyTheme(id: ThemeId) {
  document.documentElement.setAttribute('data-theme', id)
  localStorage.setItem('theme', id)
}

export function initTheme() {
  const saved = localStorage.getItem('theme') as ThemeId | null
  applyTheme(saved && THEMES.find(t => t.id === saved) ? saved : 'tokyo-night')
}

interface Props {
  onClose?: () => void
  inline?: boolean
}

export default function ThemePicker({ onClose, inline = false }: Props) {
  const [current, setCurrent] = useState<ThemeId>(
    (localStorage.getItem('theme') as ThemeId) || 'tokyo-night'
  )

  useEffect(() => {
    if (inline || !onClose) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [inline, onClose])

  const select = (id: ThemeId) => {
    setCurrent(id)
    applyTheme(id)
  }

  const content = (
    <div
      className={inline ? 'rounded-2xl overflow-hidden' : 'mx-4 rounded-2xl overflow-hidden shadow-2xl'}
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {!inline && (
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <span className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>/ theme</span>
          <button
            onClick={onClose}
            className="text-xs font-mono transition-colors"
            style={{ color: 'var(--text-faint)' }}
          >
            esc
          </button>
        </div>
      )}

      <div className={inline ? 'p-0 grid grid-cols-2 xl:grid-cols-3 gap-3' : 'p-4 flex gap-3 flex-wrap'}>
        {THEMES.map((theme) => {
          const active = theme.id === current
          return (
            <button
              key={theme.id}
              onClick={() => select(theme.id)}
              className={`flex ${inline ? 'items-center justify-between rounded-2xl px-4 py-4 border' : 'flex-col items-center gap-2 group'}`}
              style={inline ? {
                borderColor: active ? 'var(--accent)' : 'var(--border)',
                background: active ? 'color-mix(in srgb, var(--bg) 72%, transparent)' : 'transparent'
              } : undefined}
            >
              <div className={inline ? 'flex items-center gap-3 min-w-0' : ''}>
                <div
                  className="w-16 h-12 rounded-xl flex flex-col justify-end p-1.5 transition-all"
                  style={{
                    background: theme.bg,
                    border: active
                      ? `2px solid ${theme.accent}`
                      : '2px solid transparent',
                    boxShadow: active ? `0 0 12px ${theme.accent}44` : 'none',
                  }}
                >
                  <div className="space-y-0.5">
                    <div className="h-0.5 rounded-full w-full" style={{ background: theme.text, opacity: 0.6 }} />
                    <div className="h-0.5 rounded-full w-3/4" style={{ background: theme.accent, opacity: 0.8 }} />
                    <div className="h-0.5 rounded-full w-1/2" style={{ background: theme.text, opacity: 0.3 }} />
                  </div>
                </div>
                <span
                  className={`${inline ? 'text-xs font-mono truncate' : 'text-[10px] font-mono transition-colors whitespace-nowrap'}`}
                  style={{ color: active ? 'var(--accent)' : 'var(--text-dim)' }}
                >
                  {theme.name}
                </span>
              </div>
              {inline && active && (
                <span className="text-[10px] font-mono shrink-0" style={{ color: 'var(--accent)' }}>
                  active
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )

  if (inline) return content

  return (
    <>
      <div className="absolute inset-0 z-30" onClick={onClose} />
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 panel-slide-up">
        {content}
      </div>
    </>
  )
}
