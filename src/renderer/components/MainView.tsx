import { useRef, useEffect, useState, useCallback } from 'react'
import type { AppView } from '../App'
import type { useRuntime } from '../hooks/useRuntime'
import CommandInput from './CommandInput'
import ChatMessages from './ChatMessages'
import WidgetRenderer from './WidgetRenderer'
import type { ArtifactKind, RuntimeArtifact, StreamEvent, WorkspaceKind } from '../../shared/types'

type RuntimeState = ReturnType<typeof useRuntime>

interface Props {
  runtime: RuntimeState
  view: AppView
  setView: (v: AppView) => void
}

export default function MainView({ runtime, view: _view, setView }: Props) {
  const chat = runtime.chat
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const [chatCollapsed, setChatCollapsed] = useState(true)
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null)
  const [editingWorkspaceTitle, setEditingWorkspaceTitle] = useState('')
  const [isSavingArtifact, setIsSavingArtifact] = useState(false)

  const lastGeneratedWidget = [...chat.messages].reverse().find(
    (m): m is StreamEvent & { type: 'widget' } =>
      m.type === 'widget' && !!m.widgetCode && !m.isStreaming
  )

  const stageWidget = lastGeneratedWidget
    ? {
        key: `${lastGeneratedWidget.widgetTitle || 'live'}-${chat.messages.length}`,
        title: lastGeneratedWidget.widgetTitle || 'widget',
        code: lastGeneratedWidget.widgetCode,
        loadingMessages: lastGeneratedWidget.loadingMessages || ['Rendering...'],
        sourceLabel: 'live result'
      }
    : runtime.selectedArtifact?.widgetCode
      ? {
          key: `${runtime.selectedArtifact.id}-${runtime.selectedArtifact.updatedAt}`,
          title: runtime.selectedArtifact.title,
          code: runtime.selectedArtifact.widgetCode,
          loadingMessages: ['Loading saved page...'],
          sourceLabel: '已保存功能页'
        }
      : null

  const chatMessages = chat.messages.filter((m) => m.type !== 'widget')
  const latestAssistantText = [...chatMessages].reverse().find((message) => {
    if (message.type !== 'text' || !message.content?.trim()) return false
    return !(message as StreamEvent & { _isUser?: boolean })._isUser
  })?.content?.trim()
  const hasWidget = !!stageWidget?.code
  const hasMessages = chatMessages.length > 0
  const canSaveLiveStage = !!lastGeneratedWidget?.widgetCode && !!runtime.selectedWorkspace

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [chatMessages.length, chat.isLoading])

  useEffect(() => {
    if (!editingWorkspaceId) return

    const workspace = runtime.workspaces.find((item) => item.id === editingWorkspaceId)
    if (!workspace) {
      setEditingWorkspaceId(null)
      setEditingWorkspaceTitle('')
    }
  }, [editingWorkspaceId, runtime.workspaces])

  const handleCommand = useCallback(async (input: string) => {
    const trimmed = input.trim()

    if (trimmed === '/new') {
      await runtime.createWorkspace()
      return
    }

    if (trimmed === '/settings' || trimmed === '/setting' || trimmed === '/theme') {
      setView('settings')
      return
    }

    if (trimmed === '/history') {
      if (runtime.workspaces[0]) {
        await runtime.selectWorkspace(runtime.workspaces[0].id)
      }
      return
    }

    if (trimmed.startsWith('/')) return

    await runtime.sendPrompt(trimmed)
  }, [runtime, setView])

  const handleWorkspaceEditStart = useCallback((workspaceId: string, title: string) => {
    setEditingWorkspaceId(workspaceId)
    setEditingWorkspaceTitle(title)
  }, [])

  const handleWorkspaceEditCancel = useCallback(() => {
    setEditingWorkspaceId(null)
    setEditingWorkspaceTitle('')
  }, [])

  const handleWorkspaceEditCommit = useCallback(async (workspaceId: string) => {
    const current = runtime.workspaces.find((item) => item.id === workspaceId)
    const trimmed = editingWorkspaceTitle.trim()

    if (!current) {
      handleWorkspaceEditCancel()
      return
    }

    if (!trimmed || trimmed === current.title) {
      handleWorkspaceEditCancel()
      return
    }

    await runtime.renameWorkspace(workspaceId, trimmed)
    handleWorkspaceEditCancel()
  }, [editingWorkspaceTitle, handleWorkspaceEditCancel, runtime])

  const handleSaveStage = useCallback(async () => {
    if (!runtime.selectedWorkspace || !lastGeneratedWidget?.widgetCode) return

    const defaultTitle = lastGeneratedWidget.widgetTitle || `${runtime.selectedWorkspace.title}功能页`
    const title = window.prompt('功能页标题', defaultTitle)?.trim()
    if (!title) return

    setIsSavingArtifact(true)
    try {
      await runtime.saveArtifact({
        title,
        kind: inferArtifactKind(runtime.selectedWorkspace.kind),
        summary: buildArtifactSummary(latestAssistantText, title),
        prompt: latestAssistantText || title,
        tags: buildArtifactTags(runtime.selectedWorkspace.kind),
        widgetCode: lastGeneratedWidget.widgetCode
      })
    } finally {
      setIsSavingArtifact(false)
    }
  }, [lastGeneratedWidget, latestAssistantText, runtime])

  return (
    <div className="flex w-full h-full relative overflow-hidden" style={{ background: 'var(--bg)' }}>
      <div
        className={`h-full flex flex-col border-r overflow-hidden transition-all duration-300 ease-out ${
          chatCollapsed ? 'w-0 min-w-0 opacity-0' : 'w-[34%] min-w-[360px] max-w-[560px] opacity-100'
        }`}
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="px-6 pt-12 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="text-[11px] font-mono uppercase tracking-[0.22em]" style={{ color: 'var(--text-faint)' }}>
            dialogue
          </div>
          <div className="mt-2 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-2xl font-semibold tracking-tight truncate" style={{ color: 'var(--text)' }}>
                {runtime.selectedWorkspace?.title || '金融工作台'}
              </div>
              <div className="mt-2 text-sm leading-6" style={{ color: 'var(--text-dim)' }}>
                {runtime.selectedWorkspace?.summary || '围绕个股、行业、观察列表和复盘结果展开对话。'}
              </div>
            </div>
            {runtime.selectedWorkspace?.focus ? (
              <span className="shrink-0 rounded-full px-3 py-1 text-[11px] font-mono" style={{ border: '1px solid var(--border)', color: 'var(--accent)' }}>
                {runtime.selectedWorkspace.focus}
              </span>
            ) : null}
          </div>
          {runtime.selectedWorkspace?.pinnedSymbols?.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {runtime.selectedWorkspace.pinnedSymbols.map((symbol) => (
                <span
                  key={symbol}
                  className="rounded-full px-2.5 py-1 text-[11px] font-mono"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-dim)' }}
                >
                  {symbol}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-6 py-6">
          {!hasMessages && !chat.isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <div className="text-5xl font-semibold tracking-tight" style={{ color: 'var(--border-hi)' }}>
                CHAT
              </div>
              <div className="mt-3 max-w-md text-sm leading-7" style={{ color: 'var(--text-dim)' }}>
                左边专门承接对话、结论和解释；右边只负责舞台化展示图表、行业页和选股页。
              </div>
            </div>
          ) : (
            <ChatMessages messages={chatMessages} isLoading={chat.isLoading} />
          )}
        </div>

        <div className="px-4 pb-6 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <CommandInput
            onSubmit={handleCommand}
            onStop={chat.stopGeneration}
            isLoading={chat.isLoading}
            hasSession={!!runtime.selectedWorkspace}
            quickPrompts={runtime.selectedWorkspace?.suggestedPrompts || []}
          />
        </div>
      </div>

      <div
        className="w-[164px] shrink-0 flex flex-col pt-10 px-2"
        style={{ borderRight: '1px solid var(--border)', background: 'color-mix(in srgb, var(--bg) 97%, black 3%)' }}
      >
        <div className="flex items-center justify-between px-2 pb-3">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-[0.22em]" style={{ color: 'var(--text-faint)' }}>
              runtime
            </div>
            <div className="mt-1 text-xs" style={{ color: 'var(--text-dim)' }}>tree</div>
          </div>
          <RailIconButton
            label={chatCollapsed ? '>>' : '<<'}
            hint={chatCollapsed ? 'expand dialogue' : 'collapse dialogue'}
            active={!chatCollapsed}
            onClick={() => setChatCollapsed((value) => !value)}
          />
        </div>

        <div className="px-2 pb-3">
          <button
            onClick={() => runtime.createWorkspace()}
            className="w-full rounded-xl px-2.5 py-2 text-left transition-colors"
            style={{ border: '1px solid var(--border)', background: 'color-mix(in srgb, var(--surface) 84%, transparent)', color: 'var(--text)' }}
          >
            <div className="flex items-center gap-2">
              <TreeGlyph kind="new" active />
              <span className="text-[11px] font-mono uppercase tracking-[0.12em]" style={{ color: 'var(--accent)' }}>new</span>
            </div>
          </button>
        </div>

        <RailSection
          title="工作台"
          items={runtime.workspaces}
          selectedId={runtime.selectedWorkspaceId}
          onSelect={(id) => runtime.selectWorkspace(id)}
          onReorder={(sourceId, targetId) => runtime.reorderWorkspaces(sourceId, targetId)}
          editingId={editingWorkspaceId}
          editingValue={editingWorkspaceTitle}
          onEditValueChange={setEditingWorkspaceTitle}
          onStartEdit={(item) => handleWorkspaceEditStart(item.id, item.title)}
          onCommitEdit={handleWorkspaceEditCommit}
          onCancelEdit={handleWorkspaceEditCancel}
          getMeta={(item) => item.focus}
          getIcon={(item) => <TreeGlyph kind={item.kind} active={item.id === runtime.selectedWorkspaceId} />}
          onDelete={(id) => {
            const target = runtime.workspaces.find((item) => item.id === id)
            if (!target) return
            if (!window.confirm(`删除工作台“${target.title}”？`)) return
            runtime.deleteWorkspace(id)
          }}
        />

        <RailSection
          title="功能页"
          items={runtime.selectedWorkspace?.artifacts || []}
          selectedId={runtime.selectedArtifactId}
          onSelect={(id) => runtime.selectArtifact(id)}
          onReorder={(sourceId, targetId) => runtime.reorderArtifacts(sourceId, targetId)}
          getMeta={(item) => (item as RuntimeArtifact).kind.replace('_', ' ')}
          getIcon={(item) => <TreeGlyph kind={(item as RuntimeArtifact).kind} active={item.id === runtime.selectedArtifactId} />}
        />

        <div className="mt-auto pt-4 pb-6 px-2">
          <button
            onClick={() => setView('settings')}
            className="w-full rounded-xl px-2.5 py-2 text-left transition-colors"
            style={{ border: '1px solid var(--border)', color: 'var(--text-dim)', background: 'transparent' }}
          >
            <div className="flex items-center gap-2">
              <TreeGlyph kind="settings" active={false} />
              <span className="text-[11px] font-mono uppercase tracking-[0.12em]">settings</span>
            </div>
          </button>
        </div>
      </div>

      <div className="flex-1 min-w-0 relative overflow-hidden flex flex-col">
        <div className="px-6 pt-12 pb-4 flex items-start justify-between gap-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="min-w-0">
            <div className="text-[11px] font-mono uppercase tracking-[0.22em]" style={{ color: 'var(--text-faint)' }}>
              stage
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight truncate" style={{ color: 'var(--text)' }}>
              {stageWidget?.title || runtime.selectedArtifact?.title || '结果舞台'}
            </div>
            <div className="mt-2 text-sm leading-6" style={{ color: 'var(--text-dim)' }}>
              {runtime.selectedArtifact?.summary || '让 Agent 在这里生成页面、图表、行业链路和观察列表。'}
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            {canSaveLiveStage ? (
              <button
                type="button"
                onClick={() => void handleSaveStage()}
                disabled={isSavingArtifact}
                className="rounded-full px-3 py-1 text-[11px] font-mono transition-colors disabled:opacity-50"
                style={{
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  background: 'color-mix(in srgb, var(--surface) 86%, transparent)'
                }}
              >
                {isSavingArtifact ? '保存中...' : '保存为功能页'}
              </button>
            ) : null}
            {stageWidget?.sourceLabel ? (
              <span className="rounded-full px-3 py-1 text-[11px] font-mono" style={{ border: '1px solid var(--border)', color: 'var(--accent)' }}>
                {stageWidget.sourceLabel}
              </span>
            ) : null}
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden">
          {(hasWidget || (chat.isLoading && !hasWidget)) && (
            <div className="absolute inset-0 overflow-hidden">
              {hasWidget && stageWidget && (
                <div className="absolute inset-0 overflow-auto">
                  <WidgetRenderer
                    key={stageWidget.key}
                    title={stageWidget.title}
                    widgetCode={stageWidget.code}
                    isStreaming={false}
                    loadingMessages={stageWidget.loadingMessages}
                    fullscreen
                  />
                </div>
              )}
            </div>
          )}

          {!hasWidget && !chat.isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
              <div className="text-6xl font-semibold tracking-tight" style={{ color: 'var(--border-hi)' }}>
                STAGE
              </div>
              <div className="mt-3 max-w-xl text-sm leading-7" style={{ color: 'var(--text-dim)' }}>
                右边只负责承接可视化结果。让 Agent 生成一个个股讲解页、行业 F10 或选股列表，它们都会出现在这里。
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function inferArtifactKind(kind: WorkspaceKind): ArtifactKind {
  if (kind === 'industry') return 'industry_map'
  if (kind === 'watchlist') return 'watchlist'
  if (kind === 'stock') return 'stock_explain'
  return 'dashboard'
}

function buildArtifactSummary(latestAssistantText: string | undefined, title: string): string {
  const cleaned = latestAssistantText?.replace(/\s+/g, ' ').trim()
  if (!cleaned) {
    return `${title}，已从当前结果舞台保存。`
  }

  if (cleaned.length <= 72) {
    return cleaned
  }

  return `${cleaned.slice(0, 72)}...`
}

function buildArtifactTags(kind: WorkspaceKind): string[] {
  if (kind === 'industry') return ['industry', 'saved']
  if (kind === 'watchlist') return ['watchlist', 'saved']
  if (kind === 'stock') return ['stock', 'saved']
  return ['dashboard', 'saved']
}

function RailIconButton({
  label,
  hint,
  active,
  onClick
}: {
  label: string
  hint: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={hint}
      className="w-11 h-11 rounded-2xl flex flex-col items-center justify-center transition-colors"
      style={{
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
        background: active ? 'var(--surface)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-dim)'
      }}
    >
      <span className="text-[11px] font-mono">{label}</span>
    </button>
  )
}

function RailSection<T extends { id: string; title: string }>({
  title,
  items,
  selectedId,
  onSelect,
  onReorder,
  editingId,
  editingValue,
  onEditValueChange,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  getMeta,
  getIcon,
  onDelete
}: {
  title: string
  items: T[]
  selectedId: string | null
  onSelect: (id: string) => void
  onReorder?: (sourceId: string, targetId: string) => void | Promise<void>
  editingId?: string | null
  editingValue?: string
  onEditValueChange?: (value: string) => void
  onStartEdit?: (item: T) => void
  onCommitEdit?: (id: string) => void | Promise<void>
  onCancelEdit?: () => void
  getMeta: (item: T) => string
  getIcon: (item: T) => JSX.Element
  onDelete?: (id: string) => void
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  return (
    <div className="px-2 pb-4">
      <div className="px-1 pb-1.5 text-[10px] font-mono uppercase tracking-[0.16em]" style={{ color: 'var(--text-faint)' }}>
        {title}
      </div>
      <div className="space-y-0.5">
        {items.length === 0 ? (
          <div
            className="rounded-xl px-2 py-3 text-[10px] font-mono"
            style={{ border: '1px dashed var(--border)', color: 'var(--text-faint)' }}
          >
            no items
          </div>
        ) : (
          items.map((item) => {
            const isActive = item.id === selectedId
            const isEditing = item.id === editingId
            const isDragTarget = item.id === dragOverId && item.id !== draggingId
            return (
              <div
                key={item.id}
                draggable={!!onReorder && !isEditing}
                onDragStart={(event) => {
                  if (!onReorder || isEditing) return
                  event.dataTransfer.effectAllowed = 'move'
                  event.dataTransfer.setData('text/plain', item.id)
                  setDraggingId(item.id)
                }}
                onDragOver={(event) => {
                  if (!onReorder || isEditing || draggingId === item.id) return
                  event.preventDefault()
                  if (dragOverId !== item.id) {
                    setDragOverId(item.id)
                  }
                }}
                onDrop={(event) => {
                  if (!onReorder || !draggingId || draggingId === item.id) return
                  event.preventDefault()
                  void onReorder(draggingId, item.id)
                  setDraggingId(null)
                  setDragOverId(null)
                }}
                onDragEnd={() => {
                  setDraggingId(null)
                  setDragOverId(null)
                }}
                className="group w-full rounded-xl px-2 py-2 text-left transition-colors"
                style={{
                  border: isDragTarget
                    ? '1px solid color-mix(in srgb, var(--accent) 68%, var(--border))'
                    : `1px solid ${isActive ? 'color-mix(in srgb, var(--accent) 48%, var(--border))' : 'transparent'}`,
                  background: isDragTarget
                    ? 'color-mix(in srgb, var(--accent) 10%, var(--surface))'
                    : isActive
                      ? 'color-mix(in srgb, var(--surface) 84%, transparent)'
                      : 'transparent',
                  cursor: onReorder && !isEditing ? 'grab' : 'default',
                  opacity: draggingId === item.id ? 0.64 : 1
                }}
              >
                <div className="flex items-start gap-2">
                  <div className="pt-0.5 shrink-0">
                    {getIcon(item)}
                  </div>
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <input
                        autoFocus
                        value={editingValue || ''}
                        onChange={(event) => onEditValueChange?.(event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                        onDoubleClick={(event) => event.stopPropagation()}
                        onBlur={() => void onCommitEdit?.(item.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            void onCommitEdit?.(item.id)
                            return
                          }
                          if (event.key === 'Escape') {
                            event.preventDefault()
                            onCancelEdit?.()
                          }
                        }}
                        className="w-full rounded-lg px-2 py-1 text-xs font-medium outline-none"
                        style={{
                          border: '1px solid color-mix(in srgb, var(--accent) 42%, var(--border))',
                          background: 'color-mix(in srgb, var(--surface) 92%, transparent)',
                          color: 'var(--text)'
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelect(item.id)}
                        onDoubleClick={() => onStartEdit?.(item)}
                        className="block w-full text-left"
                      >
                        <div className="text-xs font-medium truncate" style={{ color: isActive ? 'var(--text)' : 'var(--text-dim)' }}>
                          {item.title}
                        </div>
                        <div className="mt-0.5 text-[10px] leading-4 truncate" style={{ color: isActive ? 'var(--accent)' : 'var(--text-faint)' }}>
                          {getMeta(item)}
                        </div>
                      </button>
                    )}
                  </div>
                  {onDelete && !isEditing && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onDelete(item.id)
                      }}
                      className="shrink-0 w-4 h-4 rounded flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                      style={{ color: 'var(--text-faint)' }}
                      title="删除工作台"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function TreeGlyph({
  kind,
  active
}: {
  kind: WorkspaceKind | RuntimeArtifact['kind'] | 'settings' | 'new'
  active: boolean
}) {
  const color = active ? 'var(--accent)' : 'var(--text-faint)'

  if (kind === 'home' || kind === 'dashboard') {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M2 5.5L6 2L10 5.5V10H7.4V7.6H4.6V10H2V5.5Z" stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    )
  }

  if (kind === 'industry' || kind === 'industry_map') {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M2 9.5H10M3 9.5V5.5M6 9.5V2.5M9 9.5V4" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    )
  }

  if (kind === 'watchlist') {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M2.5 3H9.5M2.5 6H9.5M2.5 9H7.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    )
  }

  if (kind === 'stock' || kind === 'stock_explain') {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M2 9L4.5 6.5L6.5 8L10 4.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (kind === 'briefing') {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <rect x="2.2" y="2.2" width="7.6" height="7.6" rx="1.6" stroke={color} strokeWidth="1.2" />
        <path d="M4 4.4H8M4 6.1H8M4 7.8H6.8" stroke={color} strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    )
  }

  if (kind === 'settings') {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M6 3.9A2.1 2.1 0 1 0 6 8.1A2.1 2.1 0 0 0 6 3.9Z" stroke={color} strokeWidth="1.2" />
        <path d="M6 1.6V2.3M6 9.7V10.4M10.4 6H9.7M2.3 6H1.6M9.12 2.88L8.62 3.38M3.38 8.62L2.88 9.12M9.12 9.12L8.62 8.62M3.38 3.38L2.88 2.88" stroke={color} strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M6 2V10M2 6H10" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
