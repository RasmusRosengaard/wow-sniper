from __future__ import annotations
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from .services.scanner import AuctionScanner

scanner: Optional["AuctionScanner"] = None


class RuntimeConfig:
    def __init__(self):
        self.selling_realm_id: int = 0
        self.threshold_low: float = 0.80
        self.threshold_medium: float = 0.60
        self.threshold_ultra: float = 0.40


runtime_config = RuntimeConfig()
