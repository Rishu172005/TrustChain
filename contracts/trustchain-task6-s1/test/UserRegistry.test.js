const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("UserRegistry", function () {
  let trustToken, registry, owner, alice, bob;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();

    const TrustToken = await ethers.getContractFactory("TrustToken");
    trustToken = await TrustToken.deploy(0, owner.address);
    await trustToken.waitForDeployment();

    const UserRegistry = await ethers.getContractFactory("UserRegistry");
    registry = await UserRegistry.deploy(await trustToken.getAddress(), owner.address);
    await registry.waitForDeployment();

    // Authorize the registry to mint rewards.
    await trustToken.setController(await registry.getAddress(), true);
  });

  it("registers a new user", async function () {
    await registry.connect(alice).registerUser();
    expect(await registry.isRegistered(alice.address)).to.equal(true);
  });

  it("prevents double registration", async function () {
    await registry.connect(alice).registerUser();
    await expect(registry.connect(alice).registerUser()).to.be.revertedWith(
      "UserRegistry: already registered"
    );
  });

  it("blocks check-in from unregistered users", async function () {
    const hash = ethers.keccak256(ethers.toUtf8Bytes("checkin-1"));
    await expect(registry.connect(alice).checkIn(hash)).to.be.revertedWith(
      "UserRegistry: not registered"
    );
  });

  it("records a check-in and mints the reward", async function () {
    await registry.connect(alice).registerUser();
    const hash = ethers.keccak256(ethers.toUtf8Bytes("checkin-1"));

    await expect(registry.connect(alice).checkIn(hash))
      .to.emit(registry, "CheckedIn");

    expect(await registry.getCheckInCount(alice.address)).to.equal(1);
    expect(await trustToken.balanceOf(alice.address)).to.equal(
      await registry.checkInReward()
    );
  });

  it("rejects a replayed check-in hash", async function () {
    await registry.connect(alice).registerUser();
    const hash = ethers.keccak256(ethers.toUtf8Bytes("checkin-1"));
    await registry.connect(alice).checkIn(hash);

    await expect(registry.connect(alice).checkIn(hash)).to.be.revertedWith(
      "UserRegistry: check-in already recorded"
    );
  });

  it("simulates 10 check-ins and verifies balance updates correctly", async function () {
    await registry.connect(bob).registerUser();
    const reward = await registry.checkInReward();

    for (let i = 0; i < 10; i++) {
      const hash = ethers.keccak256(ethers.toUtf8Bytes("checkin-" + i));
      await registry.connect(bob).checkIn(hash);
    }

    expect(await registry.getCheckInCount(bob.address)).to.equal(10);
    expect(await trustToken.balanceOf(bob.address)).to.equal(reward * 10n);
  });

  it("only owner can update the check-in reward", async function () {
    await expect(
      registry.connect(alice).setCheckInReward(1)
    ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");

    await registry.setCheckInReward(5);
    expect(await registry.checkInReward()).to.equal(5);
  });
});
