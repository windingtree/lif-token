var advanceToBlock = require('./helpers/advanceToBlock');

var BigNumber = web3.BigNumber;

var LifToken = artifacts.require("./LifToken.sol");
var LifCrowdsale = artifacts.require("./LifCrowdsale.sol");
var LifMarketMaker = artifacts.require("./LifMarketMaker.sol");
var abiDecoder = require('abi-decoder');
abiDecoder.addABI(LifToken._json.abi);
abiDecoder.addABI(LifCrowdsale._json.abi);
abiDecoder.addABI(LifMarketMaker._json.abi);

var latestTime = require('./helpers/latestTime');
var {increaseTimeTestRPC, increaseTimeTestRPCTo, duration} = require('./helpers/increaseTime');

const TOKEN_DECIMALS = 18;
const DEBUG_MODE = (process.env.WT_DEBUG == "true") || false;

module.exports = {

  abiDecoder: abiDecoder,

  gasPrice: new BigNumber(100000000000),

  hexEncode: function(str){
    var hex, i;
    var result = "";
    for (i=0; i < str.length; i++) {
      hex = str.charCodeAt(i).toString(16);
      result += ("000"+hex).slice(-4);
    }
    return result;
  },

  hexDecode: function(str){
    var j;
    var hexes = str.match(/.{1,4}/g) || [];
    var back = "";
    for(j = 0; j<hexes.length; j++) {
      back += String.fromCharCode(parseInt(hexes[j], 16));
    }
    return back;
  },

  lifWei2Lif: function(balance){
    return (balance/Math.pow(10,TOKEN_DECIMALS)).toPrecision(TOKEN_DECIMALS);
  },
  lif2LifWei: function(balance){
    return (balance*Math.pow(10,TOKEN_DECIMALS));
  },

  toEther: function(wei){
    return web3.fromWei(parseFloat(wei), 'ether');
  },

  toWei: function(ether){
    return web3.toWei(parseFloat(ether), 'wei');
  },

  isInvalidOpcodeEx: function(e) {
    return e.message.search('invalid opcode') >= 0;
  },

  waitBlocks: function(toWait, accounts){
    return this.waitToBlock(parseInt(web3.eth.blockNumber) + toWait, accounts);
  },

  simulateCrowdsale: async function(rate, balances, accounts) {
    await increaseTimeTestRPC(1);
    var startTime = latestTime() + 5;
    var endTime = startTime + 20;
    var crowdsale = await LifCrowdsale.new(
      startTime, startTime+2,
      startTime+3, startTime+15, endTime,
      rate-1, rate, rate+10, rate+20, 1,
      accounts[0]
    );
    await increaseTimeTestRPCTo(latestTime()+1);
    await crowdsale.setWeiPerUSDinTGE(1);
    await increaseTimeTestRPCTo(startTime+3);
    for(i = 0; i < 5; i++) {
      if (balances[i] > 0)
        await crowdsale.sendTransaction({ value: web3.toWei(balances[i]/rate, 'ether'), from: accounts[i + 1]});
    }
    await increaseTimeTestRPCTo(endTime+1);
    await crowdsale.finalize();
    return LifToken.at(await crowdsale.token.call());
  },

  debug: DEBUG_MODE ? console.log : function() {},

  waitToBlock: async function(blockNumber, accounts){
    let debug = this.debug;
    let blocksLeft = blockNumber - web3.eth.blockNumber;

    if ((blocksLeft % 5) != 0 && blocksLeft > 0)
      debug('Waiting ', blocksLeft, ' blocks..');

    if (blockNumber > web3.eth.blockNumber)
      await advanceToBlock.advanceToBlock(blockNumber);
    else
      return false; // no need to wait
  },

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
    for(i = 0; i < 5; i++) {
      debug(
        'Account[' + (i + 1) + ']',
        accounts[i + 1],
        ", Balance:", this.lifWei2Lif(tokenAccountBalances[i])
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
      publicPresaleStartTime, publicPresaleEndTime, startTimestamp,
      end1Timestamp, end2Timestamp, publicPresaleRate, rate1, rate2 } = crowdsale;

    if (time < publicPresaleStartTime) {
      return 0;
    } else if (time <= publicPresaleEndTime) {
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
