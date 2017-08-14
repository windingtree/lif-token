var protobuf = require("protobufjs");
var _ = require('lodash');
var jsc = require("jsverify");
var chai = require("chai");

var help = require("./helpers");

var LifToken = artifacts.require("./LifToken.sol");
var LifCrowdsale = artifacts.require("./LifCrowdsale.sol");

const LOG_EVENTS = true;

let GEN_TESTS_QTY = parseInt(process.env.GEN_TESTS_QTY);
if (isNaN(GEN_TESTS_QTY))
  GEN_TESTS_QTY = 50;

let GEN_TESTS_TIMEOUT = parseInt(process.env.GEN_TESTS_TIMEOUT);
if (isNaN(GEN_TESTS_TIMEOUT))
  GEN_TESTS_TIMEOUT = 240;

contract('LifCrowdsale Property-based test', function(accounts) {
  var token;
  var eventsWatcher;

  let accountGen = jsc.nat(accounts.length - 1);

  let crowdsaleGen = jsc.record({
    rate1: jsc.nat,
    rate2: jsc.nat,
    foundationWallet: accountGen,
    marketMaker: accountGen,
    minCapEth: jsc.number(0, 200)
  });

  let waitBlockCommandGen = jsc.record({
    type: jsc.constant("waitBlock"),
    blocks: jsc.nat
  });
  let checkRateCommandGen = jsc.record({
    type: jsc.constant("checkRate")
  });
  let buyTokensCommandGen = jsc.record({
    type: jsc.constant("buyTokens"),
    account: accountGen,
    beneficiary: accountGen,
    useFallback: jsc.bool,
    eth: jsc.nat
  });
  let pauseCrowdsaleCommandGen = jsc.record({
    type: jsc.constant("pauseCrowdsale"),
    pause: jsc.bool,
    fromAccount: accountGen
  });
  let finalizeCrowdsaleCommandGen = jsc.record({
    type: jsc.constant("finalizeCrowdsale"),
    fromAccount: accountGen
  });
  let checkCrowdsaleCommandGen = jsc.record({
    type: jsc.constant("checkCrowdsale"),
    fromAccount: accountGen
  });
  let addPresalePaymentCommandGen = jsc.record({
    type: jsc.constant("addPresalePayment"),
    account: accountGen,
    fromAccount: accountGen,
    amountEth: jsc.number(),
    addFunding: jsc.bool // issue & transfer the necessary tokens for this payment?
  });

  let runWaitBlockCommand = async (command, state) => {
    await help.waitBlocks(command.blocks, accounts);
    return state;
  }

  function ExceptionRunningCommand(e, state, command) {
    this.error = e;
    this.state = state;
    this.command = command;
  }

  ExceptionRunningCommand.prototype = Object.create(Error.prototype);
  ExceptionRunningCommand.prototype.constructor = ExceptionRunningCommand;

  let runCheckRateCommand = async (command, state) => {
    let expectedRate = help.getCrowdsaleExpectedRate(state.crowdsaleData, web3.eth.blockNumber);
    let rate = parseFloat(await state.crowdsaleContract.getRate());

    assert.equal(expectedRate, rate,
        "expected rate is different! Expected: " + expectedRate + ", actual: " + rate + ". blocks: " + web3.eth.blockNumber + ", start/end1/end2: " +
        state.crowdsaleData.startBlock + "/" + state.crowdsaleData.endBlock1 + "/" + state.crowdsaleData.endBlock2);

    return state;
  }

  let runBuyTokensCommand = async (command, state) => {
    let crowdsale = state.crowdsaleData,
      { startBlock, endBlock2 } = crowdsale,
      weiCost = parseInt(web3.toWei(command.eth, 'ether')),
      nextBlock = web3.eth.blockNumber + 1,
      rate = help.getCrowdsaleExpectedRate(crowdsale, nextBlock),
      tokens = command.eth * rate,
      account = accounts[command.account],
      beneficiaryAccount = accounts[command.beneficiary];

    let shouldThrow = (nextBlock < startBlock) ||
      (nextBlock > endBlock2) ||
      (state.crowdsalePaused) ||
      (state.crowdsaleFinalized) ||
      (weiCost == 0);

    try {
      // help.debug("buyTokens rate:", rate, "eth:", command.eth, "endBlocks:", crowdsale.endBlock1, endBlock2, "blockNumber:", nextBlock);

      if (command.useFallback) {
        await state.crowdsaleContract.sendTransaction({value: weiCost, from: account});
      } else {
        await state.crowdsaleContract.buyTokens(beneficiaryAccount, {value: weiCost, from: account});
      }

      assert.equal(false, shouldThrow, "buyTokens should have thrown but it didn't");
      state.purchases = _.concat(state.purchases,
        {tokens: tokens, rate: rate, wei: weiCost, beneficiary: command.beneficiary, account: command.account}
      );
      state.weiRaised += weiCost;
    } catch(e) {
      if (!shouldThrow)
        throw(new ExceptionRunningCommand(e, state, command));
    }
    return state;
  }

  let runPauseCrowdsaleCommand = async (command, state) => {
    let shouldThrow = (state.crowdsalePaused == command.pause) ||
      (command.fromAccount != 0);

    help.debug("pausing crowdsale, previous state:", state.crowdsalePaused, "new state:", command.pause);
    try {
      if (command.pause) {
        await state.crowdsaleContract.pause({from: accounts[command.fromAccount]});
      } else {
        await state.crowdsaleContract.unpause({from: accounts[command.fromAccount]});
      }
      assert.equal(false, shouldThrow);
      state.crowdsalePaused = command.pause;
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

  let runFinalizeCrowdsaleCommand = async (command, state) => {
    let shouldThrow = state.crowdsaleFinalized ||
      state.crowdsalePaused ||
      (web3.eth.blockNumber <= state.crowdsaleData.endBlock2);

    help.debug("finishing crowdsale, from address:", accounts[command.fromAccount]);
    try {
      await state.crowdsaleContract.finalize({from: accounts[command.fromAccount]});
      assert.equal(false, shouldThrow);
      state.crowdsaleFinalized = true;
    } catch(e) {
      if (!shouldThrow)
        throw(new ExceptionRunningCommand(e, state, command));
    }
    return state;
  };

  let runAddPresalePaymentCommand = async (command, state) => {
    let fundingShouldThrow = (state.crowdsaleData.startPriceEth == 0) ||
      (command.amountEth <= 0) ||
      (state.crowdsaleData.presaleBonusRate <= 0);

    if (command.addFunding) {
      let { minCap, presaleBonusRate, maxTokens } = state.crowdsaleData;
      let minCapEth = web3.fromWei(minCap, 'ether');
      let presaleMaxTokens = help.getPresalePaymentMaxTokens(minCapEth, maxTokens, presaleBonusRate, command.amountEth);
      let presaleMaxWei = Math.ceil(help.lif2LifWei(presaleMaxTokens));

      try {
        await token.issueTokens(Math.ceil(presaleMaxTokens));
        await token.transferFrom(token.address, state.crowdsaleContract.address, presaleMaxWei, {from: accounts[0]});
        assert.equal(false, fundingShouldThrow);
      } catch(e) {
        if (!fundingShouldThrow)
          throw(e);
      }
    }

    // tweak shouldThrow based on the current blockNumber, right before the addPresalePayment tx
    let shouldThrow = fundingShouldThrow ||
      (command.fromAccount != 0) ||
      !command.addFunding ||
      (web3.eth.blockNumber >= state.crowdsaleData.startBlock);

    try {
      await state.crowdsaleContract.addPresalePayment(
        accounts[command.account],
        web3.toWei(command.amountEth, 'ether'),
        {from: accounts[command.fromAccount]}
      );
      assert.equal(false, shouldThrow);
      state.presalePayments = _.concat(state.presalePayments, {amountEth: command.amountEth, account: command.account});
    } catch (e) {
      if (!shouldThrow)
        throw(new ExceptionRunningCommand(e, state, command));   
    }

    return state;
  };

  let commands = {
    waitBlock: {gen: waitBlockCommandGen, run: runWaitBlockCommand},
    checkRate: {gen: checkRateCommandGen, run: runCheckRateCommand},
    buyTokens: {gen: buyTokensCommandGen, run: runBuyTokensCommand},
    pauseCrowdsale: {gen: pauseCrowdsaleCommandGen, run: runPauseCrowdsaleCommand},
    finalizeCrowdsale: {gen: finalizeCrowdsaleCommandGen, run: runFinalizeCrowdsaleCommand}
    // checkCrowdsale: {gen: checkCrowdsaleCommandGen, run: runCheckCrowdsaleCommand},
    // addPresalePayment: {gen: addPresalePaymentCommandGen, run: runAddPresalePaymentCommand}
  };

  let commandsGen = jsc.nonshrink(jsc.oneof(_.map(commands, (c) => c.gen)));

  let crowdsaleTestInputGen = jsc.record({
    commands: jsc.array(commandsGen),
    crowdsale: jsc.nonshrink(crowdsaleGen)
  });

  let checkCrowdsaleState = async function(state, crowdsaleData, crowdsale) {
    assert.equal(state.crowdsalePaused, await crowdsale.paused.call());
    assert.equal(_.sumBy(state.purchases, (b) => b.tokens), help.lifWei2Lif(parseFloat(await crowdsale.tokensSold.call())));
    /*
    let inMemoryPresaleWei = web3.toWei(_.sumBy(state.presalePayments, (p) => p.amountEth), 'ether')
    assert.equal(inMemoryPresaleWei, parseInt(await crowdsale.totalPresaleWei.call()));
    */
    help.debug("checking purchases total wei, purchases:", JSON.stringify(state.purchases));
    assert.equal(_.sumBy(state.purchases, (b) => b.wei), parseInt(await crowdsale.weiRaised.call()));
  }

  let runGeneratedCrowdsaleAndCommands = async function(input) {
    let blocksCount = 20;
    let startBlock = web3.eth.blockNumber + 10;
    let endBlock1 = startBlock + 10;
    let endBlock2 = startBlock + blocksCount;

    help.debug("crowdsaleTestInput data:\n", input, startBlock, endBlock2);

    let {rate1, rate2, minCapEth} = input.crowdsale;
    let shouldThrow = (rate1 == 0) ||
      (rate2 == 0) ||
      (startBlock >= endBlock1) ||
      (endBlock1 >= endBlock2) ||
      (minCapEth == 0);

    var eventsWatcher;

    try {
      let crowdsaleData = {
        startBlock: startBlock, endBlock1: endBlock1, endBlock2: endBlock2,
        rate1: input.crowdsale.rate1,
        rate2: input.crowdsale.rate2,
        foundationWallet: accounts[input.crowdsale.foundationWallet],
        marketMaker: accounts[input.crowdsale.marketMaker],
        minCap: web3.toWei(input.crowdsale.minCapEth, 'ether')
      };

      let crowdsale = await LifCrowdsale.new(
        crowdsaleData.startBlock,
        crowdsaleData.endBlock1,
        crowdsaleData.endBlock2,
        crowdsaleData.rate1,
        crowdsaleData.rate2,
        crowdsaleData.foundationWallet,
        crowdsaleData.marketMaker,
        crowdsaleData.minCap
      );

      assert.equal(false, shouldThrow, "create Crowdsale should have thrown but it didn't");

      let token = LifToken.at(await crowdsale.token());

      eventsWatcher = crowdsale.allEvents();
      eventsWatcher.watch(function(error, log){
        if (LOG_EVENTS)
          console.log('Event:', log.event, ':',log.args);
      });

      help.debug("created crowdsale at address ", crowdsale.address);

      // issue & transfer tokens for founders payments
      // let maxFoundersPaymentTokens = crowdsaleData.maxTokens * (crowdsaleData.ownerPercentage / 1000.0) ;

      var state = {
        crowdsaleData: crowdsaleData,
        crowdsaleContract: crowdsale,
        token: token,
        purchases: [],
        presalePurchases: [],
        weiRaised: 0,
        crowdsalePaused: false,
        tokenPaused: false,
        crowdsaleFinalized: false
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
            throw(new Error("command " + JSON.stringify(commandParams) + " has thrown."
              + "\nError: " + error.error));
              //+ "\nState: " + stateJSON.stringify(state));
          } else
            throw(error);
        }
      }

      // check resulting in-memory and contract state
      await checkCrowdsaleState(state, crowdsaleData, crowdsale);

    } catch(e) {
      if (!shouldThrow) {
        // only re-throw if we were not expecting this exception
        throw(e);
      }
    } finally {
      if (eventsWatcher) {
        eventsWatcher.stopWatching();
      }
    }

    return true;
  }

  it("calculates correct rate on the boundaries between endBlock1 and endBlock2", async function() {
    let crowdsaleAndCommands = {
      commands: [ { type: 'checkRate' },
        { type: 'checkRate' },
        { type: 'waitBlock', blocks: 19 },
        { type: 'buyTokens', beneficiary: 3, account: 2, eth: 12 } ],
      crowdsale: { rate1: 16,
        rate2: 14,
        foundationWallet: 2,
        marketMaker: 8,
        minCapEth: 72.68016394227743 } };

    await runGeneratedCrowdsaleAndCommands(crowdsaleAndCommands);
  });

  it("distributes tokens correctly on any combination of bids", async function() {
    // stateful prob based tests can take a long time to finish when shrinking...
    this.timeout(GEN_TESTS_TIMEOUT * 1000);

    let property = jsc.forall(crowdsaleTestInputGen, async function(crowdsaleAndCommands) {
      return await runGeneratedCrowdsaleAndCommands(crowdsaleAndCommands);
    });

    console.log("Generative tests to run:", GEN_TESTS_QTY);
    return jsc.assert(property, {tests: GEN_TESTS_QTY});
  });

});
