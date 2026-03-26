import { v4 as uuidv4 } from 'uuid'
import type { SessionMeta, StreamEvent, ModelType } from '../shared/types'

const sessions = new Map<string, SessionMeta>()
const messages = new Map<string, StreamEvent[]>()
const sdkSessionIds = new Map<string, string>()

export const sessionStore = {
  create(model: ModelType): SessionMeta {
    const id = uuidv4()
    const now = new Date().toISOString()
    const meta: SessionMeta = {
      id,
      title: 'New Chat',
      model,
      createdAt: now,
      updatedAt: now
    }
    sessions.set(id, meta)
    messages.set(id, [])
    return meta
  },

  delete(chatId: string): void {
    sessions.delete(chatId)
    messages.delete(chatId)
    sdkSessionIds.delete(chatId)
  },

  list(): SessionMeta[] {
    return Array.from(sessions.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  },

  get(chatId: string): SessionMeta | undefined {
    return sessions.get(chatId)
  },

  getMessages(chatId: string): StreamEvent[] {
    return messages.get(chatId) || []
  },

  appendEvent(chatId: string, event: StreamEvent): void {
    const list = messages.get(chatId)
    if (list) {
      list.push(event)
      const meta = sessions.get(chatId)
      if (meta) {
        meta.updatedAt = new Date().toISOString()
        // Auto-title from first user message
        if (meta.title === 'New Chat' && event.type === 'text' && event.content) {
          // This is the first assistant text - don't use it for title
        }
      }
    }
  },

  setTitle(chatId: string, title: string): void {
    const meta = sessions.get(chatId)
    if (meta) {
      meta.title = title.slice(0, 60)
    }
  },

  getSdkSessionId(chatId: string): string | undefined {
    return sdkSessionIds.get(chatId)
  },

  setSdkSessionId(chatId: string, sdkId: string): void {
    sdkSessionIds.set(chatId, sdkId)
  }
}
