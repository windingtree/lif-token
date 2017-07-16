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
      return (c.maxCapEth >= c.minCapEth) &&
        (c.changePerBlock > 0);
    });

    let waitBlockCommandGen = jsc.record({
      type: jsc.constant("waitBlock")
    });
    let checkPriceCommandGen = jsc.record({
      type: jsc.constant("checkPrice")
    });

    let commandsGen = jsc.oneof([waitBlockCommandGen, checkPriceCommandGen]);

    let crowdsaleTestInputGen = jsc.record({
      crowdsale: crowdsaleGen,
      commands: jsc.array(commandsGen)
    });

    let shouldCommandThrow = function(command, state) {
      if (command.type == "waitBlock") {
        return false;
      } else if (command.type = "checkPrice") {
        let crowdsale = state.crowdsaleData;
        let { startBlock, endBlock } = crowdsale;
        return help.shouldCrowdsaleGetPriceThrow(startBlock, endBlock, crowdsale);
      }
    }

    let runCommand = async function(command, state) {
      if (command.type == "waitBlock") {
        await help.waitBlocks(1, accounts);
        return state;
      } else if (command.type == "checkPrice") {
        let expectedPrice = help.getCrowdsaleExpectedPrice(
          state.crowdsaleData.startBlock, state.crowdsaleData.endBlock, state.crowdsaleData
        );
        let price = parseFloat(await state.crowdsaleContract.getPrice());

        if (price != 0) {
          // all of this is because there is a small rounding difference sometimes.
          let priceDiffPercent = (expectedPrice - price) / price;
          help.debug("price", price, " expected price: ", expectedPrice, " diff %: ", priceDiffPercent);
          let maxPriceDiff = 0.000000001;
          assert.equal(true, Math.abs(priceDiffPercent) <= maxPriceDiff,
            "price diff should be less than " + maxPriceDiff + " but it's " + priceDiffPercent);
        } else {
          assert.equal(expectedPrice, price,
            "expected price is different! Expected: " + expectedPrice + ", actual: " + price + ". blocks: " + web3.eth.blockNumber + ", start/end: " + 
            state.crowdsaleData.startBlock + "/" + state.crowdsaleData.endBlock);
        }

        return state;
      } else {
        throw("Unknown command type " + command.type);
      }
    }

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

      var state = {
        crowdsaleData: crowdsaleData,
        crowdsaleContract: crowdsale
      };

      for (let command of input.commands) {
        let shouldThrow = shouldCommandThrow(command, state);
        try {
          state = await runCommand(command, state);
          assert.equal(false, shouldThrow, "command " + command + " should have thrown but it didn't.\nState: " + state);
        }
        catch(error) {
          if (e instanceof AssertionError) {
            throw(e);
          } else {
            assert.equal(true, shouldThrow, "command " + command + " should not have thrown but it did.\nError: " + error + "\nState: " + state);
          }
        }
      }

      return true;
    });

    return jsc.assert(property, {tests: 20});
  });

});
