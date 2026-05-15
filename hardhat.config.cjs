require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    ganache: {
      url: "http://127.0.0.1:7545",
      accounts: ["0x8288226c097f99dec64f8fe1eb23048d593c87e7b6c539ba51ac7157cdb2b7f9"],
      chainId: 1337
    }
  }
};