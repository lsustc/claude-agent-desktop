import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// Module docs embedded at build time via raw string
// At runtime, try multiple paths to find the .md files
const MODULE_NAMES = ['chart', 'diagram', 'interactive', 'mockup', 'art'] as const

function getModulesDir(): string {
  // Try various paths relative to this file's location
  const candidates = [
    join(__dirname, 'mcp-tools', 'modules'),
    join(__dirname, 'modules'),
    join(__dirname, '..', 'src', 'main', 'mcp-tools', 'modules'),
    // For development: relative to project root
    join(process.cwd(), 'src', 'main', 'mcp-tools', 'modules')
  ]

  for (const dir of candidates) {
    if (existsSync(join(dir, 'chart.md'))) {
      return dir
    }
  }

  return candidates[candidates.length - 1] // fallback to cwd-based path
}

let modulesDir: string | null = null

function loadModule(name: string): string {
  if (!modulesDir) {
    modulesDir = getModulesDir()
  }

  try {
    const filePath = join(modulesDir, `${name}.md`)
    return readFileSync(filePath, 'utf-8')
  } catch {
    console.warn(`[generative-ui] Module "${name}" not found in ${modulesDir}`)
    return `Module "${name}" documentation not found. Follow general best practices:
- Output raw HTML fragment: <style>...</style><div>...</div><script>...</script>
- NO DOCTYPE, html, head, body tags. NO HTML comments.
- Use CSS variables: var(--widget-text), var(--widget-surface), var(--widget-border), var(--widget-accent)
- NO gradients, shadows, blur. Font-weight 400/500 only.
- Width 100%, responsive.`
  }
}

export function createGenerativeUIMcpServer() {
  return createSdkMcpServer({
    name: 'generative-ui',
    version: '1.0.0',
    tools: [
      tool(
        'read_me',
        'Load specialized documentation modules before creating widgets. MUST be called before show_widget. Returns design guidelines, recommended CDN libraries, code templates, and CSS variable references for the specified widget types.',
        {
          modules: z
            .array(z.enum(['diagram', 'mockup', 'interactive', 'chart', 'art']))
            .describe('Documentation modules to load. Choose based on what you need to create.')
        },
        async (args) => {
          const docs = args.modules.map((m) => loadModule(m)).join('\n\n---\n\n')
          return {
            content: [{ type: 'text' as const, text: docs }]
          }
        }
      ),

      tool(
        'show_widget',
        'Render an interactive HTML widget inline in the conversation. The widget_code is a raw HTML fragment (NO DOCTYPE, html, head, or body tags). Structure MUST be: <style>...</style> then <div>...</div> then <script>...</script>. Use CSS variables for theming (--widget-text, --widget-surface, --widget-border, --widget-accent). Scripts execute after full HTML is received.',
        {
          i_have_seen_read_me: z
            .boolean()
            .describe('Confirm that read_me was called first to load module docs'),
          title: z.string().describe('Snake_case identifier for the widget'),
          loading_messages: z
            .array(z.string())
            .min(1)
            .max(4)
            .describe('1-4 short messages shown while widget renders, e.g. "Building chart..."'),
          widget_code: z
            .string()
            .describe(
              'Raw HTML fragment. Order: <style>CSS</style><div>content</div><script src="CDN"></script><script>init code</script>'
            )
        },
        async (args) => {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  type: 'widget_rendered',
                  title: args.title,
                  status: 'success'
                })
              }
            ]
          }
        }
      )
    ]
  })
}
