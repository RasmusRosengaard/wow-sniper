import React, { useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { SnipeCard } from './SnipeCard'
import type { Snipe } from '../types'

type SortKey = 'newest' | 'gold' | 'pct'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest'      },
  { key: 'gold',   label: 'Gold profit' },
  { key: 'pct',    label: 'Discount %'  },
]

interface Props {
  snipes: Snipe[]
  newSnipeIds: Set<number>
  filter: string
  onFilterChange: (v: string) => void
  serverUrl: string
}

export const SnipeFeed: React.FC<Props> = ({ snipes, newSnipeIds, filter, onFilterChange, serverUrl }) => {
  const listRef = useRef<HTMLDivElement>(null)
  const [sort, setSort] = useState<SortKey>('newest')

  const baseUrl = serverUrl
    .replace('ws://', 'http://')
    .replace('wss://', 'https://')
    .replace(/\/ws$/, '')

  const filtered = snipes.filter((s) => {
    if (!filter) return true
    const q = filter.toLowerCase()
    return s.item_name.toLowerCase().includes(q) || s.realm_name.toLowerCase().includes(q)
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'gold') return (b.market_price - b.buyout) - (a.market_price - a.buyout)
    if (sort === 'pct')  return b.discount_pct - a.discount_pct
    return 0
  })

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-wow-border bg-wow-panel flex-shrink-0">
        <span className="font-wow text-wow-gold text-sm tracking-widest uppercase">Sniper</span>
        <span className="text-xs text-wow-text-dim">
          {sorted.length}{snipes.length !== sorted.length ? ` / ${snipes.length}` : ''}
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-0.5 bg-wow-dark/60 rounded p-0.5 border border-wow-border">
          {SORTS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                sort === key
                  ? 'bg-wow-gold/15 text-wow-gold border border-wow-gold/25'
                  : 'text-wow-text-dim hover:text-wow-text'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          className="input w-44 text-xs py-1"
          placeholder="Search items or realms…"
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
        />
      </div>

      {/* Feed */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-wow-text-dim gap-3">
            <div className="text-5xl">🪙</div>
            <div className="text-sm text-wow-text/50">Waiting for deals…</div>
            <div className="text-xs text-wow-text-dim">New auctions checked every ~1 hour</div>
          </div>
        )}

        <AnimatePresence>
          {sorted.map((snipe) => (
            <SnipeCard
              key={snipe.auction_id}
              snipe={snipe}
              isNew={newSnipeIds.has(snipe.auction_id)}
              baseUrl={baseUrl}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
