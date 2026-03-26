import { app, BrowserWindow, session, shell } from 'electron'
import { join } from 'path'
import { execSync } from 'child_process'
import { registerIpcHandlers } from './ipc-handlers'
import { agentManager } from './agent-manager'

const isDev = process.env.NODE_ENV === 'development'

// Fix PATH for GUI apps on macOS - Electron doesn't inherit shell PATH
function fixPath(): void {
  try {
    const shell = process.env.SHELL || '/bin/zsh'
    const shellPath = execSync(`${shell} -ilc 'echo $PATH'`, {
      encoding: 'utf-8',
      timeout: 5000
    }).trim()
    if (shellPath) {
      process.env.PATH = shellPath
      console.log('[main] Fixed PATH from shell')
    }
  } catch (e) {
    console.warn('[main] Could not fix PATH:', (e as Error).message)
    // Fallback: add common paths
    const extra = [
      '/usr/local/bin',
      '/opt/homebrew/bin',
      `${process.env.HOME}/.nvm/versions/node/v20.19.3/bin`,
      `${process.env.HOME}/.local/bin`
    ].join(':')
    process.env.PATH = `${extra}:${process.env.PATH || ''}`
  }
}

function setupCSP(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    if (isDev) {
      callback({ responseHeaders: details.responseHeaders })
      return
    }

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com https://esm.sh",
            "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com",
            "img-src 'self' data: https:",
            "connect-src 'self' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com https://esm.sh https://ws:",
            "font-src 'self' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net"
          ].join('; ')
        ]
      }
    })
  })
}

function createWindow(): BrowserWindow {
  const preloadPath = join(__dirname, '../preload/index.mjs')
  console.log('[main] preload path:', preloadPath)
  console.log('[main] isDev:', isDev)
  console.log('[main] ELECTRON_RENDERER_URL:', process.env.ELECTRON_RENDERER_URL)

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: preloadPath,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    console.log('[main] Loading URL:', process.env.ELECTRON_RENDERER_URL)
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    const filePath = join(__dirname, '../renderer/index.html')
    console.log('[main] Loading file:', filePath)
    win.loadFile(filePath)
  }

  // Open external links in system browser instead of Electron window
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  // Also intercept navigation to external URLs
  win.webContents.on('will-navigate', (event, url) => {
    const rendererUrl = process.env.ELECTRON_RENDERER_URL || ''
    if (!url.startsWith(rendererUrl) && !url.startsWith('file://')) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  // Log renderer console messages
  win.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (sourceId && !sourceId.includes('devtools://')) {
      console.log(`[renderer][${level}] ${message} (${sourceId}:${line})`)
    }
  })

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[main] Failed to load:', errorCode, errorDescription)
  })

  if (isDev) {
    win.webContents.openDevTools({ mode: 'detach' })
  }

  return win
}

app.whenReady().then(() => {
  console.log('[main] App ready')
  fixPath()
  setupCSP()
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  agentManager.closeAll()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
