import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { McpServerEntry } from '../../../shared/types'

export default function McpServerManager() {
  const [servers, setServers] = useState<McpServerEntry[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [command, setCommand] = useState('')
  const [args, setArgs] = useState('')

  useEffect(() => {
    if (!window.electronAPI) return
    window.electronAPI.listMcpServers().then(setServers)
  }, [])

  const handleAdd = async () => {
    if (!window.electronAPI || !name.trim() || !command.trim()) return
    const server: McpServerEntry = {
      id: uuidv4(),
      name: name.trim(),
      command: command.trim(),
      args: args.split(/\s+/).filter(Boolean),
      enabled: true
    }
    await window.electronAPI.addMcpServer(server)
    setServers((prev) => [...prev, server])
    setName('')
    setCommand('')
    setArgs('')
    setShowAdd(false)
  }

  const handleRemove = async (id: string) => {
    if (!window.electronAPI) return
    await window.electronAPI.removeMcpServer(id)
    setServers((prev) => prev.filter((s) => s.id !== id))
  }

  const handleToggle = async (id: string) => {
    if (!window.electronAPI) return
    await window.electronAPI.toggleMcpServer(id)
    setServers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">MCP Servers</h3>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          {showAdd ? 'Cancel' : '+ Add server'}
        </button>
      </div>

      {showAdd && (
        <div className="mb-4 p-3 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Server name (e.g. playwright)"
            className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800"
          />
          <input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Command (e.g. npx)"
            className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800"
          />
          <input
            value={args}
            onChange={(e) => setArgs(e.target.value)}
            placeholder="Args, space separated (e.g. @playwright/mcp@latest)"
            className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800"
          />
          <button
            onClick={handleAdd}
            disabled={!name.trim() || !command.trim()}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40"
          >
            Add
          </button>
        </div>
      )}

      {servers.length === 0 ? (
        <p className="text-xs text-gray-400">No MCP servers configured</p>
      ) : (
        <div className="space-y-2">
          {servers.map((server) => (
            <div
              key={server.id}
              className="flex items-center justify-between p-2 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${server.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-sm font-medium truncate">{server.name}</span>
                </div>
                <p className="text-xs text-gray-400 font-mono truncate mt-0.5 ml-4">
                  {server.command} {server.args.join(' ')}
                </p>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={() => handleToggle(server.id)}
                  className={`px-2 py-1 text-xs rounded ${
                    server.enabled
                      ? 'text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                      : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                  }`}
                >
                  {server.enabled ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => handleRemove(server.id)}
                  className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs text-gray-400">
        MCP servers are available in new chat sessions. Restart chat after changes.
      </p>
    </div>
  )
}
