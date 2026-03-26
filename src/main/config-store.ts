import Store from 'electron-store'
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
