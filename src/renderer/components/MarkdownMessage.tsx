import { useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [text])

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 px-2 py-1 text-xs bg-gray-600 text-gray-200 rounded hover:bg-gray-500 transition-colors opacity-0 group-hover:opacity-100"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

// Open external links in system browser, not in Electron window
function ExternalLink({ href, children }: { href?: string; children?: React.ReactNode }) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (href) {
      // Use Electron shell.openExternal via window.open fallback
      window.open(href, '_blank')
    }
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline decoration-blue-300 dark:decoration-blue-600 underline-offset-2 transition-colors"
      title={href}
    >
      {children}
    </a>
  )
}

interface MarkdownMessageProps {
  content: string
}

export default function MarkdownMessage({ content }: MarkdownMessageProps) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-headings:mt-4 prose-headings:mb-2 prose-li:my-0.5 prose-ul:my-2 prose-ol:my-2 prose-blockquote:my-3 prose-hr:my-4">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // External links open in browser
          a: ExternalLink,

          // Code blocks with syntax label + copy button
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const isInline = !match && !className

            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[0.8125rem] font-mono text-rose-600 dark:text-rose-400 not-prose"
                  {...props}
                >
                  {children}
                </code>
              )
            }

            const codeText = String(children).replace(/\n$/, '')

            return (
              <div className="group relative my-4 not-prose">
                <div className="flex items-center justify-between px-4 py-1.5 bg-gray-800 dark:bg-gray-900 rounded-t-lg border-b border-gray-700/50">
                  <span className="text-xs text-gray-400 font-mono">{match?.[1] || 'code'}</span>
                </div>
                <CopyButton text={codeText} />
                <pre className="bg-gray-800 dark:bg-gray-900 px-4 py-3 rounded-b-lg overflow-x-auto">
                  <code className={`text-[0.8125rem] leading-relaxed text-gray-100 font-mono ${className || ''}`}>
                    {children}
                  </code>
                </pre>
              </div>
            )
          },

          // Tables
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4 rounded-lg border border-gray-200 dark:border-gray-700 not-prose">
                <table className="min-w-full text-sm">
                  {children}
                </table>
              </div>
            )
          },
          thead({ children }) {
            return <thead className="bg-gray-50 dark:bg-gray-800">{children}</thead>
          },
          th({ children }) {
            return (
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                {children}
              </th>
            )
          },
          td({ children }) {
            return (
              <td className="px-4 py-2 text-sm border-b border-gray-100 dark:border-gray-800">
                {children}
              </td>
            )
          },

          // Blockquote
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-600 dark:text-gray-400 my-3">
                {children}
              </blockquote>
            )
          },

          // Horizontal rule
          hr() {
            return <hr className="my-6 border-gray-200 dark:border-gray-700" />
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
