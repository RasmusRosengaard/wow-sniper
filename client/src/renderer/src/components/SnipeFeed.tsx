import React, { useRef, useEffect, useState } from 'react'
import { SnipeCard } from './SnipeCard'
import type { Snipe } from '../types'

type SortKey = 'newest' | 'gold' | 'pct'

const SORT_LABELS: Record<SortKey, string> = {
  newest: 'Newest',
  gold:   'Gold profit',
  pct:    'Discount %',
}

interface Props {
  snipes: Snipe[]
  newSnipeIds: Set<number>
  filter: string
  onFilterChange: (v: string) => void
  enabledTiers: { low: boolean; medium: boolean; ultra: boolean }
  hasSellingRealm: boolean
  serverUrl: string
}

export const SnipeFeed: React.FC<Props> = ({ snipes, newSnipeIds, filter, onFilterChange, enabledTiers, hasSellingRealm, serverUrl }) => {
  const baseUrl = serverUrl.replace('ws://', 'http://').replace('wss://', 'https://').replace(/\/ws$/, '')
  const listRef = useRef<HTMLDivElement>(null)
  const [sort, setSort] = useState<SortKey>('newest')

  const filtered = snipes.filter((s) => {
    if (!enabledTiers[s.tier as keyof typeof enabledTiers]) return false
    if (!filter) return true
    return (
      s.item_name.toLowerCase().includes(filter.toLowerCase()) ||
      s.realm_name.toLowerCase().includes(filter.toLowerCase())
    )
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'gold') return (b.market_price - b.buyout) - (a.market_price - a.buyout)
    if (sort === 'pct')  return b.discount_pct - a.discount_pct
    return 0 // 'newest' — preserve arrival order
  })

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-wow-border flex-shrink-0">
        <span className="font-wow text-wow-gold text-sm tracking-wider uppercase">Live Snipes</span>
        <span className="text-xs text-wow-text/50 ml-1">
          {filtered.length} / {snipes.length}
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-1 bg-black/30 rounded p-0.5">
          {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                sort === key
                  ? 'bg-wow-gold/20 text-wow-gold'
                  : 'text-wow-text/50 hover:text-wow-text/80'
              }`}
            >
              {SORT_LABELS[key]}
            </button>
          ))}
        </div>
        <input
          className="input w-48"
          placeholder="Filter items or realms…"
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
        />
      </div>

      {/* Feed */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-wow-text/40 gap-3">
            <div className="text-5xl">⚔️</div>
            <div className="text-sm">Waiting for snipes…</div>
            <div className="text-xs">New auctions are checked every few minutes</div>
          </div>
        )}
        {sorted.map((snipe) => (
          <SnipeCard
            key={`${snipe.auction_id}-${snipe.detected_at}`}
            snipe={snipe}
            isNew={newSnipeIds.has(snipe.auction_id)}
            hasSellingRealm={hasSellingRealm}
            baseUrl={baseUrl}
          />
        ))}
      </div>
    </div>
  )
}
