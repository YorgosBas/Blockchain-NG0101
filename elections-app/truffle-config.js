const HDWalletProvider = require('@truffle/hdwallet-provider');
const fs = require('fs');
module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*"
    },
    "inf_election-infura_sepolia": {
      network_id: 11155111,
      gasPrice: 100000000000,
      provider: new HDWalletProvider(fs.readFileSync('/home/yorgos/Desktop/contractDeploy', 'utf-8'), "https://sepolia.infura.io/v3/bb36d4bc5e4942bfa01eb081b3d53794")
    },
    "inf_election-infura_near-testnet": {
      network_id: 0,
      gasPrice: 100000000000,
      provider: new HDWalletProvider(fs.readFileSync('/home/yorgos/Desktop/contractDeploy2', 'utf-8'), "https://near-testnet.infura.io/v3/bb36d4bc5e4942bfa01eb081b3d53794")
    },
    "inf_election-infura_palm-testnet": {
      network_id: 4,
      gasPrice: 100000000000,
      provider: new HDWalletProvider(fs.readFileSync('/home/yorgos/contract3', 'utf-8'), "https://palm-testnet.infura.io/v3/bb36d4bc5e4942bfa01eb081b3d53794")
    },
    "inf_election-infura_aurora-testnet": {
      network_id: 1313161555,
      gasPrice: 100000000000,
      provider: new HDWalletProvider(fs.readFileSync('/home/yorgos/Desktop/23423', 'utf-8'), "https://aurora-testnet.infura.io/v3/bb36d4bc5e4942bfa01eb081b3d53794")
    }
  },
  mocha: {},
  compilers: {
    solc: {
      version: "0.8.21"
    }
  }
};
