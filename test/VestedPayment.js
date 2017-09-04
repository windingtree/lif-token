var help = require("./helpers");
var latestTime = require('./helpers/latestTime');
var {increaseTimeTestRPC, increaseTimeTestRPCTo, duration} = require('./helpers/increaseTime');

var BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

var VestedPayment = artifacts.require("./VestedPayment.sol");
var LifToken = artifacts.require("./LifToken.sol");
var LifCrowdsale = artifacts.require("./LifCrowdsale.sol");
var Message = artifacts.require("./Message.sol");

var latestTime = require('./helpers/latestTime');
var {increaseTimeTestRPC, increaseTimeTestRPCTo, duration} = require('./helpers/increaseTime');

const LOG_EVENTS = true;

contract('VestedPayment', function(accounts) {

  var token;
  var eventsWatcher;

  beforeEach(async function() {
    rate = 100000000000;
    token = await help.simulateCrowdsale(rate, [100], accounts);
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

  it("create the VestedPayment", async function() {
    const startTime = latestTime() + duration.days(10);
    var vestedPayment = await VestedPayment.new(
      startTime, duration.days(30), 10, 4, token.address
    );
    assert.equal(startTime, await vestedPayment.startTime.call());
    assert.equal(duration.days(30), parseInt(await vestedPayment.secondsPerPeriod.call()));
    assert.equal(10, await vestedPayment.totalPeriods.call());
    assert.equal(4, await vestedPayment.cliffDuration.call());
    assert.equal(token.address, await vestedPayment.token.call());
  });

  it("get availableToClaim correctly with cliff periods", async function() {
    const startTime = latestTime() + duration.days(60);
    var vestedPayment = await VestedPayment.new(
      startTime, duration.days(30), 12, 4, token.address
    , {from: accounts[1]});
    var tokensAvailable = new BigNumber(0);

    await token.approve(vestedPayment.address, help.lif2LifWei(61), {from: accounts[1]});
    await vestedPayment.fund(help.lif2LifWei(60), {from: accounts[1]});
    assert.equal(true, await vestedPayment.funded.call());

    // Go to start
    await increaseTimeTestRPCTo(startTime);

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

  it("get availableToClaim correctly without cliff periods", async function() {
    const startTime = latestTime() + duration.days(60);
    var vestedPayment = await VestedPayment.new(
      startTime, duration.days(30), 12, 0, token.address
    , {from: accounts[1]});
    var tokensAvailable = new BigNumber(0);

    await token.approve(vestedPayment.address, help.lif2LifWei(61), {from: accounts[1]});
    await vestedPayment.fund(help.lif2LifWei(60), {from: accounts[1]});
    assert.equal(true, await vestedPayment.funded.call());

    // Go to start
    await increaseTimeTestRPCTo(startTime);

    tokensAvailable = tokensAvailable.plus(help.lif2LifWei(5));

    tokensAvailable.should.be.bignumber
      .equal(await vestedPayment.getAvailableTokens.call());

    // Go to period 5
    await increaseTimeTestRPC(duration.days(150));

    tokensAvailable = tokensAvailable.plus(help.lif2LifWei(25));

    tokensAvailable.should.be.bignumber
      .equal(await vestedPayment.getAvailableTokens.call());

  });

  it("claim tokens correctly with cliff periods and owner transfered", async function() {
    const startTime = latestTime() + duration.days(60);
    var vestedPayment = await VestedPayment.new(
      startTime, duration.days(30), 12, 4, token.address
    , {from: accounts[1]});
    var tokensAvailable = new BigNumber(0);

    await token.approve(vestedPayment.address, help.lif2LifWei(61), {from: accounts[1]});
    await vestedPayment.fund(help.lif2LifWei(60), {from: accounts[1]});
    await vestedPayment.transferOwnership(accounts[2], {from: accounts[1]});

    assert.equal(accounts[2], await vestedPayment.owner.call());
    assert.equal(true, await vestedPayment.funded.call());

    // Go to start
    await increaseTimeTestRPCTo(startTime);

    tokensAvailable.should.be.bignumber
      .equal(await vestedPayment.getAvailableTokens.call());

    // Go to period 4 and claim 20 tokens
    await increaseTimeTestRPCTo(startTime+duration.days(120));

    tokensAvailable = tokensAvailable.plus(help.lif2LifWei(25));

    tokensAvailable.should.be.bignumber
      .equal(await vestedPayment.getAvailableTokens.call());

    await vestedPayment.claimTokens(help.lif2LifWei(20), {from: accounts[2]});
    tokensAvailable = tokensAvailable.minus(help.lif2LifWei(20));

    tokensAvailable.should.be.bignumber
      .equal(await vestedPayment.getAvailableTokens.call());

    // Go to period 10 and claim 10 tokens
    await increaseTimeTestRPCTo(startTime+duration.days(300));

    tokensAvailable = tokensAvailable.plus(help.lif2LifWei(30));

    tokensAvailable.should.be.bignumber
      .equal(await vestedPayment.getAvailableTokens.call());

    await vestedPayment.claimTokens(help.lif2LifWei(10), {from: accounts[2]});
    tokensAvailable = tokensAvailable.minus(help.lif2LifWei(10));

    tokensAvailable.should.be.bignumber
      .equal(await vestedPayment.getAvailableTokens.call());

    // Go to period 11 plus 90 days and claim teh remaining tokens
    await increaseTimeTestRPCTo(startTime+duration.days(320)+duration.days(90));

    tokensAvailable = tokensAvailable.plus(help.lif2LifWei(5));

    tokensAvailable.should.be.bignumber
      .equal(await vestedPayment.getAvailableTokens.call());

    await vestedPayment.claimTokens(tokensAvailable, {from: accounts[2]});

    help.lif2LifWei(60).should.be.bignumber
      .equal(await token.balanceOf(accounts[2]));

  });


  it(" should fail when try to claim tokens inside cliff periods", async function() {
    const startTime = latestTime() + duration.days(60);
    var vestedPayment = await VestedPayment.new(
      startTime, duration.days(30), 12, 4, token.address
    , {from: accounts[1]});
    var tokensAvailable = new BigNumber(0);

    await token.approve(vestedPayment.address, help.lif2LifWei(61), {from: accounts[1]});
    await vestedPayment.fund(help.lif2LifWei(60), {from: accounts[1]});
    await vestedPayment.transferOwnership(accounts[2], {from: accounts[1]});

    assert.equal(accounts[2], await vestedPayment.owner.call());
    assert.equal(true, await vestedPayment.funded.call());

    // Go to period 1
    await increaseTimeTestRPCTo(startTime+duration.days(30));

    try {
      await vestedPayment.claimTokens(help.lif2LifWei(5), {from: accounts[2]});
    } catch (error) {
      if (!help.isInvalidOpcodeEx(error)) throw error;
    }

  });

  it(" should fail when try to claim more tokens than the available", async function() {
    const startTime = latestTime() + duration.days(60);
    var vestedPayment = await VestedPayment.new(
      startTime, duration.days(30), 12, 0, token.address
    , {from: accounts[1]});
    var tokensAvailable = new BigNumber(0);

    await token.approve(vestedPayment.address, help.lif2LifWei(61), {from: accounts[1]});
    await vestedPayment.fund(help.lif2LifWei(60), {from: accounts[1]});
    await vestedPayment.transferOwnership(accounts[2], {from: accounts[1]});

    assert.equal(accounts[2], await vestedPayment.owner.call());
    assert.equal(true, await vestedPayment.funded.call());

    // Go to period 1
    await increaseTimeTestRPCTo(startTime+duration.days(30));

    try {
      await vestedPayment.claimTokens(help.lif2LifWei(15), {from: accounts[2]});
    } catch (error) {
      if (!help.isInvalidOpcodeEx(error)) throw error;
    }

  });

});
