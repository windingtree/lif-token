var advanceToBlock = require('./helpers/advanceToBlock');

var LifToken = artifacts.require("./LifToken.sol");
var LifCrowdsale = artifacts.require("./LifCrowdsale.sol");
var abiDecoder = require('abi-decoder');
abiDecoder.addABI(LifToken._json.abi);
abiDecoder.addABI(LifCrowdsale._json.abi);

const TOKEN_DECIMALS = 18;
const DEBUG_MODE = (process.env.WT_DEBUG == "true") || false;

module.exports = {

  abiDecoder: abiDecoder,

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

  waitBlocks: function(toWait, accounts){
    return this.waitToBlock(parseInt(web3.eth.blockNumber) + toWait, accounts);
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

  simulateCrowdsale: async function(rate, balances, accounts) {
    var startBlock = web3.eth.blockNumber;
    var endBlock = web3.eth.blockNumber+11;
    var crowdsale = await LifCrowdsale.new(
      startBlock+1, startBlock+10, endBlock,
      rate, rate+10, rate+20,
      accounts[0], accounts[1],
      1,
      1
    );
    await this.waitToBlock(startBlock+1, accounts);
    if (balances[0] > 0)
      await crowdsale.sendTransaction({ value: web3.toWei(balances[0]/rate, 'ether'), from: accounts[1] });
    if (balances[1] > 0)
      await crowdsale.sendTransaction({ value: web3.toWei(balances[1]/rate, 'ether'), from: accounts[2] });
    if (balances[2] > 0)
      await crowdsale.sendTransaction({ value: web3.toWei(balances[2]/rate, 'ether'), from: accounts[3] });
    if (balances[3] > 0)
      await crowdsale.sendTransaction({ value: web3.toWei(balances[3]/rate, 'ether'), from: accounts[4] });
    if (balances[4] > 0)
      await crowdsale.sendTransaction({ value: web3.toWei(balances[4]/rate, 'ether'), from: accounts[5] });
    await this.waitToBlock(endBlock+1, accounts);
    await crowdsale.finalize();
    return LifToken.at( await crowdsale.token() );
  },

  getCrowdsaleExpectedRate: function(crowdsale, blockNumber) {
    let { startBlock, endBlock1, endBlock2, rate1, rate2 } = crowdsale;
    if (blockNumber < startBlock || blockNumber > endBlock2) {
      return 0;
    } else if (blockNumber <= endBlock1) {
      return rate1;
    } else if (blockNumber <= endBlock2) {
      return rate2;
    }
  },

  getPresalePaymentMaxTokens: function(minCap, maxTokens, presaleBonusRate, presaleAmountEth) {
    let minTokenPrice = minCap / maxTokens;
    return (presaleAmountEth / minTokenPrice) * (presaleBonusRate + 100) / 100;
  }
};
