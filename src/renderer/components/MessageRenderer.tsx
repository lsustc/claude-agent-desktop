import type { StreamEvent } from '../../shared/types'
import MarkdownMessage from './MarkdownMessage'
import ToolCallCard from './ToolCallCard'
import ThinkingBlock from './ThinkingBlock'
import WidgetRenderer from './WidgetRenderer'

interface MessageRendererProps {
  event: StreamEvent & { _isUser?: boolean }
}

export default function MessageRenderer({ event }: MessageRendererProps) {
  // User message
  if (event._isUser && event.type === 'text') {
    return (
      <div className="flex justify-end mb-6">
        <div className="max-w-[80%] px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-br-md text-sm">
          <p className="whitespace-pre-wrap">{event.content}</p>
        </div>
      </div>
    )
  }

  // Assistant text
  if (event.type === 'text' && event.content) {
    return (
      <div className="mb-6">
        <MarkdownMessage content={event.content} />
      </div>
    )
  }

  // Widget
  if (event.type === 'widget' && event.widgetCode) {
    return (
      <div className="mb-6">
        <WidgetRenderer
          title={event.widgetTitle || 'widget'}
          widgetCode={event.widgetCode}
          isStreaming={event.isStreaming || false}
          loadingMessages={event.loadingMessages || ['Rendering...']}
        />
      </div>
    )
  }

  // Tool call
  if (event.type === 'tool_use') {
    return (
      <div className="mb-2">
        <ToolCallCard
          toolName={event.toolName || 'unknown'}
          toolInput={event.toolInput || {}}
        />
      </div>
    )
  }

  // Tool result
  if (event.type === 'tool_result') {
    return (
      <div className="mb-3">
        <ToolCallCard
          toolName="Result"
          toolInput={{}}
          toolResult={event.toolResult}
          isToolError={event.isToolError}
        />
      </div>
    )
  }

  // Thinking
  if (event.type === 'thinking' && event.thinking) {
    return (
      <div className="mb-3">
        <ThinkingBlock content={event.thinking} />
      </div>
    )
  }

  // Result (completion)
  if (event.type === 'result') {
    return (
      <div className="mb-6 flex items-center gap-3 text-xs text-gray-400 py-2 border-t border-gray-100 dark:border-gray-800">
        <span className="text-green-500">Done</span>
        {event.cost !== undefined && event.cost > 0 && (
          <span>${event.cost.toFixed(4)}</span>
        )}
        {event.duration !== undefined && (
          <span>{(event.duration / 1000).toFixed(1)}s</span>
        )}
      </div>
    )
  }

  // Error
  if (event.type === 'error') {
    return (
      <div className="mb-6 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
        {event.error}
      </div>
    )
  }

  return null
}
