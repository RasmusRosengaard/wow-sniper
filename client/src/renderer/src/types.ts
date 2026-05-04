export type Tier = 'low' | 'medium' | 'ultra' // backend classification, not shown in UI

export interface Snipe {
  id?: number
  auction_id: number
  item_id: number
  item_name: string
  icon_url: string | null
  realm_id: number
  realm_name: string
  buyout: number
  market_price: number
  discount_pct: number
  tier: Tier
  source: string
  quantity: number
  time_left: string
  detected_at: string
}

export interface Realm {
  id: number
  name: string
  region: string
  last_scanned: string | null
}

export interface AppSettings {
  serverUrl: string
  watchlistItemIds: number[]
  selectedRealmIds: number[]
  sellingRealmId: number
  thresholds: { low: number; medium: number; ultra: number }
  notifications: boolean
}

export interface TopItem {
  item_id: number
  item_name: string
  icon_url: string | null
  best_realm: string
  snipe_count: number
  min_buyout: number
  avg_market: number
}

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

export interface ScannerStatus {
  polling_state: string
  tracked_realms: number
  realms_scanned: number
  realms_total: number
  last_update: string | null
  next_expected_update: string | null
}
