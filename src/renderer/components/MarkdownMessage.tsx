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
      className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-mono rounded opacity-0 group-hover:opacity-100 transition-all"
      style={{ background: 'var(--border)', color: 'var(--text-dim)' }}
    >
      {copied ? 'copied' : 'copy'}
    </button>
  )
}

function extractText(node: ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (node && typeof node === 'object' && 'props' in node) return extractText((node as any).props.children)
  return ''
}

function ExternalLink({ href, children }: { href?: string; children?: ReactNode }) {
  return (
    <a
      href={href}
      onClick={(e) => { e.preventDefault(); if (href) window.open(href, '_blank') }}
      className="underline underline-offset-2 transition-colors"
      style={{ color: 'var(--accent)' }}
    >
      {children}
    </a>
  )
}

export default function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="markdown-body text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ExternalLink,

          pre({ children }) {
            const codeEl = children as any
            const className = codeEl?.props?.className || ''
            const lang = /language-(\w+)/.exec(className)?.[1] || ''
            const codeText = extractText(codeEl?.props?.children).replace(/\n$/, '')
            return (
              <div
                className="group relative my-4 rounded-lg overflow-hidden"
                style={{ border: '1px solid var(--border)' }}
              >
                <div
                  className="flex items-center justify-between px-4 py-1.5"
                  style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
                >
                  <span className="text-[10px] font-mono select-none" style={{ color: 'var(--text-dim)' }}>
                    {lang || 'code'}
                  </span>
                  <CopyButton text={codeText} />
                </div>
                <pre className="px-4 py-3 overflow-x-auto m-0" style={{ background: 'var(--surface)' }}>
                  <code className="text-[13px] leading-[1.6] font-mono whitespace-pre" style={{ color: 'var(--text)' }}>
                    {codeText}
                  </code>
                </pre>
              </div>
            )
          },

          code({ children, className }) {
            if (className) return <code className={className}>{children}</code>
            return (
              <code
                className="px-1.5 py-0.5 mx-0.5 rounded text-[0.8em] font-mono"
                style={{ background: 'var(--surface)', color: 'var(--accent)', border: '1px solid var(--border)' }}
              >
                {children}
              </code>
            )
          },

          h1({ children }) { return <h1 className="text-xl font-semibold mt-5 mb-3" style={{ color: 'var(--text)' }}>{children}</h1> },
          h2({ children }) { return <h2 className="text-lg font-semibold mt-5 mb-2" style={{ color: 'var(--text)' }}>{children}</h2> },
          h3({ children }) { return <h3 className="text-base font-semibold mt-4 mb-2" style={{ color: 'var(--text)' }}>{children}</h3> },
          h4({ children }) { return <h4 className="text-sm font-semibold mt-3 mb-1" style={{ color: 'var(--text)' }}>{children}</h4> },

          p({ children }) { return <p className="my-2" style={{ color: 'var(--text)' }}>{children}</p> },
          strong({ children }) { return <strong className="font-semibold" style={{ color: 'var(--text)' }}>{children}</strong> },

          ul({ children }) { return <ul className="my-2 ml-5 list-disc space-y-1" style={{ color: 'var(--text)' }}>{children}</ul> },
          ol({ children }) { return <ol className="my-2 ml-5 list-decimal space-y-1" style={{ color: 'var(--text)' }}>{children}</ol> },
          li({ children }) { return <li className="pl-1">{children}</li> },

          table({ children }) {
            return (
              <div className="overflow-x-auto my-4 rounded-lg" style={{ border: '1px solid var(--border)' }}>
                <table className="min-w-full text-sm">{children}</table>
              </div>
            )
          },
          thead({ children }) { return <thead style={{ background: 'var(--surface)' }}>{children}</thead> },
          th({ children }) {
            return (
              <th
                className="px-3 py-2 text-left text-xs font-semibold font-mono"
                style={{ color: 'var(--text-dim)', borderBottom: '1px solid var(--border)' }}
              >
                {children}
              </th>
            )
          },
          td({ children }) {
            return (
              <td
                className="px-3 py-2 text-sm"
                style={{ color: 'var(--text)', borderBottom: '1px solid var(--border)' }}
              >
                {children}
              </td>
            )
          },

          blockquote({ children }) {
            return (
              <blockquote
                className="pl-4 my-3 italic"
                style={{ borderLeft: '2px solid var(--accent-dim)', color: 'var(--text-dim)' }}
              >
                {children}
              </blockquote>
            )
          },

          hr() { return <hr className="my-5" style={{ borderColor: 'var(--border)' }} /> },
          img({ src, alt }) { return <img src={src} alt={alt} className="max-w-full rounded-lg my-3" /> }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
