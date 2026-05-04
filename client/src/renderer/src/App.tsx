import React, { useState, useCallback, useRef } from 'react'
import { SnipeFeed } from './components/SnipeFeed'
import { Sidebar } from './components/Sidebar'
import { StatusBar } from './components/StatusBar'
import { Settings } from './components/Settings'
import { Watchlist } from './components/Watchlist'
import { useWebSocket } from './hooks/useWebSocket'
import { useSettings } from './hooks/useSettings'
import type { Snipe, ScannerStatus, Tier } from './types'

const MAX_SNIPES = 500

type View = 'feed' | 'watchlist' | 'settings'

export default function App() {
  const { settings, updateSettings, loaded } = useSettings()
  const [snipes, setSnipes] = useState<Snipe[]>([])
  const [newSnipeIds, setNewSnipeIds] = useState<Set<number>>(new Set())
  const [status, setStatus] = useState<ScannerStatus | null>(null)
  const [view, setView] = useState<View>('feed')
  const [feedFilter, setFeedFilter] = useState('')
  const newIdsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const enabledTiers = settings.enabledTiers ?? { low: true, medium: true, ultra: true }

  const toggleTier = (tier: Tier) =>
    updateSettings({ enabledTiers: { ...enabledTiers, [tier]: !enabledTiers[tier] } })

  const handleSnipe = useCallback(
    (snipe: Snipe) => {
      setSnipes((prev) => {
        const idx = prev.findIndex((s) => s.auction_id === snipe.auction_id)
        if (idx >= 0) {
          // Better deal found for same item — replace in place
          const next = [...prev]
          next[idx] = snipe
          return next
        }
        return [snipe, ...prev].slice(0, MAX_SNIPES)
      })

      setNewSnipeIds((prev) => {
        const next = new Set(prev)
        next.add(snipe.auction_id)
        return next
      })

      if (newIdsTimer.current) clearTimeout(newIdsTimer.current)
      newIdsTimer.current = setTimeout(() => setNewSnipeIds(new Set()), 3000)

      if (snipe.tier === 'ultra' && settings.notifications) {
        window.electron.showNotification(
          `Ultra Snipe: ${snipe.item_name}`,
          `-${snipe.discount_pct.toFixed(0)}% on ${snipe.realm_name}`
        )
      }
    },
    [settings.notifications]
  )

  const handleStatus = useCallback((s: Record<string, unknown>) => {
    setStatus(s as unknown as ScannerStatus)
  }, [])

  const { connState } = useWebSocket({
    settings,
    onSnipe: handleSnipe,
    onStatus: handleStatus,
  })

  const tierCounts = snipes.reduce(
    (acc, s) => ({ ...acc, [s.tier]: (acc[s.tier] ?? 0) + 1 }),
    { low: 0, medium: 0, ultra: 0 } as Record<Tier, number>
  )


  if (!loaded) {
    return (
      <div className="h-screen flex items-center justify-center bg-wow-dark">
        <div className="text-wow-gold font-wow text-xl animate-pulse">Loading…</div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-wow-dark select-none">
      {/* Title bar drag region */}
      <div className="h-8 flex-shrink-0 [-webkit-app-region:drag]" />

      <div className="flex flex-1 min-h-0">
        <Sidebar
          activeView={view}
          onViewChange={setView}
          tierCounts={tierCounts}
          enabledTiers={enabledTiers}
          onTierToggle={toggleTier}
        />

        <main className="flex-1 min-w-0">
          {view === 'feed' && (
            <SnipeFeed
              snipes={snipes}
              newSnipeIds={newSnipeIds}
              filter={feedFilter}
              onFilterChange={setFeedFilter}
              enabledTiers={enabledTiers}
              hasSellingRealm={(settings.sellingRealmId ?? 0) > 0}
              serverUrl={settings.serverUrl}
            />
          )}
          {view === 'watchlist' && (
            <Watchlist
              snipes={snipes}
              settings={settings}
              onSettingsChange={updateSettings}
            />
          )}
          {view === 'settings' && (
            <Settings settings={settings} onSave={updateSettings} />
          )}
        </main>
      </div>

      <StatusBar connState={connState} status={status} />
    </div>
  )
}
