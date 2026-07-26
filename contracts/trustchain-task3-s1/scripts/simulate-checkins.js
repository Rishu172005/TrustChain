/**
 * Task 3 integration check (S1 + S3 paired deliverable):
 * "simulate 10 check-ins, verify token balances update correctly"
 *
 * Run against a live local Hardhat node (not the ephemeral test network),
 * exactly as the backend would in real usage:
 *
 *   1) npx hardhat node                                  (terminal 1 — leave running)
 *   2) npx hardhat run scripts/deploy.js --network localhost   (terminal 2)
 *   3) node scripts/simulate-checkins.js                       (terminal 2)
 */
const hre = require("hardhat");
const chain = require("../blockchain/contractService");

async function main() {
  // Hardhat's local node exposes the same 20 pre-funded dev accounts (and
  // matching private keys) every time it starts. hre.ethers.getSigners()
  // doesn't expose private keys directly, so we use the well-known,
  // deterministic Hardhat default keys — safe for local dev only, never
  // reuse these anywhere real funds are involved.
  const HARDHAT_DEFAULT_PRIVATE_KEYS = [
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690",
  ];
  const signers = await hre.ethers.getSigners();
  const simulatedUser = signers[1];
  const userPrivateKey = HARDHAT_DEFAULT_PRIVATE_KEYS[1]; // corresponds to signers[1]

  console.log(`Simulating check-ins for user: ${simulatedUser.address}`);

  await chain.registerUser(userPrivateKey);
  console.log("User registered.");

  for (let i = 0; i < 10; i++) {
    const poiId = `poi-${i}`;
    const timestamp = Math.floor(Date.now() / 1000) + i;
    const hash = chain.buildCheckInHash(simulatedUser.address, poiId, timestamp);

    const receipt = await chain.recordCheckIn(userPrivateKey, hash);
    console.log(`Check-in ${i + 1}/10 recorded — tx: ${receipt.hash}`);
  }

  const balance = await chain.getTokenBalance(simulatedUser.address);
  const count = await chain.getCheckInCount(simulatedUser.address);

  console.log(`\nFinal check-in count: ${count} (expected 10)`);
  console.log(`Final TRUST balance: ${balance} (expected 100, at 10 TRUST per check-in)`);

  if (count !== 10) throw new Error("Check-in count mismatch!");
  if (balance !== "100.0") throw new Error("Token balance mismatch!");

  console.log("\n✅ Integration check passed — balances update correctly across 10 check-ins.");
}

main().catch((error) => {
  console.error("❌ Integration check failed:", error);
  process.exitCode = 1;
});
