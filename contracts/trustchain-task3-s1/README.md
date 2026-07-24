# TrustChain — Task 2 Deliverable (S1: Smart Contracts)

Three contracts, each individually testable, per the Task 2 brief.

## Contracts

| Contract | File | Purpose |
|---|---|---|
| TrustToken | `contracts/TrustToken.sol` | ERC-20 reward token (mint, burn, transfer). Uses a `controllers` mapping so only authorized TrustChain contracts (UserRegistry, StakingContract, later PoR) can mint/burn. |
| UserRegistry | `contracts/UserRegistry.sol` | Registers users, records check-ins as hashes (not raw location data), mints a reward per check-in, blocks replayed hashes. |
| StakingContract | `contracts/StakingContract.sol` | Businesses stake TrustToken for visibility instead of buying ads; owner (later: PoR contract) can slash bad actors; includes re-entrancy protection. |

## Setup

```bash
npm install
```

## Compile

```bash
npx hardhat compile
```

## Run tests (local Hardhat testnet — spins up automatically)

```bash
npx hardhat test
```

All three contracts have their own test file under `test/`, covering:
- **TrustToken**: name/symbol, controller permissions, mint/burn access control, standard transfer
- **UserRegistry**: registration, duplicate registration blocked, check-in blocked for unregistered users, reward minted on check-in, replayed hash rejected, **10 simulated check-ins with balance verification** (per the Task 2 deliverable requirement)
- **StakingContract**: stake/unstake flow, visibility threshold, insufficient-balance revert, owner-only slashing

## Notes for integration (S3 — Backend Lead)

- Deploy `TrustToken` first, then `UserRegistry` and `StakingContract` (both take the TrustToken address in their constructor).
- After deployment, call `trustToken.setController(userRegistryAddress, true)` and `trustToken.setController(stakingContractAddress, true)` so those contracts can mint/burn.
- The backend's `/checkin` endpoint should compute a `keccak256` hash off-chain (e.g. of userId + poiId + timestamp + a salt) and call `UserRegistry.checkIn(hash)` — this is the connection point for Task 3's integration sprint.
- `StakingContract.stake()` requires the business to first call `trustToken.approve(stakingContractAddress, amount)` — standard ERC-20 approve/transferFrom pattern.

## Known limitation in this sandbox

Contracts were written and unit-tested logically against Hardhat's standard toolchain, but this sandboxed environment blocks the Solidity compiler binary download (`binaries.soliditylang.org` isn't reachable), so `compile`/`test` couldn't be executed here. Run the two commands above locally or in CI (e.g. GitHub Actions) to get the passing test output for your deliverable.

---

# Task 3 — Integration Sprint (S1 + S3 paired)

**Goal:** `/checkin` API call → smart contract records it → tokens minted, verified with a 10-check-in simulation.

## What's new in this delivery
- `hardhat.config.js` — added a `localhost` network (persistent local node, not the ephemeral in-memory test network) so the backend has something stable to connect to.
- `scripts/deploy.js` — deploys all 3 contracts, wires up controllers, and writes `deployments/localhost.json` with addresses + ABIs.
- `blockchain/contractService.js` — the module S3 imports into the Express API. Wraps `registerUser`, `checkIn`, `token-balance`, `checkin-count` behind plain functions.
- `scripts/simulate-checkins.js` — runs the Task 3 required test: simulates 10 check-ins, verifies the token balance and check-in count update correctly.

## Important architecture note (read before wiring the real route)
`UserRegistry.registerUser()` and `checkIn()` both key off `msg.sender` — whoever signs the transaction is who gets credited. That means the backend **cannot** call these functions "on behalf of" an arbitrary user address unless it holds that user's private key. Two ways to handle it — decide with S3 which fits the demo:

- **(A) Real wallet flow:** the frontend has the user's own wallet sign `registerUser`/`checkIn` directly; the backend only reads balances/counts afterward.
- **(B) Simulated flow (what Task 3's test uses):** for local dev/demo purposes, "simulated users" are Hardhat's pre-funded local accounts, and whichever script or route is acting as that user signs with that account's own key.

`contractService.js` is built for (B) so the integration test can run standalone; swapping to (A) later just means the private key comes from the connected wallet instead of a hardcoded dev key.

## How to run the full integration check

```bash
# Terminal 1 — start a persistent local blockchain
npx hardhat node

# Terminal 2
npm install
npx hardhat run scripts/deploy.js --network localhost
node scripts/simulate-checkins.js
```

Expected output ends with:
```
Final check-in count: 10 (expected 10)
Final TRUST balance: 100.0 (expected 100, at 10 TRUST per check-in)

✅ Integration check passed — balances update correctly across 10 check-ins.
```

## For S3: wiring the actual `/checkin` route
```js
const chain = require("../blockchain/contractService");

app.post("/checkin", async (req, res) => {
  const { userPrivateKey, poiId } = req.body; // see architecture note above re: signing
  const signer = new ethers.Wallet(userPrivateKey);
  const timestamp = Math.floor(Date.now() / 1000);
  const hash = chain.buildCheckInHash(signer.address, poiId, timestamp);
  const receipt = await chain.recordCheckIn(userPrivateKey, hash);
  res.json({ txHash: receipt.hash });
});
```

**Same sandbox limitation as before:** I can't run a live Hardhat node inside this environment (needs the Solidity compiler + a long-running background process this sandbox doesn't support), so this hasn't been executed end-to-end on my side. Run the two-terminal steps above locally before your integration day — that's the actual proof this works.
