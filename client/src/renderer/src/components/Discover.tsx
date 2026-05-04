import React, { useEffect, useState, useCallback } from 'react'
import type { TopItem, AppSettings } from '../types'

interface Props {
  settings: AppSettings
  onAddToWatchlist: (itemId: number) => void
}

function copper(c: number): string {
  const gold = Math.floor(c / 10000)
  const silver = Math.floor((c % 10000) / 100)
  if (gold > 0) return `${gold.toLocaleString('de-DE')} gold`
  return `${silver} silver`
}

function profitColor(pct: number): string {
  if (pct >= 40) return 'text-tier-ultra'
  if (pct >= 20) return 'text-tier-medium'
  return 'text-tier-low'
}

export const Discover: React.FC<Props> = ({ settings, onAddToWatchlist }) => {
  const [items, setItems] = useState<TopItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const apiBase = settings.serverUrl
    .replace('ws://', 'http://')
    .replace('wss://', 'https://')
    .replace(/\/ws$/, '')

  const load = useCallback(() => {
    setLoading(true)
    fetch(`${apiBase}/api/top-items?since_days=7&limit=100`)
      .then((r) => r.json())
      .then((data: TopItem[]) => { setItems(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [apiBase])

  useEffect(() => { load() }, [load])

  const filtered = items.filter((i) =>
    i.item_name.toLowerCase().includes(search.toLowerCase())
  )

  const isWatched = (id: number) => settings.watchlistItemIds.includes(id)

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-wow-border flex items-center gap-3">
        <input
          className="input flex-1"
          placeholder="Search items…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button onClick={load} className="btn-gold px-3 py-1.5 text-sm">Refresh</button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-wow-text/40">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-wow-text/40 gap-2">
          <div className="text-4xl">📊</div>
          <div>No snipe data yet — check back after a few scan cycles.</div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-wow-panel border-b border-wow-border z-10">
              <tr className="text-left text-wow-text/50 text-xs uppercase tracking-wider">
                <th className="px-4 py-2">Item</th>
                <th className="px-4 py-2 text-right">Buy (cheapest seen)</th>
                <th className="px-4 py-2 text-right">Sell (your realm avg)</th>
                <th className="px-4 py-2 text-right">Profit / item</th>
                <th className="px-4 py-2 text-right">Times seen</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const profit = item.avg_market - item.min_buyout
                const profitPct = item.avg_market > 0
                  ? ((profit / item.avg_market) * 100)
                  : 0

                return (
                  <tr
                    key={item.item_id}
                    className="border-b border-wow-border/50 hover:bg-white/3 transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {item.icon_url && (
                          <img src={item.icon_url} alt="" className="w-7 h-7 rounded flex-shrink-0" />
                        )}
                        <div>
                          <div className="text-wow-text font-medium leading-tight">{item.item_name}</div>
                          <div className="text-[11px] text-wow-text/40 mt-0.5">{item.best_realm}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-wow-text/90 font-mono">{copper(item.min_buyout)}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-wow-text/70 font-mono">{copper(item.avg_market)}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {profit > 0 ? (
                        <div className="flex flex-col items-end">
                          <span className={`font-semibold font-mono ${profitColor(profitPct)}`}>
                            +{copper(profit)}
                          </span>
                          <span className={`text-[11px] ${profitColor(profitPct)}`}>
                            {profitPct.toFixed(1)}% margin
                          </span>
                        </div>
                      ) : (
                        <span className="text-wow-text/30">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-wow-gold font-semibold">
                      {item.snipe_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => onAddToWatchlist(item.item_id)}
                        disabled={isWatched(item.item_id)}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${
                          isWatched(item.item_id)
                            ? 'border-wow-gold/40 text-wow-gold/60 cursor-default'
                            : 'border-wow-border hover:border-wow-gold/60 hover:text-wow-gold text-wow-text/50'
                        }`}
                      >
                        {isWatched(item.item_id) ? '★ Watching' : '+ Watch'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
