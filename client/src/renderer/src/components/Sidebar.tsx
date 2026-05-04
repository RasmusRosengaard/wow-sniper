import React from 'react'
import type { Tier } from '../types'

type View = 'feed' | 'watchlist' | 'settings'

interface Props {
  activeView: View
  onViewChange: (v: View) => void
  tierCounts: Record<Tier, number>
  enabledTiers: { low: boolean; medium: boolean; ultra: boolean }
  onTierToggle: (tier: Tier) => void
}

const TIERS: { tier: Tier; label: string; color: string; bg: string }[] = [
  { tier: 'ultra', label: 'Ultra', color: 'text-tier-ultra', bg: 'bg-tier-ultra/10 border-tier-ultra/30' },
  { tier: 'medium', label: 'Medium', color: 'text-tier-medium', bg: 'bg-tier-medium/10 border-tier-medium/30' },
  { tier: 'low', label: 'Low', color: 'text-tier-low', bg: 'bg-tier-low/10 border-tier-low/30' },
]

export const Sidebar: React.FC<Props> = ({
  activeView,
  onViewChange,
  tierCounts,
  enabledTiers,
  onTierToggle,
}) => {
  return (
    <div className="w-52 flex-shrink-0 bg-wow-panel border-r border-wow-border flex flex-col">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-wow-border">
        <div className="font-wow text-wow-gold text-lg tracking-widest">WoW Sniper</div>
        <div className="text-[10px] text-wow-text/40 uppercase tracking-wider mt-0.5">
          Auction House
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-2 space-y-1">
        {(
          [
            { view: 'feed' as View, label: 'Live Feed', icon: '⚡' },
            { view: 'watchlist' as View, label: 'Watchlist', icon: '⭐' },
            { view: 'settings' as View, label: 'Settings', icon: '⚙️' },
          ] as const
        ).map(({ view, label, icon }) => (
          <button
            key={view}
            onClick={() => onViewChange(view)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors text-left ${
              activeView === view
                ? 'bg-wow-gold/10 text-wow-gold border border-wow-gold/20'
                : 'text-wow-text/70 hover:bg-white/5 hover:text-wow-text'
            }`}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* Tier toggles */}
      <div className="mt-4 px-3">
        <div className="text-[10px] uppercase tracking-wider text-wow-text/40 mb-2 px-1">
          Tiers
        </div>
        <div className="space-y-1.5">
          {TIERS.map(({ tier, label, color, bg }) => {
            const on = enabledTiers[tier]
            return (
              <button
                key={tier}
                onClick={() => onTierToggle(tier)}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded border text-sm transition-all ${
                  on ? bg : 'border-transparent opacity-40 hover:opacity-60'
                }`}
              >
                <span className={`font-medium ${on ? color : 'text-wow-text/50'}`}>{label}</span>
                <span className="text-xs text-wow-text/50">{tierCounts[tier]}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1" />
    </div>
  )
}
