export type ModelType = 'opus' | 'sonnet' | 'haiku'

export interface SessionMeta {
  id: string
  title: string
  model: ModelType
  createdAt: string
  updatedAt: string
}

export type WorkspaceKind = 'home' | 'stock' | 'industry' | 'watchlist'

export type ArtifactKind =
  | 'dashboard'
  | 'stock_explain'
  | 'industry_map'
  | 'watchlist'
  | 'briefing'

export interface WorkspaceMeta {
  id: string
  seedKey?: string
  title: string
  kind: WorkspaceKind
  focus: string
  summary: string
  sessionId: string
  pinnedSymbols: string[]
  createdAt: string
  updatedAt: string
}

export interface RuntimeArtifact {
  id: string
  workspaceId: string
  seedKey?: string
  title: string
  kind: ArtifactKind
  summary: string
  prompt: string
  tags: string[]
  widgetCode?: string
  createdAt: string
  updatedAt: string
}

export interface WorkspaceDetail extends WorkspaceMeta {
  memoryNotes: string[]
  suggestedPrompts: string[]
  artifacts: RuntimeArtifact[]
}

export interface StreamEvent {
  chatId: string
  type:
    | 'text'
    | 'text_delta'
    | 'tool_use'
    | 'tool_result'
    | 'widget'
    | 'thinking'
    | 'result'
    | 'error'
    | 'system'
  // text
  content?: string
  // tool_use
  toolName?: string
  toolId?: string
  toolInput?: Record<string, unknown>
  // tool_result
  toolResult?: string
  isToolError?: boolean
  // widget (from show_widget)
  widgetTitle?: string
  widgetCode?: string
  loadingMessages?: string[]
  isStreaming?: boolean
  // thinking
  thinking?: string
  // result
  sessionId?: string
  cost?: number
  duration?: number
  // error
  error?: string
}

export type McpServerType = 'command' | 'sse' | 'http'

export interface McpServerEntry {
  id: string
  name: string
  type: McpServerType
  // command type
  command?: string
  args?: string[]
  // sse / http type
  url?: string
  headers?: Record<string, string>
  // common
  env?: Record<string, string>
  enabled: boolean
}

export interface AgentEntry {
  id: string
  name: string
  description: string
  prompt: string
  tools: string[]
}

export interface AppConfig {
  apiKey: string
  defaultModel: ModelType
  systemPrompt: string
  allowedTools: string[]
  mcpServers: McpServerEntry[]
  agents: AgentEntry[]
}

export interface ToolPermissionRequest {
  requestId: string
  toolName: string
  toolInput: Record<string, unknown>
}
