import { useState, useEffect } from 'react'
import type { ModelType } from '../../../shared/types'
import McpServerManager from './McpServerManager'
import AgentConfigEditor from './AgentConfigEditor'
import ToolPermissions from './ToolPermissions'
import ThemePicker from '../ThemePicker'

interface SettingsPanelProps {
  onClose: () => void
}

type Tab = 'general' | 'theme' | 'mcp' | 'agents' | 'tools'
const TABS: { id: Tab; label: string }[] = [
  { id: 'general', label: 'general' },
  { id: 'theme',   label: 'theme' },
  { id: 'mcp',     label: 'mcp' },
  { id: 'agents',  label: 'agents' },
  { id: 'tools',   label: 'tools' },
]

const inputCls = 'w-full px-3 py-2 text-xs font-mono rounded-lg outline-none transition-colors'

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [tab, setTab] = useState<Tab>('general')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState<ModelType>('sonnet')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [authMode, setAuthMode] = useState<'subscription' | 'apikey'>('subscription')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!window.electronAPI) return
      const config = await window.electronAPI.getAllConfig()
      setApiKey(config.apiKey || '')
      setModel(config.defaultModel || 'sonnet')
      setSystemPrompt(config.systemPrompt || '')
      setAuthMode(config.apiKey ? 'apikey' : 'subscription')
    }
    load()
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSave = async () => {
    if (!window.electronAPI) return
    await window.electronAPI.setConfig('apiKey', authMode === 'subscription' ? '' : apiKey)
    await window.electronAPI.setConfig('defaultModel', model)
    await window.electronAPI.setConfig('systemPrompt', systemPrompt)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* macOS drag region */}
      <div className="absolute top-0 left-0 right-0 h-8" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />

      {/* Header */}
      <div className="flex items-center justify-between px-8 pt-10 pb-6" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <span className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>/ settings</span>
          <h2 className="text-xl font-mono mt-0.5" style={{ color: 'var(--text)' }}>configuration</h2>
        </div>
        <button onClick={onClose} className="text-xs font-mono transition-colors" style={{ color: 'var(--text-dim)' }}>
          esc to close
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-40 pt-6 px-4 flex flex-col gap-1" style={{ borderRight: '1px solid var(--border)' }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="text-left px-3 py-2 text-xs font-mono rounded-lg transition-colors"
              style={{
                background: tab === t.id ? 'var(--surface)' : undefined,
                color: tab === t.id ? 'var(--accent)' : 'var(--text-dim)',
              }}
            >
              {tab === t.id ? '▶ ' : '  '}{t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {tab === 'general' && (
            <div className="space-y-8 max-w-lg">
              {/* Auth */}
              <div>
                <label className="block text-xs font-mono mb-3" style={{ color: 'var(--text-dim)' }}>authentication</label>
                <div className="flex gap-2 mb-4">
                  {(['subscription', 'apikey'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setAuthMode(mode)}
                      className="flex-1 px-3 py-2 text-xs font-mono rounded-lg transition-colors"
                      style={{
                        border: `1px solid ${authMode === mode ? 'var(--accent-dim)' : 'var(--border)'}`,
                        background: authMode === mode ? 'var(--surface)' : undefined,
                        color: authMode === mode ? 'var(--accent)' : 'var(--text-dim)',
                      }}
                    >
                      {mode === 'subscription' ? 'subscription' : 'api key'}
                    </button>
                  ))}
                </div>

                {authMode === 'subscription' ? (
                  <div className="p-4 rounded-lg text-xs font-mono space-y-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <p style={{ color: 'var(--text)' }}>uses claude pro/max/team subscription quota</p>
                    <code className="block px-3 py-2 rounded" style={{ background: 'var(--bg)', color: 'var(--accent)', border: '1px solid var(--border)' }}>
                      npm i -g @anthropic-ai/claude-code && claude login
                    </code>
                    <p style={{ color: 'var(--text-dim)' }}>token stored in keychain · no api charges</p>
                  </div>
                ) : (
                  <div>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-ant-api03-..."
                      className={inputCls}
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    />
                    <p className="mt-2 text-[10px] font-mono" style={{ color: 'var(--text-dim)' }}>
                      from console.anthropic.com · billed per usage
                    </p>
                  </div>
                )}
              </div>

              {/* Model */}
              <div>
                <label className="block text-xs font-mono mb-2" style={{ color: 'var(--text-dim)' }}>default model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value as ModelType)}
                  className={inputCls}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                >
                  <option value="opus">claude opus</option>
                  <option value="sonnet">claude sonnet</option>
                  <option value="haiku">claude haiku</option>
                </select>
              </div>

              {/* System Prompt */}
              <div>
                <label className="block text-xs font-mono mb-2" style={{ color: 'var(--text-dim)' }}>system prompt</label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={12}
                  className={inputCls + ' resize-y leading-relaxed'}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
              </div>

              <button
                onClick={handleSave}
                className="px-6 py-2 text-xs font-mono rounded-lg transition-colors"
                style={{ border: '1px solid var(--accent-dim)', color: 'var(--accent)' }}
              >
                {saved ? '✓ saved' : 'save'}
              </button>
            </div>
          )}

          {tab === 'theme' && (
            <div className="space-y-5 max-w-4xl">
              <div>
                <label className="block text-xs font-mono mb-2" style={{ color: 'var(--text-dim)' }}>theme</label>
                <div className="text-sm leading-6" style={{ color: 'var(--text-dim)' }}>
                  主题已经合并到 settings，不再作为单独导航入口。
                </div>
              </div>
              <ThemePicker inline />
            </div>
          )}

          {tab === 'mcp'    && <McpServerManager />}
          {tab === 'agents' && <AgentConfigEditor />}
          {tab === 'tools'  && <ToolPermissions />}
        </div>
      </div>
    </div>
  )
}
