import React, { useState, useCallback } from 'react'
import type { Snipe } from '../types'

interface RealmPrice {
  realm_id: number
  realm_name: string
  min_buyout: number
}

interface Props {
  snipe: Snipe
  isNew?: boolean
  hasSellingRealm?: boolean
  baseUrl?: string
}

function formatGold(copper: number): string {
  if (copper <= 0) return '0g'
  const g = Math.floor(copper / 10000)
  const s = Math.floor((copper % 10000) / 100)
  const c = copper % 100
  if (g > 0) return `${g.toLocaleString()}g ${s}s`
  if (s > 0) return `${s}s ${c}c`
  return `${c}c`
}

function timeAgo(isoDate: string): string {
  const secs = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000)
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  return `${Math.floor(mins / 60)}h ago`
}

const TIME_LEFT_LABELS: Record<string, string> = {
  SHORT: '< 30m',
  MEDIUM: '30m–2h',
  LONG: '2–12h',
  VERY_LONG: '12h+',
}

export const SnipeCard: React.FC<Props> = ({ snipe, isNew, hasSellingRealm, baseUrl }) => {
  const tierClass = `tier-${snipe.tier}` as 'tier-low' | 'tier-medium' | 'tier-ultra'
  const [expanded, setExpanded] = useState(false)
  const [prices, setPrices] = useState<RealmPrice[] | null>(null)
  const [loading, setLoading] = useState(false)

  const toggle = useCallback(async () => {
    if (expanded) { setExpanded(false); return }
    setExpanded(true)
    if (prices !== null || !baseUrl) return
    setLoading(true)
    try {
      const res = await fetch(`${baseUrl}/api/items/${snipe.item_id}/prices`)
      if (res.ok) setPrices(await res.json())
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [expanded, prices, baseUrl, snipe.item_id])

  return (
    <div
      className={`panel transition-all ${isNew ? 'animate-slide-in' : ''} ${
        snipe.tier === 'ultra' ? 'border-tier-ultra/50' : ''
      }`}
    >
      {/* Main row */}
      <div
        className="p-3 flex gap-3 items-start cursor-pointer select-none"
        onClick={toggle}
      >
        {/* Item icon */}
        <div className="w-12 h-12 flex-shrink-0 rounded border border-wow-border overflow-hidden bg-black/40">
          {snipe.icon_url ? (
            <img src={snipe.icon_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-wow-border text-xl">?</div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-wow-gold-light font-semibold text-sm truncate">{snipe.item_name}</span>
            <span className={tierClass}>{snipe.tier}</span>
            {snipe.quantity > 1 && (
              <span className="text-xs text-wow-text/60">×{snipe.quantity}</span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 text-xs text-wow-text/70">
            <span>{snipe.realm_name}</span>
            <span>·</span>
            <span>{TIME_LEFT_LABELS[snipe.time_left] ?? snipe.time_left}</span>
            <span>·</span>
            <span>{timeAgo(snipe.detected_at)}</span>
          </div>

          <div className="flex items-center gap-4 mt-2">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-wow-text/50">Buy</div>
              <div className="text-sm font-bold text-white">{formatGold(snipe.buyout)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-wow-text/50">
                {hasSellingRealm ? 'Sell (your realm)' : 'Market avg'}
              </div>
              <div className="text-sm text-wow-text/80">{formatGold(snipe.market_price)}</div>
            </div>
            {snipe.market_price > snipe.buyout && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-wow-text/50">Profit</div>
                <div className="text-sm font-semibold text-tier-low">
                  +{formatGold(snipe.market_price - snipe.buyout)}
                </div>
              </div>
            )}
            <div className="ml-auto flex items-center gap-2">
              <div
                className={`text-2xl font-bold ${
                  snipe.tier === 'ultra'
                    ? 'text-tier-ultra'
                    : snipe.tier === 'medium'
                    ? 'text-tier-medium'
                    : 'text-tier-low'
                }`}
              >
                -{snipe.discount_pct.toFixed(0)}%
              </div>
              <span className="text-wow-text/30 text-xs">{expanded ? '▲' : '▼'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Realm price list */}
      {expanded && (
        <div className="border-t border-wow-border/50 px-3 py-2">
          {loading && <div className="text-xs text-wow-text/40 py-1">Loading prices…</div>}
          {!loading && prices && (
            <div className="space-y-0.5 max-h-48 overflow-y-auto">
              <div className="grid grid-cols-[1fr_auto] text-[10px] uppercase tracking-wider text-wow-text/40 pb-1">
                <span>Realm</span>
                <span className="text-right">Min buyout</span>
              </div>
              {prices.map((p, i) => (
                <div
                  key={p.realm_id}
                  className={`grid grid-cols-[1fr_auto] text-xs py-0.5 ${
                    p.realm_id === snipe.realm_id ? 'text-wow-gold' : 'text-wow-text/70'
                  }`}
                >
                  <span className="truncate pr-4">
                    {i === 0 && <span className="text-tier-low mr-1">★</span>}
                    {p.realm_name}
                  </span>
                  <span className="font-mono tabular-nums">{formatGold(p.min_buyout)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
