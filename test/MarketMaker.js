var help = require("./helpers");
var commands = require("./commands");

var BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

var LifMarketMaker = artifacts.require("./LifMarketMaker.sol");
var LifToken = artifacts.require("./LifToken.sol");
var LifCrowdsale = artifacts.require("./LifCrowdsale.sol");

var latestTime = require('./helpers/latestTime');
var {increaseTimeTestRPC, increaseTimeTestRPCTo, duration} = require('./helpers/increaseTime');

const LOG_EVENTS = true;

contract('marketMaker', function(accounts) {

  var mm;
  var token;
  var eventsWatcher;

  it("Create 24 months MM", async function() {
    token = await help.simulateCrowdsale(100000000000, [40,30,20,10,0], accounts);
    await help.checkToken(token, accounts, 100, [40,30,20,10,0]);

    mm = await LifMarketMaker.new(
      token.address, web3.eth.blockNumber+10, 100, 24,
      accounts[1], {from: accounts[0]});

    await mm.fund({value: web3.toWei(8, 'ether'), from: accounts[0]});
    await mm.calculateDistributionPeriods({from: accounts[4]});

    help.debug('Total Token Supply:', help.lifWei2Lif(parseFloat(await token.totalSupply.call())));
    help.debug('MM balance:', parseInt( web3.eth.getBalance(mm.address) ));
    help.debug('Start block', parseInt( await mm.startBlock.call() ));
    help.debug('Blocks per period', parseInt( await mm.blocksPerPeriod.call() ));
    help.debug('Foundation address', await mm.foundationAddr.call() );
    help.debug('Initial Wei', parseInt( await mm.initialWei.call() ));
    help.debug('Initial Buy Price', parseInt( await mm.initialBuyPrice.call() ));

    // for (var i = 0; i < 24; i ++) { help.debug('Period', i, (await mm.marketMakerPeriods.call(i))); };

    let distributionDeltas = [
      0, 18, 99, 234, 416, 640,
      902, 1202, 1536, 1905, 2305, 2738,
      3201, 3693, 4215, 4766, 5345, 5951,
      6583, 7243, 7929, 8640, 9377, 10138
    ];

    for (var i = 0; i < distributionDeltas.length; i++) {
      assert.equal(distributionDeltas[i], parseInt((await mm.marketMakerPeriods.call(i))[0]))
    }

    // a few specific examples to double-check
    assert.equal( parseInt((await mm.marketMakerPeriods.call(0))[0]), 0 )
    assert.equal( parseInt((await mm.marketMakerPeriods.call(1))[0]), 18 )
    assert.equal( parseInt((await mm.marketMakerPeriods.call(9))[0]), 1905 )
    assert.equal( parseInt((await mm.marketMakerPeriods.call(15))[0]), 4766 )
    assert.equal( parseInt((await mm.marketMakerPeriods.call(16))[0]), 5345 )
    assert.equal( parseInt((await mm.marketMakerPeriods.call(23))[0]), 10138 )
  });

  it("Create 48 months MM", async function() {
    token = await help.simulateCrowdsale(100000000000, [40,30,20,10,0], accounts);
    mm = await LifMarketMaker.new(token.address, web3.eth.blockNumber+10, 100, 48,
      accounts[1], {from: accounts[0]});

    await mm.fund({value: web3.toWei(8, 'ether'), from: accounts[0]});
    await mm.calculateDistributionPeriods({from: accounts[4]});

    help.debug('Total Token Supply:', help.lifWei2Lif(parseFloat( await token.totalSupply.call())));
    help.debug('MM balance:', parseInt( web3.eth.getBalance(mm.address) ));
    help.debug('Start block', parseInt( await mm.startBlock.call() ));
    help.debug('Blocks per period', parseInt( await mm.blocksPerPeriod.call() ));
    help.debug('Foundation address', await mm.foundationAddr.call() );
    help.debug('Initial Wei', parseInt( await mm.initialWei.call() ));
    help.debug('Initial Buy Price', parseInt( await mm.initialBuyPrice.call() ));

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

    for (var i = 0; i < distributionDeltas.length; i++) {
      assert.equal(distributionDeltas[i], parseInt((await mm.marketMakerPeriods.call(i))[0]))
    }

    // just a few examples to double-check
    assert.equal(97, parseInt((await mm.marketMakerPeriods.call(5))[0]))
    assert.equal(416, parseInt((await mm.marketMakerPeriods.call(11))[0]))
    assert.equal(1425, parseInt((await mm.marketMakerPeriods.call(22))[0]))
    assert.equal(2746, parseInt((await mm.marketMakerPeriods.call(32))[0]))
    assert.equal(2898, parseInt((await mm.marketMakerPeriods.call(33))[0]))
    assert.equal(4595, parseInt((await mm.marketMakerPeriods.call(43))[0]))
    assert.equal(4782, parseInt((await mm.marketMakerPeriods.call(44))[0]))
    assert.equal(4972, parseInt((await mm.marketMakerPeriods.call(45))[0]))
    assert.equal(5166, parseInt((await mm.marketMakerPeriods.call(46))[0]))
    assert.equal(5363, parseInt((await mm.marketMakerPeriods.call(47))[0]))
  });

  it("should return correct periods using getCurrentPeriodIndex", async function() {
    token = await help.simulateCrowdsale(100000000000, [40,30,20,10,0], accounts);
    const startBlock = web3.eth.blockNumber+10;
    const blocksPerPeriod = 12;

    mm = await LifMarketMaker.new(token.address, startBlock, blocksPerPeriod, 24,
      accounts[1], {from: accounts[0]});

    await mm.fund({value: web3.toWei(8, 'ether'), from: accounts[0]});
    await mm.calculateDistributionPeriods({from: accounts[5]});

    help.debug('MM balance:', parseInt( web3.eth.getBalance(token.address) ));
    help.debug('Start block', parseInt( await mm.startBlock.call() ));
    help.debug('Blocks per period', parseInt( await mm.blocksPerPeriod.call() ));
    help.debug('Foundation address', await mm.foundationAddr.call() );
    assert.equal(0, parseInt(web3.eth.getBalance(token.address)) );
    assert.equal(startBlock, parseInt(await mm.startBlock.call()) );
    assert.equal(blocksPerPeriod, parseInt(await mm.blocksPerPeriod.call()) );
    assert.equal(accounts[1], parseInt(await mm.foundationAddr.call()) );

    await help.waitToBlock(startBlock);
    assert.equal(0, parseInt(await mm.getCurrentPeriodIndex.call()) );
    await help.waitToBlock(web3.eth.blockNumber+blocksPerPeriod)
    assert.equal(1, parseInt(await mm.getCurrentPeriodIndex()) );
    await help.waitToBlock(web3.eth.blockNumber+blocksPerPeriod)
    assert.equal(2, parseInt(await mm.getCurrentPeriodIndex()) );
    await help.waitToBlock(web3.eth.blockNumber+blocksPerPeriod)
    assert.equal(3, parseInt(await mm.getCurrentPeriodIndex()) );
    await help.waitToBlock(web3.eth.blockNumber+blocksPerPeriod)
    assert.equal(4, parseInt(await mm.getCurrentPeriodIndex()) );
  });

  it("should return correct periods after pausing/unpausing using getCurrentPeriodIndex", async function() {
    token = await help.simulateCrowdsale(100, [40,30,20,10,0], accounts);
    const startBlock = web3.eth.blockNumber+10;
    const blocksPerPeriod = 12;

    mm = await LifMarketMaker.new(token.address, startBlock, blocksPerPeriod, 24,
      accounts[1], {from: accounts[0]});

    await mm.fund({value: web3.toWei(8, 'ether'), from: accounts[0]});
    await mm.calculateDistributionPeriods({from: accounts[5]});

    assert.equal(0, parseInt(web3.eth.getBalance(token.address)));
    assert.equal(startBlock, parseInt(await mm.startBlock()));
    assert.equal(blocksPerPeriod, parseInt(await mm.blocksPerPeriod()));
    assert.equal(accounts[1], parseInt(await mm.foundationAddr()));

    await help.waitToBlock(startBlock);
    assert.equal(0, parseInt(await mm.getCurrentPeriodIndex()));
    await help.waitToBlock(web3.eth.blockNumber+blocksPerPeriod);
    assert.equal(1, parseInt(await mm.getCurrentPeriodIndex()));
    await mm.pause({from: accounts[0]});
    await help.waitToBlock(web3.eth.blockNumber+blocksPerPeriod*3);
    await mm.unpause({from: accounts[0]});
    assert.equal(1, parseInt(await mm.getCurrentPeriodIndex()));
    await help.waitToBlock(web3.eth.blockNumber+blocksPerPeriod);
    assert.equal(2, parseInt(await mm.getCurrentPeriodIndex()));
    await help.waitToBlock(web3.eth.blockNumber+blocksPerPeriod);
    assert.equal(3, parseInt(await mm.getCurrentPeriodIndex()));
    await mm.pause({from: accounts[0]});
    await help.waitToBlock(web3.eth.blockNumber+blocksPerPeriod*2);
    await mm.unpause({from: accounts[0]});
    await help.waitToBlock(web3.eth.blockNumber+blocksPerPeriod);
    assert.equal(4, parseInt(await mm.getCurrentPeriodIndex()));
  });

  const periods = 24;
  const tokenTotalSupply = 100;
  let customerAddressIndex = 1;

  var checkScenarioProperties = async function(data, mm, customer) {
    //help.debug("checking scenario", JSON.stringify(data));

    assert.equal(data.marketMakerMonth, await mm.getCurrentPeriodIndex());
    data.marketMakerEthBalance.should.be.bignumber.equal(web3.eth.getBalance(mm.address));
    data.marketMakerLifBalance.should.be.bignumber.equal(await token.balanceOf(mm.address));

    new BigNumber(web3.toWei(tokenTotalSupply, 'ether')).
      minus(data.marketMakerBurnedTokens).
      should.be.bignumber.equal(await token.totalSupply.call());
    data.marketMakerBurnedTokens.should.be.bignumber.equal(await mm.totalBurnedTokens.call());

    if (data.marketMakerMonth < periods) {
      data.marketMakerBuyPrice.should.be.bignumber.equal(await mm.getBuyPrice());
      assert.equal(data.claimablePercentage, parseInt(await mm.getAccumulatedDistributionPercentage()));
    }

    assert.equal(data.marketMakerMonth >= periods, await mm.isFinished());

    data.ethBalances[customerAddressIndex].should.be.bignumber.equal(web3.eth.getBalance(customer));
    data.balances[customerAddressIndex].should.be.bignumber.equal(await token.balanceOf(customer));

    data.marketMakerMaxClaimableWei.should.be.bignumber.equal(await mm.getMaxClaimableWeiAmount());

    data.marketMakerClaimedWei.should.be.bignumber.equal(await mm.totalWeiClaimed.call());
  };

  it("should go through scenario with some claims and sells on the Market Maker", async function() {
    // Create MM with balance of 200 ETH and 100 tokens in circulation,
    const priceFactor = 100000;

    token = await help.simulateCrowdsale(tokenTotalSupply, [tokenTotalSupply], accounts);

    let customer = accounts[customerAddressIndex];
    let startingMMBalance = new BigNumber(web3.toWei(200, 'ether'));
    const initialBuyPrice = startingMMBalance.dividedBy(help.lif2LifWei(tokenTotalSupply));

    let state = {
      marketMakerMonth: 0,
      marketMakerPeriods: periods,
      token: token,
      initialTokenSupply: help.lif2LifWei(tokenTotalSupply),
      marketMakerBurnedTokens: new BigNumber(0), // burned tokens in MM, via sendTokens txs
      burnedTokens: new BigNumber(0), // total burned tokens, in MM or not (for compat with gen-test state)
      returnedWeiForBurnedTokens: new BigNumber(0),
      marketMaker: mm,
      marketMakerEthBalance: startingMMBalance,
      marketMakerStartingBalance: startingMMBalance,
      marketMakerLifBalance: new BigNumber(0),
      ethBalances: {},
      balances: {},
      marketMakerBuyPrice: startingMMBalance.dividedBy(help.lif2LifWei(tokenTotalSupply)).mul(priceFactor),
      claimablePercentage: 0, marketMakerMaxClaimableWei: new BigNumber(0),
      marketMakerClaimedWei: new BigNumber(0)
    };
    state.ethBalances[customerAddressIndex] = web3.eth.getBalance(customer);
    state.balances[customerAddressIndex] = await token.balanceOf(customer);

    const startBlock = web3.eth.blockNumber + 10;
    const blocksPerPeriod = 15;

    const foundationWallet = accounts[9];

    mm = await LifMarketMaker.new(token.address, startBlock, blocksPerPeriod, periods,
      foundationWallet, {from: accounts[0]});

    state.marketMaker = mm;

    await mm.fund({value: state.marketMakerEthBalance, from: accounts[0]});
    await mm.calculateDistributionPeriods({from: accounts[0]});

    let distributionDeltas = [
      0, 18, 99, 234, 416, 640,
      902, 1202, 1536, 1905, 2305, 2738,
      3201, 3693, 4215, 4766, 5345, 5951,
      6583, 7243, 7929, 8640, 9377, 10138
    ];

    let getMaxClaimableWei = function(state) {
      if (state.marketMakerMonth >= periods) {
        help.debug("calculating maxClaimableEth with", startingMMBalance, state.marketMakerClaimedWei,
          state.returnedWeiForBurnedTokens);
        return startingMMBalance.
          minus(state.marketMakerClaimedWei).
          minus(state.returnedWeiForBurnedTokens);
      } else {
        const totalSupplyWei = web3.toWei(tokenTotalSupply, 'ether');
        const maxClaimable = startingMMBalance.
          mul(state.claimablePercentage).dividedBy(priceFactor).
          mul(totalSupplyWei - state.marketMakerBurnedTokens).
          dividedBy(totalSupplyWei).
          minus(state.marketMakerClaimedWei);
        return _.max([0, maxClaimable]);
      }
    }

    let waitForMonth = async function(month, startBlock, blocksPerPeriod) {
      await help.waitToBlock(startBlock+blocksPerPeriod*month, accounts);

      let period;

      if (month >= periods) {
        period = periods;
        state.claimablePercentage = priceFactor;
      } else {
        period = month;
        state.claimablePercentage = _.sumBy(_.take(distributionDeltas, period + 1), (x) => x);
      }

      help.debug("updating state on new month", month, "(period:", period, ")");
      state.marketMakerBuyPrice = startingMMBalance.
        mul(priceFactor - state.claimablePercentage).
        dividedBy(help.lif2LifWei(tokenTotalSupply));
      state.marketMakerMonth = month;
      state.marketMakerMaxClaimableWei = getMaxClaimableWei(state);

      await checkScenarioProperties(state, mm, customer);
    };

    // Month 0
    await waitForMonth(0, startBlock, blocksPerPeriod);

    let sendTokens = async (tokens) => {

      return await commands.commands.marketMakerSendTokens.run({
        tokens: tokens,
        from: customerAddressIndex
      }, state);

      await checkScenarioProperties(state, mm, customer);
    }

    let claimEth = async (eth) => {
      let weiToClaim = web3.toWei(new BigNumber(eth));
      help.debug('Claiming ', weiToClaim.toString(), 'wei (', eth, "eth)");
      await mm.claimEth(weiToClaim, {from: foundationWallet});

      state.marketMakerClaimedWei = state.marketMakerClaimedWei.plus(weiToClaim);
      state.marketMakerEthBalance = state.marketMakerEthBalance.minus(weiToClaim);
      state.marketMakerMaxClaimableWei = getMaxClaimableWei(state);

      await checkScenarioProperties(state, mm, customer);
    }

    // Sell 10 tokens to the MM
    await sendTokens(10);

    // Sell 20 tokens to the MM
    await sendTokens(20);

    // Month 1
    await waitForMonth(1, startBlock, blocksPerPeriod);

    // Sell 10 tokens to the MM
    await sendTokens(10);

    // try to claim more than the max claimable and it should fail
    let thrown;
    try {
      thrown = false;
      await claimEth(state.marketMakerMaxClaimableWei + 1);
    } catch(e) {
      thrown = true;
    }
    assert.equal(true, thrown, "claimEth should have thrown");

    try {
      thrown = false;
      await claimEth(0.03);
    } catch(e) {
      thrown = true;
    }
    assert.equal(true, thrown, "claimEth should have thrown");

    // Claim 0.012 eth
    await claimEth(0.012);

    // Month 2
    help.debug("heading to month 2");
    await waitForMonth(2, startBlock, blocksPerPeriod);

    // Sell 10 tokens to the MM
    await sendTokens(10);

    // Claim 18 ETH
    await claimEth(0.03);

    // Month 3
    await waitForMonth(3, startBlock, blocksPerPeriod);

    // Sell 40 tokens to the MM
    await sendTokens(40);

    await waitForMonth(12, startBlock, blocksPerPeriod);
    await waitForMonth(14, startBlock, blocksPerPeriod);
    await waitForMonth(15, startBlock, blocksPerPeriod);

    await claimEth(5);

    // Sell 10 tokens to the MM
    await sendTokens(10);

    new BigNumber(0).should.be.bignumber.equal(await token.totalSupply.call());

    await waitForMonth(25, startBlock, blocksPerPeriod);

    (await web3.eth.getBalance(mm.address)).should.be.bignumber.gt(web3.toWei(0.3, 'ether'));

    help.debug("claiming remaining eth");
    await claimEth(web3.fromWei(await web3.eth.getBalance(mm.address)));

    assert.equal(0, await web3.eth.getBalance(mm.address));
  });

});
