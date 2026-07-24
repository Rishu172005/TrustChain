const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

/**
 * Deploys TrustToken, UserRegistry, and StakingContract to whatever network
 * Hardhat is pointed at (defaults to the local in-memory Hardhat network).
 * Wires UserRegistry + StakingContract up as authorized controllers on
 * TrustToken, then writes out addresses + ABIs to deployments/local.json
 * so S3 (Backend Lead) can load them into the Express API via ethers.js.
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const TrustToken = await hre.ethers.getContractFactory("TrustToken");
  const trustToken = await TrustToken.deploy(0, deployer.address);
  await trustToken.waitForDeployment();
  console.log("TrustToken deployed to:", await trustToken.getAddress());

  const UserRegistry = await hre.ethers.getContractFactory("UserRegistry");
  const userRegistry = await UserRegistry.deploy(await trustToken.getAddress(), deployer.address);
  await userRegistry.waitForDeployment();
  console.log("UserRegistry deployed to:", await userRegistry.getAddress());

  const StakingContract = await hre.ethers.getContractFactory("StakingContract");
  const staking = await StakingContract.deploy(await trustToken.getAddress(), deployer.address);
  await staking.waitForDeployment();
  console.log("StakingContract deployed to:", await staking.getAddress());

  const ProofOfRecommendation = await hre.ethers.getContractFactory("ProofOfRecommendation");
  const por = await ProofOfRecommendation.deploy(
    await trustToken.getAddress(),
    await userRegistry.getAddress(),
    deployer.address
  );
  await por.waitForDeployment();
  console.log("ProofOfRecommendation deployed to:", await por.getAddress());

  // For local dev, the deployer also acts as the GeoRecommender's oracle.
  // In Task 5's real integration, this becomes S3's mock oracle service address.
  const GeoRecommender = await hre.ethers.getContractFactory("GeoRecommender");
  const geo = await GeoRecommender.deploy(deployer.address, deployer.address);
  await geo.waitForDeployment();
  console.log("GeoRecommender deployed to:", await geo.getAddress());

  // Authorize UserRegistry + StakingContract + PoR to mint/burn TrustToken.
  await (await trustToken.setController(await userRegistry.getAddress(), true)).wait();
  await (await trustToken.setController(await staking.getAddress(), true)).wait();
  await (await trustToken.setController(await por.getAddress(), true)).wait();
  console.log("Controllers set on TrustToken.");

  // Write addresses + ABIs so the backend can pick them up directly.
  const artifactsDir = path.join(__dirname, "..", "artifacts", "contracts");
  const deployment = {
    network: hre.network.name,
    deployer: deployer.address,
    contracts: {
      TrustToken: {
        address: await trustToken.getAddress(),
        abi: JSON.parse(
          fs.readFileSync(path.join(artifactsDir, "TrustToken.sol", "TrustToken.json"))
        ).abi,
      },
      UserRegistry: {
        address: await userRegistry.getAddress(),
        abi: JSON.parse(
          fs.readFileSync(path.join(artifactsDir, "UserRegistry.sol", "UserRegistry.json"))
        ).abi,
      },
      StakingContract: {
        address: await staking.getAddress(),
        abi: JSON.parse(
          fs.readFileSync(path.join(artifactsDir, "StakingContract.sol", "StakingContract.json"))
        ).abi,
      },
      ProofOfRecommendation: {
        address: await por.getAddress(),
        abi: JSON.parse(
          fs.readFileSync(
            path.join(artifactsDir, "ProofOfRecommendation.sol", "ProofOfRecommendation.json")
          )
        ).abi,
      },
      GeoRecommender: {
        address: await geo.getAddress(),
        abi: JSON.parse(
          fs.readFileSync(path.join(artifactsDir, "GeoRecommender.sol", "GeoRecommender.json"))
        ).abi,
      },
    },
  };

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, `${hre.network.name}.json`),
    JSON.stringify(deployment, null, 2)
  );
  console.log(`\nDeployment info written to deployments/${hre.network.name}.json`);
  console.log("Hand this file to S3 — it has everything the backend needs to connect.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
