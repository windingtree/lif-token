var HDWalletProvider = require('truffle-hdwallet-provider');

var mnemonic = '[REDACTED]';

if (!process.env.SOLIDITY_COVERAGE){
  // This is a stub to use in case you begin validating on a testnet using HDWallet.
  // HDWallet interferes with the coverage runner so it needs to be instantiated conditionally.
  // For more info see the solidity-coverage FAQ.
  // 
  // provider = new HDWalletProvider(mnemonic, 'https://ropsten.infura.io/')
}

module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*',
      gasPrice: 100000000000
    },
    coverage: {
      host: "localhost",
      network_id: "*",
      port: 8555,
      gas: 0xfffffffffff,
      gasPrice: 100000000000
    }
  }
};
