import { useState, useCallback, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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
      className="absolute top-2 right-2 px-2 py-1 text-xs bg-gray-600 text-gray-200 rounded hover:bg-gray-500 transition-colors opacity-0 group-hover:opacity-100 z-10"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

function extractText(node: ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (node && typeof node === 'object' && 'props' in node) {
    return extractText((node as any).props.children)
  }
  return ''
}

function ExternalLink({ href, children }: { href?: string; children?: ReactNode }) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (href) window.open(href, '_blank')
  }
  return (
    <a
      href={href}
      onClick={handleClick}
      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline decoration-blue-300/50 dark:decoration-blue-500/50 underline-offset-2 transition-colors"
      title={href}
    >
      {children}
    </a>
  )
}

export default function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="markdown-body text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ExternalLink,

          // Code block: pre > code
          pre({ children }) {
            // Extract language and text from the inner <code> element
            const codeEl = children as any
            const className = codeEl?.props?.className || ''
            const lang = /language-(\w+)/.exec(className)?.[1] || ''
            const codeText = extractText(codeEl?.props?.children).replace(/\n$/, '')

            return (
              <div className="group relative my-4 rounded-lg overflow-hidden border border-gray-700/50">
                {/* Header bar */}
                <div className="flex items-center justify-between px-4 py-1.5 bg-[#1e1e2e] border-b border-gray-700/50">
                  <span className="text-xs text-gray-400 font-mono select-none">{lang || 'code'}</span>
                  <CopyButton text={codeText} />
                </div>
                {/* Code content */}
                <pre className="bg-[#1e1e2e] px-4 py-3 overflow-x-auto m-0">
                  <code className="text-[13px] leading-[1.6] text-gray-200 font-mono whitespace-pre">
                    {codeText}
                  </code>
                </pre>
              </div>
            )
          },

          // Inline code
          code({ children, className }) {
            // If it has a language class, it's inside a pre block (handled above)
            if (className) return <code className={className}>{children}</code>
            return (
              <code className="px-1.5 py-0.5 mx-0.5 bg-gray-100 dark:bg-gray-800 text-orange-600 dark:text-orange-400 rounded text-[0.8em] font-mono">
                {children}
              </code>
            )
          },

          // Headings
          h1({ children }) { return <h1 className="text-xl font-semibold mt-5 mb-3 text-gray-900 dark:text-gray-100">{children}</h1> },
          h2({ children }) { return <h2 className="text-lg font-semibold mt-5 mb-2 text-gray-900 dark:text-gray-100">{children}</h2> },
          h3({ children }) { return <h3 className="text-base font-semibold mt-4 mb-2 text-gray-900 dark:text-gray-100">{children}</h3> },
          h4({ children }) { return <h4 className="text-sm font-semibold mt-3 mb-1 text-gray-900 dark:text-gray-100">{children}</h4> },

          // Paragraph
          p({ children }) { return <p className="my-2 text-gray-800 dark:text-gray-200">{children}</p> },

          // Strong / em
          strong({ children }) { return <strong className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong> },

          // Lists
          ul({ children }) { return <ul className="my-2 ml-5 list-disc space-y-1 text-gray-800 dark:text-gray-200">{children}</ul> },
          ol({ children }) { return <ol className="my-2 ml-5 list-decimal space-y-1 text-gray-800 dark:text-gray-200">{children}</ol> },
          li({ children }) { return <li className="pl-1">{children}</li> },

          // Table
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="min-w-full text-sm">{children}</table>
              </div>
            )
          },
          thead({ children }) { return <thead className="bg-gray-50 dark:bg-gray-800/80">{children}</thead> },
          th({ children }) {
            return <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">{children}</th>
          },
          td({ children }) {
            return <td className="px-3 py-2 text-sm border-b border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300">{children}</td>
          },

          // Blockquote
          blockquote({ children }) {
            return <blockquote className="border-l-[3px] border-gray-300 dark:border-gray-600 pl-4 my-3 text-gray-500 dark:text-gray-400 italic">{children}</blockquote>
          },

          // HR
          hr() { return <hr className="my-5 border-gray-200 dark:border-gray-700" /> },

          // Image
          img({ src, alt }) {
            return <img src={src} alt={alt} className="max-w-full rounded-lg my-3" />
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
