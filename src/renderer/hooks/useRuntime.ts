import { useCallback, useEffect, useMemo, useState } from 'react'
import { useChat } from './useChat'
import type { RuntimeArtifact, WorkspaceDetail, WorkspaceMeta } from '../../shared/types'

export function useRuntime() {
  const chat = useChat()
  const {
    selectSession,
    sendMessage
  } = chat
  const [workspaces, setWorkspaces] = useState<WorkspaceMeta[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceDetail | null>(null)
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null)

  const selectWorkspace = useCallback(async (workspaceId: string) => {
    if (!window.electronAPI) return

    setSelectedWorkspaceId(workspaceId)
    const workspace = await window.electronAPI.getWorkspace(workspaceId)
    if (!workspace) return

    setSelectedWorkspace(workspace)
    setSelectedArtifactId((current) => {
      if (current && workspace.artifacts.some((artifact) => artifact.id === current)) {
        return current
      }
      return workspace.artifacts[0]?.id || null
    })

    if (workspace.sessionId) {
      await selectSession(workspace.sessionId)
    }
  }, [selectSession])

  const refreshWorkspaces = useCallback(async () => {
    if (!window.electronAPI) return
    const list = await window.electronAPI.listWorkspaces()
    setWorkspaces(list)

    if (list.length === 0) {
      setSelectedWorkspaceId(null)
      setSelectedWorkspace(null)
      setSelectedArtifactId(null)
      return
    }

    const targetId = selectedWorkspaceId && list.some((workspace) => workspace.id === selectedWorkspaceId)
      ? selectedWorkspaceId
      : list[0].id

    await selectWorkspace(targetId)
  }, [selectedWorkspaceId, selectWorkspace])

  useEffect(() => {
    refreshWorkspaces().catch(console.error)
  }, [refreshWorkspaces])

  const createWorkspace = useCallback(async (input?: { title?: string; focus?: string }) => {
    if (!window.electronAPI) return undefined
    const workspace = await window.electronAPI.createWorkspace(input)
    await refreshWorkspaces()
    await selectWorkspace(workspace.id)
    return workspace
  }, [refreshWorkspaces, selectWorkspace])

  const deleteWorkspace = useCallback(async (workspaceId: string) => {
    if (!window.electronAPI) return

    const list = await window.electronAPI.listWorkspaces()
    const currentIndex = list.findIndex((workspace) => workspace.id === workspaceId)
    const fallback = currentIndex >= 0
      ? list[currentIndex + 1] || list[currentIndex - 1] || null
      : null

    await window.electronAPI.deleteWorkspace(workspaceId)
    await refreshWorkspaces()

    if (fallback && fallback.id !== workspaceId) {
      await selectWorkspace(fallback.id)
      return
    }

    const nextList = await window.electronAPI.listWorkspaces()
    if (nextList[0]) {
      await selectWorkspace(nextList[0].id)
    } else {
      setSelectedWorkspaceId(null)
      setSelectedWorkspace(null)
      setSelectedArtifactId(null)
    }
  }, [refreshWorkspaces, selectWorkspace])

  const renameWorkspace = useCallback(async (workspaceId: string, title: string) => {
    if (!window.electronAPI) return undefined

    const trimmed = title.trim()
    if (!trimmed) return undefined

    const workspace = await window.electronAPI.updateWorkspace(workspaceId, { title: trimmed })
    await refreshWorkspaces()

    if (workspaceId === selectedWorkspaceId) {
      await selectWorkspace(workspaceId)
    }

    return workspace
  }, [refreshWorkspaces, selectWorkspace, selectedWorkspaceId])

  const reorderWorkspaces = useCallback(async (sourceWorkspaceId: string, targetWorkspaceId: string) => {
    if (!window.electronAPI || sourceWorkspaceId === targetWorkspaceId) return
    await window.electronAPI.reorderWorkspaces(sourceWorkspaceId, targetWorkspaceId)
    await refreshWorkspaces()
  }, [refreshWorkspaces])

  const reorderArtifacts = useCallback(async (sourceArtifactId: string, targetArtifactId: string) => {
    if (!window.electronAPI || !selectedWorkspaceId || sourceArtifactId === targetArtifactId) return
    await window.electronAPI.reorderArtifacts(selectedWorkspaceId, sourceArtifactId, targetArtifactId)
    await selectWorkspace(selectedWorkspaceId)
  }, [selectWorkspace, selectedWorkspaceId])

  const saveArtifact = useCallback(async (input: {
    title: string
    kind: RuntimeArtifact['kind']
    summary: string
    prompt: string
    tags?: string[]
    widgetCode?: string
  }) => {
    if (!window.electronAPI || !selectedWorkspaceId) return undefined

    const artifact = await window.electronAPI.saveArtifact(selectedWorkspaceId, input)
    await selectWorkspace(selectedWorkspaceId)

    if (artifact) {
      setSelectedArtifactId(artifact.id)
    }

    return artifact
  }, [selectWorkspace, selectedWorkspaceId])

  const selectArtifact = useCallback((artifactId: string) => {
    setSelectedArtifactId(artifactId)
  }, [])

  const selectedArtifact = useMemo<RuntimeArtifact | null>(() => {
    if (!selectedWorkspace || !selectedArtifactId) return null
    return selectedWorkspace.artifacts.find((artifact) => artifact.id === selectedArtifactId) || null
  }, [selectedWorkspace, selectedArtifactId])

  const sendPrompt = useCallback(async (prompt: string) => {
    let workspace = selectedWorkspace
    if (!workspace) {
      const created = await createWorkspace()
      if (!created) return
      workspace = created
    }

    await sendMessage(prompt, workspace.sessionId)
  }, [sendMessage, createWorkspace, selectedWorkspace])

  return {
    chat,
    workspaces,
    selectedWorkspaceId,
    selectedWorkspace,
    selectedArtifactId,
    selectedArtifact,
    createWorkspace,
    deleteWorkspace,
    renameWorkspace,
    reorderWorkspaces,
    reorderArtifacts,
    saveArtifact,
    refreshWorkspaces,
    selectWorkspace,
    selectArtifact,
    sendPrompt
  }
}
