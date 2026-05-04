import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type View = 'feed' | 'watchlist' | 'settings'

interface Props {
  activeView: View
  onViewChange: (v: View) => void
  snipeCount: number
}

const NAV: { view: View; label: string; icon: string }[] = [
  { view: 'feed',      label: 'Sniper',    icon: '🪙' },
  { view: 'watchlist', label: 'Watchlist', icon: '📋' },
  { view: 'settings',  label: 'Settings',  icon: '⚙️' },
]

export const Sidebar: React.FC<Props> = ({ activeView, onViewChange, snipeCount }) => {
  return (
    <div className="w-48 flex-shrink-0 bg-wow-panel border-r border-wow-border flex flex-col">
      {/* Branding */}
      <div className="px-4 py-5 border-b border-wow-border">
        <div className="font-wow text-wow-gold text-base tracking-widest leading-tight">
          WoW Sniper
        </div>
        <div className="text-[10px] text-wow-text-dim uppercase tracking-widest mt-1">
          Gold Goblin Edition
        </div>
      </div>

      {/* Nav */}
      <nav className="p-2 space-y-0.5 mt-1">
        {NAV.map(({ view, label, icon }) => (
          <motion.button
            key={view}
            onClick={() => onViewChange(view)}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors text-left relative ${
              activeView === view
                ? 'bg-wow-gold/10 text-wow-gold border border-wow-gold/20'
                : 'text-wow-text/60 hover:bg-wow-panel-hi hover:text-wow-text border border-transparent'
            }`}
          >
            {activeView === view && (
              <motion.div
                layoutId="nav-pill"
                className="absolute inset-0 rounded bg-wow-gold/10 border border-wow-gold/20"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            <span className="text-base leading-none relative z-10">{icon}</span>
            <span className="relative z-10">{label}</span>
          </motion.button>
        ))}
      </nav>

      <div className="flex-1" />

      {/* Hoard counter */}
      <div className="px-4 py-4 border-t border-wow-border">
        <div className="text-[10px] uppercase tracking-wider text-wow-text-dim mb-1">
          Deals found
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={snipeCount}
            initial={{ opacity: 0, y: -6, scale: 1.1 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            className="font-wow text-wow-gold-light text-xl tabular-nums"
          >
            {snipeCount.toLocaleString()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
