# TrustChain — Full Integration Walkthrough

## What Was Done

All 4 layers are now wired together and live data flows end-to-end.

---

## Files Created / Modified

| File | Change |
|---|---|
| `contracts/trustchain-task3-s1/deployments/localhost.json` | **NEW** — Contract addresses + ABIs written by deploy.js |
| `backend/internal/blockchain/hardhat_provider.go` | **NEW** — Real blockchain provider using raw JSON-RPC |
| `backend/internal/config/config.go` | Added `HardhatRPCURL` + `HardhatDeploymentPath` config fields |
| `backend/cmd/server/main.go` | Added `"hardhat"` case to provider switch |
| `backend/internal/handlers/token_handler.go` | Accepts `?wallet=0x...` (direct Ethereum address) |
| `backend/.env.example` | **NEW** — All env vars documented including Hardhat ones |
| `backend/.env` | **NEW** — Copied from .env.example, `BLOCKCHAIN_PROVIDER=hardhat` |
| `frontend/vite.config.js` | Added `/api` proxy → `http://localhost:8080` |
| `frontend/src/App.jsx` | Live API calls, token balance polling, check-in/review POSTs |

---

## How to Run Everything

From the repository root:
```bash
cd /Users/rishukishan/Documents/9th/internship/TrustChain
```

### Terminal 1 — Prepare datasets and recommendation JSONs
```bash
cd data
python3 preprocess.py

cd ../federated
python3 task3.py
```

This regenerates the frontend data used by the Vite app:
- `frontend/src/pois.json`
- `frontend/src/recommendations.json`
- `frontend/src/user_profiles.json`

### Terminal 2 — Hardhat node (keep running)
```bash
cd ../contracts/trustchain-task3-s1
npx hardhat node --port 8545
```

### Terminal 3 — Deploy contracts (run once per Hardhat restart)
```bash
cd ../contracts/trustchain-task3-s1
npx hardhat run scripts/deploy.js --network localhost
```

### Terminal 4 — Go backend
```bash
cd ../backend
cp .env.example .env
go run ./cmd/server
```

If you want to force the backend to use Hardhat explicitly:
```bash
BLOCKCHAIN_PROVIDER=hardhat go run ./cmd/server
```

### Terminal 5 — Frontend
```bash
cd ../frontend
npm install
npm run dev
```

Open:
```text
http://localhost:5173
```

### Verify backend health
```bash
curl http://localhost:8080/api/v1/health
```

---

## Verified Results

| Test | Result |
|---|---|
| `GET /api/v1/health` | `"provider": "hardhat"` ✅ |
| `GET /api/v1/token-balance?wallet=0xf39...` | `"balance": 0, "symbol": "TRUST"` — real on-chain call ✅ |
| `POST /api/v1/checkin` | Records in MongoDB + submits `checkIn(bytes32)` tx to Hardhat ✅ |
| `POST /api/v1/review` | Records in MongoDB ✅ |
| Frontend topbar | Green **Live** dot appears when backend is online ✅ |
| Frontend offline fallback | Falls back to static `pois.json` / `recommendations.json` gracefully ✅ |

---

## Integration Architecture (Now Live)

```
Frontend (React + Vite)
    │
    ├── /api/v1/token-balance  →  Vite proxy  →  Go backend  →  HardhatProvider
    │                                                              └── eth_call → TrustToken.balanceOf()
    │
    ├── POST /api/v1/checkin   →  Vite proxy  →  Go backend  →  MongoDB (record)
    │                                                         →  HardhatProvider
    │                                                              └── eth_sendTransaction → UserRegistry.checkIn()
    │
    ├── POST /api/v1/review    →  Vite proxy  →  Go backend  →  MongoDB (record)
    │
    ├── /pois.json             →  static (34k NYC POIs — served by Vite)
    └── /recommendations.json  →  static (written by flower_server.py)

Hardhat node (localhost:8545)
    └── Contracts: TrustToken · UserRegistry · StakingContract
        └── addresses + ABIs in deployments/localhost.json
```

---

## Switching Back to Mock Mode

```bash
BLOCKCHAIN_PROVIDER=mock go run ./cmd/server
```

No code changes needed. The mock provider returns fake tx hashes for demos without a running Hardhat node.
