# Contributing Guide

---

## Prerequisites

- Go 1.22 or later (`go version`)
- Docker and Docker Compose (`docker compose version`)
- mongosh (for local seeding without Docker)
- git

---

## Getting Started

```bash
git clone https://github.com/trustchain/backend.git
cd backend
cp .env.example .env
go mod download
docker compose up mongo -d     # start only MongoDB
go run ./cmd/server             # start the backend locally
```

---

## Architecture Rules

These rules are enforced in code review. Violations will not be merged.

**Rule 1 — Strict layer separation.**
Handlers import services. Services import repositories (via interfaces) and
providers (via interfaces). Repositories import models. No layer skips another.

**Rule 2 — No global state.**
No `var` at package level that holds mutable state. Configuration is injected,
not accessed via `os.Getenv` inside functions.

**Rule 3 — All external systems behind interfaces.**
If a dependency can change (database, blockchain, recommendation engine),
it must implement an interface defined in `internal/ports`. Direct imports
of `mongo-driver` in service files are forbidden.

**Rule 4 — Standard response envelope on every endpoint.**
Use `response.Success()` or `response.Fail()` from `pkg/response`. Never
call `c.JSON()` directly in a handler.

**Rule 5 — No TODO comments in merged code.**
Stubs (like `PolygonProvider`) return descriptive errors. Unimplemented
features are tracked in GitHub Issues, not in source comments.

---

## Adding a New Endpoint

1. Add the route contract to `docs/api-spec.md` first.
2. Define any new request/response types needed.
3. Add validation logic to `pkg/validator/validator.go` if needed.
4. Add repository methods to `internal/ports/repositories.go` if needed.
5. Implement repository changes in `internal/repositories/`.
6. Implement business logic in `internal/services/`.
7. Implement the handler in `internal/handlers/`.
8. Register the route in `cmd/server/main.go`.
9. Write unit tests for the service.
10. Write integration tests for the handler.

---

## Adding a New Provider

### Blockchain provider example

1. Implement the interface in `internal/blockchain/`:

```go
type HardhatProvider struct { /* fields */ }

func (p *HardhatProvider) GetBalance(ctx context.Context, walletAddress string) (*ports.BalanceResult, error) { /* ... */ }
func (p *HardhatProvider) SubmitCheckin(ctx context.Context, userID, poiID string) (*ports.TxResult, error)   { /* ... */ }
func (p *HardhatProvider) RewardUser(ctx context.Context, userID string, amount int64) (*ports.TxResult, error) { /* ... */ }
func (p *HardhatProvider) GetTransactionStatus(ctx context.Context, txHash string) (*ports.TxStatusResult, error) { /* ... */ }
```

2. Add the case in `cmd/server/main.go`:

```go
case "hardhat":
    blockchainProvider = blockchain.NewHardhatProvider(cfg.HardhatRPCURL)
    blockchainProviderName = "hardhat"
```

3. Add the config variable to `internal/config/config.go` and `.env.example`:

```
BLOCKCHAIN_PROVIDER=hardhat
HARDHAT_RPC_URL=http://localhost:8545
```

4. Test: `BLOCKCHAIN_PROVIDER=hardhat go run ./cmd/server`

---

## Code Style

- `gofmt` is mandatory. Run before every commit.
- Error messages are lowercase with no trailing punctuation.
- Error wrapping uses `fmt.Errorf("context: %w", err)`.
- Log messages use past tense for completed actions: "check-in recorded".
- All exported functions have a doc comment.

---

## Testing Requirements

Every PR must:
- Pass `go test ./...` with no failures
- Pass `go test -race ./...` with no data races
- Include tests for any new business logic
- Include handler tests for any new endpoints

---

## Git Workflow

```bash
git checkout -b feature/your-feature-name
# make changes
go test ./...
go vet ./...
gofmt -w .
git add .
git commit -m "feat: brief description of change"
git push origin feature/your-feature-name
# open pull request
```

Commit message prefixes: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`

---

## Project Contacts

| Role | Responsibility |
|---|---|
| Backend Lead | API design, MongoDB, blockchain integration, ML pipeline |
| Frontend Lead | React SPA consuming this API |
| Blockchain Lead | Smart contract implementation |
| ML Lead | Flower federated learning integration |
