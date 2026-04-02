interface HistoryItem {
  id: string
  title: string
  updatedAt: string
}

interface Props {
  items: HistoryItem[]
  selectedId: string | null
  itemLabel: string
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export default function HistoryPanel({ items, selectedId, itemLabel, onSelect, onDelete, onClose }: Props) {
  return (
    <>
      <div className="absolute inset-0 z-30" onClick={onClose} />
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-full max-w-lg z-40 panel-slide-up">
        <div
          className="mx-4 rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <span className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>/ history</span>
            <button
              onClick={onClose}
              className="text-xs font-mono transition-colors"
              style={{ color: 'var(--text-faint)' }}
            >
              esc
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
                no {itemLabel} yet
              </div>
            ) : (
              items.map((item) => (
                <HistoryRow
                  key={item.id}
                  item={item}
                  isActive={item.id === selectedId}
                  onSelect={() => onSelect(item.id)}
                  onDelete={() => onDelete(item.id)}
                />
              ))
            )}
          </div>

          <div className="px-4 py-2" style={{ borderTop: '1px solid var(--border)' }}>
            <span className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>
              /new to create a new workspace
            </span>
          </div>
        </div>
      </div>
    </>
  )
}

function HistoryRow({ item, isActive, onSelect, onDelete }: {
  item: HistoryItem; isActive: boolean; onSelect: () => void; onDelete: () => void
}) {
  const date = item.updatedAt
    ? new Date(item.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : ''

  return (
    <div
      className="group flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors"
      style={{ background: isActive ? 'var(--bg)' : undefined }}
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--bg)' }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = '' }}
      onClick={onSelect}
    >
      <span className="text-[10px] font-mono shrink-0" style={{ color: isActive ? 'var(--accent)' : 'var(--text-faint)' }}>
        {isActive ? '▶' : '·'}
      </span>
      <span className="flex-1 text-xs font-mono truncate" style={{ color: 'var(--text)' }}>
        {item.title || 'untitled'}
      </span>
      <span className="text-[10px] font-mono shrink-0" style={{ color: 'var(--text-faint)' }}>{date}</span>
      <button
        className="opacity-0 group-hover:opacity-100 text-[10px] font-mono transition-all ml-1"
        style={{ color: 'var(--red)' }}
        onClick={(e) => { e.stopPropagation(); onDelete() }}
      >
        ✕
      </button>
    </div>
  )
}
