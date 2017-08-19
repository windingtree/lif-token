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

    for (i = 0; i < deltas.length; i++) {
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

    for (i = 0; i < deltas.length; i++) {
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

    await help.waitToBlock(startBlock);
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

  // const startingMMBalance = web3.toWei(200, 'ether');
  // const tokenTotalSupply = 100;
  // var mmTokens = 0;
  // const BPIncrement = 0.01;
  // const BPFirstIncrement = 0.05;
  // var TotalProfit = 0,
  //   maxClaimable = 0,
  //   claimed = 0,
  //   cumulativeClaimableDelta = 0;

  // Create MM with 200 ETH, and 100 tokens in circulation, starting buy price of 2.1
  // BPIncrement = 0.01

  // MONTH 0
  // MMETH = 200, MMT = 0, TC = 100, SP = 2.1 ETH/Lif, BP = 2, CL 0%, maxClaimable = 0, claimed = 0

  // Sell 10 tokens to the MM
  // MMETH = 180, TP = 0, MMT = 10, TC = 90, SP = 2.1 ETH/Lif, BP = 2, CL 0%, maxClaimable = 0, claimed = 0

  // let initialAccountLifBalance = lifToken.balanceOf(accounts[2]);
  // await lifToken.approve(mm.address, 10);
  // await mm.sendTokens(10, {from: accounts[2]});
  // assert.equal(20, web3.eth.getBalance(accounts[2]));
  // assert.equal(180, web3.eth.getBalance(mm.address));
  // assert.equal(10, lifToken.balanceOf(mm.address));
  // assert.equal(initialAccountLifBalance-10, lifToken.balanceOf(accounts[2]));
  // assert.equal(21000, mm.getSellPrice());
  // assert.equal(20000, mm.getBuyPrice());
  // assert.equal(0, mm.getAccumulatedDistributedPercentage());
  // assert.equal(0, mm.getMaxClaimableWei());
  // assert.equal(0, mm.totalClaimedWei());
  // assert.equal(0, mm.totalProfit());
  // assert.equal(0, mm.getCurrentPeriodIndex());

  // Sell 20 tokens to the MM
  // MMETH = 140, TP = 0, MMT = 30, TC = 70, SP = 2.1 ETH/Lif, BP = 2, CL 0%, maxClaimable = 0, claimed = 0

  // await lifToken.approve(mm.address, 20);
  // await mm.sendTokens(20, {from: accounts[2]});
  // assert.equal(60, web3.eth.getBalance(accounts[2]));
  // assert.equal(140, web3.eth.getBalance(mm.address));
  // assert.equal(30, lifToken.balanceOf(mm.address));
  // assert.equal(initialAccountLifBalance-30, lifToken.balanceOf(accounts[2]));
  // assert.equal(21000, mm.getSellPrice());
  // assert.equal(20000, mm.getBuyPrice());
  // assert.equal(0, mm.getAccumulatedDistributedPercentage());
  // assert.equal(0, mm.getMaxClaimableWei());
  // assert.equal(0, mm.totalClaimedWei());
  // assert.equal(0, mm.totalProfit());
  // assert.equal(0, mm.getCurrentPeriodIndex());

  // MONTH 1
  // MMETH = 140, TP = 0, MMT = 30, TC = 70, SP = 2.121 ETH/Lif, BP = 1.8, CL 10%, maxClaimable = 14, claimed = 0

  // let nextPeriodBlock = startBlock + blocksPerPeriod;
  // await help.waitToBlock(nextPeriodBlock);

  // assert.equal(140, web3.eth.getBalance(mm.address));
  // assert.equal(30, lifToken.balanceOf(mm.address));
  // assert.equal(2121, mm.getSellPrice());
  // assert.equal(1800, mm.getBuyPrice());
  // assert.equal(1000, mm.getAccumulatedDistributedPercentage());
  // assert.equal(14, mm.getMaxClaimableWei());
  // assert.equal(0, mm.totalClaimedWei());
  // assert.equal(0, mm.totalProfit());
  // assert.equal(1, mm.getCurrentPeriodIndex());

  // Sell 10 tokens to the MM
  // MMETH = 122, TP = 2, MMT = 40, TC = 60, SP = 2.121 ETH/Lif, BP = 1.8, CL 10%, maxClaimable = 12, claimed = 0

  // await lifToken.approve(mm.address, 10);
  // await mm.sendTokens(10, {from: accounts[2]});
  // assert.equal(78, web3.eth.getBalance(accounts[2]));
  // assert.equal(122, web3.eth.getBalance(mm.address));
  // assert.equal(40, lifToken.balanceOf(mm.address));
  // assert.equal(initialAccountLifBalance-40, lifToken.balanceOf(accounts[2]));
  // assert.equal(2121, mm.getSellPrice());
  // assert.equal(1800, mm.getBuyPrice());
  // assert.equal(1000, mm.getAccumulatedDistributedPercentage());
  // assert.equal(12, mm.getMaxClaimableWei());
  // assert.equal(0, mm.totalClaimedWei());
  // assert.equal(2, mm.totalProfit());
  // assert.equal(1, mm.getCurrentPeriodIndex());

  // Claim 12
  // MMETH = 110, TP = 2, MMT = 40, TC = 60, SP = 2.121 ETH/Lif, BP = 1.8, CL 10%, maxClaimable = 12, claimed = 12

  // assert.equal(110, web3.eth.getBalance(mm.address));
  // assert.equal(40, lifToken.balanceOf(mm.address));
  // assert.equal(2121, mm.getSellPrice());
  // assert.equal(1800, mm.getBuyPrice());
  // assert.equal(1000, mm.getAccumulatedDistributedPercentage());
  // assert.equal(12, mm.getMaxClaimableWei());
  // assert.equal(12, mm.totalClaimedWei());
  // assert.equal(2, mm.totalProfit());
  // assert.equal(1, mm.getCurrentPeriodIndex());

  // MONTH 2
  // MMETH = 110, TP = 2, MMT = 40, TC = 60, SP = 2.142 ETH/Lif, BP = 1.4, CL 30%, maxClaimable = 36, claimed = 12

  // Sell 10 tokens to the MM
  // MMETH = 96, TP = 8, MMT = 50, TC = 50, SP = 2.142 ETH/Lif, BP = 1.4, CL 30%, maxClaimable = 30, claimed = 12
  // Claim 18 ETH
  // MMETH = 78, TP = 8, MMT = 50, TC = 50, SP = 2.142 ETH/Lif, BP = 1.4, CL 30%, maxClaimable = 30, claimed = 30

  // MONTH 3
  // MMETH = 78, TP = 8, MMT = 50, TC = 50, SP = 0.8 ETH/Lif, BP = 2.163, CL 60%, maxClaimable = 60, claimed = 30

  // Sell 50 tokens to the MM
  // MMETH = 38, TP = 68, MMT = 100, TC = 0, SP = 0.8 ETH/Lif, BP = 2.163, CL 60%, maxClaimable = 0, claimed = 30

  // Buy 100 tokens
  // MMETH = 254.3, TP = 92.3, MMT = 0, TC = 100, SP = 0.8 ETH/Lif, BP = 2.163, CL 60%, maxClaimable = 120, claimed = 30


  // Month 0:
  // Claimable amount: 0

  // Month 1:
  // Claimable month: 27
  // Claimable total: 27
  // ClaimAmount(8)
  // Claimable: 19
  // claimableUpdatedMonth: 1

  // Month 2:
  // Claimable month: 154
  // Claimable total: 19
  // claimableUpdatedMonth: 1

  // Month 3:
  // Claimable month: 366
  // Claimable total: 19+154+366 = 543
  // Claim(243);
  // Claimable total: 300
  // claimableUpdatedMonth: 3

  // Month 4:
  // Claimable month: 651
  // Claimable total: 300+651 = 951


});
