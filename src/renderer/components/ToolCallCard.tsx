import { useState } from 'react'

interface ToolCallCardProps {
  toolName: string
  toolInput: Record<string, unknown>
  toolResult?: string
  isToolError?: boolean
}

function getToolSummary(name: string, input: Record<string, unknown>): string {
  const str = (key: string) => (input[key] as string) || ''
  switch (name) {
    case 'Read': return str('file_path')
    case 'Write': return str('file_path')
    case 'Edit': return `${str('file_path')} (${(str('old_string')).slice(0, 30)}...)`
    case 'Bash': {
      const cmd = str('command')
      return cmd.length > 80 ? cmd.slice(0, 80) + '...' : cmd
    }
    case 'Grep': return `"${str('pattern')}" in ${str('path') || '.'}`
    case 'Glob': return str('pattern')
    case 'WebSearch': return str('query')
    case 'WebFetch': return str('url')
    default: {
      const s = JSON.stringify(input)
      return s.length > 80 ? s.slice(0, 80) + '...' : s
    }
  }
}

function ToolIcon({ name }: { name: string }) {
  const icons: Record<string, string> = {
    Read: 'R', Write: 'W', Edit: 'E', Bash: '$',
    Grep: 'G', Glob: 'F', WebSearch: 'S', WebFetch: 'U',
    Agent: 'A', Task: 'T'
  }
  const colors: Record<string, string> = {
    Read: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    Write: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    Edit: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
    Bash: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    Grep: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    Glob: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
    WebSearch: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
    WebFetch: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
  }
  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${colors[name] || 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
      {icons[name] || '?'}
    </span>
  )
}

function BashOutput({ content }: { content: string }) {
  return (
    <div className="bg-gray-900 text-gray-100 rounded-md p-3 font-mono text-xs leading-relaxed overflow-x-auto max-h-64 overflow-y-auto">
      <pre className="whitespace-pre-wrap">{content}</pre>
    </div>
  )
}

function renderExpandedContent(name: string, input: Record<string, unknown>, result?: string, isError?: boolean) {
  // Bash: show command + output
  if (name === 'Bash') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium">Command:</span>
        </div>
        <div className="bg-gray-900 text-green-400 rounded-md px-3 py-2 font-mono text-xs overflow-x-auto">
          $ {input.command as string}
        </div>
        {result && (
          <>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-2">
              <span className="font-medium">Output:</span>
            </div>
            <BashOutput content={result} />
          </>
        )}
      </div>
    )
  }

  // Edit: show file path + old/new strings
  if (name === 'Edit') {
    return (
      <div className="space-y-2">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium">File:</span> {input.file_path as string}
        </div>
        {input.old_string && (
          <div>
            <div className="text-xs text-red-500 font-medium mb-1">- Removed:</div>
            <pre className="text-xs bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-300 p-2 rounded overflow-x-auto whitespace-pre-wrap border border-red-200 dark:border-red-800">
              {input.old_string as string}
            </pre>
          </div>
        )}
        {input.new_string && (
          <div>
            <div className="text-xs text-green-500 font-medium mb-1">+ Added:</div>
            <pre className="text-xs bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-300 p-2 rounded overflow-x-auto whitespace-pre-wrap border border-green-200 dark:border-green-800">
              {input.new_string as string}
            </pre>
          </div>
        )}
      </div>
    )
  }

  // Read/Write: show file path + content preview
  if (name === 'Read' || name === 'Write') {
    return (
      <div className="space-y-2">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium">File:</span> {input.file_path as string}
        </div>
        {input.content && (
          <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
            {(input.content as string).slice(0, 2000)}
          </pre>
        )}
        {result && (
          <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
            {result.slice(0, 2000)}
          </pre>
        )}
      </div>
    )
  }

  // Default: JSON display
  return (
    <div className="space-y-2">
      <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto whitespace-pre-wrap">
        {JSON.stringify(input, null, 2)}
      </pre>
      {result && (
        <div>
          <div className="text-xs text-gray-500 font-medium mb-1">Result:</div>
          <pre className={`text-xs p-2 rounded overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto ${
            isError
              ? 'bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400'
              : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          }`}>
            {result.slice(0, 3000)}
          </pre>
        </div>
      )}
    </div>
  )
}

export default function ToolCallCard({ toolName, toolInput, toolResult, isToolError }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false)

  const displayName = toolName.replace(/^mcp__\w+__/, '')

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden text-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
      >
        <ToolIcon name={displayName} />
        <span className="font-medium text-gray-700 dark:text-gray-300 text-xs">{displayName}</span>
        <span className="text-gray-400 dark:text-gray-500 truncate flex-1 text-xs font-mono">
          {getToolSummary(displayName, toolInput)}
        </span>
        <span className="text-gray-400 text-xs">{expanded ? '\u25BC' : '\u25B6'}</span>
      </button>
      {expanded && (
        <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
          {renderExpandedContent(displayName, toolInput, toolResult, isToolError)}
        </div>
      )}
    </div>
  )
}
