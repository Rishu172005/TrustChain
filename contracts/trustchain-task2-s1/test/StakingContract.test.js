const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StakingContract", function () {
  let trustToken, staking, owner, business;

  beforeEach(async function () {
    [owner, business] = await ethers.getSigners();

    const TrustToken = await ethers.getContractFactory("TrustToken");
    trustToken = await TrustToken.deploy(0, owner.address);
    await trustToken.waitForDeployment();

    const StakingContract = await ethers.getContractFactory("StakingContract");
    staking = await StakingContract.deploy(await trustToken.getAddress(), owner.address);
    await staking.waitForDeployment();

    // Give the staking contract mint/burn rights, and fund the business.
    await trustToken.setController(await staking.getAddress(), true);
    await trustToken.setController(owner.address, true);
    await trustToken.mint(business.address, ethers.parseUnits("500", 18));
  });

  it("lets a business stake tokens after approval", async function () {
    const amount = ethers.parseUnits("150", 18);
    await trustToken.connect(business).approve(await staking.getAddress(), amount);

    await expect(staking.connect(business).stake(amount))
      .to.emit(staking, "Staked")
      .withArgs(business.address, amount, amount);

    expect(await staking.stakedBalance(business.address)).to.equal(amount);
    expect(await trustToken.balanceOf(await staking.getAddress())).to.equal(amount);
  });

  it("marks a business visible once stake meets the minimum", async function () {
    const belowMin = ethers.parseUnits("50", 18);
    const aboveMin = ethers.parseUnits("150", 18);

    await trustToken.connect(business).approve(await staking.getAddress(), aboveMin);

    await staking.connect(business).stake(belowMin);
    expect(await staking.isVisible(business.address)).to.equal(false);

    await staking.connect(business).stake(aboveMin - belowMin);
    expect(await staking.isVisible(business.address)).to.equal(true);
  });

  it("lets a business unstake tokens", async function () {
    const amount = ethers.parseUnits("200", 18);
    await trustToken.connect(business).approve(await staking.getAddress(), amount);
    await staking.connect(business).stake(amount);

    await staking.connect(business).unstake(ethers.parseUnits("80", 18));

    expect(await staking.stakedBalance(business.address)).to.equal(
      ethers.parseUnits("120", 18)
    );
    expect(await trustToken.balanceOf(business.address)).to.equal(
      ethers.parseUnits("380", 18) // 500 - 200 + 80
    );
  });

  it("reverts unstaking more than the staked balance", async function () {
    const amount = ethers.parseUnits("50", 18);
    await trustToken.connect(business).approve(await staking.getAddress(), amount);
    await staking.connect(business).stake(amount);

    await expect(
      staking.connect(business).unstake(ethers.parseUnits("51", 18))
    ).to.be.revertedWith("StakingContract: insufficient stake");
  });

  it("lets the owner slash a business's stake", async function () {
    const amount = ethers.parseUnits("200", 18);
    await trustToken.connect(business).approve(await staking.getAddress(), amount);
    await staking.connect(business).stake(amount);

    await expect(
      staking.slash(business.address, ethers.parseUnits("50", 18), "fake reviews detected")
    )
      .to.emit(staking, "Slashed")
      .withArgs(business.address, ethers.parseUnits("50", 18), "fake reviews detected");

    expect(await staking.stakedBalance(business.address)).to.equal(
      ethers.parseUnits("150", 18)
    );
  });

  it("only owner can slash", async function () {
    await expect(
      staking.connect(business).slash(business.address, 1, "n/a")
    ).to.be.revertedWithCustomError(staking, "OwnableUnauthorizedAccount");
  });
});
