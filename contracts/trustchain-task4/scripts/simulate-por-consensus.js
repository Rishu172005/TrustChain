const { ethers } = require("hardhat");

/**
 * Simulates several validator nodes reaching consensus on recommendations —
 * one approved (rewarded), one flagged (slashed) — against a locally deployed
 * PoR contract. Mirrors the "tested with simulated validator nodes" deliverable.
 *
 * Usage:
 *   Terminal 1: npx hardhat node
 *   Terminal 2: npx hardhat run scripts/deploy-por.js --network localhost
 *               npx hardhat run scripts/simulate-por-consensus.js --network localhost
 */
async function main() {
  const fs = require("fs");
  const path = require("path");
  const { network } = require("hardhat");

  const deploymentsPath = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error(`No deployments file found at ${deploymentsPath}. Run deploy-por.js first.`);
  }
  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  const porAddress = deployments.ProofOfRecommendation?.address;
  if (!porAddress) throw new Error("ProofOfRecommendation address missing from deployments file.");

  const [owner, submitter, v1, v2, v3, v4, badActor] = await ethers.getSigners();
  const por = await ethers.getContractAt("ProofOfRecommendation", porAddress);

  console.log("Registering 4 simulated validator nodes...");
  for (const v of [v1, v2, v3, v4]) {
    const tx = await por.connect(owner).addValidator(v.address);
    await tx.wait();
  }
  console.log(`Validator count: ${await por.validatorCount()}`);

  // --- Scenario 1: a genuine recommendation reaches consensus and is rewarded ---
  const goodHash = ethers.keccak256(ethers.toUtf8Bytes("poi-42:great-coffee-shop"));
  let tx = await por.connect(submitter).submitRecommendation(goodHash);
  let receipt = await tx.wait();
  console.log(`\nSubmitted genuine recommendation, id=0`);

  for (const v of [v1, v2, v3]) {
    tx = await por.connect(v).vote(0, true, false);
    await tx.wait();
  }
  let rec0 = await por.getRecommendation(0);
  console.log(`Recommendation 0 status: ${["Pending", "Approved", "Flagged"][rec0.status]}`);

  // --- Scenario 2: a fake recommendation gets flagged and the submitter slashed ---
  const fakeHash = ethers.keccak256(ethers.toUtf8Bytes("poi-999:fabricated-review"));
  tx = await por.connect(badActor).submitRecommendation(fakeHash);
  await tx.wait();
  console.log(`\nSubmitted fake recommendation, id=1`);

  for (const v of [v1, v2, v3]) {
    tx = await por.connect(v).vote(1, false, true);
    await tx.wait();
  }
  let rec1 = await por.getRecommendation(1);
  console.log(`Recommendation 1 status: ${["Pending", "Approved", "Flagged"][rec1.status]}`);

  console.log("\nSimulation complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
