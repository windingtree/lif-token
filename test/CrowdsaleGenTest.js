var protobuf = require("protobufjs");
var _ = require('lodash');
var jsc = require("jsverify");
var chai = require("chai");

var help = require("./helpers");

var LifToken = artifacts.require("./LifToken.sol");
var LifCrowdsale = artifacts.require("./LifCrowdsale.sol");
var FuturePayment = artifacts.require("./FuturePayment.sol");

const LOG_EVENTS = true;

let GEN_TESTS_QTY = parseInt(process.env.GEN_TESTS_QTY);
if (isNaN(GEN_TESTS_QTY))
  GEN_TESTS_QTY = 50;

contract('LifCrowdsale Property-based test', function(accounts) {
  var token;
  var eventsWatcher;

  let crowdsaleRawGen = jsc.record({
    startPriceEth: jsc.nat,
    changePerBlock: jsc.nat,
    changePriceEth: jsc.nonshrink(jsc.nat),
    minCapEth: jsc.nat,
    maxCapEth: jsc.nat,
    maxTokens: jsc.nat,
    presaleBonusRate: jsc.nonshrink(jsc.nat),
    ownerPercentage: jsc.nonshrink(jsc.nat)
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
  let submitBidCommandGen = jsc.record({
    type: jsc.constant("submitBid"),
    account: jsc.elements(accounts),
    tokens: jsc.nat
  });
  let setStatusCommandGen = jsc.record({
    type: jsc.constant("setStatus"),
    status: jsc.elements([1,2,3]),
    fromAccount: jsc.elements(accounts)
  });
  let checkCrowdsaleCommandGen = jsc.record({
    type: jsc.constant("checkCrowdsale"),
    fromAccount: jsc.elements(accounts)
  });

  let commandsGen = jsc.nonshrink(jsc.oneof([
    waitBlockCommandGen,
    checkPriceCommandGen,
    submitBidCommandGen,
    setStatusCommandGen,
    checkCrowdsaleCommandGen
  ]));

  let crowdsaleTestInputGen = jsc.record({
    commands: jsc.array(commandsGen),
    crowdsale: jsc.nonshrink(crowdsaleGen)
  });

  let shouldCommandThrow = function(command, state) {
    if (command.type == "waitBlock") {
      return false;
    } else if (command.type == "checkPrice") {
      let crowdsale = state.crowdsaleData;
      let { startBlock, endBlock } = crowdsale;
      return help.shouldCrowdsaleGetPriceThrow(startBlock, endBlock, crowdsale);
    } else if (command.type == "submitBid") {
      let crowdsale = state.crowdsaleData;
      let { startBlock, endBlock } = crowdsale;
      let price = help.getCrowdsaleExpectedPrice(startBlock, endBlock, crowdsale);
      let soldTokens = _.sumBy(state.bids || [], (b) => b.tokens);

      return (web3.eth.blockNumber < crowdsale.startBlock) ||
        (web3.eth.blockNumber > crowdsale.endBlock) ||
        (state.status != 2) ||
        (command.tokens == 0) ||
        (price == 0) ||
        (soldTokens + command.tokens > crowdsale.maxTokens);
    } else if (command.type == "setStatus") {
      return false;
    } else if (command.type == "checkCrowdsale") {
      return state.status != 2 || web3.eth.blockNumber <= state.crowdsaleData.endBlock;
    } else {
      assert(false, "unknnow command " + command.type);
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
      }  else {
        assert.equal(expectedPrice, price,
          "expected price is different! Expected: " + expectedPrice + ", actual: " + price + ". blocks: " + web3.eth.blockNumber + ", start/end: " +
          state.crowdsaleData.startBlock + "/" + state.crowdsaleData.endBlock);
      }

      return state;
    } else if (command.type == "submitBid") {
      let price = help.getCrowdsaleExpectedPrice(
        state.crowdsaleData.startBlock, state.crowdsaleData.endBlock, state.crowdsaleData
      );
      help.debug("submitBid price:", price, "blockNumber:", web3.eth.blockNumber);
      await state.crowdsaleContract.submitBid({
        value: price * command.tokens,
        from: command.account
      });
      state.bids = _.concat(state.bids || [], {tokens: command.tokens, price: price, account: command.account});
      return state;
    } else if (command.type == "setStatus") {
      await state.crowdsaleContract.setStatus(command.status, {from: accounts[0]});
      state.status = command.status;
      return state;
    } else if (command.type == "checkCrowdsale") {
      await state.crowdsaleContract.checkCrowdsale({from: command.fromAccount});
      state.status = 3;
      return state;
    } else {
      throw("Unknown command type " + command.type);
    }
  }

  let runGeneratedCrowdsaleAndCommands = async function(input) {
    let blocksCount = 5;
    let startBlock = web3.eth.blockNumber + 5;
    let endBlock = startBlock + blocksCount;

    help.debug("crowdsaleTestInput data:\n", input, startBlock, endBlock);

    token = await LifToken.new(web3.toWei(10, 'ether'), 10000, 2, 3, 5, {from: accounts[0]});
    eventsWatcher = token.allEvents();
    eventsWatcher.watch(function(error, log){
      if (LOG_EVENTS)
        console.log('Event:', log.event, ':',log.args);
    });

    try {
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

      // issue & transfer tokens for founders payments
      let maxFoundersPaymentTokens = crowdsaleData.maxTokens * (crowdsaleData.ownerPercentage / 1000.0) ;
      // TODO: is there a way to avoid the Math.ceil code? I don't think so, except by always issuing multiples of 1000 tokens...
      await token.issueTokens(Math.ceil(maxFoundersPaymentTokens));
      await token.transferFrom(token.address, crowdsale.address, help.lif2LifWei(maxFoundersPaymentTokens), {from: accounts[0]});

      var state = {
        crowdsaleData: crowdsaleData,
        crowdsaleContract: crowdsale,
        status: 1 // crowdsale status
      };

      for (let command of input.commands) {
        let shouldThrow = shouldCommandThrow(command, state);
        try {
          state = await runCommand(command, state);
          assert.equal(false, shouldThrow, "command " + command + " should have thrown but it didn't.\nCommand: " + JSON.stringify(command) + "\nState: " + state);
        }
        catch(error) {
          help.debug("An error occurred, block number: " + web3.eth.blockNumber);
          if (error instanceof chai.AssertionError) {
            throw(error);
          } else {
            assert.equal(true, shouldThrow, "command " + JSON.stringify(command) + " should not have thrown but it did.\nError: " + error + "\nState: " + state);
          }
        }
      }
    } finally {
      eventsWatcher.stopWatching();
    }

    return true;
  }

  it("should consider endBlock part of the crowdsale", async function() {
    // this case found by the generative test, it was a bug on the getPrice function
    // added here to avoid future regressions
    let crowdsaleAndCommands = {
      commands: [
        {"type":"waitBlock"}, {"type":"waitBlock"}, {"type":"waitBlock"},
        {"type":"setStatus","status":3},
        {"type":"checkPrice"}
      ],
      crowdsale: {
        startPriceEth: 16, changePerBlock: 37, changePriceEth: 45,
        minCapEth: 23, maxCapEth: 32, maxTokens: 40,
        presaleBonusRate: 23, ownerPercentage: 27
      }
    };

    await runGeneratedCrowdsaleAndCommands(crowdsaleAndCommands);
  });

  it("distributes tokens correctly on any combination of bids", async function() {
    // stateful prob based tests can take a long time to finish when shrinking...
    this.timeout(240 * 1000);

    let property = jsc.forall(crowdsaleTestInputGen, async function(crowdsaleAndCommands) {
      return await runGeneratedCrowdsaleAndCommands(crowdsaleAndCommands);
    });

    console.log("Generative tests to run:", GEN_TESTS_QTY);
    return jsc.assert(property, {tests: GEN_TESTS_QTY});
  });

});
