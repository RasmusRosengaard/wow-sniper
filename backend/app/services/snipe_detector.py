from __future__ import annotations
from dataclasses import dataclass
from typing import Optional
from ..config import Settings


@dataclass
class MarketBaseline:
    item_id: int
    realm_id: int
    avg_min_buyout: int  # copper
    sample_size: int


@dataclass
class DetectedSnipe:
    auction_id: int
    item_id: int
    realm_id: int
    realm_name: str
    buyout: int
    quantity: int
    time_left: str
    market_price: int
    discount_pct: float
    tier: str
    item_name: str = ""
    icon_url: Optional[str] = None
    source: str = "local"  # "local" | "cross_realm"


class SnipeDetector:
    def __init__(self, settings: Settings, runtime_config):
        self._settings = settings
        self._runtime = runtime_config
        self._min_samples = settings.min_price_samples

    def _tier(self, ratio: float) -> Optional[str]:
        if ratio < self._runtime.threshold_ultra:
            return "ultra"
        if ratio < self._runtime.threshold_medium:
            return "medium"
        if ratio < self._runtime.threshold_low:
            return "low"
        return None

    def detect(
        self,
        auctions: list[dict],
        baselines: dict[int, MarketBaseline],
        realm_id: int,
        realm_name: str,
        global_baselines: Optional[dict[int, MarketBaseline]] = None,
        selling_baselines: Optional[dict[int, MarketBaseline]] = None,
    ) -> list[DetectedSnipe]:
        snipes: list[DetectedSnipe] = []
        use_selling = selling_baselines is not None and bool(self._runtime.selling_realm_id)

        for auction in auctions:
            item_id = auction.get("item", {}).get("id")
            buyout = auction.get("buyout", 0)
            if not item_id or not buyout:
                continue

            if use_selling:
                baseline = selling_baselines.get(item_id)  # type: ignore[union-attr]
                if not baseline:
                    continue
                source = "cross_realm"
            else:
                baseline = baselines.get(item_id)
                source = "local"
                if not baseline or baseline.sample_size < self._min_samples:
                    if not global_baselines:
                        continue
                    baseline = global_baselines.get(item_id)
                    if not baseline or baseline.sample_size < self._min_samples:
                        continue
                    source = "cross_realm"

            market = baseline.avg_min_buyout
            if market <= 0:
                continue

            ratio = buyout / market
            tier = self._tier(ratio)
            if tier is None:
                continue

            snipes.append(
                DetectedSnipe(
                    auction_id=auction["id"],
                    item_id=item_id,
                    realm_id=realm_id,
                    realm_name=realm_name,
                    buyout=buyout,
                    quantity=auction.get("quantity", 1),
                    time_left=auction.get("time_left", ""),
                    market_price=market,
                    discount_pct=round((1 - ratio) * 100, 1),
                    tier=tier,
                    source=source,
                )
            )

        snipes.sort(key=lambda s: s.discount_pct, reverse=True)
        return snipes
