import { useState, useEffect } from 'react'

const ALL_TOOLS = [
  { group: 'File system', tools: ['Read', 'Write', 'Edit', 'Glob', 'Grep'] },
  { group: 'Execution', tools: ['Bash'] },
  { group: 'Web', tools: ['WebSearch', 'WebFetch'] },
  { group: 'Generative UI', tools: ['mcp__generative-ui__read_me', 'mcp__generative-ui__show_widget'] }
]

export default function ToolPermissions() {
  const [allowed, setAllowed] = useState<string[]>([])

  useEffect(() => {
    if (!window.electronAPI) return
    window.electronAPI.getConfig('allowedTools').then((t) => setAllowed((t as string[]) || []))
  }, [])

  const toggle = async (tool: string) => {
    if (!window.electronAPI) return
    const updated = allowed.includes(tool)
      ? allowed.filter((t) => t !== tool)
      : [...allowed, tool]
    setAllowed(updated)
    await window.electronAPI.setConfig('allowedTools', updated)
  }

  const displayName = (t: string) => t.replace(/^mcp__\w+__/, '')

  return (
    <div>
      <h3 className="text-sm font-medium mb-3">Tool permissions</h3>
      <p className="text-xs text-gray-400 mb-3">Enable/disable tools available to Claude. Changes apply to new sessions.</p>

      <div className="space-y-4">
        {ALL_TOOLS.map((group) => (
          <div key={group.group}>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
              {group.group}
            </div>
            <div className="space-y-1">
              {group.tools.map((tool) => (
                <label
                  key={tool}
                  className="flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={allowed.includes(tool)}
                    onChange={() => toggle(tool)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-mono">{displayName(tool)}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
