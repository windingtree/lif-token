var help = require("./helpers");

var LifMarketMaker = artifacts.require("./LifMarketMaker.sol");
var LifToken = artifacts.require("./LifToken.sol");
var LifCrowdsale = artifacts.require("./LifCrowdsale.sol");

const LOG_EVENTS = true;

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

  var checkScenarioProperties = async function(data, mm, customer) {
    assert.equal(data.totalProfit, mm.totalProfit());
    assert.equal(data.marketMakerEthBalance, web3.eth.getBalance(mm.address));
    assert.equal(data.marketMakerLifBalance, lifToken.balanceOf(mm.address));
    assert.equal(data.customerEthBalance, web3.eth.getBalance(customer));
    assert.equal(data.customerLifBalance, lifToken.balanceOf(customer));
    assert.equal(data.marketMakerSellPrice, mm.getSellPrice());
    assert.equal(data.marketMakerBuyPrice, mm.getBuyPrice());
    assert.equal(data.claimablePercentage, mm.getAccumulatedDistributedPercentage());
    assert.equal(data.maxClaimableEth, mm.getMaxClaimableWei());
    assert.equal(data.totalClaimedEth, mm.totalClaimedWei());
  };

  let waitForMonth = async function(numberOfMonth, startBlock, blocksPerPeriod) {
    await help.waitToBlock(startBlock+blocksPerPeriod*numberOfMonth, accounts);
  };

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

  it("should go through scenario with some claims and sells on the Market Maker", async function() {
    // Create MM with balance of 200 ETH and 100 tokens in circulation,
    // starting sell price of 2100 mETH/Lif, increment coefficient 0.01
    const startingMMBalance = web3.toWei(200, 'ether');
    const tokenTotalSupply = 100;
    const startingSellPrice = 2100;
    const sellPriceIncrement = 1.01;

    const startBlock = web3.eth.blockNumber + 10;
    const blocksPerPeriod = 100;

    var customer = accounts[2];
    token = await simulateCrowdsale(100, [40,30,20,10,0], accounts);
    mm = await LifMarketMaker.new(token.address, startBlock, blocksPerPeriod, 24,
      accounts[1], {from: accounts[0]});

    await mm.fund({value: web3.toWei(8, 'ether'), from: accounts[0]});

    // Month 0
    await waitForMonth(0, startBlock, blocksPerPeriod);
    // MMETH = 200,   TP = 0,    MMT = 0,   TC = 100, SP = 2100 mETH/Lif, BP = 2000, CL 0%,  maxClaimable = 0,   claimed = 0
    checkScenarioProperties({
      marketMakerEthBalance: 200, marketMakerLifBalance: 0, totalProfit: 0,
      customerEthBalance: 500, customerLifBalance: 100,
      marketMakerSellPrice: 2100, marketMakerBuyPrice: 2000,
      claimablePercentage: 0, maxClaimableEth: 0, totalClaimedEth: 0
    }, mm, customer);

    // Sell 10 tokens to the MM
    await token.approve(mm.address, 10);
    await mm.sendTokens(10, {from: customer});
    // MMETH = 180,   TP = 0,    MMT = 10,  TC = 90,  SP = 2100 mETH/Lif, BP = 2000, CL 0%,  maxClaimable = 0,   claimed = 0
    checkScenarioProperties({
      marketMakerEthBalance: 180, marketMakerLifBalance: 10, totalProfit: 0,
      customerEthBalance: 520, customerLifBalance: 90,
      marketMakerSellPrice: 2100, marketMakerBuyPrice: 2000,
      claimablePercentage: 0, maxClaimableEth: 0, totalClaimedEth: 0
    }, mm, customer);

    // Sell 20 tokens to the MM
    await token.approve(mm.address, 20);
    await mm.sendTokens(20, {from: customer});
    // MMETH = 140,   TP = 0,    MMT = 30,  TC = 70,  SP = 2100 mETH/Lif, BP = 2000, CL 0%,  maxClaimable = 0,   claimed = 0
    checkScenarioProperties({
      marketMakerEthBalance: 140, marketMakerLifBalance: 30, totalProfit: 0,
      customerEthBalance: 560, customerLifBalance: 70,
      marketMakerSellPrice: 2100, marketMakerBuyPrice: 2000,
      claimablePercentage: 0, maxClaimableEth: 0, totalClaimedEth: 0
    }, mm, customer);

    // Month 1
    await waitForMonth(1, startBlock, blocksPerPeriod);
    // MMETH = 140,   TP = 0,    MMT = 30,  TC = 70,  SP = 2121 mETH/Lif, BP = 1800, CL 10%, maxClaimable = 14,  claimed = 0
    checkScenarioProperties({
      marketMakerEthBalance: 140, marketMakerLifBalance: 30, totalProfit: 0,
      customerEthBalance: 560, customerLifBalance: 70,
      marketMakerSellPrice: 2121, marketMakerBuyPrice: 1800,
      claimablePercentage: 10, maxClaimableEth: 14, totalClaimedEth: 0
    }, mm, customer);

    // Sell 10 tokens to the MM
    await token.approve(mm.address, 10);
    await mm.sendTokens(10, {from: customer});
    // MMETH = 122,   TP = 2,    MMT = 40,  TC = 60,  SP = 2121 mETH/Lif, BP = 1800, CL 10%, maxClaimable = 12,  claimed = 0
    checkScenarioProperties({
      marketMakerEthBalance: 122, marketMakerLifBalance: 40, totalProfit: 2,
      customerEthBalance: 578, customerLifBalance: 60,
      marketMakerSellPrice: 2121, marketMakerBuyPrice: 1800,
      claimablePercentage: 10, maxClaimableEth: 12, totalClaimedEth: 0
    }, mm, customer);

    // Claim 12
    await mm.claimEth(12);
    // MMETH = 110,   TP = 2,    MMT = 40,  TC = 60,  SP = 2121 mETH/Lif, BP = 1800, CL 10%, maxClaimable = 12,  claimed = 12
    checkScenarioProperties({
      marketMakerEthBalance: 110, marketMakerLifBalance: 40, totalProfit: 2,
      customerEthBalance: 578, customerLifBalance: 60,
      marketMakerSellPrice: 2121, marketMakerBuyPrice: 1800,
      claimablePercentage: 10, maxClaimableEth: 12, totalClaimedEth: 12
    }, mm, customer);

    // Month 2
    await waitForMonth(2, startBlock, blocksPerPeriod);
    // MMETH = 110,   TP = 2,    MMT = 40,  TC = 60,  SP = 2142 mETH/Lif, BP = 1400, CL 30%, maxClaimable = 36,  claimed = 12
    checkScenarioProperties({
      marketMakerEthBalance: 110, marketMakerLifBalance: 40, totalProfit: 2,
      customerEthBalance: 578, customerLifBalance: 60,
      marketMakerSellPrice: 2142, marketMakerBuyPrice: 1400,
      claimablePercentage: 30, maxClaimableEth: 36, totalClaimedEth: 12
    }, mm, customer);

    // Sell 10 tokens to the MM
    await token.approve(mm.address, 10);
    await mm.sendTokens(10, {from: customer});
    // MMETH = 96,    TP = 8,    MMT = 50,  TC = 50,  SP = 2142 mETH/Lif, BP = 1400, CL 30%, maxClaimable = 30,  claimed = 12
    checkScenarioProperties({
      marketMakerEthBalance: 96, marketMakerLifBalance: 50, totalProfit: 8,
      customerEthBalance: 592, customerLifBalance: 50,
      marketMakerSellPrice: 2142, marketMakerBuyPrice: 1400,
      claimablePercentage: 30, maxClaimableEth: 30, totalClaimedEth: 12
    }, mm, customer);

    // Claim 18 ETH
    await mm.claimEth(18);
    // MMETH = 78,    TP = 8,    MMT = 50,  TC = 50,  SP = 2142 mETH/Lif, BP = 1400, CL 30%, maxClaimable = 30,  claimed = 30
    checkScenarioProperties({
      marketMakerEthBalance: 78, marketMakerLifBalance: 50, totalProfit: 8,
      customerEthBalance: 592, customerLifBalance: 50,
      marketMakerSellPrice: 2142, marketMakerBuyPrice: 1400,
      claimablePercentage: 30, maxClaimableEth: 30, totalClaimedEth: 30
    }, mm, customer);

    // Month 3
    await waitForMonth(3, startBlock, blocksPerPeriod);
    // MMETH = 78,    TP = 8,    MMT = 50,  TC = 50,  SP = 2163 mETH/Lif, BP = 800,  CL 60%, maxClaimable = 60,  claimed = 30
    checkScenarioProperties({
      marketMakerEthBalance: 78, marketMakerLifBalance: 50, totalProfit: 8,
      customerEthBalance: 592, customerLifBalance: 50,
      marketMakerSellPrice: 2163, marketMakerBuyPrice: 800,
      claimablePercentage: 60, maxClaimableEth: 60, totalClaimedEth: 30
    }, mm, customer);

    // Sell 50 tokens to the MM
    await token.approve(mm.address, 50);
    await mm.sendTokens(50, {from: customer});
    // MMETH = 38,    TP = 68,   MMT = 100, TC = 0,   SP = 2163 mETH/Lif, BP = 800,  CL 60%, maxClaimable = 0,   claimed = 30
    checkScenarioProperties({
      marketMakerEthBalance: 38, marketMakerLifBalance: 100, totalProfit: 68,
      customerEthBalance: 632, customerLifBalance: 0,
      marketMakerSellPrice: 2163, marketMakerBuyPrice: 800,
      claimablePercentage: 60, maxClaimableEth: 0, totalClaimedEth: 30
    }, mm, customer);

    // Buy 100 tokens
    await mm.getTokens(100, {from: customer});
    // MMETH = 254.3, TP = 84.3, MMT = 0,   TC = 100, SP = 2163 mETH/Lif, BP = 800,  CL 60%, maxClaimable = 120, claimed = 30
    checkScenarioProperties({
      marketMakerEthBalance: 254.3, marketMakerLifBalance: 0, totalProfit: 84.3,
      customerEthBalance: 415.7, customerLifBalance: 100,
      marketMakerSellPrice: 2163, marketMakerBuyPrice: 800,
      claimablePercentage: 60, maxClaimableEth: 120, totalClaimedEth: 30
    }, mm, customer);

  });

});
