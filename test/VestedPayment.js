var help = require('./helpers');
var latestTime = require('./helpers/latestTime');
var { increaseTimeTestRPC, increaseTimeTestRPCTo, duration } = require('./helpers/increaseTime');

var BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

var VestedPayment = artifacts.require('VestedPayment.sol');
var LifToken = artifacts.require('LifToken.sol');

const LOG_EVENTS = true;

contract('VestedPayment', function (accounts) {
  var token;
  var eventsWatcher;

  beforeEach(async function () {
    const rate = 100000000000;
    const crowdsale = await help.simulateCrowdsale(rate, [100], accounts, 1);
    token = LifToken.at(await crowdsale.token.call());
    eventsWatcher = token.allEvents();
    eventsWatcher.watch(function (error, log) {
      if (LOG_EVENTS) {
        if (error) {
          console.log('Error in event:', error);
        } else {
          console.log('Event:', log.event, ':', log.args);
        }
      }
    });
  });

  afterEach(function (done) {
    eventsWatcher.stopWatching();
    done();
  });

  const oneMonth = duration.days(30);

  it('create the VestedPayment', async function () {
    const startTimestamp = latestTime() + duration.days(10);
    var vestedPayment = await VestedPayment.new(
      startTimestamp, oneMonth, 10, 4,
      7, token.address
    );
    assert.equal(startTimestamp, await vestedPayment.startTimestamp.call());
    assert.equal(oneMonth, parseInt(await vestedPayment.secondsPerPeriod.call()));
    assert.equal(10, await vestedPayment.totalPeriods.call());
    assert.equal(4, await vestedPayment.cliffDuration.call());
    assert.equal(7, parseInt(await vestedPayment.tokens.call()));
    assert.equal(token.address, await vestedPayment.token.call());
  });

  it('can be created on the current timestamp', async function () {
    // we adds 2 seconds from the last block timestamp, because we don't know the exact timestamp
    // of the block this is going to be executeed on
    await VestedPayment.new(latestTime() + 2, oneMonth, 10, 4, 7, token.address);
  });

  it('fails to create when startTimestamp is in the past', async function () {
    try {
      await VestedPayment.new(latestTime() - 1, oneMonth, 10, 4, 7, token.address);
      assert(false, 'create vested payment in the past should have failed');
    } catch (e) {
      assert(help.isInvalidOpcodeEx(e));
    }
  });

  it('fails to create when secondsPerPeriod is 0', async function () {
    try {
      await VestedPayment.new(latestTime() + 2, 0, 10, 4, 7, token.address);
      assert(false, 'create vested payment with 0 as period duration should have failed');
    } catch (e) {
      assert(help.isInvalidOpcodeEx(e));
    }
  });

  it('fails to create when total periods is 0', async function () {
    try {
      await VestedPayment.new(latestTime() + 2, oneMonth, 0, 4, 7, token.address);
      assert(false, 'create vested payment with 0 total periods should have failed');
    } catch (e) {
      assert(help.isInvalidOpcodeEx(e));
    }
  });

  it('fails to create when token address is 0x0', async function () {
    try {
      await VestedPayment.new(latestTime() + 2, oneMonth, 10, 4, 7, help.zeroAddress);
      assert(false, 'create vested payment with address 0x0 should have failed');
    } catch (e) {
      assert(help.isInvalidOpcodeEx(e));
    }
  });

  it('fails to create when cliff duration is longer than periods count', async function () {
    try {
      await VestedPayment.new(latestTime() + 7, oneMonth, 10, 11, 7, token.address);
      assert(false, 'create vested payment with too long cliff duration should have failed');
    } catch (e) {
      assert(help.isInvalidOpcodeEx(e));
    }
  });

  it('fails to create when tokens is equal to 0', async function () {
    try {
      await VestedPayment.new(latestTime() + 7, oneMonth, 10, 4, 0, token.address);
      assert(false, 'create vested payment with too long cliff duration should have failed');
    } catch (e) {
      assert(help.isInvalidOpcodeEx(e));
    }
  });

  it('get availableToClaim correctly with cliff periods', async function () {
    const startTimestamp = latestTime() + 2 * oneMonth;
    var vestedPayment = await VestedPayment.new(
      startTimestamp, oneMonth, 12, 4,
      help.lif2LifWei(60), token.address, { from: accounts[1] }
    );
    var tokensAvailable = new BigNumber(0);

    await token.transfer(vestedPayment.address, help.lif2LifWei(60), { from: accounts[1] });

    // Go to start
    await increaseTimeTestRPCTo(startTimestamp);

    tokensAvailable.should.be.bignumber
      .equal(await vestedPayment.getAvailableTokens.call());

    // Go to period 2
    await increaseTimeTestRPC(duration.days(60));

    tokensAvailable.should.be.bignumber
      .equal(await vestedPayment.getAvailableTokens.call());

    // Go to period 4
    await increaseTimeTestRPC(duration.days(60));

    tokensAvailable = tokensAvailable.plus(help.lif2LifWei(25));

    tokensAvailable.should.be.bignumber
      .equal(await vestedPayment.getAvailableTokens.call());
  });

  it('get availableToClaim correctly without cliff periods', async function () {
    const startTimestamp = latestTime() + duration.days(60);
    var vestedPayment = await VestedPayment.new(
      startTimestamp, duration.days(30), 12, 0,
      help.lif2LifWei(60), token.address, { from: accounts[1] }
    );
    var tokensAvailable = new BigNumber(0);

    await token.transfer(vestedPayment.address, help.lif2LifWei(60), { from: accounts[1] });
    // Go to start
    await increaseTimeTestRPCTo(startTimestamp);

    tokensAvailable = tokensAvailable.plus(help.lif2LifWei(5));

    tokensAvailable.should.be.bignumber
      .equal(await vestedPayment.getAvailableTokens.call());

    // Go to period 5
    await increaseTimeTestRPC(duration.days(150));

    tokensAvailable = tokensAvailable.plus(help.lif2LifWei(25));

    tokensAvailable.should.be.bignumber
      .equal(await vestedPayment.getAvailableTokens.call());
  });

  it('claim tokens correctly with cliff periods and owner transfered', async function () {
    const startTimestamp = latestTime() + duration.days(60);
    var vestedPayment = await VestedPayment.new(
      startTimestamp, duration.days(30), 12, 4,
      help.lif2LifWei(60), token.address, { from: accounts[1] });
    var tokensAvailable = new BigNumber(0);

    await token.transfer(vestedPayment.address, help.lif2LifWei(60), { from: accounts[1] });
    await vestedPayment.transferOwnership(accounts[2], { from: accounts[1] });
    assert.equal(accounts[2], await vestedPayment.owner.call());

    // Go to start
    await increaseTimeTestRPCTo(startTimestamp);

    tokensAvailable.should.be.bignumber
      .equal(await vestedPayment.getAvailableTokens.call());

    // Go to period 4 and claim 20 tokens
    await increaseTimeTestRPCTo(startTimestamp + duration.days(120));

    tokensAvailable = tokensAvailable.plus(help.lif2LifWei(25));

    tokensAvailable.should.be.bignumber
      .equal(await vestedPayment.getAvailableTokens.call());

    await vestedPayment.claimTokens(help.lif2LifWei(20), { from: accounts[2] });
    tokensAvailable = tokensAvailable.minus(help.lif2LifWei(20));

    tokensAvailable.should.be.bignumber
      .equal(await vestedPayment.getAvailableTokens.call());

    // Go to period 10 and claim 10 tokens
    await increaseTimeTestRPCTo(startTimestamp + duration.days(300));

    tokensAvailable = tokensAvailable.plus(help.lif2LifWei(30));

    tokensAvailable.should.be.bignumber
      .equal(await vestedPayment.getAvailableTokens.call());

    await vestedPayment.claimTokens(help.lif2LifWei(10), { from: accounts[2] });
    tokensAvailable = tokensAvailable.minus(help.lif2LifWei(10));

    tokensAvailable.should.be.bignumber
      .equal(await vestedPayment.getAvailableTokens.call());

    // Go to period 11 plus 90 days and claim teh remaining tokens
    await increaseTimeTestRPCTo(startTimestamp + duration.days(320) + duration.days(90));

    tokensAvailable = tokensAvailable.plus(help.lif2LifWei(5));

    tokensAvailable.should.be.bignumber
      .equal(await vestedPayment.getAvailableTokens.call());

    await vestedPayment.claimTokens(tokensAvailable, { from: accounts[2] });

    help.lif2LifWei(60).should.be.bignumber
      .equal(await token.balanceOf(accounts[2]));
  });

  it('should fail when try to claim tokens inside cliff periods', async function () {
    const startTimestamp = latestTime() + duration.days(60);
    var vestedPayment = await VestedPayment.new(
      startTimestamp, duration.days(30), 12, 4,
      help.lif2LifWei(60), token.address, { from: accounts[1] }
    );

    await token.transfer(vestedPayment.address, help.lif2LifWei(60), { from: accounts[1] });
    await vestedPayment.transferOwnership(accounts[2], { from: accounts[1] });

    assert.equal(accounts[2], await vestedPayment.owner.call());

    // Go to period 1
    await increaseTimeTestRPCTo(startTimestamp + duration.days(30));

    try {
      await vestedPayment.claimTokens(help.lif2LifWei(5), { from: accounts[2] });
    } catch (error) {
      if (!help.isInvalidOpcodeEx(error)) throw error;
    }
  });

  it('should fail when try to claim more tokens than the available', async function () {
    const startTimestamp = latestTime() + duration.days(60);
    var vestedPayment = await VestedPayment.new(
      startTimestamp, duration.days(30), 12, 0,
      help.lif2LifWei(60), token.address, { from: accounts[1] }
    );

    await token.transfer(vestedPayment.address, help.lif2LifWei(60), { from: accounts[1] });
    await vestedPayment.transferOwnership(accounts[2], { from: accounts[1] });

    assert.equal(accounts[2], await vestedPayment.owner.call());

    // Go to period 1
    await increaseTimeTestRPCTo(startTimestamp + duration.days(30));

    try {
      await vestedPayment.claimTokens(help.lif2LifWei(15), { from: accounts[2] });
    } catch (error) {
      if (!help.isInvalidOpcodeEx(error)) throw error;
    }
  });
});
