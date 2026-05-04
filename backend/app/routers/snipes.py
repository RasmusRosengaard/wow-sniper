from __future__ import annotations
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, desc, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Snipe, ConnectedRealm, RuntimeSettings, ItemCurrentPrice
from ..schemas import SnipeOut, RealmOut, RuntimeSettingsIn
from ..services.scanner import snipe_bus  # for status
from .. import app_state

router = APIRouter(prefix="/api")


@router.get("/snipes", response_model=list[SnipeOut])
async def list_snipes(
    realm_id: Optional[int] = None,
    tier: Optional[str] = None,
    item_id: Optional[int] = None,
    since_minutes: int = Query(default=60, le=1440),
    limit: int = Query(default=100, le=500),
    db: AsyncSession = Depends(get_db),
):
    since = datetime.now(timezone.utc) - timedelta(minutes=since_minutes)
    q = select(Snipe).where(Snipe.detected_at >= since).order_by(desc(Snipe.detected_at)).limit(limit)
    if realm_id:
        q = q.where(Snipe.connected_realm_id == realm_id)
    if tier:
        q = q.where(Snipe.tier == tier)
    if item_id:
        q = q.where(Snipe.item_id == item_id)

    result = await db.execute(q)
    rows = result.scalars().all()

    return [
        SnipeOut(
            id=r.id,
            auction_id=r.auction_id,
            item_id=r.item_id,
            item_name=r.item_name,
            icon_url=r.icon_url,
            realm_id=r.connected_realm_id,
            realm_name=r.realm_name,
            buyout=r.buyout,
            market_price=r.market_price,
            discount_pct=r.discount_pct,
            tier=r.tier,
            source=r.source if r.source else "local",
            quantity=r.quantity,
            time_left=r.time_left,
            detected_at=r.detected_at,
        )
        for r in rows
    ]


@router.get("/realms", response_model=list[RealmOut])
async def list_realms(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ConnectedRealm).where(ConnectedRealm.active == True))
    return result.scalars().all()


@router.get("/status")
async def get_status():
    if app_state.scanner:
        return app_state.scanner.status
    return {"polling_state": "starting", "tracked_realms": 0, "last_update": None, "next_expected_update": None}


@router.get("/settings")
async def get_runtime_settings():
    rc = app_state.runtime_config
    return {
        "selling_realm_id": rc.selling_realm_id,
        "threshold_low": round(rc.threshold_low * 100),
        "threshold_medium": round(rc.threshold_medium * 100),
        "threshold_ultra": round(rc.threshold_ultra * 100),
    }


@router.get("/items/{item_id}/prices")
async def item_realm_prices(item_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ItemCurrentPrice.connected_realm_id, ItemCurrentPrice.min_buyout, ConnectedRealm.name)
        .join(ConnectedRealm, ConnectedRealm.id == ItemCurrentPrice.connected_realm_id)
        .where(ItemCurrentPrice.item_id == item_id)
        .order_by(ItemCurrentPrice.min_buyout.asc())
    )
    return [
        {"realm_id": r.connected_realm_id, "realm_name": r.name, "min_buyout": r.min_buyout}
        for r in result.all()
    ]


@router.get("/top-items")
async def top_items(
    since_days: int = Query(default=7, le=30),
    limit: int = Query(default=50, le=200),
    db: AsyncSession = Depends(get_db),
):
    since = datetime.now(timezone.utc) - timedelta(days=since_days)
    # DISTINCT ON picks the cheapest buyout row per item (includes realm name).
    # The stats subquery aggregates count and avg selling price per item.
    result = await db.execute(text("""
        SELECT best.item_id, best.item_name, best.icon_url,
               best.realm_name  AS best_realm,
               best.buyout      AS min_buyout,
               stats.snipe_count,
               stats.avg_market
        FROM (
            SELECT DISTINCT ON (item_id)
                   item_id, item_name, icon_url, realm_name, buyout
            FROM   snipes
            WHERE  detected_at >= :since AND discount_pct > 0
            ORDER  BY item_id, buyout ASC
        ) best
        JOIN (
            SELECT item_id,
                   COUNT(*)             AS snipe_count,
                   AVG(market_price)    AS avg_market
            FROM   snipes
            WHERE  detected_at >= :since AND discount_pct > 0
            GROUP  BY item_id
        ) stats ON best.item_id = stats.item_id
        ORDER  BY stats.snipe_count DESC
        LIMIT  :limit
    """), {"since": since, "limit": limit})

    rows = result.mappings().all()
    return [
        {
            "item_id": r["item_id"],
            "item_name": r["item_name"],
            "icon_url": r["icon_url"],
            "best_realm": r["best_realm"],
            "snipe_count": r["snipe_count"],
            "min_buyout": r["min_buyout"],
            "avg_market": int(r["avg_market"]),
        }
        for r in rows
    ]


@router.post("/settings")
async def update_runtime_settings(body: RuntimeSettingsIn, db: AsyncSession = Depends(get_db)):
    rc = app_state.runtime_config
    rc.selling_realm_id = body.selling_realm_id
    rc.threshold_low = body.threshold_low / 100
    rc.threshold_medium = body.threshold_medium / 100
    rc.threshold_ultra = body.threshold_ultra / 100

    row = await db.get(RuntimeSettings, 1)
    if row:
        row.selling_realm_id = rc.selling_realm_id
        row.threshold_low = rc.threshold_low
        row.threshold_medium = rc.threshold_medium
        row.threshold_ultra = rc.threshold_ultra
    else:
        db.add(RuntimeSettings(
            id=1,
            selling_realm_id=rc.selling_realm_id,
            threshold_low=rc.threshold_low,
            threshold_medium=rc.threshold_medium,
            threshold_ultra=rc.threshold_ultra,
        ))
    await db.commit()
    return {"ok": True}
