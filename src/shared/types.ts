export type ModelType = 'opus' | 'sonnet' | 'haiku'

export interface SessionMeta {
  id: string
  title: string
  model: ModelType
  createdAt: string
  updatedAt: string
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

export interface McpServerEntry {
  id: string
  name: string
  command: string
  args: string[]
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
