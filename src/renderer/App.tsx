import { useState, Component, type ReactNode } from 'react'
import { useChat } from './hooks/useChat'
import Sidebar from './components/Sidebar'
import ChatView from './components/ChatView'
import SettingsPanel from './components/settings/SettingsPanel'

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null }

  static getDerivedStateFromError(error: Error) {
    return { error: error.message }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: 'system-ui' }}>
          <h2 style={{ color: '#dc2626' }}>App Error</h2>
          <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, whiteSpace: 'pre-wrap' }}>
            {this.state.error}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

function AppContent() {
  const chat = useChat()
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="flex h-full">
      <Sidebar
        sessions={chat.sessions}
        selectedChatId={chat.selectedChatId}
        onSelectChat={chat.selectSession}
        onNewChat={chat.createSession}
        onDeleteChat={chat.deleteSession}
        onOpenSettings={() => setShowSettings(true)}
      />
      <ChatView
        chatId={chat.selectedChatId}
        messages={chat.messages}
        isLoading={chat.isLoading}
        onSendMessage={chat.sendMessage}
        onStop={chat.stopGeneration}
      />
      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  )
}
