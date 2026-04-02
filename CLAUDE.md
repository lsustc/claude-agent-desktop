# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start in development mode (Electron + Vite HMR)
npm run build        # Build for production (outputs to out/)
npm run start        # Preview production build
npm run build:mac    # Package for macOS (.dmg → dist/)
npm run build:win    # Package for Windows (.exe → dist/)
npm run build:linux  # Package for Linux (.AppImage → dist/)
```

No test runner is configured. There are no lint scripts in package.json.

## Architecture

This is an **Electron + React** desktop AI agent app called **Lumi**, built on `@anthropic-ai/claude-agent-sdk`.

### Process Structure

**Main process** (`src/main/`) — Node.js/Electron, runs the AI agent:
- `agent-manager.ts` — Core: wraps SDK `query()` with a `MessageQueue` async iterator to enable multi-turn conversation within a single `query()` call. One `SessionEntry` per chat (queue + output iterator). Handles stream_events for real-time text/widget streaming.
- `message-handler.ts` — Converts raw SDK messages (assistant/result/system types) into typed `StreamEvent` objects for the renderer.
- `config-store.ts` — `electron-store` persistence. Stores API key, model, system prompt, allowed tools, MCP servers, sub-agents.
- `session-store.ts` — In-memory + persisted session/message history.
- `ipc-handlers.ts` — Registers all IPC handlers (chat, config, MCP ops).
- `mcp-tools/generative-ui.ts` — Defines two built-in MCP tools: `show_widget` (renders HTML inline) and `read_me` (loads module docs on demand).

**Preload** (`src/preload/index.ts`) — `contextBridge` exposing safe APIs to renderer. `contextIsolation: true`, `nodeIntegration: false`.

**Renderer** (`src/renderer/`) — React 19, Tailwind CSS:
- `hooks/useChat.ts` — All chat state: sessions, messages, sending, IPC event subscription.
- `components/WidgetRenderer.tsx` — Progressive HTML rendering via `morphdom`: splits HTML into chunks, diffs into DOM incrementally with fade-in animation, then runs `<script>` tags in order.
- `components/MessageRenderer.tsx` — Routes `StreamEvent` type to appropriate renderer (text → `MarkdownMessage`, widget → `WidgetRenderer`, tool_use → `ToolCallCard`, thinking → `ThinkingBlock`).
- `components/settings/` — Settings tabs: General, MCP servers, Agents, Tool permissions.

**Shared** (`src/shared/`) — Types and IPC channel constants used by both main and renderer.

### Key Data Flow

```
User input → IPC (chat:send-message) → agentManager.sendMessage()
  → MessageQueue.push() → SDK query() async iterator
    → stream_event (text_delta) → IPC (chat:stream-event) → renderer (streaming text)
    → stream_event (content_block_start show_widget) → IPC → loading widget state
    → assistant message → processSDKMessage() → StreamEvent[] → IPC → renderer
      → WidgetRenderer: morphdom progressive rendering + CDN script loading
```

### Auth

Two modes controlled by `configStore.get('apiKey')`:
- **API Key**: sets `process.env.ANTHROPIC_API_KEY` before each session.
- **Subscription** (no API key): clears the env var so the SDK auto-reads the OAuth token stored by `claude login` from macOS Keychain.

### MCP Servers

- Built-in `generative-ui` MCP server is always registered.
- User-added `command` type servers: passed directly as `{ command, args, env }`.
- User-added `sse`/`http` type servers: bridged via `npx mcp-remote <url>` (SDK CLI doesn't natively support SSE/HTTP).
- All enabled MCP server tools are auto-allowed via wildcard `mcp__<name>__*`.

### Generative UI

Widgets are raw HTML fragments (`<style>...<div>...<script>...`), never full documents. They use CSS variables (`--widget-text`, `--widget-surface`, `--widget-border`, `--widget-accent`) for theming. CDN libraries (ECharts, Chart.js, D3, Mermaid) load from jsDelivr/cdnjs/unpkg per the CSP allowlist in `src/main/index.ts`.

### Path Aliases

- `@` → `src/renderer/`
- `@shared` → `src/shared/`

### Build Output

- `out/` — electron-vite build output (main, preload, renderer)
- `dist/` — electron-builder packaged app
