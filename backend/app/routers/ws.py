from __future__ import annotations
import asyncio
import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..services.scanner import snipe_bus

logger = logging.getLogger(__name__)
router = APIRouter()

_TIER_ORDER = {"low": 0, "medium": 1, "ultra": 2}


class ClientFilters:
    def __init__(self):
        self.realm_ids: set[int] = set()
        self.min_tier: str = "low"
        self.watchlist: set[int] = set()

    def update(self, msg: dict):
        if "realm_ids" in msg:
            self.realm_ids = set(msg["realm_ids"])
        if "min_tier" in msg:
            self.min_tier = msg["min_tier"]
        if "watchlist_item_ids" in msg:
            self.watchlist = set(msg["watchlist_item_ids"])

    def matches(self, event: dict) -> bool:
        if event.get("type") != "snipe":
            return True  # always forward non-snipe events (heartbeat, status)

        data = event.get("data", {})

        if self.realm_ids and data.get("realm_id") not in self.realm_ids:
            if data.get("item_id") not in self.watchlist:
                return False

        tier = data.get("tier", "low")
        if _TIER_ORDER.get(tier, 0) < _TIER_ORDER.get(self.min_tier, 0):
            return False

        return True


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    filters = ClientFilters()
    q = snipe_bus.subscribe()
    logger.info("WebSocket client connected")

    async def send_loop():
        while True:
            try:
                event = await asyncio.wait_for(q.get(), timeout=25.0)
                if filters.matches(event):
                    await ws.send_json(event)
            except asyncio.TimeoutError:
                await ws.send_json({"type": "heartbeat", "ts": datetime.now(timezone.utc).isoformat()})

    async def recv_loop():
        async for raw in ws.iter_text():
            try:
                msg = json.loads(raw)
                if msg.get("type") == "subscribe":
                    filters.update(msg)
                    await ws.send_json({"type": "ack", "filters": {
                        "realm_ids": list(filters.realm_ids),
                        "min_tier": filters.min_tier,
                        "watchlist_item_ids": list(filters.watchlist),
                    }})
            except json.JSONDecodeError:
                pass

    send_task = asyncio.create_task(send_loop())
    recv_task = asyncio.create_task(recv_loop())

    try:
        done, pending = await asyncio.wait(
            [send_task, recv_task],
            return_when=asyncio.FIRST_EXCEPTION,
        )
        for t in done:
            exc = t.exception()
            if exc and not isinstance(exc, WebSocketDisconnect):
                logger.debug("WS task ended: %s", exc)
    finally:
        send_task.cancel()
        recv_task.cancel()
        snipe_bus.unsubscribe(q)
        logger.info("WebSocket client disconnected")
