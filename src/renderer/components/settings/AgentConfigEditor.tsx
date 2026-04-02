import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { AgentEntry } from '../../../shared/types'

const inputStyle = { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' } as React.CSSProperties
const inputCls = 'w-full px-3 py-2 text-xs font-mono rounded-lg outline-none'

export default function AgentConfigEditor() {
  const [agents, setAgents] = useState<AgentEntry[]>([])
  const [editing, setEditing] = useState<AgentEntry | null>(null)

  useEffect(() => {
    if (!window.electronAPI) return
    window.electronAPI.getConfig('agents').then((a: unknown) => setAgents((a as AgentEntry[]) || []))
  }, [])

  const save = async (agent: AgentEntry) => {
    if (!window.electronAPI) return
    const updated = agents.some((a) => a.id === agent.id) ? agents.map((a) => (a.id === agent.id ? agent : a)) : [...agents, agent]
    setAgents(updated); await window.electronAPI.setConfig('agents', updated); setEditing(null)
  }

  const remove = async (id: string) => {
    if (!window.electronAPI) return
    const updated = agents.filter((a) => a.id !== id)
    setAgents(updated); await window.electronAPI.setConfig('agents', updated)
  }

  if (editing) return <AgentForm agent={editing} onSave={save} onCancel={() => setEditing(null)} />

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>sub-agents</span>
        <button onClick={() => setEditing({ id: uuidv4(), name: '', description: '', prompt: '', tools: [] })}
          className="text-xs font-mono transition-colors" style={{ color: 'var(--accent)' }}>
          + add agent
        </button>
      </div>

      {agents.length === 0 ? (
        <p className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>no sub-agents configured</p>
      ) : (
        <div className="space-y-2">
          {agents.map((agent) => (
            <div key={agent.id} className="p-3 rounded-lg" style={{ border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono" style={{ color: 'var(--text)' }}>{agent.name}</span>
                <div className="flex gap-2">
                  <button onClick={() => setEditing(agent)} className="text-[10px] font-mono" style={{ color: 'var(--text-dim)' }}>edit</button>
                  <button onClick={() => remove(agent.id)} className="text-[10px] font-mono" style={{ color: 'var(--red)' }}>remove</button>
                </div>
              </div>
              {agent.description && <p className="text-[10px] font-mono mt-1" style={{ color: 'var(--text-faint)' }}>{agent.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AgentForm({ agent, onSave, onCancel }: { agent: AgentEntry; onSave: (a: AgentEntry) => void; onCancel: () => void }) {
  const [name, setName] = useState(agent.name)
  const [description, setDescription] = useState(agent.description)
  const [prompt, setPrompt] = useState(agent.prompt)
  const [tools, setTools] = useState(agent.tools.join(', '))

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>{agent.name ? 'edit agent' : 'new agent'}</span>
        <button onClick={onCancel} className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>cancel</button>
      </div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="agent name" className={inputCls} style={inputStyle} />
      <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="description" className={inputCls} style={inputStyle} />
      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="system prompt" rows={6}
        className={inputCls + ' resize-y leading-relaxed'} style={inputStyle} />
      <input value={tools} onChange={(e) => setTools(e.target.value)} placeholder="tools (e.g. Read, Grep, Glob)" className={inputCls} style={inputStyle} />
      <button onClick={() => onSave({ ...agent, name, description, prompt, tools: tools.split(',').map((t) => t.trim()).filter(Boolean) })}
        disabled={!name.trim()}
        className="px-4 py-1.5 text-xs font-mono rounded-lg transition-colors disabled:opacity-30"
        style={{ border: '1px solid var(--accent-dim)', color: 'var(--accent)' }}>
        save
      </button>
    </div>
  )
}
