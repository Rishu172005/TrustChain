const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GeoRecommender", function () {
  let geo, owner, oracle, outsider;
  const SCALE = 1_000_000n;

  beforeEach(async function () {
    [owner, oracle, outsider] = await ethers.getSigners();
    const GeoRecommender = await ethers.getContractFactory("GeoRecommender");
    geo = await GeoRecommender.deploy(oracle.address, owner.address);
    await geo.waitForDeployment();
  });

  it("only the oracle can register a POI", async function () {
    await expect(
      geo.connect(outsider).registerPOI(1, 12_971_600n, 77_594_600n)
    ).to.be.revertedWith("GeoRecommender: caller is not the oracle");

    await geo.connect(oracle).registerPOI(1, 12_971_600n, 77_594_600n); // Bangalore-ish
    expect(await geo.poiCount()).to.equal(1);
  });

  it("rejects out-of-range coordinates (the audit-fix bounds check)", async function () {
    const tooFarNorth = 91n * SCALE;
    await expect(
      geo.connect(oracle).registerPOI(1, tooFarNorth, 0)
    ).to.be.revertedWith("GeoRecommender: lat out of range");

    const tooFarEast = 181n * SCALE;
    await expect(
      geo.connect(oracle).registerPOI(2, 0, tooFarEast)
    ).to.be.revertedWith("GeoRecommender: lng out of range");
  });

  it("only the oracle can update a POI's score", async function () {
    await geo.connect(oracle).registerPOI(1, 0, 0);

    await expect(geo.connect(outsider).updateScore(1, 50)).to.be.revertedWith(
      "GeoRecommender: caller is not the oracle"
    );

    await geo.connect(oracle).updateScore(1, 50);
    const poi = await geo.pois(1);
    expect(poi.score).to.equal(50);
  });

  it("returns only POIs within the bounding box", async function () {
    // Inside a Chennai-ish box.
    await geo.connect(oracle).registerPOI(1, 13_082_800n, 80_270_700n);
    await geo.connect(oracle).updateScore(1, 80);
    // Far outside — should never appear in a Chennai-area query.
    await geo.connect(oracle).registerPOI(2, 40_712_800n, -74_006_000n); // New York
    await geo.connect(oracle).updateScore(2, 100);

    const results = await geo.getRecommendations(
      13_000_000n,
      13_200_000n,
      80_200_000n,
      80_300_000n,
      10
    );

    expect(results.length).to.equal(1);
    expect(results[0]).to.equal(1);
  });

  it("ranks results by score descending and respects maxResults", async function () {
    await geo.connect(oracle).registerPOI(1, 0, 0);
    await geo.connect(oracle).updateScore(1, 10);
    await geo.connect(oracle).registerPOI(2, 0, 0);
    await geo.connect(oracle).updateScore(2, 90);
    await geo.connect(oracle).registerPOI(3, 0, 0);
    await geo.connect(oracle).updateScore(3, 50);

    const results = await geo.getRecommendations(-1, 1, -1, 1, 2);

    expect(results.length).to.equal(2);
    expect(results[0]).to.equal(2); // score 90
    expect(results[1]).to.equal(3); // score 50
  });

  it("excludes deactivated POIs from recommendations", async function () {
    await geo.connect(oracle).registerPOI(1, 0, 0);
    await geo.connect(oracle).updateScore(1, 99);
    await geo.connect(oracle).deactivatePOI(1);

    const results = await geo.getRecommendations(-1, 1, -1, 1, 10);
    expect(results.length).to.equal(0);
  });

  it("only owner can change the oracle address", async function () {
    await expect(
      geo.connect(outsider).setOracle(outsider.address)
    ).to.be.revertedWithCustomError(geo, "OwnableUnauthorizedAccount");

    await geo.setOracle(outsider.address);
    expect(await geo.oracle()).to.equal(outsider.address);
  });
});
