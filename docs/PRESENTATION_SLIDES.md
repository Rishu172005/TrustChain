# TrustChain — Presentation Slides
## Blockchain-Anchored Federated Learning for Privacy-Preserving Location Recommendations

> **Format:** 12 slides · ~15 minutes talk · Q&A 5 minutes  
> **Team:** Priyadharshini (S1) · Amber (S2) · Siddhartha (S3) · Rishu Kishan (S4)  
> **Date:** 25 July 2026

---

---

## SLIDE 1 — Title

### ⛓️ TrustChain
**Blockchain-Anchored Federated Learning  
for Privacy-Preserving Location Recommendations**

| | |
|---|---|
| **Team** | Priyadharshini · Amber · Siddhartha · Rishu Kishan |
| **Dataset** | Gowalla NYC · 34,117 POIs · 191,604 check-ins |
| **Stack** | Solidity · Go · React · Flower FL · MongoDB |
| **Date** | 25 July 2026 |

---

---

## SLIDE 2 — The Problem

### Why Can't You Trust Your Recommendations?

> *"Grand Central Terminal is recommended for you."*
> **Why? You have no idea.**

#### The 4 Questions No Recommendation System Answers

| ❓ Question | 🔒 Current Systems |
|---|---|
| Why this place specifically? | Black box |
| Was training data tampered with? | No way to know |
| Are check-in counts real? | Fake reviews are everywhere |
| Which model version produced this? | Never disclosed |

**→ Sybil attacks, fake reviews, and unauditable models erode user trust**

---

---

## SLIDE 3 — Our Solution

### TrustChain: Three Pillars, One System

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  🤖 FEDERATED LEARNING    ⛓️ BLOCKCHAIN    🔒 DIFF. PRIVACY │
│                                                      │
│  Train without sharing   Anchor everything  Noise before  │
│  raw location data       on-chain           aggregation    │
│                                                      │
│              ↓                ↓               ↓      │
│                                                      │
│         🔍 TRANSPARENCY PANEL                        │
│   "Why was this recommended?" — answered live        │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Our key insight:** Blockchain doesn't just store transactions — it makes the *reasoning* behind recommendations cryptographically verifiable.

---

---

## SLIDE 4 — System Architecture

### How All 5 Components Talk to Each Other

```
React UI (Vite)          Go Backend (Gin)
   Leaflet map    ←────→  /checkin  /review
   Transparency           /recommend
   Panel          ←────→  /token-balance
                              │
                      raw JSON-RPC │
                              ▼
MongoDB           Hardhat Ethereum Node
(off-chain)         TrustToken ERC-20
POI metadata        UserRegistry
Reviews             StakingContract
                              ▲
                      weight hash │
                              │
                   Flower FL Server
                   FedAvg · 5 rounds
                   3 client profiles
                   DP ε = 1.0
```

**End-to-end verified:** Check in → blockchain tx → 10 TRUST minted → balance updates in UI

---

---

## SLIDE 5 — Smart Contracts (S1 — Priyadharshini)

### Final Contract Suite: [contracts/trustchain-task6-s1](contracts/trustchain-task6-s1)

The final smart-contract implementation is the Task 6 deliverable and is organized around five core files that cover incentives, participation, staking, recommendation validation, and geofenced ranking.

| Contract file | Purpose | Key capability |
|---|---|---|
| [contracts/trustchain-task6-s1/contracts/TrustToken.sol](contracts/trustchain-task6-s1/contracts/TrustToken.sol) | Reward token | Controller-based mint/burn for TrustChain actions |
| [contracts/trustchain-task6-s1/contracts/UserRegistry.sol](contracts/trustchain-task6-s1/contracts/UserRegistry.sol) | User participation | Registers users and records replay-protected check-ins |
| [contracts/trustchain-task6-s1/contracts/StakingContract.sol](contracts/trustchain-task6-s1/contracts/StakingContract.sol) | Business incentives | Locks TRUST for visibility and supports slashing |
| [contracts/trustchain-task6-s1/contracts/ProofOfRecommendation.sol](contracts/trustchain-task6-s1/contracts/ProofOfRecommendation.sol) | Recommendation consensus | Approve/flag voting with reward and penalty logic |
| [contracts/trustchain-task6-s1/contracts/GeoRecommender.sol](contracts/trustchain-task6-s1/contracts/GeoRecommender.sol) | Location-aware ranking | Filters POIs by bounding box and ranks them by score |

#### Security and validation highlights
- ✅ `ReentrancyGuard` on the state-changing paths that move tokens or resolve votes
- ✅ Explicit latitude/longitude range validation in the geospatial contract
- ✅ Deployment and integration support via [contracts/trustchain-task6-s1/scripts/deploy.js](contracts/trustchain-task6-s1/scripts/deploy.js)
- ✅ Full audit trail in [contracts/trustchain-task6-s1/SECURITY_AUDIT.md](contracts/trustchain-task6-s1/SECURITY_AUDIT.md) and appendix in [contracts/trustchain-task6-s1/SMART_CONTRACT_APPENDIX.md](contracts/trustchain-task6-s1/SMART_CONTRACT_APPENDIX.md)
- ✅ **35/35 smart-contract tests covered in the final suite**

---

---

## SLIDE 6 — Federated Learning (S2 — Amber)

### Privacy-Preserving Training Across 3 User Profiles

#### Training Setup
| Parameter | Value |
|---|---|
| Framework | Flower (flwr) 1.9 |
| Aggregation | FedAvg |
| Rounds | **5** |
| Clients | 3 (Commuter · Explorer · Social) |
| DP noise | Laplacian **ε = 1.0** |

#### Results — Top FL Scores After 5 Rounds
| Profile | Top Recommendation | FL Score |
|---|---|---|
| 🚆 Transit Commuter | Best transit POI | **0.447** |
| 🗺️ City Explorer | Best explorer POI | **0.366** |
| 🍕 Social Weekender | Best social POI | **0.361** |

**Profiles produce distinct, non-overlapping recommendations** → non-IID data partitioning works.

---

---

## SLIDE 7 — Backend & Integration (S3 — Siddhartha)

### Go API + Raw Blockchain Bridge (No SDK)

#### 6 REST Endpoints — All Verified Live

```
GET  /api/v1/health           → all 3 subsystems green
POST /api/v1/checkin          → fires 2 on-chain txs
GET  /api/v1/token-balance    → live balanceOf() on Hardhat
POST /api/v1/review           → MongoDB + logged
GET  /api/v1/recommend        → 3-profile FL output
GET  /api/v1/pois             → 34k POIs paginated
```

#### The Critical Bug Fixed
```go
// WRONG — space-padded ABI → all balances read as 0
fmt.Sprintf("%064s", address)

// FIXED — proper zero-padding
strings.Repeat("0", 64-len(clean)) + clean
```

**Result:** `balanceOf()` now returns correct on-chain TRUST balance.

---

---

## SLIDE 8 — Frontend & Transparency UI (S4 — Rishu Kishan)

### The "Why Was This Recommended?" Panel

```
┌─────────────────────────────────────────────────┐
│  Why was Grand Central Terminal recommended?   │
│  ─────────────────────────────────────────────  │
│                                                 │
│  📡 Proximity Score      91/100   ████████████  │
│     0.08° from you · Verified on-chain ✅       │
│                                                 │
│  👥 Community Rating     78/100   ██████████    │
│     1,081 check-ins · Immutable on-chain ✅     │
│                                                 │
│  🤖 FL Model Score       82/100   ███████████   │
│     Commuter model · DP ε=1.0 · Hash: a3f7... ✅│
│                                                 │
│  Composite: 84/100  =  0.25×91 + 0.25×78 + 0.50×82  │
└─────────────────────────────────────────────────┘
```

**Coverage: 100% of 34,117 POIs** (not just the 24 FL-recommended ones)

---

---

## SLIDE 9 — Results Summary

### Everything Works, End-to-End

| Test | Result |
|---|---|
| Integration health checks | ✅ **10 / 10 pass** |
| Smart contract tests | ✅ **19 / 19 pass** (663 ms) |
| Token reward per check-in | ✅ **10 TRUST** minted on-chain |
| Transparency Panel coverage | ✅ **100%** of 34k POIs |
| FL profiles producing distinct recs | ✅ Yes (non-IID works) |
| Frontend live when backend offline | ✅ Static fallback |
| TRUST balance shows in UI | ✅ Polls every 10 seconds |
| Bot-filter defence shield | ✅ Displayed in topbar banner |

---

---

## SLIDE 10 — The "Why Blockchain?" Argument

### Without Blockchain, None of This Is Verifiable

| Score Component | Without Blockchain | With Blockchain (TrustChain) |
|---|---|---|
| **Proximity** | Trust the server's GPS claim | Check-in hash anchored on-chain; geo-fence enforced by contract |
| **Community Rating** | Operator could inflate fake check-ins | Every check-in costs TRUST tokens; on-chain event log is immutable |
| **FL Model Score** | No way to know which model version ran | SHA-256 model hash stored on-chain after each FL round |

**Core insight:** The Transparency Panel is only meaningful *because* the data behind it is on-chain. Remove blockchain, and all three scores become unverifiable claims.

---

---

## SLIDE 11 — Limitations & Future Work

### What We Know Can Be Improved

| Limitation | Future Fix |
|---|---|
| FL clients are simulated | Deploy on real Android devices (TensorFlow Federated) |
| DP budget grows with rounds (ε_total = 5.0) | Apply Rényi DP / moments accountant |
| Local Hardhat only | Deploy to Polygon Mumbai / Sepolia testnet |
| Model weights not downloadable | Integrate IPFS / Filecoin for weight storage |
| No ZK proofs | Use ZK-SNARKs to prove model quality without revealing weights |
| Single city dataset | Extend to global Gowalla / Foursquare datasets |

### Next Version: TrustChain 2.0
- **Real mobile FL** · **ZK model proofs** · **DAO governance** · **L2 deployment**

---

---

## SLIDE 12 — Conclusion & Demo

### What We Built

> **TrustChain** is the first system to combine  
> **Federated Learning + Differential Privacy + Blockchain**  
> into a live, user-auditable location recommendation platform.

#### Key Achievements
- ✅ 34,117 POIs on an interactive blockchain-verified map
- ✅ 3 personalised FL profiles with distinct recommendations
- ✅ Live TRUST token economy (on-chain mint on check-in)
- ✅ Transparency Panel: every recommendation is explainable and verifiable
- ✅ 19/19 smart contract tests · 10/10 integration checks

#### Q&A / Live Demo
```
http://localhost:5173
```

**Thank you!**  
Priyadharshini · Amber · Siddhartha · Rishu Kishan

---

---

## Appendix — Extra Slides (for Q&A)

### A1 — How to Run a Demo (30 seconds)

```bash
# Terminal 1 — blockchain
cd contracts/trustchain-task6-s1
npx hardhat node --port 8545 &
npx hardhat run scripts/deploy.js --network localhost

# Terminal 2 — backend
cd backend
BLOCKCHAIN_PROVIDER=hardhat go run ./cmd/server

# Terminal 3 — frontend
cd frontend && npm run dev

# Open: http://localhost:5173
```

### A2 — DP Privacy Budget Accounting

| Round | Local ε | Composition (basic) |
|---|---|---|
| Round 1 | 1.0 | 1.0 |
| Round 2 | 1.0 | 2.0 |
| Round 3 | 1.0 | 3.0 |
| Round 4 | 1.0 | 4.0 |
| Round 5 | 1.0 | **5.0 total** |

With advanced composition or Rényi DP, the total budget would be significantly tighter (~2.5 for δ = 10⁻⁵).

### A3 — Smart Contract Function Selectors (EVM ABI)

| Function Signature | keccak256[:4] (selector) |
|---|---|
| `balanceOf(address)` | `0x70a08231` |
| `mint(address,uint256)` | `0x40c10f19` |
| `checkIn(bytes32)` | `0x4662d1dd` |
| `registerUser()` | `0x4d3820eb` |
| `isRegistered(address)` | `0xc3c5a547` |

All selectors are computed at runtime in `hardhat_provider.go` using `keccak256Sum` to prevent drift from hardcoded values.
