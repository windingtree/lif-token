var LifCrowdsale = artifacts.require('./LifCrowdsale.sol');

let help = require('./helpers');

var latestTime = require('./helpers/latestTime');
var {duration} = require('./helpers/increaseTime');

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
    const startTimestamp = latestTime() + duration.days(1),
      end1Timestamp = startTimestamp + duration.days(1),
      end2Timestamp = startTimestamp + duration.days(2);

    try {
      await LifCrowdsale.new(
        startTimestamp, end1Timestamp, end2Timestamp,
        100, 110, duration.minutes(30), help.zeroAddress, accounts[1]
      );
      assert(false, 'create crowdsale should have thrown');
    } catch(e) {
      if (!help.isInvalidOpcodeEx(e)) throw e;
    }
  });
});
