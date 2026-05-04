import { useState, useEffect, useCallback } from 'react'
import type { AppSettings } from '../types'

const DEFAULT_SETTINGS: AppSettings = {
  serverUrl: 'ws://localhost:8000/ws',
  enabledTiers: { low: true, medium: true, ultra: true },
  watchlistItemIds: [],
  selectedRealmIds: [],
  sellingRealmId: 0,
  thresholds: { low: 80, medium: 60, ultra: 40 },
  notifications: true,
}

function apiBase(serverUrl: string): string {
  return serverUrl.replace('ws://', 'http://').replace('wss://', 'https://').replace(/\/ws$/, '')
}

async function pushToBackend(s: AppSettings): Promise<void> {
  try {
    await fetch(`${apiBase(s.serverUrl)}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        selling_realm_id: s.sellingRealmId,
        threshold_low: s.thresholds.low,
        threshold_medium: s.thresholds.medium,
        threshold_ultra: s.thresholds.ultra,
      }),
    })
  } catch {
    // backend not ready yet — settings will be pushed on next save
  }
}

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    window.electron.getSettings().then((stored) => {
      const merged = { ...DEFAULT_SETTINGS, ...(stored as Partial<AppSettings>) }
      setSettingsState(merged)
      setLoaded(true)
      pushToBackend(merged)
    })
  }, [])

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch }
      window.electron.saveSettings(next as Record<string, unknown>)
      pushToBackend(next)
      return next
    })
  }, [])

  return { settings, updateSettings, loaded }
}
