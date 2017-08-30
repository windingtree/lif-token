var _ = require('lodash');
var jsc = require("jsverify");

var help = require("./helpers");

var LifToken = artifacts.require("./LifToken.sol");
var LifCrowdsale = artifacts.require("./LifCrowdsale.sol");
var LifMarketMaker = artifacts.require("./LifMarketMaker.sol");

let gen = require("./generators");

const LOG_EVENTS = true;

let GEN_TESTS_QTY = parseInt(process.env.GEN_TESTS_QTY);
if (isNaN(GEN_TESTS_QTY))
  GEN_TESTS_QTY = 50;

let GEN_TESTS_TIMEOUT = parseInt(process.env.GEN_TESTS_TIMEOUT);
if (isNaN(GEN_TESTS_TIMEOUT))
  GEN_TESTS_TIMEOUT = 240;

contract('LifCrowdsale Property-based test', function(accounts) {
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
        "expected rate is different! Expected: " + expectedRate + ", actual: " + rate + ". blocks: " + web3.eth.blockNumber +
        ", public presale start/end: " + state.crowdsaleData.publicPresaleStartBlock + "/" + state.crowdsaleData.publicPresaleEndBlock +
        ", start/end1/end2: " + state.crowdsaleData.startBlock + "/" + state.crowdsaleData.endBlock1 + "/" + state.crowdsaleData.endBlock2);

    return state;
  }

  let runBuyTokensCommand = async (command, state) => {
    let crowdsale = state.crowdsaleData,
      { startBlock, endBlock2, weiPerUSDinTGE} = crowdsale,
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
      (state.weiPerUSDinTGE == 0) ||
      (command.eth == 0);

    try {
      help.debug("buyTokens rate:", rate, "eth:", command.eth, "endBlocks:", crowdsale.endBlock1, endBlock2, "blockNumber:", nextBlock);

      await state.crowdsaleContract.buyTokens(beneficiaryAccount, {value: weiCost, from: account});
      assert.equal(false, shouldThrow, "buyTokens should have thrown but it didn't");

      state.purchases = _.concat(state.purchases,
        {tokens: tokens, rate: rate, wei: weiCost, beneficiary: command.beneficiary, account: command.account}
      );
      state.balances[command.beneficiary] = (state.balances[command.beneficiary] || 0) + tokens;
      state.weiRaised += weiCost;

    } catch(e) {
      if (!shouldThrow)
        throw(new ExceptionRunningCommand(e, state, command));
    }
    return state;
  }

  let runBuyPresaleTokensCommand = async (command, state) => {
    let crowdsale = state.crowdsaleData,
      { publicPresaleStartBlock, publicPresaleEndBlock,
        startBlock, publicPresaleRate } = crowdsale,
      weiCost = parseInt(web3.toWei(command.eth, 'ether')),
      nextBlock = web3.eth.blockNumber + 1,
      rate = help.getCrowdsaleExpectedRate(crowdsale, nextBlock),
      tokens = command.eth * rate,
      account = accounts[command.account],
      beneficiaryAccount = accounts[command.beneficiary],
      maxPresaleWei = crowdsale.maxPresaleCapUSD*state.weiPerUSDinPresale;

    let shouldThrow = (nextBlock < publicPresaleStartBlock) ||
      ((state.totalPresaleWei + weiCost) > maxPresaleWei) ||
      (nextBlock > publicPresaleEndBlock) ||
      (state.crowdsalePaused) ||
      (state.crowdsaleFinalized) ||
      (state.weiPerUSDinPresale == 0) ||
      (command.eth == 0);

    try {
      help.debug("buying presale tokens, rate:", rate, "eth:", command.eth, "endBlock:", crowdsale.publicPresaleEndBlock, "blockNumber:", nextBlock);

      await state.crowdsaleContract.buyPresaleTokens(beneficiaryAccount, {value: weiCost, from: account});

      assert.equal(false, shouldThrow, "buyPresaleTokens should have thrown but it didn't");

      state.totalPresaleWei += weiCost;

    } catch(e) {
      if (!shouldThrow)
        throw(new ExceptionRunningCommand(e, state, command));
    }
    return state;
  }


  let runSendTransactionCommand = async (command, state) => {
    let crowdsale = state.crowdsaleData,
      { publicPresaleStartBlock, publicPresaleEndBlock,
        startBlock, endBlock2, publicPresaleRate,
        rate1, rate2 } = crowdsale,
      weiCost = parseInt(web3.toWei(command.eth, 'ether')),
      nextBlock = web3.eth.blockNumber + 1,
      rate = help.getCrowdsaleExpectedRate(crowdsale, nextBlock),
      tokens = command.eth * rate,
      account = accounts[command.account],
      beneficiaryAccount = accounts[command.beneficiary],
      maxPresaleWei = crowdsale.maxPresaleCapUSD*state.weiPerUSDinPresale;

    let inPresale = nextBlock >= publicPresaleStartBlock && nextBlock <= publicPresaleEndBlock,
      inTGE = nextBlock >= startBlock && nextBlock <= endBlock2;

    let shouldThrow = (!inPresale && !inTGE) ||
      (inTGE && state.weiPerUSDinTGE == 0) ||
      (inPresale && state.weiPerUSDinPresale == 0) ||
      (inPresale && ((state.totalPresaleWei + weiCost) > maxPresaleWei)) ||
      (state.crowdsalePaused) ||
      (state.crowdsaleFinalized) ||
      (command.eth == 0);

    try {
      // help.debug("buyTokens rate:", rate, "eth:", command.eth, "endBlocks:", crowdsale.endBlock1, endBlock2, "blockNumber:", nextBlock);

      await state.crowdsaleContract.sendTransaction({value: weiCost, from: account});

      assert.equal(false, shouldThrow, "sendTransaction should have thrown but it didn't");
      if (rate == rate1 || rate == rate2) {
        state.purchases = _.concat(state.purchases,
          {tokens: tokens, rate: rate, wei: weiCost, beneficiary: command.beneficiary, account: command.account}
        );
        state.weiRaised += weiCost;
      } else if (rate == publicPresaleRate) {
        state.totalPresaleWei += weiCost;
      }
    } catch(e) {
      if (!shouldThrow)
        throw(new ExceptionRunningCommand(e, state, command));
    }
    return state;
  }

  let runBurnTokensCommand = async (command, state) => {
    let account = accounts[command.account],
      balance = state.balances[command.account];

    let shouldThrow = state.tokenPaused || (balance < command.tokens);

    try {
      await state.token.burn(command.tokens, {from: account});
      assert.equal(false, shouldThrow, "burn should have thrown but it didn't");

      state.balances[account] = balance - command.tokens;

    } catch(e) {
      if (!shouldThrow)
        throw(new ExceptionRunningCommand(e, state, command));
    }
    return state;
  };

  let runSetWeiPerUSDinPresaleCommand = async (command, state) => {

    let crowdsale = state.crowdsaleData,
      { publicPresaleStartBlock, setWeiLockBlocks } = crowdsale,
      nextBlock = web3.eth.blockNumber + 1;

    let shouldThrow = (nextBlock > publicPresaleStartBlock-setWeiLockBlocks) ||
      (command.fromAccount != state.owner) ||
      (command.wei == 0);

    help.debug("seting wei per usd in presale:", command.wei);
    try {
      await state.crowdsaleContract.setWeiPerUSDinPresale(command.wei, {from: accounts[command.fromAccount]});
      assert.equal(false, shouldThrow);
      state.weiPerUSDinPresale = command.wei;
    } catch(e) {
      if (!shouldThrow)
        throw(new ExceptionRunningCommand(e, state, command));
    }
    return state;
  };

  let runSetWeiPerUSDinTGECommand = async (command, state) => {

    let crowdsale = state.crowdsaleData,
      { startBlock, setWeiLockBlocks } = crowdsale,
      nextBlock = web3.eth.blockNumber + 1;

    let shouldThrow = (nextBlock > startBlock-setWeiLockBlocks) ||
      (command.fromAccount != state.owner) ||
      (command.wei == 0);

    help.debug("seting wei per usd in tge:", command.wei);
    try {
      await state.crowdsaleContract.setWeiPerUSDinTGE(command.wei, {from: accounts[command.fromAccount]});
      assert.equal(false, shouldThrow);
      state.weiPerUSDinTGE = command.wei;
    } catch(e) {
      if (!shouldThrow)
        throw(new ExceptionRunningCommand(e, state, command));
    }
    return state;
  };

  let runPauseCrowdsaleCommand = async (command, state) => {
    let shouldThrow = (state.crowdsalePaused == command.pause) ||
      (command.fromAccount != state.owner);

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

  let runPauseTokenCommand = async (command, state) => {
    let shouldThrow = (state.tokenPaused == command.pause) ||
      !state.crowdsaleFinalized ||
      (command.fromAccount != state.owner);

    help.debug("pausing token, previous state:", state.tokenPaused, "new state:", command.pause);
    try {
      if (command.pause) {
        await state.token.pause({from: accounts[command.fromAccount]});
      } else {
        await state.token.unpause({from: accounts[command.fromAccount]});
      }
      assert.equal(false, shouldThrow);
      state.tokenPaused = command.pause;
    } catch(e) {
      if (!shouldThrow)
        throw(new ExceptionRunningCommand(e, state, command));
    }
    return state;
  };

  let runFinalizeCrowdsaleCommand = async (command, state) => {
    let nextBlock = web3.eth.blockNumber + 1;
    let shouldThrow = state.crowdsaleFinalized ||
      state.crowdsalePaused || (state.weiPerUSDinTGE == 0) ||
      (web3.eth.blockNumber <= state.crowdsaleData.endBlock2);

    try {

      let crowdsaleFunded = (state.weiRaised > state.crowdsaleData.minCapUSD*state.weiPerUSDinTGE);

      help.debug("finishing crowdsale on block", nextBlock, ", from address:", accounts[command.fromAccount], ", funded:", crowdsaleFunded);

      let finalizeTx = await state.crowdsaleContract.finalize({from: accounts[command.fromAccount]});

      if (crowdsaleFunded) {

        let marketMakerInitialBalance = state.weiRaised - (state.crowdsaleData.minCapUSD*state.weiPerUSDinTGE);
        let marketMakerPeriods = (marketMakerInitialBalance > (state.crowdsaleData.marketMaker24PeriodsCapUSD*state.weiPerUSDinTGE)) ? 48 : 24;
        let mmAddress = await state.crowdsaleContract.marketMaker();
        help.debug('MarketMaker contract address', mmAddress);

        let marketMaker = new LifMarketMaker(mmAddress);

        assert.equal(24, parseInt(await marketMaker.totalPeriods()));
        assert.equal(state.crowdsaleData.foundationWallet, await marketMaker.foundationAddr());
      }

      assert.equal(false, shouldThrow);
      state.crowdsaleFinalized = true;
      state.crowdsaleFunded = crowdsaleFunded;
    } catch(e) {
      if (!shouldThrow)
        throw(new ExceptionRunningCommand(e, state, command));
    }
    return state;
  };

  let runAddPrivatePresalePaymentCommand = async (command, state) => {

    let crowdsale = state.crowdsaleData,
      { publicPresaleStartBlock, privatePresaleRate } = crowdsale,
      nextBlock = web3.eth.blockNumber + 1,
      weiToSend = web3.toWei(command.eth, 'ether'),
      account = accounts[command.fromAccount],
      beneficiary = accounts[command.beneficiaryAccount];

    let shouldThrow = (nextBlock >= publicPresaleStartBlock) ||
      (state.crowdsalePaused) ||
      (account != accounts[state.owner]) ||
      (state.crowdsaleFinalized) ||
      (weiToSend == 0);

    try {
      help.debug("Adding presale private tokens for account:", command.beneficiaryAccount, "eth:", command.eth, "fromAccount:", command.fromAccount, "blockNumber:", nextBlock);

      await state.crowdsaleContract.addPrivatePresaleTokens(beneficiary, weiToSend, {from: account});

      assert.equal(false, shouldThrow, "buyTokens should have thrown but it didn't");

      state.totalPresaleWei += weiToSend;
    } catch(e) {
      if (!shouldThrow)
        throw(new ExceptionRunningCommand(e, state, command));
    }
    return state;
  };

  let runClaimEthCommand = async (command, state) => {

    let crowdsale = state.crowdsaleData,
      { publicPresaleStartBlock, maxPresaleWei, privatePresaleRate } = crowdsale,
      nextBlock = web3.eth.blockNumber + 1,
      account = accounts[command.fromAccount],
      purchases = _.filter(state.purchases, (p) => p.account == command.fromAccount);

    let shouldThrow = !state.crowdsaleFinalized ||
      !state.crowdsaleFunded ||
      (purchases.length == 0) ||
      state.claimedEth[command.account] > 0;

    try {
      await state.crowdsaleContract.claimEth({from: account});

      assert.equal(false, shouldThrow, "claimEth should have thrown but it didn't");

      state.claimedEth[command.account] = _.sumBy(purchases, (p) => p.amount);
    } catch(e) {
      if (!shouldThrow)
        throw(new ExceptionRunningCommand(e, state, command));
    }
    return state;
  }

  let commands = {
    waitBlock: {gen: gen.waitBlockCommandGen, run: runWaitBlockCommand},
    checkRate: {gen: gen.checkRateCommandGen, run: runCheckRateCommand},
    sendTransaction: {gen: gen.sendTransactionCommandGen, run: runSendTransactionCommand},
    setWeiPerUSDinPresale: {gen: gen.setWeiPerUSDinPresaleCommandGen, run: runSetWeiPerUSDinPresaleCommand},
    setWeiPerUSDinTGE: {gen: gen.setWeiPerUSDinTGECommandGen, run: runSetWeiPerUSDinTGECommand},
    buyTokens: {gen: gen.buyTokensCommandGen, run: runBuyTokensCommand},
    buyPresaleTokens: {gen: gen.buyPresaleTokensCommandGen, run: runBuyPresaleTokensCommand},
    burnTokens: {gen: gen.burnTokensCommandGen, run: runBurnTokensCommand},
    pauseCrowdsale: {gen: gen.pauseCrowdsaleCommandGen, run: runPauseCrowdsaleCommand},
    pauseToken: {gen: gen.pauseTokenCommandGen, run: runPauseTokenCommand},
    finalizeCrowdsale: {gen: gen.finalizeCrowdsaleCommandGen, run: runFinalizeCrowdsaleCommand},
    addPrivatePresalePayment: {gen: gen.addPrivatePresalePaymentCommandGen, run: runAddPrivatePresalePaymentCommand},
    claimEth: {gen: gen.claimEthCommandGen, run: runClaimEthCommand}
  };

  let commandsGen = jsc.nonshrink(jsc.oneof(_.map(commands, (c) => c.gen)));

  let crowdsaleTestInputGen = jsc.record({
    commands: jsc.array(commandsGen),
    crowdsale: jsc.nonshrink(gen.crowdsaleGen)
  });

  let checkCrowdsaleState = async function(state, crowdsaleData, crowdsale) {
    assert.equal(state.crowdsalePaused, await crowdsale.paused());
    assert.approximately(
      _.sumBy(state.purchases, (b) => b.tokens),
      parseFloat(help.lifWei2Lif(parseFloat(await crowdsale.tokensSold()))),
      0.000000001
    );
    /*
     * TODO: add this and similar checks
    let inMemoryPresaleWei = web3.toWei(_.sumBy(state.presalePayments, (p) => p.amountEth), 'ether')
    assert.equal(inMemoryPresaleWei, parseInt(await crowdsale.totalPresaleWei.call()));
    */
    help.debug("checking purchases total wei, purchases:", JSON.stringify(state.purchases));
    assert.equal(_.sumBy(state.purchases, (b) => b.wei), parseFloat(await crowdsale.weiRaised()));

    // Check presale tokens sold
    assert.equal(state.totalPresaleWei, parseFloat(await crowdsale.totalPresaleWei.call()));
    assert.equal(state.crowdsaleFinalized, await crowdsale.isFinalized.call());
    if (state.weiPerUSDinTGE > 0) {
      assert.equal(state.crowdsaleFunded, await crowdsale.funded());
    }
  }

  let runGeneratedCrowdsaleAndCommands = async function(input) {
    let publicPresaleStartBlock = web3.eth.blockNumber + 10;
    let publicPresaleEndBlock = publicPresaleStartBlock + 10;
    let startBlock = publicPresaleEndBlock + 10;
    let endBlock1 = startBlock + 10;
    let endBlock2 = endBlock1 + 10;

    help.debug("crowdsaleTestInput data:\n", input, publicPresaleStartBlock, publicPresaleEndBlock, startBlock, endBlock1, endBlock2);

    let {publicPresaleRate, rate1, rate2, owner, setWeiLockBlocks} = input.crowdsale,
      ownerAddress = accounts[input.crowdsale.owner];
    let shouldThrow = (publicPresaleRate == 0) ||
      (rate1 == 0) ||
      (rate2 == 0) ||
      (publicPresaleStartBlock >= publicPresaleEndBlock) ||
      (publicPresaleEndBlock >= startBlock) ||
      (startBlock >= endBlock1) ||
      (endBlock1 >= endBlock2) ||
      (setWeiLockBlocks == 0)

    var eventsWatcher;

    try {
      let crowdsaleData = {
        publicPresaleStartBlock: publicPresaleStartBlock, publicPresaleEndBlock: publicPresaleEndBlock,
        startBlock: startBlock, endBlock1: endBlock1, endBlock2: endBlock2,
        publicPresaleRate: input.crowdsale.publicPresaleRate,
        rate1: input.crowdsale.rate1,
        rate2: input.crowdsale.rate2,
        privatePresaleRate: input.crowdsale.privatePresaleRate,
        setWeiLockBlocks: input.crowdsale.setWeiLockBlocks,
        foundationWallet: accounts[input.crowdsale.foundationWallet],
        maxPresaleCapUSD: 1000000,
        minCapUSD: 5000000,
        maxFoundationCapUSD: 10000000,
        marketMaker24PeriodsCapUSD: 40000000
      };

      let crowdsale = await LifCrowdsale.new(
        crowdsaleData.publicPresaleStartBlock,
        crowdsaleData.publicPresaleEndBlock,
        crowdsaleData.startBlock,
        crowdsaleData.endBlock1,
        crowdsaleData.endBlock2,
        crowdsaleData.publicPresaleRate,
        crowdsaleData.rate1,
        crowdsaleData.rate2,
        crowdsaleData.privatePresaleRate,
        crowdsaleData.setWeiLockBlocks,
        crowdsaleData.foundationWallet,
        {from: ownerAddress}
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
        balances: [],
        purchases: [],
        presalePurchases: [],
        claimedEth: {},
        weiRaised: 0,
        totalPresaleWei: 0,
        crowdsalePaused: false,
        tokenPaused: true,
        crowdsaleFinalized: false,
        weiPerUSDinPresale: 0,
        weiPerUSDinTGE: 0,
        crowdsaleFunded: false,
        owner: owner
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

  it("doesn't fail on some specific examples that once failed", async function() {

    await runGeneratedCrowdsaleAndCommands({
      commands: [
        {"type":"waitBlock","blocks":10},
        {"type":"sendTransaction","account":3,"beneficiary":0,"eth":9}
      ],
      crowdsale: {
        publicPresaleRate: 33, rate1: 18, rate2: 33, privatePresaleRate: 48,
        foundationWallet: 1, setWeiLockBlocks: 1, owner: 7
      }
    });

    await runGeneratedCrowdsaleAndCommands({
      commands: [
        {"type":"waitBlock","blocks":27},
        {"type":"pauseCrowdsale","pause":true,"fromAccount":8},
        {"type":"sendTransaction","account":0,"beneficiary":9,"eth":39}
      ],
      crowdsale: {
        publicPresaleRate: 1, rate1: 39, rate2: 13, privatePresaleRate: 35,
        foundationWallet: 8, setWeiLockBlocks: 1, owner: 9
      }
    });

  });

  it("calculates correct rate on the boundaries between endBlock1 and endBlock2", async function() {
    let crowdsaleAndCommands = {
      commands: [
        { type: 'checkRate' },
        { type: 'setWeiPerUSDinPresale', wei: 3000000000000000, fromAccount: 3 },
        { type: 'checkRate' },
        { type: 'waitBlock', blocks: 29 },
        { type: 'buyTokens', beneficiary: 3, account: 2, eth: 12 }
      ],
      crowdsale: {
        publicPresaleRate: 20,
        rate1: 16,
        rate2: 14,
        privatePresaleRate: 14,
        setWeiLockBlocks: 5,
        foundationWallet: 2,
        owner: 3
      }
    };

    await runGeneratedCrowdsaleAndCommands(crowdsaleAndCommands);
  });

  it("Execute a normal presale and TGE", async function() {
    let crowdsaleAndCommands = {
      commands: [
        { type: 'checkRate' },
        { type: 'setWeiPerUSDinPresale', wei: 3000000000000000, fromAccount: 3 },
        { type: 'waitBlock', blocks: 10 },
        { type: 'buyPresaleTokens', beneficiary: 3, account: 4, eth: 3000 },
        { type: 'waitBlock', blocks: 8 },
        { type: 'setWeiPerUSDinTGE', wei: 1500000000000000, fromAccount: 3 },
        { type: 'waitBlock', blocks: 12 },
        { type: 'buyTokens', beneficiary: 3, account: 4, eth: 40000 },
        { type: 'waitBlock', blocks: 10 },
        { type: 'buyTokens', beneficiary: 3, account: 4, eth: 23000 },
        { type: 'waitBlock', blocks: 10 },
        { type: 'finalizeCrowdsale', fromAccount: 5 }
      ],
      crowdsale: {
        publicPresaleRate: 11,
        rate1: 10,
        rate2: 9,
        privatePresaleRate: 13,
        setWeiLockBlocks: 5,
        foundationWallet: 2,
        owner: 3
      }
    };

    await runGeneratedCrowdsaleAndCommands(crowdsaleAndCommands);
  });

  it("should handle the exception correctly when trying to pause the token during and after the crowdsale", async function() {
    let crowdsaleAndCommands = {
    commands: [
        { type: 'checkRate' },
        { type: 'setWeiPerUSDinPresale', wei: 3000000000000000, fromAccount: 3 },
        { type: 'waitBlock', blocks: 10 },
        { type: 'buyPresaleTokens', beneficiary: 3, account: 4, eth: 3000 },
        { type: 'waitBlock', blocks: 8 },
        { type: 'pauseToken', 'pause':true, 'fromAccount':1 },
        { type: 'setWeiPerUSDinTGE', wei: 1500000000000000, fromAccount: 3 },
        { type: 'waitBlock', blocks: 12 },
        { type: 'buyTokens', beneficiary: 3, account: 4, eth: 60000 },
        { type: 'waitBlock', blocks: 20 },
        { type: 'finalizeCrowdsale', fromAccount: 5 },
        { type: 'pauseToken', 'pause':true, 'fromAccount':1 }
      ],
      crowdsale: {
        publicPresaleRate: 11,
        rate1: 10,
        rate2: 9,
        privatePresaleRate: 13,
        setWeiLockBlocks: 5,
        foundationWallet: 2,
        owner: 3
      }
    }
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
