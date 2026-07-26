const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

/**
 * Deploys ProofOfRecommendation and wires it up as a controller on TrustToken.
 *
 * By default this looks for deployments/<network>.json (the file the Task 3
 * deploy.js script wrote) to find the already-deployed TrustToken address.
 * If that file isn't present, set TRUST_TOKEN_ADDRESS as an env var instead.
 *
 * Usage (two-terminal flow, same as Task 2/3):
 *   Terminal 1: npx hardhat node
 *   Terminal 2: npx hardhat run scripts/deploy-por.js --network localhost
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying PoR with account: ${deployer.address}`);

  const deploymentsPath = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  let trustTokenAddress = process.env.TRUST_TOKEN_ADDRESS;
  let existing = {};

  if (!trustTokenAddress && fs.existsSync(deploymentsPath)) {
    existing = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
    trustTokenAddress = existing.TrustToken?.address;
  }

  if (!trustTokenAddress) {
    throw new Error(
      "Could not find a TrustToken address. Either run the Task 3 deploy.js first " +
        "(so deployments/<network>.json exists) or set TRUST_TOKEN_ADDRESS manually."
    );
  }
  console.log(`Using existing TrustToken at: ${trustTokenAddress}`);

  const PoR = await ethers.getContractFactory("ProofOfRecommendation");
  const por = await PoR.deploy(trustTokenAddress);
  await por.waitForDeployment();
  const porAddress = await por.getAddress();
  console.log(`ProofOfRecommendation deployed to: ${porAddress}`);

  // Attempt to register PoR as a controller on TrustToken so it can mint/burn.
  // NOTE: this assumes TrustToken exposes an owner-only addController(address)
  // function, matching the Task 2 S1 design description. If your actual
  // TrustToken.sol uses a different function name, update the line below.
  try {
    const TrustToken = await ethers.getContractAt("TrustToken", trustTokenAddress);
    const tx = await TrustToken.addController(porAddress);
    await tx.wait();
    console.log(`Registered PoR as an authorized controller on TrustToken.`);
  } catch (err) {
    console.warn(
      "\nCould not auto-register PoR as a TrustToken controller. " +
        "Do this manually (e.g. via Hardhat console or a small script) before " +
        "submitRecommendation()/vote() reward or slash paths will work:\n" +
        `  trustToken.addController("${porAddress}")\n` +
        `Reason: ${err.message}\n`
    );
  }

  // Persist / merge into the shared deployments file.
  const output = {
    ...existing,
    ProofOfRecommendation: {
      address: porAddress,
      deployer: deployer.address,
      network: network.name,
      deployedAt: new Date().toISOString(),
    },
  };
  fs.mkdirSync(path.dirname(deploymentsPath), { recursive: true });
  fs.writeFileSync(deploymentsPath, JSON.stringify(output, null, 2));
  console.log(`Deployment info written to ${deploymentsPath}`);

  console.log("\nNext step: register your simulated validator nodes, e.g.");
  console.log(`  por.addValidator(validatorAddress)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
