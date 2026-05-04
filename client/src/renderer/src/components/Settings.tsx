import React, { useState, useEffect } from 'react'
import type { AppSettings, Realm } from '../types'

interface Props {
  settings: AppSettings
  onSave: (patch: Partial<AppSettings>) => void
}

export const Settings: React.FC<Props> = ({ settings, onSave }) => {
  const [serverUrl, setServerUrl] = useState(settings.serverUrl)
  const [notifications, setNotifications] = useState(settings.notifications)
  const [thresholds, setThresholds] = useState(settings.thresholds)
  const [watchlistInput, setWatchlistInput] = useState(settings.watchlistItemIds.join(', '))
  const [realms, setRealms] = useState<Realm[]>([])
  const [selectedRealms, setSelectedRealms] = useState<Set<number>>(
    new Set(settings.selectedRealmIds)
  )
  const [sellingRealmId, setSellingRealmId] = useState<number>(settings.sellingRealmId ?? 0)

  useEffect(() => {
    const apiBase = settings.serverUrl
      .replace('ws://', 'http://')
      .replace('wss://', 'https://')
      .replace('/ws', '')
    fetch(`${apiBase}/api/realms`)
      .then((r) => r.json())
      .then(setRealms)
      .catch(() => {})
  }, [settings.serverUrl])

  const handleSave = () => {
    const watchlistItemIds = watchlistInput
      .split(',')
      .map((s) => parseInt(s.trim()))
      .filter((n) => !isNaN(n))

    onSave({
      serverUrl,
      notifications,
      thresholds,
      watchlistItemIds,
      selectedRealmIds: Array.from(selectedRealms),
      sellingRealmId,
    })
  }

  const toggleRealm = (id: number) => {
    setSelectedRealms((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="p-6 max-w-2xl overflow-y-auto h-full">
      <h2 className="font-wow text-wow-gold text-xl mb-6 tracking-wider">Settings</h2>

      <div className="space-y-6">
        {/* Server */}
        <section className="panel p-4 space-y-3">
          <h3 className="text-sm font-semibold text-wow-gold/80 uppercase tracking-wider">
            Backend Server
          </h3>
          <div>
            <label className="text-xs text-wow-text/60 block mb-1">WebSocket URL</label>
            <input
              className="input"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="ws://localhost:8000/ws"
            />
          </div>
        </section>

        {/* Thresholds */}
        <section className="panel p-4 space-y-3">
          <h3 className="text-sm font-semibold text-wow-gold/80 uppercase tracking-wider">
            Snipe Thresholds
          </h3>
          <p className="text-xs text-wow-text/50">
            Items are flagged when buyout is below X% of the market baseline.
          </p>
          {(
            [
              { key: 'low' as const, label: 'Low', color: 'text-tier-low' },
              { key: 'medium' as const, label: 'Medium', color: 'text-tier-medium' },
              { key: 'ultra' as const, label: 'Ultra', color: 'text-tier-ultra' },
            ] as const
          ).map(({ key, label, color }) => (
            <div key={key} className="flex items-center gap-4">
              <span className={`w-16 text-sm font-medium ${color}`}>{label}</span>
              <input
                type="range"
                min="1"
                max="99"
                value={thresholds[key]}
                onChange={(e) =>
                  setThresholds((p) => ({ ...p, [key]: Number(e.target.value) }))
                }
                className="flex-1 accent-wow-gold"
              />
              <span className="w-12 text-right text-sm text-wow-text">
                &lt; {thresholds[key]}%
              </span>
            </div>
          ))}
        </section>

        {/* Selling Realm */}
        {realms.length > 0 && (
          <section className="panel p-4 space-y-3">
            <h3 className="text-sm font-semibold text-wow-gold/80 uppercase tracking-wider">
              Selling Realm
            </h3>
            <p className="text-xs text-wow-text/50">
              Snipes are evaluated against this realm's market price — items cheap elsewhere that sell for more here.
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1">
              <label className="flex items-center gap-2 cursor-pointer hover:text-wow-text px-1 py-0.5 rounded hover:bg-white/5">
                <input
                  type="radio"
                  name="sellingRealm"
                  checked={sellingRealmId === 0}
                  onChange={() => setSellingRealmId(0)}
                  className="accent-wow-gold"
                />
                <span className="text-sm text-wow-text/50">None (per-realm average)</span>
              </label>
              {realms.map((realm) => (
                <label
                  key={realm.id}
                  className="flex items-center gap-2 cursor-pointer hover:text-wow-text px-1 py-0.5 rounded hover:bg-white/5"
                >
                  <input
                    type="radio"
                    name="sellingRealm"
                    checked={sellingRealmId === realm.id}
                    onChange={() => setSellingRealmId(realm.id)}
                    className="accent-wow-gold"
                  />
                  <span className="text-sm">{realm.name}</span>
                </label>
              ))}
            </div>
          </section>
        )}

        {/* Source Realms */}
        {realms.length > 0 && (
          <section className="panel p-4 space-y-3">
            <h3 className="text-sm font-semibold text-wow-gold/80 uppercase tracking-wider">
              Source Realms{' '}
              <span className="text-wow-text/40 normal-case font-normal">
                ({selectedRealms.size === 0 ? 'all' : `${selectedRealms.size} selected`})
              </span>
            </h3>
            <p className="text-xs text-wow-text/50">
              Realms to scan for cheap items. Leave empty for all realms.
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {realms.map((realm) => (
                <label
                  key={realm.id}
                  className="flex items-center gap-2 cursor-pointer hover:text-wow-text px-1 py-0.5 rounded hover:bg-white/5"
                >
                  <input
                    type="checkbox"
                    checked={selectedRealms.has(realm.id)}
                    onChange={() => toggleRealm(realm.id)}
                    className="accent-wow-gold"
                  />
                  <span className="text-sm">{realm.name}</span>
                </label>
              ))}
            </div>
          </section>
        )}

        {/* Watchlist */}
        <section className="panel p-4 space-y-3">
          <h3 className="text-sm font-semibold text-wow-gold/80 uppercase tracking-wider">
            Watchlist Item IDs
          </h3>
          <p className="text-xs text-wow-text/50">
            Comma-separated Blizzard item IDs. Watchlisted items bypass realm filters.
          </p>
          <input
            className="input"
            value={watchlistInput}
            onChange={(e) => setWatchlistInput(e.target.value)}
            placeholder="168487, 171276, 204210"
          />
        </section>

        {/* Notifications */}
        <section className="panel p-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifications}
              onChange={(e) => setNotifications(e.target.checked)}
              className="accent-wow-gold w-4 h-4"
            />
            <div>
              <div className="text-sm font-medium">Desktop Notifications</div>
              <div className="text-xs text-wow-text/50">
                Show a system notification for Ultra tier snipes
              </div>
            </div>
          </label>
        </section>

        <button onClick={handleSave} className="btn-gold w-full py-2">
          Save Settings
        </button>
      </div>
    </div>
  )
}
