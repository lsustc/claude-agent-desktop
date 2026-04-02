import { useState, Component, type ReactNode } from 'react'
import { useRuntime } from './hooks/useRuntime'
import MainView from './components/MainView'
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
        <div style={{ padding: 40, fontFamily: 'monospace', background: '#0a0e1a', color: '#f87171', minHeight: '100vh' }}>
          <h2>App Error</h2>
          <pre style={{ background: '#111827', padding: 16, borderRadius: 8, whiteSpace: 'pre-wrap', color: '#fca5a5' }}>
            {this.state.error}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

export type AppView = 'chat' | 'settings' | 'history'

function AppContent() {
  const runtime = useRuntime()
  const [view, setView] = useState<AppView>('chat')

  return (
    <div className="flex h-full relative bg-[#0a0e1a]">
      {/* macOS window drag region */}
      <div
        className="absolute top-0 left-0 right-0 h-8 z-10"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />

      {view === 'settings' ? (
        <SettingsPanel onClose={() => setView('chat')} />
      ) : (
        <MainView
          runtime={runtime}
          view={view}
          setView={setView}
        />
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
