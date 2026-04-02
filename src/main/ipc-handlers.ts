import { ipcMain } from 'electron'
import { IPC } from '../shared/ipc-channels'
import { configStore } from './config-store'
import { sessionStore } from './session-store'
import { agentManager } from './agent-manager'
import { runtimeStore } from './runtime-store'
import type { AppConfig, ArtifactKind, McpServerEntry, WorkspaceKind } from '../shared/types'

export function registerIpcHandlers(): void {
  // Chat
  ipcMain.handle(IPC.CHAT_CREATE_SESSION, (_event, options?: { model?: string }) => {
    const model = (options?.model as 'opus' | 'sonnet' | 'haiku') || configStore.get('defaultModel')
    return sessionStore.create(model)
  })

  ipcMain.handle(IPC.CHAT_LIST_SESSIONS, () => {
    return sessionStore.list()
  })

  ipcMain.handle(IPC.CHAT_GET_MESSAGES, (_event, chatId: string) => {
    return sessionStore.getMessages(chatId)
  })

  ipcMain.handle(IPC.CHAT_SEND_MESSAGE, (_event, chatId: string, content: string) => {
    agentManager.sendMessage(chatId, content)
  })

  ipcMain.handle(IPC.CHAT_DELETE_SESSION, (_event, chatId: string) => {
    agentManager.closeSession(chatId)
    sessionStore.delete(chatId)
  })

  ipcMain.handle(IPC.CHAT_STOP, (_event, chatId: string) => {
    agentManager.closeSession(chatId)
  })

  // Runtime
  ipcMain.handle(IPC.RUNTIME_LIST_WORKSPACES, () => {
    return runtimeStore.list()
  })

  ipcMain.handle(IPC.RUNTIME_GET_WORKSPACE, (_event, workspaceId: string) => {
    return runtimeStore.get(workspaceId)
  })

  ipcMain.handle(
    IPC.RUNTIME_CREATE_WORKSPACE,
    (_event, input?: { title?: string; focus?: string; kind?: WorkspaceKind }) => {
      return runtimeStore.create(input)
    }
  )

  ipcMain.handle(IPC.RUNTIME_DELETE_WORKSPACE, (_event, workspaceId: string) => {
    const workspace = runtimeStore.get(workspaceId)
    if (workspace?.sessionId) {
      agentManager.closeSession(workspace.sessionId)
    }
    runtimeStore.delete(workspaceId)
  })

  ipcMain.handle(
    IPC.RUNTIME_UPDATE_WORKSPACE,
    (_event, workspaceId: string, input: { title?: string; focus?: string }) => {
      return runtimeStore.update(workspaceId, input)
    }
  )

  ipcMain.handle(
    IPC.RUNTIME_REORDER_WORKSPACES,
    (_event, sourceWorkspaceId: string, targetWorkspaceId: string) => {
      runtimeStore.reorderWorkspaces(sourceWorkspaceId, targetWorkspaceId)
    }
  )

  ipcMain.handle(
    IPC.RUNTIME_REORDER_ARTIFACTS,
    (_event, workspaceId: string, sourceArtifactId: string, targetArtifactId: string) => {
      runtimeStore.reorderArtifacts(workspaceId, sourceArtifactId, targetArtifactId)
    }
  )

  ipcMain.handle(
    IPC.RUNTIME_SAVE_ARTIFACT,
    (
      _event,
      workspaceId: string,
      input: {
        title: string
        kind: ArtifactKind
        summary: string
        prompt: string
        tags?: string[]
        widgetCode?: string
      }
    ) => {
      return runtimeStore.saveArtifact(workspaceId, input)
    }
  )

  // Config
  ipcMain.handle(IPC.CONFIG_GET, (_event, key: keyof AppConfig) => {
    return configStore.get(key)
  })

  ipcMain.handle(IPC.CONFIG_SET, (_event, key: keyof AppConfig, value: unknown) => {
    configStore.set(key, value as AppConfig[keyof AppConfig])
  })

  ipcMain.handle(IPC.CONFIG_GET_ALL, () => {
    return configStore.getAll()
  })

  // MCP Servers
  ipcMain.handle(IPC.MCP_LIST_SERVERS, () => {
    return configStore.get('mcpServers')
  })

  ipcMain.handle(IPC.MCP_ADD_SERVER, (_event, server: McpServerEntry) => {
    const servers = configStore.get('mcpServers')
    servers.push(server)
    configStore.set('mcpServers', servers)
  })

  ipcMain.handle(IPC.MCP_REMOVE_SERVER, (_event, id: string) => {
    const servers = configStore.get('mcpServers').filter((s) => s.id !== id)
    configStore.set('mcpServers', servers)
  })

  ipcMain.handle(IPC.MCP_TOGGLE_SERVER, (_event, id: string) => {
    const servers = configStore.get('mcpServers')
    const server = servers.find((s) => s.id === id)
    if (server) {
      server.enabled = !server.enabled
      configStore.set('mcpServers', servers)
    }
  })
}
