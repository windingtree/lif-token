
var LifToken = artifacts.require("./LifToken.sol");
var Message = artifacts.require("./Message.sol");

const TOKEN_DECIMALS = 8;
const DEBUG_MODE = true;

module.exports = {

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

  parseBalance: function(balance){
    return (balance/Math.pow(10,TOKEN_DECIMALS)).toPrecision(TOKEN_DECIMALS);
  },
  formatBalance: function(balance){
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

  checkValues: function(token, accounts, etherBalance, totalSupply, tokenPrice, balances, votes, txsSent, txsReceived) {
    var self = this;
    return new Promise(function(resolve, reject) {
      Promise.all([
        web3.eth.getBalance(token.contract.address),
        token.totalSupply(),
        token.getPrice(1),
        token.totalVotes(),
        token.votesIncrementSent(),
        token.votesIncrementReceived(),
        token.balanceOf(accounts[1]),
        token.balanceOf(accounts[2]),
        token.balanceOf(accounts[3]),
        token.balanceOf(accounts[4]),
        token.balanceOf(accounts[5]),
        token.getVotes(accounts[1]),
        token.getVotes(accounts[2]),
        token.getVotes(accounts[3]),
        token.getVotes(accounts[4]),
        token.getVotes(accounts[5]),
        token.txsSent(accounts[1]),
        token.txsSent(accounts[2]),
        token.txsSent(accounts[3]),
        token.txsSent(accounts[4]),
        token.txsSent(accounts[5]),
        token.txsReceived(accounts[1]),
        token.txsReceived(accounts[2]),
        token.txsReceived(accounts[3]),
        token.txsReceived(accounts[4]),
        token.txsReceived(accounts[5]),
      ]).then(values => {

        if (DEBUG_MODE) {
          console.log('Contract Balance:', self.toEther(values[0]), 'Ether;', self.toWei(values[0]), 'Wei');
          console.log('Total Supply:', parseInt(values[1]));
          console.log('Token Price:', parseInt(values[2]));
          console.log('Dao Total Votes:', parseInt(values[3]), 'Dao Votes Increment Exponent sent/received:', parseInt(values[4]),'/',parseInt(values[5]));
          console.log('Account[1]', accounts[1], ", Balance:", self.parseBalance(values[6]), ", Votes:", parseInt(values[11]), ", txsSent / txsReceived:", parseInt(values[16]), parseInt(values[21]));
          console.log('Account[2]', accounts[2], ", Balance:", self.parseBalance(values[7]), ", Votes:", parseInt(values[12]), ", txsSent / txsReceived:", parseInt(values[17]), parseInt(values[22]));
          console.log('Account[3]', accounts[3], ", Balance:", self.parseBalance(values[8]), ", Votes:", parseInt(values[13]), ", txsSent / txsReceived:", parseInt(values[18]), parseInt(values[23]));
          console.log('Account[4]', accounts[4], ", Balance:", self.parseBalance(values[9]), ", Votes:", parseInt(values[14]), ", txsSent / txsReceived:", parseInt(values[19]), parseInt(values[24]));
          console.log('Account[5]', accounts[5], ", Balance:", self.parseBalance(values[10]), ", Votes:", parseInt(values[15]), ", txsSent / txsReceived:", parseInt(values[20]), parseInt(values[25]));
        }

        if (etherBalance)
          assert.equal(self.toEther(values[0]), etherBalance);
        if (totalSupply)
          assert.equal(parseInt(values[1]), totalSupply);
        if (tokenPrice)
          assert.equal(self.toWei(values[2]), tokenPrice);
        if (balances){
          assert.equal(self.parseBalance(values[6]), balances[0]);
          assert.equal(self.parseBalance(values[7]), balances[1]);
          assert.equal(self.parseBalance(values[8]), balances[2]);
          assert.equal(self.parseBalance(values[9]), balances[3]);
          assert.equal(self.parseBalance(values[10]), balances[4]);
        }
        if (votes){
          assert.equal(parseInt(values[11]), votes[0]);
          assert.equal(parseInt(values[12]), votes[1]);
          assert.equal(parseInt(values[13]), votes[2]);
          assert.equal(parseInt(values[14]), votes[3]);
          assert.equal(parseInt(values[15]), votes[4]);
        }
        if (txsSent){
          assert.equal(parseInt(values[16]), txsSent[0]);
          assert.equal(parseInt(values[17]), txsSent[1]);
          assert.equal(parseInt(values[18]), txsSent[2]);
          assert.equal(parseInt(values[19]), txsSent[3]);
          assert.equal(parseInt(values[20]), txsSent[4]);
        }
        if (txsReceived){
          assert.equal(parseInt(values[21]), txsReceived[0]);
          assert.equal(parseInt(values[22]), txsReceived[1]);
          assert.equal(parseInt(values[23]), txsReceived[2]);
          assert.equal(parseInt(values[24]), txsReceived[3]);
          assert.equal(parseInt(values[25]), txsReceived[4]);
        }
        resolve();
      }).catch(err => {
        reject(err);
      });
    });
  },

  getProposal: function(token, id) {
    return new Promise(function(resolve, reject) {

      token.proposals.call(id).then(proposal => {

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

        console.log('['+parsedProposal.id+'] To: '+parsedProposal.target+', Value: '+parsedProposal.value +', MaxBlock: '+parsedProposal.maxBlock+', Desc: '+parsedProposal.description+', Status: '+parsedProposal.status, ', Votes: ',parsedProposal.totalVotes);
        resolve();
      }).catch(err => {
        reject(err);
      });

    });
  },

  getStage: function(token, number) {
    var self = this;
    return new Promise(function(resolve, reject) {
      token.crowdsaleStages.call(number).then(stageData => {
        console.log('[Stage '+number+'] Blocks: '+parseInt(stageData[0])+' - '+parseInt(stageData[1]) +', Start Price: '+self.toEther(stageData[2])+', ChangePerBlock: '+parseInt(stageData[3])+'/'+self.toEther(stageData[4])+' ETH, MinCap: '+self.toEther(stageData[5])+' ETH, MaxCap: '+self.toEther(stageData[6])+' ETH, Total Tokens: '+parseInt(stageData[7])+', Presale Discount: '+parseInt(stageData[8])+', Presale ETH Raised: '+self.toEther(stageData[9])+', Crowdsale Raised: '+self.toEther(stageData[10])+'ETH, Tokens Sold: '+parseInt(stageData[1])+', Final Price: '+self.toEther(stageData[12])+'ETH, Status: '+parseInt(stageData[13]));
        resolve(stageData);
      }).catch(err => {
        reject(err);
      });
    });
  },

  simulateCrowdsale: function(token, total, price, balances, accounts){
    var startBlock = web3.eth.blockNumber;
    var endBlock = web3.eth.blockNumber+5;
    var targetBalance = parseFloat(total*price);
    var self = this;
    return token.addCrowdsaleStage(startBlock, endBlock, price, 10, web3.toWei(0.1, 'ether'), 1, targetBalance, total, 40)
      .then(function(){
        if (balances[0] > 0)
          return token.submitBid(accounts[1], balances[0], { value: balances[0]*price, from: accounts[1] });
      })
      .then(function(){
        if (balances[1] > 0)
          return token.submitBid(accounts[2], balances[1], { value: balances[1]*price, from: accounts[2] });
      })
      .then(function(){
        if (balances[2] > 0)
          return token.submitBid(accounts[3], balances[2], { value: balances[2]*price, from: accounts[3] });
      })
      .then(function(){
        if (balances[3] > 0)
          return token.submitBid(accounts[4], balances[3], { value: balances[3]*price, from: accounts[4] });
      })
      .then(function(){
        if (balances[4] > 0)
          return token.submitBid(accounts[5], balances[4], { value: balances[4]*price, from: accounts[5] });
      })
      .then(function(){
        return self.waitToBlock(endBlock, accounts);
      })
      .then(function() {
        return token.checkCrowdsaleStage(0);
      })
      .then(function() {
        return Promise.all([
          token.crowdsaleStages.call(0),
          token.status()
        ]);
      })
      .then(function([auctionEnded, tokenStatus]) {
        assert.equal(parseInt(tokenStatus), 4);
        assert.equal(parseFloat(auctionEnded[13]), 3);
      })
      .then(function(){
        if (balances[0] > 0)
          return token.claimTokens(0, { from: accounts[1] });
      })
      .then(function(){
        if (balances[1] > 0)
          return token.claimTokens(0, { from: accounts[2] });
      })
      .then(function(){
        if (balances[2] > 0)
          return token.claimTokens(0, { from: accounts[3] });
      })
      .then(function(){
        if (balances[3] > 0)
          return token.claimTokens(0, { from: accounts[4] });
      })
      .then(function(){
        if (balances[4] > 0)
          return token.claimTokens(0, { from: accounts[5] });
      });
  }
};
