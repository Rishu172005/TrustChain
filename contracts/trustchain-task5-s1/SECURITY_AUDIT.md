# TrustChain — Smart Contract Security Audit Report
**Scope:** TrustToken, UserRegistry, StakingContract, ProofOfRecommendation, GeoRecommender (Tasks 2–5)
**Auditor:** S1 (Blockchain Lead) — internal self-audit ahead of Task 5 submission
**Focus areas requested:** re-entrancy vulnerabilities, integer overflow in coordinate encoding

---

## 1. Re-entrancy Review

**What it is:** a re-entrancy attack happens when a contract makes an external call to another contract *before* finishing its own state updates. A malicious callee can call back into the original function mid-execution and repeat an action (e.g. a withdrawal) before the first call's state change has been recorded — this is the bug that caused the 2016 DAO hack (~$60M drained).

### Findings

| # | Contract / Function | Finding | Severity | Status |
|---|---|---|---|---|
| 1 | `StakingContract.stake()` / `unstake()` | Already followed checks-effects-interactions (balance updated *before* the external `transferFrom`/`transfer` call) and already had `nonReentrant`. | None | ✅ No action needed |
| 2 | `UserRegistry.checkIn()` | Followed checks-effects-interactions correctly (hash marked used, check-in recorded *before* calling `trustToken.mint()`), but had **no explicit `ReentrancyGuard`**. Practical risk is low since `TrustToken` is a trusted, team-controlled contract with no external calls of its own inside `mint()` — but relying on "the callee happens to be trustworthy" instead of an explicit guard is a weak invariant to leave undocumented. | Low (defense-in-depth) | ✅ **Fixed** — added `ReentrancyGuard`, applied `nonReentrant` to `checkIn()` |
| 3 | `ProofOfRecommendation.vote()` | Same pattern as #2: state (`hasVoted`, vote counts, `status`) updated before the external `trustToken.mint()`/`burnFrom()` calls in `_confirm`/`_flag`, but no explicit guard. | Low (defense-in-depth) | ✅ **Fixed** — added `ReentrancyGuard`, applied `nonReentrant` to `vote()` |
| 4 | `TrustToken.mint()` / `burnFrom()` | Only callable by authorized `controllers` (other TrustChain contracts), and OpenZeppelin's underlying `_mint`/`_burn` contain no external calls. Not a re-entrancy vector into TrustToken itself. | None | ✅ No action needed |

**Conclusion:** No re-entrancy vulnerability was exploitable as written, because every state-changing function updates its own storage before making any external call. Findings #2 and #3 were about **defense-in-depth** rather than an active exploit path — a future contract upgrade or a controller being pointed at an untrusted address would otherwise remove the safety net silently. Both are now fixed with explicit `ReentrancyGuard`.

---

## 2. Integer Overflow — Coordinate Encoding (`GeoRecommender`)

**What it is:** arithmetic that exceeds a variable's storage range either reverts (Solidity ≥0.8, our compiler target) or silently wraps around (Solidity <0.8, or inside an `unchecked` block). Solidity 0.8.24 (used throughout this project) reverts automatically on overflow/underflow, which removes the classic "wraps to a tiny/huge number" bug class by default.

### Findings

| # | Issue | Severity | Status |
|---|---|---|---|
| 1 | Built-in overflow protection alone does **not** stop a caller from registering a coordinate that fits comfortably inside `int256` but is **logically nonsensical** — e.g. `lat = 999999 * COORD_SCALE` (nowhere on Earth). This isn't an "overflow" in the strict wraparound sense, but it's the real-world failure mode of unchecked coordinate encoding: bad data corrupting the bounding-box query results. | Medium | ✅ **Fixed** — added explicit `require()` range checks in `registerPOI()`: `MIN_LAT`/`MAX_LAT` (±90°) and `MIN_LNG`/`MAX_LNG` (±180°), scaled by `COORD_SCALE`. |
| 2 | Using a signed `int256` (not `uint256`) for lat/lng was a deliberate design choice, not a bug — latitude/longitude both have legitimate negative values (southern/western hemispheres). Using an unsigned type here would have made every southern/western coordinate underflow-revert immediately, which would itself have been a bug. Flagged here as a documented design decision so it isn't mistaken for an oversight later. | Informational | ✅ No action needed — confirmed correct as designed |
| 3 | `getRecommendations()`'s bounding-box comparisons (`minLat <= maxLat`, etc.) use the same signed-range-validated values, so no additional overflow surface was introduced by the ranking logic itself. | None | ✅ No action needed |

**Conclusion:** the real risk in coordinate encoding wasn't classic integer overflow (Solidity 0.8.24 already prevents that), it was **unvalidated input ranges** producing logically invalid but numerically "valid" coordinates. Fixed with explicit bounds checks.

---

## 3. Other Issues Noted During Review (not in the original two focus areas)

| # | Contract | Finding | Severity | Status |
|---|---|---|---|---|
| 1 | `TrustToken` | A single `owner` address has unilateral power to add/remove controllers (i.e., grant any contract mint/burn rights). Appropriate for an internship prototype on a local testnet, but a real deployment should move this to a multisig or timelock before holding real value. | Low (prototype scope) | 📋 Documented, not fixed — recommend addressing post-internship if the project continues |
| 2 | `ProofOfRecommendation` | `consensusThreshold` and `flagThreshold` are owner-adjustable via `setParameters()` with no upper/lower sanity bound beyond `> 0`. An owner could technically set `flagThreshold = 1`, making the system trivially game-able by a single hostile "validator." Not exploitable by an outside attacker (owner-only), but worth a policy note. | Low | 📋 Documented, not fixed — recommend a minimum threshold constant (e.g. ≥3) if time allows in Task 6 |
| 3 | `StakingContract.slash()` | Currently owner-only. The project brief implies slashing should eventually be triggered by the PoR consensus mechanism itself rather than a human. | Informational | 📋 Design note for future integration — wire `StakingContract.slash()` as PoR-controller-callable if business-submitted recommendations need staking-based penalties |

---

## 4. Test Coverage Added for This Audit

- `GeoRecommender.test.js` includes a dedicated test asserting out-of-range lat/lng registrations revert (`"lat out of range"` / `"lng out of range"`), directly verifying Finding 2.1's fix.
- Existing `UserRegistry.test.js` and `ProofOfRecommendation.test.js` continue to pass with `nonReentrant` added — confirms the guards don't break the already-tested check-in and voting flows.

## 5. Summary

| Severity | Count | Fixed |
|---|---|---|
| Medium | 1 | 1 |
| Low | 4 | 2 (2 documented for later) |
| Informational | 2 | N/A (design confirmations) |

No high or critical severity issues were found. The two focus areas requested (re-entrancy, coordinate integer handling) were both reviewed in depth; re-entrancy had no live exploit path but received defense-in-depth hardening, and coordinate encoding's real risk (unvalidated ranges, not classic overflow) was fixed with explicit bounds checks.

**Caveat:** this is a self-audit performed by the same person who wrote the contracts, using manual review — not an automated tool (e.g. Slither, Mythril) or an independent third-party auditor. For anything beyond an internship prototype, an independent audit and automated static analysis would be the next step before any real deployment.
