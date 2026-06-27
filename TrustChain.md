# Task 1: Week 1st June -5th June

Get an overview of federated learning, blockchain and the feasibility study of the project.

# Task 2: Week 8st June -12th June

1. Discuss and assign these roles among yourselves and let me know who is opting for what. (Fill your respective name in place of S1, S2, etc…).

Remember: It’s a team project; you might be required to work in collaboration to complete the different components. Remain available to discuss with each other.

 Student | Role | Focus | Status |
| --- | --- | --- | --- |
| priyadharshini (S1) | Blockchain Lead | Smart contracts, chain architecture | Confirmed |
| Amber (S2) | ML/AI Lead | Federated learning, recommendation model | Confirmed |
| Siddhartha (S3) | Backend Lead | APIs, data pipeline, integration | Confirmed |
| Rishu Kishan (S4) | Frontend/Research Lead | Dataset exploration, map UI, feasibility/research documentation | Completed |


2. Set up: GitHub repo; also discuss what platforms you are going to use to deploy your parts. Provide me with the complete feasibility study, including these platforms/APIs, tech stacks, etc. Include the following: Dataset you will be using, tech stack.

3. Goal: Everyone understands the full system, tech stack is set up, research gaps are identified.

4. Goal: Each core component is built in isolation, individually testable.

S1 — Smart Contracts

- Write the TrustToken ERC-20 contract (mint, burn, transfer)
- Write the UserRegistry contract (register users, store check-in hashes)
- Write basic StakingContract for businesses
- Deliverable: All 3 contracts deployed on local Hardhat testnet with passing unit tests

S2 — Federated Learning Module

- Set up Flower server + 3 simulated client nodes
- Implement a basic collaborative filtering model (predict POI ratings)
- Train locally, aggregate with FedAvg, evaluate global model accuracy
- Deliverable: FL pipeline that improves model accuracy across 5 rounds

S3 — Backend API

- Design REST API: /checkin, /review, /recommend, /token-balance
- Connect backend to local blockchain using ethers.js
- Set up MongoDB for off-chain metadata (POI names, descriptions, coordinates)
- Deliverable: API endpoints returning mock data + 2 endpoints connected to blockchain

S4 — Frontend + Dataset

- Download and explore Foursquare NYC or Gowalla dataset
- Build basic React app: map view (Mapbox/Leaflet), check-in button, token balance display
- Deliverable: Map showing POI markers from dataset + basic UI shell

# Task 3: Week 22nd June -26th June

Week 3 — Integration Sprint

Goal: All components talk to each other. End-to-end flow works for one use case.

Target flow to complete this week:

User opens app → checks in at a POI → smart contract records it → tokens awarded → FL model receives signal → updated recommendation appears on map

S1 + S3 (paired)

- Integrate smart contracts with backend API
- When /checkin is called → trigger token mint on blockchain
- Test: simulate 10 check-ins, verify token balances update correctly

S2 + S4 (paired)

- Connect FL model output to the frontend recommendation feed
- Map should show "Recommended for You" POIs based on FL model scores
- Test: simulate 3 different user preference profiles, verify different recommendations appear

All Together (Day 13 — Integration Day)

- Wire S1+S3 backend with S2+S4 frontend
- Run the full end-to-end flow manually
- Log every bug found — create GitHub issues for each
- Deliverable (end of Week 3): A working demo where a simulated user can check in, earn tokens, and receive a recommendation. Buggy is fine — it just needs to run.

# Task 4: Week 29th June -3rd July

Week 4 — PoR Consensus + Polish (Days 16–20)

Goal: Implement the novel PoR mechanism. Harden existing features. Fix bugs.

S1 — PoR Smart Contract

- Design and implement the ProofOfRecommendation contract
- Logic: recommendation submitted → validators vote → if consensus reached → reward tokens, log on chain
- Implement basic slashing: if a review is flagged by 3+ validators → penalize submitter
- Deliverable: PoR contract deployed, tested with simulated validator nodes

S2 — Anti-Gaming & Model Quality

- Add anomaly detection: flag users submitting too many check-ins per hour (bot detection)
- Implement differential privacy (add noise to gradients before sharing)
- Evaluate: compare recommendation quality with vs without DP — measure accuracy drop
- Deliverable: DP-enabled FL pipeline + bot detection logic

S3 — Performance & Security

- Add input validation and authentication (JWT) to all API routes
- Stress test: simulate 1,000 check-ins — how does the system behave?
- Optimize slow queries in MongoDB
- Deliverable: API handles 1,000 requests without crashing, all routes secured

S4

- Add token wallet page, review submission form, recommendation explanation ("Why was this recommended?")
- Write the README: setup guide, architecture diagram, API docs
- Deliverable: Polished UI + complete project README

Final Review: Full system demo run by the team together — treat it like a client demo.
