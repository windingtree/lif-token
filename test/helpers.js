var BigNumber = web3.BigNumber;

var _ = require('lodash');

var LifToken = artifacts.require('./LifToken.sol');
var LifCrowdsale = artifacts.require('./LifCrowdsale.sol');
var LifMarketValidationMechanism = artifacts.require('./LifMarketValidationMechanism.sol');
var abiDecoder = require('abi-decoder');
abiDecoder.addABI(LifToken._json.abi);
abiDecoder.addABI(LifCrowdsale._json.abi);
abiDecoder.addABI(LifMarketValidationMechanism._json.abi);

var latestTime = require('./helpers/latestTime');
var {increaseTimeTestRPC, increaseTimeTestRPCTo} = require('./helpers/increaseTime');

const DEBUG_MODE = (process.env.WT_DEBUG == 'true') || false;

let gasPriceFromEnv = parseInt(process.env.GAS_PRICE);
let gasPrice;
if (isNaN(gasPriceFromEnv))
  gasPrice = new BigNumber(20000000000);
else
  gasPrice = new BigNumber(gasPriceFromEnv);

module.exports = {

  zeroAddress: '0x0000000000000000000000000000000000000000',

  abiDecoder: abiDecoder,

  inCoverage: () => process.env.SOLIDITY_COVERAGE == 'true',

  gasPrice: gasPrice,

  txGasCost: (tx) => gasPrice.mul(new BigNumber(tx.receipt.gasUsed)),

  getAccountsBalances: (accounts) => {
    return _.reduce(accounts, (balances, account) => {
      balances[accounts.indexOf(account)] = web3.eth.getBalance(account);
      return balances;
    }, {});
  },

  hexEncode: function(str){
    var hex, i;
    var result = '';
    for (i=0; i < str.length; i++) {
      hex = str.charCodeAt(i).toString(16);
      result += ('000'+hex).slice(-4);
    }
    return result;
  },

  hexDecode: function(str){
    var j;
    var hexes = str.match(/.{1,4}/g) || [];
    var back = '';
    for(j = 0; j<hexes.length; j++) {
      back += String.fromCharCode(parseInt(hexes[j], 16));
    }
    return back;
  },

  lifWei2Lif: function(value){
    return web3.fromWei(value, 'ether');
  },

  lif2LifWei: function(value){
    return web3.toWei(value, 'ether');
  },

  isInvalidOpcodeEx: function(e) {
    return ((e.message.search('invalid opcode') >= 0)
      || (e.message.search('revert') >= 0));
  },

  waitBlocks: function(toWait, accounts){
    return this.waitToBlock(parseInt(web3.eth.blockNumber) + toWait, accounts);
  },

  simulateCrowdsale: async function(rate, balances, accounts, weiPerUSD) {
    await increaseTimeTestRPC(1);
    var startTime = latestTime() + 5;
    var endTime = startTime + 20;
    var crowdsale = await LifCrowdsale.new(
      startTime+3, startTime+15, endTime,
      rate, rate+10, 1,
      accounts[0], accounts[1]
    );
    await increaseTimeTestRPCTo(latestTime()+1);
    await crowdsale.setWeiPerUSDinTGE(weiPerUSD);
    await increaseTimeTestRPCTo(startTime+3);
    for(let i = 0; i < 5; i++) {
      if (balances[i] > 0)
        await crowdsale.sendTransaction({ value: web3.toWei(balances[i]/rate, 'ether'), from: accounts[i + 1]});
    }
    await increaseTimeTestRPCTo(endTime+1);
    await crowdsale.finalize();
    return crowdsale;
  },

  debug: DEBUG_MODE ? console.log : function() {},

  checkToken: async function(token, accounts, totalSupply, balances) {
    let debug = this.debug;
    let [
      tokenTotalSupply,
      tokenAccountBalances,
    ] = await Promise.all([
      token.totalSupply(),
      Promise.all([
        token.balanceOf(accounts[1]),
        token.balanceOf(accounts[2]),
        token.balanceOf(accounts[3]),
        token.balanceOf(accounts[4]),
        token.balanceOf(accounts[5])
      ])
    ]);

    debug('Total Supply:', this.lifWei2Lif(parseFloat(tokenTotalSupply)));
    for(let i = 0; i < 5; i++) {
      debug(
        'Account[' + (i + 1) + ']',
        accounts[i + 1],
        ', Balance:', this.lifWei2Lif(tokenAccountBalances[i])
      );
    }

    if (totalSupply)
      assert.equal(this.lifWei2Lif(parseFloat(tokenTotalSupply)), totalSupply);
    if (balances){
      assert.equal(this.lifWei2Lif(tokenAccountBalances[0]), balances[0]);
      assert.equal(this.lifWei2Lif(tokenAccountBalances[1]), balances[1]);
      assert.equal(this.lifWei2Lif(tokenAccountBalances[2]), balances[2]);
      assert.equal(this.lifWei2Lif(tokenAccountBalances[3]), balances[3]);
      assert.equal(this.lifWei2Lif(tokenAccountBalances[4]), balances[4]);
    }
  },

  getCrowdsaleExpectedRate: function(crowdsale, time) {
    let {
      publicPresaleStartTimestamp, publicPresaleEndTimestamp, startTimestamp,
      end1Timestamp, end2Timestamp, publicPresaleRate, rate1, rate2 } = crowdsale;

    if (time < publicPresaleStartTimestamp) {
      return 0;
    } else if (time <= publicPresaleEndTimestamp) {
      return publicPresaleRate;
    } else if (time < startTimestamp) {
      return 0;
    } else if (time <= end1Timestamp) {
      return rate1;
    } else if (time <= end2Timestamp) {
      return rate2;
    } else {
      return 0;
    }
  },

  getPresalePaymentMaxTokens: function(minCap, maxTokens, presaleBonusRate, presaleAmountEth) {
    let minTokenPrice = minCap / maxTokens;
    return (presaleAmountEth / minTokenPrice) * (presaleBonusRate + 100) / 100;
  }
};
