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
      startBlock+1, startBlock+10, endBlock, rate, rate+10, rate+20, accounts[0], accounts[1], 1, 1
    );
    await help.waitToBlock(startBlock+1, accounts);
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

  it("Create mm", async function() {
    token = await simulateCrowdsale(100, [40,30,20,10,0], accounts);
    mm = await LifMarketMaker.new(token.address, 10, 1010, accounts[1], {value: web3.toWei(8, 'ether'), from: accounts[0]});

    await mm.addRateRange(web3.eth.blockNumber, web3.eth.blockNumber+9, 90);
    await mm.addRateRange(web3.eth.blockNumber+10, web3.eth.blockNumber+19, 80);
    await mm.addRateRange(web3.eth.blockNumber+20, web3.eth.blockNumber+29, 70);
    await mm.addRateRange(web3.eth.blockNumber+30, web3.eth.blockNumber+39, 60);
    await mm.addRateRange(web3.eth.blockNumber+40, web3.eth.blockNumber+49, 50);
    await mm.addRateRange(web3.eth.blockNumber+50, web3.eth.blockNumber+59, 40);
    await mm.addRateRange(web3.eth.blockNumber+60, web3.eth.blockNumber+69, 30);
    await mm.addRateRange(web3.eth.blockNumber+70, web3.eth.blockNumber+79, 20);
    await mm.addRateRange(web3.eth.blockNumber+80, web3.eth.blockNumber+89, 10);
    await mm.addRateRange(web3.eth.blockNumber+90, web3.eth.blockNumber+99, 1);

    console.log('MM balance:', parseInt( web3.eth.getBalance(token.address) ));
    console.log('Start block', parseInt( await mm.startBlock.call() ));
    console.log('End block', parseInt( await mm.endBlock.call() ));
    console.log('Foundation address', await mm.foundationAddr.call() );
    console.log('Buy Price', parseInt( await mm.getBuyPrice.call() ));
    console.log('Sell Price', parseInt( await mm.getSellPrice.call() ));
    await help.waitToBlock(web3.eth.blockNumber+11, accounts);
    await mm.sendTransaction({value: web3.toWei(20, 'ether'), from: accounts[2]});
    console.log('Buy Price', parseInt( await mm.getBuyPrice.call() ));
    console.log('Sell Price', parseInt( await mm.getSellPrice.call() ));
  });

});
