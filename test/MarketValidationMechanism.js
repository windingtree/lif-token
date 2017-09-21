var help = require('./helpers');
var commands = require('./commands');
require('lodash');

var BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

var LifMarketValidationMechanism = artifacts.require('./LifMarketValidationMechanism.sol');
var LifToken = artifacts.require('./LifToken.sol');

var {increaseTimeTestRPC, increaseTimeTestRPCTo, duration} = require('./helpers/increaseTime');

contract('Market validation Mechanism', function(accounts) {

  var mm;
  var token;
  var crowdsale;

  it('Create 24 months MM', async function() {
    const mmInitialBalance = 20000000;
    const totalTokenSupply = 100;
    const rate = totalTokenSupply / web3.fromWei(mmInitialBalance+10000000, 'ether');
    crowdsale = await help.simulateCrowdsale(rate, [totalTokenSupply], accounts, 1);
    token = LifToken.at( await crowdsale.token.call());
    mm = LifMarketValidationMechanism.at( await crowdsale.MVM.call());
    await mm.calculateDistributionPeriods({from: accounts[4]});

    assert.equal(mmInitialBalance, parseInt(await web3.eth.getBalance(mm.address)));
    assert.equal(mmInitialBalance, parseInt(await mm.initialWei.call()));
    assert.equal(24, parseInt(await mm.totalPeriods.call()));

    let distributionDeltas = [
      0, 18, 99, 234, 416, 640,
      902, 1202, 1536, 1905, 2305, 2738,
      3201, 3693, 4215, 4766, 5345, 5951,
      6583, 7243, 7929, 8640, 9377, 10138
    ];

    let accumDistribution = 0;

    for (var i = 0; i < distributionDeltas.length; i++) {
      accumDistribution += distributionDeltas[i];
      assert.equal(accumDistribution, parseInt((await mm.periods.call(i))));
    }

    // just a few examples to double-check
    assert.equal(1407, parseInt(await mm.periods.call(5)));
    assert.equal(78938, parseInt(await mm.periods.call(22)));

  });

  it('Create 48 months MM', async function() {
    const mmInitialBalance = 50000000;
    const totalTokenSupply = 100;
    const rate = totalTokenSupply / web3.fromWei(mmInitialBalance+10000000, 'ether');
    crowdsale = await help.simulateCrowdsale(rate, [totalTokenSupply], accounts, 1);
    token = LifToken.at( await crowdsale.token.call());
    mm = LifMarketValidationMechanism.at( await crowdsale.MVM.call());
    await mm.calculateDistributionPeriods({from: accounts[4]});

    assert.equal(mmInitialBalance, parseInt(await web3.eth.getBalance(mm.address)));
    assert.equal(mmInitialBalance, parseInt(await mm.initialWei.call()));
    assert.equal(48, parseInt(await mm.totalPeriods.call()));

    let distributionDeltas = [
      0, 3, 15, 36, 63, 97,
      137, 183, 233, 289, 350, 416,
      486, 561, 641, 724, 812, 904,
      1000, 1101, 1205, 1313, 1425, 1541,
      1660, 1783, 1910, 2041, 2175, 2312,
      2454, 2598, 2746, 2898, 3053, 3211,
      3373, 3537, 3706, 3877, 4052, 4229,
      4410, 4595, 4782, 4972, 5166, 5363
    ];

    let accumDistribution = 0;

    for (var i = 0; i < distributionDeltas.length; i++) {
      accumDistribution += distributionDeltas[i];
      assert.equal(accumDistribution, parseInt((await mm.periods.call(i))));
    }

    // just a few examples to double-check
    assert.equal(214, parseInt(await mm.periods.call(5)));
    assert.equal(11994, parseInt(await mm.periods.call(22)));
    assert.equal(94438, parseInt(await mm.periods.call(47)));
  });

  it('should return correct periods using getCurrentPeriodIndex', async function() {
    const mmInitialBalance = 20000000;
    const totalTokenSupply = 100;
    const rate = totalTokenSupply / web3.fromWei(mmInitialBalance+10000000, 'ether');
    crowdsale = await help.simulateCrowdsale(rate, [totalTokenSupply], accounts, 1);
    token = LifToken.at( await crowdsale.token.call());
    mm = LifMarketValidationMechanism.at( await crowdsale.MVM.call());
    await mm.calculateDistributionPeriods({from: accounts[4]});

    assert.equal(24, parseInt(await mm.totalPeriods.call()));

    const startTimestamp = parseInt(await mm.startTimestamp.call());

    await increaseTimeTestRPCTo(startTimestamp);
    assert.equal(0, parseInt(await mm.getCurrentPeriodIndex.call()) );
    await increaseTimeTestRPC(duration.days(30));
    assert.equal(1, parseInt(await mm.getCurrentPeriodIndex()) );
    await increaseTimeTestRPC(duration.days(30));
    assert.equal(2, parseInt(await mm.getCurrentPeriodIndex()) );
    await increaseTimeTestRPC(duration.days(30));
    assert.equal(3, parseInt(await mm.getCurrentPeriodIndex()) );
    await increaseTimeTestRPC(duration.days(30));
    assert.equal(4, parseInt(await mm.getCurrentPeriodIndex()) );
  });

  it('should return correct periods after pausing/unpausing using getCurrentPeriodIndex', async function() {
    const mmInitialBalance = 20000000;
    const totalTokenSupply = 100;
    const rate = totalTokenSupply / web3.fromWei(mmInitialBalance+10000000, 'ether');
    crowdsale = await help.simulateCrowdsale(rate, [totalTokenSupply], accounts, 1);
    token = LifToken.at( await crowdsale.token.call());
    mm = LifMarketValidationMechanism.at( await crowdsale.MVM.call());
    await mm.calculateDistributionPeriods({from: accounts[4]});

    assert.equal(24, parseInt(await mm.totalPeriods.call()));

    const startTimestamp = parseInt(await mm.startTimestamp.call());

    await increaseTimeTestRPCTo(startTimestamp);
    assert.equal(0, parseInt(await mm.getCurrentPeriodIndex()));
    await increaseTimeTestRPCTo(startTimestamp+duration.days(30));
    assert.equal(1, parseInt(await mm.getCurrentPeriodIndex()));
    await mm.pause({from: accounts[0]});
    await increaseTimeTestRPC(duration.days(30)*3);
    await mm.unpause({from: accounts[0]});
    assert.equal(1, parseInt(await mm.getCurrentPeriodIndex()));
    await increaseTimeTestRPC(duration.days(30));
    assert.equal(2, parseInt(await mm.getCurrentPeriodIndex()));
    await increaseTimeTestRPC(duration.days(30));
    assert.equal(3, parseInt(await mm.getCurrentPeriodIndex()));
    await mm.pause({from: accounts[0]});
    await increaseTimeTestRPC(duration.days(30)*2);
    await mm.unpause({from: accounts[0]});
    await increaseTimeTestRPC(duration.days(30));
    assert.equal(4, parseInt(await mm.getCurrentPeriodIndex()));
  });

  const periods = 24;
  const tokenTotalSupply = 3000;
  let customerAddressIndex = 1;

  var checkScenarioProperties = async function(data, mm, customer) {
    // help.debug('checking scenario', data);

    assert.equal(data.MVMMonth, await mm.getCurrentPeriodIndex());
    data.MVMEthBalance.should.be.bignumber.equal(web3.eth.getBalance(mm.address));
    data.MVMLifBalance.should.be.bignumber.equal(await token.balanceOf(mm.address));

    new BigNumber(web3.toWei(tokenTotalSupply, 'ether')).
      minus(data.MVMBurnedTokens).
      should.be.bignumber.equal(await token.totalSupply.call());
    data.MVMBurnedTokens.should.be.bignumber.equal(await mm.totalBurnedTokens.call());

    if (data.MVMMonth < data.MVMPeriods) {
      data.MVMBuyPrice.should.be.bignumber.equal(await mm.getBuyPrice());
      assert.equal(data.claimablePercentage, parseInt(await mm.getAccumulatedDistributionPercentage()));
    }

    assert.equal(data.MVMMonth >= data.MVMPeriods, await mm.isFinished());

    data.ethBalances[customerAddressIndex].should.be.bignumber.equal(web3.eth.getBalance(customer));
    data.balances[customerAddressIndex].should.be.bignumber.equal(await token.balanceOf(customer));

    data.MVMMaxClaimableWei.should.be.bignumber.equal(await mm.getMaxClaimableWeiAmount());

    data.MVMClaimedWei.should.be.bignumber.equal(await mm.totalWeiClaimed.call());
  };

  it('should go through scenario with some claims and sells on the Market Maker', async function() {
    // Create MM with balance of 200 ETH and 100 tokens in circulation,
    const priceFactor = 100000;

    const startingMMBalance = new BigNumber(web3.toWei(200, 'ether'));
    const weiPerUSD = parseInt(web3.toWei(200/20000000, 'ether'));
    const tokensInCrowdsale = new BigNumber(tokenTotalSupply).mul(0.8).floor();
    const rate = tokensInCrowdsale / web3.fromWei(startingMMBalance.plus(web3.toWei(100, 'ether')), 'ether');

    const foundationWallet = accounts[0];

    crowdsale = await help.simulateCrowdsale(rate, [tokensInCrowdsale], accounts, weiPerUSD);
    token = LifToken.at( await crowdsale.token.call());
    mm = LifMarketValidationMechanism.at( await crowdsale.MVM.call());
    await mm.calculateDistributionPeriods({from: accounts[4]});
    let customer = accounts[customerAddressIndex];
    const initialBuyPrice = startingMMBalance.mul(priceFactor).dividedBy(help.lif2LifWei(tokenTotalSupply)).floor();

    help.lif2LifWei(tokenTotalSupply).should.be.bignumber.equal(await token.totalSupply());
    startingMMBalance.should.be.bignumber.equal(await mm.initialWei());
    initialBuyPrice.should.be.bignumber.equal(await mm.initialBuyPrice());

    const startTimestamp = parseInt(await mm.startTimestamp.call());

    let state = {
      MVMMonth: 0,
      MVMPeriods: periods,
      MVMStartTimestamp: startTimestamp,
      MVMInitialBuyPrice: initialBuyPrice,
      token: token,
      initialTokenSupply: help.lif2LifWei(tokenTotalSupply),
      crowdsaleData: {
        foundationWallet: foundationWallet
      },
      MVMBurnedTokens: new BigNumber(0), // burned tokens in MM, via sendTokens txs
      burnedTokens: new BigNumber(0), // total burned tokens, in MM or not (for compat with gen-test state)
      returnedWeiForBurnedTokens: new BigNumber(0),
      MVM: mm,
      MVMEthBalance: startingMMBalance,
      MVMStartingBalance: startingMMBalance,
      MVMLifBalance: new BigNumber(0),
      ethBalances: {},
      balances: {},
      totalSupply: new BigNumber(0),
      initialBuyPrice: initialBuyPrice,
      MVMBuyPrice: initialBuyPrice,
      claimablePercentage: 0, MVMMaxClaimableWei: new BigNumber(0),
      MVMClaimedWei: new BigNumber(0)
    };
    state.ethBalances[customerAddressIndex] = web3.eth.getBalance(customer);
    state.balances[customerAddressIndex] = await token.balanceOf(customer);

    assert.equal(foundationWallet, await mm.owner());

    state.MVM = mm;

    let waitForMonth = async function(month) {
      await commands.commands.MVMWaitForMonth.run({
        month: month
      }, state);

      await checkScenarioProperties(state, mm, customer);
    };

    // Month 0
    await waitForMonth(0);

    let sendTokens = async (tokens) => {
      await commands.commands.MVMSendTokens.run({
        tokens: tokens,
        from: customerAddressIndex
      }, state);
      await checkScenarioProperties(state, mm, customer);
    };

    let claimEth = async (eth) => {

      await commands.commands.MVMClaimEth.run({
        eth: eth
      }, state);

      await checkScenarioProperties(state, mm, customer);
    };

    // Sell 240 tokens to the MM
    await sendTokens(240);

    // Sell 480 tokens to the MM
    await sendTokens(480);

    // Month 1
    await waitForMonth(1);

    // Sell 240 tokens to the MM
    await sendTokens(240);

    let claimedWeiBeforeClaiming = state.MVMClaimedWei,
      maxClaimableBeforeClaiming = state.MVMMaxClaimableWei;
    assert(maxClaimableBeforeClaiming.gt(0));

    // try to claim more than the max claimable and it should fail
    await claimEth(web3.fromWei(state.MVMMaxClaimableWei + 1));
    assert.equal(claimedWeiBeforeClaiming, state.MVMClaimedWei,
      'claimEth should have failed so claimedWei should have stayed the same');

    // Claim all ether
    await claimEth(web3.fromWei(state.MVMMaxClaimableWei));

    state.MVMClaimedWei.should.be.bignumber.
      equal(claimedWeiBeforeClaiming.plus(maxClaimableBeforeClaiming));

    // Month 2
    await waitForMonth(2);

    // Sell 240 tokens to the MM
    await sendTokens(240);

    // Claim 18 ETH
    await claimEth(0.03);

    // Month 3
    await waitForMonth(3);

    // Sell 960 tokens to the MM
    await sendTokens(960);

    await waitForMonth(12);
    await waitForMonth(14);
    await waitForMonth(15);

    await claimEth(5);

    // Sell 240 tokens to the MM
    await sendTokens(240);

    new BigNumber(help.lif2LifWei(tokenTotalSupply)).minus(help.lif2LifWei(tokensInCrowdsale))
      .should.be.bignumber.equal(await token.totalSupply.call());

    await waitForMonth(25);

    (await web3.eth.getBalance(mm.address)).should.be.bignumber.gt(web3.toWei(0.3, 'ether'));

    help.debug('claiming remaining eth');
    await claimEth(web3.fromWei(await web3.eth.getBalance(mm.address)));

    assert.equal(0, await web3.eth.getBalance(mm.address));
  });

});
