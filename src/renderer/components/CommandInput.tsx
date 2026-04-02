import { useRef, useState, useEffect } from 'react'

const COMMANDS = ['/new', '/history', '/settings']

interface Props {
  onSubmit: (input: string) => void
  onStop: () => void
  isLoading: boolean
  hasSession: boolean
  quickPrompts?: string[]
}

export default function CommandInput({ onSubmit, onStop, isLoading, hasSession, quickPrompts = [] }: Props) {
  const [value, setValue] = useState('')
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [value])

  useEffect(() => {
    if (value.startsWith('/') && value.length > 1) {
      const match = COMMANDS.find((c) => c.startsWith(value) && c !== value)
      setSuggestion(match || null)
    } else {
      setSuggestion(null)
    }
  }, [value])

  const submit = () => {
    const trimmed = value.trim()
    if (trimmed) {
      onSubmit(trimmed)
      setValue('')
      setSuggestion(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab' && suggestion) {
      e.preventDefault()
      setValue(suggestion)
      setSuggestion(null)
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (isLoading) { onStop(); return }
      submit()
    }
  }

  const isCommand = value.trim().startsWith('/')

  return (
    <div className="w-full max-w-3xl pointer-events-auto">
      {quickPrompts.length > 0 && !value.trim() && !isLoading && (
        <div className="mb-3 flex flex-wrap justify-center gap-2 px-3">
          {quickPrompts.slice(0, 3).map((prompt) => (
            <button
              key={prompt}
              onClick={() => onSubmit(prompt)}
              className="rounded-full px-3 py-1.5 text-xs font-mono transition-colors"
              style={{ border: '1px solid var(--border)', color: 'var(--text-dim)', background: 'var(--surface)' }}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}
      <div
        className="relative rounded-2xl transition-all duration-200 input-glow"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {/* Tab-completion ghost */}
        {suggestion && (
          <div className="absolute inset-0 flex items-center px-4 pointer-events-none select-none overflow-hidden">
            <span className="text-sm font-mono invisible whitespace-pre">{value}</span>
            <span className="text-sm font-mono" style={{ color: 'var(--text-faint)' }}>
              {suggestion.slice(value.length)}
            </span>
            <span className="text-xs ml-2" style={{ color: 'var(--text-faint)' }}>Tab</span>
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={hasSession ? 'describe a page, a stock, or a watchlist…' : 'start with /new to create a workspace…'}
          rows={1}
          autoFocus
          className="w-full bg-transparent resize-none outline-none text-sm font-mono leading-relaxed px-4 py-3 pr-14"
          style={{
            maxHeight: 160,
            color: isCommand ? 'var(--accent)' : 'var(--text)',
          }}
        />
        <style>{`textarea::placeholder { color: var(--text-faint); }`}</style>

        {/* Action button */}
        <div className="absolute right-3 bottom-2.5">
          {isLoading ? (
            <button
              onClick={onStop}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
              style={{ background: 'var(--border)' }}
              title="Stop"
            >
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--accent)' }} />
            </button>
          ) : value.trim() ? (
            <button
              onClick={submit}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
              style={{ background: 'var(--accent-dim)' }}
              title="Send (Enter)"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 10V2M6 2L2 6M6 2L10 6" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ) : null}
        </div>
      </div>

      {/* Status line */}
      <div className="flex items-center justify-between mt-1.5 px-1">
        <div className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>
          {isLoading && (
            <span className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
              thinking…
            </span>
          )}
        </div>
        <div className="text-xs font-mono space-x-3" style={{ color: 'var(--text-faint)' }}>
          <span>/new</span>
          <span>/history</span>
          <span>/settings</span>
        </div>
      </div>
    </div>
  )
}
