import { useState, useRef, useEffect } from 'react'
import type { StreamEvent } from '../../shared/types'
import MessageRenderer from './MessageRenderer'

interface ChatViewProps {
  chatId: string | null
  messages: StreamEvent[]
  isLoading: boolean
  onSendMessage: (content: string) => void
  onStop: () => void
}

export default function ChatView({
  chatId,
  messages,
  isLoading,
  onSendMessage,
  onStop
}: ChatViewProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = () => {
    if (!input.trim() || !chatId || isLoading) return
    onSendMessage(input.trim())
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    // Auto-resize
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
  }

  if (!chatId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="text-center text-gray-500 dark:text-gray-600">
          <p className="text-2xl font-medium mb-2 text-gray-700 dark:text-gray-300">Lumi</p>
          <p className="text-sm">Create a new chat to get started</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-950">
      {/* Spacer for drag region */}
      <div className="h-11 flex-shrink-0" />
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 dark:text-gray-600 mt-20">
              <p>What can I help you with?</p>
            </div>
          ) : (
            messages.map((event, index) => (
              <MessageRenderer key={index} event={event} />
            ))
          )}

          {isLoading && (
            <div className="flex items-center gap-2 text-gray-400 py-4">
              <span className="animate-pulse text-lg">*</span>
              <span className="text-sm">Thinking...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Send a message..."
              disabled={isLoading}
              rows={1}
              className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 text-sm"
            />
            {isLoading ? (
              <button
                onClick={onStop}
                className="px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors text-sm font-medium"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!input.trim()}
                className="px-4 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                Send
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
