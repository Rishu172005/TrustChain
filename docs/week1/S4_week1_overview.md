# TrustChain S4 - Week 1 Overview (1 June to 5 June)

## Objective

Build a clear conceptual understanding of federated learning, blockchain, and the overall project feasibility before implementation.

## Federated Learning Overview

Federated learning (FL) is a distributed training method where model training happens on local client data, and only model updates are shared with a central server for aggregation. Raw user data does not leave the client side.

Why it matters for TrustChain:

- User check-in behavior is privacy sensitive.
- FL supports collaborative model improvement without centralizing raw activity data.
- Federated averaging (FedAvg) is a practical baseline for a first version of POI recommendation.

Expected FL flow in this project:

1. Local clients train recommendation model updates using their own interaction data.
2. Server aggregates updates into a global model.
3. Global model is redistributed for the next round.

## Blockchain Overview

Blockchain is used as a trust and audit layer for tokenized incentives and verifiable actions.

Why it matters for TrustChain:

- Smart contracts provide transparent token rules (mint, burn, transfer).
- User registrations and check-in hashes can be tamper-evident.
- Business staking logic can support anti-spam and trust-weighted incentives.

Expected contract set in this project:

- TrustToken (ERC-20): reward and utility token.
- UserRegistry: user registration and check-in hash references.
- StakingContract: business participation and stake commitments.

## Feasibility Assessment

### Technical Feasibility

- Dataset: Foursquare NYC has enough scale and location structure for map-based recommendation workflows.
- Frontend: React plus Leaflet supports fast prototyping with no map API key dependency.
- Backend: REST APIs can bridge blockchain state and off-chain metadata.
- FL: Flower-based simulation with multiple clients is feasible for academic demonstration.

### Resource Feasibility

- Development stack is open-source and accessible.
- Team split by role allows parallel component development.
- Local-first setup (Hardhat, local API server, local FL simulation) reduces deployment blockers.

### Risk Feasibility

Main risks and mitigations:

- Data sparsity in check-ins: use robust baselines and evaluate over multiple rounds.
- Cross-component integration issues: define API and data contracts early.
- Blockchain transaction overhead: keep on-chain payloads minimal; store heavy metadata off-chain.

## Week 1 Conclusion

The project is feasible for phased delivery. A modular architecture with isolated component testing is the correct strategy before full integration.