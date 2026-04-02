import Store from 'electron-store'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import type { AppConfig, ModelType, McpServerEntry, AgentEntry } from '../shared/types'

const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI assistant running in a desktop application. You have access to the user's local file system and terminal.

You can help users with:
- Answering questions and research
- Writing, editing, and analyzing code
- Running terminal commands
- Creating rich visualizations, charts, dashboards, and interactive widgets
- File operations

## Generative UI - Inline Visualizations

You have two special tools for creating rich visual content inline in the conversation:

1. **read_me** - MUST call first. Loads design guidelines and code templates for widget types: chart, diagram, interactive, mockup, art.
2. **show_widget** - Renders raw HTML inline. Takes title, loading_messages, and widget_code.

### When to use show_widget:
- User asks to "visualize", "show", "display", "create a chart/dashboard/diagram"
- Data analysis that benefits from visual presentation
- Interactive tools (calculators, converters, quizzes)
- UI mockups or wireframes
- Any time visual output is more helpful than text

### Workflow:
1. Call read_me with appropriate modules (e.g. ["chart"] for data viz)
2. Call show_widget with the HTML fragment following the loaded guidelines
3. The widget renders inline in the conversation with the user

### Key rules for widget_code:
- Raw HTML fragment only: <style>...</style><div>...</div><script>...</script>
- NO DOCTYPE, html, head, body tags
- Use CSS variables: var(--widget-text), var(--widget-surface), var(--widget-border), var(--widget-accent)
- Load chart libraries from CDN (jsdelivr/cdnjs/unpkg)
- NO gradients, shadows, or blur effects`

const FINANCE_RUNTIME_APPENDIX = `

## Finance Runtime Mode

This app is evolving into an agent-native financial investment runtime rather than a generic chat app.

When finance MCP tools are available, prefer them for:
- stock snapshots, K-line and time-series queries
- industry and thematic analysis
- finance news and catalyst collection
- watchlist construction and stock screening support

When responding in this app:
- treat the current task as building or updating a reusable workspace or artifact
- prefer rich visual stage output for stock, industry, dashboard, and watchlist pages
- keep tool/thinking traces lightweight; the main value is the resulting page or widget
- include data freshness and source awareness in analysis
- do not fabricate market data, codes, prices, or news if tools fail`

const FINANCE_SYSTEM_PROMPT = DEFAULT_SYSTEM_PROMPT + FINANCE_RUNTIME_APPENDIX

const DEFAULT_TOOLS = [
  'Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep',
  'WebSearch', 'WebFetch',
  'mcp__generative-ui__read_me',
  'mcp__generative-ui__show_widget'
]

const defaults: AppConfig = {
  apiKey: '',
  defaultModel: 'sonnet' as ModelType,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  allowedTools: DEFAULT_TOOLS,
  mcpServers: [],
  agents: []
}

let store: Store<AppConfig>
try {
  store = new Store<AppConfig>({
    name: 'config',
    defaults
  })
} catch {
  // Config file corrupted - delete and recreate
  console.warn('[config] Config file corrupted, resetting to defaults')
  const { app } = require('electron')
  const { unlinkSync } = require('fs')
  const { join } = require('path')
  try {
    unlinkSync(join(app.getPath('userData'), 'config.json'))
  } catch { /* ignore */ }
  store = new Store<AppConfig>({
    name: 'config',
    defaults
  })
}

export const configStore = {
  init(): void {
    bootstrapIfindMcpServers()
    bootstrapFinanceSystemPrompt()
  },

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return store.get(key)
  },

  set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
    store.set(key, value)
  },

  getAll(): AppConfig {
    return store.store
  }
}

interface ClaudeMcpConfig {
  mcpServers?: Record<string, {
    type?: 'command' | 'sse' | 'http'
    command?: string
    args?: string[]
    url?: string
    headers?: Record<string, string>
    env?: Record<string, string>
  }>
}

function readClaudeMcpConfig(): ClaudeMcpConfig | null {
  const home = process.env.HOME
  if (!home) return null

  const candidates = [
    join(home, '.claude', 'mcp.json'),
    join(home, '.claude', '.mcp.json')
  ]

  for (const filePath of candidates) {
    if (!existsSync(filePath)) continue
    try {
      return JSON.parse(readFileSync(filePath, 'utf-8')) as ClaudeMcpConfig
    } catch (error) {
      console.warn('[config] Failed to parse local MCP config:', filePath, error)
    }
  }

  return null
}

function bootstrapIfindMcpServers(): void {
  const externalConfig = readClaudeMcpConfig()
  const mcpServers = externalConfig?.mcpServers
  if (!mcpServers) return

  const ifindEntries = Object.entries(mcpServers).filter(([name]) => name.includes('hexin-ifind'))
  if (ifindEntries.length === 0) return

  const existing = store.get('mcpServers')
  const existingByName = new Map(existing.map((server) => [server.name, server]))

  let changed = false
  const nextServers: McpServerEntry[] = existing.map((server) => {
    if (!server.name.includes('hexin-ifind')) return server

    const source = mcpServers[server.name]
    if (!source) return server

    changed = true
    return {
      ...server,
      type: source.type === 'http' ? 'http' : source.type === 'sse' ? 'sse' : 'command',
      command: source.command,
      args: source.args,
      url: source.url,
      headers: source.headers,
      env: source.env,
      enabled: true
    }
  })

  for (const [name, cfg] of ifindEntries) {
    if (existingByName.has(name)) continue

    nextServers.push({
      id: uuidv4(),
      name,
      type: cfg.type === 'http' ? 'http' : cfg.type === 'sse' ? 'sse' : 'command',
      command: cfg.command,
      args: cfg.args,
      url: cfg.url,
      headers: cfg.headers,
      env: cfg.env,
      enabled: true
    })
    changed = true
  }

  if (!changed) return

  store.set('mcpServers', nextServers)
  console.log('[config] Synced iFind MCP servers from ~/.claude/mcp.json')
}

function bootstrapFinanceSystemPrompt(): void {
  const current = store.get('systemPrompt')
  if (!current || current === DEFAULT_SYSTEM_PROMPT) {
    store.set('systemPrompt', FINANCE_SYSTEM_PROMPT)
  }
}
