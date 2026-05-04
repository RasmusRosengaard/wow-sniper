# WoW Sniper — Gold Goblin Edition

A real-time World of Warcraft Auction House sniping tool. It scans all connected realms in your region every hour, finds items listed far below what they sell for on your realm, and pushes live alerts to a Windows desktop app — so you can buy cheap and sell for profit.

## How it works

1. On startup the backend fetches auction data from every connected realm in your region (~92 for EU) via the Blizzard API.
2. It stores the cheapest buyout per item per realm in PostgreSQL.
3. Once all realms are scanned, it compares buy prices across realms against your selling realm's price.
4. Deals are pushed over WebSocket to the desktop app in real time.
5. The process repeats automatically whenever Blizzard publishes new data (~hourly).

## Features

- **Live deal feed** — sorted by newest, gold profit, or discount %
- **Per-item realm breakdown** — click any deal to see prices across all realms, sorted cheapest first
- **Watchlist** — pin specific items to always track them regardless of realm filters
- **Configurable thresholds** — set your own discount cutoffs for Standard / Good / Steal deals
- **Scan progress** — real-time progress bar in the status bar while scanning realms

## Stack

- **Backend** — Python, FastAPI, SQLAlchemy 2.0 async, asyncpg, PostgreSQL
- **Client** — Electron, React 18, TypeScript, Tailwind CSS (electron-vite)
- **Real-time** — WebSockets (FastAPI native)
- **Infrastructure** — Docker Compose

---

## Quick setup

### 1. Blizzard API credentials

Create a client at [develop.battle.net](https://develop.battle.net/), then:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```
BLIZZARD_CLIENT_ID=your_client_id
BLIZZARD_CLIENT_SECRET=your_client_secret
WOW_REGION=eu        # us | eu | kr | tw
```

### 2. Start the backend + database

```bash
docker-compose up -d --build
```

Starts PostgreSQL and the FastAPI backend. Tables are created automatically on first run.

### 3. Start the desktop client

```bash
cd client
npm install
npm run dev
```

### 4. Configure your selling realm

Open **Settings** in the app and pick the realm you sell on. This is the price reference used to evaluate cross-realm deals.

### 5. Wait for the first scan

The initial scan takes ~15 minutes (92 realms, rate-limited by Blizzard). Watch the progress in the status bar at the bottom. Deals appear as soon as the scan finishes.

---

## Settings reference

| Setting              | Description                                                             |
|----------------------|-------------------------------------------------------------------------|
| Selling realm        | Realm you sell on — used as the market price reference                  |
| Standard deal        | Minimum discount to flag a deal (e.g. 20% below market)                |
| Good deal            | Higher discount threshold                                               |
| Steal                | The real goblin territory — deep discounts worth jumping on immediately |
| Source realms        | Filter which realms to scan for buys (leave empty for all)              |
| Watchlist item IDs   | Comma-separated Blizzard item IDs — bypass realm filters                |
| Notifications        | Desktop alert when a deal is detected                                   |

---

## Development (without Docker)

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Client
cd client
npm run dev
```

Backend API: `http://localhost:8000` · WebSocket: `ws://localhost:8000/ws`
