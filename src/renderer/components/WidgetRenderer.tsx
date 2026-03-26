import { useRef, useEffect, useState, useCallback } from 'react'
import morphdom from 'morphdom'

interface WidgetRendererProps {
  title: string
  widgetCode: string | undefined
  isStreaming: boolean
  loadingMessages: string[]
}

function loadScriptSequentially(
  scripts: HTMLScriptElement[],
  container: HTMLElement,
  index = 0
): void {
  if (index >= scripts.length) return
  const original = scripts[index]
  const newScript = document.createElement('script')
  if (original.src) {
    newScript.src = original.src
    newScript.onload = () => loadScriptSequentially(scripts, container, index + 1)
    newScript.onerror = () => loadScriptSequentially(scripts, container, index + 1)
  } else {
    newScript.textContent = original.textContent
  }
  container.appendChild(newScript)
  if (!original.src) loadScriptSequentially(scripts, container, index + 1)
}

/**
 * Split HTML into renderable chunks at tag boundaries.
 * Returns an array of progressively growing HTML strings.
 * e.g. for "<style>...</style><div><h1>A</h1><p>B</p></div>"
 * returns:
 *   ["<style>...</style>",
 *    "<style>...</style><div><h1>A</h1>",
 *    "<style>...</style><div><h1>A</h1><p>B</p>",
 *    "<style>...</style><div><h1>A</h1><p>B</p></div>"]
 */
function buildProgressiveChunks(html: string): string[] {
  const chunks: string[] = []

  // First, separate style blocks (inject all at once)
  const styleRegex = /<style[\s\S]*?<\/style>/gi
  const styles = html.match(styleRegex) || []
  const styleBlock = styles.join('\n')

  // Remove style and script from HTML to get just content
  let content = html.replace(styleRegex, '').replace(/<script[\s\S]*?<\/script>/gi, '').trim()

  if (!content) {
    chunks.push(styleBlock)
    return chunks
  }

  // Find top-level tags to chunk by
  // Parse by finding close tags at the top level
  const tagRegex = /<[^/][^>]*>[\s\S]*?<\/[^>]+>|<[^/][^>]*\/>/g
  const topDiv = content.match(/^<div[^>]*>([\s\S]*)<\/div>$/i)

  let innerHtml: string
  let wrapperOpen: string
  let wrapperClose: string

  if (topDiv) {
    // Content is wrapped in a top-level div
    const openTag = content.match(/^(<div[^>]*>)/i)
    wrapperOpen = openTag ? openTag[1] : '<div>'
    wrapperClose = '</div>'
    innerHtml = topDiv[1]
  } else {
    wrapperOpen = '<div>'
    wrapperClose = '</div>'
    innerHtml = content
  }

  // Split inner HTML into direct children (approximate by top-level tags)
  const children: string[] = []
  let depth = 0
  let current = ''
  let i = 0

  while (i < innerHtml.length) {
    if (innerHtml[i] === '<') {
      const isClose = innerHtml[i + 1] === '/'
      if (isClose) {
        // Find end of close tag
        const end = innerHtml.indexOf('>', i)
        current += innerHtml.slice(i, end + 1)
        i = end + 1
        depth--
        if (depth <= 0) {
          children.push(current.trim())
          current = ''
          depth = 0
        }
      } else {
        // Find end of open tag
        const end = innerHtml.indexOf('>', i)
        const tag = innerHtml.slice(i, end + 1)
        current += tag
        i = end + 1
        // Self-closing?
        if (tag.endsWith('/>') || /^<(br|hr|img|input|meta|link)\b/i.test(tag)) {
          if (depth === 0) {
            children.push(current.trim())
            current = ''
          }
        } else {
          depth++
        }
      }
    } else {
      current += innerHtml[i]
      i++
      // Text node at depth 0
      if (depth === 0 && (i >= innerHtml.length || innerHtml[i] === '<')) {
        if (current.trim()) {
          children.push(current.trim())
        }
        current = ''
      }
    }
  }
  if (current.trim()) children.push(current.trim())

  // Build progressive chunks: style + wrapper with increasing children
  if (children.length === 0) {
    chunks.push(styleBlock + '\n' + wrapperOpen + wrapperClose)
  } else {
    for (let c = 0; c < children.length; c++) {
      const partialInner = children.slice(0, c + 1).join('\n')
      chunks.push(styleBlock + '\n' + wrapperOpen + '\n' + partialInner + '\n' + wrapperClose)
    }
  }

  return chunks
}

export default function WidgetRenderer({
  title,
  widgetCode,
  isStreaming,
  loadingMessages
}: WidgetRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scriptsExecutedRef = useRef(false)
  const animatingRef = useRef(false)
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0)
  const [phase, setPhase] = useState<'loading' | 'growing' | 'done'>('loading')
  const [error, setError] = useState<string | null>(null)

  const renderProgressively = useCallback(async (code: string) => {
    if (!containerRef.current || animatingRef.current) return
    animatingRef.current = true
    setPhase('growing')

    try {
      const template = document.createElement('template')
      template.innerHTML = code
      const scripts = Array.from(template.content.querySelectorAll('script'))

      const chunks = buildProgressiveChunks(code)
      const DELAY = Math.max(40, Math.min(150, 2000 / chunks.length)) // adaptive: 40-150ms per chunk

      for (let i = 0; i < chunks.length; i++) {
        const chunkTemplate = document.createElement('template')
        chunkTemplate.innerHTML = chunks[i]

        const wrapper = document.createElement('div')
        wrapper.className = 'widget-content'
        Array.from(chunkTemplate.content.childNodes).forEach((node) => {
          if (node instanceof HTMLScriptElement) return
          wrapper.appendChild(node.cloneNode(true))
        })

        const existing = containerRef.current!.querySelector('.widget-content')
        if (existing) {
          morphdom(existing, wrapper, {
            onBeforeElUpdated: (from, to) => !from.isEqualNode(to),
            onNodeAdded(node) {
              if (node instanceof HTMLElement && node.tagName !== 'STYLE') {
                node.style.opacity = '0'
                node.style.transform = 'translateY(6px)'
                requestAnimationFrame(() => {
                  node.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out'
                  node.style.opacity = '1'
                  node.style.transform = 'translateY(0)'
                })
              }
              return node
            }
          })
        } else {
          containerRef.current!.appendChild(wrapper)
        }

        if (i < chunks.length - 1) {
          await new Promise((r) => setTimeout(r, DELAY))
        }
      }

      // Execute scripts after all HTML is rendered
      if (scripts.length > 0) {
        await new Promise((r) => setTimeout(r, 200))
        loadScriptSequentially(scripts, containerRef.current!)
      }

      setPhase('done')
    } catch (e) {
      console.error('Widget render error:', e)
      setError(e instanceof Error ? e.message : 'Render failed')
    }
    animatingRef.current = false
  }, [])

  // When we receive final (non-streaming) widget code, do progressive render
  useEffect(() => {
    if (widgetCode && !isStreaming && !scriptsExecutedRef.current) {
      scriptsExecutedRef.current = true
      renderProgressively(widgetCode)
    }
  }, [widgetCode, isStreaming, renderProgressively])

  // Rotate loading messages
  useEffect(() => {
    if (phase !== 'loading' || loadingMessages.length <= 1) return
    const timer = setInterval(() => {
      setLoadingMsgIndex((i) => (i + 1) % loadingMessages.length)
    }, 2500)
    return () => clearInterval(timer)
  }, [phase, loadingMessages])

  if (error) {
    return (
      <div className="my-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
        Widget error: {error}
      </div>
    )
  }

  return (
    <div className="widget-container my-4 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
      {phase === 'loading' && (
        <div className="flex items-center gap-3 p-4">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {loadingMessages[loadingMsgIndex]}
          </span>
        </div>
      )}

      {phase === 'growing' && (
        <div className="flex items-center gap-2 px-4 pt-3 pb-1">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-gray-400">Rendering...</span>
        </div>
      )}

      <div
        ref={containerRef}
        className="widget-render-area p-4"
        data-widget-title={title}
      />
    </div>
  )
}
