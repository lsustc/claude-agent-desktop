import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { AgentEntry } from '../../../shared/types'

export default function AgentConfigEditor() {
  const [agents, setAgents] = useState<AgentEntry[]>([])
  const [editing, setEditing] = useState<AgentEntry | null>(null)

  useEffect(() => {
    if (!window.electronAPI) return
    window.electronAPI.getConfig('agents').then((a) => setAgents((a as AgentEntry[]) || []))
  }, [])

  const save = async (agent: AgentEntry) => {
    if (!window.electronAPI) return
    const updated = agents.some((a) => a.id === agent.id)
      ? agents.map((a) => (a.id === agent.id ? agent : a))
      : [...agents, agent]
    setAgents(updated)
    await window.electronAPI.setConfig('agents', updated)
    setEditing(null)
  }

  const remove = async (id: string) => {
    if (!window.electronAPI) return
    const updated = agents.filter((a) => a.id !== id)
    setAgents(updated)
    await window.electronAPI.setConfig('agents', updated)
  }

  if (editing) {
    return <AgentForm agent={editing} onSave={save} onCancel={() => setEditing(null)} />
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Sub-agents</h3>
        <button
          onClick={() =>
            setEditing({ id: uuidv4(), name: '', description: '', prompt: '', tools: [] })
          }
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          + Add agent
        </button>
      </div>

      {agents.length === 0 ? (
        <p className="text-xs text-gray-400">No sub-agents configured</p>
      ) : (
        <div className="space-y-2">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{agent.name}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditing(agent)}
                    className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(agent.id)}
                    className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1">{agent.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AgentForm({
  agent,
  onSave,
  onCancel
}: {
  agent: AgentEntry
  onSave: (a: AgentEntry) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(agent.name)
  const [description, setDescription] = useState(agent.description)
  const [prompt, setPrompt] = useState(agent.prompt)
  const [tools, setTools] = useState(agent.tools.join(', '))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{agent.name ? 'Edit agent' : 'New agent'}</h3>
        <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600">
          Cancel
        </button>
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Agent name (e.g. code-reviewer)"
        className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800"
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800"
      />
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="System prompt for this agent"
        rows={4}
        className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 resize-y font-mono"
      />
      <input
        value={tools}
        onChange={(e) => setTools(e.target.value)}
        placeholder="Allowed tools, comma separated (e.g. Read, Grep, Glob)"
        className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800"
      />
      <button
        onClick={() =>
          onSave({
            ...agent,
            name,
            description,
            prompt,
            tools: tools.split(',').map((t) => t.trim()).filter(Boolean)
          })
        }
        disabled={!name.trim()}
        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40"
      >
        Save
      </button>
    </div>
  )
}
