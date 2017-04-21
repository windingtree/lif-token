
var protobuf = require("protobufjs");

var help = require("./helpers");

var LifToken = artifacts.require("./LifToken.sol");

const LOG_EVENTS = true;

contract('LifToken Crowdsale', function(accounts) {

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
        help.getStage(token, 0),
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
      return help.waitToBlock(startBlock, accounts);
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
      return help.checkValues(token, accounts, help.toEther(500000*web3.toWei(5, 'ether')), 0, web3.toWei(5, 'ether'), [0, 0, 0, 0, 0]);
    })
    .then(function() {
      return help.waitToBlock(startBlock+10, accounts);
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
      return help.waitToBlock(startBlock+20, accounts);
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
      return help.waitToBlock(startBlock+40, accounts);
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
      return help.getStage(token, 0);
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
      assert.equal(help.toEther(auctionSuccess[9]), 250000);
      assert.equal(help.parseBalance(auctionSuccess[10]), help.parseBalance(totalWeiSent));
      assert.equal(parseFloat(auctionSuccess[11]), totalTokensBought);
      assert.equal(parseFloat(auctionSuccess[12]), lastPrice);
      assert.equal(parseFloat(auctionSuccess[13]), 2);
      presaleTokens = help.toWei(250000)/(lastPrice*0.6);
      return token.status();
    })
    .then(function(status) {
      assert.equal(parseFloat(status), 3);
      return help.waitToBlock(endBlock, accounts);
    })
    .then(function() {
      return token.checkCrowdsaleStage(0);
    })
    .then(function() {
      return Promise.all([
        help.getStage(token, 0),
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
      assert.equal(help.toEther(auctionEnded[9]), 250000);
      assert.equal(help.parseBalance(auctionEnded[10]), help.parseBalance(totalWeiSent));
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
      return help.checkValues(token, accounts, 0, 7000000, 0, [500000, 1000000, 500000, 1000000, 2000000]);
    })
    .then(function() {
      return help.waitToBlock(endBlock+1, accounts);
    })
    // Shouldnt allow to a claim a payment before the requested block
    .then(function() {
      return token.claimTokensPayment(3, {from: accounts[0]});
    })
    .catch(function(error) {
      if (error.message.search('invalid JUMP') == -1) throw error;
    })
    .then(function() {
      return help.waitToBlock(endBlock+31, accounts);
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
      return help.checkValues(token, accounts, 0, 10000000, 0, [500000, 1000000, 500000, 1000000, 2000000]);
    })
    .then(function() {
      done();
    });
  });

});
