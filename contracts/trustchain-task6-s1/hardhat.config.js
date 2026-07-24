require("@nomicfoundation/hardhat-toolbox");
require("hardhat-gas-reporter");
require("solidity-coverage");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  networks: {
    hardhat: {},
    localhost: {
      url: "http://127.0.0.1:8545",
    },
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
    // No API key configured — coinmarketcap USD conversion is skipped,
    // gas units still print. Add COINMARKETCAP_API_KEY as an env var to
    // also get live USD estimates per function.
    outputFile: "gas-report.txt",
    noColors: true,
  },
};
