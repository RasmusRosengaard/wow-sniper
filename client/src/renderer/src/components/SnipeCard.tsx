import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Snipe } from '../types'

interface RealmPrice {
  realm_id: number
  realm_name: string
  min_buyout: number
}

interface Props {
  snipe: Snipe
  isNew?: boolean
  baseUrl?: string
}

function formatGold(copper: number): string {
  if (copper <= 0) return '0 gold'
  const g = Math.floor(copper / 10000)
  const s = Math.floor((copper % 10000) / 100)
  if (g > 0) return `${g.toLocaleString('de-DE')} gold`
  return `${s} silver`
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  return `${Math.floor(mins / 60)}h ago`
}

export const SnipeCard: React.FC<Props> = ({ snipe, isNew, baseUrl }) => {
  const [expanded, setExpanded] = useState(false)
  const [prices, setPrices]     = useState<RealmPrice[] | null>(null)
  const [loading, setLoading]   = useState(false)

  const profit    = snipe.market_price - snipe.buyout
  const profitPct = snipe.discount_pct

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

  const avg = prices?.length
    ? Math.round(prices.reduce((s, p) => s + p.min_buyout, 0) / prices.length)
    : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
      whileHover={{ scale: 1.003 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      className={`panel overflow-hidden cursor-pointer transition-shadow ${isNew ? 'shadow-[0_0_16px_rgba(232,168,32,0.45)]' : ''}`}
      onClick={toggle}
    >
      {/* Main row */}
      <div className="p-3 flex gap-3 items-center">
        {/* Icon */}
        <div className="w-11 h-11 flex-shrink-0 rounded border border-wow-border overflow-hidden bg-black/40">
          {snipe.icon_url
            ? <img src={snipe.icon_url} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-wow-border text-lg">?</div>
          }
        </div>

        {/* Item info */}
        <div className="flex-1 min-w-0">
          <div className="text-wow-gold-light font-semibold text-sm truncate leading-tight">
            {snipe.item_name}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-wow-text-dim">
            <span className="truncate">{snipe.realm_name}</span>
            <span>·</span>
            <span>{timeAgo(snipe.detected_at)}</span>
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs">
            <span className="text-wow-text-dim">
              Buy <span className="text-wow-text font-mono">{formatGold(snipe.buyout)}</span>
            </span>
            <span className="text-wow-text-dim">
              Sell <span className="text-wow-text font-mono">{formatGold(snipe.market_price)}</span>
            </span>
          </div>
        </div>

        {/* Profit — hero metric */}
        <div className="flex-shrink-0 text-right min-w-[80px]">
          {profit > 0 && (
            <motion.div
              key={snipe.buyout}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-emerald-400 font-bold text-base leading-tight font-mono"
            >
              +{formatGold(profit)}
            </motion.div>
          )}
          <div className="text-wow-gold font-bold text-xl leading-tight tabular-nums">
            -{profitPct.toFixed(0)}%
          </div>
          <div className="text-wow-text-dim text-[10px] mt-0.5 select-none">
            {expanded ? '▲' : '▼'}
          </div>
        </div>
      </div>

      {/* Realm price breakdown */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-wow-border/40 px-3 py-2">
              {loading && (
                <div className="text-xs text-wow-text-dim py-1 animate-pulse">Loading prices…</div>
              )}
              {!loading && prices && (
                <div className="max-h-52 overflow-y-auto">
                  {/* Header */}
                  <div className="grid grid-cols-[1fr_auto] text-[10px] uppercase tracking-wider text-wow-text-dim pb-1.5 border-b border-wow-border/30">
                    <span>Realm ({prices.length})</span>
                    <span className="text-right flex items-center gap-2 justify-end">
                      {avg !== null && (
                        <span>
                          Avg <span className="text-wow-gold/70 font-mono normal-case">{formatGold(avg)}</span>
                          <span className="mx-1.5 opacity-40">·</span>
                        </span>
                      )}
                      Cheapest buyout
                    </span>
                  </div>
                  {/* Rows */}
                  <div className="space-y-0.5 mt-1">
                    {prices.map((p, i) => (
                      <motion.div
                        key={p.realm_id}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.012, duration: 0.15 }}
                        className={`grid grid-cols-[1fr_auto] text-xs py-0.5 ${
                          p.realm_id === snipe.realm_id ? 'text-wow-gold' : 'text-wow-text/70'
                        }`}
                      >
                        <span className="truncate pr-4 flex items-center gap-1.5">
                          {i === 0 && <span className="text-emerald-400 text-[10px]">★</span>}
                          {p.realm_name}
                        </span>
                        <span className="font-mono tabular-nums">{formatGold(p.min_buyout)}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
