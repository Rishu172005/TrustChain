# Deployment Guide

---

## Development (Docker Compose)

The fastest path to a running system:

```bash
git clone https://github.com/trustchain/backend.git
cd backend
cp .env.example .env
docker compose up --build
```

This starts:
- MongoDB on port `27017` with seed data loaded automatically
- TrustChain backend on port `8080`

To stop:
```bash
docker compose down
```

To stop and delete all data:
```bash
docker compose down -v
```

---

## Development (Local Go)

Requirements:
- Go 1.22 or later
- MongoDB 7.0 running locally on port 27017

```bash
# Install dependencies
go mod download

# Seed the database (requires mongosh)
mongosh < scripts/seed.mongo.js

# Start the server
go run ./cmd/server
```

---

## Building the Binary

```bash
go build -ldflags="-w -s" -o bin/server ./cmd/server
./bin/server
```

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | no | `8080` | HTTP listen port |
| `SHUTDOWN_TIMEOUT` | no | `10` | Graceful shutdown timeout in seconds |
| `MONGODB_URI` | yes | `mongodb://localhost:27017` | Full MongoDB connection string |
| `DATABASE_NAME` | yes | `trustchain` | MongoDB database name |
| `MONGODB_CONNECT_TIMEOUT` | no | `10` | Connection attempt timeout in seconds |
| `LOG_LEVEL` | no | `info` | `debug`, `info`, `warn`, `error` |
| `BLOCKCHAIN_PROVIDER` | no | `mock` | `mock`, `polygon`, `hardhat` |
| `RECOMMENDATION_PROVIDER` | no | `mock` | `mock`, `federated`, `external` |

---

## MongoDB Atlas (Production)

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a database user with `readWrite` on the `trustchain` database.
3. Whitelist your server's IP address.
4. Copy the connection string and set it in your environment:

```bash
MONGODB_URI=mongodb+srv://username:password@cluster0.abc.mongodb.net/?retryWrites=true&w=majority
DATABASE_NAME=trustchain
```

The application creates all required indexes on startup. No additional
Atlas configuration is needed.

---

## Docker Image

Build a production image:

```bash
docker build -t trustchain-backend:latest .
```

Run it:

```bash
docker run -p 8080:8080 \
  -e MONGODB_URI=mongodb+srv://... \
  -e DATABASE_NAME=trustchain \
  trustchain-backend:latest
```

The image is built from `scratch` (no base OS) and contains only the
compiled binary and TLS certificates. Final image size is approximately
12-15MB.

**Note:** because the runtime image is `scratch`, it has no shell and no
`wget`/`curl` binary inside the container. Liveness checks against
`/api/v1/health` must be performed from outside the container (an external
monitor, a Kubernetes `livenessProbe` using `httpGet`, or a sidecar) rather
than via a `docker-compose` `CMD`/`CMD-SHELL` healthcheck.

---

## Health Check

The `/api/v1/health` endpoint is suitable for use as an external
liveness/readiness probe:

```bash
curl -f http://localhost:8080/api/v1/health || echo "unhealthy"
```

In Kubernetes:
```yaml
livenessProbe:
  httpGet:
    path: /api/v1/health
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 15
```

Returns `200` when healthy, `503` when any critical dependency is down.

---

## Production Checklist

Before deploying to production, complete these steps:

- [ ] Set `LOG_LEVEL=warn` or `LOG_LEVEL=error` to reduce log volume
- [ ] Set `MONGODB_URI` to an Atlas connection string with TLS
- [ ] Tighten CORS in `internal/middleware/cors.go` to your frontend domain
- [ ] Add JWT authentication middleware before route groups
- [ ] Configure MongoDB Atlas IP whitelist
- [ ] Set up log aggregation (ship zerolog JSON output to Datadog, Loki, etc.)
- [ ] Configure uptime monitoring against `/api/v1/health` from outside the container
- [ ] Set `SHUTDOWN_TIMEOUT` to a value longer than your longest request
- [ ] Implement `PolygonProvider` / `FederatedLearningProvider` before switching
      `BLOCKCHAIN_PROVIDER` / `RECOMMENDATION_PROVIDER` away from `mock`

---

## Switching Providers

**Activate Polygon blockchain:**
```bash
BLOCKCHAIN_PROVIDER=polygon
```
Implement `internal/blockchain/polygon_provider.go` before activating —
it currently returns "not yet implemented" errors on every method.

**Activate Federated Learning:**
```bash
RECOMMENDATION_PROVIDER=federated
```
Implement `internal/recommendation/fl_provider.go` and start the Flower
server before activating — it currently returns a "not yet implemented" error.

No other changes are required. Restart the server after changing environment
variables.
