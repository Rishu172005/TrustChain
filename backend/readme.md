# TrustChain Backend

A production-quality Go REST API for TrustChain — a decentralised location recommendation platform combining blockchain-anchored trust, federated learning, and differential privacy.

**Status: Fully integrated with Hardhat blockchain (live token minting on check-in)**

---

## Quick Start

### With Hardhat (full integration)
```bash
# 1. Start Hardhat node (in contracts/trustchain-task3-s1)
npx hardhat node --port 8545

# 2. Deploy contracts
npx hardhat run scripts/deploy.js --network localhost

# 3. Start backend
cd backend
cp .env.example .env
BLOCKCHAIN_PROVIDER=hardhat go run ./cmd/server
```

### Mock mode (no blockchain required)
```bash
cd backend
cp .env.example .env
go run ./cmd/server     # defaults to BLOCKCHAIN_PROVIDER=mock
```

API available at `http://localhost:8080/api/v1`

---

## Health Check

```bash
curl http://localhost:8080/api/v1/health
```
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "checks": {
      "blockchainProvider": { "status": "healthy", "provider": "hardhat" },
      "database": { "status": "healthy", "latencyMs": 0 },
      "recommendationProvider": { "status": "healthy", "provider": "mock" }
    }
  }
}
```

---

## Technology Stack

| Component | Technology |
|---|---|
| Language | Go 1.22 |
| HTTP Framework | Gin 1.10 |
| Database | MongoDB 7 (Atlas / Docker) |
| Logging | zerolog (structured JSON) |
| Configuration | Viper |
| Blockchain (live) | Hardhat JSON-RPC — raw `eth_call` / `eth_sendTransaction` |
| Blockchain (stub) | PolygonProvider (interface-complete, returns stubs) |
| Containerisation | Docker + Docker Compose |

---

## Project Structure

```
cmd/server/              Entrypoint — dependency injection, provider selection
internal/config/         Viper config loading
internal/models/         Domain entities (CheckIn, Review, POI, User)
internal/ports/          Interface contracts for all external systems
internal/repositories/   MongoDB data access (POI, CheckIn, Review)
internal/services/       Business logic (CheckIn, Review, POI, Health)
internal/handlers/       HTTP handlers (Gin) — one per endpoint
internal/middleware/     CORS, request logging, security headers
internal/blockchain/     BlockchainProvider implementations:
│                          hardhat_provider.go  ← live (JSON-RPC, no SDK)
│                          mock_provider.go     ← fake tx hashes (default)
│                          polygon_provider.go  ← stub for future mainnet
internal/recommendation/ RecommendationProvider implementations
internal/database/       MongoDB connection + index management
pkg/logger/              Structured logger init
pkg/validator/           Input validation (ObjectID, coordinates, rating)
pkg/response/            Standard JSON response helpers
docs/                    Architecture, API spec, DB design, deployment guide
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | HTTP server port |
| `MONGODB_URI` | `mongodb://localhost:27017` | MongoDB connection string |
| `DATABASE_NAME` | `trustchain` | MongoDB database name |
| `LOG_LEVEL` | `info` | debug / info / warn / error |
| `BLOCKCHAIN_PROVIDER` | `mock` | `mock` \| `polygon` \| `hardhat` |
| `RECOMMENDATION_PROVIDER` | `mock` | `mock` \| `federated` |
| `HARDHAT_RPC_URL` | `http://127.0.0.1:8545` | Hardhat node RPC endpoint |
| `HARDHAT_DEPLOYMENT_PATH` | `../contracts/trustchain-task3-s1/deployments/localhost.json` | Path to deployment addresses |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Full health check (DB + blockchain + reco provider) |
| `POST` | `/api/v1/checkin` | Record check-in; fires on-chain tx + mints TRUST tokens |
| `POST` | `/api/v1/review` | Submit review; persists in MongoDB |
| `GET` | `/api/v1/recommend` | Get personalised POI recommendations |
| `GET` | `/api/v1/token-balance` | Read on-chain TRUST balance (`?wallet=0x...`) |
| `GET` | `/api/v1/pois` | List POIs from MongoDB (`?limit=N`) |

All responses:
```json
{ "success": true,  "message": "...", "data": {} }
{ "success": false, "message": "...", "error": "..." }
```

---

## Blockchain Integration (HardhatProvider)

`internal/blockchain/hardhat_provider.go` implements `ports.BlockchainProvider` using **raw Ethereum JSON-RPC** — no go-ethereum SDK dependency needed.

### How it works
1. Reads contract addresses from `deployments/localhost.json` (written by `deploy.js`)
2. Computes function selectors at runtime: `keccak256("functionName(types)")[:4]`
3. ABI-encodes arguments with proper zero-padding (32-byte words)
4. Calls `eth_call` for reads, `eth_sendTransaction` for writes (Hardhat auto-unlocks accounts)

### Check-in flow
```
POST /api/v1/checkin
  → CheckInService.CreateCheckIn()
  → HardhatProvider.SubmitCheckin()   eth_sendTransaction → UserRegistry.checkIn(bytes32)
  → HardhatProvider.RewardUser()      eth_sendTransaction → TrustToken.mint(wallet, 10e18)
  → GET /api/v1/token-balance         eth_call → TrustToken.balanceOf(wallet) → 10 TRUST
```

### Switching providers
```bash
BLOCKCHAIN_PROVIDER=mock     # MockBlockchainProvider (fake hashes, no node needed)
BLOCKCHAIN_PROVIDER=hardhat  # HardhatProvider (live txs, requires running node)
BLOCKCHAIN_PROVIDER=polygon  # PolygonProvider (stub — implement for mainnet)
```

---

## Running Tests

```bash
go test ./...                          # all tests
go test -v ./...                       # verbose
go test -race ./...                    # race detector
go test -coverprofile=cover.out ./...  # coverage
go tool cover -html=cover.out          # open in browser
```

---

## Running Without Docker

```bash
# Requirements: Go 1.22+, MongoDB on localhost:27017
cp .env.example .env
go mod download
go run ./cmd/server
```

---

## Documentation

| Document | Description |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | Layered architecture, dependency flow, provider pattern |
| [`docs/api-spec.md`](docs/api-spec.md) | Full OpenAPI-style reference with examples |
| [`docs/database-design.md`](docs/database-design.md) | MongoDB schema, indexes, design decisions |
| [`docs/deployment-guide.md`](docs/deployment-guide.md) | Docker, env setup, production checklist |
| [`docs/contributing.md`](docs/contributing.md) | Dev workflow, conventions, PR process |

---

## License

MIT
