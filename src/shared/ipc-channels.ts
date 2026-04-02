export const IPC = {
  // Chat
  CHAT_SEND_MESSAGE: 'chat:send-message',
  CHAT_STREAM_EVENT: 'chat:stream-event',
  CHAT_CREATE_SESSION: 'chat:create-session',
  CHAT_DELETE_SESSION: 'chat:delete-session',
  CHAT_LIST_SESSIONS: 'chat:list-sessions',
  CHAT_GET_MESSAGES: 'chat:get-messages',
  CHAT_STOP: 'chat:stop',

  // Runtime
  RUNTIME_LIST_WORKSPACES: 'runtime:list-workspaces',
  RUNTIME_GET_WORKSPACE: 'runtime:get-workspace',
  RUNTIME_CREATE_WORKSPACE: 'runtime:create-workspace',
  RUNTIME_DELETE_WORKSPACE: 'runtime:delete-workspace',
  RUNTIME_UPDATE_WORKSPACE: 'runtime:update-workspace',
  RUNTIME_REORDER_WORKSPACES: 'runtime:reorder-workspaces',
  RUNTIME_REORDER_ARTIFACTS: 'runtime:reorder-artifacts',
  RUNTIME_SAVE_ARTIFACT: 'runtime:save-artifact',

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
