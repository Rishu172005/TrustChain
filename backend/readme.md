# TrustChain Backend

A production-quality Go backend for TrustChain — a decentralised location
recommendation platform that uses blockchain-anchored trust and federated
learning to solve privacy, integrity, and incentive problems in existing
recommendation systems.

---

## Quick Start

The backend service can be run locally from the repository.

```bash
cd backend
cp .env.example .env
docker compose up --build
```

The API is available at `http://localhost:8080/api/v1`.

Verify the server is running:

```bash
curl http://localhost:8080/api/v1/health
```

Expected response:

```json
{
  "success": true,
  "message": "Service is healthy",
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "uptime": "2s",
    "checks": {
      "database": { "status": "healthy", "latencyMs": 1 },
      "blockchainProvider": { "status": "healthy", "provider": "mock" },
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
| HTTP Framework | Gin |
| Database | MongoDB 7 (Atlas in production, Docker in development) |
| Logging | zerolog (structured JSON) |
| Configuration | Viper |
| Containerisation | Docker + Docker Compose |
| API Documentation | OpenAPI 3.0 |

---

## Project Structure

```
cmd/server/              Application entry point and dependency injection
internal/config/         Configuration loading via Viper
internal/models/         Domain entities (User, POI, CheckIn, Review)
internal/ports/          Interface contracts for all external systems
internal/repositories/   MongoDB data access implementations
internal/services/       Business logic layer
internal/handlers/       HTTP request handlers (Gin)
internal/middleware/     CORS, logging, security headers
internal/blockchain/     BlockchainProvider implementations
internal/recommendation/ RecommendationProvider implementations
internal/database/       MongoDB connection and index management
pkg/logger/               Structured logger initialisation
pkg/validator/            Input validation helpers
pkg/response/             Standard JSON response helpers
tests/                     Unit and integration tests
docs/                      Architecture, API, database, and deployment guides
scripts/                   MongoDB seed data
```

---

## Environment Variables

Copy `.env.example` to `.env` and adjust as needed.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | HTTP server port |
| `SHUTDOWN_TIMEOUT` | `10` | Graceful shutdown timeout in seconds |
| `MONGODB_URI` | `mongodb://localhost:27017` | MongoDB connection string |
| `DATABASE_NAME` | `trustchain` | MongoDB database name |
| `MONGODB_CONNECT_TIMEOUT` | `10` | Connection timeout in seconds |
| `LOG_LEVEL` | `info` | Log level: debug, info, warn, error |
| `BLOCKCHAIN_PROVIDER` | `mock` | Provider: mock, polygon, hardhat |
| `RECOMMENDATION_PROVIDER` | `mock` | Provider: mock, federated, external |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Service health check |
| `POST` | `/api/v1/checkin` | Submit a check-in |
| `POST` | `/api/v1/review` | Submit a review |
| `GET` | `/api/v1/recommend` | Get POI recommendations |
| `GET` | `/api/v1/token-balance` | Get blockchain token balance |
| `GET` | `/api/v1/pois` | List points of interest |

All endpoints return:
```json
{ "success": true, "message": "...", "data": {} }
```
or on failure:
```json
{ "success": false, "message": "...", "error": "..." }
```

Full API documentation: [`docs/api-spec.md`](docs/api-spec.md)

---

## Running Tests

```bash
# All tests
go test ./...

# With coverage
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out -o coverage.html

# With race detector
go test -race ./...

# Verbose
go test -v ./...
```

---

## Running Locally Without Docker

Requirements: Go 1.22+, MongoDB running on localhost:27017.

```bash
cp .env.example .env
go mod download
go run ./cmd/server
```

---

## Documentation Index

| Document | Description |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | System design, layer responsibilities, dependency graph |
| [`docs/api-spec.md`](docs/api-spec.md) | Complete API reference with request/response examples |
| [`docs/database-design.md`](docs/database-design.md) | Collection schemas, indexes, and design decisions |
| [`docs/deployment-guide.md`](docs/deployment-guide.md) | Docker, environment setup, production checklist |
| [`docs/contributing.md`](docs/contributing.md) | Development workflow, conventions, PR process |

---

## Provider Swap Guide

Switch any external system by changing one environment variable.

**Blockchain:**
```bash
BLOCKCHAIN_PROVIDER=polygon   # use PolygonProvider
BLOCKCHAIN_PROVIDER=mock      # use MockBlockchainProvider (default)
```

**Recommendation Engine:**
```bash
RECOMMENDATION_PROVIDER=federated  # use FederatedLearningProvider
RECOMMENDATION_PROVIDER=mock       # use MockRecommendationProvider (default)
```

No code changes required. Restart the server after changing the variable.

Note: `PolygonProvider` and `FederatedLearningProvider` are interface-complete
stubs that return descriptive "not yet implemented" errors. Implement the
methods in `internal/blockchain/polygon_provider.go` and
`internal/recommendation/fl_provider.go` before switching to them in production.

---

## License

MIT
