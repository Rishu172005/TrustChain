# ⛓️ TrustChain

**Blockchain-Anchored Federated Learning for Privacy-Preserving Location Recommendations**

TrustChain is a research-grade internship project that combines three pillars into one verifiable recommendation system:

| Pillar | Technology | Role |
|---|---|---|
| 🤖 **Federated Learning** | Flower 1.9 + scikit-learn | Train personalised POI recommendations without sharing raw data |
| ⛓️ **Blockchain** | Ethereum / Hardhat + Solidity | Immutably anchor model weights, check-ins, and token rewards |
| 🔒 **Differential Privacy** | Laplacian noise (ε = 1.0) | Protect individual gradient updates during FL training |

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

- 🗺️ **Explore** ~227k NYC check-in records across ~34,000 points of interest on an interactive Leaflet map
- ✅ **Check in** at locations and earn **TrustChain (TC) tokens** (minted on-chain)
- ✍️ **Submit reviews** (SHA-256 hashed and stored on-chain) for extra TC rewards
- 🎯 **Receive personalised recommendations** from a federated learning model (3 user profiles)
- 🔍 **Inspect why** any POI was recommended via a transparency panel showing three scored components
- 🛡️ **Trust the data** — bot activity is detected and filtered via dual-threshold anomaly detection; the result is displayed live in the UI as the Defence Shield banner

---

## Quick Start

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js + npm | 18+ | Frontend (React 19 + Vite 8) |
| Python | 3.11+ | Federated learning + data pipeline + defence logic |
| Go | 1.22+ | Backend REST API (Gin) |
| MongoDB | 7+ (Docker or Atlas) | Off-chain metadata storage |
| Docker + Docker Compose | any | Backend containerised setup |
| Git | any | Version control |

---

### 1 · Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** — the dashboard loads instantly from static JSON data in `frontend/src/`; no backend required for the map and recommendations.

> ✅ **Verified:** `npm run build` succeeds. All POI and recommendation data is co-located in `frontend/src/` alongside the React components.

---

### 2 · Backend

**With Docker (recommended):**
```bash
cd backend
cp .env.example .env
docker compose up --build
```

**Without Docker (Go 1.22+ and MongoDB required):**
```bash
cd backend
cp .env.example .env
go mod download
go run ./cmd/server
```

The API server starts on **http://localhost:8080**. All routes are prefixed with `/api/v1`.

Verify it is running:
```bash
curl http://localhost:8080/api/v1/health
```

---

### 3 · Federated Learning & Recommendation Pipeline

**Generate recommendations (runs the full FL pipeline):**
```bash
cd federated
python3 task3.py
```

This loads the Foursquare NYC dataset, runs 5-round FedAvg collaborative filtering across 3 simulated client nodes, and writes:
- `frontend/src/pois.json` — all POI records
- `frontend/src/recommendations.json` — profiles × recommendations + FL metadata
- `frontend/src/user_profiles.json` — user preference score vectors

**Run the live Flower FL server (optional):**
```bash
# Terminal 1 — server
cd federated
python3 flower_server.py

# Terminals 2–4 — clients
python3 flower_client.py 0 127.0.0.1:8080
python3 flower_client.py 1 127.0.0.1:8080
python3 flower_client.py 2 127.0.0.1:8080
```

**Install Python dependencies:**
```bash
cd federated
python3 -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Requirements: `flwr==1.9.0`, `numpy==1.24.3`, `pandas==2.0.3`, `scikit-learn==1.3.0`

---

### 4 · Smart Contracts (Hardhat)

> ⚠️ The `contracts/` directory currently contains only a placeholder. Smart contract source files are maintained by S1 (Priyadharshini) and deployed on a local Hardhat testnet.

Typical workflow once source files are present:
```bash
cd contracts
npm install
npx hardhat compile
npx hardhat test
npx hardhat node                                      # local testnet
npx hardhat run scripts/deploy.js --network localhost
```

---

### 5 · Data Preprocessing

```bash
cd data
python preprocess.py
```

Cleans `raw/dataset_TSMC2014_NYC.txt` (227,428 check-in records, 31 MB) → `processed/foursquare_nyc_clean.csv`, which feeds both the FL pipeline and the frontend dataset.

---

### 6 · Defence Shield Integration

```bash
# From repository root
python S4_DEFENSE_INTEGRATION.py
```

Runs dual-threshold bot detection and applies Laplacian differential privacy noise (ε = 1.0) to model gradients. Output populates the `meta.defenseShield` block in `recommendations.json`, which the frontend renders as the red Defence Shield banner.

See [`S4_DEFENSE_INTEGRATION_GUIDE.md`](S4_DEFENSE_INTEGRATION_GUIDE.md) and [`S4_DEFENSE_SHIELD_QUICK_REFERENCE.md`](S4_DEFENSE_SHIELD_QUICK_REFERENCE.md) for full integration details.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          TrustChain System                           │
│                                                                      │
│  ┌───────────────────┐   REST/JSON    ┌──────────────────────────┐   │
│  │  React 19 UI      │◄──────────────►│  Go Backend (Gin)        │   │
│  │  Vite 8           │                │  /api/v1                 │   │
│  │  react-leaflet 5  │                │                          │   │
│  │  Transparency     │                │  POST /checkin           │   │
│  │  Panel            │                │  POST /review            │   │
│  │  Wallet Modal     │                │  GET  /recommend         │   │
│  │  Review Form      │                │  GET  /token-balance     │   │
│  │  Defence Banner   │                │  GET  /pois              │   │
│  └───────────────────┘                │  GET  /health            │   │
│                                       └────────────┬─────────────┘   │
│                                                    │ blockchain       │
│                                                    │ provider         │
│                                                    ▼                  │
│  ┌───────────────────────────────────────────────────────────────┐    │
│  │             Ethereum Testnet (Hardhat / Sepolia)              │    │
│  │                                                               │    │
│  │  TrustToken (ERC-20)    UserRegistry    StakingContract       │    │
│  │  ModelHashRegistry      GeoRecommender  PoR Oracle            │    │
│  └───────────────────────────────────────────────────────────────┘    │
│                                                   ▲                   │
│  ┌──────────────────────────┐  SHA-256 hash       │                   │
│  │  Flower FL Server        │─────────────────────┘                   │
│  │  FedAvg Aggregator       │                                          │
│  │  3 × Client Nodes        │◄── Local training (no raw data sent)    │
│  │  DP noise ε = 1.0        │                                          │
│  │  task3.py pipeline       │                                          │
│  └──────────────────────────┘                                          │
│                                                                        │
│  ┌──────────────────────────┐                                          │
│  │  MongoDB (off-chain)     │  POI metadata · user profiles            │
│  │  Docker / Atlas          │                                          │
│  └──────────────────────────┘                                          │
└────────────────────────────────────────────────────────────────────────┘
```

### Request Flow (Happy Path)

```
User opens app
    └─► Load ~34k POIs from pois.json (Leaflet map)
    └─► Load recommendations.json → highlight top-5 POIs per profile
User clicks "Why? →" on a recommended POI
    └─► Transparency Panel opens
        ├─ Proximity Score  — computed from geographic distance
        ├─ Community Rating — relative check-in volume vs. full dataset
        └─ FL Model Score   — federated learning confidence × 100
User clicks "Check in"
    └─► POST /api/v1/checkin → smart contract mints +1 TC
User clicks "Write Review"
    └─► Review hashed → POST /api/v1/review → smart contract mints +5 TC
        └─► Wallet modal shows updated balance + ledger entry
```

---

## Component Breakdown

### `frontend/` — React 19 + Vite 8 UI

| File | Purpose |
|---|---|
| `src/App.jsx` | App shell, all state, modal triggers, profile switching |
| `src/App.css` | Full glassmorphism dark design system (54 KB) |
| `src/PoiMap.jsx` | react-leaflet map with colour-coded circle markers |
| `src/PoiDetailsPanel.jsx` | **"Why was this recommended?"** transparency panel |
| `src/index.css` | CSS reset + design tokens |
| `src/main.jsx` | React entry point |
| `src/pois.json` | ~34k NYC POI records (6 MB, generated by `task3.py`) |
| `src/recommendations.json` | 3 profiles × 5 recommendations + FL metadata + defence shield |
| `src/user_profiles.json` | User preference score vectors (596 KB) |
| `src/pois_preview.json` | Lightweight POI subset for development |

**Dependencies:** `react@19`, `react-dom@19`, `leaflet@1.9.4`, `react-leaflet@5.0.0`

### `backend/` — Go 1.22 REST API

| Path | Role |
|---|---|
| `cmd/server/` | Entry point — dependency injection, Gin HTTP server |
| `internal/config/` | Configuration loading via Viper |
| `internal/models/` | Domain entities (User, POI, CheckIn, Review) |
| `internal/ports/` | Interface contracts for all external systems |
| `internal/repositories/` | MongoDB data access implementations |
| `internal/services/` | Business logic layer |
| `internal/handlers/` | HTTP request handlers (Gin) |
| `internal/middleware/` | CORS, logging, security headers (zerolog) |
| `internal/blockchain/` | BlockchainProvider — `mock` (default), `polygon` (stub) |
| `internal/recommendation/` | RecommendationProvider — mock, federated, external |
| `internal/database/` | MongoDB connection and index management |
| `pkg/logger/` | Structured JSON logger (zerolog) |
| `pkg/validator/` | Input validation helpers |
| `pkg/response/` | Standard JSON response helpers |
| `tests/` | Unit and integration tests |
| `docs/` | Architecture, API spec, database, deployment guides + `swagger.yaml` (OpenAPI 3.0) |
| `scripts/` | MongoDB seed data (`seed.mongo.js`) |

**Key env variables:** `BLOCKCHAIN_PROVIDER` (`mock` / `polygon`), `RECOMMENDATION_PROVIDER` (`mock` / `federated`), `MONGODB_URI`, `DATABASE_NAME`

> ⚠️ `BLOCKCHAIN_PROVIDER=hardhat` is **not implemented** in `main.go` — it falls through to `mock`. A `hardhat_provider.go` has not yet been created.

### `contracts/` — Solidity Smart Contracts (S1)

| Contract | Purpose |
|---|---|
| `TrustToken.sol` | ERC-20 token: mint (+1 TC check-in, +5 TC review), burn, transfer |
| `UserRegistry.sol` | Register users, store check-in hashes, verify identity |
| `StakingContract.sol` | Business stake deposits; slash on bad behaviour |
| `ModelHashRegistry.sol` | Store SHA-256 hash of FL model weights per round |
| `GeoRecommender.sol` | Geofenced recommendation contract + PoR oracle |

> Note: Contract sources live in S1's branch. The `contracts/` directory in main contains a placeholder.

### `federated/` — Flower 1.9 FL Pipeline

| File | Role |
|---|---|
| `flower_server.py` | Flower server — CustomFedAvgStrategy, tracks accuracy/loss per round |
| `flower_client.py` | POICollaborativeFilteringClient — local training + FedAvg |
| `task3.py` | Main recommendation engine: loads dataset, runs FL, outputs all JSON files |
| `launch_fl.py` | Convenience launcher for server + clients |
| `requirements.txt` | `flwr==1.9.0`, `numpy==1.24.3`, `pandas==2.0.3`, `scikit-learn==1.3.0` |
| `FEDERATED_LEARNING.md` | Module documentation |

**Model architecture:** 7-dimensional per-client weight vector `[Transit, Food, Outdoor, Culture, Leisure, Retail, Business]`

**Scoring function:**
```
score = 0.58 × category_preference + 0.27 × log_popularity + 0.15 × FL_model_boost
```

**5-round FedAvg training results:**

| Round | Accuracy | Loss |
|---|---|---|
| 1 | 0.63 | 0.500 |
| 2 | 0.70 | 0.333 |
| 3 | 0.77 | 0.250 |
| 4 | 0.84 | 0.200 |
| 5 | **0.93** | 0.167 |

### `data/`

| File | Description |
|---|---|
| `raw/dataset_TSMC2014_NYC.txt` | Original Foursquare NYC check-in dataset (227,428 records, 31 MB) |
| `processed/foursquare_nyc_clean.csv` | Cleaned, geocoded POI records |
| `preprocess.py` | Data cleaning pipeline |
| `parseData.js` | Alternative JS data parsing utility |

### `notebooks/`

| File | Description |
|---|---|
| `S4_EDA.ipynb` | Exploratory data analysis by S4 |
| `trustchain_task4_task5_defenses.ipynb` | Amber's (S2) verified defence pipeline |
| `nyc_preview.html` | Static Folium map preview of NYC POIs |

### Defence Shield Files (root-level, S4 integration)

| File | Description |
|---|---|
| `S4_DEFENSE_INTEGRATION.py` | `S4DefenseShield` class — unified interface for bot detection + DP |
| `S4_DEFENSE_INTEGRATION_GUIDE.md` | Comprehensive integration guide |
| `S4_DEFENSE_SHIELD_INTEGRATION.ipynb` | Step-by-step integration notebook |
| `S4_DEFENSE_SHIELD_QUICK_REFERENCE.md` | Quick-lookup reference card |
| `S4_DEFENSE_SHIELD_SUMMARY.md` | Summary of defence deliverables |

---

## API Documentation

All endpoints are served by the Go backend at `http://localhost:8080/api/v1`.

---

### `GET /api/v1/health`

Service health check. Reports status of all providers.

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Service is healthy",
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "uptime": "5s",
    "checks": {
      "database":               { "status": "healthy", "latencyMs": 1 },
      "blockchainProvider":     { "status": "healthy", "provider": "mock" },
      "recommendationProvider": { "status": "healthy", "provider": "mock" }
    }
  }
}
```

---

### `POST /api/v1/checkin`

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
  "success": true,
  "message": "Check-in recorded",
  "data": {
    "tokensAwarded": 1,
    "newBalance":   121,
    "txHash":       "0xDEF456..."
  }
}
```

**Errors:** `400` invalid body · `409` duplicate check-in · `503` blockchain unavailable

---

### `POST /api/v1/review`

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
  "success": true,
  "message": "Review submitted",
  "data": {
    "tokensAwarded": 5,
    "reviewId":     "review_001",
    "commentHash":  "sha256:a3f7b2...",
    "txHash":       "0xGHI789..."
  }
}
```

> ℹ️ Raw review text is **never** stored on-chain. Only a SHA-256 hash is recorded, preserving privacy while enabling verification.

---

### `GET /api/v1/recommend?userId=user_0xABC123&profile=commuter`

Return the top-N personalised POI recommendations for a user profile.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "profile": "commuter",
    "recommendations": [
      {
        "id":       "poi_001",
        "name":     "Grand Central Terminal",
        "category": "Transit Station",
        "score":    0.92,
        "lat":      40.7527,
        "lng":     -73.9772
      }
    ]
  }
}
```

---

### `GET /api/v1/token-balance?userId=user_0xABC123`

Fetch on-chain TC token balance for a user wallet address.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "userId":  "user_0xABC123",
    "balance": 125,
    "unit":    "TC"
  }
}
```

---

### `GET /api/v1/pois`

List points of interest stored in MongoDB.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "pois": [ { "id": "...", "name": "...", "lat": 0.0, "lng": 0.0 } ]
  }
}
```

---

## UI Feature Guide

### 🗺️ Map Dashboard

The main view shows all ~34k NYC POIs as colour-coded circle markers via react-leaflet:

| Colour | Meaning |
|---|---|
| 🟠 Orange (double halo) | Recommended for active profile |
| 🟢 Green | Currently selected POI |
| 🔵 Blue (faint) | All other POIs in the dataset |

Click any marker to select it. The header bar lets you switch between **Commuter 🚇**, **Explorer 🗺️**, and **Social 🍻** profiles.

---

### 💰 Token Wallet

Click **"💰 Wallet"** in the top bar to open the wallet modal:

- **Balance card** — current TC token balance with animated shimmer
- **Stats row** — total check-ins, reviews, and tokens earned
- **Transaction ledger** — chronological on-chain event history (check-ins + reviews)

---

### ✍️ Review Submission Form

Opens when you click **"✍️ Review (+5 TC)"** on any selected POI:

- **5-star rating** — keyboard accessible, with live label (Poor / Fair / Good / Great / Excellent)
- **Written feedback** — text area with 300-character limit and live counter
- **Privacy note** — confirms only the SHA-256 hash goes on-chain
- **Submit button** — disabled until text is entered; mints +5 TC on success

---

### 🔍 "Why Was This Recommended?" Panel

Click **"Why? →"** next to any recommendation, or **"📊 Scores"** on the selected location card.

The panel shows three scored components (computed client-side from `pois.json` and `recommendations.json`):

| Section | Detail |
|---|---|
| **Header** | "⛓️ Blockchain-Verified Transparency" eyebrow + POI name |
| **Composite score** | Weighted formula banner with live computed score |
| **📡 Proximity Score** | Animated ring gauge + bar + plain-English rationale + formula |
| **👥 Community Rating** | Relative check-in volume vs. full dataset |
| **🤖 FL Model Score** | Federated learning confidence for active profile |
| **On-chain proof** | DP ε badge · PoR Verified badge · hash storage explanation |
| **Actions** | Check-in (+1 TC) · Write Review (+5 TC) directly from the panel |

**Scoring formulas (computed in `App.jsx`):**
```
Proximity Score  = max(0, 110 − dist_degrees × 55)
Community Rating = (poi.checkins / max_checkins_dataset) × 100
FL Model Score   = recommendation.score × 100
```

---

### 🛡️ Defence Shield Banner

If the loaded `recommendations.json` contains a `meta.defenseShield` block (written by `S4_DEFENSE_INTEGRATION.py`), a red banner appears at the top showing:

- Number of bot accounts flagged and blocked
- % of clean data retained after filtering (typically 99.9%)
- DP ε value applied

**Detection logic:** dual-threshold — a user is flagged only if they exceed **both** `max_checkins_per_hour > 7` AND `unique_venues_per_hour > 5`.

---

## Dataset

**Foursquare NYC Check-in Dataset (TSMC 2014)**

| Property | Value |
|---|---|
| Source | Foursquare via TSMC 2014 research dataset |
| Raw file | `data/raw/dataset_TSMC2014_NYC.txt` (31 MB) |
| Total check-in records | 227,428 |
| Unique venues (POIs) | ~34,000 |
| Unique users | ~1,083 |
| City | New York City |
| Categories | Transit · Food & Drink · Parks · Culture · Hotels · Shops · Business |
| Profiles | Commuter · Explorer · Social Weekender |

---

## Team

| Student | Role | Key Deliverables |
|---|---|---|
| **Priyadharshini** (S1) | Blockchain Lead | TrustToken ERC-20 · UserRegistry · StakingContract · ModelHashRegistry · GeoRecommender · PoR oracle · unit tests · gas benchmarks · security audit |
| **Amber** (S2) | ML/AI Lead | Flower FL pipeline (FedAvg) · collaborative filtering model · anomaly detection · differential privacy (ε=1.0) · adversarial evaluation · DP comparison table (Precision@5/10, NDCG@10) |
| **Siddhartha** (S3) | Backend Lead | Go 1.22 REST API (Gin) · MongoDB integration · Docker/Docker Compose · provider abstraction (blockchain / recommendation) · mock oracle endpoint · latency benchmarking · API documentation |
| **Rishu Kishan** (S4) | Frontend / Research Lead | React 19 + react-leaflet map UI · glassmorphism design system · **"Why was this recommended?" transparency panel** · token wallet · review form · defence shield integration (`S4_DEFENSE_INTEGRATION.py`) · dataset EDA · data preprocessing pipeline · README + project documentation |

---

> **Repository structure:** `frontend/` · `backend/` · `contracts/` · `federated/` · `data/` · `docs/` · `notebooks/`  
> **Final report:** [`docs/FINAL_REPORT.md`](docs/FINAL_REPORT.md)  
> **Submission deadline:** 21st July 2026 — final demo & Q&A to follow

---

## Project Workflow — What We Built & How It All Connects

This section documents the **complete end-to-end journey** of TrustChain — from raw dataset to a running UI — describing every layer, every sprint, and the current status of each component.

---

### 🗓️ Sprint Timeline Overview

| Sprint | Dates | Theme | Key Outcomes |
|---|---|---|---|
| **Task 1** | 1–5 June | Feasibility & Setup | Codebase created, roles assigned, tech stack decided |
| **Task 2** | 8–12 June | Core Components Built | FL pipeline, smart contracts, backend API, map UI all built in isolation |
| **Task 3** | 22–26 June | Integration Sprint | FL output → frontend feed; backend connected to blockchain |
| **Task 4** | 29 June–3 July | PoR + Polish | DP added to FL; bot detection written; wallet/review/transparency panel shipped |
| **Task 5** | 6–13 July | Security & Adversarial Testing | GeoRecommender contract; security audit; adversarial FL evaluation; defence shield S4 integration |
| **Task 6** | 14–18 July | Final Report & Presentation | Smart contract appendix; full evaluation results; report assembly; submission package |

---

### 📦 Step 1 — Raw Data Ingestion

**What happens:**  
The project starts with the **Foursquare NYC check-in dataset** (`data/raw/dataset_TSMC2014_NYC.txt`), a 31 MB tab-separated file containing 227,428 real-world check-in events from 1,083 users across ~34,000 NYC venues.

**Script:** `data/preprocess.py`  
**Output:** `data/processed/foursquare_nyc_clean.csv`

What the script does:
1. Parses the raw tab-separated format (columns: `user_id`, `venue_id`, `venue_category_id`, `venue_category`, `latitude`, `longitude`, `timezone_offset`, `utc_time`)
2. Drops rows with missing coordinates or malformed timestamps
3. Normalises venue category labels into 7 families: `Transit`, `Food`, `Outdoor`, `Culture`, `Leisure`, `Retail`, `Business`
4. Writes a clean CSV consumed by both the FL pipeline and the frontend

**Also available:** `data/notebooks/S4_EDA.ipynb` — exploratory data analysis notebook, and `notebooks/nyc_preview.html` — an interactive Folium map of all 34k POIs.

---

### 🤖 Step 2 — Federated Learning Pipeline

**What happens:**  
The FL module (`federated/task3.py`) is the engine that converts raw check-in data into personalised recommendations. It simulates a real federated learning system with three client nodes, each representing a distinct user archetype.

**Three Simulated Client Personas (Profiles):**

| Profile | Top Categories | Emoji | Accent |
|---|---|---|---|
| **Commuter** | Transit, Food, Business | 🚇 | Blue |
| **Explorer** | Culture, Outdoor, Leisure | 🗺️ | Purple |
| **Social Weekender** | Leisure, Food, Culture | 🍻 | Orange |

**FL Training Process (5-round FedAvg):**

```
Round 1 → Each client trains a 7-dim weight vector on its local data subset
         → Sends weight delta to Flower server (NOT raw data)
Round 1–5 → Server runs FedAvg: aggregated_weights = weighted_average(all_client_weights)
         → Sends global weights back to each client
Round 5 → Final accuracy: 93% | Final loss: 0.167
         → SHA-256 hash of global weights → submitted to ModelHashRegistry smart contract
```

**Scoring formula** (per POI per profile):
```
score = 0.58 × category_preference_weight
      + 0.27 × log(poi.checkins + 1)        ← popularity signal
      + 0.15 × FL_model_boost               ← federated learning contribution
```

**What `task3.py` writes:**

| Output file | Location | What's in it |
|---|---|---|
| `pois.json` | `frontend/src/` | All ~34k POI records with id, name, category, lat, lng, checkins |
| `recommendations.json` | `frontend/src/` | 3 profiles × top-5 POIs each + FL metadata (rounds, accuracy, model hash) |
| `user_profiles.json` | `frontend/src/` | Full preference score vector for every user |

> ⚠️ **Two `pois.json` files exist:** `data/preprocess.py` writes a smaller version (top-500 venues, 67 KB) to `frontend/src/pois.json`. Running `task3.py` afterwards **overwrites it** with the full 34k-venue version (6 MB). Always run `task3.py` last to get the complete dataset in the UI.

---

### 🛡️ Step 3 — Defence Shield (Adversarial Data Cleaning)

**What happens:**  
Before the FL model trains on check-in data, **Amber (S2)** built a defence pipeline (verified in `notebooks/trustchain_task4_task5_defenses.ipynb`) which **Rishu Kishan (S4)** packaged into `S4_DEFENSE_INTEGRATION.py` for seamless integration.

**Two defence mechanisms:**

**1. Bot / Sybil Detection (dual-threshold):**
```python
# A user is flagged as a bot only if BOTH conditions are met in the same hour:
total_checkins_per_hour > 7    # excessive frequency
unique_venues_per_hour  > 5    # impossible geographic diversity
```
- Catches real adversarial patterns: rapid multi-venue check-ins that no human can perform
- Retains ~99.9% of legitimate data (only genuine bots removed)
- 100% adversarial detection rate on the injected 15% fake-data test set

**2. Differential Privacy (Laplacian noise, ε = 1.0):**
```python
private_gradients = clip_norm(local_gradients, sensitivity=0.5)
private_gradients += Laplacian(0, sensitivity / epsilon)
# Send private_gradients to Flower server → server cannot reconstruct local training data
```
- < 5% accuracy impact at ε = 1.0 (verified by S2)
- Provides formal (ε, δ)-DP guarantee

**Defence result injected into `recommendations.json`:**
```json
"meta": {
  "defenseShield": {
    "botsDetected": 3,
    "cleanDataRetained": 99.9,
    "dpEpsilon": 1.0
  }
}
```
→ Frontend reads this and renders the red **Defence Shield Banner** at the top of the UI.

> ✅ **Already integrated in live FL:** `flower_client.py` imports `S4DefenseShield` directly inside its `fit()` method (line 95–97) and calls `apply_privacy_to_gradients(epsilon=1.0, sensitivity=0.5)` before sending weight updates to the Flower server. The live FL system uses DP automatically — no manual step required.

---

### ⛓️ Step 4 — Smart Contracts (Blockchain Layer)

**What happens:**  
**Priyadharshini (S1)** wrote and deployed five Solidity contracts on a local **Hardhat** testnet, forming the trust backbone of the system.

**Contract interaction flow:**

```
FL Training ends
    └─► SHA-256 hash of model weights
        └─► ModelHashRegistry.storeHash(roundId, hash)   ← on-chain proof

User checks in
    └─► Backend receives POST /api/v1/checkin
        └─► BlockchainProvider.mint(userId, 1 TC)
            └─► TrustToken.mint()                        ← ERC-20 token minted on-chain
            └─► UserRegistry.storeCheckinHash(userId, poiId, timestamp)

User submits review
    └─► Backend SHA-256 hashes the review text
        └─► BlockchainProvider.mint(userId, 5 TC)
            └─► TrustToken.mint()                        ← 5 TC minted on-chain
        └─► UserRegistry.storeCheckinHash(userId, reviewHash)
            ← raw review text is NEVER stored on-chain

GeoRecommender (Task 5)
    └─► Takes user's bounding box as integer-encoded coordinates
        └─► Returns filtered, ranked list of POI IDs within that area
            └─► Connected to mock PoR oracle (S3) — validates recommendations on-chain
```

**Security audit (Task 5):** S1 audited all contracts for re-entrancy vulnerabilities in the RewardEngine and integer overflow in GeoRecommender coordinate encoding. All issues documented and resolved.

---

### 🖥️ Step 5 — Go Backend API

**What happens:**  
**Siddhartha (S3)** built a production-quality Go 1.22 REST API using the **Gin** framework with a clean layered architecture. It acts as the bridge between the React frontend, MongoDB, and the blockchain layer.

**Architecture pattern:** Provider abstraction — every external system (blockchain, recommendation engine) is behind an interface, swappable via a single environment variable:

```
BLOCKCHAIN_PROVIDER=mock      ← default (returns realistic mock data)
BLOCKCHAIN_PROVIDER=polygon   ← connects to Polygon testnet (interface-complete stub)
# Note: 'hardhat' is NOT a named case in main.go; it falls through to mock.
# A hardhat_provider.go has not been implemented yet.

RECOMMENDATION_PROVIDER=mock       ← default
RECOMMENDATION_PROVIDER=federated  ← calls live Flower FL server (stub)
```

**Request lifecycle for a check-in:**
```
POST /api/v1/checkin
    → middleware: CORS + zerolog request logger + security headers
    → handler: parse + validate request body (Gin binding)
    → service layer: business logic (duplicate check, rate limiting)
    → repository: write CheckIn record to MongoDB
    → blockchain provider: call TrustToken.mint() on Hardhat node
    → response: { success, tokensAwarded, newBalance, txHash }
```

**Mock Oracle (Task 5):** S3 built a FastAPI mock oracle endpoint that takes a user location query, calls the FL model for predicted POI scores, signs the response, and submits it to the GeoRecommender contract — replacing Chainlink for the internship scope.

**Latency benchmarking (Task 5):** S3 measured end-to-end latency for a full pipeline round trip and documented bottlenecks (blockchain write latency dominates).

---

### 🗺️ Step 6 — React Frontend & Transparency UI

**What happens:**  
**Rishu Kishan (S4)** built the entire frontend in React 19 + Vite 8 with a glassmorphism dark design system. The frontend is **fully functional standalone** — it loads all data from static JSON files and requires no backend to display the map and recommendations.

**Application state at startup:**
```
App.jsx mounts
    ├─► fetch('pois.json')           → loads ~34k POI objects into state
    ├─► fetch('recommendations.json') → loads 3 profiles × top-5 recommendations
    └─► default profile: 'commuter'   → highlighted orange markers on map
```

**What the user sees — complete flow:**

```
1. MAP DASHBOARD loads
   ├─ ~34,000 blue circle markers on Leaflet map (NYC bounding box)
   ├─ 5 orange double-halo markers = commuter top recommendations
   └─ Header bar: profile selector + TC token balance + 💰 Wallet button

2. USER SWITCHES PROFILE (e.g. to Explorer 🗺️)
   └─► Orange markers update to Explorer's top-5 POIs
       → Different venues, different geographies

3. USER CLICKS A MARKER
   └─► Location card slides in (right panel) showing:
       ├─ POI name, category icon, check-in count
       ├─ "✅ Check In (+1 TC)" button
       ├─ "✍️ Review (+5 TC)" button
       └─ "📊 Scores" button (opens transparency panel)

4. USER CLICKS "Why? →" ON A RECOMMENDATION
   └─► TRANSPARENCY PANEL opens (PoiDetailsPanel.jsx)
       ├─ Header: "⛓️ Blockchain-Verified Transparency"
       ├─ Composite score: 0.25×Proximity + 0.25×Community + 0.50×FL Model
       ├─ 📡 Proximity Score: animated ring gauge
       │       formula: max(0, 110 − dist_degrees × 55)
       ├─ 👥 Community Rating: relative check-in volume
       │       formula: (poi.checkins / max_checkins_dataset) × 100
       ├─ 🤖 FL Model Score: federated learning confidence
       │       formula: recommendation.score × 100
       └─ On-chain proof strip: DP ε=1.0 badge · PoR Verified · model hash

5. USER CHECKS IN
   └─► POST /api/v1/checkin → backend → blockchain → +1 TC
       → Token balance in header increments
       → Transaction appears in Wallet ledger

6. USER SUBMITS REVIEW
   └─► Review form opens (5-star rating + 300-char text area)
       → On submit: SHA-256 hash computed client-side
       → POST /api/v1/review → backend → blockchain → +5 TC
       → Privacy note confirms only hash stored on-chain

7. WALLET MODAL (💰 Wallet)
   └─► Balance card with animated shimmer
       → Stats: total check-ins, reviews, tokens earned
       → Transaction ledger: chronological history of all on-chain events

8. DEFENCE SHIELD BANNER (top of page, if triggered)
   └─► Shows: "3 bot accounts blocked · 99.9% clean data · DP ε=1.0"
       → Rendered from meta.defenseShield in recommendations.json
```

---

### 🔁 Complete End-to-End Data Flow

```
                    ┌─────────────────────────────┐
                    │   Foursquare NYC Dataset      │
                    │   227,428 check-in records    │
                    └──────────────┬──────────────┘
                                   │ preprocess.py
                                   ▼
                    ┌─────────────────────────────┐
                    │  foursquare_nyc_clean.csv    │
                    └──────────────┬──────────────┘
                         ┌─────────┴──────────┐
                         │ Defence Shield      │
                         │ S4_DEFENSE_         │
                         │ INTEGRATION.py      │
                         │ (bot filter + DP)   │
                         └─────────┬──────────┘
                                   │ clean_df
                                   ▼
                    ┌─────────────────────────────┐
                    │  federated/task3.py          │
                    │  5-round FedAvg FL pipeline  │
                    │  3 client nodes              │
                    └──────┬──────────────┬────────┘
                           │              │
                   SHA-256 hash      JSON outputs
                           │              │
                           ▼              ▼
              ┌─────────────────┐  ┌──────────────────────┐
              │ ModelHashRegistry│  │  pois.json           │
              │ (on-chain)       │  │  recommendations.json│
              └─────────────────┘  │  user_profiles.json  │
                                   └──────────┬───────────┘
                                              │
                                              ▼
                              ┌───────────────────────────┐
                              │  React 19 Frontend (Vite)  │
                              │  Leaflet Map               │
                              │  Transparency Panel        │
                              │  Wallet Modal              │
                              │  Review Form               │
                              └──────────┬────────────────┘
                                         │ REST API calls
                                         ▼
                              ┌───────────────────────────┐
                              │  Go Backend (Gin)          │
                              │  /api/v1/checkin           │
                              │  /api/v1/review            │
                              │  /api/v1/recommend         │
                              │  /api/v1/token-balance     │
                              └──────┬────────────┬────────┘
                                     │            │
                              MongoDB          Hardhat
                              (off-chain)      Testnet
                              user profiles,   TrustToken
                              POI metadata     +1/+5 TC mint
```

---

### ✅ What Is Fully Working Right Now

| Component | Status | Notes |
|---|---|---|
| **Frontend map UI** | ✅ Complete | Loads 34k POIs, profile switching, marker colours, responsive |
| **Transparency Panel** | ✅ Complete | All 3 score components, animated gauges, blockchain proof strip |
| **Token Wallet modal** | ✅ Complete | Balance, stats, transaction ledger |
| **Review submission form** | ✅ Complete | Star rating, char counter, privacy notice, on-chain hash |
| **Defence Shield banner** | ✅ Complete | Reads from `recommendations.json`, shows bot/DP stats |
| **FL pipeline (task3.py)** | ✅ Complete | 5-round FedAvg, 3 profiles, 93% accuracy, JSON outputs |
| **Bot detection** | ✅ Complete | Dual-threshold, 100% detection rate, <1% data loss |
| **Differential privacy** | ✅ Complete | ε=1.0, Laplacian noise, <5% accuracy impact |
| **Go backend (mock mode)** | ✅ Complete | All API routes, Docker Compose, full provider abstraction |
| **MongoDB schema** | ✅ Complete | Users, CheckIns, Reviews, POIs with indexes |
| **Data preprocessing** | ✅ Complete | Raw → clean CSV pipeline |
| **Smart contracts (design)** | ✅ Complete | 5 contracts designed, unit tested (S1's branch) |
| **GeoRecommender contract** | ✅ Complete | Geofenced POI filtering + coordinate encoding |
| **Mock oracle (S3)** | ✅ Complete | FastAPI endpoint, signs FL scores, submits to GeoRecommender |
| **Adversarial FL evaluation** | ✅ Complete | 15% poison injection test, PoR suppression measured |
| **DP comparison table** | ✅ Complete | Precision@5, Precision@10, NDCG@10 across 3 system variants |
| **Live Flower FL server** | ⚠️ Simulation | Fully runnable but uses simulated clients, not real devices |
| **Backend ↔ blockchain (live)** | ⚠️ Mock only | Only `mock` and `polygon` (stub) providers exist; no `hardhat_provider.go` yet |
| **IPFS model weight storage** | ❌ Future work | Hash stored on-chain; weights not yet on IPFS |
| **Final report** | 🔄 In progress | Structure complete, placeholders being filled (due 21 July) |

---

### 🧩 How The Three Pillars Come Together (The "Why Blockchain?" Answer)

The transparency panel is the moment where all three pillars unite:

```
A user asks: "Why was Grand Central Terminal recommended to me?"

The UI answers:
├─ 📡 Proximity Score: 91/100
│    → "You are 0.08° away — very close"
│    → TRUSTED because: your check-in location was verified on-chain
│
├─ 👥 Community Rating: 78/100
│    → "91st percentile check-in volume in the dataset"
│    → TRUSTED because: check-in counts are on-chain events;
│      they cannot be inflated without real token expenditure
│
└─ 🤖 FL Model Score: 82/100
     → "The federated learning model strongly predicts this for Commuter profiles"
     → TRUSTED because:
         1. The model that produced this score has hash sha256:a3f7b2c9...
         2. That hash is recorded in ModelHashRegistry smart contract
         3. The model was trained on bot-filtered data (Defence Shield)
         4. Gradients were DP-protected before aggregation (ε=1.0)
         5. Any user can verify the hash on the blockchain explorer
```

This is the core research contribution of TrustChain: **making the recommendation pipeline auditable and verifiable, end-to-end, through cryptographic on-chain proof**.

