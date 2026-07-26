# TrustChain Smart Contracts

This directory contains all Solidity smart contract development tasks for the TrustChain project. Each task builds on the previous one, evolving from basic token mechanics to a fully audited, gas-optimised, upgradeable contract suite.

---

## Task Overview

| Task | Directory | Description | Status |
|---|---|---|---|
| Task 1 | *(overview only)* | Feasibility study & architecture design | ✅ Complete |
| Task 2 | `trustchain-task2-s1/` | Core token + staking contracts (Hardhat + Mocha tests) | ✅ Complete |
| Task 3 | `trustchain-task3-s1/` | Full 3-contract suite + deploy script + live backend integration | ✅ Complete |
| Task 4 | `trustchain-task4/` | Gas optimisation + events + advanced test coverage | ✅ Complete |
| Task 5 | `trustchain-task5-s1/` | Internal security audit + Slither analysis | ✅ Complete |
| Task 6 | `trustchain-task6-s1/` | Production hardening: upgradability, role-based access, re-audit | ✅ Complete |

---

## Deployed Contracts (Localhost / Hardhat)

After running `npx hardhat run scripts/deploy.js --network localhost` inside `trustchain-task3-s1/`, the following addresses are written to `trustchain-task3-s1/deployments/localhost.json`:

| Contract | Address (Hardhat) |
|---|---|
| `TrustToken` | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| `UserRegistry` | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` |
| `StakingContract` | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` |

> Deployer (Hardhat Account 0): `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`

---

## Quick Start

### Prerequisites
```bash
node --version   # 18+
npm --version    # 9+
```

### Install & Test (Task 3 — live integration target)
```bash
cd trustchain-task3-s1
npm install
npx hardhat test          # run all 40+ unit tests
npx hardhat coverage      # coverage report
```

### Start Local Node & Deploy
```bash
# Terminal 1 — start node
npx hardhat node --port 8545

# Terminal 2 — deploy contracts
npx hardhat run scripts/deploy.js --network localhost
# → writes deployments/localhost.json (used by Go backend)
```

---

## Contract Architecture

```
TrustToken (ERC-20)
  ├─ mint(address, uint256)     ← only authorised controllers
  ├─ burn(address, uint256)     ← only authorised controllers
  ├─ balanceOf(address)         ← public view
  └─ setController(address, bool) ← only owner

UserRegistry
  ├─ registerUser()             ← self-registration
  ├─ checkIn(bytes32)           ← onlyRegistered; emits CheckInRecorded
  ├─ isRegistered(address)      ← public view
  └─ getUserStats(address)      ← returns (checkins, lastTimestamp)

StakingContract
  ├─ stake(uint256)             ← locks TRUST tokens
  ├─ unstake(uint256)           ← releases after lock period
  ├─ getStake(address)          ← public view
  └─ claimRewards()             ← distributes accumulated rewards
```

### Reward Flow
```
User checks in at POI
  → frontend POST /api/v1/checkin
  → Go backend: UserRegistry.checkIn(bytes32) [tx on-chain]
  → Go backend: TrustToken.mint(user, 10 TRUST) [reward]
  → Frontend polls /api/v1/token-balance every 10s
  → UI shows updated balance
```

---

## Testing

All tests use [Hardhat](https://hardhat.org/) + Chai/Mocha.

```bash
cd trustchain-task3-s1
npx hardhat test --reporter verbose
```

Key test suites:
- `TrustToken` — minting, burning, controller access, edge cases
- `UserRegistry` — registration, check-in, replay detection, modifiers
- `StakingContract` — stake/unstake, lock period enforcement, reward calculation

---

## Security

- **Task 5** (`trustchain-task5-s1/`) contains the initial security audit report (`SECURITY_AUDIT.md`) and Slither findings.
- **Task 6** (`trustchain-task6-s1/`) contains the hardened contracts with:
  - OpenZeppelin `Ownable2Step` and `AccessControl`
  - `ReentrancyGuard` on all state-changing external functions
  - Upgradeable proxy pattern (`UUPSUpgradeable`)
  - Final re-audit in `SECURITY_AUDIT.md`

---

## Files

```
contracts/
├── readme.md                                    ← this file
├── TrustChain_Task1_Overview_and_Feasibility.md ← architecture & feasibility study
├── trustchain-task2-s1/                         ← initial contract suite
├── trustchain-task3-s1/                         ← live integration target
│   ├── contracts/
│   │   ├── TrustToken.sol
│   │   ├── UserRegistry.sol
│   │   └── StakingContract.sol
│   ├── scripts/deploy.js                        ← writes deployments/localhost.json
│   ├── test/                                    ← 40+ Hardhat tests
│   └── deployments/localhost.json               ← generated; used by Go backend
├── trustchain-task4/                            ← gas-optimised version
├── trustchain-task5-s1/                         ← security audit
└── trustchain-task6-s1/                         ← production-hardened
    ├── contracts/                               ← upgradeable + RBAC
    ├── SECURITY_AUDIT.md
    └── SMART_CONTRACT_APPENDIX.md
```
