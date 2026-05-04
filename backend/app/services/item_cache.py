from __future__ import annotations
import asyncio
import logging
from typing import Optional
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Item
from .blizzard import BlizzardClient

logger = logging.getLogger(__name__)

_CACHE_TTL = timedelta(days=30)


class CachedItem:
    __slots__ = ("item_id", "name", "icon_url")

    def __init__(self, item_id: int, name: str, icon_url: Optional[str]):
        self.item_id = item_id
        self.name = name
        self.icon_url = icon_url


_UNKNOWN = CachedItem(0, "Unknown Item", None)


class ItemCache:
    def __init__(self, blizzard: BlizzardClient, session_factory):
        self._blizzard = blizzard
        self._session_factory = session_factory
        self._mem: dict[int, CachedItem] = {}
        self._in_flight: dict[int, asyncio.Task] = {}

    async def get(self, item_id: int) -> CachedItem:
        if item_id in self._mem:
            return self._mem[item_id]

        if item_id in self._in_flight:
            return await self._in_flight[item_id]

        task = asyncio.create_task(self._fetch(item_id))
        self._in_flight[item_id] = task
        try:
            result = await task
            return result
        finally:
            self._in_flight.pop(item_id, None)

    async def _fetch(self, item_id: int) -> CachedItem:
        async with self._session_factory() as session:
            row = await session.get(Item, item_id)
            if row and row.cached_at and (datetime.now(timezone.utc) - row.cached_at) < _CACHE_TTL:
                cached = CachedItem(row.id, row.name, row.icon_url)
                self._mem[item_id] = cached
                return cached

        try:
            item_data = await self._blizzard.get_item(item_id)
            if not item_data:
                return _UNKNOWN
            name = item_data.get("name", f"Item {item_id}")
            icon_url = await self._blizzard.get_item_media(item_id)
        except Exception as exc:
            logger.warning("Failed to fetch item %d: %s", item_id, exc)
            return _UNKNOWN

        async with self._session_factory() as session:
            existing = await session.get(Item, item_id)
            if existing:
                existing.name = name
                existing.icon_url = icon_url
                existing.cached_at = datetime.now(timezone.utc)
            else:
                session.add(Item(id=item_id, name=name, icon_url=icon_url, cached_at=datetime.now(timezone.utc)))
            await session.commit()

        cached = CachedItem(item_id, name, icon_url)
        self._mem[item_id] = cached
        return cached
