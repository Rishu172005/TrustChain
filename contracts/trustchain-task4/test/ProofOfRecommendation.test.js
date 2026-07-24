const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ProofOfRecommendation", function () {
  let token, por;
  let owner, submitter, v1, v2, v3, v4, outsider;
  const CONTENT_HASH = ethers.keccak256(ethers.toUtf8Bytes("poi-42:great-coffee-shop"));

  beforeEach(async function () {
    [owner, submitter, v1, v2, v3, v4, outsider] = await ethers.getSigners();

    const MockTrustToken = await ethers.getContractFactory("MockTrustToken");
    token = await MockTrustToken.deploy();
    await token.waitForDeployment();

    const PoR = await ethers.getContractFactory("ProofOfRecommendation");
    por = await PoR.deploy(await token.getAddress());
    await por.waitForDeployment();

    // Wire PoR up as an authorized controller so it can mint/burn TRUST.
    await token.addController(await por.getAddress());

    // Register 4 simulated validator nodes.
    for (const v of [v1, v2, v3, v4]) {
      await por.addValidator(v.address);
    }
  });

  describe("validator management", function () {
    it("only the owner can add or remove validators", async function () {
      await expect(
        por.connect(outsider).addValidator(outsider.address)
      ).to.be.revertedWithCustomError(por, "OwnableUnauthorizedAccount");

      expect(await por.validatorCount()).to.equal(4);
      await por.removeValidator(v4.address);
      expect(await por.validatorCount()).to.equal(3);
      expect(await por.isValidator(v4.address)).to.equal(false);
    });
  });

  describe("submission", function () {
    it("stores a pending recommendation keyed by an incrementing id", async function () {
      await expect(por.connect(submitter).submitRecommendation(CONTENT_HASH))
        .to.emit(por, "RecommendationSubmitted");

      const rec = await por.getRecommendation(0);
      expect(rec.submitter).to.equal(submitter.address);
      expect(rec.contentHash).to.equal(CONTENT_HASH);
      expect(rec.status).to.equal(0); // Pending
    });

    it("rejects an empty content hash", async function () {
      await expect(
        por.connect(submitter).submitRecommendation(ethers.ZeroHash)
      ).to.be.revertedWith("PoR: empty content hash");
    });
  });

  describe("consensus -> reward path", function () {
    beforeEach(async function () {
      await por.connect(submitter).submitRecommendation(CONTENT_HASH);
    });

    it("rejects votes from non-validators", async function () {
      await expect(
        por.connect(outsider).vote(0, true, false)
      ).to.be.revertedWith("PoR: caller is not a validator");
    });

    it("prevents a validator from voting twice on the same recommendation", async function () {
      await por.connect(v1).vote(0, true, false);
      await expect(por.connect(v1).vote(0, true, false)).to.be.revertedWith(
        "PoR: validator already voted"
      );
    });

    it("stays pending until requiredApprovals (3) is reached", async function () {
      await por.connect(v1).vote(0, true, false);
      await por.connect(v2).vote(0, true, false);

      let rec = await por.getRecommendation(0);
      expect(rec.status).to.equal(0); // still Pending
      expect(await token.balanceOf(submitter.address)).to.equal(0);

      await por.connect(v3).vote(0, true, false);

      rec = await por.getRecommendation(0);
      expect(rec.status).to.equal(1); // Approved
    });

    it("mints the reward to the submitter once 3 validators approve", async function () {
      await por.connect(v1).vote(0, true, false);
      await por.connect(v2).vote(0, true, false);

      await expect(por.connect(v3).vote(0, true, false))
        .to.emit(por, "RecommendationApproved")
        .withArgs(0, submitter.address, ethers.parseEther("10"));

      expect(await token.balanceOf(submitter.address)).to.equal(
        ethers.parseEther("10")
      );
    });

    it("blocks further voting once a recommendation is finalized as Approved", async function () {
      await por.connect(v1).vote(0, true, false);
      await por.connect(v2).vote(0, true, false);
      await por.connect(v3).vote(0, true, false); // finalizes as Approved

      await expect(por.connect(v4).vote(0, true, false)).to.be.revertedWith(
        "PoR: recommendation already finalized"
      );
    });
  });

  describe("flagging -> slashing path", function () {
    beforeEach(async function () {
      await por.connect(submitter).submitRecommendation(CONTENT_HASH);
      // Give the submitter a starting balance so the slash has something to burn.
      await token.addController(owner.address);
      await token.mint(submitter.address, ethers.parseEther("20"));
    });

    it("flags and slashes the submitter once flagThreshold (3) validators flag it", async function () {
      await por.connect(v1).vote(0, false, true);
      await por.connect(v2).vote(0, false, true);

      let rec = await por.getRecommendation(0);
      expect(rec.status).to.equal(0); // still Pending

      await expect(por.connect(v3).vote(0, false, true))
        .to.emit(por, "RecommendationFlagged")
        .withArgs(0, submitter.address, ethers.parseEther("5"), true);

      rec = await por.getRecommendation(0);
      expect(rec.status).to.equal(2); // Flagged
      expect(await token.balanceOf(submitter.address)).to.equal(
        ethers.parseEther("15") // 20 - 5 penalty
      );
    });

    it("does not also pay a reward once a recommendation is flagged", async function () {
      await por.connect(v1).vote(0, false, true);
      await por.connect(v2).vote(0, false, true);
      await por.connect(v3).vote(0, false, true); // finalizes as Flagged

      const rec = await por.getRecommendation(0);
      expect(rec.status).to.equal(2); // Flagged, not Approved
      // balance only reflects the penalty, never a reward
      expect(await token.balanceOf(submitter.address)).to.equal(
        ethers.parseEther("15")
      );
    });

    it("still marks the recommendation Flagged even if the submitter can't cover the penalty", async function () {
      // Fresh recommendation from a submitter with zero balance.
      await por.connect(submitter).submitRecommendation(
        ethers.keccak256(ethers.toUtf8Bytes("poi-99:fake-review"))
      );
      const id = 1;
      const poorSubmitter = outsider; // never minted any TRUST

      // outsider can't submit on their own behalf here since submitter is msg.sender
      // of submitRecommendation; simulate by having outsider submit directly.
      await por.connect(poorSubmitter).submitRecommendation(
        ethers.keccak256(ethers.toUtf8Bytes("poi-100:fake-review-2"))
      );
      const poorId = 2;

      await por.connect(v1).vote(poorId, false, true);
      await por.connect(v2).vote(poorId, false, true);

      await expect(por.connect(v3).vote(poorId, false, true))
        .to.emit(por, "RecommendationFlagged")
        .withArgs(poorId, poorSubmitter.address, ethers.parseEther("5"), false);

      const rec = await por.getRecommendation(poorId);
      expect(rec.status).to.equal(2); // Flagged, penalty attempted but not applied
    });
  });

  describe("multi-validator-node simulation", function () {
    it("handles several recommendations from different submitters concurrently", async function () {
      await por.connect(submitter).submitRecommendation(
        ethers.keccak256(ethers.toUtf8Bytes("poi-1"))
      );
      await por.connect(outsider).submitRecommendation(
        ethers.keccak256(ethers.toUtf8Bytes("poi-2"))
      );

      // Recommendation 0 gets approved.
      await por.connect(v1).vote(0, true, false);
      await por.connect(v2).vote(0, true, false);
      await por.connect(v3).vote(0, true, false);

      // Recommendation 1 gets flagged.
      await token.addController(owner.address);
      await token.mint(outsider.address, ethers.parseEther("10"));
      await por.connect(v1).vote(1, false, true);
      await por.connect(v2).vote(1, false, true);
      await por.connect(v3).vote(1, false, true);

      const rec0 = await por.getRecommendation(0);
      const rec1 = await por.getRecommendation(1);
      expect(rec0.status).to.equal(1); // Approved
      expect(rec1.status).to.equal(2); // Flagged

      expect(await token.balanceOf(submitter.address)).to.equal(ethers.parseEther("10"));
      expect(await token.balanceOf(outsider.address)).to.equal(ethers.parseEther("5")); // 10 - 5
    });
  });

  describe("admin tuning", function () {
    it("only the owner can change thresholds and amounts", async function () {
      await expect(
        por.connect(outsider).setRequiredApprovals(5)
      ).to.be.revertedWithCustomError(por, "OwnableUnauthorizedAccount");

      await por.setRequiredApprovals(2);
      expect(await por.requiredApprovals()).to.equal(2);

      await por.setRewardAmount(ethers.parseEther("25"));
      expect(await por.rewardAmount()).to.equal(ethers.parseEther("25"));
    });
  });
});
