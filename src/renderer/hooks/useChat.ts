import { useState, useEffect, useCallback, useRef } from 'react'
import type { SessionMeta, StreamEvent } from '../../shared/types'

export function useChat() {
  const [sessions, setSessions] = useState<SessionMeta[]>([])
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<StreamEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const selectedChatIdRef = useRef(selectedChatId)

  useEffect(() => {
    selectedChatIdRef.current = selectedChatId
  }, [selectedChatId])

  // Load sessions on mount
  useEffect(() => {
    if (!window.electronAPI) return
    window.electronAPI.listSessions().then(setSessions).catch(console.error)
  }, [])

  // Subscribe to stream events
  useEffect(() => {
    if (!window.electronAPI) return
    const unsubscribe = window.electronAPI.onStreamEvent((event: StreamEvent) => {
      if (event.chatId !== selectedChatIdRef.current) return

      if (event.type === 'result' || event.type === 'error') {
        setIsLoading(false)
        // Refresh session list for updated titles
        window.electronAPI.listSessions().then(setSessions)
      }

      setMessages((prev) => {
        // Widget events: always replace the last widget entry (streaming or final)
        if (event.type === 'widget') {
          const idx = prev.findLastIndex((e) => e.type === 'widget')
          if (idx >= 0 && prev[idx].isStreaming) {
            // Replace streaming widget in-place (morphdom will diff)
            const updated = [...prev]
            updated[idx] = event
            return updated
          }
          // No existing streaming widget - append new one
        }
        return [...prev, event]
      })
    })
    return unsubscribe
  }, [])

  const createSession = useCallback(async () => {
    if (!window.electronAPI) return
    const session = await window.electronAPI.createSession()
    setSessions((prev) => [session, ...prev])
    setSelectedChatId(session.id)
    setMessages([])
    setIsLoading(false)
    return session
  }, [])

  const selectSession = useCallback(async (chatId: string) => {
    setSelectedChatId(chatId)
    setIsLoading(false)
    if (!window.electronAPI) return
    const history = await window.electronAPI.getMessages(chatId)
    setMessages(history)
  }, [])

  const deleteSession = useCallback(async (chatId: string) => {
    if (!window.electronAPI) return
    await window.electronAPI.deleteSession(chatId)
    setSessions((prev) => prev.filter((s) => s.id !== chatId))
    if (selectedChatIdRef.current === chatId) {
      setSelectedChatId(null)
      setMessages([])
    }
  }, [])

  const sendMessage = useCallback(async (content: string) => {
    if (!window.electronAPI || !selectedChatIdRef.current || !content.trim()) return

    const chatId = selectedChatIdRef.current

    // Add user message locally
    const userEvent: StreamEvent = {
      chatId,
      type: 'text',
      content
    }
    setMessages((prev) => [...prev, { ...userEvent, _isUser: true } as StreamEvent & { _isUser: boolean }])
    setIsLoading(true)

    await window.electronAPI.sendMessage(chatId, content)
  }, [])

  const stopGeneration = useCallback(async () => {
    if (!window.electronAPI || !selectedChatIdRef.current) return
    await window.electronAPI.stopGeneration(selectedChatIdRef.current)
    setIsLoading(false)
  }, [])

  return {
    sessions,
    selectedChatId,
    messages,
    isLoading,
    createSession,
    selectSession,
    deleteSession,
    sendMessage,
    stopGeneration
  }
}
