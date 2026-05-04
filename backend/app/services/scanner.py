from __future__ import annotations
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy import select, func, delete, distinct, text
from sqlalchemy.dialects.postgresql import insert as pg_insert

from ..models import ConnectedRealm, PriceHistory, Snipe, ItemCurrentPrice
from ..config import Settings
from .. import app_state
from .blizzard import BlizzardClient
from .item_cache import ItemCache
from .snipe_detector import SnipeDetector

logger = logging.getLogger(__name__)

_CHECK_INTERVAL = 300   # poll sentinel every 5 min waiting for API update
_SCAN_CONCURRENCY = 10  # concurrent Blizzard requests during full scan


class SnipeEventBus:
    def __init__(self):
        self._queues: list[asyncio.Queue] = []

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=500)
        self._queues.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        try:
            self._queues.remove(q)
        except ValueError:
            pass

    async def publish(self, event: dict):
        for q in list(self._queues):
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                pass


snipe_bus = SnipeEventBus()


class AuctionScanner:
    def __init__(
        self,
        settings: Settings,
        blizzard: BlizzardClient,
        session_factory,
        item_cache: ItemCache,
        detector: SnipeDetector,
    ):
        self._settings = settings
        self._blizzard = blizzard
        self._session_factory = session_factory
        self._item_cache = item_cache
        self._sem = asyncio.Semaphore(_SCAN_CONCURRENCY)
        # Per-realm Last-Modified headers for If-Modified-Since on re-scans
        self._last_modified: dict[int, str] = {}
        # item_id -> (buy_realm_id, buy_price) — skip re-broadcasting unchanged deals
        self._last_deals: dict[int, tuple[int, int]] = {}
        self._started_at = datetime.now(timezone.utc)
        self._status = {
            "polling_state": "idle",
            "tracked_realms": 0,
            "realms_scanned": 0,
            "realms_total": 0,
            "last_update": None,
            "started_at": self._started_at.isoformat(),
        }

    @property
    def status(self) -> dict:
        return self._status

    # ------------------------------------------------------------------ #
    # Main loop                                                            #
    # ------------------------------------------------------------------ #

    async def run(self):
        realm_ids = await self._load_realm_ids()
        self._status["tracked_realms"] = len(realm_ids)
        logger.info("Scanner ready — %d realms", len(realm_ids))

        while True:
            logger.info("Full scan starting (%d realms)…", len(realm_ids))
            self._status["polling_state"] = "scanning"
            self._status["realms_scanned"] = 0
            self._status["realms_total"] = len(realm_ids)

            await self._scan_all(realm_ids)

            self._status["polling_state"] = "detecting"
            selling_id = app_state.runtime_config.selling_realm_id
            if selling_id:
                await self._detect_best_deals(selling_id)

            self._status["last_update"] = datetime.now(timezone.utc).isoformat()
            self._status["polling_state"] = "waiting"
            logger.info("Scan complete. Waiting for next Blizzard API update…")

            await self._wait_for_api_update(realm_ids)

    # ------------------------------------------------------------------ #
    # Realm list                                                           #
    # ------------------------------------------------------------------ #

    async def _load_realm_ids(self) -> list[int]:
        async with self._session_factory() as session:
            result = await session.execute(
                select(ConnectedRealm).where(ConnectedRealm.active == True)
            )
            realms = result.scalars().all()

        if not realms:
            logger.info("No realms in DB — fetching from Blizzard…")
            try:
                realm_list = await self._blizzard.get_connected_realms()
            except Exception as exc:
                logger.error("Failed to fetch realm list: %s", exc)
                return []

            async with self._session_factory() as session:
                for r in realm_list:
                    existing = await session.get(ConnectedRealm, r["id"])
                    if not existing:
                        session.add(ConnectedRealm(
                            id=r["id"], name=r["name"], region=self._settings.wow_region
                        ))
                await session.commit()

            async with self._session_factory() as session:
                result = await session.execute(
                    select(ConnectedRealm).where(ConnectedRealm.active == True)
                )
                realms = result.scalars().all()

        return [r.id for r in realms]

    # ------------------------------------------------------------------ #
    # Full scan                                                            #
    # ------------------------------------------------------------------ #

    async def _scan_all(self, realm_ids: list[int]):
        tasks = [asyncio.create_task(self._scan_realm(rid)) for rid in realm_ids]
        await asyncio.gather(*tasks, return_exceptions=True)

    async def _scan_realm(self, realm_id: int):
        async with self._sem:
            try:
                result = await self._blizzard.get_auctions(
                    realm_id, self._last_modified.get(realm_id)
                )
                if result is None:
                    logger.debug("Realm %d: no new data (304)", realm_id)
                    return

                auctions, last_modified = result
                self._last_modified[realm_id] = last_modified

                await self._upsert_current_prices(realm_id, auctions)
                await self._update_price_history(realm_id, auctions)

                async with self._session_factory() as session:
                    r = await session.get(ConnectedRealm, realm_id)
                    if r:
                        r.last_scanned = datetime.now(timezone.utc)
                        r.last_modified = last_modified
                        await session.commit()

            except Exception as exc:
                logger.error("Realm %d scan error: %s", realm_id, exc)
            finally:
                self._status["realms_scanned"] = self._status.get("realms_scanned", 0) + 1
                await snipe_bus.publish({"type": "status", "data": dict(self._status)})

    # ------------------------------------------------------------------ #
    # Wait for next API update                                             #
    # ------------------------------------------------------------------ #

    async def _wait_for_api_update(self, realm_ids: list[int]):
        """Poll a sentinel realm every 5 min until Blizzard pushes new data."""
        if not realm_ids:
            await asyncio.sleep(3600)
            return

        sentinel = realm_ids[0]
        sentinel_modified = self._last_modified.get(sentinel)

        while True:
            await asyncio.sleep(_CHECK_INTERVAL)
            try:
                result = await self._blizzard.get_auctions(sentinel, sentinel_modified)
                if result is not None:
                    logger.info("API update detected — starting new scan")
                    return
            except Exception as exc:
                logger.warning("Sentinel check failed: %s", exc)

    # ------------------------------------------------------------------ #
    # Snipe detection (runs once after every full scan)                    #
    # ------------------------------------------------------------------ #

    async def _detect_best_deals(self, selling_id: int):
        """
        Find the globally cheapest buying realm per item vs the selling realm.
        Uses only realms scanned within the last 4 hours.
        Only broadcasts when a deal is new or has gotten cheaper.
        """
        rc = app_state.runtime_config
        cutoff = datetime.now(timezone.utc) - timedelta(hours=4)

        async with self._session_factory() as session:
            rows = await session.execute(
                text("""
                    SELECT DISTINCT ON (buy.item_id)
                        buy.item_id            AS item_id,
                        buy.connected_realm_id AS buy_realm_id,
                        buy.min_buyout         AS buy_price,
                        sell.min_buyout        AS sell_price,
                        cr.name                AS realm_name
                    FROM item_current_prices buy
                    JOIN item_current_prices sell
                        ON  sell.item_id            = buy.item_id
                        AND sell.connected_realm_id = :selling_id
                    JOIN connected_realms cr ON cr.id = buy.connected_realm_id
                    WHERE
                        buy.connected_realm_id != :selling_id
                        AND buy.scanned_at  >= NOW() - INTERVAL '4 hours'
                        AND sell.scanned_at >= NOW() - INTERVAL '4 hours'
                        AND buy.min_buyout  <  sell.min_buyout * :threshold
                    ORDER BY buy.item_id, buy.min_buyout ASC
                """).bindparams(
                    selling_id=selling_id,
                    threshold=rc.threshold_low,
                )
            )
            deals = rows.mappings().all()

        logger.info(
            "Detection found %d deals (selling_id=%s, threshold=%.2f, cutoff=%s)",
            len(deals), selling_id, rc.threshold_low, cutoff.isoformat()
        )

        for deal in deals:
            item_id   = deal["item_id"]
            realm_id  = deal["buy_realm_id"]
            buy_price = deal["buy_price"]
            sell_price = deal["sell_price"]

            prev = self._last_deals.get(item_id)
            if prev and prev[0] == realm_id and prev[1] <= buy_price:
                continue  # Same realm, price hasn't improved

            self._last_deals[item_id] = (realm_id, buy_price)

            item = await self._item_cache.get(item_id)
            ratio = buy_price / sell_price
            tier = _tier(ratio, rc)

            snipe_data = {
                "auction_id":   item_id,   # stable per item — one card per item in the feed
                "item_id":      item_id,
                "item_name":    item.name,
                "icon_url":     item.icon_url,
                "realm_id":     realm_id,
                "realm_name":   deal["realm_name"],
                "buyout":       buy_price,
                "market_price": sell_price,
                "discount_pct": round((1 - ratio) * 100, 1),
                "tier":         tier,
                "quantity":     0,
                "time_left":    "",
                "source":       "cross_realm",
                "detected_at":  datetime.now(timezone.utc).isoformat(),
            }

            await self._persist_deal(snipe_data)
            await snipe_bus.publish({"type": "snipe", "data": snipe_data})
            logger.info(
                "Deal: %s — buy on %s for %dg, sell for %dg (-%d%%)",
                item.name, deal["realm_name"],
                buy_price // 10000, sell_price // 10000,
                round((1 - ratio) * 100),
            )

    # ------------------------------------------------------------------ #
    # Persistence                                                          #
    # ------------------------------------------------------------------ #

    async def _upsert_current_prices(self, realm_id: int, auctions: list[dict]):
        item_min: dict[int, int] = {}
        item_qty: dict[int, int] = {}
        for a in auctions:
            item_id = a.get("item", {}).get("id")
            buyout  = a.get("buyout", 0)
            qty     = a.get("quantity", 1)
            if item_id and buyout > 0:
                if item_id not in item_min or buyout < item_min[item_id]:
                    item_min[item_id] = buyout
                item_qty[item_id] = item_qty.get(item_id, 0) + qty

        if not item_min:
            return

        now = datetime.now(timezone.utc)
        async with self._session_factory() as session:
            for item_id, min_price in item_min.items():
                stmt = pg_insert(ItemCurrentPrice).values(
                    item_id=item_id,
                    connected_realm_id=realm_id,
                    min_buyout=min_price,
                    quantity=item_qty[item_id],
                    scanned_at=now,
                ).on_conflict_do_update(
                    constraint="uq_realm_item",
                    set_=dict(min_buyout=min_price, quantity=item_qty[item_id], scanned_at=now),
                )
                await session.execute(stmt)
            await session.commit()

    async def _update_price_history(self, realm_id: int, auctions: list[dict]):
        min_buyouts: dict[int, int] = {}
        for a in auctions:
            item_id = a.get("item", {}).get("id")
            buyout  = a.get("buyout", 0)
            if item_id and buyout > 0:
                if item_id not in min_buyouts or buyout < min_buyouts[item_id]:
                    min_buyouts[item_id] = buyout

        if not min_buyouts:
            return

        cutoff = datetime.now(timezone.utc) - timedelta(days=self._settings.price_history_days)
        async with self._session_factory() as session:
            await session.execute(
                delete(PriceHistory).where(
                    PriceHistory.connected_realm_id == realm_id,
                    PriceHistory.recorded_at < cutoff,
                )
            )
            for item_id, price in min_buyouts.items():
                session.add(PriceHistory(
                    item_id=item_id, connected_realm_id=realm_id, min_buyout=price
                ))
            await session.commit()

    async def _persist_deal(self, d: dict):
        async with self._session_factory() as session:
            existing = await session.execute(
                select(Snipe.id).where(Snipe.auction_id == d["auction_id"]).limit(1)
            )
            now = datetime.now(timezone.utc)
            if existing.scalar():
                await session.execute(
                    Snipe.__table__.update()
                    .where(Snipe.auction_id == d["auction_id"])
                    .values(
                        connected_realm_id=d["realm_id"],
                        realm_name=d["realm_name"],
                        buyout=d["buyout"],
                        market_price=d["market_price"],
                        discount_pct=d["discount_pct"],
                        tier=d["tier"],
                        detected_at=now,
                    )
                )
            else:
                session.add(Snipe(
                    auction_id=d["auction_id"],
                    item_id=d["item_id"],
                    item_name=d["item_name"],
                    icon_url=d["icon_url"],
                    connected_realm_id=d["realm_id"],
                    realm_name=d["realm_name"],
                    buyout=d["buyout"],
                    market_price=d["market_price"],
                    discount_pct=d["discount_pct"],
                    tier=d["tier"],
                    quantity=0,
                    time_left="",
                    source="cross_realm",
                    detected_at=now,
                ))
            await session.commit()


# ------------------------------------------------------------------ #
# Helpers                                                              #
# ------------------------------------------------------------------ #

def _tier(ratio: float, rc) -> str:
    if ratio < rc.threshold_ultra:
        return "ultra"
    if ratio < rc.threshold_medium:
        return "medium"
    return "low"
