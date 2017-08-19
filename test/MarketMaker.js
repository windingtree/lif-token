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

    help.debug('MM balance:', parseInt( web3.eth.getBalance(token.address) ));
    help.debug('Start block', parseInt( await mm.startBlock.call() ));
    help.debug('Blocks per period', parseInt( await mm.blocksPerPeriod.call() ));
    help.debug('Foundation address', await mm.foundationAddr.call() );

    for (var i = 0; i < 24; i ++) {
      help.debug('Period', i, (await mm.distributionPeriods.call(i)));
    };

    assert.equal( parseInt((await mm.distributionPeriods.call(0))[2]), 0 )
    assert.equal( parseInt((await mm.distributionPeriods.call(1))[2]), 18 )
    assert.equal( parseInt((await mm.distributionPeriods.call(2))[2]), 99 )
    assert.equal( parseInt((await mm.distributionPeriods.call(3))[2]), 234 )
    assert.equal( parseInt((await mm.distributionPeriods.call(4))[2]), 416 )
    assert.equal( parseInt((await mm.distributionPeriods.call(5))[2]), 640 )
    assert.equal( parseInt((await mm.distributionPeriods.call(6))[2]), 902 )
    assert.equal( parseInt((await mm.distributionPeriods.call(7))[2]), 1202 )
    assert.equal( parseInt((await mm.distributionPeriods.call(8))[2]), 1536 )
    assert.equal( parseInt((await mm.distributionPeriods.call(9))[2]), 1905 )
    assert.equal( parseInt((await mm.distributionPeriods.call(10))[2]), 2305 )
    assert.equal( parseInt((await mm.distributionPeriods.call(11))[2]), 2738 )
    assert.equal( parseInt((await mm.distributionPeriods.call(12))[2]), 3201 )
    assert.equal( parseInt((await mm.distributionPeriods.call(13))[2]), 3693 )
    assert.equal( parseInt((await mm.distributionPeriods.call(14))[2]), 4215 )
    assert.equal( parseInt((await mm.distributionPeriods.call(15))[2]), 4766 )
    assert.equal( parseInt((await mm.distributionPeriods.call(16))[2]), 5345 )
    assert.equal( parseInt((await mm.distributionPeriods.call(17))[2]), 5951 )
    assert.equal( parseInt((await mm.distributionPeriods.call(18))[2]), 6583 )
    assert.equal( parseInt((await mm.distributionPeriods.call(19))[2]), 7243 )
    assert.equal( parseInt((await mm.distributionPeriods.call(20))[2]), 7929 )
    assert.equal( parseInt((await mm.distributionPeriods.call(21))[2]), 8640 )
    assert.equal( parseInt((await mm.distributionPeriods.call(22))[2]), 9377 )
    assert.equal( parseInt((await mm.distributionPeriods.call(23))[2]), 10138 )
  });

  it("Create 48 months MM", async function() {
    token = await simulateCrowdsale(100, [40,30,20,10,0], accounts);
    mm = await LifMarketMaker.new(
      token.address, web3.eth.blockNumber+10, 100, 48, accounts[1],
      {value: web3.toWei(8, 'ether'), from: accounts[0]}
    );

    help.debug('MM balance:', parseInt( web3.eth.getBalance(token.address) ));
    help.debug('Start block', parseInt( await mm.startBlock.call() ));
    help.debug('Blocks per period', parseInt( await mm.blocksPerPeriod.call() ));
    help.debug('Foundation address', await mm.foundationAddr.call() );

    assert.equal( parseInt((await mm.distributionPeriods.call(0))[2]), 0 )
    assert.equal( parseInt((await mm.distributionPeriods.call(1))[2]), 3 )
    assert.equal( parseInt((await mm.distributionPeriods.call(2))[2]), 15 )
    assert.equal( parseInt((await mm.distributionPeriods.call(3))[2]), 36 )
    assert.equal( parseInt((await mm.distributionPeriods.call(4))[2]), 63 )
    assert.equal( parseInt((await mm.distributionPeriods.call(5))[2]), 97 )
    assert.equal( parseInt((await mm.distributionPeriods.call(6))[2]), 137 )
    assert.equal( parseInt((await mm.distributionPeriods.call(7))[2]), 183 )
    assert.equal( parseInt((await mm.distributionPeriods.call(8))[2]), 233 )
    assert.equal( parseInt((await mm.distributionPeriods.call(9))[2]), 289 )
    assert.equal( parseInt((await mm.distributionPeriods.call(10))[2]), 350 )
    assert.equal( parseInt((await mm.distributionPeriods.call(11))[2]), 416 )
    assert.equal( parseInt((await mm.distributionPeriods.call(12))[2]), 486 )
    assert.equal( parseInt((await mm.distributionPeriods.call(13))[2]), 561 )
    assert.equal( parseInt((await mm.distributionPeriods.call(14))[2]), 641 )
    assert.equal( parseInt((await mm.distributionPeriods.call(15))[2]), 724 )
    assert.equal( parseInt((await mm.distributionPeriods.call(16))[2]), 812 )
    assert.equal( parseInt((await mm.distributionPeriods.call(17))[2]), 904 )
    assert.equal( parseInt((await mm.distributionPeriods.call(18))[2]), 1000 )
    assert.equal( parseInt((await mm.distributionPeriods.call(19))[2]), 1101 )
    assert.equal( parseInt((await mm.distributionPeriods.call(20))[2]), 1205 )
    assert.equal( parseInt((await mm.distributionPeriods.call(21))[2]), 1313 )
    assert.equal( parseInt((await mm.distributionPeriods.call(22))[2]), 1425 )
    assert.equal( parseInt((await mm.distributionPeriods.call(23))[2]), 1541 )
    assert.equal( parseInt((await mm.distributionPeriods.call(24))[2]), 1660 )
    assert.equal( parseInt((await mm.distributionPeriods.call(25))[2]), 1783 )
    assert.equal( parseInt((await mm.distributionPeriods.call(26))[2]), 1910 )
    assert.equal( parseInt((await mm.distributionPeriods.call(27))[2]), 2041 )
    assert.equal( parseInt((await mm.distributionPeriods.call(28))[2]), 2175 )
    assert.equal( parseInt((await mm.distributionPeriods.call(29))[2]), 2312 )
    assert.equal( parseInt((await mm.distributionPeriods.call(30))[2]), 2454 )
    assert.equal( parseInt((await mm.distributionPeriods.call(31))[2]), 2598 )
    assert.equal( parseInt((await mm.distributionPeriods.call(32))[2]), 2746 )
    assert.equal( parseInt((await mm.distributionPeriods.call(33))[2]), 2898 )
    assert.equal( parseInt((await mm.distributionPeriods.call(34))[2]), 3053 )
    assert.equal( parseInt((await mm.distributionPeriods.call(35))[2]), 3211 )
    assert.equal( parseInt((await mm.distributionPeriods.call(36))[2]), 3373 )
    assert.equal( parseInt((await mm.distributionPeriods.call(37))[2]), 3537 )
    assert.equal( parseInt((await mm.distributionPeriods.call(38))[2]), 3706 )
    assert.equal( parseInt((await mm.distributionPeriods.call(39))[2]), 3877 )
    assert.equal( parseInt((await mm.distributionPeriods.call(40))[2]), 4052 )
    assert.equal( parseInt((await mm.distributionPeriods.call(41))[2]), 4229 )
    assert.equal( parseInt((await mm.distributionPeriods.call(42))[2]), 4410 )
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

  it("should go through scenario with some claims and sells on the Market Maker", async function() {
    // Create MM with balance of 200 ETH and 100 tokens in circulation,
    // starting sell price of 2100 mETH/Lif, increment coefficient 0.01

    // Month 0
    // MMETH = 200,   TP = 0,    MMT = 0,   TC = 100, SP = 2100 mETH/Lif, BP = 2000, CL 0%,  maxClaimable = 0,   claimed = 0

    // Sell 10 tokens to the MM
    // MMETH = 180,   TP = 0,    MMT = 10,  TC = 90,  SP = 2100 mETH/Lif, BP = 2000, CL 0%,  maxClaimable = 0,   claimed = 0

    // Sell 20 tokens to the MM
    // MMETH = 140,   TP = 0,    MMT = 30,  TC = 70,  SP = 2100 mETH/Lif, BP = 2000, CL 0%,  maxClaimable = 0,   claimed = 0

    // Month 1
    // MMETH = 140,   TP = 0,    MMT = 30,  TC = 70,  SP = 2121 mETH/Lif, BP = 1800, CL 10%, maxClaimable = 14,  claimed = 0

    // Sell 10 tokens to the MM
    // MMETH = 122,   TP = 2,    MMT = 40,  TC = 60,  SP = 2121 mETH/Lif, BP = 1800, CL 10%, maxClaimable = 12,  claimed = 0

    // Claim 12
    // MMETH = 110,   TP = 2,    MMT = 40,  TC = 60,  SP = 2121 mETH/Lif, BP = 1800, CL 10%, maxClaimable = 12,  claimed = 12

    // Month 2
    // MMETH = 110,   TP = 2,    MMT = 40,  TC = 60,  SP = 2142 mETH/Lif, BP = 1400, CL 30%, maxClaimable = 36,  claimed = 12

    // Sell 10 tokens to the MM
    // MMETH = 96,    TP = 8,    MMT = 50,  TC = 50,  SP = 2142 mETH/Lif, BP = 1400, CL 30%, maxClaimable = 30,  claimed = 12

    // Claim 18 ETH
    // MMETH = 78,    TP = 8,    MMT = 50,  TC = 50,  SP = 2142 mETH/Lif, BP = 1400, CL 30%, maxClaimable = 30,  claimed = 30

    // Month 3
    // MMETH = 78,    TP = 8,    MMT = 50,  TC = 50,  SP = 2163 mETH/Lif, BP = 800,  CL 60%, maxClaimable = 60,  claimed = 30

    // Sell 50 tokens to the MM
    // MMETH = 38,    TP = 68,   MMT = 100, TC = 0,   SP = 2163 mETH/Lif, BP = 800,  CL 60%, maxClaimable = 0,   claimed = 30

    // Buy 100 tokens
    // MMETH = 254.3, TP = 92.3, MMT = 0,   TC = 100, SP = 2163 mETH/Lif, BP = 800,  CL 60%, maxClaimable = 120, claimed = 30

  });

});
