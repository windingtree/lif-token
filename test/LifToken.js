
var protobuf = require("protobufjs");

var help = require("./helpers");

var LifToken = artifacts.require("./LifToken.sol");
var Message = artifacts.require("./Message.sol");

const LOG_EVENTS = false;

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
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts)
    await help.checkValues(token, accounts,1000000, 10000000, 0, [4000000,3000000,2000000,1000000,0]);
  });

  it("should be able to stop and resume the token", async function() {
    await token.stop();

    await help.addCrowdsaleStage(token, 10000000, price)[1];

    var price = web3.toWei(0.1, 'ether');

    assert.equal(await token.submitBid(accounts[1], 1000, { value: 1000*price, from: accounts[1]}),
      false, // TODO: this doesn't work of course, how can I assert that the tx failed?
      "submitBid fails because token is stopped");

    await token.resume();

    assert.equal(await token.submitBid(accounts[1], 1000, { value: 1000*price, from: accounts[1]}),
      true, // TODO: this doesn't work of course, how can I assert that the tx failed?
      "submitBid goes through because token is not stopped");
  });

  it("should return the correct allowance amount after approval", async function() {
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts)
    await token.approve(accounts[2], help.formatBalance(10),{ from: accounts[1] });
    let allowance = await token.allowance(accounts[1], accounts[2],{ from: accounts[1]});
    assert.equal(help.parseBalance(allowance), 10);
    await help.checkValues(token, accounts,1000000, 10000000, 0, [4000000,3000000,2000000,1000000,0]);
  });

  it("should return correct balances after transfer", async function() {
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts)
    await token.transfer(accounts[2], help.formatBalance(33.3), { from: accounts[1] });
    await help.checkValues(token, accounts,1000000, 10000000, 0, [3999966.7,3000033.3,2000000,1000000,0]);
  });

  it("should throw an error when trying to transfer more than balance", async function() {
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts)
    try {
      await token.transfer(accounts[2], help.formatBalance(4000001));
    } catch (error) {
      if (error.message.search('invalid JUMP') == -1) throw error;
    }
    await help.checkValues(token, accounts,1000000, 10000000, 0, [4000000,3000000,2000000,1000000,0]);
  });

  it("should return correct balances after transfering from another account", async function() {
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts)
    await token.approve(accounts[3], help.formatBalance(1000), {from: accounts[1]});
    await token.transferFrom(accounts[1], accounts[3], help.formatBalance(1000), {from: accounts[3]});
    await help.checkValues(token, accounts,1000000, 10000000, 0, [3999000,3000000,2001000,1000000,0]);
  });

  it("should throw an error when trying to transfer more than allowed", async function() {
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts)
    await token.approve(accounts[3], help.formatBalance(1000), {from: accounts[1]});
    try {
      await token.transferFrom(accounts[1], accounts[3], help.formatBalance(1001), {from: accounts[3]});
    } catch (error) {
      if (error.message.search('invalid JUMP') == -1) throw error;
    }
    await help.checkValues(token, accounts,1000000, 10000000, 0, [4000000,3000000,2000000,1000000,0]);
  });

  it("should return correct balances after transferData and show the right JSON data transfered", async function() {
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts)

    var dataEncoded = help.hexEncode(JSON.stringify({awesomeField:"AwesomeString"}));
    let transaction = await token.transferData(accounts[2], help.formatBalance(1000), dataEncoded, false, {from: accounts[1]});

    assert.equal(dataEncoded, web3.toAscii(transaction.logs[0].args.data));
    var decodedObj = JSON.parse(help.hexDecode( web3.toAscii(transaction.logs[0].args.data) ));
    assert.equal("AwesomeString", decodedObj.awesomeField);

    await help.checkValues(token, accounts,1000000, 10000000, 0, [3999000,3001000,2000000,1000000,0]);
  });

  it("should return correct balances after transferDataFrom and show the right JSON data transfered", async function() {
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts);

    await token.approve(accounts[3], help.formatBalance(1000), {from: accounts[1]});

    var dataEncoded = help.hexEncode(JSON.stringify({awesomeField:"AwesomeString"}));
    let transaction = await token.transferDataFrom(accounts[1], accounts[3], help.formatBalance(1000), dataEncoded, false, {from: accounts[3]});

    assert.equal(dataEncoded, web3.toAscii(transaction.logs[0].args.data));
    var decodedObj = JSON.parse(help.hexDecode( web3.toAscii(transaction.logs[0].args.data) ));
    assert.equal("AwesomeString", decodedObj.awesomeField);

    await help.checkValues(token, accounts,1000000, 10000000, 0, [3999000,3000000,2001000,1000000,0]);
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

    assert.equal(encodedHex, web3.toAscii(transaction.logs[0].args.data));

    var decodedBuffer = new Buffer(help.hexDecode( web3.toAscii(transaction.logs[0].args.data) ));
    assert.equal("AwesomeString", AwesomeMessage.decode(decodedBuffer).awesomeField);

    await help.checkValues(token, accounts,1000000, 10000000, 0, [4000000,3000000,2000000,1000000,0]);
  });

  it("should return correct balances after transferData and show the event on receiver contract", async function() {
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts);
    let message = await Message.new();
    let data = message.contract.showMessage.getData(web3.toHex(123456), 666, 'Transfer Done');

    let transaction = await token.transferData(message.contract.address, help.formatBalance(1000), data, true, {from: accounts[1]});

    assert.equal(2, transaction.receipt.logs.length);
    assert.equal(data, '0x'+transaction.receipt.logs[1].data.substring(194, data.length+192));
    assert.equal(data, transaction.logs[0].args.data);

    assert.equal(help.formatBalance(1000), await token.balanceOf(message.contract.address));

    await help.checkValues(token, accounts,1000000, 10000000, 0, [3999000,3000000,2000000,1000000,0]);
  });

  it("should return correct balances after transferDataFrom and show the event on receiver contract", async function() {
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts);
    let message = await Message.new();
    let messageReceiver = await Message.new();

    let data = messageReceiver.contract.showMessage.getData(web3.toHex(123456), 666, 'Transfer Done');

    await token.approve(message.contract.address, help.formatBalance(1000), {from: accounts[1]});

    let dataTransfer = token.contract.transferDataFrom.getData(accounts[1], messageReceiver.contract.address, help.formatBalance(1000), data, true);

    let transaction = await message.call(token.contract.address, dataTransfer);

    assert.equal(2, transaction.receipt.logs.length);
    assert.equal(data, '0x'+transaction.receipt.logs[1].data.substring(194, data.length+192));
    assert.equal('0x1e24000000000000000000000000000000000000000000000000000000000000', transaction.logs[0].args.b32);
    assert.equal(666, transaction.logs[0].args.number);
    assert.equal('Transfer Done', transaction.logs[0].args.text);
    assert.equal(help.formatBalance(1000), await token.balanceOf(messageReceiver.contract.address));

    await help.checkValues(token, accounts,1000000, 10000000, 0, [3999000,3000000,2000000,1000000,0]);
  });

  it("should fail transferData when using LifToken contract address as receiver", async function() {
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts);

    try {
      await token.transferData(token.contract.address, help.formatBalance(1000), web3.toHex(0), true, {from: accounts[1]});
    } catch (error) {
      if (error.message.search('invalid JUMP') == -1) throw error;
    }

    await help.checkValues(token, accounts,1000000, 10000000, 0, [4000000,3000000,2000000,1000000,0]);
  });

  it("should fail transferDataFrom when using LifToken contract address as receiver", async function() {
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts);

    await token.approve(accounts[1], help.formatBalance(1000), {from: accounts[3]});

    try {
      await token.transferDataFrom(accounts[3], token.contract.address, help.formatBalance(1000), web3.toHex(0), true, {from: accounts[1]});
    } catch (error) {
      if (error.message.search('invalid JUMP') == -1) throw error;
    }

    await help.checkValues(token, accounts,1000000, 10000000, 0, [4000000,3000000,2000000,1000000,0]);
  });

  it("should fail transfer when using LifToken contract address as receiver", async function() {
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts);

    try {
      await token.transfer(token.contract.address, help.formatBalance(1000), {from: accounts[1]});
    } catch (error) {
      if (error.message.search('invalid JUMP') == -1) throw error;
    }

    await help.checkValues(token, accounts,1000000, 10000000, 0, [4000000,3000000,2000000,1000000,0]);
  });

  it("should fail transferFrom when using LifToken contract address as receiver", async function() {
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts);

    await token.approve(accounts[1], help.formatBalance(1000), {from: accounts[3]});

    try {
      await token.transferFrom(accounts[3], token.contract.address, help.formatBalance(1000), {from: accounts[1]});
    } catch (error) {
      if (error.message.search('invalid JUMP') == -1) throw error;
    }

    await help.checkValues(token, accounts,1000000, 10000000, 0, [4000000,3000000,2000000,1000000,0]);
  });

  it("should fail to approve balance to LifToken contract address", async function() {
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts);

    try {
      await token.approve(token.contract.address, help.formatBalance(1000), {from: accounts[3]});
    } catch (error) {
      if (error.message.search('invalid JUMP') == -1) throw error;
    }

    await help.checkValues(token, accounts,1000000, 10000000, 0, [4000000,3000000,2000000,1000000,0]);
  });

});
