# TrustChain Frontend

React 19 + Vite 8 interactive map interface for the TrustChain privacy-preserving location recommendation system.

---

## What This App Does

The frontend is the **user-facing layer** of TrustChain. It provides:

- 🗺️ **Interactive Leaflet map** — 34,000+ NYC Points of Interest rendered with live check-in heatmap
- 🎯 **Federated Learning recommendations** — personalised POI suggestions for 3 user profiles (Commuter, Foodie, Tourist)
- 🔍 **Transparency Panel** — explains _why_ each POI was recommended with 3 live scores:
  - 📡 Proximity Score (distance-based)
  - 👥 Community Rating (normalised check-in volume)
  - 🤖 Federated Model Score (FL model output, or derived from check-ins if not yet scored)
- ✅ **Check-in flow** — POST to Go backend → Hardhat blockchain tx → token balance update
- ✍️ **Review submission** — POST to Go backend → stored in MongoDB
- 🪙 **TRUST token balance** — polls `GET /api/v1/token-balance` every 10s; shows live on-chain value
- 🟢 **Live / Offline indicator** — green dot when Go backend is reachable, amber when running on static data
- 🛡️ **Defence Shield banner** — shows bot-filter statistics from the FL server run

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19.2 + Vite 8 |
| Map | Leaflet 1.9.4 + react-leaflet 5.0 |
| Styling | Vanilla CSS (custom design system) |
| State | React hooks (`useState`, `useMemo`, `useEffect`) |
| Data | Static `pois.json` (34k POIs) + `recommendations.json` (FL output) |
| API | `/api/v1/*` proxied to Go backend via Vite dev server |

---

## Quick Start

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### Prerequisites
- Node.js 18+
- Go backend running on `localhost:8080` (optional — app falls back to static data)
- Hardhat node running on `localhost:8545` (optional — for live token balance)

---

## Vite Proxy

All `/api/v1/*` requests from the browser are transparently forwarded to the Go backend:

```js
// vite.config.js
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
    },
  },
},
```

This means you never hardcode `http://localhost:8080` in React code — just call `/api/v1/health`.

---

## Data Sources

| File | Source | Purpose |
|---|---|---|
| `src/pois.json` | Gowalla NYC dataset (processed) | All 34k POI locations, names, categories, check-in counts |
| `src/recommendations.json` | `federated/flower_server.py` output | FL recommendations + FL model scores + defence shield stats |

When the Go backend is online, POI data is fetched from `GET /api/v1/pois?limit=500` instead of the static file. `recommendations.json` always comes from the static file (written by the FL server).

---

## Key Source Files

```
frontend/
├── src/
│   ├── App.jsx              ← main component: state, API calls, layout
│   ├── App.css              ← full design system (dark theme, glassmorphism)
│   ├── ExplanationPanel.jsx ← transparency panel component
│   ├── pois.json            ← 34k POI dataset (static)
│   └── recommendations.json ← FL output (updated by flower_server.py)
├── public/
│   ├── pois.json            ← served at /pois.json
│   └── recommendations.json ← served at /recommendations.json
├── vite.config.js           ← proxy config
├── FRONTEND_GUIDE.md        ← full UI component documentation
└── readme.md                ← this file
```

---

## API Integration

The frontend calls these backend endpoints:

| Endpoint | When | Fallback |
|---|---|---|
| `GET /api/v1/pois?limit=500` | On load | `src/pois.json` |
| `GET /api/v1/token-balance?wallet=0x...` | Every 10s | Keep last value |
| `POST /api/v1/checkin` | On check-in button | Optimistic UI update |
| `POST /api/v1/review` | On review submit | Local history only |

---

## Building for Production

```bash
npm run build
# Output: dist/
```

The built `dist/` folder can be served by any static host or Firebase Hosting.

---

## Design System

The UI uses a custom dark-mode design system defined in `App.css`:
- **Colour palette**: `--color-primary` (#6366f1 indigo), surface layers, muted text
- **Glassmorphism**: `backdrop-filter: blur()` on cards and modals
- **Micro-animations**: check-in pulse, token counter, defence shield badge
- **Typography**: Inter (Google Fonts)
