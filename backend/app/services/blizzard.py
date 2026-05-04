from __future__ import annotations
import asyncio
import time
import logging
from typing import Optional
import httpx
from ..config import Settings

logger = logging.getLogger(__name__)

_REGION_HOSTS = {
    "us": ("https://us.api.blizzard.com", "https://us.battle.net"),
    "eu": ("https://eu.api.blizzard.com", "https://eu.battle.net"),
    "kr": ("https://kr.api.blizzard.com", "https://kr.battle.net"),
    "tw": ("https://tw.api.blizzard.com", "https://tw.battle.net"),
}


class BlizzardClient:
    def __init__(self, settings: Settings):
        self._settings = settings
        self._region = settings.wow_region
        self._api_base, self._oauth_base = _REGION_HOSTS[self._region]
        self._client = httpx.AsyncClient(timeout=30.0)
        self._token: Optional[str] = None
        self._token_expires: float = 0
        self._sem = asyncio.Semaphore(5)  # max 5 concurrent Blizzard requests
        self._token_lock = asyncio.Lock()

    async def close(self):
        await self._client.aclose()

    async def _ensure_token(self):
        if self._token and time.monotonic() < self._token_expires - 60:
            return
        async with self._token_lock:
            if self._token and time.monotonic() < self._token_expires - 60:
                return  # another coroutine already refreshed while we waited
            resp = await self._client.post(
                f"{self._oauth_base}/oauth/token",
                data={"grant_type": "client_credentials"},
                auth=(self._settings.blizzard_client_id, self._settings.blizzard_client_secret),
            )
            resp.raise_for_status()
            body = resp.json()
            self._token = body["access_token"]
            self._token_expires = time.monotonic() + body["expires_in"]
            logger.debug("Blizzard token refreshed, expires in %ds", body["expires_in"])

    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self._token}"}

    def _ns(self, kind: str = "dynamic") -> str:
        return f"{kind}-{self._region}"

    async def _get(self, url: str, if_modified_since: Optional[str] = None, **kwargs) -> httpx.Response:
        async with self._sem:
            await self._ensure_token()
            headers = self._headers()
            if if_modified_since:
                headers["If-Modified-Since"] = if_modified_since
            kwargs["headers"] = headers
            return await self._client.get(url, **kwargs)

    async def get_connected_realms(self) -> list[dict]:
        resp = await self._get(
            f"{self._api_base}/data/wow/connected-realm/index",
            params={"namespace": self._ns("dynamic"), "locale": "en_US"},
        )
        resp.raise_for_status()
        index = resp.json()

        realms = []
        for entry in index.get("connected_realms", []):
            r = await self._get(entry["href"], params={"namespace": self._ns("dynamic"), "locale": "en_US"})
            if r.status_code != 200:
                continue
            data = r.json()
            realm_names = [rr["name"] for rr in data.get("realms", [])]
            realms.append({"id": data["id"], "name": ", ".join(realm_names) if realm_names else str(data["id"])})

        return realms

    async def get_auctions(
        self, connected_realm_id: int, if_modified_since: Optional[str] = None
    ) -> Optional[tuple[list[dict], str]]:
        resp = await self._get(
            f"{self._api_base}/data/wow/connected-realm/{connected_realm_id}/auctions",
            if_modified_since=if_modified_since,
            params={"namespace": self._ns("dynamic"), "locale": "en_US"},
        )

        if resp.status_code == 304:
            return None
        resp.raise_for_status()

        data = resp.json()
        last_modified = resp.headers.get("Last-Modified", "")
        auctions = [a for a in data.get("auctions", []) if a.get("buyout", 0) > 0]
        return auctions, last_modified

    async def get_item(self, item_id: int) -> Optional[dict]:
        resp = await self._get(
            f"{self._api_base}/data/wow/item/{item_id}",
            params={"namespace": self._ns("static"), "locale": "en_US"},
        )
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json()

    async def get_item_media(self, item_id: int) -> Optional[str]:
        resp = await self._get(
            f"{self._api_base}/data/wow/media/item/{item_id}",
            params={"namespace": self._ns("static"), "locale": "en_US"},
        )
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        assets = resp.json().get("assets", [])
        for asset in assets:
            if asset.get("key") == "icon":
                return asset.get("value")
        return None
