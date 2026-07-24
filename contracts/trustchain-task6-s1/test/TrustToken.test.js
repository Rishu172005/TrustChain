const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TrustToken", function () {
  let trustToken, owner, controller, user;

  beforeEach(async function () {
    [owner, controller, user] = await ethers.getSigners();
    const TrustToken = await ethers.getContractFactory("TrustToken");
    trustToken = await TrustToken.deploy(0, owner.address);
    await trustToken.waitForDeployment();
  });

  it("has correct name and symbol", async function () {
    expect(await trustToken.name()).to.equal("TrustToken");
    expect(await trustToken.symbol()).to.equal("TRUST");
  });

  it("mints initial supply to owner on deploy", async function () {
    const TrustToken = await ethers.getContractFactory("TrustToken");
    const supplied = await TrustToken.deploy(1000, owner.address);
    expect(await supplied.balanceOf(owner.address)).to.equal(1000);
  });

  it("only owner can set a controller", async function () {
    await expect(
      trustToken.connect(user).setController(controller.address, true)
    ).to.be.revertedWithCustomError(trustToken, "OwnableUnauthorizedAccount");

    await trustToken.setController(controller.address, true);
    expect(await trustToken.controllers(controller.address)).to.equal(true);
  });

  it("only a controller can mint", async function () {
    await expect(
      trustToken.connect(user).mint(user.address, 100)
    ).to.be.revertedWith("TrustToken: caller is not a controller");

    await trustToken.setController(controller.address, true);
    await trustToken.connect(controller).mint(user.address, 100);
    expect(await trustToken.balanceOf(user.address)).to.equal(100);
  });

  it("only a controller can burnFrom", async function () {
    await trustToken.setController(controller.address, true);
    await trustToken.connect(controller).mint(user.address, 100);

    await expect(
      trustToken.connect(user).burnFrom(user.address, 50)
    ).to.be.revertedWith("TrustToken: caller is not a controller");

    await trustToken.connect(controller).burnFrom(user.address, 50);
    expect(await trustToken.balanceOf(user.address)).to.equal(50);
  });

  it("standard ERC-20 transfer works", async function () {
    await trustToken.setController(controller.address, true);
    await trustToken.connect(controller).mint(owner.address, 100);

    await trustToken.transfer(user.address, 40);
    expect(await trustToken.balanceOf(user.address)).to.equal(40);
    expect(await trustToken.balanceOf(owner.address)).to.equal(60);
  });
});
