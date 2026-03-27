import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { McpServerEntry, McpServerType } from '../../../shared/types'

const TYPE_LABELS: Record<McpServerType, string> = {
  command: 'Local command',
  sse: 'SSE',
  http: 'Streamable HTTP'
}

export default function McpServerManager() {
  const [servers, setServers] = useState<McpServerEntry[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [jsonImport, setJsonImport] = useState('')
  const [showJsonImport, setShowJsonImport] = useState(false)

  // Form state
  const [serverType, setServerType] = useState<McpServerType>('sse')
  const [name, setName] = useState('')
  const [command, setCommand] = useState('')
  const [args, setArgs] = useState('')
  const [url, setUrl] = useState('')
  const [headers, setHeaders] = useState('')

  useEffect(() => {
    if (!window.electronAPI) return
    window.electronAPI.listMcpServers().then(setServers)
  }, [])

  const resetForm = () => {
    setName('')
    setCommand('')
    setArgs('')
    setUrl('')
    setHeaders('')
    setServerType('sse')
  }

  const handleAdd = async () => {
    if (!window.electronAPI || !name.trim()) return

    const server: McpServerEntry = {
      id: uuidv4(),
      name: name.trim(),
      type: serverType,
      enabled: true
    }

    if (serverType === 'command') {
      if (!command.trim()) return
      server.command = command.trim()
      server.args = args.split(/\s+/).filter(Boolean)
    } else {
      if (!url.trim()) return
      server.url = url.trim()
      if (headers.trim()) {
        try {
          server.headers = JSON.parse(headers.trim())
        } catch {
          // Try key: value format
          const h: Record<string, string> = {}
          headers.split('\n').forEach((line) => {
            const idx = line.indexOf(':')
            if (idx > 0) h[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
          })
          server.headers = h
        }
      }
    }

    await window.electronAPI.addMcpServer(server)
    setServers((prev) => [...prev, server])
    resetForm()
    setShowAdd(false)
  }

  const handleJsonImport = async () => {
    if (!window.electronAPI || !jsonImport.trim()) return

    try {
      const config = JSON.parse(jsonImport.trim())
      const mcpServers = config.mcpServers || config

      const newServers: McpServerEntry[] = []
      for (const [serverName, serverConfig] of Object.entries(mcpServers)) {
        const cfg = serverConfig as any
        const server: McpServerEntry = {
          id: uuidv4(),
          name: serverName,
          type: cfg.type === 'sse' ? 'sse' : cfg.type === 'http' ? 'http' : cfg.command ? 'command' : 'sse',
          enabled: true
        }

        if (server.type === 'command') {
          server.command = cfg.command
          server.args = cfg.args || []
        } else {
          server.url = cfg.url
          server.headers = cfg.headers
        }

        await window.electronAPI.addMcpServer(server)
        newServers.push(server)
      }

      setServers((prev) => [...prev, ...newServers])
      setJsonImport('')
      setShowJsonImport(false)
    } catch (e) {
      alert('JSON parse error: ' + (e as Error).message)
    }
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
        <div className="flex gap-2">
          <button
            onClick={() => { setShowJsonImport(!showJsonImport); setShowAdd(false) }}
            className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
          >
            JSON import
          </button>
          <button
            onClick={() => { setShowAdd(!showAdd); setShowJsonImport(false) }}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            {showAdd ? 'Cancel' : '+ Add'}
          </button>
        </div>
      </div>

      {/* JSON import */}
      {showJsonImport && (
        <div className="mb-4 p-3 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2">
          <p className="text-xs text-gray-500">Paste MCP config JSON (from "MCP_CONFIG.JSON" format)</p>
          <textarea
            value={jsonImport}
            onChange={(e) => setJsonImport(e.target.value)}
            rows={8}
            placeholder='{"mcpServers":{"name":{"type":"sse","url":"...","headers":{...}}}}'
            className="w-full px-2 py-1.5 text-xs font-mono border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 resize-y"
          />
          <button
            onClick={handleJsonImport}
            disabled={!jsonImport.trim()}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40"
          >
            Import
          </button>
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="mb-4 p-3 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3">
          {/* Type selector */}
          <div className="flex gap-1 p-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
            {(['command', 'sse', 'http'] as McpServerType[]).map((t) => (
              <button
                key={t}
                onClick={() => setServerType(t)}
                className={`flex-1 px-2 py-1.5 text-xs rounded-md transition-colors ${
                  serverType === t
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Server name"
            className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800"
          />

          {serverType === 'command' ? (
            <>
              <input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="Command (e.g. npx)"
                className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800"
              />
              <input
                value={args}
                onChange={(e) => setArgs(e.target.value)}
                placeholder="Args (space separated)"
                className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800"
              />
            </>
          ) : (
            <>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="URL (e.g. https://api-mcp.example.com/...)"
                className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800"
              />
              <textarea
                value={headers}
                onChange={(e) => setHeaders(e.target.value)}
                rows={3}
                placeholder={'Headers (JSON or key: value per line)\n{"Authorization": "Bearer xxx"}'}
                className="w-full px-2 py-1.5 text-xs font-mono border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 resize-y"
              />
            </>
          )}

          <button
            onClick={handleAdd}
            disabled={!name.trim() || (serverType === 'command' ? !command.trim() : !url.trim())}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40"
          >
            Add
          </button>
        </div>
      )}

      {/* Server list */}
      {servers.length === 0 ? (
        <p className="text-xs text-gray-400">No MCP servers configured</p>
      ) : (
        <div className="space-y-2">
          {servers.map((server) => (
            <div
              key={server.id}
              className="flex items-center justify-between p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${server.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  <span className="text-sm font-medium truncate">{server.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex-shrink-0">
                    {TYPE_LABELS[server.type || 'command']}
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-mono truncate mt-0.5 ml-4">
                  {server.type === 'command'
                    ? `${server.command} ${(server.args || []).join(' ')}`
                    : server.url}
                </p>
              </div>
              <div className="flex items-center gap-1 ml-2 flex-shrink-0">
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
        Changes apply to new sessions. Restart chat after adding servers.
      </p>
    </div>
  )
}
