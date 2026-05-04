import { app, BrowserWindow, ipcMain, Notification, shell } from 'electron'
import { join } from 'path'
import { JsonStore } from './store'

const store = new JsonStore({
  defaults: {
    serverUrl: 'ws://localhost:8000/ws',
    enabledTiers: { low: true, medium: true, ultra: true } as { low: boolean; medium: boolean; ultra: boolean },
    watchlistItemIds: [] as number[],
    selectedRealmIds: [] as number[],
    sellingRealmId: 0 as number,
    thresholds: { low: 80, medium: 60, ultra: 40 },
    notifications: true,
    windowBounds: { width: 1200, height: 800 },
  },
})

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  const { width, height } = store.get('windowBounds')

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0A0A0F',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#12121C',
      symbolColor: '#C8A951',
      height: 32,
    },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.on('resize', () => {
    const [w, h] = mainWindow!.getSize()
    store.set('windowBounds', { width: w, height: h })
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  ipcMain.handle('get-settings', () => store.store)
  ipcMain.handle('save-settings', (_event, settings: Record<string, unknown>) => {
    for (const [key, val] of Object.entries(settings)) {
      store.set(key, val)
    }
  })
  ipcMain.handle('get-version', () => app.getVersion())
  ipcMain.handle('show-notification', (_event, { title, body }: { title: string; body: string }) => {
    if (store.get('notifications') && Notification.isSupported()) {
      new Notification({ title, body }).show()
    }
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
