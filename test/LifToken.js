var help = require("./helpers");

var BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

var LifToken = artifacts.require("./LifToken.sol");
var LifCrowdsale = artifacts.require("./LifCrowdsale.sol");
var Message = artifacts.require("./Message.sol");

const LOG_EVENTS = true;

contract('LifToken', function(accounts) {

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

  beforeEach(async function() {
    token = await simulateCrowdsale(100, [40,30,20,10,0], accounts);
    eventsWatcher = token.allEvents();
    eventsWatcher.watch(function(error, log){
      if (LOG_EVENTS)
        console.log('Event:', log.event, ':',log.args);
    });
  });

  afterEach(function(done) {
    eventsWatcher.stopWatching();
    done();
  });

  it("has name, symbol and decimals", async function() {
    assert.equal("Líf", await token.NAME.call());
    assert.equal("LIF", await token.SYMBOL.call());
    assert.equal(18, await token.DECIMALS.call());
  });

  it("should return the correct allowance amount after approval", async function() {
    await token.approve(accounts[2], help.lif2LifWei(10),{ from: accounts[1] });
    let allowance = await token.allowance(accounts[1], accounts[2],{ from: accounts[1]});
    assert.equal(help.lifWei2Lif(allowance), 10);
    await help.checkToken(token, accounts, 100, [40,30,20,10,0]);
  });

  it("should return correct balances after transfer", async function() {
    await token.transfer(accounts[4], help.lif2LifWei(3.55), { from: accounts[1] });
    await help.checkToken(token, accounts, 100, [36.45,30,20,13.55,0]);
  });

  it("should throw an error when trying to transfer more than balance", async function() {
    try {
      await token.transfer(accounts[2], help.lif2LifWei(21));
    } catch (error) {
      if (error.message.search('invalid opcode') == -1) throw error;
    }
    await help.checkToken(token, accounts, 100, [40,30,20,10,0]);
  });

  it("should return correct balances after transfering from another account", async function() {
    await token.approve(accounts[3], help.lif2LifWei(5), {from: accounts[1]});
    await token.transferFrom(accounts[1], accounts[2], help.lif2LifWei(5), {from: accounts[3]});
    await help.checkToken(token, accounts, 100, [35,35,20,10,0]);;
  });

  it("should throw an error when trying to transfer more than allowed", async function() {
    await token.approve(accounts[3], help.lif2LifWei(10), {from: accounts[1]});
    try {
      await token.transferFrom(accounts[1], accounts[3], help.lif2LifWei(11), {from: accounts[3]});
    } catch (error) {
      if (error.message.search('invalid opcode') == -1) throw error;
    }
    await help.checkToken(token, accounts, 100, [40,30,20,10,0]);
  });

  it("should return correct balances after transferData and show the event on receiver contract", async function() {
    let message = await Message.new();
    help.abiDecoder.addABI(Message._json.abi);

    let data = message.contract.showMessage.getData(web3.toHex(123456), 666, 'Transfer Done');

    let transaction = await token.transferData(message.contract.address, help.lif2LifWei(1), data, {from: accounts[1]});
    let decodedEvents = help.abiDecoder.decodeLogs(transaction.receipt.logs);

    assert.equal(2, decodedEvents.length);
    assert.equal(data, decodedEvents[1].events[3].value);

    assert.equal(help.lif2LifWei(1), await token.balanceOf(message.contract.address));

    await help.checkToken(token, accounts, 100, [39,30,20,10,0]);
  });

  it("should return correct balances after transferDataFrom and show the event on receiver contract", async function() {
    let message = await Message.new();
    help.abiDecoder.addABI(Message._json.abi);

    let data = message.contract.showMessage.getData(web3.toHex(123456), 666, 'Transfer Done');

    await token.approve(accounts[2], help.lif2LifWei(2), {from: accounts[1]});

    let transaction = await token.transferDataFrom(accounts[1], message.contract.address, help.lif2LifWei(1), data, {from: accounts[2]});
    let decodedEvents = help.abiDecoder.decodeLogs(transaction.receipt.logs);

    assert.equal(2, decodedEvents.length);
    assert.equal(data, decodedEvents[1].events[3].value);
    assert.equal('0x1e24000000000000000000000000000000000000000000000000000000000000', decodedEvents[0].events[0].value);
    assert.equal(666, decodedEvents[0].events[1].value);
    assert.equal('Transfer Done', decodedEvents[0].events[2].value);
    assert.equal(help.lif2LifWei(1), await token.balanceOf(message.contract.address));

    await help.checkToken(token, accounts, 100, [39,30,20,10,0]);
  });

  it("should return correct balances after approve and show the event on receiver contract", async function() {
    let message = await Message.new();
    help.abiDecoder.addABI(Message._json.abi);

    let data = message.contract.showMessage.getData(web3.toHex(123456), 666, 'Transfer Done');

    let transaction = await token.approveData(message.contract.address, help.lif2LifWei(1000), data, {from: accounts[1]});
    let decodedEvents = help.abiDecoder.decodeLogs(transaction.receipt.logs);

    assert.equal(2, decodedEvents.length);
    assert.equal(data, decodedEvents[1].events[3].value);

    assert.equal(help.lif2LifWei(1000), await token.allowance(accounts[1], message.contract.address));

    await help.checkToken(token, accounts, 100, [40,30,20,10,0]);
  });

  it("should fail transferData when using LifToken contract address as receiver", async function() {

    try {
      await token.transferData(token.contract.address, help.lif2LifWei(1000), web3.toHex(0), {from: accounts[1]});
    } catch (error) {
      if (error.message.search('invalid opcode') == -1) throw error;
    }

    await help.checkToken(token, accounts, 100, [40,30,20,10,0]);
  });

  it("should fail transferDataFrom when using LifToken contract address as receiver", async function() {

    await token.approve(accounts[1], help.lif2LifWei(1), {from: accounts[3]});

    try {
      await token.transferDataFrom(accounts[3], token.contract.address, help.lif2LifWei(1), web3.toHex(0), {from: accounts[1]});
    } catch (error) {
      if (error.message.search('invalid opcode') == -1) throw error;
    }

    await help.checkToken(token, accounts, 100, [40,30,20,10,0]);
  });

  it("can burn tokens", async function() {
    let totalSupply0 = await token.totalSupply.call();
    new BigNumber(0).should.be.bignumber.equal(await token.balanceOf(accounts[5]));

    let initialBalance = web3.toWei(1);
    await token.transfer(accounts[5], initialBalance, { from: accounts[1] });
    initialBalance.should.be.bignumber.equal(await token.balanceOf(accounts[5]));

    let burned = web3.toWei(0.3);
    await token.burn(burned, {from: accounts[5]});

    new BigNumber(initialBalance).minus(burned).
      should.be.bignumber.equal(await token.balanceOf(accounts[5]));
    totalSupply0.minus(burned).should.be.bignumber.equal(await token.totalSupply.call());
  });

});
