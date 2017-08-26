var help = require("./helpers");

var BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

var LifMarketMaker = artifacts.require("./LifMarketMaker.sol");
var LifToken = artifacts.require("./LifToken.sol");
var LifCrowdsale = artifacts.require("./LifCrowdsale.sol");

const LOG_EVENTS = true;

const gasPrice = new BigNumber(100000000000);

contract('marketMaker', function(accounts) {

  var mm;
  var token;
  var eventsWatcher;

  var simulateCrowdsale = async function(rate, balances, accounts) {
    var startBlock = web3.eth.blockNumber;
    var endBlock = web3.eth.blockNumber+11;
    var crowdsale = await LifCrowdsale.new(
      startBlock+1, startBlock+2,
      startBlock+3, startBlock+10, endBlock,
      rate-1, rate, rate+10, rate+20,
      accounts[0], accounts[1], 1, 1
    );
    await help.waitToBlock(startBlock+3, accounts);
    for(i = 0; i < 5; i++) {
      if (balances[i] > 0)
        await crowdsale.sendTransaction({ value: web3.toWei(balances[i]/rate, 'ether'), from: accounts[i + 1]});
    }
    await help.waitToBlock(endBlock+1, accounts);
    await crowdsale.finalize();
    return LifToken.at( await crowdsale.token() );
  };

  it("Create 24 months MM", async function() {
    token = await simulateCrowdsale(100, [40,30,20,10,0], accounts);
    await help.checkToken(token, accounts, 100, [40,30,20,10,0]);

    mm = await LifMarketMaker.new(
      token.address, web3.eth.blockNumber+10, 100, 24,
      accounts[1], 100500, {from: accounts[0]});

    await mm.fund({value: web3.toWei(8, 'ether'), from: accounts[0]});
    await mm.calculateDistributionPeriods({from: accounts[4]});
    await mm.calculateSellPricePeriods({from: accounts[3]});

    help.debug('Total Token Supply:', help.lifWei2Lif(parseFloat( await token.totalSupply())));
    help.debug('MM balance:', parseInt( web3.eth.getBalance(mm.address) ));
    help.debug('Start block', parseInt( await mm.startBlock.call() ));
    help.debug('Blocks per period', parseInt( await mm.blocksPerPeriod.call() ));
    help.debug('Foundation address', await mm.foundationAddr.call() );
    help.debug('Initial Wei', parseInt( await mm.initialWei.call() ));
    help.debug('Initial Buy Price', parseInt( await mm.initialBuyPrice.call() ));
    help.debug('Initial Sell Price', parseInt( await mm.initialSellPrice.call() ));

    // for (var i = 0; i < 24; i ++) { help.debug('Period', i, (await mm.marketMakerPeriods.call(i))); };

    let distributionDeltas = [
      0, 18, 99, 234, 416, 640,
      902, 1202, 1536, 1905, 2305, 2738,
      3201, 3693, 4215, 4766, 5345, 5951,
      6583, 7243, 7929, 8640, 9377, 10138
    ];

    let accumIncrementPrice = [
      100000, 101000, 102010, 103030, 104060, 105100,
      106151, 107212, 108284, 109366, 110459, 111563,
      112678, 113804, 114942, 116091, 117251, 118423,
      119607, 120803, 122011, 123231, 124463, 125707
    ];

    for (var i = 0; i < distributionDeltas.length; i++) {
      assert.equal(distributionDeltas[i], parseInt((await mm.marketMakerPeriods.call(i))[2]))

      console.log( parseInt((await mm.marketMakerPeriods.call(i))[4]) );
      assert.equal(accumIncrementPrice[i], parseInt((await mm.marketMakerPeriods.call(i))[4]))
    }

    // a few specific examples to double-check
    assert.equal( parseInt((await mm.marketMakerPeriods.call(0))[2]), 0 )
    assert.equal( parseInt((await mm.marketMakerPeriods.call(1))[2]), 18 )
    assert.equal( parseInt((await mm.marketMakerPeriods.call(9))[2]), 1905 )
    assert.equal( parseInt((await mm.marketMakerPeriods.call(15))[2]), 4766 )
    assert.equal( parseInt((await mm.marketMakerPeriods.call(16))[2]), 5345 )
    assert.equal( parseInt((await mm.marketMakerPeriods.call(23))[2]), 10138 )
  });

  it("Create 48 months MM", async function() {
    token = await simulateCrowdsale(100, [40,30,20,10,0], accounts);
    mm = await LifMarketMaker.new(token.address, web3.eth.blockNumber+10, 100, 48,
      accounts[1], 100500, {from: accounts[0]});

    await mm.fund({value: web3.toWei(8, 'ether'), from: accounts[0]});
    await mm.calculateDistributionPeriods({from: accounts[4]});
    await mm.calculateSellPricePeriods({from: accounts[3]});

    help.debug('Total Token Supply:', help.lifWei2Lif(parseFloat( await token.totalSupply())));
    help.debug('MM balance:', parseInt( web3.eth.getBalance(mm.address) ));
    help.debug('Start block', parseInt( await mm.startBlock.call() ));
    help.debug('Blocks per period', parseInt( await mm.blocksPerPeriod.call() ));
    help.debug('Foundation address', await mm.foundationAddr.call() );
    help.debug('Initial Wei', parseInt( await mm.initialWei.call() ));
    help.debug('Initial Buy Price', parseInt( await mm.initialBuyPrice.call() ));
    help.debug('Initial Sell Price', parseInt( await mm.initialSellPrice.call() ));

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

    let accumIncrementPrice = [
      100000, 101000, 102010, 103030, 104060, 105100,
      106151, 107212, 108284, 109366, 110459, 111563,
      112678, 113804, 114942, 116091, 117251, 118423,
      119607, 120803, 122011, 123231, 124463, 125707,
      126964, 128233, 129515, 130810, 132118, 133439,
      134773, 136120, 137481, 138855, 140243, 141645,
      143061, 144491, 145935, 147394, 148867, 150355,
      151858, 153376, 154909, 156458, 158022, 159602
    ];

    for (var i = 0; i < distributionDeltas.length; i++) {
      assert.equal(distributionDeltas[i], parseInt((await mm.marketMakerPeriods.call(i))[2]))
      assert.equal(accumIncrementPrice[i], parseInt((await mm.marketMakerPeriods.call(i))[4]))
    }

    // just a few examples to double-check
    assert.equal(97, parseInt((await mm.marketMakerPeriods.call(5))[2]))
    assert.equal(416, parseInt((await mm.marketMakerPeriods.call(11))[2]))
    assert.equal(1425, parseInt((await mm.marketMakerPeriods.call(22))[2]))
    assert.equal(2746, parseInt((await mm.marketMakerPeriods.call(32))[2]))
    assert.equal(2898, parseInt((await mm.marketMakerPeriods.call(33))[2]))
    assert.equal(4595, parseInt((await mm.marketMakerPeriods.call(43))[2]))
    assert.equal(4782, parseInt((await mm.marketMakerPeriods.call(44))[2]))
    assert.equal(4972, parseInt((await mm.marketMakerPeriods.call(45))[2]))
    assert.equal(5166, parseInt((await mm.marketMakerPeriods.call(46))[2]))
    assert.equal(5363, parseInt((await mm.marketMakerPeriods.call(47))[2]))
  });

  it("should return correct periods using getCurrentPeriodIndex", async function() {
    token = await simulateCrowdsale(100, [40,30,20,10,0], accounts);
    const startBlock = web3.eth.blockNumber+10;
    const blocksPerPeriod = 12;

    mm = await LifMarketMaker.new(token.address, startBlock, blocksPerPeriod, 24, accounts[1],
      100500, {from: accounts[0]});

    await mm.fund({value: web3.toWei(8, 'ether'), from: accounts[0]});
    await mm.calculateDistributionPeriods({from: accounts[5]});
    await mm.calculateSellPricePeriods({from: accounts[6]});

    help.debug('MM balance:', parseInt( web3.eth.getBalance(token.address) ));
    help.debug('Start block', parseInt( await mm.startBlock.call() ));
    help.debug('Blocks per period', parseInt( await mm.blocksPerPeriod.call() ));
    help.debug('Foundation address', await mm.foundationAddr.call() );
    assert.equal(0, parseInt(web3.eth.getBalance(token.address)) );
    assert.equal(startBlock, parseInt(await mm.startBlock()) );
    assert.equal(blocksPerPeriod, parseInt(await mm.blocksPerPeriod()) );
    assert.equal(accounts[1], parseInt(await mm.foundationAddr()) );

    await help.waitToBlock(startBlock);
    assert.equal(0, parseInt(await mm.getCurrentPeriodIndex()) );
    await help.waitToBlock(web3.eth.blockNumber+blocksPerPeriod)
    assert.equal(1, parseInt(await mm.getCurrentPeriodIndex()) );
    await help.waitToBlock(web3.eth.blockNumber+blocksPerPeriod)
    assert.equal(2, parseInt(await mm.getCurrentPeriodIndex()) );
    await help.waitToBlock(web3.eth.blockNumber+blocksPerPeriod)
    assert.equal(3, parseInt(await mm.getCurrentPeriodIndex()) );
    await help.waitToBlock(web3.eth.blockNumber+blocksPerPeriod)
    assert.equal(4, parseInt(await mm.getCurrentPeriodIndex()) );
  });

  it("Should return the correct sellPrice on every period with 873750 tokens total supply and 3285 ETH in MM", async function() {
    token = await simulateCrowdsale(100, [873750,0,0,0,0], accounts);

    const startBlock = web3.eth.blockNumber+10;
    const blocksPerPeriod = 5;
    const initialPriceSpread = 0.05;
    const priceFactor = 100000;
    const initialPriceSpreadFactor = priceFactor*(1+initialPriceSpread);
    const initialMMEther = 30285;
    const MMInitialBalance = web3.toWei(initialMMEther, 'ether');
    const tokenTotalSupply = help.lif2LifWei(873750);

    const initialSellPrice = parseFloat((MMInitialBalance / tokenTotalSupply)*(1+initialPriceSpread)).toFixed(5);
    const initialBuyPrice = parseFloat((MMInitialBalance / tokenTotalSupply)).toFixed(5);

    mm = await LifMarketMaker.new(token.address, startBlock, blocksPerPeriod, 48, accounts[1],
      initialPriceSpreadFactor, {from: accounts[0]});

    await mm.fund({value: web3.toWei(initialMMEther, 'ether'), from: accounts[0]});
    await mm.calculateDistributionPeriods({from: accounts[4]});
    await mm.calculateSellPricePeriods({from: accounts[3]});

    help.debug('Total Token Supply:', help.lifWei2Lif(parseFloat( await token.totalSupply())));
    help.debug('MM balance:', parseFloat( web3.eth.getBalance(mm.address) ).toFixed(0));
    help.debug('Start block', parseInt( await mm.startBlock.call() ));
    help.debug('Blocks per period', parseInt( await mm.blocksPerPeriod.call() ));
    help.debug('Foundation address', await mm.foundationAddr.call() );
    help.debug('Initial Wei', parseFloat( await mm.initialWei.call() ).toFixed(0));

    assert.equal(initialBuyPrice, parseFloat(await mm.initialBuyPrice()/priceFactor).toFixed(5) );
    assert.equal(initialSellPrice, parseFloat(await mm.initialSellPrice()/priceFactor).toFixed(5) );

    await help.waitToBlock(startBlock+1);
    for (var i = 0; i < 48; i++) {

      help.debug('Sell price on period', i, parseFloat(await mm.getSellPrice()/priceFactor));

      assert.approximately(parseFloat(initialSellPrice*(1.01**i)), parseFloat(await mm.getSellPrice()/priceFactor),
        0.0001, 'wrong sell price in contract on period index'+ i);

      if (i == 3) {
        assert.equal(0.03749, parseFloat(await mm.getSellPrice()/priceFactor),
          'wrong sell price in contract on period 3');
      } else if (i == 23) {
        assert.equal(0.04574, parseFloat(await mm.getSellPrice()/priceFactor),
          'wrong sell price in contract on period 23');
      } else if (i == 38) {
        assert.equal(0.05310, parseFloat(await mm.getSellPrice()/priceFactor),
          'wrong sell price in contract on period 38');
      }

      await help.waitToBlock(web3.eth.blockNumber+blocksPerPeriod);
    }
  });

  const periods = 24;

  var checkScenarioProperties = async function(data, mm, customer) {
    help.debug("checking scenario", JSON.stringify(data));

    assert.equal(data.month, await mm.getCurrentPeriodIndex());
    data.totalProfit.should.be.bignumber.equal(await mm.totalWeiProfit.call());
    data.marketMakerEthBalance.should.be.bignumber.equal(web3.eth.getBalance(mm.address));
    data.marketMakerLifBalance.should.be.bignumber.equal(await token.balanceOf(mm.address));

    if (data.month < periods) {
      data.marketMakerSellPrice.should.be.bignumber.equal(await mm.getSellPrice());
      data.marketMakerBuyPrice.should.be.bignumber.equal(await mm.getBuyPrice());
      assert.equal(data.claimablePercentage, parseInt(await mm.getAccumulatedDistributionPercentage()));
    }

    assert.equal(data.month >= periods, await mm.isFinished());

    data.customerEthBalance.should.be.bignumber.equal(web3.eth.getBalance(customer));
    data.customerLifBalance.should.be.bignumber.equal(await token.balanceOf(customer));

    data.maxClaimableEth.should.be.bignumber.equal(await mm.getMaxClaimableWeiAmount());

    data.totalClaimedEth.should.be.bignumber.equal(await mm.totalWeiClaimed.call());
  };

  it("should go through scenario with some claims and sells on the Market Maker", async function() {
    // Create MM with balance of 200 ETH and 100 tokens in circulation,
    // starting sell price of 2100 mETH/Lif, increment coefficient 0.01
    const tokenTotalSupply = 100;
    const sellPriceIncrement = 1.01;
    const initialPriceSpread = 1.05
    const priceFactor = 100000;

    token = await simulateCrowdsale(tokenTotalSupply, [tokenTotalSupply], accounts);

    let customer = accounts[1];
    let startingMMBalance = new BigNumber(web3.toWei(200, 'ether'));
    const initialSellPrice = startingMMBalance.dividedBy(help.lif2LifWei(tokenTotalSupply)).mul(priceFactor).mul(initialPriceSpread);
    const initialBuyPrice = startingMMBalance.dividedBy(help.lif2LifWei(tokenTotalSupply));

    let state = {
      month: 0,
      marketMakerEthBalance: startingMMBalance,
      marketMakerLifBalance: new BigNumber(0),
      totalProfit: new BigNumber(0),
      customerEthBalance: web3.eth.getBalance(customer),
      customerLifBalance: await token.balanceOf(customer),
      marketMakerSellPrice: initialSellPrice,
      marketMakerBuyPrice: startingMMBalance.dividedBy(help.lif2LifWei(tokenTotalSupply)).mul(priceFactor),
      claimablePercentage: 0, maxClaimableEth: new BigNumber(0), totalClaimedEth: new BigNumber(0)
    };

    const startBlock = web3.eth.blockNumber + 10;
    const blocksPerPeriod = 20;

    const foundationWallet = accounts[9];

    mm = await LifMarketMaker.new(token.address, startBlock, blocksPerPeriod, periods, foundationWallet,
      priceFactor * initialPriceSpread, {from: accounts[0]});

    await mm.fund({value: state.marketMakerEthBalance, from: accounts[0]});
    await mm.calculateDistributionPeriods({from: accounts[0]});
    await mm.calculateSellPricePeriods({from: accounts[6]});

    let distributionDeltas = [
      0, 18, 99, 234, 416, 640,
      902, 1202, 1536, 1905, 2305, 2738,
      3201, 3693, 4215, 4766, 5345, 5951,
      6583, 7243, 7929, 8640, 9377, 10138
    ];

    let getMaxClaimableEth = function(state) {
      return startingMMBalance.
        mul(state.claimablePercentage).dividedBy(priceFactor).
        mul(tokenTotalSupply - help.lifWei2Lif(state.marketMakerLifBalance)).
        dividedBy(tokenTotalSupply).plus(state.totalProfit).
        minus(state.totalClaimedEth);
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
      // we have to round at different points in calculation to mimmick what happens in contract
      state.marketMakerSellPrice = initialSellPrice.mul(new BigNumber(sellPriceIncrement).pow(period).mul(priceFactor).round().div(priceFactor)).round();
      state.marketMakerBuyPrice = startingMMBalance.
        mul(priceFactor - state.claimablePercentage).
        dividedBy(help.lif2LifWei(tokenTotalSupply));
      state.maxClaimableEth = getMaxClaimableEth(state);
      state.month = month;

      await checkScenarioProperties(state, mm, customer);
    };

    // Month 0
    await waitForMonth(0, startBlock, blocksPerPeriod);

    let sendTokens = async (tokens) => {
      let lifWei = help.lif2LifWei(tokens);
      let lifBuyPrice = state.marketMakerBuyPrice.div(priceFactor);
      let tokensCost = new BigNumber(lifWei).mul(lifBuyPrice);

      let tx1 = await token.approve(mm.address, lifWei, {from: customer});
      let tx2 = await mm.sendTokens(lifWei, {from: customer});
      let gas = tx1.receipt.gasUsed + tx2.receipt.gasUsed;

      help.debug('Selling ',tokens, ' tokens in exchange of ', web3.fromWei(tokensCost, 'ether'), 'eth');
      state.customerEthBalance = state.customerEthBalance.plus(tokensCost).minus(gasPrice.mul(gas));
      state.marketMakerEthBalance = state.marketMakerEthBalance.minus(tokensCost);
      state.marketMakerLifBalance = state.marketMakerLifBalance.plus(lifWei);
      state.customerLifBalance = state.customerLifBalance.minus(lifWei);
      state.totalProfit = state.totalProfit.plus(initialBuyPrice.sub(lifBuyPrice).mul(lifWei));
      state.maxClaimableEth = getMaxClaimableEth(state);

      await checkScenarioProperties(state, mm, customer);
    }

    let getTokens = async (tokens) => {
      let lifWei = help.lif2LifWei(tokens);
      let lifSellPrice = state.marketMakerSellPrice.div(priceFactor);
      let weiCost = new BigNumber(lifWei).mul(lifSellPrice);

      let tx1 = await mm.getTokens({ value: weiCost, from: customer});
      let gas = tx1.receipt.gasUsed;

      help.debug('Buying ',tokens, ' tokens at a cost of ', web3.fromWei(weiCost, 'ether'), 'eth');
      state.customerEthBalance = state.customerEthBalance.minus(weiCost).minus(gasPrice.mul(gas));
      state.marketMakerEthBalance = state.marketMakerEthBalance.plus(weiCost);
      state.marketMakerLifBalance = state.marketMakerLifBalance.minus(lifWei);
      state.customerLifBalance = state.customerLifBalance.plus(lifWei);
      let getTokensProfit = lifSellPrice.sub(initialBuyPrice).mul(lifWei);
      state.totalProfit = state.totalProfit.plus(getTokensProfit);
      state.maxClaimableEth = getMaxClaimableEth(state);

      await checkScenarioProperties(state, mm, customer);
    }

    let claimEth = async (eth) => {
      let weiToClaim = web3.toWei(new BigNumber(eth));
      help.debug('Claiming ', weiToClaim.toString(), 'wei (', eth, "eth)");
      await mm.claimEth(weiToClaim, {from: foundationWallet});

      state.totalClaimedEth = state.totalClaimedEth.plus(weiToClaim);
      state.marketMakerEthBalance = state.marketMakerEthBalance.minus(weiToClaim);
      state.maxClaimableEth = getMaxClaimableEth(state);

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
    try {
      await claimEth(state.maxClaimableEth + 1);
      throw(new Error("claimEth should have failed"));
    } catch(e) {} // all good
    try {
      await claimEth(0.03);
      throw(new Error("claimEth should have failed"));
    } catch(e) {} // all good

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

    // Sell 50 tokens to the MM
    await sendTokens(50);

    // Buy 100 tokens
    help.debug("buying 60 tokens");
    await getTokens(60);

    await waitForMonth(12, startBlock, blocksPerPeriod);
    await waitForMonth(14, startBlock, blocksPerPeriod);
    await waitForMonth(15, startBlock, blocksPerPeriod);

    await claimEth(5);

    await waitForMonth(25, startBlock, blocksPerPeriod);

    (await web3.eth.getBalance(mm.address)).should.be.bignumber.gt(web3.toWei(3, 'ether'));

    help.debug("claiming remaining eth");
    await claimEth(web3.fromWei(await web3.eth.getBalance(mm.address)));

    assert.equal(0, await web3.eth.getBalance(mm.address));
  });

});
