# TrustChain Week 2 Feasibility Study

## 1. Scope

This feasibility study covers the S4 research and frontend scope for TrustChain:

- dataset selection and preprocessing direction
- role split across the team
- platform and tech stack choices
- deployment candidates for each module
- research risks and open gaps

## 2. Team Roles

| Student | Role | Focus |
| --- | --- | --- |
| priyadharshini (S1) | Blockchain Lead | Smart contracts, chain architecture |
| Amber (S2) | ML/AI Lead | Federated learning, recommendation model |
| Siddhartha (S3) | Backend Lead | APIs, data pipeline, integration |
| Rishu Kishan (S4) | Frontend/Research Lead | Dataset exploration, map UI, feasibility/research documentation |

## 3. System Architecture

TrustChain is split into four isolated but compatible modules:

1. Blockchain layer for tokens, user registry, and later staking and PoR logic.
2. Federated learning layer for recommendation training on distributed client data.
3. Backend layer for REST APIs, blockchain calls, and off-chain metadata.
4. Frontend layer for map-based visualization and user interaction.

This modular design keeps each component individually testable before integration.

## 4. Platforms, APIs, and Tech Stack

### 4.1 Blockchain

- Tech stack: Solidity, Hardhat, ethers.js
- Deployment path: local Hardhat testnet first, then optional public testnet later
- Core contracts: TrustToken, UserRegistry, StakingContract

### 4.2 Federated Learning

- Tech stack: Python, Flower, scikit-learn or PyTorch
- Deployment path: local simulation with 3 client nodes
- Baseline model: collaborative filtering for POI rating prediction

### 4.3 Backend API

- Tech stack: Node.js or FastAPI, ethers.js, MongoDB
- Deployment path: Render or Railway for a lightweight server deployment
- Planned routes: `/checkin`, `/review`, `/recommend`, `/token-balance`

### 4.4 Frontend

- Tech stack: React, Leaflet, plain CSS
- Deployment path: Vercel or Netlify
- UI goals: map view, check-in button, token balance display, dataset-driven markers

## 5. Dataset Choice

The selected dataset is the Foursquare NYC check-in dataset.

Why it fits the project:

- It is spatially rich and easy to visualize on a map.
- It has enough volume to support recommendation and sparsity analysis.
- It is manageable for a semester project without specialized infrastructure.
- It supports both frontend exploration and federated-learning-style experiments.

### 5.1 Dataset Characteristics

- Check-ins: 227,428
- Users: 1,083
- Venues: 9,008
- Venue categories: 9
- Time window: April 2012 to February 2013

### 5.2 Sparsity Implication

The dataset is highly sparse, which is expected for mobility and POI recommendation problems. That sparsity justifies a federated setup and makes privacy-preserving training a relevant direction for later phases.

## 6. Map Library Choice

Leaflet is the preferred map library for the frontend.

Reasons:

- it is open source and lightweight
- it works well with local GeoJSON or POI JSON data
- it avoids map API billing and key management overhead
- it is sufficient for a clean proof-of-concept interface

## 7. Data Flow

1. The raw NYC check-in file is cleaned in Python.
2. A processed CSV is stored for analysis and ML use.
3. A frontend-ready POI JSON sample is loaded by the React app.
4. The map renders the POIs as markers and supports a simple check-in action.

## 8. Feasibility Risks and Mitigation

- Data sparsity: start with a baseline collaborative filtering model and evaluate against simple metrics.
- Integration complexity: keep module boundaries strict and use isolated test fixtures.
- Blockchain overhead: store only small trust-related payloads on chain and keep metadata off chain.
- Frontend complexity: use local static data first, then connect live data in the integration sprint.

## 9. Conclusion

The TrustChain stack is feasible with open-source tools, a realistic dataset, and a phased delivery plan. The chosen platforms and APIs support a local-first build that can be expanded into an integrated demo later.