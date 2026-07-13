**[Task 1: Week 1^st^ June -5^th^ June]{.mark}**

Get an overview of federated learning, blockchain and the feasibility
study of the project.

**[Task 2: Week 8^st^ June -12^th^ June]{.mark}**

1\. Discuss and assign these roles among yourselves and let me know who
is opting for what. **(Fill your respective name in place of S1, S2,
etc...).**

**Remember: It's a team project; you might be required to work in
collaboration to complete the different components. Remain available to
discuss with each other**

| Student | Role | Focus | Status |
| --- | --- | --- | --- |
| priyadharshini (S1) | Blockchain Lead | Smart contracts, chain architecture | Confirmed |
| Amber (S2) | ML/AI Lead | Federated learning, recommendation model | Confirmed |
| Siddhartha (S3) | Backend Lead | APIs, data pipeline, integration | Confirmed |
| Rishu Kishan (S4) | Frontend/Research Lead | Dataset exploration, map UI, feasibility/research documentation | Completed |

2\. Set up: GitHub repo; also discuss what platforms you are going to
use to deploy your parts. Provide me with the complete feasibility
study, including these platforms/APIs, tech stacks, etc. Include the
following: Dataset you will be using, tech stack

3\. **Goal:** Everyone understands the full system, tech stack is set
up, research gaps are identified.

4\. **Goal:** Each core component is built in isolation, individually
testable.

**S1 --- Smart Contracts**

-   Write the TrustToken ERC-20 contract (mint, burn, transfer)

-   Write the UserRegistry contract (register users, store check-in
    hashes)

-   Write basic StakingContract for businesses

-   Deliverable: All 3 contracts deployed on local Hardhat testnet with
    passing unit tests

**S2 --- Federated Learning Module**

-   Set up Flower server + 3 simulated client nodes

-   Implement a basic collaborative filtering model (predict POI
    ratings)

-   Train locally, aggregate with FedAvg, evaluate global model accuracy

-   Deliverable: FL pipeline that improves model accuracy across 5
    rounds

**S3 --- Backend API**

-   Design REST API: /checkin, /review, /recommend, /token-balance

-   Connect backend to local blockchain using ethers.js

-   Set up MongoDB for off-chain metadata (POI names, descriptions,
    coordinates)

-   Deliverable: API endpoints returning mock data + 2 endpoints
    connected to blockchain

**S4 --- Frontend + Dataset**

-   Download and explore Foursquare NYC or Gowalla dataset

-   Build basic React app: map view (Mapbox/Leaflet), check-in button,
    token balance display

-   Deliverable: Map showing POI markers from dataset + basic UI shell

-   Status: Completed by Rishu Kishan (S4) — frontend map pipeline verified, dataset integrated, and native local rendering validated.

-   Runtime note: The frontend can be started from `frontend/` with `npm install` and `npm run dev`; the app loads at `http://localhost:5173` (or the next available port if `5173` is occupied) and consumes `frontend/public/pois.json` plus `frontend/public/recommendations.json`. The frontend also builds cleanly with `npm run build`.

**[Task 3: Week 22^nd^ June -26^th^ June]{.mark}**

**Week 3 --- Integration Sprint**

**Goal:** All components talk to each other. End-to-end flow works for
one use case.

**Target flow to complete this week:**

User opens app → checks in at a POI → smart contract records it → tokens
awarded → FL model receives signal → updated recommendation appears on
map

**S1 + S3 (paired)**

-   Integrate smart contracts with backend API

-   When /checkin is called → trigger token mint on blockchain

-   Test: simulate 10 check-ins, verify token balances update correctly

**S2 + S4 (paired)**

-   Connect FL model output to the frontend recommendation feed

-   Map should show \"Recommended for You\" POIs based on FL model
    scores

-   Test: simulate 3 different user preference profiles, verify
    different recommendations appear
-   S4 contribution: completed by Rishu Kishan — recommendation feed and geospatial pin rendering verified locally.
**All Together (Day 13 --- Integration Day)**

-   Wire S1+S3 backend with S2+S4 frontend

-   Run the full end-to-end flow manually

-   Log every bug found --- create GitHub issues for each

**Deliverable (end of Week 3):** A working demo where a simulated user
can check in, earn tokens, and receive a recommendation. Buggy is fine
--- it just needs to run.

**[Task 4: Week 29^th^ June -3^rd^ July]{.mark}**

**Week 4 --- PoR Consensus + Polish (Days 16--20)**

**Goal:** Implement the novel PoR mechanism. Harden existing features.
Fix bugs.

**S1 --- PoR Smart Contract**

-   Design and implement the ProofOfRecommendation contract

-   Logic: recommendation submitted → validators vote → if consensus
    reached → reward tokens, log on chain

-   Implement basic slashing: if a review is flagged by 3+ validators →
    penalize submitter

-   Deliverable: PoR contract deployed, tested with simulated validator
    nodes

**S2 --- Anti-Gaming & Model Quality**

-   Add anomaly detection: flag users submitting too many check-ins per
    hour (bot detection)

-   Implement differential privacy (add noise to gradients before
    sharing)

-   Evaluate: compare recommendation quality with vs without DP ---
    measure accuracy drop

-   Deliverable: DP-enabled FL pipeline + bot detection logic

**S3 --- Performance & Security**

-   Add input validation and authentication (JWT) to all API routes

-   Stress test: simulate 1,000 check-ins --- how does the system
    behave?

-   Optimize slow queries in MongoDB

-   Deliverable: API handles 1,000 requests without crashing, all routes
    secured

**S4**

-   Add token wallet page, review submission form, recommendation
    explanation (\"Why was this recommended?\")

-   Write the README: setup guide, architecture diagram, API docs

-   Deliverable: Polished UI + complete project README
-   Status: Completed by Rishu Kishan (S4) — token wallet page, review submission form, and recommendation explanation panel implemented; frontend README and architecture documentation updated.
**Final Review: Full system demo run by the team together --- treat it
like a client demo.**

**[Task 5 (6th July -- 13th July)]{.mark}**

**Theme: Security, Geo-fencing & Adversarial Testing**

Harden the system against attacks, implement location-aware
recommendations, and stress-test the FL model against fake data.

**S1 --- GeoRecommender Contract + Security Audit**

-   Write the GeoRecommender smart contract --- takes a user\'s bounding
    box as integer-encoded coordinates and returns a filtered, ranked
    list of POI IDs within that area

-   Conduct a full security audit of all contracts written in Task 2--4.
    Specifically test for re-entrancy vulnerabilities in the
    RewardEngine and integer overflow in coordinate encoding

-   Fix every issue found and document what was found and how it was
    resolved

-   **[Target]{.mark} :** GeoRecommender deployed + security audit
    report

**S2 --- Adversarial FL Evaluation + DP Comparison Table**

-   Inject 15% fake check-ins into the dataset (random user-POI pairs
    with no real pattern) and measure whether the PoR mechanism
    successfully suppresses them from influencing recommendations

-   Finalize the differential privacy evaluation --- produce a clean
    comparison table showing Precision@10 and NDCG@10 across three
    variants: centralized, federated without DP, and federated with DP

-   **[Target]{.mark} :** Adversarial test results + DP comparison table
-   Status: Completed by Amber (S2) — adversarial evaluation, DP comparison documentation, and Task 6 finalization completed.

**S3 --- Mock Oracle Service + Latency Benchmarking**

-   Build a FastAPI endpoint (mock oracle) that takes a user location
    query, calls the FL model for predicted POI scores, signs the
    response, and submits it to the GeoRecommender contract --- this
    replaces Chainlink for the internship scope

-   Measure end-to-end latency for a full pipeline round trip and
    document where the bottlenecks are

-   **[Target]{.mark} :** Working oracle service + latency benchmark
    report
-   Status: Completed by Siddhartha (S3) — mock oracle endpoint, latency benchmarking, and Task 6 completion finalized.

**S4 --- Transparency UI Panel**

-   Add a \"Why was this recommended?\" explanation panel to the UI
    showing three scoring components separately: proximity score,
    community rating, and model score --- this is the key transparency
    feature that justifies using blockchain

-   Begin assembling the final report structure with section headings
    and placeholders

-   **[Target]{.mark} :** Transparency panel live in UI + report
    skeleton document
-   Status: Completed by Rishu Kishan (S4) — Tasks 2 through 6 are fully complete, including the transparency explanation panel, local report skeleton, frontend integration validation, and the detailed project README with setup, architecture, and API docs.
**[Target of this task:]{.mark}** Geo-fenced recommendations working
end-to-end. Security audit complete. Adversarial test results
documented.

**[Task 6 (14th July -- 18th July)]{.mark}**

**S1 --- Smart Contract Technical Appendix**

-   Write the technical appendix covering all smart contracts. For each
    contract: its purpose, key functions, gas cost per operation, and
    test coverage percentage

-   Aim for 100% test coverage across all contracts before writing the
    appendix

-   **Deliverable:** Complete smart contract appendix with gas cost
    table and coverage report

**S2 --- Final Evaluation Run**

-   Run the complete evaluation on the held-out 20% test set

-   Report Precision@5, Precision@10, Recall@10, and NDCG@10 across all
    three system variants (centralized, federated without DP, federated
    with DP)

-   Run a noise resilience test --- show the metric drop when fake
    check-ins are included versus when the PoR mechanism filters them
    out

-   **Deliverable:** Core results table of the report --- all evaluation
    numbers finalized

**S3 --- System Architecture Section + API Documentation**

-   Write the system architecture section of the report

-   Produce a clean architecture diagram in draw.io or Excalidraw
    showing how all five components connect

-   Document every API endpoint with input parameters, output format,
    and example calls

-   **Deliverable:** Architecture section + full API documentation

**S4 --- Full Report Assembly + Presentation Slides**

-   Assemble the complete report. Sections: Abstract, Introduction,
    Related Work, System Design, Implementation, Evaluation, Challenges
    and Limitations, Conclusion. **Target 20--24 pages**

**[Compile the final submission package: report PDF, code zip,
presentation PDF, and demo video]{.mark}**

-   **[Complete All the pending tasks by 21^st^ July. Then we will
    schedule the final demonstration and Q&A session.]{.mark}**
