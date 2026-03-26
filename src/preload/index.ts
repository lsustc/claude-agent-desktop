import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc-channels'
import type { SessionMeta, StreamEvent, AppConfig, McpServerEntry } from '../shared/types'

const api = {
  // Chat
  createSession: (options?: { model?: string }): Promise<SessionMeta> =>
    ipcRenderer.invoke(IPC.CHAT_CREATE_SESSION, options),

  listSessions: (): Promise<SessionMeta[]> =>
    ipcRenderer.invoke(IPC.CHAT_LIST_SESSIONS),

  getMessages: (chatId: string): Promise<StreamEvent[]> =>
    ipcRenderer.invoke(IPC.CHAT_GET_MESSAGES, chatId),

  sendMessage: (chatId: string, content: string): Promise<void> =>
    ipcRenderer.invoke(IPC.CHAT_SEND_MESSAGE, chatId, content),

  deleteSession: (chatId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.CHAT_DELETE_SESSION, chatId),

  stopGeneration: (chatId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.CHAT_STOP, chatId),

  onStreamEvent: (callback: (event: StreamEvent) => void): (() => void) => {
    const handler = (_: unknown, event: StreamEvent) => callback(event)
    ipcRenderer.on(IPC.CHAT_STREAM_EVENT, handler)
    return () => ipcRenderer.removeListener(IPC.CHAT_STREAM_EVENT, handler)
  },

  // Config
  getConfig: <K extends keyof AppConfig>(key: K): Promise<AppConfig[K]> =>
    ipcRenderer.invoke(IPC.CONFIG_GET, key),

  setConfig: <K extends keyof AppConfig>(key: K, value: AppConfig[K]): Promise<void> =>
    ipcRenderer.invoke(IPC.CONFIG_SET, key, value),

  getAllConfig: (): Promise<AppConfig> =>
    ipcRenderer.invoke(IPC.CONFIG_GET_ALL),

  // MCP
  listMcpServers: (): Promise<McpServerEntry[]> =>
    ipcRenderer.invoke(IPC.MCP_LIST_SERVERS),

  addMcpServer: (server: McpServerEntry): Promise<void> =>
    ipcRenderer.invoke(IPC.MCP_ADD_SERVER, server),

  removeMcpServer: (id: string): Promise<void> =>
    ipcRenderer.invoke(IPC.MCP_REMOVE_SERVER, id),

  toggleMcpServer: (id: string): Promise<void> =>
    ipcRenderer.invoke(IPC.MCP_TOGGLE_SERVER, id)
}

contextBridge.exposeInMainWorld('electronAPI', api)

export type ElectronAPI = typeof api
