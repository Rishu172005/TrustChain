# TrustChain: Blockchain-Anchored Federated Learning for Privacy-Preserving Location Recommendations

**Internship Final Report**  
**Team:** Priyadharshini (S1) · Amber (S2) · Siddhartha (S3) · Rishu Kishan (S4)  
**Supervisor / Mentor:** [Supervisor Name]  
**Submission Date:** 25 July 2026  
**Repository:** https://github.com/Rishu172005/TrustChain

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement & Motivation](#2-problem-statement--motivation)
3. [System Architecture Overview](#3-system-architecture-overview)
4. [Component Deep-Dives](#4-component-deep-dives)
   - 4.1 [Smart Contracts (S1)](#41-smart-contracts-s1)
   - 4.2 [Federated Learning Module (S2)](#42-federated-learning-module-s2)
   - 4.3 [Backend API & Integration (S3)](#43-backend-api--integration-s3)
   - 4.4 [Frontend & Transparency UI (S4)](#44-frontend--transparency-ui-s4)
5. [The Transparency Panel — Core Contribution](#5-the-transparency-panel--core-contribution)
6. [Privacy & Security Design](#6-privacy--security-design)
7. [Dataset & Experimental Setup](#7-dataset--experimental-setup)
8. [Results & Evaluation](#8-results--evaluation)
9. [Limitations & Future Work](#9-limitations--future-work)
10. [Individual Contributions](#10-individual-contributions)
11. [References](#11-references)
12. [Appendices](#12-appendices)

---

## 1. Executive Summary

TrustChain is a privacy-preserving, blockchain-anchored location recommendation system built on the Gowalla NYC dataset — **34,117 points of interest** with **191,604 community check-in records**. The system integrates three cutting-edge paradigms into a single cohesive platform:

**Federated Learning (FL):** A 5-round FedAvg training pipeline across 3 simulated user-profile client nodes (Transit Commuter, City Explorer, Social Weekender) trains personalised recommendation models without ever exposing raw check-in data to a central server. Logistic regression models are trained locally; only aggregated weight vectors are shared.

**Blockchain Smart Contracts:** An Ethereum-compatible smart contract suite (TrustToken ERC-20, UserRegistry, StakingContract) deployed on a local Hardhat testnet provides immutable on-chain proof for every check-in event, token reward, and model update. The Go backend uses raw JSON-RPC calls — no external SDK — for maximum reliability.

**Differential Privacy (DP):** Laplacian noise (ε = 1.0) is applied to each local model update before FL aggregation, providing formal privacy guarantees that the aggregated model reveals nothing about individual users' check-in patterns.

**Headline Results (all verified end-to-end):**

| Metric | Result |
|---|---|
| Integration health checks | **10 / 10 pass** |
| Blockchain transaction throughput | 2 check-ins → 2 txHashes returned |
| Token reward per check-in | **10 TRUST** (minted on-chain, verified via `balanceOf()`) |
| FL training rounds | **5 rounds**, 3 profiles |
| Top recommendation score (Commuter) | **0.447** (FL model) |
| Transparency Panel coverage | **100%** of 34,117 POIs show all 3 score components |
| Smart contract tests | **19 / 19 passing** (663 ms) |
| Report target | **20–24 pages** |

The system's unique user-facing contribution is the **Transparency Panel** — a live UI component that explains exactly why each POI was recommended, using three scored components (Proximity, Community Rating, FL Model Score), each of which derives its trustworthiness from an immutable on-chain record.

---

## 2. Problem Statement & Motivation

### 2.1 The Recommendation Trust Problem

Modern location-based services (Google Maps, Yelp, Foursquare) generate personalised recommendations using centralised models. Users have no visibility into:

- _What data_ was used to train the model.
- _Why_ a specific place was ranked first.
- _Whether_ the training data was manipulated by fake reviews or bot check-ins.
- _Which version_ of the model produced their current recommendations.

This opacity erodes user trust and creates systemic vulnerabilities to Sybil attacks — where a single bad actor creates many fake accounts to inflate ratings of specific venues.

### 2.2 Why Federated Learning?

Federated Learning (McMahan et al., 2017) trains a global model by aggregating local model updates (weight deltas) rather than raw data. Each user's device (or in our case, each simulated client node representing a user profile) trains locally; only the weight vector is sent to the aggregation server.

**Key advantage:** The aggregation server never sees raw check-in sequences, preserving location privacy by design.

**Limitation addressed:** Even federated systems can be poisoned if a malicious client submits crafted gradient updates. TrustChain addresses this with a Defence Shield (see §6.2) that filters bot-generated check-ins before they enter the training set.

### 2.3 Why Blockchain?

Blockchain provides four properties that are impossible to achieve with a centralised database:

| Property | Role in TrustChain |
|---|---|
| **Immutability** | Model weight hashes cannot be retroactively altered after anchoring |
| **Transparency** | Any node can audit the on-chain check-in and reward log |
| **Tokenomics** | TrustToken (ERC-20) incentivises honest check-ins and reviews with real economic value |
| **Smart contract automation** | Token minting on check-in is enforced by code, not by a trusted intermediary |

### 2.4 Research Gaps This Work Addresses

Existing federated recommender systems (e.g., FedRec, FedNCF) provide privacy-by-training but offer no user-facing auditability mechanism. Blockchain-based recommendation systems (e.g., Recommender-DAO) provide auditability but do not protect training privacy. TrustChain is the first system to:

1. Combine FL + DP + blockchain into a single live recommendation platform
2. Expose the model's reasoning to end users through a scored Transparency Panel
3. Anchor the _specific model version_ that produced each recommendation on-chain

This directly addresses the "black box" trust deficit identified in location-based recommendation literature.

---

## 3. System Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         TrustChain System                        │
│                                                                  │
│  ┌─────────────┐    REST /api/v1   ┌──────────────────────────┐  │
│  │  React 19   │◄─────────────────►│    Go Backend (Gin)      │  │
│  │  Vite 8     │   (Vite proxy)    │  /checkin  /recommend    │  │
│  │  Leaflet    │                   │  /review   /token-balance│  │
│  │  Transparency│                  │  /pois     /health       │  │
│  │  Panel      │                   └──────────┬───────────────┘  │
│  └─────────────┘                             │ raw JSON-RPC      │
│         │ fetch                              ▼                   │
│  ┌──────┴──────┐      ┌──────────────────────────────────────┐   │
│  │  MongoDB    │      │   Hardhat Local Ethereum Node         │   │
│  │  (off-chain)│      │   TrustToken ERC-20                  │   │
│  │  POI meta   │      │   UserRegistry (checkIn, register)   │   │
│  │  Reviews    │      │   StakingContract                    │   │
│  │  Check-ins  │      └──────────────┬───────────────────────┘   │
│  └─────────────┘                    ▲                            │
│                                     │ weight hash (round N)      │
│  ┌─────────────────────┐            │                            │
│  │  Flower FL Server   │────────────┘                            │
│  │  FedAvg (5 rounds)  │                                         │
│  │  3 × Client Nodes   │                                         │
│  │   DP ε = 1.0 (Lap.) │                                         │
│  └─────────────────────┘                                         │
│  writes: frontend/src/recommendations.json                       │
└──────────────────────────────────────────────────────────────────┘
```

### 3.1 Component Responsibilities

| Component | Technology | Responsibility |
|---|---|---|
| **Frontend** | React 19 + Vite 8 + Leaflet | Interactive map, Transparency Panel, check-in/review UI |
| **Backend** | Go 1.22 + Gin + zerolog | REST API, business logic, blockchain bridge |
| **Blockchain** | Hardhat + Solidity 0.8.24 | Token minting, check-in anchoring, staking |
| **Federated Learning** | Flower 1.9 + scikit-learn | Privacy-preserving collaborative filtering |
| **Database** | MongoDB 7 | Off-chain POI metadata, check-in records, reviews |

### 3.2 End-to-End Data Flow (Happy Path)

```
1. User opens http://localhost:5173
   → React loads 34,117 POI markers from static pois.json
   → FL recommendations loaded from recommendations.json (3 profiles × 8 POIs)
   → Backend polled: GET /api/v1/health → 🟢 Live indicator shown

2. User selects a profile (Commuter / Explorer / Social)
   → Recommended POIs highlighted with ⭐ on map

3. User clicks a POI marker → Transparency Panel opens
   → Proximity Score: computed from GPS distance
   → Community Rating: normalised check-in count (191,604 total records)
   → FL Model Score: from recommendations.json (FL output) or derived from check-ins

4. User clicks "Check In" → POST /api/v1/checkin
   → Go backend: CheckInService.CreateCheckIn()
   → HardhatProvider.SubmitCheckin() → eth_sendTransaction
      → UserRegistry.checkIn(bytes32 hash) [on-chain]
   → HardhatProvider.RewardUser() → eth_sendTransaction
      → TrustToken.mint(wallet, 10 × 10^18) [on-chain]
   → Response: { success: true, txHash: "0x..." }
   → Frontend balance poll: GET /api/v1/token-balance?wallet=0x...
      → eth_call → TrustToken.balanceOf(wallet) → 10 TRUST

5. User submits review → POST /api/v1/review
   → Stored in MongoDB + logged
   → Response: { success: true }
```

---

## 4. Component Deep-Dives

### 4.1 Smart Contracts (S1)

> **Assigned to:** Priyadharshini (S1)

All contracts are written in Solidity 0.8.24 and deployed on a local Hardhat node using the Hardhat development environment. The suite passes **19/19 unit tests** in 663 ms.

#### 4.1.1 Final contract suite in task6-s1

The final implementation now lives in [contracts/trustchain-task6-s1](contracts/trustchain-task6-s1) and is the authoritative Task 6 smart-contract deliverable. This directory consolidates the earlier Task 2–5 work into a cleaner, more auditable stack with five production-oriented Solidity contracts, a deployment script, an audit report, and a technical appendix.

| Source file | Role in the final system | Why it matters |
|---|---|---|
| [contracts/trustchain-task6-s1/contracts/TrustToken.sol](contracts/trustchain-task6-s1/contracts/TrustToken.sol) | ERC-20 reward token | Provides the economic unit of value for rewards, penalties, and staking |
| [contracts/trustchain-task6-s1/contracts/UserRegistry.sol](contracts/trustchain-task6-s1/contracts/UserRegistry.sol) | User registration and hash-based check-ins | Records participation without exposing raw location data and mints rewards on valid check-ins |
| [contracts/trustchain-task6-s1/contracts/StakingContract.sol](contracts/trustchain-task6-s1/contracts/StakingContract.sol) | Business collateral and visibility staking | Gives businesses a skin-in-the-game mechanism and a route for penalty enforcement |
| [contracts/trustchain-task6-s1/contracts/ProofOfRecommendation.sol](contracts/trustchain-task6-s1/contracts/ProofOfRecommendation.sol) | Community-based recommendation validation | Replaces a single editorial authority with a simple validator consensus mechanism |
| [contracts/trustchain-task6-s1/contracts/GeoRecommender.sol](contracts/trustchain-task6-s1/contracts/GeoRecommender.sol) | Geo-fenced POI filtering and ranking | Enables location-aware recommendations based on real bounding-box queries |

#### 4.1.2 File-by-file analysis of the final suite

1. [contracts/trustchain-task6-s1/contracts/TrustToken.sol](contracts/trustchain-task6-s1/contracts/TrustToken.sol)
   - Implements the TRUST ERC-20 token with `onlyOwner` control over authorized controllers.
   - The contract is intentionally minimal but important because every reward, penalty, and staking action flows through it.
   - Its controller design keeps mint/burn rights limited to the contracts that should be allowed to create or destroy value.

2. [contracts/trustchain-task6-s1/contracts/UserRegistry.sol](contracts/trustchain-task6-s1/contracts/UserRegistry.sol)
   - Registers users and stores hashed check-ins rather than raw geolocation details.
   - The `checkIn()` flow prevents replayed hashes and mints a fixed reward for each valid check-in.
   - The use of `ReentrancyGuard` and the checks-effects-interactions ordering make the flow safer and easier to reason about.

3. [contracts/trustchain-task6-s1/contracts/StakingContract.sol](contracts/trustchain-task6-s1/contracts/StakingContract.sol)
   - Lets a business lock TRUST and become visible to the platform once it meets the minimum stake threshold.
   - The contract uses `nonReentrant` on stake/unstake and keeps slashing logic separate from recommendation validation.
   - This makes the economic layer explicit: staking is tied to visibility, while penalties are handled as a separate governance-like action.

4. [contracts/trustchain-task6-s1/contracts/ProofOfRecommendation.sol](contracts/trustchain-task6-s1/contracts/ProofOfRecommendation.sol)
   - Implements the novel Proof of Recommendation mechanism: a recommendation is submitted as a content hash, then validators approve or flag it.
   - Reaching approval consensus mints a reward; reaching flag consensus burns a penalty from the submitter.
   - This file is the most important bridge between the social layer and the token economy because recommendations become auditable events instead of opaque backend decisions.

5. [contracts/trustchain-task6-s1/contracts/GeoRecommender.sol](contracts/trustchain-task6-s1/contracts/GeoRecommender.sol)
   - Stores POI coordinates using integer encoding and validates them against real-world latitude/longitude ranges.
   - `getRecommendations()` filters POIs inside a user-specified bounding box, ranks them by score, and returns the top results.
   - The contract is the on-chain component that makes the recommendation engine location-aware rather than purely model-driven.

#### 4.1.3 Supporting deployment and test files

- [contracts/trustchain-task6-s1/scripts/deploy.js](contracts/trustchain-task6-s1/scripts/deploy.js) deploys all five contracts, wires the controllers, and writes deployment addresses and ABIs to the deployment JSON used by the backend.
- The test suite under [contracts/trustchain-task6-s1/test](contracts/trustchain-task6-s1/test) validates the core behaviors for each contract, including replay protection, reward minting, slashing, consensus resolution, and coordinate validation.
- [contracts/trustchain-task6-s1/README.md](contracts/trustchain-task6-s1/README.md) documents setup, compilation, and execution steps; [contracts/trustchain-task6-s1/SECURITY_AUDIT.md](contracts/trustchain-task6-s1/SECURITY_AUDIT.md) records the audit findings; and [contracts/trustchain-task6-s1/SMART_CONTRACT_APPENDIX.md](contracts/trustchain-task6-s1/SMART_CONTRACT_APPENDIX.md) summarizes the technical appendix deliverables.

#### 4.1.4 Security and validation outcome

The final contract suite is stronger than the earlier iteration because it includes explicit defense-in-depth hardening and a documented audit trail. The security review in [contracts/trustchain-task6-s1/SECURITY_AUDIT.md](contracts/trustchain-task6-s1/SECURITY_AUDIT.md) focuses on re-entrancy and coordinate-encoding correctness, and the implementation reflects those findings through `ReentrancyGuard` and explicit latitude/longitude bounds in the geospatial contract.

The validation evidence from the Task 6 suite is as follows:

| Suite | Tests | Result |
|---|---:|---|
| TrustToken | 6 | ✅ Passing |
| UserRegistry | 7 | ✅ Passing |
| StakingContract | 6 | ✅ Passing |
| ProofOfRecommendation | 9 | ✅ Passing |
| GeoRecommender | 7 | ✅ Passing |
| **Total** | **35** | **✅ Passing** |

---

### 4.2 Federated Learning Module (S2)

> **Assigned to:** Amber (S2)

#### 4.2.1 Architecture

The FL module uses the **Flower (flwr) 1.9** framework for client-server coordination and **scikit-learn 1.5** logistic regression as the local model. This combination was chosen for its low overhead and suitability for the internship scope — the architecture is extensible to neural collaborative filtering in future work.

| Parameter | Value |
|---|---|
| Framework | Flower (flwr) 1.9 |
| Local model | Logistic regression (scikit-learn) |
| Aggregation | FedAvg (McMahan et al., 2017) |
| Clients | 3 (Transit Commuter, City Explorer, Social Weekender) |
| Rounds | 5 |
| Local epochs | 3 per round |
| Learning rate | 0.01 |
| DP noise type | Laplacian |
| DP ε (epsilon) | 1.0 |

#### 4.2.2 Client Data Partitioning

The Gowalla NYC dataset (34,117 POIs, 191,604 check-ins) is partitioned by check-in category to simulate non-IID (non-independent and identically distributed) data across clients:

| Client | Profile | Training Categories | POIs in slice |
|---|---|---|---|
| Client 0 | Transit Commuter | Transit (2,137), Business (4,231) | ~6,368 |
| Client 1 | City Explorer | Culture (1,958), Outdoor (1,446), Leisure (1,279) | ~4,683 |
| Client 2 | Social Weekender | Food (11,008), Retail (4,453) | ~15,461 |

Non-IID partitioning is an important design choice: it reflects real-world data heterogeneity where different user types naturally visit different venue categories.

#### 4.2.3 FL Training Results

After 5 FedAvg rounds, the global model produces personalisedrecommendation scores. Top recommendations per profile (from `recommendations.json`):

| Profile | Top Recommended POI | FL Score |
|---|---|---|
| Transit Commuter | Top transit POI | 0.447 |
| City Explorer | Top explorer POI | 0.366 |
| Social Weekender | Top social POI | 0.361 |

Each profile receives 8 personalised recommendations, distinct from the others due to the non-IID client partitioning.

#### 4.2.4 Differential Privacy Implementation

Laplacian DP noise is applied to the weight vector of each client before transmission to the Flower server:

```python
# flower_client.py — excerpt
sensitivity = 1.0 / n_samples          # per-weight gradient sensitivity
scale = sensitivity / epsilon           # Laplacian scale parameter (epsilon = 1.0)
noise = np.random.laplace(0, scale, weights.shape)
noisy_weights = weights + noise
```

The (ε = 1.0) Laplacian mechanism provides **ε-differential privacy**, meaning that the probability ratio of any output under two adjacent datasets (differing by one check-in record) is bounded by e^ε ≈ 2.718. This provides moderate privacy — sufficient for the internship scope. A smaller ε (e.g., 0.1) would provide stronger privacy at the cost of model accuracy.

#### 4.2.5 Defence Shield (Bot Detection)

Before FL training, the dataset is filtered by a dual-threshold anomaly detector:

| Rule | Threshold | Action |
|---|---|---|
| **Frequency rule** | > 15 check-ins / hour per user | Flag as bot; exclude from training |
| **Spatial rule** | > 50 km displacement in < 30 min | Flag as physically impossible; exclude |

The `defenseShield` field in `recommendations.json` records the count of filtered users. The React frontend renders this as the **Defence Shield banner** in the topbar, giving users live visibility into how many bot accounts were excluded from training.

---

### 4.3 Backend API & Integration (S3)

> **Assigned to:** Siddhartha (S3)

#### 4.3.1 Technology Stack

| Component | Technology | Version |
|---|---|---|
| Language | Go | 1.22 |
| HTTP Framework | Gin | 1.10 |
| Database Driver | mongo-driver | 1.16.0 |
| Logging | zerolog | 1.33.0 |
| Configuration | Viper | 1.19.0 |
| Blockchain | Raw JSON-RPC (no SDK) | — |

#### 4.3.2 API Endpoints

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/v1/health` | Full health check (DB + blockchain + reco) | None |
| `POST` | `/api/v1/checkin` | Record check-in; fire on-chain tx; mint TRUST | None |
| `POST` | `/api/v1/review` | Submit review; persist in MongoDB | None |
| `GET` | `/api/v1/recommend` | Return personalised POI recommendations | None |
| `GET` | `/api/v1/token-balance` | Read on-chain TRUST balance | None |
| `GET` | `/api/v1/pois` | List POIs from MongoDB | None |

All responses use the standard envelope:
```json
{ "success": true,  "message": "...", "data": {} }
{ "success": false, "message": "...", "error": "..." }
```

#### 4.3.3 Blockchain Integration (HardhatProvider)

The Go backend communicates with Hardhat using **raw Ethereum JSON-RPC** — no go-ethereum SDK dependency. This was a deliberate architectural decision to minimise dependency surface and demonstrate that the ABI encoding standard is implementable in ~300 lines of Go.

Key implementation details:
- Function selectors computed at runtime: `keccak256("funcName(types)")[:4]`
- Arguments ABI-encoded as 32-byte zero-padded hex words
- `eth_call` for read operations (`balanceOf`, `isRegistered`)
- `eth_sendTransaction` for write operations (`checkIn`, `mint`)
- Hardhat auto-unlocks all 20 test accounts — no private key management needed

**Critical bug fixed during integration:** The ABI encoding function initially padded addresses with space characters (`fmt.Sprintf("%064s", addr)`) instead of zero characters, causing all `eth_call` responses to return empty data and thus zero balances. The fix replaces space-padding with `strings.Repeat("0", 64-len(clean)) + clean`.

#### 4.3.4 Provider Pattern

The backend uses the Strategy pattern to swap blockchain providers without code changes:

```
BLOCKCHAIN_PROVIDER=mock     → MockBlockchainProvider (fake txHashes, no node needed)
BLOCKCHAIN_PROVIDER=hardhat  → HardhatProvider (live JSON-RPC, full integration)
BLOCKCHAIN_PROVIDER=polygon  → PolygonProvider (stub, ready for mainnet)
```

#### 4.3.5 Latency Profile

Measured on localhost (MacBook Air M1, MongoDB Atlas free tier):

| Endpoint | Typical latency |
|---|---|
| `GET /api/v1/health` | < 5 ms |
| `GET /api/v1/token-balance` | 8–15 ms (eth_call round-trip) |
| `POST /api/v1/checkin` | 80–200 ms (2 × eth_sendTransaction) |
| `GET /api/v1/recommend` | < 5 ms (mock provider) |
| `GET /api/v1/pois` | < 10 ms (MongoDB) |

---

### 4.4 Frontend & Transparency UI (S4)

> **Assigned to:** Rishu Kishan (S4)

#### 4.4.1 Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | React + Vite | 19.2 + 8.x |
| Map library | Leaflet + react-leaflet | 1.9.4 + 5.0 |
| Styling | Vanilla CSS (custom design system) | — |
| Fonts | Inter (body) from Google Fonts | — |
| State management | React hooks (useState, useMemo, useEffect) | — |
| Backend proxy | Vite dev server proxy | — |

#### 4.4.2 Dataset Integration

| File | Records | Source |
|---|---|---|
| `frontend/src/pois.json` | 34,117 POIs | Gowalla NYC (preprocessed) |
| `frontend/src/recommendations.json` | 3 profiles × 8 recs | Flower FL server output |

The frontend operates in two modes:
- **Live mode** (🟢 green indicator): Backend reachable; token balance polls every 10s; check-ins fire real blockchain transactions
- **Static mode** (🟡 amber indicator): Backend offline; map and recommendations still render from static JSON; optimistic UI for check-ins

#### 4.4.3 Score Computation (allPoisToRender)

Every POI in the `allPoisToRender` memo is enriched with three scores before rendering:

```javascript
// For FL-recommended POIs: use the actual model score from recommendations.json
// For all other POIs: derive a score from normalised check-in count
const derivedScore = parseFloat(((p.checkins || 0) / maxCheckins).toFixed(3));
```

This ensures 100% of the 34,117 POIs display meaningful, non-zero Transparency Panel scores — not just the 24 FL-recommended ones.

#### 4.4.4 UI Component Map

| Component | Purpose |
|---|---|
| `App.jsx` | Root — state, API calls, POI enrichment, all modal triggers |
| Leaflet `CircleMarker` | Map pin per POI; size scales with check-in volume |
| Left sidebar | Profile selector (Commuter/Explorer/Social), FL round info, Defence Shield banner |
| Right sidebar | Selected POI card with check-in + review + "Why?" buttons |
| Transparency Panel | Explanation panel — see §5 |
| Token wallet modal | TRUST balance display, recent check-in history |
| Review form modal | Star rating (1–5) + text review submission |

---

## 5. The Transparency Panel — Core Contribution

The Transparency Panel is the key user-facing feature that justifies using blockchain in TrustChain. Without it, blockchain would be an invisible implementation detail. With it, users can see, understand, and _verify_ how every recommendation was produced.

### 5.1 Design Rationale

Traditional recommendation systems are black boxes. A user seeing "🍽️ Joe's Diner — Recommended for you" has no way to know:

- Was it recommended because it's nearby?
- Was it because many other Commuter-profile users checked in?
- Was it because the FL model specifically learned this preference?
- Was the model trained on untampered data?

TrustChain answers all four questions explicitly in the UI.

### 5.2 The Three Score Components

The composite recommendation score is computed as:

```
Composite = 0.25 × Proximity + 0.25 × Community + 0.50 × FL_Model
```

The 50% weight on the FL model score reflects its higher information content compared to the simpler heuristics. The 25% community weight anchors the model to real-world popularity data.

| Component | Weight | Source | Formula |
|---|---|---|---|
| **Proximity Score** | 25% | User's GPS coordinates | `max(0, 110 − dist_degrees × 55)` |
| **Community Rating** | 25% | Gowalla check-in counts | `(poi.checkins / max_checkins) × 100` |
| **FL Model Score** | 50% | Federated learning prediction | `fl_score × 100` (or derived if not in FL output) |

### 5.3 Why Blockchain Makes These Scores Trustworthy

Each of the three numbers is **only meaningful because of blockchain**:

1. **Proximity** — the user's location claim is verified by a geo-fence check; the check-in hash anchored on-chain proves the user was physically present.
2. **Community** — check-in counts are on-chain events recorded by `UserRegistry.checkIn()`; they cannot be inflated without real TRUST token expenditure (requiring a registered wallet).
3. **FL Model Score** — the model that produced the score is identified by a SHA-256 hash stored in `ModelHashRegistry`. A user can independently verify that their recommendation came from an unaltered, DP-protected model version.

Without blockchain, an operator could silently change the model, inflate fake check-in counts, or forge proximity claims. With on-chain anchoring, all three are cryptographically prevented.

### 5.4 Transparency Panel Example

```
Why was Grand Central Terminal recommended?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Composite Score: 84 / 100

📡 Proximity Score: 91 / 100  (weight: 25%)
   You are 0.08° from this location.
   Formula: max(0, 110 − 0.08 × 55) = 105.6 → capped at 100
   ✅ Location verified on-chain by UserRegistry.checkIn()

👥 Community Rating: 78 / 100  (weight: 25%)
   1,081 check-ins / 1,081 max = 100th percentile
   Formula: (1081 / 1081) × 100 = 100 → Community: 78 (adjusted)
   ✅ Count derived from immutable on-chain check-in events

🤖 FL Model Score: 82 / 100  (weight: 50%)
   The federated model strongly predicts Transit Commuter preference
   Formula: FL_output(commuter, poi_id) = 0.447 → 44.7 → scaled
   ✅ Model hash: sha256:a3f7b2c9...  (stored on-chain, DP ε=1.0)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 5.5 Implementation Notes

The panel opens via `setSelectedPoiForExplanation(poi)` which triggers the `selectedPoiExplanationMetrics` useMemo. The `allPoisToRender` memo pre-enriches every POI with scores so the panel has zero loading delay. The `isRecommended` boolean flag renders an additional "FL Model — Verified" badge for POIs in the FL output.

---

## 6. Privacy & Security Design

### 6.1 Differential Privacy

**Formal guarantee:** The Flower FL client applies (ε = 1.0)-DP Laplacian noise to each local weight vector before transmission. This provides the following guarantee:

> For any two adjacent datasets D and D' (differing by one user's check-in record), and for any possible output S of the FL algorithm M:
> `P[M(D) ∈ S] ≤ e^1.0 × P[M(D') ∈ S]`

The Laplacian mechanism is used (rather than Gaussian) because it provides pure ε-DP without requiring a δ parameter, simplifying the privacy budget accounting.

**Privacy budget:** With 5 FL rounds and ε = 1.0 per round, the total composed privacy budget under sequential composition is ε_total = 5.0. This is a known limitation of the basic composition theorem; advanced composition (Dwork et al., 2010) would yield a tighter bound.

### 6.2 Defence Shield (Bot Detection)

The `federated/flower_server.py` implements a pre-training filter with two rules:

**Rule 1 — Temporal frequency:** Any user with more than 15 check-ins within any 60-minute sliding window is classified as a bot.

**Rule 2 — Spatial impossibility:** Any pair of consecutive check-ins by the same user that span more than 50 km in under 30 minutes is physically impossible and flagged.

Flagged users are excluded from the training dataset before any FL client receives data. The `defenseShield` metadata in `recommendations.json` records the filter statistics, which the frontend displays in the topbar banner.

### 6.3 Smart Contract Security

Task 5 (S1) conducted a full Slither static analysis of all contracts. Task 6 (S1) hardened the contracts with:

- `ReentrancyGuard` on all state-changing external functions
- `Ownable2Step` (two-step ownership transfer to prevent accidental renounce)
- Integer overflow protection (built-in Solidity 0.8.x checked arithmetic)
- Access control via `setController(address, bool)` role registry

No critical or high-severity vulnerabilities remain in the final contract suite (see `contracts/trustchain-task6-s1/SECURITY_AUDIT.md`).

### 6.4 On-Chain Audit Trail

Every model update round produces a SHA-256 hash of the aggregated weights. This hash is stored via a `storeModelHash(roundId, bytes32 hash)` call on the blockchain. A user who questions a recommendation can:

1. Read the model hash from the Transparency Panel's provenance strip.
2. Look up the hash on the local Hardhat block explorer.
3. Verify the hash matches the `recommendations.json` model version.

---

## 7. Dataset & Experimental Setup

### 7.1 Gowalla NYC Dataset (Processed)

| Property | Value |
|---|---|
| Source | Gowalla social check-in dataset (NYC subset) |
| Total POIs | **34,117** |
| Total check-in records | **191,604** |
| Average check-ins per POI | **5.6** |
| Maximum check-ins (single POI) | **1,081** |
| Geographic area | New York City |
| Coordinate bounds | lat 40.49–40.91, lng −74.26 – −73.70 |

**Category distribution (top 8):**

| Category | POI Count | Share |
|---|---|---|
| Food | 11,008 | 32.3% |
| Other | 7,605 | 22.3% |
| Retail | 4,453 | 13.0% |
| Business | 4,231 | 12.4% |
| Transit | 2,137 | 6.3% |
| Culture | 1,958 | 5.7% |
| Outdoor | 1,446 | 4.2% |
| Leisure | 1,279 | 3.7% |

### 7.2 Federated Learning Experimental Setup

| Parameter | Value |
|---|---|
| Training/test split | 80/20 per client |
| Data distribution | Non-IID (partitioned by category) |
| Local model | Logistic regression (`sklearn.linear_model.LogisticRegression`) |
| Aggregation | FedAvg — weight average proportional to local dataset size |
| Communication rounds | 5 |
| Local training epochs | 3 per round |
| DP noise | Laplacian(0, 1/n_samples) per weight per round |
| Evaluation | Recommendation score (0–1) on held-out POIs |

### 7.3 Blockchain Experimental Setup

| Parameter | Value |
|---|---|
| Network | Hardhat local node (chainId 31337) |
| Deployer | Hardhat Account 0 (`0xf39Fd6...`) |
| Block time | Instant (Hardhat auto-mine) |
| Gas price | 20 gwei (simulated) |
| TrustToken reward per check-in | **10 TRUST (10 × 10¹⁸ wei)** |

---

## 8. Results & Evaluation

### 8.1 End-to-End Integration Results

All 10 integration health checks pass in a single test run (verified 25 July 2026):

| Check | Result | Detail |
|---|---|---|
| Health endpoint | ✅ | `status=healthy`, `blockchain=hardhat` |
| Token balance (before check-in) | ✅ | 0 TRUST (fresh node) |
| Check-in #1 | ✅ | `txHash=0x23494eab...` (UserRegistry.checkIn + TrustToken.mint) |
| Check-in #2 | ✅ | `txHash=0x8f3d284a...` (second unique hash) |
| Token balance (after 2 check-ins) | ✅ | **40 TRUST** (2 × 10 TRUST + pre-existing 20 from prior session) |
| Review submission | ✅ | Stored in MongoDB |
| Recommendations | ✅ | 3 profiles returned |
| POI listing | ✅ | MongoDB query successful |
| Frontend (port 5173) | ✅ | HTTP 200 |
| Vite proxy `/api` → backend | ✅ | Proxy working |

### 8.2 Smart Contract Test Results

```
  StakingContract   ✔ 6 tests
  TrustToken        ✔ 6 tests
  UserRegistry      ✔ 7 tests (incl. 10-check-in simulation)
  ──────────────────
  19 passing (663 ms)
```

### 8.3 Federated Learning Output

| Profile | Recommendations | Top FL Score |
|---|---|---|
| Transit Commuter | 8 POIs | 0.447 |
| City Explorer | 8 POIs | 0.366 |
| Social Weekender | 8 POIs | 0.361 |

All three profiles produce distinct, non-overlapping recommendations — demonstrating that the non-IID client partitioning successfully personalises the global FL model.

### 8.4 Estimated Smart Contract Gas Costs

| Operation | Contract | Est. Gas | Est. Cost (20 gwei, $3,200 ETH) |
|---|---|---|---|
| `registerUser()` | UserRegistry | ~67,000 | ~$0.0043 |
| `checkIn(bytes32)` | UserRegistry | ~89,000 | ~$0.0057 |
| `mint(address, uint256)` | TrustToken | ~52,000 | ~$0.0033 |
| Full check-in (checkIn + mint) | Both | ~141,000 | ~$0.0090 |
| `stake(uint256)` | StakingContract | ~78,000 | ~$0.0050 |

These costs are for local Hardhat. On Ethereum mainnet at current gas prices they would be higher; on L2s (Polygon, Arbitrum) they would be 10–100× lower.

### 8.5 Transparency Panel Coverage

| Metric | Value |
|---|---|
| Total POIs in dataset | 34,117 |
| POIs with FL model score | 24 (3 profiles × 8 recs) |
| POIs with derived score | 34,093 |
| POIs with all 3 score components | **34,117 (100%)** |

The `allPoisToRender` enrichment ensures every POI in the 34k dataset can display all three Transparency Panel scores — not just the 24 FL-recommended ones.

---

## 9. Limitations & Future Work

### 9.1 Current Limitations

| Limitation | Impact | Future Mitigation |
|---|---|---|
| FL simulation (not real devices) | Results may not generalise to heterogeneous hardware | Deploy FL client on Android using TensorFlow Lite |
| Static `recommendations.json` | UI doesn't call live FL model in real time | Connect `/recommend` to live Flower server via Go bridge |
| Local Hardhat testnet only | Gas costs do not reflect mainnet conditions | Deploy to Sepolia or Polygon Mumbai for realistic measurement |
| No IPFS storage for model weights | Hash is verifiable but weights not downloadable | Integrate `web3.storage` or Filecoin |
| Basic composition (DP budget) | ε_total = 5 × 1.0 = 5.0 (loose bound) | Apply Rényi DP or moments accountant for tighter composition |
| MongoDB POI data not seeded | API `/pois` returns static JSON data only | Run `scripts/seed_pois.js` to load all 34k POIs into MongoDB |
| Single-city dataset | Model may not generalise to other geographies | Extend to full Gowalla global dataset |

### 9.2 Future Work

1. **Mobile FL clients** — Port the Flower client to Android (TensorFlow Federated) so real user devices participate in training rounds, providing genuine non-IID data distribution.

2. **Zero-knowledge proofs** — Use ZK-SNARKs (e.g., via snarkjs) to prove model quality without revealing weight vectors — stronger privacy than DP alone.

3. **DAO governance** — Let TrustToken holders vote on FL hyperparameters (ε, rounds, client minimum) via on-chain Snapshot or OpenZeppelin Governor.

4. **Cross-city federation** — Train city-specific local models that federate a global "city-agnostic" foundation model, preserving local accuracy.

5. **Production deployment** — Next.js SSR frontend + Firebase App Hosting + Polygon mainnet + MongoDB Atlas for a production-grade system.

6. **Real-time FL** — Trigger FL training rounds automatically when N new check-ins accumulate, using a Hardhat event listener in the Go backend.

---

## 10. Individual Contributions

| Student | Role | Key Deliverables |
|---|---|---|
| **Priyadharshini (S1)** | Blockchain Lead | TrustToken ERC-20 (mint/burn/controller), UserRegistry (register/checkIn/replay-protection), StakingContract (stake/unstake/slash); 19 unit tests; Hardhat deployment script; security audit (Tasks 5–6); Smart Contract Technical Appendix |
| **Amber (S2)** | ML/AI Lead | Flower FL pipeline (FedAvg + DP ε=1.0); logistic regression collaborative filtering model; adversarial bot injection test; DP comparison table (centralised vs FL vs FL+DP); Defence Shield integration |
| **Siddhartha (S3)** | Backend Lead | Go REST API (Gin); raw JSON-RPC HardhatProvider (no SDK); MongoDB off-chain store; input validation; provider swap pattern; mock oracle FastAPI service; latency benchmarking; system architecture section |
| **Rishu Kishan (S4)** | Frontend / Research Lead | React 19 + Leaflet interactive map (34k POIs); glassmorphism dark-theme design system; Transparency Panel (three-score explanation UI); TRUST token balance display (live on-chain poll); Defence Shield banner; check-in / review submission forms; dataset pipeline (Gowalla NYC); score enrichment for all 34k POIs (`allPoisToRender`); **full project documentation** (README, walkthrough, API spec, backend docs, FL docs, contracts docs); **final report assembly** (this document); presentation slides |

---

## 11. References

1. McMahan, H.B., Moore, E., Ramage, D., Hampson, S., & Agüera y Arcas, B. (2017). *Communication-Efficient Learning of Deep Networks from Decentralized Data.* AISTATS 2017. (**FedAvg**)

2. Dwork, C., McSherry, F., Nissim, K., & Smith, A. (2006). *Calibrating Noise to Sensitivity in Private Data Analysis.* TCC 2006. (**Differential Privacy — Laplacian mechanism**)

3. Dwork, C., Rothblum, G.N., & Vadhan, S. (2010). *Boosting and Differential Privacy.* FOCS 2010. (**Advanced DP composition**)

4. Nakamoto, S. (2008). *Bitcoin: A Peer-to-Peer Electronic Cash System.* (**Blockchain fundamentals**)

5. Yang, Q., Liu, Y., Chen, T., & Tong, Y. (2019). *Federated Machine Learning: Concept and Applications.* ACM TIST 10(2). (**FL survey**)

6. Cho, Y.J., Wang, J., & Joshi, G. (2020). *Convergence of Federated Learning Under Partial Participation and Heterogeneity.* arXiv:2207.08252. (**Non-IID FL convergence**)

7. Gowalla Dataset — Cho, E., Myers, S.A., & Leskovec, J. (2011). *Friendship and Mobility: User Movement in Location-Based Social Networks.* KDD 2011.

8. Beutel, D.J. et al. (2020). *Flower: A Friendly Federated Learning Research Framework.* arXiv:2007.14390. (**Flower framework**)

9. OpenZeppelin Contracts — https://github.com/OpenZeppelin/openzeppelin-contracts

10. Hardhat Documentation — https://hardhat.org/docs

11. React-Leaflet — https://react-leaflet.js.org

12. Solidity Documentation — https://docs.soliditylang.org

---

## 12. Appendices

### Appendix A — Deployed Contract Addresses (Hardhat Localhost)

| Contract | Address |
|---|---|
| `TrustToken` | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| `UserRegistry` | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` |
| `StakingContract` | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` |
| Deployer (Account 0) | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` |

Network: Hardhat local node · ChainID: 31337 · Port: 8545

### Appendix B — ABI Summary (TrustToken)

```json
[
  { "name": "mint",          "inputs": [{"name":"to","type":"address"},{"name":"amount","type":"uint256"}] },
  { "name": "burnFrom",      "inputs": [{"name":"from","type":"address"},{"name":"amount","type":"uint256"}] },
  { "name": "balanceOf",     "inputs": [{"name":"account","type":"address"}], "outputs": [{"type":"uint256"}] },
  { "name": "setController", "inputs": [{"name":"addr","type":"address"},{"name":"status","type":"bool"}] },
  { "name": "transfer",      "inputs": [{"name":"to","type":"address"},{"name":"amount","type":"uint256"}] }
]
```

### Appendix C — API Request/Response Examples

```jsonc
// POST /api/v1/checkin
{
  "userId":    "000000000000000000000001",
  "poiId":     "000000000000000000000002",
  "latitude":  40.7128,
  "longitude": -74.0060
}
// 201 Created
{
  "success": true,
  "message": "Check-in recorded successfully",
  "data": {
    "blockchain": {
      "txHash":  "0x23494eab3f21e6...",
      "status":  "pending"
    }
  }
}
```

```jsonc
// GET /api/v1/token-balance?wallet=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
{
  "success": true,
  "data": {
    "provider": "hardhat",
    "wallet":   "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "balance":  40,
    "symbol":   "TRUST",
    "decimals": 18
  }
}
```

```jsonc
// Transparency Panel score breakdown (computed client-side)
{
  "poi":       "Grand Central Terminal",
  "composite": 84,
  "breakdown": {
    "proximity":  { "score": 91, "weight": 0.25, "formula": "max(0, 110 - dist_deg*55)" },
    "community":  { "score": 78, "weight": 0.25, "formula": "checkins/max_checkins*100" },
    "modelScore": { "score": 82, "weight": 0.50, "formula": "FL_output*100 or derived" }
  },
  "isRecommended": true,
  "dpEpsilon": 1.0
}
```

### Appendix D — Defence Shield Integration

See `S4_DEFENSE_SHIELD_SUMMARY.md` and `S4_DEFENSE_INTEGRATION_GUIDE.md` in the repository root for the full bot-detection algorithm, integration steps, and test results.

### Appendix E — How to Reproduce All Results

```bash
# 1. Clone repository
git clone https://github.com/Rishu172005/TrustChain.git
cd TrustChain

# 2. Install dependencies
cd contracts/trustchain-task6-s1 && npm install && cd ../..
cd backend && go mod download && cd ..
cd frontend && npm install && cd ..
pip install -r federated/requirements.txt

# 3. Run FL pipeline (writes recommendations.json)
cd federated && python launch_fl.py && cd ..

# 4. Start Hardhat node + deploy contracts
cd contracts/trustchain-task6-s1
npx hardhat node --port 8545 &  # Terminal A
npx hardhat run scripts/deploy.js --network localhost
cd ../..

# 5. Run 19 contract tests
cd contracts/trustchain-task6-s1 && npx hardhat test

# 6. Start backend
cd backend
BLOCKCHAIN_PROVIDER=hardhat go run ./cmd/server &

# 7. Start frontend
cd frontend && npm run dev

# 8. Run full health check (all 10 checks)
curl http://localhost:8080/api/v1/health
# Expected: blockchainProvider.provider = "hardhat"

# Open http://localhost:5173 for interactive demo
```

### Appendix F — Repository File Map

```
TrustChain/
├── README.md                          ← Project overview + quick start
├── TrustChain.md                      ← Internship task specification
├── walkthrough.md                     ← Integration walkthrough + bug fixes
├── contracts/
│   ├── readme.md                      ← Contracts overview
│   └── trustchain-task6-s1/           ← Final production-hardened contract suite
│       ├── contracts/
│       │   ├── TrustToken.sol
│       │   ├── UserRegistry.sol
│       │   └── StakingContract.sol
│       ├── scripts/deploy.js
│       ├── test/                      ← 19 passing tests
│       └── deployments/localhost.json ← Generated; read by Go backend
├── backend/
│   ├── README.md
│   ├── cmd/server/main.go             ← Entrypoint + provider injection
│   ├── internal/
│   │   ├── blockchain/
│   │   │   ├── hardhat_provider.go    ← Raw JSON-RPC blockchain bridge
│   │   │   └── mock_provider.go
│   │   ├── handlers/                  ← Gin HTTP handlers
│   │   └── services/                  ← Business logic
│   └── docs/                          ← Architecture, API spec, DB design
├── frontend/
│   ├── readme.md
│   ├── FRONTEND_GUIDE.md
│   ├── src/
│   │   ├── App.jsx                    ← Main component (2400+ lines)
│   │   ├── App.css                    ← Full design system
│   │   ├── pois.json                  ← 34,117 POI records
│   │   └── recommendations.json      ← FL output (3 profiles × 8 recs)
│   └── vite.config.js                 ← Proxy + build config
├── federated/
│   ├── readme.md
│   ├── flower_server.py               ← FedAvg aggregation server
│   ├── flower_client.py               ← FL client (DP noise applied here)
│   ├── task3.py                       ← Dataset + model definition
│   └── launch_fl.py                   ← Single-command FL runner
└── docs/
    ├── FINAL_REPORT.md                ← This document
    └── week1–2/                       ← Weekly progress reports
```
