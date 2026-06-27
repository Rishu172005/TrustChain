# TrustChain S4: Week 1 and Week 2 Completion Notes

This document captures the completed S4 scope for Week 1 and Week 2: the research foundation, the team split, the feasibility study, and the frontend + dataset deliverable.

## Task 1: Week 1 Overview

### Objective

Build a clear conceptual understanding of federated learning, blockchain, and the overall project feasibility before implementation.

### Federated Learning

Federated learning is the training strategy chosen for the recommendation module because it allows model updates to be learned from distributed client data without moving raw interaction data into one central store.

Why it fits TrustChain:

- Check-in and recommendation behavior is privacy sensitive.
- Local training supports personalization without exposing raw usage data.
- FedAvg gives the team a practical baseline for a first version of POI recommendation.

### Blockchain

Blockchain is used as the trust and audit layer for tokenized incentives and verifiable actions.

Why it fits TrustChain:

- Smart contracts provide transparent token rules such as mint, burn, and transfer.
- User registration and check-in hashes can be stored as tamper-evident records.
- Business staking logic can support anti-spam and trust-weighted incentives.

### Feasibility Summary

- The Foursquare NYC dataset is large enough to support meaningful spatial and mobility analysis.
- React plus Leaflet is sufficient for a clean map-based prototype without API key overhead.
- Hardhat, Flower, MongoDB, and ethers.js cover the full stack without requiring paid infrastructure.
- The system can be built in isolated pieces first and integrated later with lower risk.

### Week 1 Outcome

The project architecture is feasible, the core technologies are compatible, and the team has a clear direction for implementation and integration.

## Task 2: Week 2 Assignment and Setup

### Team Roles

| Student | Role | Focus |
| --- | --- | --- |
| priyadharshini (S1) | Blockchain Lead | Smart contracts, chain architecture |
| Amber (S2) | ML/AI Lead | Federated learning, recommendation model |
| Siddhartha (S3) | Backend Lead | APIs, data pipeline, integration |
| Rishu Kishan (S4) | Frontend/Research Lead | Dataset exploration, map UI, feasibility/research documentation |

### Repository and Platform Setup

- Repository structure is organized into `contracts`, `federated`, `backend`, `frontend`, `data`, `docs`, and `notebooks`.
- Blockchain development uses a local Hardhat testnet.
- Smart contract interaction is planned through `ethers.js`.
- Backend deployment candidates are Render or Railway.
- Frontend deployment candidates are Vercel or Netlify.
- Federated learning runs locally with Flower and simulated client nodes.
- Map rendering uses Leaflet with OpenStreetMap tiles.

### Dataset and Tech Stack

- Dataset: Foursquare NYC check-ins.
- Backend stack: Node.js or FastAPI, MongoDB, ethers.js.
- Frontend stack: React, Leaflet, CSS modules or plain CSS.
- ML stack: Python, Flower, scikit-learn or PyTorch.
- Blockchain stack: Solidity, Hardhat.

### Feasibility Study Focus

The feasibility study covers:

- Dataset suitability and sparsity.
- Deployment options and local development workflow.
- API boundaries between the frontend, backend, blockchain, and FL module.
- Research gaps such as cold start behavior, recommendation quality under sparse interaction, and privacy trade-offs.

### Week 2 Outcome

The team roles are assigned, the stack is fixed, the dataset choice is confirmed, and each core module can be developed and tested in isolation.