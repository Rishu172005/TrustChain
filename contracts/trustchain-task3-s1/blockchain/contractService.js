const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

/**
 * TrustChain blockchain integration layer.
 *
 * S3 (Backend Lead): import this in your Express routes. It hides all the
 * ethers.js/contract details behind plain async functions so /checkin,
 * /token-balance etc. don't need to know anything about ABIs or addresses.
 *
 * Usage in your API:
 *   const chain = require("../blockchain/contractService");
 *   app.post("/checkin", async (req, res) => {
 *     const { userAddress, poiId, timestamp } = req.body;
 *     const checkInHash = chain.buildCheckInHash(userAddress, poiId, timestamp);
 *     const receipt = await chain.recordCheckIn(userAddress, checkInHash);
 *     res.json({ txHash: receipt.hash });
 *   });
 */

const NETWORK = process.env.HARDHAT_NETWORK || "localhost";
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";

const deploymentPath = path.join(__dirname, "..", "deployments", `${NETWORK}.json`);
if (!fs.existsSync(deploymentPath)) {
  throw new Error(
    `No deployment found at ${deploymentPath}. Run "npx hardhat run scripts/deploy.js --network ${NETWORK}" first.`
  );
}
const deployment = JSON.parse(fs.readFileSync(deploymentPath));

const provider = new ethers.JsonRpcProvider(RPC_URL);

// IMPORTANT ARCHITECTURE NOTE FOR S3:
// registerUser() and checkIn() in UserRegistry both key off msg.sender.
// That means whoever *signs* the transaction is who gets registered / gets
// the reward — the backend cannot "checkIn on behalf of" an arbitrary
// address unless it holds that address's private key. There are two valid
// ways to handle this, pick one with S3 before wiring the real /checkin route:
//
//   (A) Real wallet flow (production-shaped): the frontend has the user's
//       own wallet (e.g. MetaMask) sign registerUser/checkIn client-side,
//       and the backend only *reads* chain state (balances, check-in counts)
//       after the fact. Nothing in this file signs on the user's behalf.
//
//   (B) Simulated/demo flow (what Task 3's "simulate 10 check-ins" test
//       implies): for local testing, each simulated user is one of
//       Hardhat's pre-funded local accounts, and the test script signs
//       directly with that account's own signer — see
//       scripts/simulate-checkins.js, which does exactly this.
//
// getSignerForUser() below supports (B): pass in the private key of the
// specific test/demo account you're acting as. Never use this pattern for
// real user funds outside local development.
function getSignerForUser(privateKey) {
  if (!privateKey) {
    throw new Error(
      "getSignerForUser requires the private key of the account performing the action " +
        "(see architecture note above) — the backend cannot sign for arbitrary addresses."
    );
  }
  return new ethers.Wallet(privateKey, provider);
}

function getContract(name, signerOrProvider) {
  const { address, abi } = deployment.contracts[name];
  return new ethers.Contract(address, abi, signerOrProvider);
}

/**
 * Builds the check-in hash off-chain, exactly like the UserRegistry contract
 * expects: keccak256(userAddress, poiId, timestamp). Keeping this identical
 * on every call is what lets UserRegistry reject replays.
 */
function buildCheckInHash(userAddress, poiId, timestamp) {
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "string", "uint256"],
      [userAddress, poiId, timestamp]
    )
  );
}

/** Registers a user on-chain. userPrivateKey = the user's own signing key (see note above). */
async function registerUser(userPrivateKey) {
  const signer = getSignerForUser(userPrivateKey);
  const registry = getContract("UserRegistry", signer);
  const tx = await registry.registerUser();
  return tx.wait();
}

/**
 * Core integration point for POST /checkin.
 * Mints the check-in reward on-chain and returns the transaction receipt.
 * userPrivateKey = the checking-in user's own signing key (see note above).
 */
async function recordCheckIn(userPrivateKey, checkInHash) {
  const signer = getSignerForUser(userPrivateKey);
  const registry = getContract("UserRegistry", signer);
  const tx = await registry.checkIn(checkInHash);
  const receipt = await tx.wait();
  return receipt;
}

/** For GET /token-balance/:address */
async function getTokenBalance(userAddress) {
  const trustToken = getContract("TrustToken", provider);
  const balance = await trustToken.balanceOf(userAddress);
  return ethers.formatUnits(balance, 18);
}

/** For GET /checkin-count/:address — used by the integration test below. */
async function getCheckInCount(userAddress) {
  const registry = getContract("UserRegistry", provider);
  return Number(await registry.getCheckInCount(userAddress));
}

module.exports = {
  buildCheckInHash,
  registerUser,
  recordCheckIn,
  getTokenBalance,
  getCheckInCount,
  getSigner,
  getContract,
};
