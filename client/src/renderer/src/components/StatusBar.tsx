import React from 'react'
import { motion } from 'framer-motion'
import type { ConnectionState, ScannerStatus } from '../types'

interface Props {
  connState: ConnectionState
  status: ScannerStatus | null
}

const CONN_DOT: Record<ConnectionState, string> = {
  connecting:   'bg-yellow-500 animate-pulse',
  connected:    'bg-emerald-500',
  disconnected: 'bg-wow-text-dim',
  error:        'bg-red-500',
}

const CONN_LABEL: Record<ConnectionState, string> = {
  connecting:   'Connecting…',
  connected:    'Connected',
  disconnected: 'Disconnected',
  error:        'Error',
}

export const StatusBar: React.FC<Props> = ({ connState, status }) => {
  const isScanning = status?.polling_state === 'scanning'
  const total      = status?.realms_total   ?? 0
  const scanned    = status?.realms_scanned ?? 0
  const progress   = total > 0 ? scanned / total : 0

  const stateLabel = isScanning && total > 0
    ? `Scanning ${scanned} / ${total}`
    : status?.polling_state
      ? status.polling_state.charAt(0).toUpperCase() + status.polling_state.slice(1)
      : null

  return (
    <div className="flex-shrink-0 bg-wow-panel border-t border-wow-border">
      {/* Scan progress bar */}
      {isScanning && total > 0 && (
        <div className="h-0.5 bg-wow-border/40 w-full overflow-hidden">
          <motion.div
            className="h-full bg-emerald-500/70"
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      )}

      {/* Status row */}
      <div className="flex items-center gap-3 px-4 py-1.5 text-[11px] text-wow-text-dim">
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${CONN_DOT[connState]}`} />
          <span>{CONN_LABEL[connState]}</span>
        </div>

        {status && (
          <>
            <span className="opacity-30">·</span>
            <span>{status.tracked_realms} realms</span>

            {stateLabel && (
              <>
                <span className="opacity-30">·</span>
                <motion.span
                  key={stateLabel}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={isScanning ? 'text-wow-gold/70' : ''}
                >
                  {stateLabel}
                </motion.span>
              </>
            )}

            {status.last_update && (
              <>
                <span className="opacity-30">·</span>
                <span>Updated {new Date(status.last_update).toLocaleTimeString()}</span>
              </>
            )}
          </>
        )}

        <div className="flex-1" />
        <span className="font-wow text-wow-gold-dim tracking-widest text-[10px]">GOLD GOBLIN</span>
      </div>
    </div>
  )
}
