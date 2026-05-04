from sqlalchemy import Column, Integer, BigInteger, String, Float, DateTime, Boolean, Text, func, UniqueConstraint
from .database import Base


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True)  # Blizzard item ID
    name = Column(String(512), nullable=False)
    icon_url = Column(Text)
    cached_at = Column(DateTime(timezone=True), server_default=func.now())


class ConnectedRealm(Base):
    __tablename__ = "connected_realms"

    id = Column(Integer, primary_key=True)  # Blizzard connected realm ID
    name = Column(String(255), nullable=False)
    region = Column(String(10), nullable=False)
    active = Column(Boolean, default=True)
    last_scanned = Column(DateTime(timezone=True))
    last_modified = Column(String(100))


class PriceHistory(Base):
    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    item_id = Column(Integer, nullable=False, index=True)
    connected_realm_id = Column(Integer, nullable=False, index=True)
    min_buyout = Column(BigInteger, nullable=False)  # copper
    recorded_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class Snipe(Base):
    __tablename__ = "snipes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    auction_id = Column(BigInteger, nullable=False)
    item_id = Column(Integer, nullable=False, index=True)
    item_name = Column(String(512), nullable=False, default="")
    icon_url = Column(Text)
    connected_realm_id = Column(Integer, nullable=False, index=True)
    realm_name = Column(String(255), nullable=False, default="")
    buyout = Column(BigInteger, nullable=False)  # copper
    market_price = Column(BigInteger, nullable=False)  # copper
    discount_pct = Column(Float, nullable=False)
    tier = Column(String(10), nullable=False)  # low | medium | ultra
    source = Column(String(20), nullable=False, server_default="local")  # local | cross_realm
    quantity = Column(Integer, default=1)
    time_left = Column(String(20), default="")
    detected_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class UpdatePattern(Base):
    __tablename__ = "update_patterns"

    id = Column(Integer, primary_key=True, autoincrement=True)
    connected_realm_id = Column(Integer, nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), nullable=False)


class RuntimeSettings(Base):
    """Single-row table — persists runtime config across restarts."""
    __tablename__ = "runtime_settings"

    id = Column(Integer, primary_key=True, default=1)
    selling_realm_id = Column(Integer, nullable=False, default=0)
    threshold_low = Column(Float, nullable=False, default=0.80)
    threshold_medium = Column(Float, nullable=False, default=0.60)
    threshold_ultra = Column(Float, nullable=False, default=0.40)


class ItemCurrentPrice(Base):
    """One row per (realm, item) — UPSERTed every scan. Gives a live regional price picture."""
    __tablename__ = "item_current_prices"
    __table_args__ = (UniqueConstraint("connected_realm_id", "item_id", name="uq_realm_item"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    item_id = Column(Integer, nullable=False, index=True)
    connected_realm_id = Column(Integer, nullable=False, index=True)
    min_buyout = Column(BigInteger, nullable=False)  # copper
    quantity = Column(Integer, nullable=False, default=0)
    scanned_at = Column(DateTime(timezone=True), nullable=False)
