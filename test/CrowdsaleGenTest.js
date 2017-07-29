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
    account: jsc.nat(accounts.length - 1),
    tokens: jsc.nat
  });
  let setStatusCommandGen = jsc.record({
    type: jsc.constant("setStatus"),
    status: jsc.elements([1,2,3]),
    fromAccount: jsc.nat(accounts.length - 1)
  });
  let checkCrowdsaleCommandGen = jsc.record({
    type: jsc.constant("checkCrowdsale"),
    fromAccount: jsc.nat(accounts.length - 1)
  });

  let runWaitBlockCommand = async (command, state) => {
    await help.waitBlocks(1, accounts);
    return state;
  }

  function ExceptionRunningCommand(e, state, command) {
    this.error = e;
    this.state = state;
    this.command = command;
  }

  let runCheckPriceCommand = async (command, state) => {
    let crowdsale = state.crowdsaleData;
    let { startBlock, endBlock } = crowdsale;
    let shouldThrow = help.shouldCrowdsaleGetPriceThrow(startBlock, endBlock, crowdsale);

    let expectedPrice = help.getCrowdsaleExpectedPrice(
      state.crowdsaleData.startBlock, state.crowdsaleData.endBlock, state.crowdsaleData
    );

    try {
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
      assert.equal(false, shouldThrow);
    } catch(e) {
      if (!shouldThrow) {
        throw(new ExceptionRunningCommand(e, state, command));
      }
    }
    return state;
  }

  let runSubmitBidCommand = async (command, state) => {
    let crowdsale = state.crowdsaleData,
      { startBlock, endBlock, maxCap } = crowdsale,
      { weiRaised } = state,
      price = help.getCrowdsaleExpectedPrice(startBlock, endBlock, crowdsale),
      weiCost = price * command.tokens,
      soldTokens = _.sumBy(state.bids, (b) => b.tokens),
      account = accounts[command.account];

    let shouldThrow = (web3.eth.blockNumber < crowdsale.startBlock) ||
      (web3.eth.blockNumber > crowdsale.endBlock) ||
      (state.status != 2) ||
      (weiCost == 0) ||
      (weiRaised + weiCost > maxCap) ||
      (soldTokens + command.tokens > crowdsale.maxTokens);

    help.debug("submitBid price:", price, "blockNumber:", web3.eth.blockNumber);
    try {
      await state.crowdsaleContract.submitBid({
        value: weiCost,
        from: account
      });
      assert.equal(false, shouldThrow);
      state.bids = _.concat(state.bids, {tokens: command.tokens, price: price, account: account});
      state.weiRaised += weiCost;
    } catch(e) {
      if (!shouldThrow)
        throw(new ExceptionRunningCommand(e, state, command));
    }
    return state;
  }

  let runSetStatusCommand = async (command, state) => {
    let shouldThrow = (command.fromAccount != 0);
    try {
      await state.crowdsaleContract.setStatus(command.status, {from: accounts[command.fromAccount]});
      assert.equal(false, shouldThrow);
      state.status = command.status;
    } catch(e) {
      if (!shouldThrow)
        throw(new ExceptionRunningCommand(e, state, command));
    }
    return state;
  };

  let runCheckCrowdsaleCommand = async (command, state) => {
    let shouldThrow = (state.status != 2) ||
      (web3.eth.blockNumber <= state.crowdsaleData.endBlock);

    try {
      await state.crowdsaleContract.checkCrowdsale({from: accounts[command.fromAccount]});
      assert.equal(false, shouldThrow);
      state.status = 3;
    } catch (e) {
      if (!shouldThrow)
        throw(new ExceptionRunningCommand(e, state, command));   
    }

    return state;
  };

  let commands = {
    waitBlock: {gen: waitBlockCommandGen, run: runWaitBlockCommand},
    checkPrice: {gen: checkPriceCommandGen, run: runCheckPriceCommand},
    submitBid: {gen: submitBidCommandGen, run: runSubmitBidCommand},
    setStatus: {gen: setStatusCommandGen, run: runSetStatusCommand},
    checkCrowdsale: {gen: checkCrowdsaleCommandGen, run: runCheckCrowdsaleCommand}
  };

  let commandsGen = jsc.nonshrink(jsc.oneof(_.map(commands, (c) => c.gen)));

  let crowdsaleTestInputGen = jsc.record({
    commands: jsc.array(commandsGen),
    crowdsale: jsc.nonshrink(crowdsaleGen)
  });

  let runGeneratedCrowdsaleAndCommands = async function(input) {
    let blocksCount = 5;
    let startBlock = web3.eth.blockNumber + 10;
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
        bids: [],
        weiRaised: 0,
        status: 1 // crowdsale status
      };

      let findCommand = (type) => {
        let command = commands[type];
        if (command === undefined)
          throw(new Error("unknown command " + type));
        return command;
      };

      for (let commandParams of input.commands) {
        let command = findCommand(commandParams.type);
        try {
          state = await command.run(commandParams, state);
        }
        catch(error) {
          help.debug("An error occurred, block number: " + web3.eth.blockNumber + "\nError: " + error);
          if (error instanceof ExceptionRunningCommand) {
            throw("command " + JSON.stringify(commandParams) + " has thrown."
              + "\nError: " + error);
              //+ "\nState: " + stateJSON.stringify(state));
          } else
            throw(error);
        }
      }

      // check resulting in-memory and contract state
      assert.equal(state.status, parseInt(await crowdsale.status.call()));
    } finally {
      eventsWatcher.stopWatching();
    }

    return true;
  }

  it("should throw when submitBid is for 0 tokens", async function() {
    let crowdsaleAndCommands = {
      commands: [
        {"type":"setStatus","status":2,"fromAccount":0},
        {"type":"submitBid","account":7,"tokens":0}
      ],
      crowdsale: {
        startPriceEth: 3, changePerBlock: 1, changePriceEth: 0,
        minCapEth: 20, maxCapEth: 33, maxTokens: 16,
        presaleBonusRate: 32, ownerPercentage: 0
      }
    };

    await runGeneratedCrowdsaleAndCommands(crowdsaleAndCommands);
  });

  it("should raise when sum of bids exceed total tokens to be sold", async function() {

    let crowdsaleAndCommands = {
      commands: [
        {"type":"setStatus","status":2,"fromAccount":0},
        {"type":"submitBid","account":1,"tokens":2},
        {"type":"submitBid","account":2,"tokens":2}
      ],
      crowdsale: {
        startPriceEth: 5, changePerBlock: 5, changePriceEth: 0,
        minCapEth: 1, maxCapEth: 2, maxTokens: 3,
        presaleBonusRate: 5, ownerPercentage: 3
      }
    };

    await runGeneratedCrowdsaleAndCommands(crowdsaleAndCommands);
  });

  it("should consider endBlock part of the crowdsale", async function() {
    // this case found by the generative test, it was a bug on the getPrice function
    // added here to avoid future regressions
    let crowdsaleAndCommands = {
      commands: [
        {"type":"waitBlock"}, {"type":"waitBlock"}, {"type":"waitBlock"},
        {"type":"setStatus","status":3,"fromAccount":0},
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
