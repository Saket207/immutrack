/** @type import('hardhat/config').HardhatUserConfig */
const config = {
  solidity: "0.8.24",
  paths: {
    sources: "contract",
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
  },
};

export default config;


