from __future__ import annotations
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import engine, AsyncSessionLocal, Base
from .models import RuntimeSettings
from .services.blizzard import BlizzardClient
from .services.item_cache import ItemCache
from .services.snipe_detector import SnipeDetector
from .services.scanner import AuctionScanner
from .routers import ws, snipes
from . import app_state

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables ready")

    async with AsyncSessionLocal() as session:
        row = await session.get(RuntimeSettings, 1)
        if row:
            rc = app_state.runtime_config
            rc.selling_realm_id = row.selling_realm_id
            rc.threshold_low = row.threshold_low
            rc.threshold_medium = row.threshold_medium
            rc.threshold_ultra = row.threshold_ultra
            logger.info("Runtime settings loaded (selling_realm_id=%d)", rc.selling_realm_id)

    blizzard = BlizzardClient(settings)
    item_cache = ItemCache(blizzard, AsyncSessionLocal)
    detector = SnipeDetector(settings, app_state.runtime_config)
    scanner = AuctionScanner(settings, blizzard, AsyncSessionLocal, item_cache, detector)
    app_state.scanner = scanner

    scan_task = asyncio.create_task(scanner.run())
    logger.info("Auction scanner started")

    yield

    scan_task.cancel()
    try:
        await scan_task
    except asyncio.CancelledError:
        pass
    await blizzard.close()
    await engine.dispose()
    logger.info("Shutdown complete")


app = FastAPI(title="WoW Sniper", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ws.router)
app.include_router(snipes.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
