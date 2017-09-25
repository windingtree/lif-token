var _ = require('lodash');
var jsc = require('jsverify');

var BigNumber = web3.BigNumber;

var help = require('./helpers');
var latestTime = require('./helpers/latestTime');
var {increaseTimeTestRPC, duration} = require('./helpers/increaseTime');

var LifToken = artifacts.require('./LifToken.sol');
var LifCrowdsale = artifacts.require('./LifCrowdsale.sol');

let gen = require('./generators');
let commands = require('./commands');

const LOG_EVENTS = true;

let GEN_TESTS_QTY = parseInt(process.env.GEN_TESTS_QTY);
if (isNaN(GEN_TESTS_QTY))
  GEN_TESTS_QTY = 50;

let GEN_TESTS_TIMEOUT = parseInt(process.env.GEN_TESTS_TIMEOUT);
if (isNaN(GEN_TESTS_TIMEOUT))
  GEN_TESTS_TIMEOUT = 240;

contract('LifCrowdsale Property-based test', function() {

  const zero = new BigNumber(0);

  let crowdsaleTestInputGen = jsc.record({
    commands: jsc.array(jsc.nonshrink(commands.commandsGen)),
    crowdsale: jsc.nonshrink(gen.crowdsaleGen)
  });

  let sumBigNumbers = (arr) => _.reduce(arr, (accum, x) => accum.plus(x), zero);

  let checkCrowdsaleState = async function(state, crowdsaleData, crowdsale) {
    assert.equal(state.crowdsalePaused, await crowdsale.paused());

    let tokensInPurchases = sumBigNumbers(_.map(state.purchases, (p) => p.tokens));
    tokensInPurchases.should.be.bignumber.equal(help.lifWei2Lif(await crowdsale.tokensSold()));

    let presaleWei = sumBigNumbers(_.map(state.presalePurchases, (p) => p.wei));

    presaleWei.should.be.bignumber.equal(await crowdsale.totalPresaleWei.call());

    help.debug('checking purchases total wei, purchases:', JSON.stringify(state.purchases));
    let weiInPurchases = sumBigNumbers(_.map(state.purchases, (p) => p.wei));
    weiInPurchases.should.be.bignumber.equal(await crowdsale.weiRaised());

    // Check presale tokens sold
    state.totalPresaleWei.should.be.bignumber.equal(await crowdsale.totalPresaleWei.call());
    assert.equal(state.crowdsaleFinalized, await crowdsale.isFinalized.call());
    if (state.crowdsaleFinalized && state.weiPerUSDinTGE > 0) {
      assert.equal(state.crowdsaleFunded, await crowdsale.funded());
    }

    state.totalSupply.
      should.be.bignumber.equal(await state.token.totalSupply.call());
  };

  let runGeneratedCrowdsaleAndCommands = async function(input) {
    await increaseTimeTestRPC(60);
    let startTimestamp = latestTime() + duration.days(1);
    let end1Timestamp = startTimestamp + duration.days(1);
    let end2Timestamp = end1Timestamp + duration.days(1);

    help.debug('crowdsaleTestInput data:\n', input, startTimestamp, end1Timestamp, end2Timestamp);

    let {rate1, rate2, owner, setWeiLockSeconds} = input.crowdsale,
      ownerAddress = gen.getAccount(input.crowdsale.owner),
      foundationWallet = gen.getAccount(input.crowdsale.foundationWallet),
      foundersWallet = gen.getAccount(input.crowdsale.foundersWallet);
    let shouldThrow = (rate1 == 0) ||
      (rate2 == 0) ||
      (latestTime() >= startTimestamp) ||
      (startTimestamp >= end1Timestamp) ||
      (end1Timestamp >= end2Timestamp) ||
      (setWeiLockSeconds == 0) ||
      (ownerAddress == 0) ||
      (foundationWallet == 0) ||
      (foundersWallet == 0);

    var eventsWatcher;

    try {
      let crowdsaleData = {
        startTimestamp: startTimestamp,
        end1Timestamp: end1Timestamp,
        end2Timestamp: end2Timestamp,
        rate1: input.crowdsale.rate1,
        rate2: input.crowdsale.rate2,
        setWeiLockSeconds: input.crowdsale.setWeiLockSeconds,
        foundationWallet: gen.getAccount(input.crowdsale.foundationWallet),
        foundersWallet: gen.getAccount(input.crowdsale.foundersWallet),
        minCapUSD: 5000000,
        maxFoundationCapUSD: 10000000,
        MVM24PeriodsCapUSD: 40000000
      };

      let crowdsale = await LifCrowdsale.new(
        crowdsaleData.startTimestamp,
        crowdsaleData.end1Timestamp,
        crowdsaleData.end2Timestamp,
        crowdsaleData.rate1,
        crowdsaleData.rate2,
        crowdsaleData.setWeiLockSeconds,
        crowdsaleData.foundationWallet,
        crowdsaleData.foundersWallet,
        {from: ownerAddress}
      );

      assert.equal(false, shouldThrow, 'create Crowdsale should have thrown but it did not');

      let token = LifToken.at(await crowdsale.token());

      eventsWatcher = crowdsale.allEvents();
      eventsWatcher.watch(function(error, log){
        if (LOG_EVENTS)
          console.log('Event:', log.event, ':',log.args);
      });

      help.debug('created crowdsale at address ', crowdsale.address);

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
        weiRaised: zero,
        totalPresaleWei: zero,
        crowdsalePaused: false,
        tokenPaused: true,
        crowdsaleFinalized: false,
        weiPerUSDinTGE: 0,
        crowdsaleFunded: false,
        owner: owner,
        totalSupply: zero,
        initialTokenSupply: zero,
        MVMBuyPrice: new BigNumber(0),
        MVMBurnedTokens: new BigNumber(0),
        MVMClaimedWei: zero,
        claimablePercentage: zero,
        burnedTokens: zero,
        returnedWeiForBurnedTokens: new BigNumber(0)
      };

      for (let commandParams of input.commands) {
        let command = commands.findCommand(commandParams.type);
        try {
          state = await command.run(commandParams, state);
        }
        catch(error) {
          help.debug('An error occurred, block timestamp: ' + latestTime() + '\nError: ' + error);
          if (error instanceof commands.ExceptionRunningCommand) {
            throw(new Error(
              error.message + '\n\nUse the following to reproduce the failure:\n\n'
              + 'await runGeneratedCrowdsaleAndCommands('
              + JSON.stringify(input, null, 2) + ');'
            ));
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
  };

  it('does not fail on some specific examples that once failed', async function() {

    await runGeneratedCrowdsaleAndCommands({
      commands: [
        { type: 'waitTime','seconds':duration.days(1)},
        { type:'sendTransaction','account':3,'beneficiary':0,'eth':9}
      ],
      crowdsale: {
        rate1: 18, rate2: 33,
        foundationWallet: 1, foundersWallet: 2, setWeiLockSeconds: 600, owner: 7
      }
    });

    await runGeneratedCrowdsaleAndCommands({
      commands: [
        { type: 'waitTime','seconds':duration.days(2.6)},
        { type:'pauseCrowdsale','pause':true,'fromAccount':8},
        { type:'sendTransaction','account':0,'beneficiary':9,'eth':39}
      ],
      crowdsale: {
        rate1: 39, rate2: 13,
        foundationWallet: 8, foundersWallet: 2, setWeiLockSeconds: 600, owner: 9
      }
    });

    await runGeneratedCrowdsaleAndCommands({
      commands: [
        {'type':'fundCrowdsaleBelowSoftCap','account':7,'finalize':false}
      ],
      crowdsale: {
        rate1: 33, rate2: 12,
        foundationWallet: 10, foundersWallet: 2, setWeiLockSeconds: 52, owner: 0
      }
    });
  });

  it('does not fail when running a fund over soft cap and then one below soft cap commands', async function() {
    await runGeneratedCrowdsaleAndCommands({
      commands: [
        {'type':'fundCrowdsaleOverSoftCap','account':7,'softCapExcessWei':7,'finalize':false},
        {'type':'fundCrowdsaleBelowSoftCap','account':10,'finalize':true}
      ],
      crowdsale: {
        publicPresaleRate: 12, rate1: 10, rate2: 27, privatePresaleRate: 44,
        foundationWallet: 0, foundersWallet: 2, setWeiLockSeconds: 392, owner: 5
      }
    });
  });

  it('does not fail when funding below soft cap and then sending tokens to the MVM', async function() {
    await runGeneratedCrowdsaleAndCommands({
      commands: [
        {'type':'fundCrowdsaleBelowSoftCap','account':10,'finalize':true},
        {'type':'MVMSendTokens','tokens':3,'from':10}
      ],
      crowdsale: {
        rate1: 9, rate2: 1, privatePresaleRate: 3, foundationWallet: 0,
        foundersWallet: 2, setWeiLockSeconds: 600, owner: 8
      }
    });
  });

  it('calculates correct rate on the boundaries between end1Timestamp and end2Timestamp', async function() {
    let crowdsaleAndCommands = {
      commands: [
        { type: 'checkRate' },
        { type: 'waitTime','seconds':duration.minutes(1430)},
        { type: 'setWeiPerUSDinTGE', wei: 3000000000000000, fromAccount: 3 },
        { type: 'checkRate' },
        { type: 'waitTime','seconds':duration.days(2.9)},
        { type: 'buyTokens', beneficiary: 3, account: 2, eth: 12 }
      ],
      crowdsale: {
        rate1: 16,
        rate2: 14,
        setWeiLockSeconds: 3600,
        foundationWallet: 2,
        foundersWallet: 2,
        owner: 3
      }
    };

    await runGeneratedCrowdsaleAndCommands(crowdsaleAndCommands);
  });

  it('Execute a normal TGE', async function() {
    let crowdsaleAndCommands = {
      commands: [
        { type: 'checkRate' },
        { type: 'setWeiPerUSDinTGE', wei: 1500000000000000, fromAccount: 3 },
        { type: 'waitTime','seconds':duration.days(1)},
        { type: 'buyTokens', beneficiary: 3, account: 4, eth: 40000 },
        { type: 'waitTime','seconds':duration.days(1)},
        { type: 'buyTokens', beneficiary: 3, account: 4, eth: 23000 },
        { type: 'waitTime','seconds':duration.days(1)},
        { type: 'finalizeCrowdsale', fromAccount: 5 }
      ],
      crowdsale: {
        rate1: 10,
        rate2: 9,
        setWeiLockSeconds: 3600,
        foundationWallet: 2,
        foundersWallet: 2,
        owner: 3
      }
    };

    await runGeneratedCrowdsaleAndCommands(crowdsaleAndCommands);
  });

  it('should handle the exception correctly when trying to pause the token during and after the crowdsale', async function() {
    let crowdsaleAndCommands = {
      commands: [
        { type: 'checkRate' },
        { type: 'waitTime','seconds':duration.days(1)},
        { type: 'waitTime','seconds':duration.days(0.8)},
        { type: 'pauseToken', 'pause':true, 'fromAccount':1 },
        { type: 'setWeiPerUSDinTGE', wei: 1500000000000000, fromAccount: 3 },
        { type: 'waitTime','seconds':duration.days(1.1)},
        { type: 'buyTokens', beneficiary: 3, account: 4, eth: 60000 },
        { type: 'waitTime','seconds':duration.days(2)},
        { type: 'finalizeCrowdsale', fromAccount: 5 },
        { type: 'pauseToken', 'pause':true, 'fromAccount':1 }
      ],
      crowdsale: {
        rate1: 10,
        rate2: 9,
        setWeiLockSeconds: 5,
        foundationWallet: 2,
        foundersWallet: 3,
        owner: 3
      }
    };

    await runGeneratedCrowdsaleAndCommands(crowdsaleAndCommands);
  });

  it('should not fail when setting wei for tge before each stage starts', async function() {
    // trying multiple commands with different reasons to fail: wrong owner or wei==0

    await runGeneratedCrowdsaleAndCommands({
      commands: [
        { type:'setWeiPerUSDinTGE','wei':0,'fromAccount':10},
        { type:'setWeiPerUSDinTGE','wei':0,'fromAccount':6},
        { type:'setWeiPerUSDinTGE','wei':3,'fromAccount':6}
      ],
      crowdsale: {
        rate1: 10, rate2: 31,
        foundationWallet: 10,
        foundersWallet: 3,
        setWeiLockSeconds: 1, owner: 6
      }
    });
  });

  it('should handle the thrown exc. when trying to approve on the paused token', async function() {
    await runGeneratedCrowdsaleAndCommands({
      commands: [{ type:'approve','lif':0,'fromAccount':3,'spenderAccount':5}],
      crowdsale: {
        rate1: 24, rate2: 15,
        foundationWallet: 2,
        foundersWallet: 3,
        setWeiLockSeconds: 1, owner: 5
      }
    });
  });

  it('should run the fund and finalize crowdsale command fine', async function() {
    await runGeneratedCrowdsaleAndCommands({
      commands: [
        {'type':'fundCrowdsaleBelowSoftCap','account':3,'finalize':true}
      ],
      crowdsale: {
        rate1: 20, rate2: 46,
        foundationWallet: 4, foundersWallet: 2, setWeiLockSeconds: 521, owner: 0
      }
    });
  });

  it('should run the fund crowdsale below cap without finalize command fine', async function() {
    await runGeneratedCrowdsaleAndCommands({
      commands: [
        {'type':'fundCrowdsaleBelowSoftCap','account':3,'finalize':false}
      ],
      crowdsale: {
        rate1: 20, rate2: 46,
        foundationWallet: 4, foundersWallet: 2,
        setWeiLockSeconds: 521, owner: 0
      }
    });
  });

  it('should run the fund crowdsale below cap, finalize and try to approve form zero address', async function() {
    await runGeneratedCrowdsaleAndCommands({
      commands: [
        {'type':'fundCrowdsaleBelowSoftCap','account':3,'finalize':true},
        {'type':'approve','lif':0,'fromAccount':'zero','spenderAccount':'zero'}
      ],
      crowdsale: {
        rate1: 20, rate2: 46,
        foundationWallet: 4, foundersWallet: 2, setWeiLockSeconds: 521, owner: 0
      }
    });
  });

  it('should approve from zero spender address with lif amount > 0, and then transferFrom', async function() {
    await runGeneratedCrowdsaleAndCommands({
      commands:
      [
        {'type':'fundCrowdsaleOverSoftCap','account':10,'softCapExcessWei':25,'finalize':true},
        {'type':'approve','lif':23,'fromAccount':10,'spenderAccount':'zero'},
        {'type':'transferFrom','lif':23,'fromAccount':'zero','toAccount':5,'senderAccount':10}
      ],
      crowdsale: {
        rate1: 23, rate2: 16, foundationWallet: 0,
        foundersWallet: 2, setWeiLockSeconds: 1726, owner: 0
      }
    });
  });

  it('should be able to transfer tokens in unpaused token after crowdsale funded over cap', async function() {
    await runGeneratedCrowdsaleAndCommands({
      commands: [
        {'type':'fundCrowdsaleOverSoftCap','account':10,'softCapExcessWei':4,'finalize':true},
        {'type':'transfer','lif':0,'fromAccount':4,'toAccount':2}
      ],
      crowdsale: {
        rate1: 14, rate2: 20,
        foundationWallet: 6,
        foundersWallet: 2,
        setWeiLockSeconds: 83, owner: 5
      }
    });
  });

  it('should handle fund, finalize and burn with 0 tokens', async function() {
    await runGeneratedCrowdsaleAndCommands({
      commands: [
        {'type':'fundCrowdsaleBelowSoftCap','account':3,'finalize':true},
        {'type':'burnTokens','account':4,'tokens':0}
      ],
      crowdsale: {
        rate1: 11, rate2: 13, foundationWallet: 3, foundersWallet: 2,
        setWeiLockSeconds: 2273, owner: 1
      }
    });
  });

  it('should run the fund over soft cap and finalize crowdsale command fine', async function() {
    await runGeneratedCrowdsaleAndCommands({
      commands: [
        {'type':'fundCrowdsaleOverSoftCap','account':3,'softCapExcessWei':10,'finalize':true}
      ],
      crowdsale: {
        rate1: 20, rate2: 46,
        foundationWallet: 4, foundersWallet: 2,
        setWeiLockSeconds: 521, owner: 0
      }
    });
  });

  it('should run fund and finalize crowdsale below cap, the burn tokens fine', async function() {
    await runGeneratedCrowdsaleAndCommands({
      commands: [
        {'type':'fundCrowdsaleBelowSoftCap','account':8,'finalize':true},
        {'type':'burnTokens','account':5,'tokens':44}
      ],
      crowdsale: {
        rate1: 1, rate2: 6, foundationWallet: 5, foundersWallet: 2, setWeiLockSeconds: 2176, owner: 10
      }
    });
  });

  it('should run the fund and finalize below and over soft cap sequence fine', async function() {
    await runGeneratedCrowdsaleAndCommands({
      commands: [
        {'type':'fundCrowdsaleBelowSoftCap','account':3,'finalize':false},
        {'type':'fundCrowdsaleOverSoftCap','account':10,'softCapExcessWei':15,'finalize':false}
      ],
      crowdsale: {
        rate1: 26, rate2: 28, foundationWallet: 9, foundersWallet: 2,
        setWeiLockSeconds: 2696, owner: 6
      }
    });
  });

  it('should fund and finalize over cap and then send tokens to MVM fine', async function() {
    await runGeneratedCrowdsaleAndCommands({
      commands: [
        {'type':'fundCrowdsaleOverSoftCap','account':0,'softCapExcessWei':32,'finalize':true},
        {'type':'MVMSendTokens','tokens':4,'from':4}
      ],
      crowdsale: {
        rate1: 2, rate2: 32, foundationWallet: 7, foundersWallet: 2, setWeiLockSeconds: 2098, owner: 9
      }
    });
  });

  it('runs the fund over soft cap and finalize with 0 excess command fine', async function() {
    await runGeneratedCrowdsaleAndCommands({
      commands: [
        {'type':'fundCrowdsaleOverSoftCap','account':0,'softCapExcessWei':0,'finalize': true}
      ],
      crowdsale: {
        rate1: 3, rate2: 3, foundationWallet: 2, foundersWallet: 3,
        setWeiLockSeconds: 2464, owner: 9
      }
    });
  });

  it('should run fund over soft cap and finalize + claimEth sequence fine', async function() {
    await runGeneratedCrowdsaleAndCommands({
      'commands': [
        {'type': 'fundCrowdsaleOverSoftCap', 'account': 8, 'softCapExcessWei': 15, 'finalize': true},
        {'type': 'claimEth', 'eth': 33, 'fromAccount': 8}
      ],
      'crowdsale': {
        'rate1': 23, 'rate2': 40, 'foundationWallet': 1, 'foundersWallet': 2,
        'setWeiLockSeconds': 1445, 'owner': 2
      }
    });

    await runGeneratedCrowdsaleAndCommands({
      commands: [
        {'type':'fundCrowdsaleOverSoftCap','account':7,'softCapExcessWei':13,'finalize':true},
        {'type':'MVMClaimEth','eth':12}
      ],
      crowdsale: {
        rate1: 3, rate2: 11, foundationWallet: 5, foundersWallet: 2,
        setWeiLockSeconds: 3152, owner: 10
      }
    });
  });

  it('runs an addPrivatePresalePayment command fine', async function() {
    await runGeneratedCrowdsaleAndCommands({
      commands: [
        {'type':'addPrivatePresalePayment','beneficiaryAccount':1,'fromAccount':9,'eth':24,'rate':50}
      ],
      crowdsale: {
        rate1: 5, rate2: 21, foundationWallet: 0, foundersWallet: 2,
        setWeiLockSeconds: 1967, owner: 9
      }
    });
  });

  it('runs funds and finalizes a crowdsale and then transfer with zero lif fine', async function() {
    await runGeneratedCrowdsaleAndCommands({
      'commands': [
        { 'type': 'fundCrowdsaleBelowSoftCap', 'account': 2, 'finalize': true },
        { 'type': 'transfer', 'lif': 0, 'fromAccount': 'zero', 'toAccount': 7 }
      ],
      'crowdsale': {
        'rate1': 5, 'rate2': 6, 'foundationWallet': 5, 'foundersWallet': 2,
        'setWeiLockSeconds': 2137, 'owner': 7
      }
    });
  });

  it('distributes tokens correctly on any combination of bids', async function() {
    // stateful prob based tests can take a long time to finish when shrinking...
    this.timeout(GEN_TESTS_TIMEOUT * 1000);

    let property = jsc.forall(crowdsaleTestInputGen, async function(crowdsaleAndCommands) {
      return await runGeneratedCrowdsaleAndCommands(crowdsaleAndCommands);
    });

    console.log('Generative tests to run:', GEN_TESTS_QTY);
    return jsc.assert(property, {tests: GEN_TESTS_QTY});
  });

});
