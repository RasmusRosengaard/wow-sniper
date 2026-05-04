import React from 'react'
import { SnipeCard } from './SnipeCard'
import type { Snipe, AppSettings } from '../types'

interface Props {
  snipes: Snipe[]
  settings: AppSettings
  onSettingsChange: (patch: Partial<AppSettings>) => void
}

export const Watchlist: React.FC<Props> = ({ snipes, settings, onSettingsChange }) => {
  const watched = snipes.filter((s) => settings.watchlistItemIds.includes(s.item_id))

  const remove = (itemId: number) =>
    onSettingsChange({ watchlistItemIds: settings.watchlistItemIds.filter((id) => id !== itemId) })

  const baseUrl = settings.serverUrl
    .replace('ws://', 'http://').replace('wss://', 'https://').replace(/\/ws$/, '')

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-wow-border bg-wow-panel flex-shrink-0">
        <span className="font-wow text-wow-gold text-sm tracking-widest uppercase">Watchlist</span>
        <span className="text-xs text-wow-text-dim">{settings.watchlistItemIds.length} items</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {settings.watchlistItemIds.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-wow-text-dim gap-3">
            <div className="text-5xl">📋</div>
            <div className="text-sm text-wow-text/50">No items on your watchlist</div>
            <div className="text-xs">Add Blizzard item IDs in Settings</div>
          </div>
        )}

        {watched.length === 0 && settings.watchlistItemIds.length > 0 && (
          <div className="text-center text-wow-text-dim text-sm py-8">
            No deals detected yet for your watchlist items
          </div>
        )}

        {watched.map((snipe) => (
          <div key={`${snipe.auction_id}-${snipe.detected_at}`} className="relative group">
            <SnipeCard snipe={snipe} baseUrl={baseUrl} />
            <button
              onClick={() => remove(snipe.item_id)}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-wow-text-dim hover:text-red-400 text-xs transition-opacity"
              title="Remove from watchlist"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
