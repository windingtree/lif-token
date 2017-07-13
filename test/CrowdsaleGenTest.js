var protobuf = require("protobufjs");
var _ = require('lodash');
var jsc = require("jsverify");

var help = require("./helpers");

var LifToken = artifacts.require("./LifToken.sol");
var LifCrowdsale = artifacts.require("./LifCrowdsale.sol");
var FuturePayment = artifacts.require("./FuturePayment.sol");

const LOG_EVENTS = true;

contract('LifCrowdsale Property-based test', function(accounts) {
  var token;
  var eventsWatcher;

  beforeEach(async function() {
    token = await LifToken.new(web3.toWei(10, 'ether'), 10000, 2, 3, 5, {from: accounts[0]});
    eventsWatcher = token.allEvents();
    eventsWatcher.watch(function(error, log){
      if (LOG_EVENTS)
        console.log('Event:', log.event, ':',log.args);
    });
  });

  afterEach(function(done) {
    eventsWatcher.stopWatching();
    done();
  });

  it("distributes tokens correctly on any combination of bids", async function() {
    /*
    var weiGen = jsc.nat.generator.map(function(x) {
      return web3.toWei(x, 'ether');
    });
    */

    let crowdsaleRawGen = jsc.record({
      startPriceEth: jsc.nat,
      changePerBlock: jsc.nat,
      changePriceEth: jsc.nat,
      minCapEth: jsc.nat,
      maxCapEth: jsc.nat,
      maxTokens: jsc.nat,
      presaleBonusRate: jsc.nat,
      ownerPercentage: jsc.nat
    });

    let crowdsaleGen = jsc.suchthat(crowdsaleRawGen, function(c) {
      return c.maxCap >= c.minCap &&
        c.changePerBlock > 0;
    });

    let bidsGen = jsc.array(jsc.nat);

    let crowdsaleTestInputGen = jsc.record({
      crowdsale: crowdsaleRawGen,
      bids: bidsGen
    });

    let property = jsc.forall(crowdsaleTestInputGen, async function(input) {
      let blocksCount = 5;
      let startBlock = web3.eth.blockNumber + 5;
      let endBlock = startBlock + blocksCount;

      help.debug("crowdsaleTestInput data:\n", input, startBlock, endBlock);

      let crowdsaleData = {
        token: token,
        startBlock: startBlock, endBlock: endBlock,
        startPrice: web3.toWei(input.crowdsale.startPriceEth, 'ether'),
        changePerBlock: input.crowdsale.changePerBlock, changePrice: web3.toWei(input.crowdsale.changePriceEth, 'ether'),
        minCap: web3.toWei(input.crowdsale.minCapEth, 'ether'), maxCap: web3.toWei(input.crowdsale.maxCapEth, 'ether'),
        maxTokens: input.crowdsale.maxTokens,
        presaleBonusRate: input.crowdsale.presaleBonusRate, ownerPercentage: input.crowdsale.ownerPercentage
      };

      let crowdsale = await help.createCrowdsale(crowdsaleData, accounts);

      help.debug("created crowdsale at address ", crowdsale.address);

      // Assert price == 0 before start
      let price = parseFloat(await crowdsale.getPrice());
      assert.equal(price, web3.toWei(0, 'ether'));

      await help.fundCrowdsale(crowdsaleData, crowdsale, accounts);

      // wait to crowdsale start
      await help.waitToBlock(startBlock, accounts);

      help.debug("fetching new price");

      try {
        help.debug("block before getPrice:", web3.eth.blockNumber);
        price = parseFloat(await crowdsale.getPrice());
        help.debug("block after getPrice:", web3.eth.blockNumber);
        assert.equal(false, help.shouldCrowdsaleGetPriceThrow(startBlock, endBlock, crowdsaleData),
          "getPrice should have thrown because crowdsale config makes the price go negative");

        if (price != 0) {
          // all of this is because there is a small rounding difference sometimes.
          let priceDiffPercent = (help.getCrowdsaleExpectedPrice(startBlock, endBlock, crowdsaleData) - price) / price;
          let maxPriceDiff = 0.000000001;
          help.debug("price:", price, "price diff: ", priceDiffPercent);
          assert.equal(true, Math.abs(priceDiffPercent) <= maxPriceDiff, "price diff should be less than " + maxPriceDiff + " but it's " + priceDiffPercent);
        } else
          assert.equal(0, price);
      }
      catch (e) {
        help.debug("estimatedPrice:", help.getCrowdsaleExpectedPrice(startBlock, endBlock, crowdsaleData),
          "shouldGetPriceThrow: ", help.shouldCrowdsaleGetPriceThrow(startBlock, endBlock, crowdsaleData),
          "error: ", e);
        assert.equal(true, help.shouldCrowdsaleGetPriceThrow(startBlock, endBlock, crowdsaleData), "we didn't expect getPrice to throw but it did...");

        help.debug("the crowdsale params are invalid but the test catched that fine. Stopping here");
        return true;
      }

      return true;
    });

    return jsc.assert(property, {tests: 10, size: 10});
  });

});
