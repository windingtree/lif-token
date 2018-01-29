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
      network_id: '*', // eslint-disable-line camelcase
      gas: 8000000,
      gasPrice: 41000000000,
    },
    coverage: {
      host: 'localhost',
      network_id: '*', // eslint-disable-line camelcase
      port: 8555,
      gas: 0xfffffffffff,
      gasPrice: 0x01,
    },
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  },
  mocha: {
    // a commented out mocha option, shows how to pass mocha options
    // bail: true  // bail makes mocha to stop as soon as a test failure is found
  }
};
