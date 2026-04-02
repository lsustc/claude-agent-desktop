import { useState, useEffect } from 'react'

const ALL_TOOLS = [
  { group: 'file system', tools: ['Read', 'Write', 'Edit', 'Glob', 'Grep'] },
  { group: 'execution',   tools: ['Bash'] },
  { group: 'web',         tools: ['WebSearch', 'WebFetch'] },
  { group: 'generative ui', tools: ['mcp__generative-ui__read_me', 'mcp__generative-ui__show_widget'] }
]

export default function ToolPermissions() {
  const [allowed, setAllowed] = useState<string[]>([])

  useEffect(() => {
    if (!window.electronAPI) return
    window.electronAPI.getConfig('allowedTools').then((t: unknown) => setAllowed((t as string[]) || []))
  }, [])

  const toggle = async (tool: string) => {
    if (!window.electronAPI) return
    const updated = allowed.includes(tool) ? allowed.filter((t) => t !== tool) : [...allowed, tool]
    setAllowed(updated)
    await window.electronAPI.setConfig('allowedTools', updated)
  }

  const displayName = (t: string) => t.replace(/^mcp__\w+__/, '')

  return (
    <div className="max-w-lg space-y-6">
      <p className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>changes apply to new sessions</p>

      {ALL_TOOLS.map((group) => (
        <div key={group.group}>
          <div className="text-[10px] font-mono mb-2 uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
            {group.group}
          </div>
          <div className="space-y-1">
            {group.tools.map((tool) => {
              const on = allowed.includes(tool)
              return (
                <label key={tool} className="flex items-center gap-3 py-2 px-3 rounded-lg cursor-pointer transition-colors"
                  style={{ background: 'transparent' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Toggle */}
                  <button
                    onClick={() => toggle(tool)}
                    className="w-7 h-4 rounded-full relative flex-shrink-0 transition-colors"
                    style={{ background: on ? 'var(--accent-dim)' : 'var(--border)' }}
                  >
                    <span className={`absolute top-0.5 w-3 h-3 rounded-full transition-transform`}
                      style={{
                        background: on ? 'var(--accent)' : 'var(--text-dim)',
                        transform: on ? 'translateX(14px)' : 'translateX(2px)'
                      }} />
                  </button>
                  <span className="text-xs font-mono" style={{ color: on ? 'var(--text)' : 'var(--text-dim)' }}>
                    {displayName(tool)}
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
