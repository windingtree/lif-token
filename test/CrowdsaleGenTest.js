var _ = require('lodash');
var jsc = require("jsverify");

var BigNumber = web3.BigNumber;

var help = require("./helpers");
var latestTime = require('./helpers/latestTime');
var {increaseTimeTestRPC, increaseTimeTestRPCTo, duration} = require('./helpers/increaseTime');

var LifToken = artifacts.require("./LifToken.sol");
var LifCrowdsale = artifacts.require("./LifCrowdsale.sol");

let gen = require("./generators");
let commands = require("./commands");

const LOG_EVENTS = true;

let GEN_TESTS_QTY = parseInt(process.env.GEN_TESTS_QTY);
if (isNaN(GEN_TESTS_QTY))
  GEN_TESTS_QTY = 50;

let GEN_TESTS_TIMEOUT = parseInt(process.env.GEN_TESTS_TIMEOUT);
if (isNaN(GEN_TESTS_TIMEOUT))
  GEN_TESTS_TIMEOUT = 240;

contract('LifCrowdsale Property-based test', function(accounts) {

  let crowdsaleTestInputGen = jsc.record({
    commands: jsc.array(jsc.nonshrink(commands.commandsGen)),
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
    await increaseTimeTestRPC(60);
    let publicPresaleStartTimestamp = latestTime() + duration.days(1);
    let publicPresaleEndTimestamp = publicPresaleStartTimestamp + duration.days(1);
    let startTimestamp = publicPresaleEndTimestamp + duration.days(1);
    let end1Timestamp = startTimestamp + duration.days(1);
    let end2Timestamp = end1Timestamp + duration.days(1);

    help.debug("crowdsaleTestInput data:\n", input, publicPresaleStartTimestamp, publicPresaleEndTimestamp, startTimestamp, end1Timestamp, end2Timestamp);

    let {publicPresaleRate, rate1, rate2, owner, setWeiLockSeconds} = input.crowdsale,
      ownerAddress = accounts[input.crowdsale.owner];
    let shouldThrow = (publicPresaleRate == 0) ||
      (rate1 == 0) ||
      (rate2 == 0) ||
      (publicPresaleStartTimestamp >= publicPresaleEndTimestamp) ||
      (publicPresaleEndTimestamp >= startTimestamp) ||
      (startTimestamp >= end1Timestamp) ||
      (end1Timestamp >= end2Timestamp) ||
      (setWeiLockSeconds == 0)

    var eventsWatcher;

    try {
      let crowdsaleData = {
        publicPresaleStartTimestamp: publicPresaleStartTimestamp, publicPresaleEndTimestamp: publicPresaleEndTimestamp,
        startTimestamp: startTimestamp, end1Timestamp: end1Timestamp, end2Timestamp: end2Timestamp,
        publicPresaleRate: input.crowdsale.publicPresaleRate,
        rate1: input.crowdsale.rate1,
        rate2: input.crowdsale.rate2,
        privatePresaleRate: input.crowdsale.privatePresaleRate,
        setWeiLockSeconds: input.crowdsale.setWeiLockSeconds,
        foundationWallet: accounts[input.crowdsale.foundationWallet],
        maxPresaleCapUSD: 1000000,
        minCapUSD: 5000000,
        maxFoundationCapUSD: 10000000,
        marketMaker24PeriodsCapUSD: 40000000
      };

      let crowdsale = await LifCrowdsale.new(
        crowdsaleData.publicPresaleStartTimestamp,
        crowdsaleData.publicPresaleEndTimestamp,
        crowdsaleData.startTimestamp,
        crowdsaleData.end1Timestamp,
        crowdsaleData.end2Timestamp,
        crowdsaleData.publicPresaleRate,
        crowdsaleData.rate1,
        crowdsaleData.rate2,
        crowdsaleData.privatePresaleRate,
        crowdsaleData.setWeiLockSeconds,
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
        balances: {},
        ethBalances: {},
        allowances: {},
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
        owner: owner,
        marketMakerBuyPrice: new BigNumber(0),
        marketMakerBurnedTokens: new BigNumber(0),
        returnedWeiForBurnedTokens: new BigNumber(0)
      };

      for (let commandParams of input.commands) {
        let command = commands.findCommand(commandParams.type);
        try {
          state = await command.run(commandParams, state);
        }
        catch(error) {
          help.debug("An error occurred, block timestamp: " + latestTime() + "\nError: " + error);
          if (error instanceof commands.ExceptionRunningCommand) {
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
        { type: "waitTime","seconds":duration.days(1)},
        { type:"sendTransaction","account":3,"beneficiary":0,"eth":9}
      ],
      crowdsale: {
        publicPresaleRate: 33, rate1: 18, rate2: 33, privatePresaleRate: 48,
        foundationWallet: 1, setWeiLockSeconds: 600, owner: 7
      }
    });

    await runGeneratedCrowdsaleAndCommands({
      commands: [
        { type: "waitTime","seconds":duration.days(2.6)},
        { type:"pauseCrowdsale","pause":true,"fromAccount":8},
        { type:"sendTransaction","account":0,"beneficiary":9,"eth":39}
      ],
      crowdsale: {
        publicPresaleRate: 1, rate1: 39, rate2: 13, privatePresaleRate: 35,
        foundationWallet: 8, setWeiLockSeconds: 600, owner: 9
      }
    });

  });

  it("calculates correct rate on the boundaries between end1Timestamp and end2Timestamp", async function() {
    let crowdsaleAndCommands = {
      commands: [
        { type: "checkRate" },
        { type: "waitTime","seconds":duration.minutes(1430)},
        { type: "setWeiPerUSDinPresale", wei: 3000000000000000, fromAccount: 3 },
        { type: "checkRate" },
        { type: "waitTime","seconds":duration.days(2.9)},
        { type: "buyTokens", beneficiary: 3, account: 2, eth: 12 }
      ],
      crowdsale: {
        publicPresaleRate: 20,
        rate1: 16,
        rate2: 14,
        privatePresaleRate: 14,
        setWeiLockSeconds: 3600,
        foundationWallet: 2,
        owner: 3
      }
    };

    await runGeneratedCrowdsaleAndCommands(crowdsaleAndCommands);
  });

  it("Execute a normal presale and TGE", async function() {
    let crowdsaleAndCommands = {
      commands: [
        { type: "checkRate" },
        { type: "setWeiPerUSDinPresale", wei: 3000000000000000, fromAccount: 3 },
        { type: "waitTime","seconds":duration.days(2)},
        { type: "buyPresaleTokens", beneficiary: 3, account: 4, eth: 3000 },
        { type: "setWeiPerUSDinTGE", wei: 1500000000000000, fromAccount: 3 },
        { type: "waitTime","seconds":duration.days(1)},
        { type: "buyTokens", beneficiary: 3, account: 4, eth: 40000 },
        { type: "waitTime","seconds":duration.days(1)},
        { type: "buyTokens", beneficiary: 3, account: 4, eth: 23000 },
        { type: "waitTime","seconds":duration.days(1)},
        { type: "finalizeCrowdsale", fromAccount: 5 }
      ],
      crowdsale: {
        publicPresaleRate: 11,
        rate1: 10,
        rate2: 9,
        privatePresaleRate: 13,
        setWeiLockSeconds: 3600,
        foundationWallet: 2,
        owner: 3
      }
    };

    await runGeneratedCrowdsaleAndCommands(crowdsaleAndCommands);
  });

  it("should handle the exception correctly when trying to pause the token during and after the crowdsale", async function() {
    let crowdsaleAndCommands = {
    commands: [
        { type: "checkRate" },
        { type: "setWeiPerUSDinPresale", wei: 3000000000000000, fromAccount: 3 },
        { type: "waitTime","seconds":duration.days(1)},
        { type: "buyPresaleTokens", beneficiary: 3, account: 4, eth: 3000 },
        { type: "waitTime","seconds":duration.days(0.8)},
        { type: "pauseToken", "pause":true, 'fromAccount':1 },
        { type: "setWeiPerUSDinTGE", wei: 1500000000000000, fromAccount: 3 },
        { type: "waitTime","seconds":duration.days(1.1)},
        { type: "buyTokens", beneficiary: 3, account: 4, eth: 60000 },
        { type: "waitTime","seconds":duration.days(2)},
        { type: "finalizeCrowdsale", fromAccount: 5 },
        { type: "pauseToken", "pause":true, 'fromAccount':1 }
      ],
      crowdsale: {
        publicPresaleRate: 11,
        rate1: 10,
        rate2: 9,
        privatePresaleRate: 13,
        setWeiLockSeconds: 5,
        foundationWallet: 2,
        owner: 3
      }
    }
    await runGeneratedCrowdsaleAndCommands(crowdsaleAndCommands);
  });

  it("should not fail when setting wei for presale or tge before each stage starts", async function() {
    // trying multiple commands with different reasons to fail: wrong owner or wei==0
    await runGeneratedCrowdsaleAndCommands({
      commands: [
        { type:"setWeiPerUSDinPresale","wei":3,"fromAccount":10},
        { type:"setWeiPerUSDinPresale","wei":0,"fromAccount":6},
        { type:"setWeiPerUSDinPresale","wei":5,"fromAccount":6}
      ],
      crowdsale: {
        publicPresaleRate: 27, rate1: 10, rate2: 31, privatePresaleRate: 35,
        foundationWallet: 10, setWeiLockSeconds: 1, owner: 6
      }
    });

    await runGeneratedCrowdsaleAndCommands({
      commands: [
        { type:"setWeiPerUSDinTGE","wei":0,"fromAccount":10},
        { type:"setWeiPerUSDinTGE","wei":0,"fromAccount":6},
        { type:"setWeiPerUSDinTGE","wei":3,"fromAccount":6}
      ],
      crowdsale: {
        publicPresaleRate: 27, rate1: 10, rate2: 31, privatePresaleRate: 35,
        foundationWallet: 10, setWeiLockSeconds: 1, owner: 6
      }
    });
  });

  it("should handle the thrown exc. when trying to approve on the paused token", async function() {
    await runGeneratedCrowdsaleAndCommands({
      commands: [{ type:"approve","lif":0,"fromAccount":3,"spenderAccount":5}],
      crowdsale: {
        publicPresaleRate: 23, rate1: 24, rate2: 15, privatePresaleRate: 15,
        foundationWallet: 2, setWeiLockSeconds: 1, owner: 5
      }
    });
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
