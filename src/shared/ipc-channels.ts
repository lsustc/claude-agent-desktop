export const IPC = {
  // Chat
  CHAT_SEND_MESSAGE: 'chat:send-message',
  CHAT_STREAM_EVENT: 'chat:stream-event',
  CHAT_CREATE_SESSION: 'chat:create-session',
  CHAT_DELETE_SESSION: 'chat:delete-session',
  CHAT_LIST_SESSIONS: 'chat:list-sessions',
  CHAT_GET_MESSAGES: 'chat:get-messages',
  CHAT_STOP: 'chat:stop',

  // Config
  CONFIG_GET: 'config:get',
  CONFIG_SET: 'config:set',
  CONFIG_GET_ALL: 'config:get-all',

  // MCP
  MCP_LIST_SERVERS: 'mcp:list-servers',
  MCP_ADD_SERVER: 'mcp:add-server',
  MCP_REMOVE_SERVER: 'mcp:remove-server',
  MCP_TOGGLE_SERVER: 'mcp:toggle-server',

  // Tool permission
  TOOL_PERMISSION_REQUEST: 'tool:permission-request',
  TOOL_PERMISSION_RESPONSE: 'tool:permission-response',
} as const
