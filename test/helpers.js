
var LifToken = artifacts.require("./LifToken.sol");
var LifCrowdsale = artifacts.require("./LifCrowdsale.sol");
var abiDecoder = require('abi-decoder');
abiDecoder.addABI(LifToken._json.abi);
abiDecoder.addABI(LifCrowdsale._json.abi);

const TOKEN_DECIMALS = 8;
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
    return new Promise(function(resolve, reject) {
      toWait += parseInt(web3.eth.blockNumber);
      var wait = setInterval( function() {
        if (DEBUG_MODE)
          console.log('Waiting '+parseInt(web3.eth.blockNumber-toWait)+' blocks..');
        if (web3.eth.blockNumber >= toWait) {
          clearInterval(wait);
          resolve();
        } else {
          web3.eth.sendTransaction({from: accounts[0], to: accounts[1], value: 1});
        }
      }, 100 );
    });
  },

  waitToBlock: function(blockNumber, accounts){
    return new Promise(function(resolve, reject) {
      var wait = setInterval( function() {
        if (DEBUG_MODE)
          console.log('Waiting '+parseInt(-(web3.eth.blockNumber-blockNumber))+' blocks..');
        if (web3.eth.blockNumber >= blockNumber) {
          clearInterval(wait);
          resolve(true);
        } else {
          web3.eth.sendTransaction({from: accounts[0], to: accounts[1], value: 1});
        }
      }, 10 );
    });
  },

  checkToken: async function(token, accounts, totalSupply, balances, votes, txsSent, txsReceived) {
    let [
      tokenTotalSupply,
      tokenTotalVotes,
      tokenIncrementSent,
      tokenIncrementReceived,
      tokenAccountBalances,
      tokenAccountVotes,
      tokenAccountTxSent,
      tokenAccountTxReceived
    ] = await Promise.all([
      token.totalSupply(),
      token.totalVotes(),
      token.votesIncrementSent(),
      token.votesIncrementReceived(),
      Promise.all([
        token.balanceOf(accounts[1]),
        token.balanceOf(accounts[2]),
        token.balanceOf(accounts[3]),
        token.balanceOf(accounts[4]),
        token.balanceOf(accounts[5])
      ]),
      Promise.all([
        token.getVotes(accounts[1]),
        token.getVotes(accounts[2]),
        token.getVotes(accounts[3]),
        token.getVotes(accounts[4]),
        token.getVotes(accounts[5])
      ]),
      Promise.all([
        token.txsSent(accounts[1]),
        token.txsSent(accounts[2]),
        token.txsSent(accounts[3]),
        token.txsSent(accounts[4]),
        token.txsSent(accounts[5])
      ]),
      Promise.all([
        token.txsReceived(accounts[1]),
        token.txsReceived(accounts[2]),
        token.txsReceived(accounts[3]),
        token.txsReceived(accounts[4]),
        token.txsReceived(accounts[5])
      ]),
    ]);

    if (DEBUG_MODE) {
      console.log('Total Supply:', parseInt(tokenTotalSupply));
      console.log('Dao Total Votes:', parseInt(tokenTotalVotes), 'Dao Votes Increment Exponent sent/received:', parseInt(tokenIncrementSent),'/',parseInt(tokenIncrementReceived));
      for(i = 0; i < 5; i++) {
        console.log(
          'Account[' + (i + 1) + ']',
          accounts[i + 1],
          ", Balance:", this.lifWei2Lif(tokenAccountBalances[i]),
          ", Votes:", parseInt(tokenAccountBalances[i]),
          ", txsSent / txsReceived:", parseInt(tokenAccountTxSent[i]), parseInt(tokenAccountTxReceived[i]));
      }
    }

    if (totalSupply)
      assert.equal(parseInt(tokenTotalSupply), totalSupply);
    if (balances){
      assert.equal(this.lifWei2Lif(tokenAccountBalances[0]), balances[0]);
      assert.equal(this.lifWei2Lif(tokenAccountBalances[1]), balances[1]);
      assert.equal(this.lifWei2Lif(tokenAccountBalances[2]), balances[2]);
      assert.equal(this.lifWei2Lif(tokenAccountBalances[3]), balances[3]);
      assert.equal(this.lifWei2Lif(tokenAccountBalances[4]), balances[4]);
    }
    if (votes){
      assert.equal(parseInt(tokenAccountVotes[0]), votes[0]);
      assert.equal(parseInt(tokenAccountVotes[1]), votes[1]);
      assert.equal(parseInt(tokenAccountVotes[2]), votes[2]);
      assert.equal(parseInt(tokenAccountVotes[3]), votes[3]);
      assert.equal(parseInt(tokenAccountVotes[4]), votes[4]);
    }
    if (txsSent){
      assert.equal(parseInt(tokenAccountTxSent[0]), txsSent[0]);
      assert.equal(parseInt(tokenAccountTxSent[1]), txsSent[1]);
      assert.equal(parseInt(tokenAccountTxSent[2]), txsSent[2]);
      assert.equal(parseInt(tokenAccountTxSent[3]), txsSent[3]);
      assert.equal(parseInt(tokenAccountTxSent[4]), txsSent[4]);
    }
    if (txsReceived){
      assert.equal(parseInt(tokenAccountTxReceived[0]), txsReceived[0]);
      assert.equal(parseInt(tokenAccountTxReceived[1]), txsReceived[1]);
      assert.equal(parseInt(tokenAccountTxReceived[2]), txsReceived[2]);
      assert.equal(parseInt(tokenAccountTxReceived[3]), txsReceived[3]);
      assert.equal(parseInt(tokenAccountTxReceived[4]), txsReceived[4]);
    }
  },

  checkCrowdsale: async function(crowdsale, etherBalance, tokenPrice) {
    let crowdsaleEtherBalance = await web3.eth.getBalance(crowdsale.contract.address);
    let crowdsalePrice = await crowdsale.getPrice();

    if (DEBUG_MODE) {
      console.log('Contract Balance:', this.toEther(crowdsaleEtherBalance), 'Ether;', this.toWei(crowdsaleEtherBalance), 'Wei');
      console.log('Token Price:', parseInt(crowdsalePrice));
    }

    if (etherBalance)
      assert.equal(this.toEther(crowdsaleEtherBalance), etherBalance, "Crowdsale should have the expected ether balance");
    if (tokenPrice)
      assert.equal(this.toWei(crowdsalePrice), tokenPrice);
  },

  getProposal: async function(token, id) {
    var proposal = await token.proposals.call(id);
    var parsedProposal = {
      target: proposal[0],
      id: parseInt(proposal[1]),
      value: parseInt(proposal[2]),
      description: proposal[3],
      status: parseInt(proposal[4]),
      creationBlock: parseInt(proposal[5]),
      maxBlock: parseInt(proposal[6]),
      agePerBlock: parseInt(proposal[7]),
      votesNeeded: parseInt(proposal[8]),
      actionData: proposal[9],
      totalVotes: parseInt(proposal[10])
    };
    console.log('['+parsedProposal.id+'] To: '+parsedProposal.target+', Value: '+parsedProposal.value +', MaxBlock: '+parsedProposal.maxBlock+', Desc: '+parsedProposal.description+', Status: '+parsedProposal.status, ', Votes: ',parsedProposal.totalVotes,'/',parsedProposal.votesNeeded);
  },

  createAndFundCrowdsale: async function(params, accounts) {
    let token = params.token;
    var crowdsale = await LifCrowdsale.new(token.address, params.startBlock, params.endBlock, params.startPrice, params.changePerBlock,
      params.changePrice, params.minCap, params.maxCap, params.maxTokens, params.presaleDiscount, params.ownerPercentage);

    let oldTokenBalance = parseFloat(await token.balanceOf(token.contract.address));

    // issue the tokens and transfer to the crowdsale
    await token.issueTokens(params.maxTokens);

    assert.equal(this.lifWei2Lif(parseFloat(await token.balanceOf(token.contract.address))), oldTokenBalance + params.maxTokens);

    // transfer the tokens
    await token.transferFrom(token.address, crowdsale.address, this.lif2LifWei(params.maxTokens), {from: accounts[0]});

    assert.equal(await token.balanceOf(crowdsale.contract.address), this.lif2LifWei(params.maxTokens));
    assert.equal(parseFloat(await token.balanceOf(token.contract.address)), oldTokenBalance);

    assert.equal(parseFloat(await crowdsale.startPrice()), params.startPrice);
    assert.equal(parseFloat(await crowdsale.changePerBlock()), params.changePerBlock);
    assert.equal(parseFloat(await crowdsale.changePrice()), params.changePrice);
    assert.equal(parseFloat(await crowdsale.minCap()), params.minCap);

    return crowdsale;
  },

  simulateCrowdsale: async function(token, total, price, balances, accounts){
    var startBlock = web3.eth.blockNumber;
    var endBlock = web3.eth.blockNumber+10;
    var targetBalance = parseFloat(total*price);
    var crowdsale = await LifCrowdsale.new(
      token.address, startBlock, endBlock, price, 10, web3.toWei(0.1, 'ether'), 1, targetBalance, total, 0, 0
    );
    await token.issueTokens(total);
    await token.transferFrom(token.contract.address, crowdsale.contract.address, this.lif2LifWei(total), {from: accounts[0]});
    assert.equal(await token.balanceOf(crowdsale.contract.address), this.lif2LifWei(total));
    await crowdsale.setStatus(2);
    await this.waitToBlock(startBlock+1, accounts);
    if (balances[0] > 0)
      await crowdsale.submitBid({ value: balances[0]*price, from: accounts[1] });
    if (balances[1] > 0)
      await crowdsale.submitBid({ value: balances[1]*price, from: accounts[2] });
    if (balances[2] > 0)
      await crowdsale.submitBid({ value: balances[2]*price, from: accounts[3] });
    if (balances[3] > 0)
      await crowdsale.submitBid({ value: balances[3]*price, from: accounts[4] });
    if (balances[4] > 0)
      await crowdsale.submitBid({ value: balances[4]*price, from: accounts[5] });
    await this.waitToBlock(endBlock+1, accounts);
    await crowdsale.checkCrowdsale(0);
    if (balances[0] > 0)
      await crowdsale.distributeTokens(accounts[1], false);
    if (balances[1] > 0)
      await crowdsale.distributeTokens(accounts[2], false);
    if (balances[2] > 0)
      await crowdsale.distributeTokens(accounts[3], false);
    if (balances[3] > 0)
      await crowdsale.distributeTokens(accounts[4], false);
    if (balances[4] > 0)
      await crowdsale.distributeTokens(accounts[5], false);
    await crowdsale.transferVotes();
    return crowdsale;
  }
};
