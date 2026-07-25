# API Specification

Base URL: `http://localhost:8080/api/v1`

All requests and responses use `Content-Type: application/json`.

---

## Standard Response Envelope

Every endpoint returns one of these two shapes. No exceptions.

**Success**
```json
{
  "success": true,
  "message": "Human-readable description",
  "data": { }
}
```

**Failure**
```json
{
  "success": false,
  "message": "Human-readable description",
  "error": "Technical detail"
}
```

---

## HTTP Status Codes

| Code | Meaning |
|---|---|
| `200` | Successful read |
| `201` | Successful creation |
| `400` | Malformed JSON body or missing required parameter |
| `404` | Referenced resource not found |
| `422` | Semantic validation failure (invalid coordinates, rating out of range, etc.) |
| `500` | Unexpected server error |
| `503` | External provider (blockchain or recommendation engine) unavailable |

---

## GET /health

Returns the operational status of the service and all its dependencies.

**Request:** No parameters.

**Response 200**
```json
{
  "success": true,
  "message": "Service is healthy",
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "uptime": "3h24m11s",
    "checks": {
      "database": { "status": "healthy", "latencyMs": 0 },
      "blockchainProvider": { "status": "healthy", "provider": "hardhat" },
      "recommendationProvider": { "status": "healthy", "provider": "mock" }
    }
  }
}
```

**Response 503** — any critical dependency is down
```json
{
  "success": false,
  "message": "Service is degraded",
  "error": "database connectivity check failed"
}
```

---

## POST /checkin

Records a user visit to a point of interest and submits a blockchain
transaction placeholder.

**Request Body**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `userId` | string | yes | 24-character hex MongoDB ObjectID |
| `poiId` | string | yes | 24-character hex MongoDB ObjectID |
| `latitude` | float | yes | -90.0 to 90.0 |
| `longitude` | float | yes | -180.0 to 180.0 |

```json
{
  "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "poiId": "64f1a2b3c4d5e6f7a8b9c0d2",
  "latitude": 40.7128,
  "longitude": -74.0060
}
```

**Response 201**
```json
{
  "success": true,
  "message": "Check-in recorded successfully",
  "data": {
    "checkinId": "64f1a2b3c4d5e6f7a8b9c0d3",
    "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "poiId": "64f1a2b3c4d5e6f7a8b9c0d2",
    "location": { "latitude": 40.7128, "longitude": -74.0060 },
    "verification": { "method": "none", "status": "pending" },
    "blockchain": { "txHash": "0xmock_64f1a2_64f1a2", "txStatus": "pending" },
    "createdAt": "2024-09-01T12:00:00Z"
  }
}
```

**Error Responses**

| Status | Condition |
|---|---|
| `400` | Malformed JSON |
| `422` | Invalid ObjectID format, coordinates out of range |
| `500` | Database write failure |

> **Note:** If the POI does not exist in MongoDB (demo mode with static JSON data),
> the check-in proceeds and returns 201. The blockchain tx is still submitted.

---

## POST /review

Submits a rating and written review for a point of interest.

**Request Body**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `userId` | string | yes | 24-character hex MongoDB ObjectID |
| `poiId` | string | yes | 24-character hex MongoDB ObjectID |
| `rating` | integer | yes | 1 to 5 inclusive |
| `review` | string | yes | Non-empty, maximum 2000 characters |

```json
{
  "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "poiId": "64f1a2b3c4d5e6f7a8b9c0d2",
  "rating": 5,
  "review": "Excellent coffee, friendly staff."
}
```

**Response 201**
```json
{
  "success": true,
  "message": "Review submitted successfully",
  "data": {
    "reviewId": "64f1a2b3c4d5e6f7a8b9c0d4",
    "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "poiId": "64f1a2b3c4d5e6f7a8b9c0d2",
    "rating": 5,
    "review": "Excellent coffee, friendly staff.",
    "moderation": { "status": "approved" },
    "createdAt": "2024-09-01T12:05:00Z"
  }
}
```

**Error Responses**

| Status | Condition |
|---|---|
| `400` | Malformed JSON |
| `404` | POI with given `poiId` does not exist |
| `422` | Invalid ObjectID, rating not in 1-5, empty review body |
| `500` | Database write failure |

---

## GET /recommend

Returns a ranked list of POI recommendations.

**Query Parameters**

| Parameter | Type | Required | Default | Constraints |
|---|---|---|---|---|
| `userId` | string | no | — | 24-character hex ObjectID |
| `limit` | integer | no | 10 | 1 to 50 |
| `category` | string | no | — | Filters results by POI category |

**Example**
```
GET /api/v1/recommend?userId=64f1a2b3c4d5e6f7a8b9c0d1&limit=5&category=cafe
```

**Response 200**
```json
{
  "success": true,
  "message": "Recommendations retrieved successfully",
  "data": {
    "provider": "mock",
    "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "recommendations": [
      {
        "poiId": "64f1a2b3c4d5e6f7a8b9c001",
        "name": "Sample Cafe",
        "category": "cafe",
        "score": 0.91,
        "location": { "latitude": 40.7128, "longitude": -74.0060 }
      }
    ]
  }
}
```

**Error Responses**

| Status | Condition |
|---|---|
| `422` | `limit` not an integer or outside 1-50 |
| `503` | Recommendation provider returned an error |

---

## GET /token-balance

Returns the on-chain TRUST token balance for an Ethereum wallet address.
When `BLOCKCHAIN_PROVIDER=hardhat` the value comes from a live `balanceOf()` call
to the deployed `TrustToken` contract.

**Query Parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `wallet` | string | yes | Ethereum address (`0x...`, 42 chars) |

**Example**
```
GET /api/v1/token-balance?wallet=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

**Response 200**
```json
{
  "success": true,
  "message": "Token balance retrieved successfully",
  "data": {
    "provider": "hardhat",
    "wallet": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "balance": 40,
    "symbol": "TRUST",
    "decimals": 18
  }
}
```

> `balance` is returned in whole tokens (wei ÷ 10¹⁸). Each check-in mints **10 TRUST**.

**Error Responses**

| Status | Condition |
|---|---|
| `400` | `wallet` parameter missing |
| `503` | Blockchain provider returned an error or node is down |


---

## GET /pois

Returns points of interest from the database. Supports optional geospatial
filtering by centre coordinates and radius.

**Query Parameters**

| Parameter | Type | Required | Default | Constraints |
|---|---|---|---|---|
| `lat` | float | no | — | -90.0 to 90.0. Must be paired with `lon`. |
| `lon` | float | no | — | -180.0 to 180.0. Must be paired with `lat`. |
| `radius` | integer | no | 1000 | Metres. 1 to 50000. |
| `category` | string | no | — | Filter by POI category. |
| `limit` | integer | no | 20 | 1 to 100. |

**Example — all POIs**
```
GET /api/v1/pois
```

**Example — nearby cafes within 500m**
```
GET /api/v1/pois?lat=40.7128&lon=-74.0060&radius=500&category=cafe
```

**Response 200**
```json
{
  "success": true,
  "message": "POIs retrieved successfully",
  "data": {
    "count": 1,
    "pois": [
      {
        "id": "64f1a2b3c4d5e6f7a8b9c0d2",
        "name": "Central Perk Cafe",
        "description": "A cozy neighbourhood cafe.",
        "category": "cafe",
        "tags": ["coffee", "wifi", "vegan"],
        "location": { "latitude": 40.7128, "longitude": -74.0060 },
        "address": {
          "street": "123 Broadway",
          "city": "New York",
          "country": "US",
          "postalCode": "10001"
        },
        "metadata": {
          "averageRating": 4.5,
          "totalReviews": 24,
          "totalCheckins": 87,
          "verified": true
        },
        "createdAt": "2024-08-01T09:00:00Z"
      }
    ]
  }
}
```

**Error Responses**

| Status | Condition |
|---|---|
| `422` | `lat` without `lon` or vice versa; coordinates out of range; `radius` out of range; `limit` out of range |
| `500` | Database query failure |

---

## curl Examples

```bash
# Health check
curl http://localhost:8080/api/v1/health

# List all POIs
curl http://localhost:8080/api/v1/pois

# POIs within 1km of a location
curl "http://localhost:8080/api/v1/pois?lat=40.7128&lon=-74.0060&radius=1000"

# Submit a check-in (use a real POI ID from the previous response)
curl -X POST http://localhost:8080/api/v1/checkin \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "poiId": "REPLACE_WITH_REAL_POI_ID",
    "latitude": 40.7128,
    "longitude": -74.0060
  }'

# Submit a review
curl -X POST http://localhost:8080/api/v1/review \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "poiId": "REPLACE_WITH_REAL_POI_ID",
    "rating": 5,
    "review": "Excellent experience."
  }'

# Get recommendations
curl "http://localhost:8080/api/v1/recommend?limit=5"

# Get token balance
curl "http://localhost:8080/api/v1/token-balance?userId=64f1a2b3c4d5e6f7a8b9c0d1"
```
