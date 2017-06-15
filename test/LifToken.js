
var protobuf = require("protobufjs");

var help = require("./helpers");

var LifToken = artifacts.require("./LifToken.sol");
var Message = artifacts.require("./Message.sol");

const LOG_EVENTS = true;

contract('LifToken', function(accounts) {

  var token;
  var eventsWatcher;

  beforeEach(async function() {
    token = await LifToken.new(web3.toWei(10, 'ether'), 10000, 2, 3, 5)
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

  it("should simulate a crowdsale correctly", async function() {
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts);
    await help.checkToken(token, accounts, 10000000, [4000000,3000000,2000000,1000000,0]);
  });

  it("should return the correct allowance amount after approval", async function() {
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts);
    await token.approve(accounts[2], help.lif2LifWei(10),{ from: accounts[1] });
    let allowance = await token.allowance(accounts[1], accounts[2],{ from: accounts[1]});
    assert.equal(help.lifWei2Lif(allowance), 10);
    await help.checkToken(token, accounts, 10000000, [4000000,3000000,2000000,1000000,0]);
  });

  it("should return correct balances after transfer", async function() {
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts)
    await token.transfer(accounts[2], help.lif2LifWei(33.3), { from: accounts[1] });
    await help.checkToken(token, accounts, 10000000, [3999966.7,3000033.3,2000000,1000000,0]);
  });

  it("should throw an error when trying to transfer more than balance", async function() {
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts)
    try {
      await token.transfer(accounts[2], help.lif2LifWei(4000001));
    } catch (error) {
      if (error.message.search('invalid JUMP') == -1) throw error;
    }
    await help.checkToken(token, accounts, 10000000, [4000000,3000000,2000000,1000000,0]);
  });

  it("should return correct balances after transfering from another account", async function() {
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts)
    await token.approve(accounts[3], help.lif2LifWei(1000), {from: accounts[1]});
    await token.transferFrom(accounts[1], accounts[3], help.lif2LifWei(1000), {from: accounts[3]});
    await help.checkToken(token, accounts, 10000000, [3999000,3000000,2001000,1000000,0]);
  });

  it("should throw an error when trying to transfer more than allowed", async function() {
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts)
    await token.approve(accounts[3], help.lif2LifWei(1000), {from: accounts[1]});
    try {
      await token.transferFrom(accounts[1], accounts[3], help.lif2LifWei(1001), {from: accounts[3]});
    } catch (error) {
      if (error.message.search('invalid JUMP') == -1) throw error;
    }
    await help.checkToken(token, accounts, 10000000, [4000000,3000000,2000000,1000000,0]);
  });

  it("should return correct balances after transferData and show the right JSON data transfered", async function() {
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts)

    var dataEncoded = help.hexEncode(JSON.stringify({awesomeField:"AwesomeString"}));
    let transaction = await token.transferData(accounts[2], help.lif2LifWei(1000), dataEncoded, false, {from: accounts[1]});
    let decodedEvents = help.abiDecoder.decodeLogs(transaction.receipt.logs);

    assert.equal(dataEncoded, web3.toAscii(decodedEvents[0].events[3].value));
    var decodedObj = JSON.parse(help.hexDecode( web3.toAscii(decodedEvents[0].events[3].value) ));
    assert.equal("AwesomeString", decodedObj.awesomeField);

    await help.checkToken(token, accounts, 10000000, [3999000,3001000,2000000,1000000,0]);
  });

  it("should return correct balances after transferDataFrom and show the right JSON data transfered", async function() {
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts);

    await token.approve(accounts[3], help.lif2LifWei(1000), {from: accounts[1]});

    var dataEncoded = help.hexEncode(JSON.stringify({awesomeField:"AwesomeString"}));
    let transaction = await token.transferDataFrom(accounts[1], accounts[3], help.lif2LifWei(1000), dataEncoded, false, {from: accounts[3]});
    let decodedEvents = help.abiDecoder.decodeLogs(transaction.receipt.logs);

    assert.equal(dataEncoded, web3.toAscii(decodedEvents[0].events[3].value));
    var decodedObj = JSON.parse(help.hexDecode( web3.toAscii(decodedEvents[0].events[3].value) ));
    assert.equal("AwesomeString", decodedObj.awesomeField);

    await help.checkToken(token, accounts, 10000000, [3999000,3000000,2001000,1000000,0]);
  });

  it("should return correct balances after transferData without value and show the right PROTOBUF data transfered", async function() {
    var AwesomeMessage, message, encodedBuffer, encodedHex;
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts)

    let awesomeRoot = await protobuf.load("test/awesome.proto");
    AwesomeMessage = awesomeRoot.lookup("awesomepackage.AwesomeMessage");
    message = AwesomeMessage.create({ awesomeField: "AwesomeString" });
    encodedBuffer = AwesomeMessage.encode(message).finish();
    encodedHex = help.hexEncode(encodedBuffer.toString());

    let transaction = await token.transferData(accounts[2], 0, encodedHex, false, {from: accounts[1]});
    let decodedEvents = help.abiDecoder.decodeLogs(transaction.receipt.logs);

    assert.equal(encodedHex, web3.toAscii(decodedEvents[0].events[3].value));

    var decodedBuffer = new Buffer(help.hexDecode( web3.toAscii(decodedEvents[0].events[3].value) ));
    assert.equal("AwesomeString", AwesomeMessage.decode(decodedBuffer).awesomeField);

    await help.checkToken(token, accounts, 10000000, [4000000,3000000,2000000,1000000,0]);
  });

  it("should return correct balances after transferData and show the event on receiver contract", async function() {
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts);
    let message = await Message.new();
    help.abiDecoder.addABI(Message._json.abi);

    let data = message.contract.showMessage.getData(web3.toHex(123456), 666, 'Transfer Done');

    let transaction = await token.transferData(message.contract.address, help.lif2LifWei(1000), data, true, {from: accounts[1]});
    let decodedEvents = help.abiDecoder.decodeLogs(transaction.receipt.logs);

    assert.equal(2, decodedEvents.length);
    assert.equal(data, decodedEvents[1].events[3].value);

    assert.equal(help.lif2LifWei(1000), await token.balanceOf(message.contract.address));

    await help.checkToken(token, accounts, 10000000, [3999000,3000000,2000000,1000000,0]);
  });

  it("should return correct balances after transferDataFrom and show the event on receiver contract", async function() {
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts);
    let message = await Message.new();
    help.abiDecoder.addABI(Message._json.abi);

    let data = message.contract.showMessage.getData(web3.toHex(123456), 666, 'Transfer Done');

    await token.approve(accounts[2], help.lif2LifWei(1000), {from: accounts[1]});

    let transaction = await token.transferDataFrom(accounts[1], message.contract.address, help.lif2LifWei(1000), data, true, {from: accounts[2]});
    let decodedEvents = help.abiDecoder.decodeLogs(transaction.receipt.logs);

    assert.equal(2, decodedEvents.length);
    assert.equal(data, decodedEvents[1].events[3].value);
    assert.equal('0x1e24000000000000000000000000000000000000000000000000000000000000', decodedEvents[0].events[0].value);
    assert.equal(666, decodedEvents[0].events[1].value);
    assert.equal('Transfer Done', decodedEvents[0].events[2].value);
    assert.equal(help.lif2LifWei(1000), await token.balanceOf(message.contract.address));

    await help.checkToken(token, accounts, 10000000, [3999000,3000000,2000000,1000000,0]);
  });

  it("should return correct balances after approve and show the event on receiver contract", async function() {
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts);
    let message = await Message.new();
    help.abiDecoder.addABI(Message._json.abi);

    let data = message.contract.showMessage.getData(web3.toHex(123456), 666, 'Transfer Done');

    let transaction = await token.approveData(message.contract.address, help.lif2LifWei(1000), data, true, {from: accounts[1]});
    let decodedEvents = help.abiDecoder.decodeLogs(transaction.receipt.logs);

    assert.equal(2, decodedEvents.length);
    assert.equal(data, decodedEvents[1].events[3].value);

    assert.equal(help.lif2LifWei(1000), await token.allowance(accounts[1], message.contract.address));

    await help.checkToken(token, accounts, 10000000, [4000000,3000000,2000000,1000000,0]);
  });

  it("should fail transferData when using LifToken contract address as receiver", async function() {
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts);

    try {
      await token.transferData(token.contract.address, help.lif2LifWei(1000), web3.toHex(0), true, {from: accounts[1]});
    } catch (error) {
      if (error.message.search('invalid JUMP') == -1) throw error;
    }

    await help.checkToken(token, accounts, 10000000, [4000000,3000000,2000000,1000000,0]);
  });

  it("should fail transferDataFrom when using LifToken contract address as receiver", async function() {
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts);

    await token.approve(accounts[1], help.lif2LifWei(1000), {from: accounts[3]});

    try {
      await token.transferDataFrom(accounts[3], token.contract.address, help.lif2LifWei(1000), web3.toHex(0), true, {from: accounts[1]});
    } catch (error) {
      if (error.message.search('invalid JUMP') == -1) throw error;
    }

    await help.checkToken(token, accounts, 10000000, [4000000,3000000,2000000,1000000,0]);
  });

  /*
   * TODO: should we prevent transfers to the LifToken contract again?
   * We started allowing this transfers so the crowdsale can return the unused
   * tokens to the LifToken, but we might want to disallow it in the future
   * in which case this test should be uncommented
  it("should fail transfer when using LifToken contract address as receiver", async function() {
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts);

    try {
      await token.transfer(token.contract.address, help.lif2LifWei(1000), {from: accounts[1]});
      assert.equal(false, true, "transfer should have failed because LifToken should not receive tokens");
    } catch (error) {
      if (error.message.search('invalid JUMP') == -1) throw error;
    }

    await help.checkToken(token, accounts, 10000000, [4000000,3000000,2000000,1000000,0]);
  });
  */

  it("should fail transferFrom when using LifToken contract address as receiver", async function() {
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts);

    await token.approve(accounts[1], help.lif2LifWei(1000), {from: accounts[3]});

    try {
      await token.transferFrom(accounts[3], token.contract.address, help.lif2LifWei(1000), {from: accounts[1]});
    } catch (error) {
      if (error.message.search('invalid JUMP') == -1) throw error;
    }

    await help.checkToken(token, accounts, 10000000, [4000000,3000000,2000000,1000000,0]);
  });

  it("should fail to approve balance to LifToken contract address", async function() {
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts);

    try {
      await token.approve(token.contract.address, help.lif2LifWei(1000), {from: accounts[3]});
    } catch (error) {
      if (error.message.search('invalid JUMP') == -1) throw error;
    }

    await help.checkToken(token, accounts, 10000000, [4000000,3000000,2000000,1000000,0]);
  });

});
