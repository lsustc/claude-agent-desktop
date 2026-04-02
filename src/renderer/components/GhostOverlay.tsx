import { useEffect, useRef, useState } from 'react'
import type { StreamEvent } from '../../shared/types'

interface GhostThought {
  id: string
  text: string
  kind: 'thinking' | 'tool'
  exiting: boolean
}

interface Props {
  thoughts: StreamEvent[]
  isLoading: boolean
}

function toolLabel(name: string): string {
  const n = name.replace(/^mcp__[^_]+__/, '')
  const map: Record<string, string> = {
    Bash: 'running command',
    Read: 'reading file',
    Write: 'writing file',
    Edit: 'editing file',
    Glob: 'searching files',
    Grep: 'searching content',
    WebSearch: 'searching web',
    WebFetch: 'fetching page',
    show_widget: 'building visualization',
    read_me: 'loading module docs',
  }
  return map[n] || `calling ${n}`
}

function useElapsedSeconds(active: boolean) {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    if (active) {
      startRef.current = Date.now()
      setElapsed(0)
      const id = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startRef.current!) / 1000))
      }, 1000)
      return () => clearInterval(id)
    } else {
      startRef.current = null
      setElapsed(0)
    }
  }, [active])

  return elapsed
}

export default function GhostOverlay({ thoughts, isLoading }: Props) {
  const [ghosts, setGhosts] = useState<GhostThought[]>([])
  const [dotFrame, setDotFrame] = useState(0)
  const seenIds = useRef(new Set<string>())
  const idCounter = useRef(0)
  const elapsed = useElapsedSeconds(isLoading)

  // Animate the "thinking…" dots
  useEffect(() => {
    if (!isLoading) return
    const id = setInterval(() => setDotFrame((f) => (f + 1) % 4), 400)
    return () => clearInterval(id)
  }, [isLoading])

  useEffect(() => {
    if (!isLoading) {
      setGhosts((prev) => prev.map((g) => ({ ...g, exiting: true })))
      const t = setTimeout(() => {
        setGhosts([])
        seenIds.current.clear()
      }, 600)
      return () => clearTimeout(t)
    }

    thoughts.forEach((evt) => {
      const key = evt.type === 'thinking'
        ? `thinking-${(evt as any).thinking?.slice(0, 40)}`
        : `tool-${(evt as any).toolName}-${JSON.stringify((evt as any).toolInput)?.slice(0, 40)}`

      if (seenIds.current.has(key)) return
      seenIds.current.add(key)

      const id = String(++idCounter.current)
      let text = ''

      if (evt.type === 'thinking' && (evt as any).thinking) {
        const raw = (evt as any).thinking as string
        text = raw.replace(/\n+/g, ' ').trim().slice(0, 120)
        if (raw.length > 120) text += '…'
      } else if (evt.type === 'tool_use') {
        const toolName = (evt as any).toolName || 'unknown'
        const input = (evt as any).toolInput || {}
        const label = toolLabel(toolName)
        const ctx = input.command || input.file_path || input.path || input.query || input.url || ''
        text = ctx ? `${label} — ${String(ctx).slice(0, 60)}` : label
      }

      if (!text) return

      const ghost: GhostThought = { id, text, kind: evt.type === 'thinking' ? 'thinking' : 'tool', exiting: false }

      setGhosts((prev) => {
        const next = [...prev, ghost]
        if (next.length > 4) {
          return next.map((g, i) => i < next.length - 4 ? { ...g, exiting: true } : g)
        }
        return next
      })

      // Stay for 10s before fading
      setTimeout(() => {
        setGhosts((prev) => prev.map((g) => g.id === id ? { ...g, exiting: true } : g))
        setTimeout(() => setGhosts((prev) => prev.filter((g) => g.id !== id)), 600)
      }, 10000)
    })
  }, [thoughts, isLoading])

  if (!isLoading) return null

  const dots = ['', '.', '..', '...'][dotFrame]
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  const timeStr = mins > 0
    ? `${mins}:${String(secs).padStart(2, '0')}`
    : `${secs}s`

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      <div className="absolute top-6 left-6 right-6 flex items-start justify-between gap-6">
        {/* Ghost thoughts */}
        <div className="max-w-md space-y-2">
          {ghosts.map((ghost) => (
            <div
              key={ghost.id}
              className={`flex items-start gap-2 rounded-xl px-3 py-2 backdrop-blur-[1px] ${ghost.exiting ? 'ghost-thought-exit' : 'ghost-thought'}`}
              style={{
                background: 'color-mix(in srgb, var(--bg) 72%, transparent)',
                border: '1px solid var(--border)'
              }}
            >
              <span
                className="mt-0.5 text-[10px] font-mono shrink-0"
                style={{ color: ghost.kind === 'thinking' ? 'var(--accent-dim)' : 'var(--comment)' }}
              >
                {ghost.kind === 'thinking' ? '◈' : '◇'}
              </span>
              <p
                className="text-xs font-mono leading-relaxed"
                style={{ color: ghost.kind === 'thinking' ? 'var(--text-dim)' : 'var(--comment)' }}
              >
                {ghost.text}
              </p>
            </div>
          ))}
        </div>

        {/* Status bar — always visible while loading */}
        <div
          className="flex items-center gap-4 px-4 py-2 rounded-full text-[11px] font-mono shrink-0"
          style={{
            background: 'color-mix(in srgb, var(--surface) 90%, transparent)',
            border: '1px solid var(--border)',
            color: 'var(--text-faint)',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0"
            style={{ background: 'var(--accent)' }}
          />

          <span style={{ color: 'var(--text-dim)', display: 'inline-block', width: '7ch' }}>
            thinking{dots}
          </span>

          <span style={{ color: 'var(--border-hi)' }}>·</span>

          <span style={{ display: 'inline-block', width: '4ch', textAlign: 'right' }}>{timeStr}</span>
        </div>
      </div>
    </div>
  )
}
