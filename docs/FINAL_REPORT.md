# TrustChain: Blockchain-Anchored Federated Learning for Privacy-Preserving Location Recommendations

**Internship Final Report**  
**Team:** Priyadharshini (S1) · Amber (S2) · Siddhartha (S3) · Rishu Kishan (S4)  
**Supervisor / Mentor:** [Supervisor Name]  
**Submission Date:** [Date]  
**Repository:** https://github.com/[your-org]/TrustChain

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

<!-- TODO: Write 2–3 paragraph summary once all results are finalised.
     Cover: what the system does, the key technical challenge solved,
     the headline result (e.g. FL accuracy, gas cost), and the key
     insight (why blockchain + FL + transparency together). -->

TrustChain is a privacy-preserving, blockchain-anchored location recommendation system built on the Foursquare NYC dataset (~34 k points of interest). It combines three cutting-edge paradigms:

- **Federated Learning (FL)** — model training without exposing raw user data to a central server.
- **Blockchain smart contracts** — on-chain proof-of-recommendation (PoR) anchoring every model weight update, token reward, and review hash.
- **Differential Privacy (DP)** — Gaussian noise (ε = 1.0) added at each local training step before aggregation.

The result is a system where users can trust _why_ a POI was recommended to them, verified cryptographically and displayed in a real-time **Transparency Panel** in the UI.

> **[TODO – PLACEHOLDER]** Insert final headline metrics here (FL accuracy after N rounds, gas cost per token mint, latency p95, adversarial detection rate).

---

## 2. Problem Statement & Motivation

### 2.1 The Recommendation Trust Problem

Modern location-based services (Google Maps, Yelp, Foursquare) generate personalised recommendations using centralised models. Users have no visibility into:

- _What data_ was used to train the model.
- _Why_ a specific place was ranked first.
- _Whether_ the training data was manipulated by fake reviews or bot check-ins.

This opacity erodes user trust and creates systemic vulnerabilities to Sybil attacks.

### 2.2 Why Federated Learning?

Federated Learning trains a global model by aggregating local model updates (gradients) rather than raw data. Each user's device (or in our case, each simulated client node) trains locally; only the weight delta is sent to the aggregation server.

> **Limitation addressed:** Even federated systems can be poisoned if a malicious client submits crafted gradient updates. TrustChain addresses this with a defence shield (see §6).

### 2.3 Why Blockchain?

Blockchain provides:

| Property | Role in TrustChain |
|---|---|
| Immutability | Model weight hashes cannot be retroactively altered |
| Transparency | Any node can audit the on-chain PoR log |
| Tokenomics | TrustToken (ERC-20) incentivises honest check-ins and reviews |
| Smart contract logic | Automates reward distribution without a trusted intermediary |

### 2.4 Research Gaps This Work Addresses

<!-- TODO: Cite 3–5 relevant papers (McMahan et al. 2017 FedAvg; Nakamoto 2008; Dwork 2006 DP; etc.)
     and state explicitly what gap TrustChain fills (real-time transparency UI anchored on-chain). -->

> **[PLACEHOLDER]** Literature gap paragraph — to be written after completing literature review section.

---

## 3. System Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         TrustChain System                        │
│                                                                  │
│  ┌─────────────┐    REST API    ┌──────────────────────────────┐ │
│  │  React UI   │◄─────────────►│    Go Backend (Gin)          │ │
│  │  (Vite)     │               │  /checkin  /recommend        │ │
│  │  Leaflet Map│               │  /review   /token-balance    │ │
│  │  Why Panel  │               └──────────┬───────────────────┘ │
│  └─────────────┘                          │ ethers.js            │
│                                           ▼                      │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              Ethereum Testnet (Hardhat / Sepolia)            │ │
│  │   TrustToken ERC-20 │ UserRegistry │ StakingContract        │ │
│  │   PoR Oracle  │ ModelHash Storage                           │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                           ▲                      │
│  ┌─────────────────────┐                  │ Weight Hash          │
│  │  Flower FL Server   │──────────────────┘                     │
│  │  FedAvg Aggregator  │                                        │
│  │  3 × Client Nodes   │                                        │
│  │  DP ε = 1.0         │                                        │
│  └─────────────────────┘                                        │
│                                                                  │
│  ┌─────────────────────┐                                        │
│  │  MongoDB (off-chain) │  POI metadata, user profiles          │
│  └─────────────────────┘                                        │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow (Happy Path)

1. User opens the React frontend → POI markers loaded from `pois.json` (34 k records).
2. User selects a profile (Commuter / Explorer / Social).
3. FL model inference runs → top-5 recommendations returned via `/recommend`.
4. User clicks a marker → **Transparency Panel** opens showing Proximity, Community & Model scores.
5. User checks in → `/checkin` called → smart contract mints **+1 TC** token on-chain.
6. User submits review → `/review` called → review hash stored on-chain → **+5 TC** minted.

---

## 4. Component Deep-Dives

### 4.1 Smart Contracts (S1)

> **Assigned to:** Priyadharshini (S1)

#### 4.1.1 TrustToken (ERC-20)

<!-- TODO S1: Fill in contract address, ABI summary, mint/burn logic, gas table -->

| Function | Purpose | Gas cost (est.) |
|---|---|---|
| `mint(address, amount)` | Reward users on check-in / review | `[PLACEHOLDER]` |
| `burn(address, amount)` | Slash staked tokens of bad actors | `[PLACEHOLDER]` |
| `transfer(from, to, amount)` | Standard ERC-20 transfer | `[PLACEHOLDER]` |

#### 4.1.2 UserRegistry

<!-- TODO S1: Describe register(), storeCheckinHash(), verifyUser() -->

> **[PLACEHOLDER]** Contract logic description + unit test coverage summary.

#### 4.1.3 StakingContract

<!-- TODO S1: Describe stake(), slash(), getStake() and the economic model -->

> **[PLACEHOLDER]** Staking economic model paragraph.

#### 4.1.4 PoR Oracle & Model Hash Storage

<!-- TODO S1 + S2: Explain how FL weight hash is submitted on-chain after each round -->

> **[PLACEHOLDER]** PoR flow diagram and contract interaction sequence.

---

### 4.2 Federated Learning Module (S2)

> **Assigned to:** Amber (S2)

#### 4.2.1 Architecture

- **Framework:** Flower (`flwr`) with 3 simulated client nodes
- **Model:** Collaborative filtering (matrix factorisation or neural CF)
- **Aggregation:** FedAvg (McMahan et al., 2017)
- **Privacy:** Gaussian DP noise added locally (ε = 1.0, δ = 1e-5)

#### 4.2.2 Training Setup

| Parameter | Value |
|---|---|
| Rounds | `[PLACEHOLDER]` |
| Clients per round | 3 |
| Local epochs | `[PLACEHOLDER]` |
| Learning rate | `[PLACEHOLDER]` |
| DP ε | 1.0 |
| DP δ | 1e-5 |
| Dataset | Foursquare NYC (~34 k POIs) |

#### 4.2.3 Model Accuracy by Round

<!-- TODO S2: Paste the accuracy table / chart here after final training run -->

> **[PLACEHOLDER]** Table: Round → Train loss → Val accuracy → Model hash (truncated SHA-256).

#### 4.2.4 Defence Against Poisoning

<!-- TODO S2 + S4: Summarise the defence shield — bot detection, retention rate, flagged count -->

> **[PLACEHOLDER]** Defence shield integration description with metrics from `S4_DEFENSE_SHIELD_SUMMARY.md`.

---

### 4.3 Backend API & Integration (S3)

> **Assigned to:** Siddhartha (S3)

#### 4.3.1 API Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/checkin` | Record a check-in, mint 1 TC | JWT |
| `POST` | `/review` | Submit review hash, mint 5 TC | JWT |
| `GET` | `/recommend` | Return top-N POIs for profile | JWT |
| `GET` | `/token-balance` | Fetch on-chain TC balance | JWT |
| `GET` | `/pois` | Return paginated POI list | None |
| `GET` | `/explain/:poiId` | Transparency score breakdown | JWT |

#### 4.3.2 Blockchain Integration

<!-- TODO S3: Describe ethers.js provider setup, wallet management, gas strategy -->

> **[PLACEHOLDER]** ethers.js integration code snippet and explanation.

#### 4.3.3 Latency Benchmarking

<!-- TODO S3: Paste p50 / p95 / p99 latency results from benchmark script -->

| Endpoint | p50 | p95 | p99 |
|---|---|---|---|
| `/recommend` | `[ms]` | `[ms]` | `[ms]` |
| `/checkin` (on-chain) | `[ms]` | `[ms]` | `[ms]` |
| `/token-balance` | `[ms]` | `[ms]` | `[ms]` |

---

### 4.4 Frontend & Transparency UI (S4)

> **Assigned to:** Rishu Kishan (S4)

#### 4.4.1 Technology Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite 8 |
| Map | Leaflet + React-Leaflet |
| Styling | Vanilla CSS (glassmorphism dark theme) |
| Fonts | Outfit (headings) + Inter (body) from Google Fonts |
| State | React `useState` / `useEffect` / `useMemo` |

#### 4.4.2 Dataset Integration

- **Source:** Foursquare NYC dataset
- **Records:** ~34,000 POIs loaded from `frontend/public/pois.json`
- **Recommendation data:** `frontend/public/recommendations.json` (3 profiles × 5 top POIs each)
- **Runtime:** All data served statically; no backend dependency for map display

#### 4.4.3 UI Components

| Component | File | Purpose |
|---|---|---|
| App shell | `App.jsx` | Layout, state management, modal triggers |
| Map | `PoiMap.jsx` | Leaflet map, circle markers, popups |
| Transparency panel | `PoiDetailsPanel.jsx` | "Why was this recommended?" |
| Styles | `App.css` | Full dark glassmorphism design system |

#### 4.4.4 The Transparency Panel (S4 Key Deliverable)

See §5 for the full description of this component and its blockchain justification.

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

The 50% weight on the FL model score reflects its higher information content compared to the simpler heuristics.

| Component | Weight | Source | Formula |
|---|---|---|---|
| **Proximity Score** | 25% | User's GPS coordinates | `max(0, 110 − dist_degrees × 55)` |
| **Community Rating** | 25% | Foursquare check-in counts | `(poi.checkins / max_checkins) × 100` |
| **FL Model Score** | 50% | Federated learning prediction | `FL_model.predict(poi_id, profile) × 100` |

### 5.3 Blockchain Justification

Each of these three numbers is **only trustworthy because of blockchain**:

1. **Proximity** — the user's location claim is verified by a geo-fence check stored on-chain.
2. **Community** — check-in counts are on-chain events; they cannot be inflated without real token expenditure.
3. **FL Model** — the model that produced the score is identified by a SHA-256 hash stored in the `ModelHashRegistry` smart contract. The user can independently verify that the score came from the correct, unaltered model version.

### 5.4 UI Implementation

<!-- TODO S4: Add a screenshot of the transparency panel here once captured -->

> **[PLACEHOLDER]** Screenshot: `docs/screenshots/transparency-panel.png`

The panel opens when the user clicks **"Why? →"** next to any recommendation card, or **"📊 Scores"** on the selected location card. It shows:

1. **Header** — "Why was this recommended?" with the blockchain verification badge.
2. **Composite score banner** — the weighted formula displayed with the live computed score.
3. **Three score cards** — each with an animated ring gauge, bar indicator, plain-English rationale, and the exact formula used.
4. **On-chain provenance strip** — DP ε badge, PoR verification badge, and explanation of what the smart contract stores.
5. **Action buttons** — Check-in and Write Review directly from the panel.

---

## 6. Privacy & Security Design

### 6.1 Differential Privacy

<!-- TODO S2: Expand with formal DP proof / citation -->

Gaussian DP noise with ε = 1.0, δ = 1e-5 is added to each local model update before it is sent to the Flower aggregation server. This provides (ε, δ)-DP guarantees, ensuring that the aggregated model reveals no individual user's training data.

> **[PLACEHOLDER]** Formal DP guarantee paragraph with privacy budget accounting.

### 6.2 Defence Shield (Sybil / Bot Detection)

The `S4_DEFENSE_SHIELD_SUMMARY.md` documents the bot detection module. Key metrics:

| Metric | Value |
|---|---|
| Flagged bot accounts | `[PLACEHOLDER]` |
| Clean data retention rate | `[PLACEHOLDER]%` |
| Detection algorithm | `[PLACEHOLDER]` |

> **[PLACEHOLDER]** Algorithm description and results from `S4_DEFENSE_INTEGRATION.py`.

### 6.3 On-Chain Audit Trail

Every model update round produces a SHA-256 hash of the aggregated weights, stored via `ModelHashRegistry.storeHash(roundId, hash)`. A user who disagrees with a recommendation can:

1. Read the model hash from the transparency panel.
2. Look up the hash on the blockchain explorer.
3. Download the model weights from IPFS (future work) and verify locally.

---

## 7. Dataset & Experimental Setup

### 7.1 Foursquare NYC Dataset

| Property | Value |
|---|---|
| Total POIs | ~34,000 |
| Categories | Transit, Food & Drink, Parks, Culture, Hotels, Shops |
| Geographic area | New York City (lat 40.49–40.91, lng −74.26 – −73.69) |
| Check-in range | 0 – `[max value]` per POI |
| Profiles simulated | 3 (Commuter, Explorer, Social) |

### 7.2 Federated Learning Simulation

<!-- TODO S2: Describe client split, IID vs non-IID data distribution -->

> **[PLACEHOLDER]** Client data split description (IID / non-IID) and rationale.

### 7.3 Evaluation Metrics

| Metric | Description |
|---|---|
| FL Validation Accuracy | Global model accuracy after N rounds |
| Token Mint Gas Cost | Average gas consumed per check-in reward |
| API Latency (p95) | 95th percentile response time for `/recommend` |
| Adversarial Retention | % of clean data retained after bot filtering |
| Transparency Coverage | % of recommendations with all 3 score components available |

---

## 8. Results & Evaluation

### 8.1 Federated Learning Results

<!-- TODO S2: Paste final accuracy table and convergence plot -->

> **[PLACEHOLDER]** Table: accuracy per round. Convergence chart: `docs/charts/fl-accuracy.png`.

### 8.2 Smart Contract Gas Analysis

<!-- TODO S1: Run `npx hardhat test --report-gas` and paste results -->

> **[PLACEHOLDER]** Gas report table from Hardhat.

### 8.3 API Latency

> **[PLACEHOLDER]** Latency table from S3 benchmark script.

### 8.4 Security Evaluation

> **[PLACEHOLDER]** Defence shield results, poisoning attack simulation results.

### 8.5 UI Usability

> **[PLACEHOLDER]** Any informal user testing notes or screenshots of the transparency panel.

---

## 9. Limitations & Future Work

### 9.1 Current Limitations

| Limitation | Impact | Mitigation (future) |
|---|---|---|
| FL simulation (not real devices) | Results may not generalise to heterogeneous hardware | Deploy on real Android clients using TensorFlow Lite |
| Static `recommendations.json` in frontend | UI doesn't call live FL model | Connect `/recommend` endpoint to live Flower server |
| Local Hardhat testnet only | Gas costs may differ on mainnet | Deploy to Sepolia testnet for realistic measurement |
| No IPFS storage for model weights | Model hash is verifiable but weights not independently downloadable | Integrate `web3.storage` or Filecoin |
| Single-city dataset (NYC) | Model may not generalise to other geographies | Extend to Gowalla global dataset |

### 9.2 Future Work

1. **Mobile clients** — port the FL client to Android/iOS so real user devices participate in training.
2. **Zero-knowledge proofs** — use ZK-SNARKs to prove model quality without revealing weights (stronger privacy guarantee than DP alone).
3. **DAO governance** — let TrustToken holders vote on model update parameters via on-chain governance.
4. **Cross-city federation** — federate across city-specific models while preserving local accuracy.
5. **Production UI** — Next.js SSR, PWA support, and native mobile app.

---

## 10. Individual Contributions

| Student | Role | Key Deliverables |
|---|---|---|
| Priyadharshini (S1) | Blockchain Lead | TrustToken ERC-20, UserRegistry, StakingContract, PoR Oracle; unit tests; gas benchmarks |
| Amber (S2) | ML/AI Lead | Flower FL pipeline (FedAvg + DP); collaborative filtering model; adversarial defence integration |
| Siddhartha (S3) | Backend Lead | Go REST API (Gin); ethers.js blockchain integration; MongoDB off-chain store; latency benchmarking; mock oracle |
| Rishu Kishan (S4) | Frontend / Research Lead | React + Leaflet map UI; glassmorphism design system; **Transparency Panel** ("Why was this recommended?"); defence shield integration; dataset pipeline; README + documentation |

---

## 11. References

<!-- TODO: Complete reference list in IEEE or ACM style -->

1. McMahan, H.B., Moore, E., Ramage, D., Hampson, S., & Agüera y Arcas, B. (2017). *Communication-Efficient Learning of Deep Networks from Decentralized Data.* AISTATS 2017. [FedAvg]
2. Dwork, C., McSherry, F., Nissim, K., & Smith, A. (2006). *Calibrating Noise to Sensitivity in Private Data Analysis.* TCC 2006. [Differential Privacy]
3. Nakamoto, S. (2008). *Bitcoin: A Peer-to-Peer Electronic Cash System.* [Blockchain fundamentals]
4. Yang, Q., Liu, Y., Chen, T., & Tong, Y. (2019). *Federated Machine Learning: Concept and Applications.* ACM TIST. [FL survey]
5. Foursquare NYC Dataset — [PLACEHOLDER: dataset citation / DOI]
6. Solidity Documentation — https://docs.soliditylang.org
7. Flower Framework — https://flower.ai
8. React-Leaflet — https://react-leaflet.js.org
9. **[PLACEHOLDER]** — Additional references to be added by each team member.

---

## 12. Appendices

### Appendix A — Smart Contract ABIs

> **[PLACEHOLDER]** Paste ABI JSON for TrustToken, UserRegistry, StakingContract.

### Appendix B — FL Model Architecture

> **[PLACEHOLDER]** Model layer diagram or code snippet from S2.

### Appendix C — API Request/Response Examples

```jsonc
// POST /checkin
{
  "userId": "0xABC...123",
  "poiId":  "poi_0042",
  "lat":    40.7549,
  "lng":   -73.9840
}

// 200 OK
{
  "txHash":       "0xDEF...456",
  "tokensEarned": 1,
  "newBalance":   121
}
```

```jsonc
// GET /explain/poi_0042?profile=commuter
{
  "poi":       "poi_0042",
  "name":      "Grand Central Terminal",
  "composite": 84,
  "breakdown": {
    "proximity":  { "score": 91, "weight": 0.25, "formula": "max(0, 110 - dist*55)" },
    "community":  { "score": 78, "weight": 0.25, "formula": "checkins/max_checkins*100" },
    "modelScore": { "score": 82, "weight": 0.50, "formula": "FL_model.predict(poi,profile)*100" }
  },
  "modelHash": "sha256:a3f7...",
  "dpEpsilon": 1.0
}
```

### Appendix D — Defence Shield Metrics

> See `S4_DEFENSE_SHIELD_SUMMARY.md` in repository root for full analysis.

### Appendix E — Screenshots

> **[PLACEHOLDER]** Add final screenshots:
> - `docs/screenshots/main-dashboard.png`
> - `docs/screenshots/transparency-panel.png`
> - `docs/screenshots/wallet-modal.png`
> - `docs/screenshots/map-recommended-markers.png`
