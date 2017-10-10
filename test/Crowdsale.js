var LifCrowdsale = artifacts.require('./LifCrowdsale.sol'),
  LifToken = artifacts.require('./LifToken.sol');

let help = require('./helpers');

var BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

var latestTime = require('./helpers/latestTime');
var {duration,increaseTimeTestRPCTo} = require('./helpers/increaseTime');

const defaultTimeDelta = duration.days(1); // time delta used in time calculations (for start, end1 & end2)

const defaults = {
  rate1: 100,
  rate2: 110,
  setWeiLockSeconds: duration.minutes(30),
  foundationWalletIndex: 0,
  foundersWalletIndex: 1
};

contract('LifToken Crowdsale', function(accounts) {

  async function createCrowdsale(params) {
    const startTimestamp = params.start === undefined ? (latestTime() + defaultTimeDelta) : params.start,
      end1Timestamp = params.end1 === undefined ? (startTimestamp + defaultTimeDelta) : params.end1,
      end2Timestamp = params.end2 === undefined ? (end1Timestamp + defaultTimeDelta) : params.end2,
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
    const start = latestTime() + defaultTimeDelta,
      end1 = start + defaultTimeDelta,
      end2 = end1 + defaultTimeDelta;

    const crowdsale = await createCrowdsale({
      start: start,
      end1: end1,
      end2: end2
    });

    assert.equal(start, parseInt(await crowdsale.startTimestamp.call()));
    assert.equal(end1, parseInt(await crowdsale.end1Timestamp.call()));
    assert.equal(end2, parseInt(await crowdsale.end2Timestamp.call()));
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
      const start = latestTime() + defaultTimeDelta;
      await createCrowdsale({start: start, end1: start});
      assert(false, 'create crowdsale should have thrown');
    } catch(e) {
      if (!help.isInvalidOpcodeEx(e)) throw e;
    }
  });

  it('fails to create a Crowdsale with end2 timestamp not after end1 timestamp', async function() {
    const start = latestTime() + defaultTimeDelta,
      end1 = start + defaultTimeDelta;

    try {
      await createCrowdsale({start: start, end1: end1, end2: end1});
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
    const start = latestTime() + defaultTimeDelta,
      end1 = start + defaultTimeDelta,
      end2 = end1 + defaultTimeDelta,
      crowdsale = await createCrowdsale({
        start: start,
        end1: end1,
        end2: end2
      });

    assert.equal(0, parseInt(await crowdsale.getRate()));

    await increaseTimeTestRPCTo(start);

    assert.equal(defaults.rate1, parseInt(await crowdsale.getRate()));

    await increaseTimeTestRPCTo(end1 - 2);
    assert.equal(defaults.rate1, parseInt(await crowdsale.getRate()),
      'rate should still be rate1 close but before end1 timestamp');

    await increaseTimeTestRPCTo(end1 + 1);
    assert.equal(defaults.rate2, parseInt(await crowdsale.getRate()),
      'rate should be rate 2 between end1 and end2');

    await increaseTimeTestRPCTo(end2 - 2);
    assert.equal(defaults.rate2, parseInt(await crowdsale.getRate()),
      'rate should be rate 2 close but before end2 timestamp');

    await increaseTimeTestRPCTo(end2 + 1);
    assert.equal(0, parseInt(await crowdsale.getRate()),
      'rate should be 0 after end2 timestamp');
  });

  /// buyTokens

  it('handles a buyTokens tx fine', async function() {
    const crowdsale = await createCrowdsale({});
    await crowdsale.setWeiPerUSDinTGE(10000);
    await increaseTimeTestRPCTo(latestTime() + defaultTimeDelta + 2);
    await crowdsale.buyTokens(accounts[6], {value: 1000, from: accounts[5]});

    assert.equal(1000, await crowdsale.purchases(accounts[6]));
  });

  it('fails on buyTokens from address(0)', async function() {
    const crowdsale = await createCrowdsale({});
    await crowdsale.setWeiPerUSDinTGE(10000);
    await increaseTimeTestRPCTo(latestTime() + defaultTimeDelta + 2);
    try {
      await crowdsale.buyTokens(help.zeroAddress, {value: 1000, from: accounts[5]});
      assert(false, 'should have thrown');
    } catch(e) {
      assert(help.isInvalidOpcodeEx(e));
    }
  });

  it('fails on buyTokens with rate==0 (before startTimestamp)', async function() {
    const crowdsale = await createCrowdsale({});
    await crowdsale.setWeiPerUSDinTGE(10000);
    try {
      await crowdsale.buyTokens(accounts[5], {value: 1000, from: accounts[5]});
      assert(false, 'should have thrown');
    } catch(e) {
      assert(help.isInvalidOpcodeEx(e));
    }
  });

  /// addPrivatePresaleTokens
  it('handles an addPrivatePresaleTokens tx fine', async function() {
    const crowdsale = await createCrowdsale({}),
      rate = defaults.rate1 + 10,
      token = LifToken.at(await crowdsale.token());

    await crowdsale.setWeiPerUSDinTGE(10000);
    await crowdsale.addPrivatePresaleTokens(accounts[3], 1000, rate,
      {from: accounts[0]});

    assert.equal(1000 * rate, parseInt(await token.balanceOf(accounts[3])),
      'should mint the tokens to beneficiary on addPrivatePresaleTokens');
  });

  it('fails on a addPrivatePresaleTokens tx with address(0) as benef.', async function() {
    const crowdsale = await createCrowdsale({}),
      rate = defaults.rate1 + 10;

    await crowdsale.setWeiPerUSDinTGE(10000);
    try {
      await crowdsale.addPrivatePresaleTokens(help.zeroAddress, 1000, rate,
        {from: accounts[0]});
      assert(false);
    } catch(e) {
      assert(help.isInvalidOpcodeEx(e));
    }
  });

  it('fails on a addPrivatePresaleTokens tx with low rate', async function() {
    const crowdsale = await createCrowdsale({}),
      rate = defaults.rate1 - 10;

    await crowdsale.setWeiPerUSDinTGE(10000);
    try {
      await crowdsale.addPrivatePresaleTokens(accounts[3], 1000, rate,
        {from: accounts[0]});
      assert(false);
    } catch(e) {
      assert(help.isInvalidOpcodeEx(e));
    }
  });

  it('fails on a addPrivatePresaleTokens tx with weiSent == 0', async function() {
    const crowdsale = await createCrowdsale({}),
      rate = defaults.rate1 + 10;

    await crowdsale.setWeiPerUSDinTGE(10000);
    try {
      await crowdsale.addPrivatePresaleTokens(accounts[3], 0, rate,
        {from: accounts[0]});
      assert(false);
    } catch(e) {
      assert(help.isInvalidOpcodeEx(e));
    }
  });

  /// claimEth
  it('claimEth succeeds after an underfunded finalized crowdsale', async function() {
    const start = latestTime() + defaultTimeDelta,
      end1 = start + defaultTimeDelta,
      end2 = end1 + defaultTimeDelta,
      beneficiary = accounts[6],
      crowdsale = await createCrowdsale({
        start: start,
        end1: end1,
        end2: end2
      }),
      weiPerUsd = 10000,
      weiAmount = 5000000 * weiPerUsd - 1; // exactly USD 1 less than the funding limit

    await crowdsale.setWeiPerUSDinTGE(weiPerUsd);
    await increaseTimeTestRPCTo(start + 2);
    await crowdsale.buyTokens(beneficiary, {value: weiAmount, from: accounts[5]});

    await increaseTimeTestRPCTo(end2 + 2);
    await crowdsale.finalize();

    const balanceBeforeClaim = web3.eth.getBalance(beneficiary);

    const tx = await crowdsale.claimEth({from: beneficiary});

    balanceBeforeClaim.plus(weiAmount).minus(help.txGasCost(tx)).
      should.be.bignumber.equal(web3.eth.getBalance(beneficiary));
  });

  it('claimEth fails after a funded finalized crowdsale', async function() {
    const start = latestTime() + defaultTimeDelta,
      end1 = start + defaultTimeDelta,
      end2 = end1 + defaultTimeDelta,
      crowdsale = await createCrowdsale({
        start: start,
        end1: end1,
        end2: end2
      }),
      weiPerUsd = 10000,
      weiAmount = 5000000 * weiPerUsd;
    await crowdsale.setWeiPerUSDinTGE(weiPerUsd);
    await increaseTimeTestRPCTo(start + 2);
    await crowdsale.buyTokens(accounts[6], {value: weiAmount, from: accounts[5]});

    await increaseTimeTestRPCTo(end2 + 2);
    await crowdsale.finalize();

    try {
      await crowdsale.claimEth({from: accounts[6]});
      assert(false, 'should have thrown');
    } catch(e) {
      assert(help.isInvalidOpcodeEx(e));
    }
  });

  it('claimEth fails after an underfunded non-finalized (but ended) crowdsale ', async function() {
    const start = latestTime() + defaultTimeDelta,
      end1 = start + defaultTimeDelta,
      end2 = end1 + defaultTimeDelta,
      beneficiary = accounts[6],
      crowdsale = await createCrowdsale({
        start: start,
        end1: end1,
        end2: end2
      }),
      weiPerUsd = 10000,
      weiAmount = 5000000 * weiPerUsd - 1;
    await crowdsale.setWeiPerUSDinTGE(weiPerUsd);
    await increaseTimeTestRPCTo(start + 2);
    await crowdsale.buyTokens(beneficiary, {value: weiAmount, from: accounts[5]});

    await increaseTimeTestRPCTo(end2 + 2);

    try {
      await crowdsale.claimEth({from: beneficiary});
      assert(false, 'should have thrown');
    } catch(e) {
      assert(help.isInvalidOpcodeEx(e));
    }
  });

  it('claimEth fails after an underfunded finalized crowdsale for an address with no purchases', async function() {
    const start = latestTime() + defaultTimeDelta,
      end1 = start + defaultTimeDelta,
      end2 = end1 + defaultTimeDelta,
      beneficiary = accounts[6],
      crowdsale = await createCrowdsale({
        start: start,
        end1: end1,
        end2: end2
      }),
      weiPerUsd = 10000,
      weiAmount = 5000000 * weiPerUsd - 1; // exactly USD 1 less than the funding limit

    await crowdsale.setWeiPerUSDinTGE(weiPerUsd);
    await increaseTimeTestRPCTo(start + 2);
    await crowdsale.buyTokens(beneficiary, {value: weiAmount, from: accounts[5]});

    await increaseTimeTestRPCTo(end2 + 2);
    await crowdsale.finalize();

    try {
      await crowdsale.claimEth({from: accounts[8]});
      assert(false, 'should have thrown');
    } catch(e) {
      assert(help.isInvalidOpcodeEx(e));
    }
  });

  /// finalize
  it('finalize fails when called for the second time', async function() {
    const start = latestTime() + defaultTimeDelta,
      end1 = start + defaultTimeDelta,
      end2 = end1 + defaultTimeDelta,
      beneficiary = accounts[6],
      crowdsale = await createCrowdsale({
        start: start,
        end1: end1,
        end2: end2
      }),
      weiPerUsd = 10000,
      weiAmount = 5000000 * weiPerUsd - 1; // exactly USD 1 less than the funding limit

    await crowdsale.setWeiPerUSDinTGE(weiPerUsd);
    await increaseTimeTestRPCTo(start + 2);
    await crowdsale.buyTokens(beneficiary, {value: weiAmount, from: accounts[5]});

    await increaseTimeTestRPCTo(end2 + 2);
    await crowdsale.finalize();

    try {
      await crowdsale.finalize();
      assert(false, 'should have thrown');
    } catch(e) {
      assert(help.isInvalidOpcodeEx(e));
    }
  });

});
