var HDWalletProvider = require('truffle-hdwallet-provider');

var mnemonic = '[REDACTED]';

module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*',
      gasPrice: 100000000000
    }
  }
};
