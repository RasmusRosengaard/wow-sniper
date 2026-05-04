import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  getSettings: (): Promise<Record<string, unknown>> => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: Record<string, unknown>): Promise<void> =>
    ipcRenderer.invoke('save-settings', settings),
  showNotification: (title: string, body: string): Promise<void> =>
    ipcRenderer.invoke('show-notification', { title, body }),
  getVersion: (): Promise<string> => ipcRenderer.invoke('get-version'),
})
