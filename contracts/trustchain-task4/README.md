# TrustChain — Task 4 (S1): PoR Consensus Contract

Week 4 deliverable for S1 (Blockchain Lead): the ProofOfRecommendation (PoR)
smart contract — TrustChain's novel consensus mechanism — plus its test suite
and deployment/simulation scripts.

## What's included

- `contracts/ProofOfRecommendation.sol` — the PoR contract:
  - `submitRecommendation(bytes32 contentHash)` — anyone can submit a
    recommendation, identified only by a hash (raw content stays off-chain).
  - `vote(id, approve, flag)` — registered validators vote. `approve` and
    `flag` are tracked independently.
  - Once **3 validators approve**, the recommendation is marked `Approved`
    and the submitter is minted `rewardAmount` TRUST (default 10 TRUST).
  - Once **3 validators flag** a recommendation, it's marked `Flagged` and
    the submitter is slashed `penaltyAmount` TRUST (default 5 TRUST) via
    `TrustToken.burn`. If the submitter's balance can't cover the penalty,
    the flag still lands on-chain (the burn attempt is wrapped in try/catch
    so one broke bad actor can't block the flag from being recorded).
  - Validators and thresholds/amounts are owner-managed for this MVP scope.
- `contracts/mocks/MockTrustToken.sol` — a minimal ERC-20 with the same
  controller-gated `mint`/`burn` pattern as the real TrustToken from Task 2,
  used so PoR can be built and tested **in isolation**, per the Task 2 brief's
  "each core component built in isolation, individually testable" goal.
- `test/ProofOfRecommendation.test.js` — covers: validator management,
  submission, the full approval→reward path, the full flag→slash path
  (including the case where the submitter can't cover the penalty), multiple
  concurrent recommendations from different submitters, and admin controls.
- `scripts/deploy-por.js` — deploys PoR against your **existing** TrustToken
  deployment (reads `deployments/<network>.json` from the Task 3 deploy
  script, or `TRUST_TOKEN_ADDRESS` env var), and attempts to auto-register PoR
  as a controller on TrustToken.
- `scripts/simulate-por-consensus.js` — spins up 4 simulated validator nodes,
  runs one recommendation through the approval path and one through the
  flagging path, and prints the resulting statuses — this is the "tested with
  simulated validator nodes" deliverable target.

## Setup

```bash
npm install
npx hardhat compile
npx hardhat test
```

I could not run these inside this sandbox — network access to download the
Solidity compiler is blocked here — so **you need to run the three commands
above locally** and confirm everything passes before treating this as done,
same caveat as Task 2 and Task 3.

## Deploying against your existing TrustToken

This package assumes you already have TrustToken deployed locally (from
Task 2/3) and a `deployments/localhost.json` file with its address, written
in the shape `{ "TrustToken": { "address": "0x..." } }`. If your Task 3
deploy script wrote a different shape, either adjust that file or just set
the address directly:

```bash
# two-terminal flow, same as before
# terminal 1
npx hardhat node

# terminal 2
TRUST_TOKEN_ADDRESS=0xYourTrustTokenAddress npx hardhat run scripts/deploy-por.js --network localhost
npx hardhat run scripts/simulate-por-consensus.js --network localhost
```

## One integration detail to flag to your team (not a bug — a design choice)

`deploy-por.js` tries to call `TrustToken.addController(porAddress)`
automatically, assuming your real `TrustToken.sol` exposes an owner-only
`addController(address)` function (that's the pattern described for Task 2).
**If your actual TrustToken uses a different function name for authorizing
controllers**, the auto-registration will fail gracefully and print a warning
— you'll need to call whatever the real function is called, once, before
`vote()` can mint rewards or burn penalties. This is exactly the kind of
small integration seam Day 13 (Integration Day) is meant to catch.

## Validator model for this MVP

Validators are added by the contract owner (`addValidator`/`removeValidator`)
rather than being permissionless/staked. That matches the internship scope —
"tested with simulated validator nodes" — but is worth a line in your report's
Challenges/Limitations section: a production PoR system would likely tie
validator eligibility to staked TRUST (reusing the StakingContract from
Task 2) so validators have skin in the game too.

## Status

- Contract logic: complete, matches the Task 4 S1 brief (consensus reward +
  basic slashing on 3+ flags).
- Tests: written, covering the required scenarios — **unverified**, same
  caveat as every prior task: run them locally.
- Deployment: scripted but **not executed end-to-end** on my side (sandbox
  network restriction). Verify locally before calling Task 4 done.
