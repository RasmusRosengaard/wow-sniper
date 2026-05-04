import { useEffect, useRef, useCallback, useState } from 'react'
import type { Snipe, ConnectionState, AppSettings } from '../types'

interface UseWebSocketOptions {
  settings: AppSettings
  onSnipe: (snipe: Snipe) => void
  onStatus?: (status: Record<string, unknown>) => void
}

const RECONNECT_DELAY_MS = 3000
const MAX_RECONNECT_DELAY_MS = 30000

export function useWebSocket({ settings, onSnipe, onStatus }: UseWebSocketOptions) {
  const [connState, setConnState] = useState<ConnectionState>('disconnected')
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectDelay = useRef(RECONNECT_DELAY_MS)
  const mountedRef = useRef(true)

  const sendSubscribe = useCallback((ws: WebSocket, s: AppSettings) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'subscribe',
          realm_ids: s.selectedRealmIds,
          min_tier: 'low',
          watchlist_item_ids: s.watchlistItemIds,
        })
      )
    }
  }, [])

  const fetchRecent = useCallback(async () => {
    try {
      const base = settings.serverUrl
        .replace('ws://', 'http://')
        .replace('wss://', 'https://')
        .replace(/\/ws$/, '')

      // Only fetch snipes from the current backend session to avoid showing
      // stale data from previous runs before all realms were scanned.
      const statusRes = await fetch(`${base}/api/status`)
      if (!statusRes.ok) return
      const status = await statusRes.json()
      onStatus?.(status)
      const startedAt: string | undefined = status.started_at
      if (!startedAt) return

      const startedMs = new Date(startedAt).getTime()
      const sinceMinutes = Math.ceil((Date.now() - startedMs) / 60_000) + 1

      const res = await fetch(`${base}/api/snipes?since_minutes=${sinceMinutes}&limit=200`)
      if (!res.ok) return
      const snipes: Snipe[] = await res.json()
      for (const s of snipes.reverse()) onSnipe(s)
    } catch {
      // backend may not be ready
    }
  }, [settings.serverUrl, onSnipe])

  const connect = useCallback(() => {
    if (!mountedRef.current) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setConnState('connecting')
    const ws = new WebSocket(settings.serverUrl)
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(); return }
      reconnectDelay.current = RECONNECT_DELAY_MS
      setConnState('connected')
      sendSubscribe(ws, settings)
      fetchRecent()
    }

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data)
        if (msg.type === 'snipe') {
          onSnipe(msg.data as Snipe)
        } else if (msg.type === 'status') {
          onStatus?.(msg.data)
        }
      } catch {
        // ignore malformed messages
      }
    }

    ws.onerror = () => {
      setConnState('error')
    }

    ws.onclose = () => {
      if (!mountedRef.current) return
      setConnState('disconnected')
      reconnectTimer.current = setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 1.5, MAX_RECONNECT_DELAY_MS)
        connect()
      }, reconnectDelay.current)
    }
  }, [settings, onSnipe, onStatus, sendSubscribe, fetchRecent])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  // Re-send subscribe filters when settings change
  useEffect(() => {
    if (wsRef.current) sendSubscribe(wsRef.current, settings)
  }, [settings.selectedRealmIds, settings.watchlistItemIds, sendSubscribe])

  return { connState }
}
