import React from 'react'
import type { ConnectionState, ScannerStatus } from '../types'

interface Props {
  connState: ConnectionState
  status: ScannerStatus | null
}

const CONN_LABEL: Record<ConnectionState, string> = {
  connecting: 'Connecting…',
  connected: 'Connected',
  disconnected: 'Disconnected',
  error: 'Connection Error',
}

const CONN_DOT: Record<ConnectionState, string> = {
  connecting: 'bg-yellow-400 animate-pulse',
  connected: 'bg-green-400',
  disconnected: 'bg-gray-500',
  error: 'bg-red-500',
}

export const StatusBar: React.FC<Props> = ({ connState, status }) => {
  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-black/30 border-t border-wow-border text-xs text-wow-text/60 flex-shrink-0">
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${CONN_DOT[connState]}`} />
        <span>{CONN_LABEL[connState]}</span>
      </div>

      {status && (
        <>
          <span>·</span>
          <span>{status.tracked_realms} realm{status.tracked_realms !== 1 ? 's' : ''}</span>
          <span>·</span>
          {status.polling_state === 'scanning' && status.realms_total > 0 ? (
            <span>Scanning {status.realms_scanned} / {status.realms_total}</span>
          ) : (
            <span className="capitalize">{status.polling_state}</span>
          )}
          {status.last_update && (
            <>
              <span>·</span>
              <span>Last scan: {new Date(status.last_update).toLocaleTimeString()}</span>
            </>
          )}
        </>
      )}

      <div className="flex-1" />
      <span className="font-wow text-wow-gold/60">WoW Sniper</span>
    </div>
  )
}
