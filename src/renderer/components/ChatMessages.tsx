import type { StreamEvent } from '../../shared/types'
import MarkdownMessage from './MarkdownMessage'

interface Props {
  messages: StreamEvent[]
  isLoading: boolean
  compact?: boolean
}

export default function ChatMessages({ messages, isLoading, compact }: Props) {
  return (
    <div className={compact ? 'space-y-2' : 'space-y-6'}>
      {messages.map((event, i) => (
        <MessageItem key={i} event={event} compact={compact} />
      ))}
      {isLoading && !compact && (
        <div className="flex items-center gap-1.5 py-2">
          {[0, 200, 400].map((delay) => (
            <span
              key={delay}
              className="w-1 h-1 rounded-full animate-pulse"
              style={{ background: 'var(--text-faint)', animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function MessageItem({ event, compact }: { event: StreamEvent; compact?: boolean }) {
  if ((event as any)._isUser && event.type === 'text') {
    return (
      <div className="flex justify-end">
        <div
          className={`max-w-[85%] rounded-2xl rounded-br-sm ${compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-3 text-sm'}`}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="whitespace-pre-wrap font-mono leading-relaxed" style={{ color: 'var(--text)' }}>
            {event.content}
          </p>
        </div>
      </div>
    )
  }

  if (event.type === 'text' && event.content) {
    return (
      <div className={compact ? 'text-xs opacity-60' : ''}>
        <MarkdownMessage content={event.content} />
      </div>
    )
  }

  if (event.type === 'widget' && event.isStreaming) {
    return (
      <div className="flex items-center gap-2 text-xs font-mono" style={{ color: 'var(--text-dim)' }}>
        <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
        building visualization…
      </div>
    )
  }

  if (event.type === 'thinking' && event.thinking) {
    return (
      <div
        className={`rounded-2xl ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}
        style={{
          background: 'color-mix(in srgb, var(--surface) 78%, transparent)',
          border: '1px solid var(--border)'
        }}
      >
        <div className="mb-1 text-[10px] font-mono uppercase tracking-[0.16em]" style={{ color: 'var(--text-faint)' }}>
          thinking
        </div>
        <p className={`${compact ? 'text-[11px]' : 'text-xs'} font-mono leading-relaxed`} style={{ color: 'var(--text-dim)' }}>
          {event.thinking}
        </p>
      </div>
    )
  }

  if (event.type === 'tool_use') {
    return (
      <div
        className={`rounded-2xl ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}
        style={{
          background: 'color-mix(in srgb, var(--surface) 72%, transparent)',
          border: '1px solid var(--border)'
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-mono uppercase tracking-[0.16em]" style={{ color: 'var(--text-faint)' }}>
            tool
          </span>
          <span className="text-[10px] font-mono" style={{ color: 'var(--accent)' }}>
            {event.toolName || 'unknown'}
          </span>
        </div>
        {event.toolInput ? (
          <pre
            className={`mt-2 whitespace-pre-wrap break-words ${compact ? 'text-[11px]' : 'text-xs'} font-mono leading-relaxed`}
            style={{ color: 'var(--comment)' }}
          >
            {JSON.stringify(event.toolInput, null, 2)}
          </pre>
        ) : null}
      </div>
    )
  }

  if (event.type === 'result') {
    return (
      <div
        className="flex items-center gap-3 text-xs font-mono pt-3"
        style={{ color: 'var(--text-faint)', borderTop: '1px solid var(--border)' }}
      >
        <span style={{ color: 'var(--green)' }}>◆ done</span>
        {event.cost !== undefined && event.cost > 0 && <span>${event.cost.toFixed(4)}</span>}
        {event.duration !== undefined && <span>{(event.duration / 1000).toFixed(1)}s</span>}
      </div>
    )
  }

  if (event.type === 'error') {
    return (
      <div
        className="px-3 py-2 rounded-lg text-xs font-mono"
        style={{ border: '1px solid var(--red)', color: 'var(--red)', opacity: 0.8 }}
      >
        ✗ {event.error}
      </div>
    )
  }

  return null
}
