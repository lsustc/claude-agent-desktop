import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { McpServerEntry, McpServerType } from '../../../shared/types'

const TYPE_LABELS: Record<McpServerType, string> = { command: 'command', sse: 'sse', http: 'http' }

const inputStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
} as React.CSSProperties

const inputCls = 'w-full px-3 py-2 text-xs font-mono rounded-lg outline-none'

export default function McpServerManager() {
  const [servers, setServers] = useState<McpServerEntry[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [jsonImport, setJsonImport] = useState('')
  const [showJsonImport, setShowJsonImport] = useState(false)
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

  const resetForm = () => { setName(''); setCommand(''); setArgs(''); setUrl(''); setHeaders(''); setServerType('sse') }

  const handleAdd = async () => {
    if (!window.electronAPI || !name.trim()) return
    const server: McpServerEntry = { id: uuidv4(), name: name.trim(), type: serverType, enabled: true }
    if (serverType === 'command') {
      if (!command.trim()) return
      server.command = command.trim(); server.args = args.split(/\s+/).filter(Boolean)
    } else {
      if (!url.trim()) return
      server.url = url.trim()
      if (headers.trim()) {
        try { server.headers = JSON.parse(headers.trim()) } catch {
          const h: Record<string, string> = {}
          headers.split('\n').forEach((line) => { const idx = line.indexOf(':'); if (idx > 0) h[line.slice(0, idx).trim()] = line.slice(idx + 1).trim() })
          server.headers = h
        }
      }
    }
    await window.electronAPI.addMcpServer(server)
    setServers((prev) => [...prev, server]); resetForm(); setShowAdd(false)
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
          id: uuidv4(), name: serverName,
          type: cfg.type === 'sse' ? 'sse' : cfg.type === 'http' ? 'http' : cfg.command ? 'command' : 'sse',
          enabled: true
        }
        if (server.type === 'command') { server.command = cfg.command; server.args = cfg.args || [] }
        else { server.url = cfg.url; server.headers = cfg.headers }
        await window.electronAPI.addMcpServer(server)
        newServers.push(server)
      }
      setServers((prev) => [...prev, ...newServers]); setJsonImport(''); setShowJsonImport(false)
    } catch (e) { alert('JSON parse error: ' + (e as Error).message) }
  }

  const handleRemove = async (id: string) => {
    if (!window.electronAPI) return
    await window.electronAPI.removeMcpServer(id)
    setServers((prev) => prev.filter((s) => s.id !== id))
  }

  const handleToggle = async (id: string) => {
    if (!window.electronAPI) return
    await window.electronAPI.toggleMcpServer(id)
    setServers((prev) => prev.map((s) => s.id === id ? { ...s, enabled: !s.enabled } : s))
  }

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>mcp servers</span>
        <div className="flex gap-3">
          <button onClick={() => { setShowJsonImport(!showJsonImport); setShowAdd(false) }}
            className="text-xs font-mono transition-colors" style={{ color: 'var(--text-dim)' }}>
            json import
          </button>
          <button onClick={() => { setShowAdd(!showAdd); setShowJsonImport(false) }}
            className="text-xs font-mono transition-colors" style={{ color: 'var(--accent)' }}>
            {showAdd ? 'cancel' : '+ add'}
          </button>
        </div>
      </div>

      {showJsonImport && (
        <div className="p-4 rounded-lg space-y-3" style={{ border: '1px solid var(--border)' }}>
          <p className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>paste mcp config json</p>
          <textarea value={jsonImport} onChange={(e) => setJsonImport(e.target.value)} rows={8}
            placeholder='{"mcpServers":{"name":{"type":"sse","url":"..."}}}' className={inputCls + ' resize-y'} style={inputStyle} />
          <button onClick={handleJsonImport} disabled={!jsonImport.trim()}
            className="px-4 py-1.5 text-xs font-mono rounded-lg transition-colors disabled:opacity-30"
            style={{ border: '1px solid var(--accent-dim)', color: 'var(--accent)' }}>
            import
          </button>
        </div>
      )}

      {showAdd && (
        <div className="p-4 rounded-lg space-y-3" style={{ border: '1px solid var(--border)' }}>
          <div className="flex gap-1">
            {(['command', 'sse', 'http'] as McpServerType[]).map((t) => (
              <button key={t} onClick={() => setServerType(t)}
                className="flex-1 px-2 py-1.5 text-xs font-mono rounded-lg transition-colors"
                style={{
                  border: `1px solid ${serverType === t ? 'var(--accent-dim)' : 'var(--border)'}`,
                  background: serverType === t ? 'var(--surface)' : undefined,
                  color: serverType === t ? 'var(--accent)' : 'var(--text-dim)',
                }}>
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="server name" className={inputCls} style={inputStyle} />
          {serverType === 'command' ? (
            <>
              <input value={command} onChange={(e) => setCommand(e.target.value)} placeholder="command (e.g. npx)" className={inputCls} style={inputStyle} />
              <input value={args} onChange={(e) => setArgs(e.target.value)} placeholder="args (space separated)" className={inputCls} style={inputStyle} />
            </>
          ) : (
            <>
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="url" className={inputCls} style={inputStyle} />
              <textarea value={headers} onChange={(e) => setHeaders(e.target.value)} rows={3}
                placeholder={'headers (json or key: value)\n{"Authorization": "Bearer xxx"}'}
                className={inputCls + ' resize-y'} style={inputStyle} />
            </>
          )}
          <button onClick={handleAdd} disabled={!name.trim() || (serverType === 'command' ? !command.trim() : !url.trim())}
            className="px-4 py-1.5 text-xs font-mono rounded-lg transition-colors disabled:opacity-30"
            style={{ border: '1px solid var(--accent-dim)', color: 'var(--accent)' }}>
            add server
          </button>
        </div>
      )}

      {servers.length === 0 ? (
        <p className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>no servers configured</p>
      ) : (
        <div className="space-y-2">
          {servers.map((server) => (
            <div key={server.id} className="flex items-center justify-between p-3 rounded-lg transition-colors"
              style={{ border: '1px solid var(--border)' }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: server.enabled ? 'var(--green)' : 'var(--text-faint)' }} />
                  <span className="text-xs font-mono truncate" style={{ color: 'var(--text)' }}>{server.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono flex-shrink-0"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>
                    {TYPE_LABELS[server.type || 'command']}
                  </span>
                </div>
                <p className="text-[10px] font-mono truncate mt-1 ml-3.5" style={{ color: 'var(--text-faint)' }}>
                  {server.type === 'command' ? `${server.command} ${(server.args || []).join(' ')}` : server.url}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                <button onClick={() => handleToggle(server.id)}
                  className="text-[10px] font-mono transition-colors" style={{ color: 'var(--text-dim)' }}>
                  {server.enabled ? 'disable' : 'enable'}
                </button>
                <button onClick={() => handleRemove(server.id)}
                  className="text-[10px] font-mono transition-colors" style={{ color: 'var(--red)' }}>
                  remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>changes apply to new sessions</p>
    </div>
  )
}
