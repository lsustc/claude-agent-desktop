import { useState } from 'react'

interface ThinkingBlockProps {
  content: string
}

export default function ThinkingBlock({ content }: ThinkingBlockProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden text-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left text-gray-500 dark:text-gray-400"
      >
        <span className="text-xs">{'>'}</span>
        <span className="italic">Thinking...</span>
        <span className="text-xs ml-auto">{expanded ? '\u25BC' : '\u25B6'}</span>
      </button>
      {expanded && (
        <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap italic">
            {content}
          </p>
        </div>
      )}
    </div>
  )
}
