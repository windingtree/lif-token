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
    if (balances[0] > 0)
      await crowdsale.sendTransaction({ value: web3.toWei(balances[0]/rate, 'ether'), from: accounts[1] });
    if (balances[1] > 0)
      await crowdsale.sendTransaction({ value: web3.toWei(balances[1]/rate, 'ether'), from: accounts[2] });
    if (balances[2] > 0)
      await crowdsale.sendTransaction({ value: web3.toWei(balances[2]/rate, 'ether'), from: accounts[3] });
    if (balances[3] > 0)
      await crowdsale.sendTransaction({ value: web3.toWei(balances[3]/rate, 'ether'), from: accounts[4] });
    if (balances[4] > 0)
      await crowdsale.sendTransaction({ value: web3.toWei(balances[4]/rate, 'ether'), from: accounts[5] });
    await help.waitToBlock(endBlock+1, accounts);
    await crowdsale.finalize();
    return LifToken.at( await crowdsale.token() );
  };

  it("Create 24 months MM", async function() {
    token = await simulateCrowdsale(100, [40,30,20,10,0], accounts);
    mm = await LifMarketMaker.new(
      token.address, web3.eth.blockNumber+10, 100, 24, accounts[1],
      {value: web3.toWei(8, 'ether'), from: accounts[0]}
    );

    await mm.calculateDistributionPeriods({from: accounts[0]});

    help.debug('MM balance:', parseInt( web3.eth.getBalance(token.address) ));
    help.debug('Start block', parseInt( await mm.startBlock.call() ));
    help.debug('Blocks per period', parseInt( await mm.blocksPerPeriod.call() ));
    help.debug('Foundation address', await mm.foundationAddr.call() );

    for (var i = 0; i < 24; i ++) {
      help.debug('Period', i, (await mm.distributionPeriods.call(i)));
    };

    let deltas = [
      0, 18, 99, 234, 416, 640,
      902, 1202, 1536, 1905, 2305, 2738,
      3201, 3693, 4215, 4766, 5345, 5951,
      6583, 7243, 7929, 8640, 9377, 10138
    ];

    for (int i = 0; i < deltas.length; i++) {
      assert.equal(parseInt((await mm.distributionPeriods.call(i))[2]), deltas[i])
    }
    // a few specific examples to double-check
    assert.equal( parseInt((await mm.distributionPeriods.call(0))[2]), 0 )
    assert.equal( parseInt((await mm.distributionPeriods.call(1))[2]), 18 )
    assert.equal( parseInt((await mm.distributionPeriods.call(9))[2]), 1905 )
    assert.equal( parseInt((await mm.distributionPeriods.call(15))[2]), 4766 )
    assert.equal( parseInt((await mm.distributionPeriods.call(16))[2]), 5345 )
    assert.equal( parseInt((await mm.distributionPeriods.call(23))[2]), 10138 )
  });

  it("Create 48 months MM", async function() {
    token = await simulateCrowdsale(100, [40,30,20,10,0], accounts);
    mm = await LifMarketMaker.new(
      token.address, web3.eth.blockNumber+10, 100, 48, accounts[1],
      {value: web3.toWei(8, 'ether'), from: accounts[0]}
    );

    await mm.calculateDistributionPeriods({from: accounts[0]});

    help.debug('MM balance:', parseInt( web3.eth.getBalance(token.address) ));
    help.debug('Start block', parseInt( await mm.startBlock.call() ));
    help.debug('Blocks per period', parseInt( await mm.blocksPerPeriod.call() ));
    help.debug('Foundation address', await mm.foundationAddr.call() );

    let deltas = [
      0, 3, 15, 36, 63, 97,
      137, 183, 233, 289, 350, 416,
      486, 561, 641, 724, 812, 904,
      1000, 1101, 1205, 1313, 1425, 1541,
      1660, 1783, 1910, 2041, 2175, 2312,
      2454, 2598, 2746, 2898, 3053, 3211,
      3373, 3537, 3706, 3877, 4052, 4229,
      4410, 4595, 4782, 4972, 5166, 5363
    ];

    for (int i = 0; i < deltas.length; i++) {
      assert.equal(parseInt((await mm.distributionPeriods.call(i))[2]), deltas[i])
    }
    // just a few examples to double-check
    assert.equal( parseInt((await mm.distributionPeriods.call(5))[2]), 97 )
    assert.equal( parseInt((await mm.distributionPeriods.call(11))[2]), 416 )
    assert.equal( parseInt((await mm.distributionPeriods.call(22))[2]), 1425 )
    assert.equal( parseInt((await mm.distributionPeriods.call(32))[2]), 2746 )
    assert.equal( parseInt((await mm.distributionPeriods.call(33))[2]), 2898 )
    assert.equal( parseInt((await mm.distributionPeriods.call(43))[2]), 4595 )
    assert.equal( parseInt((await mm.distributionPeriods.call(44))[2]), 4782 )
    assert.equal( parseInt((await mm.distributionPeriods.call(45))[2]), 4972 )
    assert.equal( parseInt((await mm.distributionPeriods.call(46))[2]), 5166 )
    assert.equal( parseInt((await mm.distributionPeriods.call(47))[2]), 5363 )
  });

  it("should return correct periods using getCurrentPeriodIndex", async function() {
    token = await simulateCrowdsale(100, [40,30,20,10,0], accounts);
    const startBlock = web3.eth.blockNumber+10;
    const blocksPerPeriod = 30;
    mm = await LifMarketMaker.new(
      token.address, startBlock, blocksPerPeriod, 24, accounts[1],
      {value: web3.toWei(8, 'ether'), from: accounts[0]}
    );

    help.debug('MM balance:', parseInt( web3.eth.getBalance(token.address) ));
    help.debug('Start block', parseInt( await mm.startBlock.call() ));
    help.debug('Blocks per period', parseInt( await mm.blocksPerPeriod.call() ));
    help.debug('Foundation address', await mm.foundationAddr.call() );
    assert.equal( 0, parseInt(web3.eth.getBalance(token.address)) );
    assert.equal( startBlock, parseInt(await mm.startBlock()) );
    assert.equal( blocksPerPeriod, parseInt(await mm.blocksPerPeriod()) );
    assert.equal( accounts[1], parseInt(await mm.foundationAddr()) );

    await help.waitToBlock(startBlock+1);
    assert.equal( 0, parseInt(await mm.getCurrentPeriodIndex()) );
    await help.waitToBlock(web3.eth.blockNumber+blocksPerPeriod)
    assert.equal( 1, parseInt(await mm.getCurrentPeriodIndex()) );
    await help.waitToBlock(web3.eth.blockNumber+blocksPerPeriod)
    assert.equal( 2, parseInt(await mm.getCurrentPeriodIndex()) );
    await help.waitToBlock(web3.eth.blockNumber+blocksPerPeriod)
    assert.equal( 3, parseInt(await mm.getCurrentPeriodIndex()) );
    await help.waitToBlock(web3.eth.blockNumber+blocksPerPeriod)
    assert.equal( 4, parseInt(await mm.getCurrentPeriodIndex()) );
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
    mm = await LifMarketMaker.new(
      token.address, startBlock, blocksPerPeriod, 24, accounts[1],
      {value: web3.toWei(8, 'ether'), from: accounts[0]}
    );


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
