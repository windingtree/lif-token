var LifCrowdsale = artifacts.require('./LifCrowdsale.sol');

let help = require('./helpers');

var latestTime = require('./helpers/latestTime');
var {duration,increaseTimeTestRPCTo} = require('./helpers/increaseTime');

const defaultStart = latestTime() + duration.days(1);
const defaults = {
  start: defaultStart,
  end1: defaultStart + duration.days(1),
  end2: defaultStart + duration.days(2),
  rate1: 100,
  rate2: 110,
  setWeiLockSeconds: duration.minutes(30),
  foundationWalletIndex: 0,
  foundersWalletIndex: 1
};

contract('LifToken Crowdsale', function(accounts) {

  async function createCrowdsale(params) {
    const startTimestamp = params.start === undefined ? defaults.start : params.start,
      end1Timestamp = params.end1 === undefined ? defaults.end1 : params.end1,
      end2Timestamp = params.end2 === undefined ? defaults.end2 : params.end2,
      rate1 = params.rate1 === undefined ? defaults.rate1 : params.rate1,
      rate2 = params.rate2 === undefined ? defaults.rate2 : params.rate2,
      setWeiLockSeconds = params.setWeiLockSeconds === undefined ? defaults.setWeiLockSeconds : params.setWeiLockSeconds,
      foundationWallet = params.foundationWallet === undefined ?
        accounts[defaults.foundationWalletIndex] : params.foundationWallet,
      foundersWallet = params.foundersWallet === undefined ?
        accounts[defaults.foundersWalletIndex] : params.foundersWallet;

    return await LifCrowdsale.new(
      startTimestamp, end1Timestamp, end2Timestamp, rate1,
      rate2, setWeiLockSeconds, foundationWallet, foundersWallet
    );

  }

  it('can create a Crowdsale', async function() {
    const crowdsale = await createCrowdsale({});

    assert.equal(defaults.start, parseInt(await crowdsale.startTimestamp.call()));
    assert.equal(defaults.end1, parseInt(await crowdsale.end1Timestamp.call()));
    assert.equal(defaults.end2, parseInt(await crowdsale.end2Timestamp.call()));
    assert.equal(defaults.rate1, parseInt(await crowdsale.rate1.call()));
    assert.equal(defaults.rate2, parseInt(await crowdsale.rate2.call()));
    assert.equal(accounts[defaults.foundationWalletIndex], parseInt(await crowdsale.foundationWallet.call()));
    assert.equal(accounts[defaults.foundersWalletIndex], parseInt(await crowdsale.foundersWallet.call()));
  });

  it('fails to create a Crowdsale with 0x0 as foundation wallet', async function() {
    try {
      await createCrowdsale({foundationWallet: help.zeroAddress});
      assert(false, 'create crowdsale should have thrown');
    } catch(e) {
      if (!help.isInvalidOpcodeEx(e)) throw e;
    }
  });

  it('fails to create a Crowdsale with 0x0 as founders wallet', async function() {
    try {
      await createCrowdsale({foundersWallet: help.zeroAddress});
      assert(false, 'create crowdsale should have thrown');
    } catch(e) {
      if (!help.isInvalidOpcodeEx(e)) throw e;
    }
  });

  it('fails to create a Crowdsale with start timestamp in the past', async function() {
    try {
      await createCrowdsale({start: latestTime() - 1});
      assert(false, 'create crowdsale should have thrown');
    } catch(e) {
      if (!help.isInvalidOpcodeEx(e)) throw e;
    }
  });

  it('fails to create a Crowdsale with end timestamp not after start timestamp', async function() {
    try {
      await createCrowdsale({end1: defaults.start});
      assert(false, 'create crowdsale should have thrown');
    } catch(e) {
      if (!help.isInvalidOpcodeEx(e)) throw e;
    }
  });

  it('fails to create a Crowdsale with end2 timestamp not after end1 timestamp', async function() {
    try {
      await createCrowdsale({end2: defaults.end1});
      assert(false, 'create crowdsale should have thrown');
    } catch(e) {
      if (!help.isInvalidOpcodeEx(e)) throw e;
    }
  });

  it('fails to create a Crowdsale with rate1 == 0', async function() {
    try {
      await createCrowdsale({rate1: 0});
      assert(false, 'create crowdsale should have thrown');
    } catch(e) {
      if (!help.isInvalidOpcodeEx(e)) throw e;
    }
  });

  it('fails to create a Crowdsale with rate2 == 0', async function() {
    try {
      await createCrowdsale({rate2: 0});
      assert(false, 'create crowdsale should have thrown');
    } catch(e) {
      if (!help.isInvalidOpcodeEx(e)) throw e;
    }
  });

  it('fails to create a Crowdsale with setWeiLockSeconds == 0', async function() {
    try {
      await createCrowdsale({setWeiLockSeconds: 0});
      assert(false, 'create crowdsale should have thrown');
    } catch(e) {
      if (!help.isInvalidOpcodeEx(e)) throw e;
    }
  });

  it('returns the current rate at different points in time', async function() {
    const crowdsale = await createCrowdsale({});

    assert.equal(0, parseInt(await crowdsale.getRate()));

    await increaseTimeTestRPCTo(defaults.start);

    assert.equal(defaults.rate1, parseInt(await crowdsale.getRate()));

    await increaseTimeTestRPCTo(defaults.end1 - 2);
    assert.equal(defaults.rate1, parseInt(await crowdsale.getRate()),
      'rate should still be rate1 close but before end1 timestamp');

    await increaseTimeTestRPCTo(defaults.end1 + 1);
    assert.equal(defaults.rate2, parseInt(await crowdsale.getRate()),
      'rate should be rate 2 between end1 and end2');

    await increaseTimeTestRPCTo(defaults.end2 - 2);
    assert.equal(defaults.rate2, parseInt(await crowdsale.getRate()),
      'rate should be rate 2 close but before end2 timestamp');

    await increaseTimeTestRPCTo(defaults.end2 + 1);
    assert.equal(0, parseInt(await crowdsale.getRate()),
      'rate should be 0 after end2 timestamp');
  });
});
