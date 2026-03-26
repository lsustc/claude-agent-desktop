import type { SessionMeta } from '../../shared/types'

interface SidebarProps {
  sessions: SessionMeta[]
  selectedChatId: string | null
  onSelectChat: (id: string) => void
  onNewChat: () => void
  onDeleteChat: (id: string) => void
  onOpenSettings: () => void
}

export default function Sidebar({
  sessions,
  selectedChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onOpenSettings
}: SidebarProps) {
  return (
    <div className="w-64 h-full flex flex-col bg-gray-100 dark:bg-gray-900 border-r border-gray-300 dark:border-gray-800">
      {/* Spacer for macOS traffic lights */}
      <div className="h-11 flex-shrink-0" />

      {/* New chat button */}
      <div className="px-3 pb-3">
        <button
          onClick={onNewChat}
          className="w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          + New chat
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2">
        {sessions.length === 0 ? (
          <p className="text-center text-sm text-gray-400 mt-4">No chats yet</p>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => onSelectChat(session.id)}
              className={`group flex items-center justify-between px-3 py-2 mb-0.5 rounded-lg cursor-pointer text-sm transition-colors ${
                selectedChatId === session.id
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <span className="truncate flex-1">{session.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteChat(session.id)
                }}
                className="hidden group-hover:block text-gray-400 hover:text-red-500 ml-2 text-xs"
              >
                x
              </button>
            </div>
          ))
        )}
      </div>

      {/* Settings button */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={onOpenSettings}
          className="w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-left"
        >
          Settings
        </button>
      </div>
    </div>
  )
}
