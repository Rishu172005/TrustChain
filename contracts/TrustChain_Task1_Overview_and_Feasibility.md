# TrustChain — Task 1 Deliverable

---

## 1. Overview of Federated Learning

Federated Learning (FL) is a machine learning approach where the model is trained across many decentralized devices holding local data, without that data ever being centralized.

**How it works:**

- Each participating device (or "client") trains a copy of the model locally, using only its own user's data (in TrustChain's case: check-ins, ratings, preferences).
- Instead of uploading raw data, the device sends only the _model updates_ (mathematical weight changes) to a central aggregator.
- The aggregator combines updates from all clients using an algorithm called **FedAvg (Federated Averaging)** to produce an improved global model.
- The updated global model is redistributed to clients, and the cycle repeats over multiple rounds.

**Why it matters for TrustChain:**

- Enables the recommendation engine to learn from collective user behavior (what POIs people like, patterns across the community) without ever collecting or storing individual location histories on a server.
- Directly solves the "Privacy violations" problem defined in the project brief.
- Will be implemented using the **Flower** framework, simulating a server + multiple client nodes for the collaborative filtering recommendation model.

**Relevant metrics for evaluation (used later in the project):**

- Precision@K, Recall@K, NDCG@K — standard measures of recommendation quality.
- Model accuracy improvement across training rounds.
- Later stages will compare centralized vs. federated (no privacy) vs. federated with differential privacy.

---

## 2. Overview of Blockchain

Blockchain is a distributed, append-only ledger maintained across a network of nodes, where no single party can unilaterally alter recorded data.

**Core concepts relevant to TrustChain:**

- **Smart contracts** — self-executing code deployed on the chain that runs automatically when predefined conditions are met, removing the need for a trusted central operator.
- **ERC-20 tokens** — a standard interface for creating fungible tokens (mint, burn, transfer), used here for the TrustToken incentive system.
- **Immutability & auditability** — once a transaction (e.g., a check-in hash or a token transfer) is recorded, it cannot be secretly edited or deleted, addressing the "Manipulated rankings" and "Centralized vulnerability" problems.
- **Testnets** — practice blockchain networks (e.g., a local Hardhat network) used for development and testing before any real deployment, avoiding real transaction costs.

**Contracts planned for TrustChain (introduced progressively across tasks):**
| Contract | Purpose |
|---|---|
| TrustToken (ERC-20) | The platform's reward currency — mint, burn, transfer |
| UserRegistry | Registers users, stores check-in hashes |
| StakingContract | Lets businesses stake tokens for visibility instead of paying for ads |
| ProofOfRecommendation (PoR) | Validators vote on submitted recommendations; consensus triggers rewards, disagreement triggers penalties |
| GeoRecommender | Returns ranked POIs within a user's location bounding box |

**Tooling:**

- **Solidity** — the programming language for writing smart contracts.
- **Hardhat** — local development/testing environment for deploying and testing contracts before any live network.
- **ethers.js** — JavaScript library used by the backend to communicate with deployed contracts.

---

## 3. Feasibility Study

### 3.1 Dataset

- **Candidate datasets:** Foursquare NYC or Gowalla — both are publicly available, real-world check-in datasets containing user IDs, POI IDs, coordinates, and timestamps.
- Suitable for simulating check-ins, training the recommendation model, and populating the map UI with realistic POI data.

### 3.2 Proposed Tech Stack

| Layer                        | Technology                                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------------------- |
| Blockchain / Smart Contracts | Solidity, Hardhat (local testnet), ethers.js                                                 |
| Federated Learning           | Python, Flower (FL framework), collaborative filtering model                                 |
| Backend                      | Node.js/Express REST API, MongoDB (off-chain metadata: POI names, descriptions, coordinates) |
| Frontend                     | React, Mapbox or Leaflet (map view)                                                          |
| Dataset                      | Foursquare NYC / Gowalla                                                                     |

### 3.3 Deployment Platforms

- Smart contracts: local Hardhat testnet during development (no real-network costs).
- Backend: connects to the local blockchain node via ethers.js.
- Off-chain data: MongoDB instance for POI metadata not suited to on-chain storage (cost/size reasons).
- Frontend: local development server, map rendering via Mapbox/Leaflet API.

### 3.4 Identified Research Gaps

- Best approach for encoding geographic coordinates on-chain for the future GeoRecommender contract (integer encoding, precision vs. gas cost tradeoffs).
- How to structure the federated learning signal so it can meaningfully feed into the on-chain PoR consensus mechanism.
- Differential privacy's impact on recommendation accuracy — needs empirical testing later (Task 4).
- Gas cost optimization strategies for frequent operations (check-ins, token mints) at scale.

### 3.5 Feasibility Conclusion

The project is feasible within the timeline provided that each core component (Tasks 2–3) is built and tested in isolation before integration. The main risk areas are: (1) integration complexity between off-chain FL signals and on-chain consensus, and (2) gas costs if on-chain operations aren't kept lightweight. Both are addressed through staged testing and the isolated-component approach outlined in Task 2.

---

**Goal for this week achieved:** Full-system understanding across the team, tech stack finalized, research gaps identified ahead of individual component development in Task 2.
