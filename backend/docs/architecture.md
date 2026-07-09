# Architecture

## Overview

TrustChain backend follows **Clean Architecture** with a strict unidirectional
dependency rule: outer layers depend on inner layers; inner layers know nothing
about outer layers.

```
HTTP Request
    |
[Middleware: RequestID -> Logger -> CORS -> SecureHeaders]
    |
[Handler] -- binds request, validates input, maps errors to HTTP status
    |
[Service] -- business rules, orchestration, external provider calls
    |
[Repository] -- MongoDB queries          [Provider] -- blockchain / recommendation
    |                                            |
[MongoDB]                               [Mock / Real external system]
    |
[Handler] -- writes standard JSON envelope
    |
HTTP Response
```

---

## Layer Responsibilities

### Domain Layer — `internal/models`, `internal/ports`

The innermost layer. Contains only:
- Pure Go structs representing business entities
- Interface definitions for all external systems
- Domain-level constants and error values

**Zero external dependencies.** No framework imports, no driver imports.
This layer never changes when infrastructure changes.

### Repository Layer — `internal/repositories`

Implements the repository interfaces defined in `internal/ports`.
All MongoDB query logic lives here and nowhere else.
Returns domain models, never raw BSON documents.
Receives `*mongo.Database` via constructor injection.

**Rule:** A repository never contains business logic.
**Rule:** A handler never imports a repository directly.

### Service Layer — `internal/services`

Contains all business rules:
- POI existence validation before check-in or review
- Blockchain submission as non-fatal side-effect of check-in
- Review body trimming and moderation defaults
- Geospatial query delegation

Receives repository interfaces and provider interfaces via constructor injection.
Never imports `mongo-driver`, `gin`, or any HTTP/DB package.

**Rule:** A service never writes HTTP responses.
**Rule:** A service never constructs raw BSON.

### Delivery Layer — `internal/handlers`, `internal/middleware`

Gin route handlers. Responsibilities:
- Bind JSON request body
- Validate input fields
- Call exactly one service method
- Map service errors to HTTP status codes
- Write standardised JSON response envelope

Never contains business logic. A handler that validates coordinates is wrong —
that belongs in `pkg/validator`. A handler that checks POI existence is wrong —
that belongs in the service.

### Infrastructure Layer

`internal/blockchain` — BlockchainProvider implementations
`internal/recommendation` — RecommendationProvider implementations
`internal/database` — MongoDB connection setup and index management

Concrete implementations of interfaces defined in `internal/ports`.
Swapped via configuration without touching any other layer.

---

## Interface Contracts

### BlockchainProvider

```go
type BlockchainProvider interface {
    GetBalance(ctx context.Context, walletAddress string) (*BalanceResult, error)
    SubmitCheckin(ctx context.Context, userID, poiID string) (*TxResult, error)
    RewardUser(ctx context.Context, userID string, amount int64) (*TxResult, error)
    GetTransactionStatus(ctx context.Context, txHash string) (*TxStatusResult, error)
}
```

Current implementation: `MockBlockchainProvider`
Future implementations: `PolygonProvider`, `HardhatProvider`
Switch: `BLOCKCHAIN_PROVIDER=polygon`

### RecommendationProvider

```go
type RecommendationProvider interface {
    GetRecommendations(ctx context.Context, req RecommendationRequest) ([]RecommendedPOI, error)
}
```

Current implementation: `MockRecommendationProvider`
Future implementations: `FederatedLearningProvider`, `ExternalMLProvider`
Switch: `RECOMMENDATION_PROVIDER=federated`

---

## Dependency Injection

All dependencies are constructed in `cmd/server/main.go` and injected
downward through constructors. No subsystem calls `os.Getenv` directly.
No global variables exist.

Wiring order:
```
Config -> Database -> Repositories -> Services -> Handlers -> Router -> Server
                  \-> Providers ----/
```

---

## Key Design Decisions

### Blockchain failure in check-in is non-fatal

When `BlockchainProvider.SubmitCheckin` fails, the check-in document is still
persisted to MongoDB. The blockchain sub-document records `txStatus: "none"`.
A future background job (not yet implemented) will retry unsubmitted transactions.

Rationale: The check-in is the ground truth of the system. A blockchain node
being temporarily unreachable must not cause data loss.

### GeoJSON coordinate ordering

MongoDB's `2dsphere` index requires GeoJSON format: coordinates stored as
`[longitude, latitude]` — the reverse of the human-readable convention.
This is enforced in `models.GeoJSONPoint` which exposes `.Latitude()` and
`.Longitude()` methods. All handler responses translate to `{latitude, longitude}`
objects to shield API clients from this convention.

### Denormalised counters on POI and User

`pois.metadata.totalReviews`, `pois.metadata.totalCheckins`, and
`users.totalCheckins` are maintained as denormalised counters intended to be
updated with MongoDB's atomic `$inc` operator as the system grows (the MVP
repository layer does not yet perform these increments — see "Known Gaps"
below). This avoids expensive aggregation queries on the recommendation hot
path. The trade-off (potential minor drift under concurrent writes) is
acceptable for this use case.

### Schema versioning on every document

Every document carries a `schemaVersion: 1` field. When a schema migration is
required, the application layer checks this field and applies transformations
at read time. This avoids blocking collection rewrites on large datasets.

---

## Known Gaps (intentional, by MVP scope)

These are not bugs — they are deliberately deferred to keep the MVP backend
honest about what it does and does not do yet:

- **Counter increments are not yet wired up.** `POIMetadata.TotalCheckins`,
  `TotalReviews`, and `User.TotalCheckins`/`TotalReviews` exist in the schema
  but are not incremented by `CheckInService` or `ReviewService` yet. Add an
  `$inc` update call in each service method when this is needed.
- **No `users` collection writer.** The `User` model and repository-shaped
  queries are designed, but no `UserRepository` or `UserService` exists yet
  because no endpoint in the MVP scope creates or reads users directly
  (`userId` is accepted as an opaque ObjectID string from the client).
- **Review check-in gating is not enforced.** `Review.CheckInID` exists in the
  schema for this exact purpose, but `ReviewService.CreateReview` does not yet
  check `CheckInRepository.FindByUserAndPOI` before accepting a review.

---

## Future Extension Points

| Feature | Extension point | Change required |
|---|---|---|
| Polygon blockchain | `PolygonProvider` in `internal/blockchain` | Implement methods, set `BLOCKCHAIN_PROVIDER=polygon` |
| Flower federated learning | `FederatedLearningProvider` in `internal/recommendation` | Implement methods, set `RECOMMENDATION_PROVIDER=federated` |
| GPS check-in verification | `CheckInVerification.GPSAccuracyMetres` field already exists | Add verification logic in `CheckInService` |
| QR code verification | `CheckInVerification.QRCodeID` field already exists | Add QR validation endpoint |
| JWT authentication | Middleware slot in router | Add `middleware.Auth()` before route groups |
| Event streaming | Service layer emits events | Add Kafka producer in service constructors |
| Review gating by check-in | `Review.CheckInID` field already exists | Add gate check in `ReviewService.CreateReview` |
