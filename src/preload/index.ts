import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc-channels'
import type {
  AppConfig,
  ArtifactKind,
  McpServerEntry,
  RuntimeArtifact,
  SessionMeta,
  StreamEvent,
  WorkspaceDetail,
  WorkspaceKind,
  WorkspaceMeta
} from '../shared/types'

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

  // Runtime
  listWorkspaces: (): Promise<WorkspaceMeta[]> =>
    ipcRenderer.invoke(IPC.RUNTIME_LIST_WORKSPACES),

  getWorkspace: (workspaceId: string): Promise<WorkspaceDetail | undefined> =>
    ipcRenderer.invoke(IPC.RUNTIME_GET_WORKSPACE, workspaceId),

  createWorkspace: (input?: { title?: string; focus?: string; kind?: WorkspaceKind }): Promise<WorkspaceDetail> =>
    ipcRenderer.invoke(IPC.RUNTIME_CREATE_WORKSPACE, input),

  deleteWorkspace: (workspaceId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.RUNTIME_DELETE_WORKSPACE, workspaceId),

  updateWorkspace: (
    workspaceId: string,
    input: { title?: string; focus?: string }
  ): Promise<WorkspaceDetail | undefined> =>
    ipcRenderer.invoke(IPC.RUNTIME_UPDATE_WORKSPACE, workspaceId, input),

  reorderWorkspaces: (sourceWorkspaceId: string, targetWorkspaceId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.RUNTIME_REORDER_WORKSPACES, sourceWorkspaceId, targetWorkspaceId),

  reorderArtifacts: (
    workspaceId: string,
    sourceArtifactId: string,
    targetArtifactId: string
  ): Promise<void> =>
    ipcRenderer.invoke(IPC.RUNTIME_REORDER_ARTIFACTS, workspaceId, sourceArtifactId, targetArtifactId),

  saveArtifact: (
    workspaceId: string,
    input: {
      title: string
      kind: ArtifactKind
      summary: string
      prompt: string
      tags?: string[]
      widgetCode?: string
    }
  ): Promise<RuntimeArtifact | undefined> =>
    ipcRenderer.invoke(IPC.RUNTIME_SAVE_ARTIFACT, workspaceId, input),

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
