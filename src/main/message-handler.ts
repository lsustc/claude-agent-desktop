import type { StreamEvent } from '../shared/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function processSDKMessage(chatId: string, message: any): StreamEvent[] {
  const events: StreamEvent[] = []

  if (message.type === 'system' && message.subtype === 'init') {
    events.push({
      chatId,
      type: 'system',
      sessionId: message.session_id,
      content: 'Session initialized'
    })
    return events
  }

  if (message.type === 'assistant' && message.message) {
    const content = message.message.content

    if (typeof content === 'string') {
      events.push({ chatId, type: 'text', content })
    } else if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === 'text') {
          events.push({ chatId, type: 'text', content: block.text })
        } else if (block.type === 'thinking') {
          events.push({ chatId, type: 'thinking', thinking: block.thinking })
        } else if (block.type === 'tool_use') {
          // Detect show_widget tool calls
          if (block.name === 'mcp__generative-ui__show_widget') {
            events.push({
              chatId,
              type: 'widget',
              widgetTitle: block.input?.title,
              widgetCode: block.input?.widget_code,
              loadingMessages: block.input?.loading_messages,
              isStreaming: false
            })
          } else {
            events.push({
              chatId,
              type: 'tool_use',
              toolName: block.name,
              toolId: block.id,
              toolInput: block.input
            })
          }
        }
      }
    }
  }

  if (message.type === 'result') {
    if (message.subtype === 'success') {
      events.push({
        chatId,
        type: 'result',
        cost: message.total_cost_usd,
        duration: message.duration_ms
      })
    } else if (message.subtype === 'error') {
      events.push({
        chatId,
        type: 'error',
        error: message.error || 'Unknown error'
      })
    }
  }

  return events
}
