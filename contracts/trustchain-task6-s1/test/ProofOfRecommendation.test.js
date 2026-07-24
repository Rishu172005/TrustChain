const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ProofOfRecommendation", function () {
  let trustToken, registry, por;
  let owner, submitter, v1, v2, v3, v4;

  async function registerAll(signers) {
    for (const s of signers) {
      await registry.connect(s).registerUser();
    }
  }

  beforeEach(async function () {
    [owner, submitter, v1, v2, v3, v4] = await ethers.getSigners();

    const TrustToken = await ethers.getContractFactory("TrustToken");
    trustToken = await TrustToken.deploy(0, owner.address);
    await trustToken.waitForDeployment();

    const UserRegistry = await ethers.getContractFactory("UserRegistry");
    registry = await UserRegistry.deploy(await trustToken.getAddress(), owner.address);
    await registry.waitForDeployment();
    await trustToken.setController(await registry.getAddress(), true);

    const PoR = await ethers.getContractFactory("ProofOfRecommendation");
    por = await PoR.deploy(
      await trustToken.getAddress(),
      await registry.getAddress(),
      owner.address
    );
    await por.waitForDeployment();
    await trustToken.setController(await por.getAddress(), true);

    // Register submitter + 4 simulated validator nodes.
    await registerAll([submitter, v1, v2, v3, v4]);
  });

  it("lets a registered user submit a recommendation", async function () {
    const hash = ethers.keccak256(ethers.toUtf8Bytes("great ramen spot"));
    await expect(por.connect(submitter).submitRecommendation(hash))
      .to.emit(por, "RecommendationSubmitted")
      .withArgs(0, submitter.address, hash);

    const rec = await por.getRecommendation(0);
    expect(rec.submitter).to.equal(submitter.address);
    expect(rec.status).to.equal(0); // Pending
  });

  it("blocks unregistered users from submitting", async function () {
    const [, , , , , , outsider] = await ethers.getSigners();
    const hash = ethers.keccak256(ethers.toUtf8Bytes("spam"));
    await expect(por.connect(outsider).submitRecommendation(hash)).to.be.revertedWith(
      "PoR: caller is not a registered user"
    );
  });

  it("confirms a recommendation and rewards the submitter once consensus (3 approvals) is reached", async function () {
    const hash = ethers.keccak256(ethers.toUtf8Bytes("great ramen spot"));
    await por.connect(submitter).submitRecommendation(hash);

    await por.connect(v1).vote(0, true);
    await por.connect(v2).vote(0, true);
    await expect(por.connect(v3).vote(0, true))
      .to.emit(por, "RecommendationConfirmed")
      .withArgs(0, submitter.address, await por.recommendationReward());

    const rec = await por.getRecommendation(0);
    expect(rec.status).to.equal(1); // Confirmed
    expect(await trustToken.balanceOf(submitter.address)).to.equal(
      await por.recommendationReward()
    );
  });

  it("flags a recommendation and slashes the submitter once 3 flag votes land", async function () {
    const hash = ethers.keccak256(ethers.toUtf8Bytes("fake review"));
    await por.connect(submitter).submitRecommendation(hash);

    // Give the submitter a starting balance so the slash has something to burn.
    await trustToken.setController(owner.address, true);
    await trustToken.mint(submitter.address, ethers.parseUnits("50", 18));

    await por.connect(v1).vote(0, false);
    await por.connect(v2).vote(0, false);
    await expect(por.connect(v3).vote(0, false))
      .to.emit(por, "RecommendationFlagged")
      .withArgs(0, submitter.address, await por.slashAmount());

    const rec = await por.getRecommendation(0);
    expect(rec.status).to.equal(2); // Flagged
    expect(await trustToken.balanceOf(submitter.address)).to.equal(
      ethers.parseUnits("45", 18) // 50 - 5 slash
    );
  });

  it("caps the slash at the submitter's actual balance", async function () {
    const hash = ethers.keccak256(ethers.toUtf8Bytes("fake review, broke submitter"));
    await por.connect(submitter).submitRecommendation(hash);
    // Submitter has 0 TRUST balance — slashAmount (5) exceeds it.

    await por.connect(v1).vote(0, false);
    await por.connect(v2).vote(0, false);
    await expect(por.connect(v3).vote(0, false))
      .to.emit(por, "RecommendationFlagged")
      .withArgs(0, submitter.address, 0);

    expect(await trustToken.balanceOf(submitter.address)).to.equal(0);
  });

  it("prevents the submitter from voting on their own recommendation", async function () {
    const hash = ethers.keccak256(ethers.toUtf8Bytes("self-vote attempt"));
    await por.connect(submitter).submitRecommendation(hash);

    await expect(por.connect(submitter).vote(0, true)).to.be.revertedWith(
      "PoR: submitter cannot validate their own recommendation"
    );
  });

  it("prevents a validator from voting twice on the same recommendation", async function () {
    const hash = ethers.keccak256(ethers.toUtf8Bytes("double vote attempt"));
    await por.connect(submitter).submitRecommendation(hash);

    await por.connect(v1).vote(0, true);
    await expect(por.connect(v1).vote(0, true)).to.be.revertedWith("PoR: already voted");
  });

  it("prevents voting once a recommendation is already resolved", async function () {
    const hash = ethers.keccak256(ethers.toUtf8Bytes("resolved already"));
    await por.connect(submitter).submitRecommendation(hash);

    await por.connect(v1).vote(0, true);
    await por.connect(v2).vote(0, true);
    await por.connect(v3).vote(0, true); // confirms it

    await expect(por.connect(v4).vote(0, true)).to.be.revertedWith(
      "PoR: recommendation already resolved"
    );
  });

  it("only owner can update consensus/flag/reward/slash parameters", async function () {
    await expect(
      por.connect(v1).setParameters(1, 2, 2, 1)
    ).to.be.revertedWithCustomError(por, "OwnableUnauthorizedAccount");

    await por.setParameters(
      ethers.parseUnits("1", 18),
      2,
      2,
      ethers.parseUnits("1", 18)
    );
    expect(await por.consensusThreshold()).to.equal(2);
    expect(await por.flagThreshold()).to.equal(2);
  });
});
