
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
    await token.transferFrom(accounts[1], accounts[3], help.formatBalance(1000), "", {from: accounts[3]});
    await help.checkValues(token, accounts,1000000, 10000000, 0, [3999000,3000000,2001000,1000000,0]);
  });

  it("should throw an error when trying to transfer more than allowed", async function() {
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts)
    await token.approve(accounts[3], help.formatBalance(1000), {from: accounts[1]});
    try {
      await token.transferFrom(accounts[1], accounts[3], help.formatBalance(1001), "", {from: accounts[3]});
    } catch (error) {
      if (error.message.search('invalid JUMP') == -1) throw error;
    }
    await help.checkValues(token, accounts,1000000, 10000000, 0, [4000000,3000000,2000000,1000000,0]);
  });

  it("should return correct balances after transferData and show the right JSON data transfered", async function() {
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts)
    var dataEncoded = help.hexEncode(JSON.stringify({awesomeField:"AwesomeString"}));
    let transaction = await token.transferData(accounts[2], help.formatBalance(1000), dataEncoded, {from: accounts[1]});
    var decodedObj = JSON.parse(help.hexDecode(transaction.logs[0].args.data));
    assert.equal("AwesomeString", decodedObj.awesomeField);
    await help.checkValues(token, accounts,1000000, 10000000, 0, [3999000,3001000,2000000,1000000,0]);
  });

  it("should return correct balances after transfer and show the right PROTOBUF data transfered", async function() {
    var AwesomeMessage, message, encodedBuffer, encodedHex;
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts)

    let awesomeRoot = await protobuf.load("test/awesome.proto");
    AwesomeMessage = awesomeRoot.lookup("awesomepackage.AwesomeMessage");
    message = AwesomeMessage.create({ awesomeField: "AwesomeString" });
    encodedBuffer = AwesomeMessage.encode(message).finish();
    encodedHex = help.hexEncode(encodedBuffer.toString());

    let transaction = await token.transferData(accounts[2], 0, encodedHex, {from: accounts[1]});
    var decodedBuffer = new Buffer(help.hexDecode(transaction.logs[0].args.data.toString()));
    assert.equal("AwesomeString", AwesomeMessage.decode(decodedBuffer).awesomeField);

    await help.checkValues(token, accounts,1000000, 10000000, 0, [4000000,3000000,2000000,1000000,0]);
  });

});
