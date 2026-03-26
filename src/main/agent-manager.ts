import { query } from '@anthropic-ai/claude-agent-sdk'
import { BrowserWindow } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { createRequire } from 'module'
import { configStore } from './config-store'
import { sessionStore } from './session-store'
import { processSDKMessage } from './message-handler'
import { createGenerativeUIMcpServer } from './mcp-tools/generative-ui'
import { IPC } from '../shared/ipc-channels'
import type { StreamEvent } from '../shared/types'

function findClaudeCliJs(): string {
  // Try to find cli.js from the SDK package
  const candidates = [
    // From node_modules (dev mode)
    join(process.cwd(), 'node_modules', '@anthropic-ai', 'claude-agent-sdk', 'cli.js'),
    // From app.asar (production)
    join(__dirname, '..', '..', 'node_modules', '@anthropic-ai', 'claude-agent-sdk', 'cli.js'),
    // Resolve via require
  ]

  for (const p of candidates) {
    if (existsSync(p)) {
      console.log('[agent] Found cli.js at:', p)
      return p
    }
  }

  // Fallback: use createRequire to resolve the package
  try {
    const require2 = createRequire(import.meta.url || __filename)
    const sdkPath = require2.resolve('@anthropic-ai/claude-agent-sdk')
    const cliPath = join(sdkPath, '..', 'cli.js')
    if (existsSync(cliPath)) {
      console.log('[agent] Found cli.js via require.resolve:', cliPath)
      return cliPath
    }
  } catch { /* ignore */ }

  console.error('[agent] cli.js not found in any candidate path')
  return candidates[0] // will fail but with a clear error
}

interface UserMessage {
  type: 'user'
  message: { role: 'user'; content: string }
}

class MessageQueue {
  private messages: UserMessage[] = []
  private waiting: ((msg: UserMessage) => void) | null = null
  private closed = false

  push(content: string): void {
    const msg: UserMessage = {
      type: 'user',
      message: { role: 'user', content }
    }

    if (this.waiting) {
      this.waiting(msg)
      this.waiting = null
    } else {
      this.messages.push(msg)
    }
  }

  async *[Symbol.asyncIterator](): AsyncIterableIterator<UserMessage> {
    while (!this.closed) {
      if (this.messages.length > 0) {
        yield this.messages.shift()!
      } else {
        yield await new Promise<UserMessage>((resolve) => {
          this.waiting = resolve
        })
      }
    }
  }

  close(): void {
    this.closed = true
    if (this.waiting) {
      // Unblock any pending wait
      this.waiting({ type: 'user', message: { role: 'user', content: '' } })
      this.waiting = null
    }
  }
}

interface SessionEntry {
  queue: MessageQueue
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  outputIterator: AsyncIterator<any> | null
  listening: boolean
}

const activeSessions = new Map<string, SessionEntry>()

function getMainWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows()
  return windows[0] || null
}

function sendToRenderer(event: StreamEvent): void {
  const win = getMainWindow()
  if (win) {
    win.webContents.send(IPC.CHAT_STREAM_EVENT, event)
  }
}

function startSession(chatId: string): SessionEntry {
  const queue = new MessageQueue()

  // Auth: If API key is configured, use it.
  // If not, clear env var so SDK falls back to CLI OAuth (subscription login).
  const apiKey = configStore.get('apiKey')
  if (apiKey) {
    process.env.ANTHROPIC_API_KEY = apiKey
  } else {
    delete process.env.ANTHROPIC_API_KEY
  }

  const model = configStore.get('defaultModel')
  const systemPrompt = configStore.get('systemPrompt')
  const allowedTools = configStore.get('allowedTools')
  const userMcpServers = configStore.get('mcpServers')
  const agents = configStore.get('agents')

  // Build MCP servers config
  const mcpServers: Record<string, unknown> = {
    'generative-ui': createGenerativeUIMcpServer()
  }

  // Add user-configured MCP servers
  for (const server of userMcpServers) {
    if (server.enabled) {
      mcpServers[server.name] = {
        command: server.command,
        args: server.args,
        env: server.env
      }
    }
  }

  // Build agents config
  const agentDefs: Record<string, { description: string; prompt: string; tools: string[] }> = {}
  for (const agent of agents) {
    agentDefs[agent.name] = {
      description: agent.description,
      prompt: agent.prompt,
      tools: agent.tools
    }
  }

  console.log('[agent] Starting session', chatId)
  console.log('[agent] Model:', model)
  console.log('[agent] Tools:', allowedTools.length, 'tools')
  console.log('[agent] MCP servers:', Object.keys(mcpServers))
  console.log('[agent] PATH:', process.env.PATH?.split(':').slice(0, 5).join(':'))
  console.log('[agent] ANTHROPIC_API_KEY set:', !!process.env.ANTHROPIC_API_KEY)
  console.log('[agent] HOME:', process.env.HOME)

  const cliPath = findClaudeCliJs()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const outputIterator = (query as any)({
    prompt: queue,
    options: {
      maxTurns: 100,
      model,
      cwd: process.env.HOME || process.cwd(),
      pathToClaudeCodeExecutable: cliPath,
      includePartialMessages: true,
      allowedTools,
      systemPrompt,
      mcpServers,
      ...(Object.keys(agentDefs).length > 0 ? { agents: agentDefs } : {})
    }
  })[Symbol.asyncIterator]()

  const entry: SessionEntry = { queue, outputIterator, listening: false }
  activeSessions.set(chatId, entry)
  return entry
}

async function listenToOutput(chatId: string, entry: SessionEntry): Promise<void> {
  if (entry.listening || !entry.outputIterator) return
  entry.listening = true

  // Detect when show_widget tool starts via stream_events → send loading state early
  let widgetLoadingSent = false

  try {
    while (true) {
      const { value, done } = await entry.outputIterator.next()
      if (done) break

      // Capture SDK session ID
      if (value.type === 'system' && value.subtype === 'init' && value.session_id) {
        sessionStore.setSdkSessionId(chatId, value.session_id)
      }

      // Detect show_widget tool start from stream_events → send loading state immediately
      if (value.type === 'stream_event' && value.event) {
        const evt = value.event
        if (evt.type === 'content_block_start' && evt.content_block?.type === 'tool_use' &&
            evt.content_block.name === 'mcp__generative-ui__show_widget' && !widgetLoadingSent) {
          widgetLoadingSent = true
          sendToRenderer({
            chatId,
            type: 'widget',
            widgetTitle: 'loading',
            widgetCode: undefined,
            loadingMessages: ['Building visualization...', 'Generating layout...', 'Rendering components...'],
            isStreaming: true
          })
        }
        // Skip all other stream_events (handled by full messages)
        continue
      }

      // Process full messages (assistant, result, system, etc.)
      const events = processSDKMessage(chatId, value)
      for (const event of events) {
        if (event.type === 'widget' && event.widgetCode) {
          // Final complete widget - triggers progressive render in WidgetRenderer
          event.isStreaming = false
          widgetLoadingSent = false
          sessionStore.appendEvent(chatId, event)
          sendToRenderer(event)
        } else {
          sessionStore.appendEvent(chatId, event)
          sendToRenderer(event)
        }
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : ''
    console.error(`[agent] Error in session ${chatId}:`, errorMsg)
    console.error('[agent] Stack:', stack)
    const errorEvent: StreamEvent = {
      chatId,
      type: 'error',
      error: errorMsg
    }
    sessionStore.appendEvent(chatId, errorEvent)
    sendToRenderer(errorEvent)
  }
}

export const agentManager = {
  sendMessage(chatId: string, content: string): void {
    // Store user message event
    const userEvent: StreamEvent = {
      chatId,
      type: 'text',
      content
    }
    // We mark it as user by convention: user messages are added by renderer directly

    // Auto-title from first user message
    const meta = sessionStore.get(chatId)
    if (meta && meta.title === 'New Chat') {
      sessionStore.setTitle(chatId, content.slice(0, 60))
    }

    let entry = activeSessions.get(chatId)
    if (!entry) {
      entry = startSession(chatId)
    }

    entry.queue.push(content)

    if (!entry.listening) {
      listenToOutput(chatId, entry)
    }
  },

  closeSession(chatId: string): void {
    const entry = activeSessions.get(chatId)
    if (entry) {
      entry.queue.close()
      activeSessions.delete(chatId)
    }
  },

  closeAll(): void {
    for (const [chatId] of activeSessions) {
      this.closeSession(chatId)
    }
  }
}
