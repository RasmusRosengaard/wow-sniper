# WoW Sniper

A real-time World of Warcraft Auction House sniper. It scans all connected realms in your region every few minutes, detects underpriced items, and pushes live alerts to a Windows desktop app — so you can buy cheap on one realm and sell for profit on yours.

## How it works

1. After startup, the backend fetches auction data from all connected realms via the Blizzard API (~92 realms for EU).
2. It stores the cheapest buyout per item per realm in PostgreSQL.
3. Once all realms are scanned, it finds items where the cheapest buying realm is significantly below your selling realm's price.
4. Deals are pushed over WebSocket to the Electron client in real time.
5. The process repeats automatically whenever Blizzard publishes new auction data (~every 1 hour).

## Snipe tiers

| Tier   | Default threshold | Meaning                    |
|--------|-------------------|----------------------------|
| Low    | < 80% of market   | 20%+ below selling price   |
| Medium | < 60% of market   | 40%+ below selling price   |
| Ultra  | < 40% of market   | 60%+ below selling price   |

Thresholds are configurable in the Settings tab of the app.

## Stack

- **Backend** — Python, FastAPI, SQLAlchemy 2.0 async, asyncpg, PostgreSQL
- **Client** — Electron, React 18, TypeScript, Tailwind CSS (electron-vite)
- **Real-time** — WebSockets (FastAPI native)
- **Infrastructure** — Docker Compose

## Quick setup

### 1. Blizzard API credentials

Create a client at [develop.battle.net](https://develop.battle.net/), then:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and fill in:

```
BLIZZARD_CLIENT_ID=your_client_id
BLIZZARD_CLIENT_SECRET=your_client_secret
WOW_REGION=eu   # us | eu | kr | tw
```

### 2. Start the backend + database

```bash
docker-compose up -d --build
```

This starts PostgreSQL and the FastAPI backend. The backend will automatically create tables on first run and begin scanning all realms.

### 3. Start the desktop client

```bash
cd client
npm install
npm run dev
```

The Electron app opens automatically. Go to **Settings** and set your selling realm — this is the realm you sell on, used as the price reference for cross-realm deals.

### 4. Wait for the first scan

The initial scan takes ~15 minutes (92 realms, rate-limited by the Blizzard API). Progress is shown in the status bar at the bottom of the app. Deals appear as soon as the first full scan completes.

## Configuration

All thresholds and settings can be changed live in the **Settings** tab without restarting anything.

| Setting           | Description                                                  |
|-------------------|--------------------------------------------------------------|
| Selling realm     | The realm you sell on (cross-realm price reference)          |
| Low threshold     | Minimum discount to show as a Low deal (default 20%)        |
| Medium threshold  | Minimum discount to show as a Medium deal (default 40%)     |
| Ultra threshold   | Minimum discount to show as an Ultra deal (default 60%)     |

## Development

```bash
# Backend only (without Docker)
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Client
cd client
npm run dev
```

Backend API runs at `http://localhost:8000`. WebSocket at `ws://localhost:8000/ws`.
