# Database Design

## Technology

MongoDB 7.0 with the official Go driver (`go.mongodb.org/mongo-driver`).
MongoDB Atlas in production. Local Docker instance in development.

---

## Collections

### `users`

Stores registered platform participants.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectID | Primary key |
| `username` | string | Unique, indexed |
| `email` | string | Unique, indexed |
| `walletAddress` | string | Unique, sparse-indexed (nullable until wallet connected) |
| `reputationScore` | float64 | Denormalised; intended to be updated via `$inc` |
| `totalCheckins` | int32 | Denormalised counter |
| `totalReviews` | int32 | Denormalised counter |
| `schemaVersion` | int32 | Always `1` for current schema |
| `createdAt` | ISODate | |
| `updatedAt` | ISODate | |

**Why sparse index on `walletAddress`:** A sparse index only indexes
documents where the field is non-null. Since users may not connect a
wallet immediately, a standard unique index would prevent multiple
null-wallet users from existing. The sparse index avoids this.

> The `users` collection and its index are provisioned by
> `database.CreateIndexes()`, but no `UserRepository` writes to it yet in
> this MVP — see `docs/architecture.md` → Known Gaps.

---

### `pois`

Stores physical points of interest.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectID | Primary key |
| `name` | string | Text-indexed for future search |
| `description` | string | |
| `category` | string | Indexed for category filtering |
| `tags` | string[] | Future ML feature extraction |
| `location` | GeoJSON Point | `{ type: "Point", coordinates: [lon, lat] }` |
| `address` | object | Embedded (no independent lifecycle) |
| `metadata` | object | Denormalised aggregates (averageRating, totalReviews, etc.) |
| `isActive` | bool | Soft delete flag. Indexed. |
| `schemaVersion` | int32 | |
| `createdAt` / `updatedAt` | ISODate | |

**Why GeoJSON Point:** MongoDB's `2dsphere` index requires GeoJSON format.
It models coordinates on a spherical Earth (WGS84), giving accurate
distance calculations at any scale — a flat-plane index (2d) would produce
errors at intercontinental distances.

**Coordinate order:** GeoJSON stores `[longitude, latitude]`. This is
the inverse of the human-readable convention. The `GeoJSONPoint` model
enforces this and exposes `.Latitude()` / `.Longitude()` accessors to
prevent bugs.

**Why embed address:** Address has no independent lifecycle — it is always
read with the POI. Embedding avoids a join and is the idiomatic MongoDB
approach for one-to-one relationships with no independent query need.

**Why denormalise metadata:** `averageRating`, `totalReviews`, and
`totalCheckins` on the POI document are designed to be updated atomically
with `$inc` and `$set` on every review and check-in write, making the
recommendation query O(1) per POI instead of requiring an aggregation.
(As noted in the architecture doc, the increment calls themselves are not
yet wired into `CheckInService`/`ReviewService` in this MVP.)

---

### `checkins`

Records verified user visits to POIs.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectID | Primary key |
| `userId` | ObjectID | Reference to `users._id` |
| `poiId` | ObjectID | Reference to `pois._id` |
| `location` | GeoJSON Point | User's reported coordinates at time of visit |
| `verification.method` | string | `none`, `gps`, `qr`, `beacon`, `manual` |
| `verification.status` | string | `pending`, `verified`, `failed`, `disputed` |
| `verification.gpsAccuracyMetres` | float64? | Nullable until GPS verification added |
| `verification.qrCodeId` | string? | Nullable until QR verification added |
| `verification.beaconId` | string? | Nullable until beacon verification added |
| `verification.validatorConsensus` | object? | Nullable until consensus layer added |
| `blockchain.txHash` | string? | Sparse-indexed. Null until TX submitted. |
| `blockchain.txStatus` | string | `none`, `pending`, `confirmed`, `failed` |
| `blockchain.blockNumber` | int64? | Nullable until confirmed |
| `blockchain.submittedAt` | ISODate? | |
| `blockchain.confirmedAt` | ISODate? | |
| `rewardGranted` | bool | |
| `rewardAmount` | int64 | Token units |
| `schemaVersion` | int32 | |
| `createdAt` / `updatedAt` | ISODate | |

**Why two sub-documents (`verification` and `blockchain`):** These are
logically independent concerns. `verification` tracks how the physical
presence was confirmed. `blockchain` tracks the on-chain record of that
event. Both are designed to carry null fields at MVP cost-free.

**Why `2dsphere` on `checkins.location`:** Future GPS verification will
compare the user's reported location against the POI's canonical location
using `$near`. The index must exist before the data grows large.

---

### `reviews`

Stores user ratings and written feedback.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectID | Primary key |
| `userId` | ObjectID | Reference to `users._id` |
| `poiId` | ObjectID | Reference to `pois._id` |
| `checkinId` | ObjectID? | Sparse-indexed reference to `checkins._id` |
| `rating` | int32 | 1-5 |
| `body` | string | Trimmed at write time |
| `sentiment.score` | float64? | Future NLP output |
| `sentiment.label` | string? | `positive`, `neutral`, `negative` |
| `moderation.status` | string | `approved` by default |
| `moderation.flagCount` | int32 | |
| `moderation.reviewedAt` | ISODate? | |
| `isVisible` | bool | Soft delete |
| `schemaVersion` | int32 | |
| `createdAt` / `updatedAt` | ISODate | |

**Why `checkinId` is nullable:** The check-in gate (only users who have
visited a POI may review it) is not enforced in MVP. The field exists
from day one so the gate can be activated by adding a query in
`ReviewService.CreateReview` with no schema change.

---

## Index Summary

```
users:
  { username: 1 }                unique
  { email: 1 }                   unique
  { walletAddress: 1 }           unique, sparse

pois:
  { location: "2dsphere" }       geospatial queries
  { category: 1 }                category filter
  { name: "text" }               future full-text search
  { isActive: 1 }                soft-delete filter

checkins:
  { userId: 1, poiId: 1 }        compound: has-user-checked-in lookup
  { poiId: 1 }                   POI check-in history
  { location: "2dsphere" }       GPS proximity verification (future)
  { "blockchain.txHash": 1 }     sparse: TX status lookup
  { createdAt: -1 }              time-series queries

reviews:
  { poiId: 1, createdAt: -1 }    covered index for POI review feed
  { userId: 1 }                  user review history
  { checkinId: 1 }               sparse: gate enforcement lookup
  { "moderation.status": 1 }     moderation queue (future)
```

All indexes are created idempotently at server startup via
`database.CreateIndexes()`.

---

## Schema Versioning

Every document carries `schemaVersion: 1`. When a field is added,
the application layer handles documents with older schema versions
at read time. This avoids blocking collection rewrites on large datasets
and allows zero-downtime migrations.
