
var protobuf = require("protobufjs");

var help = require("./helpers");

var LifToken = artifacts.require("./LifToken.sol");
var Message = artifacts.require("./Message.sol");

const LOG_EVENTS = true;

contract('LifToken', function(accounts) {

  var token;
  var eventsWatcher;

  beforeEach(function(done) {
    LifToken.new(web3.toWei(10, 'ether'), 10000, 2, 3, 5)
      .then(function(_token) {
        token = _token;
        eventsWatcher = token.allEvents();
        eventsWatcher.watch(function(error, log){
          if (LOG_EVENTS)
            console.log('Event:', log.event, ':',log.args);
        });
        done();
      });
  });

  afterEach(function(done) {
    eventsWatcher.stopWatching();
    done();
  });

  it("should simulate a crowdsale correctly", function(done) {
    help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts)
      .then(function() {
        return help.checkValues(token, accounts,1000000, 10000000, 0, [4000000,3000000,2000000,1000000,0]);
      }).then(function(){
        done();
      });
  });

  it("should return the correct allowance amount after approval", function(done) {
    help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts)
      .then(function() {
        return token.approve(accounts[2], help.formatBalance(10),{ from: accounts[1] });
      })
      .then(function() {
        return token.allowance(accounts[1], accounts[2],{ from: accounts[1]});
      })
      .then(function(allowance) {
        assert.equal(help.parseBalance(allowance), 10);
        return help.checkValues(token, accounts,1000000, 10000000, 0, [4000000,3000000,2000000,1000000,0]);
      }).then(function(){
        done();
      });
  });

  it("should return correct balances after transfer", function(done) {
    help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts)
      .then(function() {
        return token.transfer(accounts[2], help.formatBalance(33.3), { from: accounts[1] });
      })
      .then(function() {
        return help.checkValues(token, accounts,1000000, 10000000, 0, [3999966.7,3000033.3,2000000,1000000,0]);
      }).then(function(){
        done();
      });
  });

  it("should throw an error when trying to transfer more than balance", function(done) {
    help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts)
      .then(function() {
        return token.transfer(accounts[2], help.formatBalance(4000001));
      })
      .catch(function(error) {
        if (error.message.search('invalid JUMP') == -1) throw error;
      })
      .then(function() {
        return help.checkValues(token, accounts,1000000, 10000000, 0, [4000000,3000000,2000000,1000000,0]);
      }).then(function(){
        done();
      });
  });

  it("should return correct balances after transfering from another account", function(done) {
    help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts)
      .then(function() {
        return token.approve(accounts[3], help.formatBalance(1000), {from: accounts[1]});
      })
      .then(function() {
        return token.transferFrom(accounts[1], accounts[3], help.formatBalance(1000), "", {from: accounts[3]});
      })
      .then(function() {
        return help.checkValues(token, accounts,1000000, 10000000, 0, [3999000,3000000,2001000,1000000,0]);
      }).then(function(){
        done();
      });
  });

  it("should throw an error when trying to transfer more than allowed", function(done) {
    help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts)
      .then(function() {
        return token.approve(accounts[3], help.formatBalance(1000), {from: accounts[1]});
      })
      .then(function() {
        return token.transferFrom(accounts[1], accounts[3], help.formatBalance(1001), "", {from: accounts[3]});
      })
      .catch(function(error) {
        if (error.message.search('invalid JUMP') == -1) throw error;
      })
      .then(function() {
        return help.checkValues(token, accounts,1000000, 10000000, 0, [4000000,3000000,2000000,1000000,0]);
      }).then(function(){
        done();
      });
  });

  it("should return correct balances after transferData and show the right JSON data transfered", function(done) {
    help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts)
      .then(function() {
        var dataEncoded = help.hexEncode(JSON.stringify({awesomeField:"AwesomeString"}));
        return token.transferData(accounts[2], help.formatBalance(1000), dataEncoded, {from: accounts[1]});
      })
      .then(function(transaction) {
        var decodedObj = JSON.parse(help.hexDecode(transaction.logs[0].args.data));
        assert.equal("AwesomeString", decodedObj.awesomeField);
        return help.checkValues(token, accounts,1000000, 10000000, 0, [3999000,3001000,2000000,1000000,0]);
      }).then(function(){
        done();
      });
  });

  it("should return correct balances after transfer and show the right PROTOBUF data transfered", function(done) {
    var AwesomeMessage, message, encodedBuffer, encodedHex;
    help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts)
      .then(function() {
        return protobuf.load("test/awesome.proto");
      })
      .then(function(awesomeRoot) {
        AwesomeMessage = awesomeRoot.lookup("awesomepackage.AwesomeMessage");
        message = AwesomeMessage.create({ awesomeField: "AwesomeString" });
        encodedBuffer = AwesomeMessage.encode(message).finish();
        encodedHex = help.hexEncode(encodedBuffer.toString());
        return token.transferData(accounts[2], 0, encodedHex, {from: accounts[1]});
      })
      .then(function(transaction) {
        var decodedBuffer = new Buffer(help.hexDecode(transaction.logs[0].args.data.toString()));
        assert.equal("AwesomeString", AwesomeMessage.decode(decodedBuffer).awesomeField);
        return help.checkValues(token, accounts,1000000, 10000000, 0, [4000000,3000000,2000000,1000000,0]);
      }).then(function(){
        done();
      });
  });

});
