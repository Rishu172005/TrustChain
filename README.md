# ⛓️ TrustChain

**Blockchain-Anchored Federated Learning for Privacy-Preserving Location Recommendations**

TrustChain combines three pillars into one verifiable recommendation system:

| Pillar | Technology | Role |
|---|---|---|
| 🤖 **Federated Learning** | Flower + PyTorch | Train personalised POI recommendations without sharing raw data |
| ⛓️ **Blockchain** | Ethereum / Hardhat + Solidity | Immutably anchor model weights, check-ins, and token rewards |
| 🔒 **Differential Privacy** | DP noise (ε = 1.0) | Protect individual data during model training and aggregation |

The system's unique user-facing feature is the **Transparency Panel** — a live UI that shows _exactly_ why each POI was recommended, backed by on-chain cryptographic proof.

---

## Table of Contents

1. [What This Project Does](#what-this-project-does)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Component Breakdown](#component-breakdown)
5. [API Documentation](#api-documentation)
6. [UI Feature Guide](#ui-feature-guide)
7. [Dataset](#dataset)
8. [Team](#team)

---

## What This Project Does

TrustChain is a location-based recommendation system where users can:

- 🗺️ **Explore** 34,000+ NYC points of interest on an interactive map
- ✅ **Check in** at locations and earn **TrustChain (TC) tokens** on-chain
- ✍️ **Submit reviews** (hashed and stored on-chain) for extra TC rewards
- 🎯 **Receive personalised recommendations** from a federated learning model
- 🔍 **Inspect why** any POI was recommended via a transparency panel showing three scored components
- 🛡️ **Trust the data** — bot activity is detected and filtered; the defence shield result is displayed live in the UI

---

## Quick Start

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js + npm | 18+ | Frontend (React + Vite) |
| Python | 3.11+ | Federated learning + defence logic |
| Go | 1.21+ | Backend API server |
| MongoDB | 6+ | Off-chain metadata storage |
| Git | any | Version control |

---

### 1 · Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** — the dashboard loads instantly from static JSON data; no backend required for the map and recommendations.

> ✅ **Verified:** `npm run build` succeeds. All POI and recommendation data is served from `frontend/public/`.

---

### 2 · Backend

```bash
cd backend
go mod tidy
go run ./cmd/server
```

The API server starts on **http://localhost:8080**. It handles check-ins, reviews, token balance queries, and blockchain transactions via ethers.js.

---

### 3 · Federated Learning Server

```bash
cd federated
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python flower_server.py
```

This starts the Flower FL server. It runs FedAvg aggregation across 3 simulated client nodes and stores model weight hashes on-chain after each round.

---

### 4 · Smart Contracts (Hardhat)

```bash
cd contracts
npm install
npx hardhat compile
npx hardhat test
npx hardhat node          # local testnet
npx hardhat run scripts/deploy.js --network localhost
```

---

### 5 · Data Preprocessing

```bash
cd data
python preprocess.py
```

Cleans `raw/dataset_TSMC2014_NYC.txt` → `processed/foursquare_nyc_clean.csv`, which feeds both the FL model and the frontend dataset.

---

### 6 · Defence Integration (Optional)

```bash
python S4_DEFENSE_INTEGRATION.py
```

Runs bot detection and differential privacy analysis. Output feeds into `frontend/public/recommendations.json` as the `meta.defenseShield` block.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TrustChain System                           │
│                                                                     │
│  ┌──────────────────┐    REST/JSON    ┌───────────────────────────┐ │
│  │   React 19 UI    │◄──────────────►│   Go Backend (Gin)        │ │
│  │   Vite 8         │                │                           │ │
│  │   Leaflet Map    │                │  POST /checkin            │ │
│  │   Transparency   │                │  POST /review             │ │
│  │   Panel          │                │  GET  /recommend          │ │
│  │   Wallet Modal   │                │  GET  /token-balance      │ │
│  │   Review Form    │                │  GET  /explain/:poiId     │ │
│  └──────────────────┘                └──────────┬────────────────┘ │
│                                                  │ ethers.js        │
│                                                  ▼                  │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │            Ethereum Testnet (Hardhat / Sepolia)              │   │
│  │                                                              │   │
│  │   TrustToken (ERC-20)     UserRegistry     StakingContract   │   │
│  │   ModelHashRegistry       GeoRecommender   PoR Oracle        │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                  ▲                  │
│  ┌─────────────────────────┐    SHA-256 hash     │                  │
│  │   Flower FL Server      │────────────────────►│                  │
│  │   FedAvg Aggregator     │                                        │
│  │   3 × Client Nodes      │◄── Local training (no raw data sent)   │
│  │   DP noise ε = 1.0      │                                        │
│  └─────────────────────────┘                                        │
│                                                                     │
│  ┌─────────────────────────┐                                        │
│  │   MongoDB (off-chain)   │  POI metadata · user profiles          │
│  └─────────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────────┘
```

### Request Flow (Happy Path)

```
User opens app
    └─► Load 34k POIs from pois.json (Leaflet map)
    └─► Load recommendations.json → highlight top-5 POIs per profile
User clicks "Why? →" on a recommended POI
    └─► Transparency Panel opens
        ├─ Proximity Score  (25% weight) — geographic distance
        ├─ Community Rating (25% weight) — relative check-in volume
        └─ FL Model Score   (50% weight) — federated learning confidence
User clicks "Check in"
    └─► POST /checkin → smart contract mints +1 TC
User clicks "Write Review"
    └─► Review hashed → POST /review → smart contract mints +5 TC
        └─► Wallet modal shows updated balance + ledger entry
```

---

## Component Breakdown

### `frontend/` — React + Vite UI

| File | Purpose |
|---|---|
| `src/App.jsx` | App shell, all state, modal triggers |
| `src/App.css` | Full glassmorphism dark design system |
| `src/PoiMap.jsx` | Leaflet map with colour-coded circle markers |
| `src/PoiDetailsPanel.jsx` | **"Why was this recommended?"** transparency panel |
| `src/index.css` | CSS reset + design tokens |
| `public/pois.json` | ~34k NYC POI records |
| `public/recommendations.json` | 3 profiles × 5 recommendations + defence metadata |

### `backend/` — Go REST API

| Path | Role |
|---|---|
| `cmd/server/` | Entry point — starts Gin HTTP server |
| `internal/handlers/` | Route handlers (checkin, review, recommend, etc.) |
| `internal/blockchain/` | ethers.js bridge for on-chain calls |
| `internal/db/` | MongoDB connection and queries |

### `contracts/` — Solidity Smart Contracts

| Contract | Purpose |
|---|---|
| `TrustToken.sol` | ERC-20 token: mint (+1 TC check-in, +5 TC review), burn, transfer |
| `UserRegistry.sol` | Register users, store check-in hashes, verify identity |
| `StakingContract.sol` | Business stake deposits; slash on bad behaviour |
| `ModelHashRegistry.sol` | Store SHA-256 hash of FL model weights per round |
| `GeoRecommender.sol` | Geofenced recommendation contract + PoR oracle |

### `federated/` — Flower FL Pipeline

| File | Role |
|---|---|
| `flower_server.py` | Flower server — runs FedAvg aggregation |
| `client.py` | Simulated FL client with local training + DP noise |
| `model.py` | Collaborative filtering model (PyTorch) |
| `defense.py` | Bot detection + adversarial client filtering |

### `data/`

| File | Description |
|---|---|
| `raw/dataset_TSMC2014_NYC.txt` | Original Foursquare NYC check-in dataset |
| `processed/foursquare_nyc_clean.csv` | Cleaned, geocoded POI records |
| `preprocess.py` | Data cleaning pipeline |

---

## API Documentation

All endpoints are served by the Go backend at `http://localhost:8080`.

---

### `POST /checkin`

Record a user check-in at a POI and mint **+1 TC** on-chain.

**Request body:**
```json
{
  "userId":    "user_0xABC123",
  "poiId":     "poi_0042",
  "lat":        40.7549,
  "lng":       -73.9840,
  "timestamp": "2026-07-14T14:34:00Z"
}
```

**Response `200 OK`:**
```json
{
  "success":      true,
  "tokensAwarded": 1,
  "newBalance":   121,
  "txHash":       "0xDEF456..."
}
```

**Errors:** `400` invalid body · `409` duplicate check-in · `503` blockchain unavailable

---

### `POST /review`

Submit a written review (hashed on-chain) and mint **+5 TC**.

**Request body:**
```json
{
  "userId":  "user_0xABC123",
  "poiId":   "poi_0042",
  "rating":  5,
  "comment": "Fantastic transit hub, always on time.",
  "profile": "commuter"
}
```

**Response `200 OK`:**
```json
{
  "success":      true,
  "tokensAwarded": 5,
  "reviewId":     "review_001",
  "commentHash":  "sha256:a3f7b2...",
  "txHash":       "0xGHI789..."
}
```

> ℹ️ Raw review text is **never** stored on-chain. Only a SHA-256 hash is recorded, preserving privacy while enabling verification.

---

### `GET /recommend?userId=user_0xABC123&profile=commuter`

Return the top-N personalised POI recommendations for a user profile.

**Response `200 OK`:**
```json
{
  "profile": "commuter",
  "recommendations": [
    {
      "id":       "poi_001",
      "name":     "Grand Central Terminal",
      "category": "Transit Station",
      "score":    0.92,
      "lat":      40.7527,
      "lng":     -73.9772
    },
    {
      "id":       "poi_002",
      "name":     "Times Square Subway",
      "category": "Transit Station",
      "score":    0.86,
      "lat":      40.7590,
      "lng":     -73.9845
    }
  ]
}
```

---

### `GET /token-balance?userId=user_0xABC123`

Fetch on-chain TC token balance for a user wallet address.

**Response `200 OK`:**
```json
{
  "userId":  "user_0xABC123",
  "balance": 125,
  "unit":    "TC"
}
```

---

### `GET /explain/:poiId?profile=commuter`

Return the full transparency score breakdown for a specific POI and profile.  
This is the data backing the **"Why was this recommended?"** panel in the UI.

**Response `200 OK`:**
```json
{
  "poi":       "poi_0042",
  "name":      "Grand Central Terminal",
  "composite": 84,
  "breakdown": {
    "proximity": {
      "score":   91,
      "weight":  0.25,
      "formula": "max(0, 110 - dist_degrees * 55)"
    },
    "community": {
      "score":   78,
      "weight":  0.25,
      "formula": "(poi.checkins / max_checkins_dataset) * 100"
    },
    "modelScore": {
      "score":   82,
      "weight":  0.50,
      "formula": "FL_model.predict(poi_id, profile) * 100"
    }
  },
  "modelHash": "sha256:a3f7b2c9...",
  "dpEpsilon": 1.0,
  "porVerified": true
}
```

---

### `GET /health`

Service health check.

```json
{ "status": "ok", "version": "1.0.0" }
```

---

## UI Feature Guide

### 🗺️ Map Dashboard

The main view shows all ~34k NYC POIs as colour-coded circle markers:

| Colour | Meaning |
|---|---|
| 🟠 Orange | Recommended for active profile (prominent, with double halo) |
| 🟢 Green | Currently selected POI |
| 🔵 Blue (faint) | All other POIs in the dataset |

Click any marker to select it. Click recommended markers to open the full details panel.

---

### 💰 Token Wallet

Click **"💰 Wallet"** in the top bar to open the wallet modal:

- **Balance card** — your current TC token balance with animated shimmer
- **Stats row** — total check-ins, reviews, and tokens earned
- **Transaction ledger** — chronological on-chain event history (check-ins + reviews)

---

### ✍️ Review Submission Form

Opens when you click **"✍️ Review (+5 TC)"** on any selected POI:

- **5-star rating** — keyboard accessible, with live label (Poor / Fair / Good / Great / Excellent)
- **Written feedback** — text area with 300-character limit and live counter
- **Privacy note** — confirms review is hashed and only the hash goes on-chain
- **Submit button** — disabled until text is entered; mints +5 TC on success

---

### 🔍 "Why Was This Recommended?" Panel

Click **"Why? →"** next to any recommendation, or **"📊 Scores"** on the selected location card.

The panel shows:

| Section | Detail |
|---|---|
| **Header** | "⛓️ Blockchain-Verified Transparency" eyebrow + POI name |
| **Composite score** | Weighted formula banner with live computed score |
| **📡 Proximity Score** | Animated ring gauge + bar + plain-English rationale + formula |
| **👥 Community Rating** | Same — relative check-in volume vs. full dataset |
| **🤖 FL Model Score** | Same — federated learning confidence for active profile |
| **On-chain proof** | DP ε badge · PoR Verified badge · hash storage explanation |
| **Actions** | Check-in (+1 TC) · Write Review (+5 TC) directly from the panel |

---

### 🛡️ Defence Shield Banner

If the loaded `recommendations.json` contains a `meta.defenseShield` block (output by `S4_DEFENSE_INTEGRATION.py`), a red banner appears at the top showing:

- Number of bot accounts flagged and blocked
- % of clean data retained after filtering
- DP ε value applied

---

## Dataset

**Foursquare NYC Check-in Dataset (TSMC 2014)**

| Property | Value |
|---|---|
| Source | Foursquare via TSMC 2014 research dataset |
| Total POIs | ~34,000 |
| City | New York City |
| Categories | Transit, Food & Drink, Parks, Culture, Hotels, Shops |
| Check-in range | 0 – ~50,000 per POI |
| Profiles | Commuter · Explorer · Social |

---

## Team

| Student | Role | Key Deliverables |
|---|---|---|
| Priyadharshini (S1) | Blockchain Lead | TrustToken ERC-20 · UserRegistry · StakingContract · ModelHashRegistry · GeoRecommender · PoR oracle · unit tests · gas benchmarks |
| Amber (S2) | ML/AI Lead | Flower FL pipeline (FedAvg + DP) · collaborative filtering model · adversarial defence research |
| Siddhartha (S3) | Backend Lead | Go REST API · ethers.js blockchain bridge · MongoDB integration · latency benchmarking · mock oracle endpoint |
| Rishu Kishan (S4) | Frontend / Research Lead | React + Leaflet map UI · glassmorphism design system · **"Why was this recommended?" transparency panel** · token wallet · review form · defence shield integration · dataset pipeline · README + project documentation |

---

> **Repository structure:** `frontend/` · `backend/` · `contracts/` · `federated/` · `data/` · `docs/`  
> **Final report:** [`docs/FINAL_REPORT.md`](docs/FINAL_REPORT.md)
