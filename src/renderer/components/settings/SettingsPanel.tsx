import { useState, useEffect } from 'react'
import type { AppConfig, ModelType } from '../../../shared/types'
import McpServerManager from './McpServerManager'
import AgentConfigEditor from './AgentConfigEditor'
import ToolPermissions from './ToolPermissions'

interface SettingsPanelProps {
  onClose: () => void
}

type Tab = 'general' | 'mcp' | 'agents' | 'tools'

const TABS: { id: Tab; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'mcp', label: 'MCP Servers' },
  { id: 'agents', label: 'Agents' },
  { id: 'tools', label: 'Tools' }
]

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [tab, setTab] = useState<Tab>('general')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState<ModelType>('sonnet')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [authMode, setAuthMode] = useState<'subscription' | 'apikey'>('subscription')
  const [saved, setSaved] = useState(false)
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'))

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

  const handleSave = async () => {
    if (!window.electronAPI) return
    const keyToSave = authMode === 'subscription' ? '' : apiKey
    await window.electronAPI.setConfig('apiKey', keyToSave)
    await window.electronAPI.setConfig('defaultModel', model)
    await window.electronAPI.setConfig('systemPrompt', systemPrompt)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const toggleDark = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative ml-auto w-[520px] h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-medium">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none"
          >
            x
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 px-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'general' && (
            <div className="space-y-6">
              {/* Authentication */}
              <div>
                <label className="block text-sm font-medium mb-3">Authentication</label>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setAuthMode('subscription')}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                      authMode === 'subscription'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    Subscription
                  </button>
                  <button
                    onClick={() => setAuthMode('apikey')}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                      authMode === 'apikey'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    API Key
                  </button>
                </div>

                {authMode === 'subscription' ? (
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-400">
                    <p className="mb-2">Uses Claude Pro/Max/Team subscription quota.</p>
                    <code className="block px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono mb-1">
                      npm i -g @anthropic-ai/claude-code && claude login
                    </code>
                    <p className="text-xs text-gray-500 mt-1">Token stored in macOS Keychain. No API charges.</p>
                  </div>
                ) : (
                  <div>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-ant-api03-..."
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">From console.anthropic.com. Billed per usage.</p>
                  </div>
                )}
              </div>

              {/* Model */}
              <div>
                <label className="block text-sm font-medium mb-2">Default model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value as ModelType)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="opus">Claude Opus</option>
                  <option value="sonnet">Claude Sonnet</option>
                  <option value="haiku">Claude Haiku</option>
                </select>
              </div>

              {/* Dark mode */}
              <div>
                <label className="flex items-center justify-between">
                  <span className="text-sm font-medium">Dark mode</span>
                  <button
                    onClick={toggleDark}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isDark ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isDark ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </label>
              </div>

              {/* System Prompt */}
              <div>
                <label className="block text-sm font-medium mb-2">System prompt</label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono"
                />
              </div>

              {/* Save */}
              <button
                onClick={handleSave}
                className="w-full px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                {saved ? 'Saved!' : 'Save'}
              </button>
            </div>
          )}

          {tab === 'mcp' && <McpServerManager />}
          {tab === 'agents' && <AgentConfigEditor />}
          {tab === 'tools' && <ToolPermissions />}
        </div>
      </div>
    </div>
  )
}
