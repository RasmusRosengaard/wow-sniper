from __future__ import annotations
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class SnipeOut(BaseModel):
    id: int
    auction_id: int
    item_id: int
    item_name: str
    icon_url: Optional[str]
    realm_id: int
    realm_name: str
    buyout: int
    market_price: int
    discount_pct: float
    tier: str
    source: str = "local"
    quantity: int
    time_left: str
    detected_at: datetime

    model_config = {"from_attributes": True}


class StatusOut(BaseModel):
    polling_state: str
    tracked_realms: int
    last_update: Optional[datetime]
    next_expected_update: Optional[datetime]


class SubscribeMessage(BaseModel):
    type: str = "subscribe"
    realm_ids: list[int] = []
    min_tier: str = "low"
    watchlist_item_ids: list[int] = []


class SnipeEvent(BaseModel):
    type: str = "snipe"
    data: SnipeOut


class HeartbeatEvent(BaseModel):
    type: str = "heartbeat"
    ts: datetime


class StatusEvent(BaseModel):
    type: str = "status"
    data: StatusOut


class RealmOut(BaseModel):
    id: int
    name: str
    region: str
    last_scanned: Optional[datetime]

    model_config = {"from_attributes": True}


class RuntimeSettingsIn(BaseModel):
    selling_realm_id: int = 0
    threshold_low: int = 80      # 1–99 percent
    threshold_medium: int = 60
    threshold_ultra: int = 40
