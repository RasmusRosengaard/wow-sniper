import React, { useState, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SnipeFeed } from './components/SnipeFeed'
import { Sidebar } from './components/Sidebar'
import { StatusBar } from './components/StatusBar'
import { Settings } from './components/Settings'
import { Watchlist } from './components/Watchlist'
import { useWebSocket } from './hooks/useWebSocket'
import { useSettings } from './hooks/useSettings'
import type { Snipe, ScannerStatus } from './types'

const MAX_SNIPES = 500
type View = 'feed' | 'watchlist' | 'settings'

const viewVariants = {
  initial: { opacity: 0, x: 8 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.18, ease: 'easeOut' } },
  exit:    { opacity: 0, x: -8, transition: { duration: 0.12, ease: 'easeIn' } },
}

export default function App() {
  const { settings, updateSettings, loaded } = useSettings()
  const [snipes, setSnipes]           = useState<Snipe[]>([])
  const [newSnipeIds, setNewSnipeIds] = useState<Set<number>>(new Set())
  const [status, setStatus]           = useState<ScannerStatus | null>(null)
  const [view, setView]               = useState<View>('feed')
  const [feedFilter, setFeedFilter]   = useState('')
  const newIdsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSnipe = useCallback(
    (snipe: Snipe) => {
      setSnipes((prev) => {
        const idx = prev.findIndex((s) => s.auction_id === snipe.auction_id)
        if (idx >= 0) {
          const next = [...prev]; next[idx] = snipe; return next
        }
        return [snipe, ...prev].slice(0, MAX_SNIPES)
      })
      setNewSnipeIds((prev) => { const n = new Set(prev); n.add(snipe.auction_id); return n })
      if (newIdsTimer.current) clearTimeout(newIdsTimer.current)
      newIdsTimer.current = setTimeout(() => setNewSnipeIds(new Set()), 3000)
      if (settings.notifications) {
        window.electron.showNotification(`Snipe: ${snipe.item_name}`, `-${snipe.discount_pct.toFixed(0)}% on ${snipe.realm_name}`)
      }
    },
    [settings.notifications]
  )

  const handleStatus = useCallback((s: Record<string, unknown>) => {
    setStatus(s as unknown as ScannerStatus)
  }, [])

  const { connState } = useWebSocket({ settings, onSnipe: handleSnipe, onStatus: handleStatus })

  if (!loaded) {
    return (
      <div className="h-screen flex items-center justify-center bg-wow-dark">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="font-wow text-wow-gold text-xl tracking-widest"
        >
          Loading…
        </motion.div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-wow-dark select-none">
      <div className="h-8 flex-shrink-0 [-webkit-app-region:drag]" />

      <div className="flex flex-1 min-h-0">
        <Sidebar activeView={view} onViewChange={setView} snipeCount={snipes.length} />

        <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              variants={viewVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex-1 min-h-0 flex flex-col"
            >
              {view === 'feed' && (
                <SnipeFeed
                  snipes={snipes}
                  newSnipeIds={newSnipeIds}
                  filter={feedFilter}
                  onFilterChange={setFeedFilter}
                  serverUrl={settings.serverUrl}
                />
              )}
              {view === 'watchlist' && (
                <Watchlist snipes={snipes} settings={settings} onSettingsChange={updateSettings} />
              )}
              {view === 'settings' && (
                <Settings settings={settings} onSave={updateSettings} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <StatusBar connState={connState} status={status} />
    </div>
  )
}
