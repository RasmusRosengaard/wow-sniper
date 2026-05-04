import React, { useState, useEffect } from 'react'
import type { AppSettings, Realm } from '../types'

interface Props {
  settings: AppSettings
  onSave: (patch: Partial<AppSettings>) => void
}

const THRESHOLD_LABELS = [
  { key: 'low'    as const, label: 'Standard deal',  hint: 'Anything below this % is flagged' },
  { key: 'medium' as const, label: 'Good deal',      hint: 'Higher discount threshold'         },
  { key: 'ultra'  as const, label: 'Steal',          hint: 'The real goblin territory'          },
]

export const Settings: React.FC<Props> = ({ settings, onSave }) => {
  const [serverUrl, setServerUrl]     = useState(settings.serverUrl)
  const [notifications, setNotifications] = useState(settings.notifications)
  const [thresholds, setThresholds]   = useState(settings.thresholds)
  const [watchlistInput, setWatchlistInput] = useState(settings.watchlistItemIds.join(', '))
  const [realms, setRealms]           = useState<Realm[]>([])
  const [selectedRealms, setSelectedRealms] = useState<Set<number>>(new Set(settings.selectedRealmIds))
  const [sellingRealmId, setSellingRealmId] = useState<number>(settings.sellingRealmId ?? 0)

  useEffect(() => {
    const base = settings.serverUrl
      .replace('ws://', 'http://').replace('wss://', 'https://').replace('/ws', '')
    fetch(`${base}/api/realms`).then((r) => r.json()).then(setRealms).catch(() => {})
  }, [settings.serverUrl])

  const handleSave = () => {
    const watchlistItemIds = watchlistInput
      .split(',').map((s) => parseInt(s.trim())).filter((n) => !isNaN(n))
    onSave({ serverUrl, notifications, thresholds, watchlistItemIds, selectedRealmIds: Array.from(selectedRealms), sellingRealmId })
  }

  const toggleRealm = (id: number) =>
    setSelectedRealms((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <div className="p-6 max-w-2xl overflow-y-auto h-full">
      <h2 className="font-wow text-wow-gold text-xl mb-1 tracking-widest">Settings</h2>
      <p className="text-xs text-wow-text-dim mb-6">Goblin mode — configure your profit engine</p>

      <div className="space-y-5">

        {/* Server */}
        <section className="panel p-4 space-y-3">
          <h3 className="text-xs font-semibold text-wow-gold/70 uppercase tracking-widest">Backend Server</h3>
          <div>
            <label className="text-xs text-wow-text-dim block mb-1">WebSocket URL</label>
            <input className="input" value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} placeholder="ws://localhost:8000/ws" />
          </div>
        </section>

        {/* Discount thresholds */}
        <section className="panel p-4 space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-wow-gold/70 uppercase tracking-widest">Discount Thresholds</h3>
            <p className="text-xs text-wow-text-dim mt-1">Items are flagged when buyout is this far below market price.</p>
          </div>
          {THRESHOLD_LABELS.map(({ key, label, hint }) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-wow-text">{label}</span>
                <span className="text-wow-gold font-mono font-bold text-sm">
                  -{100 - thresholds[key]}%
                </span>
              </div>
              <input
                type="range" min="1" max="99"
                value={thresholds[key]}
                onChange={(e) => setThresholds((p) => ({ ...p, [key]: Number(e.target.value) }))}
                className="w-full accent-wow-gold"
              />
              <div className="text-[10px] text-wow-text-dim mt-0.5">{hint}</div>
            </div>
          ))}
        </section>

        {/* Selling Realm */}
        {realms.length > 0 && (
          <section className="panel p-4 space-y-3">
            <div>
              <h3 className="text-xs font-semibold text-wow-gold/70 uppercase tracking-widest">Selling Realm</h3>
              <p className="text-xs text-wow-text-dim mt-1">Buy cheap on other realms, sell here for profit.</p>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-0.5">
              <label className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-wow-panel-hi text-xs text-wow-text-dim">
                <input type="radio" name="sellingRealm" checked={sellingRealmId === 0} onChange={() => setSellingRealmId(0)} className="accent-wow-gold" />
                None (use per-realm averages)
              </label>
              {realms.map((r) => (
                <label key={r.id} className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-wow-panel-hi text-xs text-wow-text">
                  <input type="radio" name="sellingRealm" checked={sellingRealmId === r.id} onChange={() => setSellingRealmId(r.id)} className="accent-wow-gold" />
                  {r.name}
                </label>
              ))}
            </div>
          </section>
        )}

        {/* Source Realms */}
        {realms.length > 0 && (
          <section className="panel p-4 space-y-3">
            <div>
              <h3 className="text-xs font-semibold text-wow-gold/70 uppercase tracking-widest">
                Source Realms
                <span className="text-wow-text-dim normal-case font-normal ml-2">
                  ({selectedRealms.size === 0 ? 'all' : `${selectedRealms.size} selected`})
                </span>
              </h3>
              <p className="text-xs text-wow-text-dim mt-1">Filter which realms to buy from. Leave empty for all.</p>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {realms.map((r) => (
                <label key={r.id} className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-wow-panel-hi text-xs text-wow-text">
                  <input type="checkbox" checked={selectedRealms.has(r.id)} onChange={() => toggleRealm(r.id)} className="accent-wow-gold" />
                  {r.name}
                </label>
              ))}
            </div>
          </section>
        )}

        {/* Watchlist */}
        <section className="panel p-4 space-y-3">
          <div>
            <h3 className="text-xs font-semibold text-wow-gold/70 uppercase tracking-widest">Watchlist Item IDs</h3>
            <p className="text-xs text-wow-text-dim mt-1">Comma-separated Blizzard item IDs. These bypass realm filters.</p>
          </div>
          <input className="input text-xs" value={watchlistInput} onChange={(e) => setWatchlistInput(e.target.value)} placeholder="168487, 171276, 204210" />
        </section>

        {/* Notifications */}
        <section className="panel p-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={notifications} onChange={(e) => setNotifications(e.target.checked)} className="accent-wow-gold w-4 h-4" />
            <div>
              <div className="text-sm text-wow-text">Desktop Notifications</div>
              <div className="text-xs text-wow-text-dim mt-0.5">Pop a system alert when a deal is detected</div>
            </div>
          </label>
        </section>

        <button onClick={handleSave} className="btn-gold w-full py-2 font-wow tracking-widest">
          Save Settings
        </button>
      </div>
    </div>
  )
}
