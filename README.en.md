# Claude Agent Desktop

A desktop AI agent application built with Electron, React, and the Claude Agent SDK. Its core feature is inline Generative UI rendering (charts, dashboards, interactive widgets) powered by morphdom, similar to Claude.ai's visualization capabilities.

Chinese version: [README.md](./README.md)

---

## Features

### AI conversation
- Multi-turn chat with Claude (Opus / Sonnet / Haiku)
- Streaming text output with rich Markdown rendering
- Thinking process display (collapsible)
- Session management (create, switch, delete, auto-title)

### Generative UI
- Inline HTML widget rendering directly in the conversation flow (not iframe)
- Progressive "grow-in" animation via morphdom DOM diffing
- CDN library support (ECharts, Chart.js, D3, Mermaid, etc.)
- CSS variable theming with dark mode support
- Custom MCP tools: `read_me` (lazy doc loading) + `show_widget` (HTML rendering)
- 5 module templates: chart, diagram, interactive, mockup, art

### Tool calls
- Visual tool call cards with per-tool styling (Bash terminal, file diff, search results)
- Collapsible input/output display
- Color-coded tool type icons

### Configuration
- **Authentication**: Claude subscription login (OAuth via `claude login`) or API key
- **MCP Servers**: Add, remove, enable/disable external MCP servers
- **Sub-agents**: Define custom agents with name, description, prompt, and tool permissions
- **Tool permissions**: Enable/disable individual tools per category
- **System prompt**: Customizable system prompt editor
- **Dark mode**: Toggle with system preference detection

---

## Architecture

```
Electron Main Process
  ├── AgentManager        SDK query() + MessageQueue pattern
  ├── ConfigStore         electron-store persistent config
  ├── SessionStore        In-memory session + message management
  ├── MCP Tools           show_widget + read_me (Generative UI)
  ├── IPC Handlers        contextBridge API for renderer
  └── index.ts            Window, CSP, PATH fix, link interception

Electron Preload
  └── contextBridge       Secure API surface (chat, config, MCP)

Electron Renderer (React)
  ├── App.tsx             Root with ErrorBoundary
  ├── Sidebar             Session list + new chat + settings
  ├── ChatView            Message list + input area
  ├── MessageRenderer     Routes events to specialized renderers
  ├── MarkdownMessage     react-markdown + GFM + typography
  ├── WidgetRenderer      morphdom progressive HTML rendering
  ├── ToolCallCard        Collapsible tool call display
  ├── ThinkingBlock       Collapsible thinking display
  └── Settings            Tabbed panel (General / MCP / Agents / Tools)
```

### Data flow

```
User input
  → IPC → AgentManager.sendMessage()
    → MessageQueue.push() → SDK query() iterator
      → stream_event (show_widget detected → loading state)
      → assistant message → processSDKMessage()
        → StreamEvent → IPC → Renderer
          → WidgetRenderer (morphdom) / MarkdownMessage / ToolCallCard
```

### Generative UI rendering pipeline

```
Claude calls show_widget({ widget_code: "<style>...<div>...<script>..." })
  → agent-manager detects tool via stream_event → sends loading state
  → Full widget_code arrives → StreamEvent { isStreaming: false }
  → WidgetRenderer:
    1. buildProgressiveChunks() splits HTML into N incremental chunks
    2. Each chunk morphdom-diffed into DOM with staggered delay
    3. New elements fade in from below (translateY + opacity animation)
    4. After all HTML rendered, <script> tags execute sequentially
    5. CDN scripts load → onload → inline scripts run
```

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Desktop | Electron 33 + electron-vite 3 |
| Frontend | React 19 + TypeScript |
| Styling | Tailwind CSS 3 + @tailwindcss/typography |
| AI | @anthropic-ai/claude-agent-sdk 0.2.83 |
| Widget rendering | morphdom 2.7 |
| Markdown | react-markdown + remark-gfm + rehype-raw |
| Config | electron-store 10 |
| Schema | zod 4 |

---

## Getting started

### Prerequisites

- Node.js 18+
- Claude Code CLI (for subscription auth):
  ```bash
  npm install -g @anthropic-ai/claude-code
  claude login
  ```

### Install and run

```bash
cd claude-agent-desktop
npm install
npm run dev
```

### Authentication

**Option 1: Subscription login (recommended, no API charges)**

1. Run `claude login` in terminal (one-time OAuth)
2. Open app → Settings → Select "Subscription" → Save
3. Uses your Claude Pro/Max/Team quota

**Option 2: API key**

1. Get key from [console.anthropic.com](https://console.anthropic.com)
2. Open app → Settings → Select "API Key" → Paste key → Save
3. Billed per usage

### Build for distribution

```bash
npm run build:mac    # macOS .dmg
npm run build:win    # Windows .exe
npm run build:linux  # Linux .AppImage
```

---

## Generative UI modules

| Module | Use case | Libraries |
|--------|----------|-----------|
| `chart` | Dashboards, KPI cards, bar/line/pie charts | ECharts, Chart.js |
| `diagram` | Flowcharts, architecture diagrams | SVG, Mermaid |
| `interactive` | Calculators, converters, quizzes | Vanilla JS |
| `mockup` | Mobile/desktop UI wireframes | CSS only |
| `art` | SVG illustrations, patterns, animations | SVG, CSS |

---

## Design decisions

- **morphdom over iframe**: Widgets render directly in the conversation DOM, enabling CSS variable theming and seamless integration
- **Progressive rendering**: HTML split into chunks, morphdom-diffed incrementally with fade-in animations
- **SDK bundled, CLI external**: Agent SDK is bundled but spawns `cli.js` as a subprocess via `pathToClaudeCodeExecutable`
- **Subscription auth**: Without `ANTHROPIC_API_KEY`, SDK reads OAuth tokens from macOS Keychain (stored by `claude login`)

---

## License

[MIT](./LICENSE)
