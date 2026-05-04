/// <reference types="vite/client" />

interface ElectronAPI {
  getSettings: () => Promise<Record<string, unknown>>
  saveSettings: (settings: Record<string, unknown>) => Promise<void>
  showNotification: (title: string, body: string) => Promise<void>
  getVersion: () => Promise<string>
}

declare global {
  interface Window {
    electron: ElectronAPI
  }
}

export {}
