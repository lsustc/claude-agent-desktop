import { v4 as uuidv4 } from 'uuid'
import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, mkdirSync, unlinkSync, existsSync, readdirSync } from 'fs'
import type { SessionMeta, StreamEvent, ModelType } from '../shared/types'

// Persist sessions to disk: ~/.config/claude-agent-desktop/sessions/
function getSessionsDir(): string {
  const dir = join(app.getPath('userData'), 'sessions')
  mkdirSync(dir, { recursive: true })
  return dir
}

function sessionMetaPath(dir: string, chatId: string): string {
  return join(dir, `${chatId}.meta.json`)
}

function sessionMsgsPath(dir: string, chatId: string): string {
  return join(dir, `${chatId}.msgs.json`)
}

// In-memory cache backed by files
let sessions = new Map<string, SessionMeta>()
let messages = new Map<string, StreamEvent[]>()
const sdkSessionIds = new Map<string, string>()
let loaded = false

function loadFromDisk(): void {
  if (loaded) return
  loaded = true

  try {
    const dir = getSessionsDir()
    const files = readdirSync(dir).filter((f) => f.endsWith('.meta.json'))

    for (const file of files) {
      try {
        const chatId = file.replace('.meta.json', '')
        const meta: SessionMeta = JSON.parse(readFileSync(join(dir, file), 'utf-8'))
        sessions.set(chatId, meta)

        const msgsFile = sessionMsgsPath(dir, chatId)
        if (existsSync(msgsFile)) {
          const msgs: StreamEvent[] = JSON.parse(readFileSync(msgsFile, 'utf-8'))
          messages.set(chatId, msgs)
        } else {
          messages.set(chatId, [])
        }
      } catch (e) {
        console.warn('[sessions] Failed to load session file:', file, e)
      }
    }

    console.log(`[sessions] Loaded ${sessions.size} sessions from disk`)
  } catch (e) {
    console.warn('[sessions] Failed to load sessions:', e)
  }
}

function saveMeta(chatId: string): void {
  try {
    const meta = sessions.get(chatId)
    if (!meta) return
    const dir = getSessionsDir()
    writeFileSync(sessionMetaPath(dir, chatId), JSON.stringify(meta, null, 2))
  } catch (e) {
    console.warn('[sessions] Failed to save meta:', chatId, e)
  }
}

// Debounce message saves to avoid writing on every token
const pendingSaves = new Set<string>()
let saveTimer: ReturnType<typeof setTimeout> | null = null

function scheduleMsgSave(chatId: string): void {
  pendingSaves.add(chatId)
  if (!saveTimer) {
    saveTimer = setTimeout(() => {
      saveTimer = null
      for (const id of pendingSaves) {
        try {
          const msgs = messages.get(id)
          if (msgs) {
            const dir = getSessionsDir()
            writeFileSync(sessionMsgsPath(dir, id), JSON.stringify(msgs))
          }
        } catch (e) {
          console.warn('[sessions] Failed to save messages:', id, e)
        }
      }
      pendingSaves.clear()
    }, 2000) // Write at most every 2 seconds
  }
}

// Force flush all pending saves (call on app quit)
function flushAll(): void {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  for (const id of pendingSaves) {
    try {
      const msgs = messages.get(id)
      if (msgs) {
        const dir = getSessionsDir()
        writeFileSync(sessionMsgsPath(dir, id), JSON.stringify(msgs))
      }
    } catch { /* ignore on quit */ }
  }
  pendingSaves.clear()
}

export const sessionStore = {
  init(): void {
    loadFromDisk()
  },

  flush(): void {
    flushAll()
  },

  create(model: ModelType): SessionMeta {
    loadFromDisk()
    const id = uuidv4()
    const now = new Date().toISOString()
    const meta: SessionMeta = { id, title: 'New Chat', model, createdAt: now, updatedAt: now }
    sessions.set(id, meta)
    messages.set(id, [])
    saveMeta(id)
    return meta
  },

  delete(chatId: string): void {
    sessions.delete(chatId)
    messages.delete(chatId)
    sdkSessionIds.delete(chatId)
    pendingSaves.delete(chatId)

    try {
      const dir = getSessionsDir()
      const metaFile = sessionMetaPath(dir, chatId)
      const msgsFile = sessionMsgsPath(dir, chatId)
      if (existsSync(metaFile)) unlinkSync(metaFile)
      if (existsSync(msgsFile)) unlinkSync(msgsFile)
    } catch { /* ignore */ }
  },

  list(): SessionMeta[] {
    loadFromDisk()
    return Array.from(sessions.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  },

  get(chatId: string): SessionMeta | undefined {
    loadFromDisk()
    return sessions.get(chatId)
  },

  getMessages(chatId: string): StreamEvent[] {
    loadFromDisk()
    return messages.get(chatId) || []
  },

  appendEvent(chatId: string, event: StreamEvent): void {
    const list = messages.get(chatId)
    if (list) {
      list.push(event)
      const meta = sessions.get(chatId)
      if (meta) {
        meta.updatedAt = new Date().toISOString()
      }
      scheduleMsgSave(chatId)
    }
  },

  setTitle(chatId: string, title: string): void {
    const meta = sessions.get(chatId)
    if (meta) {
      meta.title = title.slice(0, 60)
      saveMeta(chatId)
    }
  },

  getSdkSessionId(chatId: string): string | undefined {
    return sdkSessionIds.get(chatId)
  },

  setSdkSessionId(chatId: string, sdkId: string): void {
    sdkSessionIds.set(chatId, sdkId)
  }
}
