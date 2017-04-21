
var protobuf = require("protobufjs");

var LifToken = artifacts.require("./LifToken.sol");
var Message = artifacts.require("./Message.sol");

String.prototype.hexEncode = function(){
    var hex, i;
    var result = "";
    for (i=0; i < this.length; i++) {
      hex = this.charCodeAt(i).toString(16);
      result += ("000"+hex).slice(-4);
    }
    return result;
};

String.prototype.hexDecode = function(){
    var j;
    var hexes = this.match(/.{1,4}/g) || [];
    var back = "";
    for(j = 0; j<hexes.length; j++) {
      back += String.fromCharCode(parseInt(hexes[j], 16));
    }
    return back;
};

const TOKEN_DECIMALS = 8;
const DEBUG_MODE = true;
const LOG_EVENTS = true;

function parseBalance(balance){
  return (balance/Math.pow(10,TOKEN_DECIMALS)).toPrecision(TOKEN_DECIMALS);
}
function formatBalance(balance){
  return (balance*Math.pow(10,TOKEN_DECIMALS));
}

function toEther(wei){
  return web3.fromWei(parseFloat(wei), 'ether');
}

function toWei(ether){
  return web3.toWei(parseFloat(ether), 'wei');
}

contract('LifToken', function(accounts) {

  var token;
  var eventsWatcher;

  beforeEach(function(done) {
    LifToken.new(web3.toWei(10, 'ether'), 10000, 2, 3, 5)
      .then(function(_token) {
        token = _token;
        eventsWatcher = token.allEvents();
        eventsWatcher.watch(function(error, log){
          if (LOG_EVENTS)
            console.log('Event:', log.event, ':',log.args);
        });
        done();
      });
  });

  afterEach(function(done) {
    eventsWatcher.stopWatching();
    done();
  });

  function waitBlocks(toWait){
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
  }

  function waitToBlock(blockNumber){
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
  }

  function chekValues(etherBalance, totalSupply, tokenPrice, balances, votes, txsSent, txsReceived) {
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
          console.log('Contract Balance:', toEther(values[0]), 'Ether;', toWei(values[0]), 'Wei');
          console.log('Total Supply:', parseInt(values[1]));
          console.log('Token Price:', parseInt(values[2]));
          console.log('Dao Total Votes:', parseInt(values[3]), 'Dao Votes Increment Exponent sent/received:', parseInt(values[4]),'/',parseInt(values[5]));
          console.log('Account[1]', accounts[1], ", Balance:", parseBalance(values[6]), ", Votes:", parseInt(values[11]), ", txsSent / txsReceived:", parseInt(values[16]), parseInt(values[21]));
          console.log('Account[2]', accounts[2], ", Balance:", parseBalance(values[7]), ", Votes:", parseInt(values[12]), ", txsSent / txsReceived:", parseInt(values[17]), parseInt(values[22]));
          console.log('Account[3]', accounts[3], ", Balance:", parseBalance(values[8]), ", Votes:", parseInt(values[13]), ", txsSent / txsReceived:", parseInt(values[18]), parseInt(values[23]));
          console.log('Account[4]', accounts[4], ", Balance:", parseBalance(values[9]), ", Votes:", parseInt(values[14]), ", txsSent / txsReceived:", parseInt(values[19]), parseInt(values[24]));
          console.log('Account[5]', accounts[5], ", Balance:", parseBalance(values[10]), ", Votes:", parseInt(values[15]), ", txsSent / txsReceived:", parseInt(values[20]), parseInt(values[25]));
        }

        if (etherBalance)
          assert.equal(toEther(values[0]), etherBalance);
        if (totalSupply)
          assert.equal(parseInt(values[1]), totalSupply);
        if (tokenPrice)
          assert.equal(toWei(values[2]), tokenPrice);
        if (balances){
          assert.equal(parseBalance(values[6]), balances[0]);
          assert.equal(parseBalance(values[7]), balances[1]);
          assert.equal(parseBalance(values[8]), balances[2]);
          assert.equal(parseBalance(values[9]), balances[3]);
          assert.equal(parseBalance(values[10]), balances[4]);
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
  }

  function getProposal(id) {
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
  }

  function getStage(number) {
    return new Promise(function(resolve, reject) {
      token.crowdsaleStages.call(number).then(stageData => {
        console.log('[Stage '+number+'] Blocks: '+parseInt(stageData[0])+' - '+parseInt(stageData[1]) +', Start Price: '+toEther(stageData[2])+', ChangePerBlock: '+parseInt(stageData[3])+'/'+toEther(stageData[4])+' ETH, MinCap: '+toEther(stageData[5])+' ETH, MaxCap: '+toEther(stageData[6])+' ETH, Total Tokens: '+parseInt(stageData[7])+', Presale Discount: '+parseInt(stageData[8])+', Presale ETH Raised: '+toEther(stageData[9])+', Crowdsale Raised: '+toEther(stageData[10])+'ETH, Tokens Sold: '+parseInt(stageData[1])+', Final Price: '+toEther(stageData[12])+'ETH, Status: '+parseInt(stageData[13]));
        resolve(stageData);
      }).catch(err => {
        reject(err);
      });
    });
  }

  function simulateCrowdsale(_token, total, price, balances){
    var startBlock = web3.eth.blockNumber;
    var endBlock = web3.eth.blockNumber+5;
    var targetBalance = parseFloat(total*price);
    return _token.addCrowdsaleStage(startBlock, endBlock, price, 10, web3.toWei(0.1, 'ether'), 1, targetBalance, total, 40)
      .then(function(){
        if (balances[0] > 0)
          return _token.submitBid(accounts[1], balances[0], { value: balances[0]*price, from: accounts[1] });
      })
      .then(function(){
        if (balances[1] > 0)
          return _token.submitBid(accounts[2], balances[1], { value: balances[1]*price, from: accounts[2] });
      })
      .then(function(){
        if (balances[2] > 0)
          return _token.submitBid(accounts[3], balances[2], { value: balances[2]*price, from: accounts[3] });
      })
      .then(function(){
        if (balances[3] > 0)
          return _token.submitBid(accounts[4], balances[3], { value: balances[3]*price, from: accounts[4] });
      })
      .then(function(){
        if (balances[4] > 0)
          return _token.submitBid(accounts[5], balances[4], { value: balances[4]*price, from: accounts[5] });
      })
      .then(function(){
        return waitToBlock(endBlock);
      })
      .then(function() {
        return _token.checkCrowdsaleStage(0);
      })
      .then(function() {
        return Promise.all([
          _token.crowdsaleStages.call(0),
          _token.status()
        ]);
      })
      .then(function([auctionEnded, tokenStatus]) {
        assert.equal(parseInt(tokenStatus), 4);
        assert.equal(parseFloat(auctionEnded[13]), 3);
      })
      .then(function(){
        if (balances[0] > 0)
          return _token.claimTokens(0, { from: accounts[1] });
      })
      .then(function(){
        if (balances[1] > 0)
          return _token.claimTokens(0, { from: accounts[2] });
      })
      .then(function(){
        if (balances[2] > 0)
          return _token.claimTokens(0, { from: accounts[3] });
      })
      .then(function(){
        if (balances[3] > 0)
          return _token.claimTokens(0, { from: accounts[4] });
      })
      .then(function(){
        if (balances[4] > 0)
          return _token.claimTokens(0, { from: accounts[5] });
      });
  }

  ////////////////////////////////////////////////////////
  //                    Lif Token Tests                 //
  ////////////////////////////////////////////////////////

  it("Should simulate a crwodsale of 7m tokens with on ducth auction stage, using future discount and distribute 3M of the tokens using futurePayments", function(done) {
    var currentBlock = web3.eth.blockNumber;
    var startBlock = currentBlock+10;
    var endBlock = currentBlock+110;
    var totalWeiSent = 0;
    var totalTokensBought = 0;
    var lastPrice = 0;
    var presaleTokens = 0;
    // Add crowdsale stage to sell 7M tokens using dutch auction and the future payments.
    Promise.all([
      token.addCrowdsaleStage(startBlock, endBlock, web3.toWei(5, 'ether'), 10, web3.toWei(0.4, 'ether'), web3.toWei(10000000, 'ether'), web3.toWei(40000000, 'ether'), 7000000, 40),
      token.addFuturePayment(accounts[0], endBlock, 625000, web3.toHex("Founding Team first year retribution tokens")),
      token.addFuturePayment(accounts[0], endBlock+10, 625000, web3.toHex("Founding Team second year retribution tokens")),
      token.addFuturePayment(accounts[0], endBlock+20, 625000, web3.toHex("Founding Team third year retribution tokens")),
      token.addFuturePayment(accounts[0], endBlock+30, 625000, web3.toHex("Founding Team four year retribution tokens")),
      token.addFuturePayment(accounts[0], endBlock, 500000, web3.toHex("Tokens for future WT employees"))
    ])
    .then(function() {
      return token.addDiscount(accounts[10], 0, web3.toWei(250000, 'ether'));
    })
    .then(function() {
      return Promise.all([
        getStage(0),
        token.maxSupply(),
        token.futurePayments.call(0),
        token.futurePayments.call(1),
        token.futurePayments.call(2),
        token.futurePayments.call(3),
        token.futurePayments.call(4)
      ]);
    })
    // Check that the crowdsale stage and payments created succesfully with the right values
    .then(function([dutchAuction, maxSupply, FTPaymentFirstYear, FTPaymentSecondYear, FTPaymentThirdYear, FTPaymentFourthPayment, futureMembersPayment]) {
      assert.equal(FTPaymentFirstYear[0], accounts[0]);
      assert.equal(parseFloat(FTPaymentFirstYear[1]), endBlock);
      assert.equal(parseFloat(FTPaymentFirstYear[2]), 625000);
      assert.equal(FTPaymentSecondYear[0], accounts[0]);
      assert.equal(parseFloat(FTPaymentSecondYear[1]), endBlock+10);
      assert.equal(parseFloat(FTPaymentSecondYear[2]), 625000);
      assert.equal(FTPaymentThirdYear[0], accounts[0]);
      assert.equal(parseFloat(FTPaymentThirdYear[1]), endBlock+20);
      assert.equal(parseFloat(FTPaymentThirdYear[2]), 625000);
      assert.equal(FTPaymentFourthPayment[0], accounts[0]);
      assert.equal(parseFloat(FTPaymentFourthPayment[1]), endBlock+30);
      assert.equal(parseFloat(FTPaymentFourthPayment[2]), 625000);
      assert.equal(futureMembersPayment[0], accounts[0]);
      assert.equal(parseFloat(futureMembersPayment[1]), endBlock);
      assert.equal(parseFloat(futureMembersPayment[2]), 500000);
      assert.equal(parseFloat(dutchAuction[2]), web3.toWei(5, 'ether'));
      assert.equal(parseFloat(dutchAuction[3]), 10);
      assert.equal(parseFloat(dutchAuction[4]), web3.toWei(0.4, 'ether'));
      assert.equal(parseFloat(dutchAuction[5]), web3.toWei(10000000, 'ether'));
      assert.equal(parseFloat(maxSupply), 10000000);
    })
    // Shouldnt be able to submit the bid since first stage didnt started, the ethers will be returned
    .then(function() {
      return token.submitBid(accounts[1], 10, { value: web3.toWei(1, 'ether'), from: accounts[1] });
    })
    .catch(function(error) {
      if (error.message.search('invalid JUMP') == -1) throw error;
    })
    // Wait for the crodsale to start and bid for for the total of the tokens from differents accounts using different prices.
    .then(function() {
      return waitToBlock(startBlock);
    })
    .then(function() {
      return token.getPrice(500000);
    })
    .then(function(price) {
      lastPrice = parseFloat(price)/500000;
      assert.equal(price, web3.toWei(5, 'ether')*500000);
      totalWeiSent += parseFloat(price);
      totalTokensBought += 500000;
      return token.submitBid(accounts[1], 500000, { value: web3.toWei(5, 'ether')*500000, from: accounts[1] });
    })
    .then(function() {
      return chekValues(toEther(500000*web3.toWei(5, 'ether')), 0, web3.toWei(5, 'ether'), [0, 0, 0, 0, 0]);
    })
    .then(function() {
      return waitToBlock(startBlock+10);
    })
    .then(function() {
      return token.getPrice(1);
    })
    .then(function(price) {
      lastPrice = parseFloat(price);
      totalWeiSent += parseFloat(price)*1000000;
      totalWeiSent += parseFloat(price)*500000;
      totalTokensBought += 1000000;
      totalTokensBought += 500000;
      return Promise.all([
        token.submitBid(accounts[2], 1000000, { value: price*1000000, from: accounts[2] }),
        token.submitBid(accounts[3], 500000, { value: price*500000, from: accounts[3] })
      ]);
    })
    .then(function() {
      return waitToBlock(startBlock+20);
    })
    .then(function() {
      return token.getPrice(1);
    })
    .then(function(price) {
      lastPrice = parseFloat(price);
      totalWeiSent += parseFloat(price)*1000000;
      totalWeiSent += parseFloat(price)*2000000;
      totalTokensBought += 1000000;
      totalTokensBought += 2000000;
      return Promise.all([
        token.submitBid(accounts[4], 1000000, { value: price*1000000, from: accounts[4] }),
        token.submitBid(accounts[5], 2000000, { value: price*2000000, from: accounts[5] })
      ]);
    })
    .then(function() {
      return waitToBlock(startBlock+40);
    })
    .then(function() {
      return token.getPrice(1);
    })
    .then(function(price) {
      lastPrice = parseFloat(price);
      totalWeiSent += parseFloat(price)*750000;
      totalWeiSent += parseFloat(price)*1000000;
      totalWeiSent += parseFloat(price)*127451;
      totalTokensBought += 750000;
      totalTokensBought += 1000000;
      totalTokensBought += 127451;
      return Promise.all([
        token.submitBid(accounts[6], 750000, { value: price*750000, from: accounts[6] }),
        token.submitBid(accounts[7], 1000000, { value: price*1000000, from: accounts[7] }),
        token.submitBid(accounts[8], 127451, { value: price*127451, from: accounts[8] })
      ]);
    })
    .then(function() {
      return getStage(0);
    })
    // Check that the crowdsale stage is ready to be completed and reached the completion
    .then(function(auctionSuccess) {
      assert.equal(parseFloat(auctionSuccess[2]), web3.toWei(5, 'ether'));
      assert.equal(parseFloat(auctionSuccess[3]), 10);
      assert.equal(parseFloat(auctionSuccess[4]), web3.toWei(0.4, 'ether'));
      assert.equal(parseFloat(auctionSuccess[5]), web3.toWei(10000000, 'ether'));
      assert.equal(parseFloat(auctionSuccess[6]), web3.toWei(40000000, 'ether'));
      assert.equal(parseFloat(auctionSuccess[7]), 7000000);
      assert.equal(parseFloat(auctionSuccess[8]), 40);
      assert.equal(toEther(auctionSuccess[9]), 250000);
      assert.equal(parseBalance(auctionSuccess[10]), parseBalance(totalWeiSent));
      assert.equal(parseFloat(auctionSuccess[11]), totalTokensBought);
      assert.equal(parseFloat(auctionSuccess[12]), lastPrice);
      assert.equal(parseFloat(auctionSuccess[13]), 2);
      presaleTokens = toWei(250000)/(lastPrice*0.6);
      return token.status();
    })
    .then(function(status) {
      assert.equal(parseFloat(status), 3);
      return waitToBlock(endBlock);
    })
    .then(function() {
      return token.checkCrowdsaleStage(0);
    })
    .then(function() {
      return Promise.all([
        getStage(0),
        token.status()
      ]);
    })
    // Check the values of the ended crowdsale stage, token status, and claim the tokens
    .then(function([auctionEnded, tokenStatus]) {
      assert.equal(parseInt(tokenStatus), 4);
      assert.equal(parseFloat(auctionEnded[2]), web3.toWei(5, 'ether'));
      assert.equal(parseFloat(auctionEnded[3]), 10);
      assert.equal(parseFloat(auctionEnded[4]), web3.toWei(0.4, 'ether'));
      assert.equal(parseFloat(auctionEnded[5]), web3.toWei(10000000, 'ether'));
      assert.equal(parseFloat(auctionEnded[6]), web3.toWei(40000000, 'ether'));
      assert.equal(parseFloat(auctionEnded[7]), 7000000);
      assert.equal(parseFloat(auctionEnded[8]), 40);
      assert.equal(toEther(auctionEnded[9]), 250000);
      assert.equal(parseBalance(auctionEnded[10]), parseBalance(totalWeiSent));
      assert.equal(parseFloat(auctionEnded[11]), totalTokensBought);
      assert.equal(parseFloat(auctionEnded[12]), lastPrice);
      assert.equal(parseFloat(auctionEnded[13]), 3);
      return Promise.all([
        token.claimTokens(0, {from: accounts[1]}),
        token.claimTokens(0, {from: accounts[2]}),
        token.claimTokens(0, {from: accounts[3]}),
        token.claimTokens(0, {from: accounts[4]}),
        token.claimTokens(0, {from: accounts[5]}),
        token.claimTokens(0, {from: accounts[6]}),
        token.claimTokens(0, {from: accounts[7]}),
        token.claimTokens(0, {from: accounts[8]}),
        token.claimTokensDiscount(0, {from: accounts[10]})
      ]);
    })
    .then(function() {
      return chekValues(0, 7000000, 0, [500000, 1000000, 500000, 1000000, 2000000]);
    })
    .then(function() {
      return waitToBlock(endBlock+1);
    })
    // Shouldnt allow to a claim a payment before the requested block
    .then(function() {
      return token.claimTokensPayment(3, {from: accounts[0]});
    })
    .catch(function(error) {
      if (error.message.search('invalid JUMP') == -1) throw error;
    })
    .then(function() {
      return waitToBlock(endBlock+31);
    })
    // Should be able to claim all the payments
    .then(function() {
      return Promise.all([
        token.claimTokensPayment(0, {from: accounts[0]}),
        token.claimTokensPayment(1, {from: accounts[0]}),
        token.claimTokensPayment(2, {from: accounts[0]}),
        token.claimTokensPayment(3, {from: accounts[0]}),
        token.claimTokensPayment(4, {from: accounts[0]})
      ]);
    })
    // Check all final values
    .then(function() {
      return chekValues(0, 10000000, 0, [500000, 1000000, 500000, 1000000, 2000000]);
    })
    .then(function() {
      done();
    });
  });

  it("should simulate a crowdsale correctly", function(done) {
    simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0])
      .then(function() {
        return chekValues(1000000, 10000000, 0, [4000000,3000000,2000000,1000000,0]);
      }).then(function(){
        done();
      });
  });

  it("should return the correct allowance amount after approval", function(done) {
    simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0])
      .then(function() {
        return token.approve(accounts[2], formatBalance(10),{ from: accounts[1] });
      })
      .then(function() {
        return token.allowance(accounts[1], accounts[2],{ from: accounts[1]});
      })
      .then(function(allowance) {
        assert.equal(parseBalance(allowance), 10);
        return chekValues(1000000, 10000000, 0, [4000000,3000000,2000000,1000000,0]);
      }).then(function(){
        done();
      });
  });

  it("should return correct balances after transfer", function(done) {
    simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0])
      .then(function() {
        return token.transfer(accounts[2], formatBalance(33.3), { from: accounts[1] });
      })
      .then(function() {
        return chekValues(1000000, 10000000, 0, [3999966.7,3000033.3,2000000,1000000,0]);
      }).then(function(){
        done();
      });
  });

  it("should throw an error when trying to transfer more than balance", function(done) {
    simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0])
      .then(function() {
        return token.transfer(accounts[2], formatBalance(4000001));
      })
      .catch(function(error) {
        if (error.message.search('invalid JUMP') == -1) throw error;
      })
      .then(function() {
        return chekValues(1000000, 10000000, 0, [4000000,3000000,2000000,1000000,0]);
      }).then(function(){
        done();
      });
  });

  it("should return correct balances after transfering from another account", function(done) {
    simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0])
      .then(function() {
        return token.approve(accounts[3], formatBalance(1000), {from: accounts[1]});
      })
      .then(function() {
        return token.transferFrom(accounts[1], accounts[3], formatBalance(1000), "", {from: accounts[3]});
      })
      .then(function() {
        return chekValues(1000000, 10000000, 0, [3999000,3000000,2001000,1000000,0]);
      }).then(function(){
        done();
      });
  });

  it("should throw an error when trying to transfer more than allowed", function(done) {
    simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0])
      .then(function() {
        return token.approve(accounts[3], formatBalance(1000), {from: accounts[1]});
      })
      .then(function() {
        return token.transferFrom(accounts[1], accounts[3], formatBalance(1001), "", {from: accounts[3]});
      })
      .catch(function(error) {
        if (error.message.search('invalid JUMP') == -1) throw error;
      })
      .then(function() {
        return chekValues(1000000, 10000000, 0, [4000000,3000000,2000000,1000000,0]);
      }).then(function(){
        done();
      });
  });

  it("should return correct balances after transferData and show the right JSON data transfered", function(done) {
    simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0])
      .then(function() {
        var dataParsed = JSON.stringify({awesomeField:"AwesomeString"}).hexEncode();
        if (DEBUG_MODE) console.log('Data parsed:',dataParsed);
        return token.transferData(accounts[2], formatBalance(1000), dataParsed, {from: accounts[1]});
      })
      .then(function(transaction) {
        var decodedObj = JSON.parse(transaction.logs[0].args.data.hexDecode());
        assert.equal("AwesomeString", decodedObj.awesomeField);
        return chekValues(1000000, 10000000, 0, [3999000,3001000,2000000,1000000,0]);
      }).then(function(){
        done();
      });
  });

  it("should return correct balances after transfer and show the right PROTOBUF data transfered", function(done) {
    var AwesomeMessage, message, encodedBuffer, encodedHex;
    simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0])
      .then(function() {
        return protobuf.load("test/awesome.proto");
      })
      .then(function(awesomeRoot) {
        AwesomeMessage = awesomeRoot.lookup("awesomepackage.AwesomeMessage");
        message = AwesomeMessage.create({ awesomeField: "AwesomeString" });
        encodedBuffer = AwesomeMessage.encode(message).finish();
        encodedHex = encodedBuffer.toString().hexEncode();
        return token.transferData(accounts[2], 0, encodedHex, {from: accounts[1]});
      })
      .then(function(transaction) {
        var decodedBuffer = new Buffer(transaction.logs[0].args.data.toString().hexDecode());
        assert.equal("AwesomeString", AwesomeMessage.decode(decodedBuffer).awesomeField);
        return chekValues(1000000, 10000000, 0, [4000000,3000000,2000000,1000000,0]);
      }).then(function(){
        done();
      });
  });

  ////////////////////////////////////////////////////////
  //                    Lif DAO Tests                   //
  ////////////////////////////////////////////////////////

  it("Should add the min votes needed for native contract actions", function(done) {
    var signature = token.contract.setBaseProposalFee.getData(0x0).toString('hex').substring(0,10);
    console.log('Action setBaseProposalFee(uint256) signature', signature);
    token.buildMinVotes(token.contract.address, 86, signature, {from: accounts[0]})
      .then(function() {
        signature = token.contract.setProposalBlocksWait.getData(0x0).toString('hex').substring(0,10);
        console.log('Action setProposalBlocksWait(uint256) signature', signature);
        return token.buildMinVotes(token.contract.address, 87, signature, {from: accounts[0]});
      })
      .then(function() {
        signature = token.contract.addDAOAction.getData(0x0, 0x0, 0x0).toString('hex').substring(0,10);
        console.log('Action addDAOAction(address,uint,bytes4) signature', signature);
        return token.buildMinVotes(token.contract.address, 88, signature, {from: accounts[0]});
      })
      .then(function() {
        signature = token.contract.sendEther.getData(0x0, 0x0).toString('hex').substring(0,10);
        console.log('Action sendEther(address,uint) signature', signature);
        return token.buildMinVotes(token.contract.address, 89, signature, {from: accounts[0]});
      })
      .then(function() {
        signature = token.contract.setStatus.getData(0x0).toString('hex').substring(0,10);
        console.log('Action setStatus(uint) signature', signature);
        return token.buildMinVotes(token.contract.address, 90, signature, {from: accounts[0]});
      })
      .then(function() {
        return Promise.all([
          token.getActionDAO(token.contract.address, token.contract.setBaseProposalFee.getData(0x0).toString('hex').substring(0,10)),
          token.getActionDAO(token.contract.address, token.contract.setProposalBlocksWait.getData(0x0).toString('hex').substring(0,10)),
          token.getActionDAO(token.contract.address, token.contract.addDAOAction.getData(0x0).toString('hex').substring(0,10)),
          token.getActionDAO(token.contract.address, token.contract.sendEther.getData(0x0).toString('hex').substring(0,10)),
          token.getActionDAO(token.contract.address, token.contract.setStatus.getData(0x0).toString('hex').substring(0,10))
        ]);
      })
      .then(function(actions){
        assert.equal(actions[0], 86);
        assert.equal(actions[1], 87);
        assert.equal(actions[2], 88);
        assert.equal(actions[3], 89);
        assert.equal(actions[4], 90);
        done();
      });
  });

  it("Should add a setMinProposalVotes proposal, be voted by another user, check it and get executed.", function(done) {
    var signature, data;
    signature = token.contract.setMinProposalVotes.getData(0x0).toString('hex').substring(0,10);
    console.log('Action setMinProposalVotes(uint256) signature', signature);
    token.buildMinVotes(token.contract.address, 90, signature, {from: accounts[0]})
      .then(function() {
        return simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0]);
      })
      .then(function() {
        var transfers = [];
        for (var i = 0; i < 15; i++)
          transfers.push(token.transfer(accounts[1], formatBalance(100), "", {from: accounts[2]}));
        for (i = 0; i < 6; i++)
          transfers.push(token.transfer(accounts[3], formatBalance(10), "", {from: accounts[1]}));
        return Promise.all(transfers);
      })
      .then(function() {
        return chekValues(1000000, 10000000, 0, [4001440,2998500,2000060,1000000,0], [6, 4, 2, 0, 0], [6, 15, 0, 0, 0], [15, 0, 6, 0, 0]);
      })
      .then(function() {
        data = token.contract.setMinProposalVotes.getData( web3.toHex(10) ).toString('hex');
        return token.newProposal(token.contract.address, 0, 'Set minProposalVotes to 10', 100, signature, data, {from: accounts[1], value: web3.toWei(10, 'ether')});
      })
      .then(function() {
        return token.vote(1, true, {from: accounts[2]});
      })
      .then(function() {
        return token.vote(1, true, {from: accounts[3]});
      })
      .then(function(result) {
        return token.executeProposal(1, {from: accounts[1]});
      })
      .then(function() {
        data = token.contract.setMinProposalVotes.getData( web3.toHex(20) ).toString('hex');
        return token.newProposal(token.contract.address, 0, 'Set minProposalVotes to 20', 100, signature, data, {from: accounts[1], value: web3.toWei(10, 'ether')});
      })
      .catch(function(error) {
        if (error.message.indexOf('invalid JUMP') < 0) throw error;
      })
      .then(function() {
        return token.minProposalVotes();
      })
      .then(function(minProposalVotes){
        console.log('New minProposalVotes on token:', parseInt(minProposalVotes));
        assert.equal(parseInt(minProposalVotes), 10);
        chekValues(1000010, 10000000, 0, [4001440,2998500,2000060,1000000,0], [6, 4, 2, 0, 0], [6, 15, 0, 0, 0], [15, 0, 6, 0, 0]);
      }).then(function(){
        done();
      });
  });

  it("Should add a setBaseProposalFee proposal, be voted by another user, check it and get executed.", function(done) {
    var signature, data;
    signature = token.contract.setBaseProposalFee.getData(0x0).toString('hex').substring(0,10);
    console.log('Action setBaseProposalFee(uint256) signature', signature);
    token.buildMinVotes(token.contract.address, 90, signature, {from: accounts[0]})
      .then(function() {
        return simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0]);
      })
      .then(function() {
        var transfers = [];
        for (var i = 0; i < 15; i++)
          transfers.push(token.transfer(accounts[1], formatBalance(100), "", {from: accounts[2]}));
        for (i = 0; i < 6; i++)
          transfers.push(token.transfer(accounts[3], formatBalance(10), "", {from: accounts[1]}));
        return Promise.all(transfers);
      })
      .then(function() {
        return chekValues(1000000, 10000000, 0, [4001440,2998500,2000060,1000000,0], [6, 4, 2, 0, 0], [6, 15, 0, 0, 0], [15, 0, 6, 0, 0]);
      })
      .then(function() {
        var data = token.contract.setBaseProposalFee.getData( web3.toHex( web3.toWei(60, 'ether') ) ).toString('hex');
        return token.newProposal(token.contract.address, 0, 'Set baseProposalFee to 60 ETH', 100, signature, data, {from: accounts[1], value: web3.toWei(10, 'ether')});
      })
      .then(function() {
        return token.vote(1, true, {from: accounts[2]});
      })
      .then(function() {
        return token.vote(1, true, {from: accounts[3]});
      })
      .then(function(result) {
        return token.executeProposal(1, {from: accounts[1]});
      })
      .then(function() {
        return token.baseProposalFee();
      })
      .then(function(baseProposalFee) {
        assert.equal(parseInt(baseProposalFee), web3.toWei(60, 'ether'));
        var data = token.contract.setBaseProposalFee.getData( web3.toHex( web3.toWei(100, 'ether') ) ).toString('hex');
        return token.newProposal(token.contract.address, 0, 'Set baseProposalFee to 100 ETH', 100, signature, data, {from: accounts[1], value: web3.toWei(10, 'ether')});
      })
      .catch(function(error) {
        if (error.message.indexOf('invalid JUMP') < 0) throw error;
      })
      .then(function() {
        var data = token.contract.setBaseProposalFee.getData( web3.toHex( web3.toWei(100, 'ether') ) ).toString('hex');
        return token.newProposal(token.contract.address, 0, 'Set baseProposalFee to 100 ETH', 100, signature, data, {from: accounts[1], value: web3.toWei(60, 'ether')});
      })
      .then(function() {
        return token.vote(2, true, {from: accounts[2]});
      })
      .then(function() {
        return token.vote(2, true, {from: accounts[3]});
      })
      .then(function(result) {
        return token.executeProposal(2, {from: accounts[1]});
      })
      .then(function() {
        return token.baseProposalFee();
      })
      .then(function(baseProposalFee){
        console.log('New baseProposalFee on token:', parseInt(baseProposalFee));
        assert.equal(parseInt(baseProposalFee), web3.toWei(100, 'ether'));
        return chekValues(1000070, 10000000, 0, [4001440,2998500,2000060,1000000,0], [6, 4, 2, 0, 0], [6, 15, 0, 0, 0], [15, 0, 6, 0, 0]);
      }).then(function(){
        done();
      });
  });

  it("Should change proposalBlocksWait using a proposal, create another proposal and reach enough blocks to be removed.", function(done) {
    var signature, data;
    signature = token.contract.setProposalBlocksWait.getData(0x0).toString('hex').substring(0,10);
    console.log('Action setProposalBlocksWait(uint256) signature', signature);
    token.buildMinVotes(token.contract.address, 90, signature, {from: accounts[0]})
      .then(function() {
        return simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0]);
      })
      .then(function() {
        var transfers = [];
        for (var i = 0; i < 15; i++)
          transfers.push(token.transfer(accounts[1], formatBalance(100), "", {from: accounts[2]}));
        for (i = 0; i < 6; i++)
          transfers.push(token.transfer(accounts[3], formatBalance(10), "", {from: accounts[1]}));
        return Promise.all(transfers);
      })
      .then(function() {
        return chekValues(1000000, 10000000, 0, [4001440,2998500,2000060,1000000,0], [6, 4, 2, 0, 0], [6, 15, 0, 0, 0], [15, 0, 6, 0, 0]);
      })
      .then(function() {
        var data = token.contract.setProposalBlocksWait.getData( web3.toHex(10) ).toString('hex');
        return token.newProposal(token.contract.address, 0, 'Set setProposalBlocksWait to 10 blocks', 100, signature, data, {from: accounts[1], value: web3.toWei(10, 'ether')});
      })
      .then(function(proposals) {
        return token.vote(1, true, {from: accounts[2]});
      })
      .then(function(result) {
        return token.executeProposal(1, {from: accounts[1]});
      })
      .then(function() {
        return token.proposalBlocksWait();
      })
      .then(function(proposalBlocksWait){
        console.log('New proposal blocks wait:', parseInt(proposalBlocksWait));
        assert.equal(parseInt(proposalBlocksWait), 10);
        return chekValues(1000010, 10000000, 0, [4001440,2998500,2000060,1000000,0], [6, 4, 2, 0, 0], [6, 15, 0, 0, 0], [15, 0, 6, 0, 0]);
      })
      .then(function() {
        var data = token.contract.setProposalBlocksWait.getData( web3.toHex(999) ).toString('hex');
        return token.newProposal(token.contract.address, 0, 'Set setProposalBlocksWait to 999 blocks', 100, signature, data, {from: accounts[1], value: web3.toWei(10, 'ether')});
      })
      .then(function(proposals) {
        return token.vote(2, true, {from: accounts[2]});
      })
      .then(function(proposals) {
        return waitBlocks(11);
      })
      .then(function() {
        return token.executeProposal(2, {from: accounts[1]});
      })
      .catch(function(error) {
        if (error.message.indexOf('invalid JUMP') < 0) throw error;
      })
      .then(function(result) {
        return token.removeProposal(2, {from: accounts[2]});
      })
      .then(function() {
        done();
      });
  });

  it("Should add a proposal to send ethers to another address, be voted by another user, check it and get executed.", function(done) {
    var signature, data;
    signature = token.contract.sendEther.getData(0x0,0x0).toString('hex').substring(0,10);
    console.log('Action sendEther(address,uint256) signature', signature);
    token.buildMinVotes(token.contract.address, 90, signature, {from: accounts[0]})
      .then(function() {
        return simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0]);
      })
      .then(function() {
        var transfers = [];
        for (var i = 0; i < 15; i++)
          transfers.push(token.transfer(accounts[1], formatBalance(100), "", {from: accounts[2]}));
        for (i = 0; i < 6; i++)
          transfers.push(token.transfer(accounts[3], formatBalance(10), "", {from: accounts[1]}));
        return Promise.all(transfers);
      })
      .then(function() {
        return chekValues(1000000, 10000000, 0, [4001440,2998500,2000060,1000000,0], [6, 4, 2, 0, 0], [6, 15, 0, 0, 0], [15, 0, 6, 0, 0]);
      })
      .then(function() {
        var data = token.contract.sendEther.getData(accounts[3], web3.toWei(6, 'ether')).toString('hex');
        return token.newProposal(token.contract.address, 0, 'Call sendEther(address,uint256)', 100, signature, data, {from: accounts[1], value: web3.toWei(10, 'ether')});
      })
      .then(function() {
        return token.vote(1, true, {from: accounts[2]});
      })
      .then(function(result) {
        return token.executeProposal(1, {from: accounts[3]});
      })
      .then(function() {
        return chekValues(1000004, 10000000, 0, [4001440,2998500,2000060,1000000,0], [6, 4, 2, 0, 0], [6, 15, 0, 0, 0], [15, 0, 6, 0, 0]);
      }).then(function(){
        done();
      });
  });

  it("Should add a proposal to call a function outside the contract, be voted by another user, check it and get executed.", function(done) {
    var signature, test;
    Message.new()
      .then(function(_message) {
        message = _message;
        signature = message.contract.showMessage.getData(0x0, 0x0, 0x0).toString('hex').substring(0,10);
        console.log('Action showMessage(bytes32,uint256,string) signature', signature);
        return token.buildMinVotes(message.contract.address, 90, signature, {from: accounts[0]});
      })
      .then(function() {
        return simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0]);
      })
      .then(function() {
        var transfers = [];
        for (var i = 0; i < 15; i++)
          transfers.push(token.transfer(accounts[1], formatBalance(100), "", {from: accounts[2]}));
        for (i = 0; i < 6; i++)
          transfers.push(token.transfer(accounts[3], formatBalance(10), "", {from: accounts[1]}));
        return Promise.all(transfers);
      })
      .then(function() {
        return chekValues(1000000, 10000000, 0, [4001440,2998500,2000060,1000000,0], [6, 4, 2, 0, 0], [6, 15, 0, 0, 0], [15, 0, 6, 0, 0]);
      })
      .then(function() {
        var data = message.contract.showMessage.getData( web3.toHex('Test Bytes32'), web3.toHex(666), 'Test String' ).toString('hex');
        return token.newProposal(message.contract.address, 0, 'Call showMessage(bytes32,uint256,string)', 100, signature, data, {from: accounts[1], value: web3.toWei(10, 'ether')});
      })
      .then(function() {
        return token.vote(1, true, {from: accounts[2]});
      })
      .then(function() {
        return token.executeProposal(1, {from: accounts[3]});
      })
      .then(function() {
        return new Promise(function(resolve, reject){
          message.allEvents().get(function(error, log){
            if (error)
              reject(error);
            assert.equal(log[0].event, 'Show');
            assert.equal(log[0].args.b32, '0x5465737420427974657333320000000000000000000000000000000000000000');
            assert.equal(parseInt(log[0].args.number), 666);
            assert.equal(log[0].args.text, 'Test String');
            resolve();
          });
        });
      }).then(function(){
        return chekValues(1000010, 10000000, 0, [4001440,2998500,2000060,1000000,0], [6, 4, 2, 0, 0], [6, 15, 0, 0, 0], [15, 0, 6, 0, 0]);
      }).then(function(){
        done();
      });
  });

});
