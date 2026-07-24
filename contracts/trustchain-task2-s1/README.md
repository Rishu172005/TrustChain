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
