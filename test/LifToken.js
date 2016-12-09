var protobuf = require("protobufjs");

String.prototype.hexEncode = function(){
    var hex, i;
    var result = "";
    for (i=0; i<this.length; i++) {
        hex = this.charCodeAt(i).toString(16);
        result += ("000"+hex).slice(-4);
    }
    return result
}

String.prototype.hexDecode = function(){
    var j;
    var hexes = this.match(/.{1,4}/g) || [];
    var back = "";
    for(j = 0; j<hexes.length; j++) {
        back += String.fromCharCode(parseInt(hexes[j], 16));
    }
    return back;
}

contract('LifToken', function(accounts) {

  it("should return the correct totalSupply after construction", function(done) {
    var _token;
    return LifToken.new()
      .then(function(token) {
        _token = token;
        return token.totalSupply();
      })
      .then(function(totalSupply) {
        assert.equal(parseInt(totalSupply), 0);
      })
      .then(function() {
        return web3.eth.sendTransaction({from: accounts[0], to: _token.contract.address, value: web3.toWei(1, 'ether')});
      })
      .then(function() {
        return _token.totalSupply();
      })
      .then(function(totalSupply) {
        assert.equal(parseInt(totalSupply), 1000);
      })
      .then(done);
  });

  it("shouldt allow to buy sending an incorrect amount of ethers", function(done) {
    var _token;
    return LifToken.new()
      .then(function(token) {
        _token = token;
        return token.totalSupply();
      })
      .then(function(totalSupply) {
        assert.equal(parseInt(totalSupply), 0);
      })
      .then(function() {
        return web3.eth.sendTransaction({from: accounts[0], to: _token.contract.address, value: web3.toWei(0.333333, 'ether')});
      })
      .catch(function(error) {
        if (error.message.search('invalid JUMP') == -1) throw error
      })
      .then(function() {
        return _token.totalSupply();
      })
      .then(function(totalSupply) {
        assert.equal(parseInt(totalSupply), 0);
      })
      .then(done);
  });

  it("should return the correct allowance amount after approval", function(done) {
    var _token;
    return LifToken.new()
      .then(function(token) {
        _token = token;
        return token.totalSupply();
      })
      .then(function(totalSupply) {
        assert.equal(parseInt(totalSupply), 0);
      })
      .then(function() {
        return web3.eth.sendTransaction({from: accounts[0], to: _token.contract.address, value: web3.toWei(1, 'ether')});
      })
      .then(function() {
        return _token.totalSupply();
      })
      .then(function(totalSupply) {
        assert.equal(parseInt(totalSupply), 1000);
      })
      .then(function() {
        return _token.approve(accounts[1], 100);
      })
      .then(function() {
        return _token.allowance(accounts[0], accounts[1]);
      })
      .then(function(allowance) {
        assert.equal(allowance, 100);
      })
      .then(done);
  });

  it("should return correct balances after transfer", function(done) {
    var _token;
    return LifToken.new()
      .then(function(token) {
        _token = token;
        return token.totalSupply();
      })
      .then(function(totalSupply) {
        assert.equal(parseInt(totalSupply), 0);
      })
      .then(function() {
        return web3.eth.sendTransaction({from: accounts[0], to: _token.contract.address, value: web3.toWei(0.1, 'ether')});
      })
      .then(function() {
        return _token.transfer(accounts[1], 100, "");
      })
      .then(function() {
        return _token.balanceOf(accounts[0]);
      })
      .then(function(balance) {
        assert.equal(balance, 0);
      })
      .then(function() {
        return _token.balanceOf(accounts[1]);
      })
      .then(function(balance) {
        assert.equal(balance, 100);
      })
      .then(done);
  });

  it("should throw an error when trying to transfer more than balance", function(done) {
    var _token;
    return LifToken.new()
      .then(function(token) {
        _token = token;
        return token.totalSupply();
      })
      .then(function(totalSupply) {
        assert.equal(parseInt(totalSupply), 0);
      })
      .then(function() {
        return web3.eth.sendTransaction({from: accounts[0], to: _token.contract.address, value: web3.toWei(0.1, 'ether')});
      })
      .then(function() {
        return _token.transfer(accounts[1], 101, "");
      })
      .catch(function(error) {
        if (error.message.search('invalid JUMP') == -1) throw error
      })
      .then(done);
  });

  it("should return correct balances after transfering from another account", function(done) {
    var _token;
    return LifToken.new()
      .then(function(token) {
        _token = token;
        return token.totalSupply();
      })
      .then(function(totalSupply) {
        assert.equal(parseInt(totalSupply), 0);
      })
      .then(function() {
        return web3.eth.sendTransaction({from: accounts[0], to: _token.contract.address, value: web3.toWei(0.1, 'ether')});
      })
      .then(function() {
        return _token.approve(accounts[1], 100);
      })
      .then(function() {
        return _token.transferFrom(accounts[0], accounts[2], 100, "", {from: accounts[1]});
      })
      .then(function() {
        return _token.balanceOf(accounts[0]);
      })
      .then(function(balance) {
        assert.equal(balance, 0);
        return _token.balanceOf(accounts[2]);
      })
      .then(function(balance) {
        assert.equal(balance, 100)
        return _token.balanceOf(accounts[1]);
      })
      .then(function(balance) {
        assert.equal(balance, 0);
      })
      .then(done);
  });

  it("should throw an error when trying to transfer more than allowed", function(done) {
    var _token;
    return LifToken.new()
      .then(function(token) {
        _token = token;
        return token.totalSupply();
      })
      .then(function(totalSupply) {
        assert.equal(parseInt(totalSupply), 0);
      })
      .then(function() {
        return web3.eth.sendTransaction({from: accounts[0], to: _token.contract.address, value: web3.toWei(0.1, 'ether')});
      })
      .then(function() {
        return _token.approve(accounts[1], 99);
      })
      .then(function() {
        return _token.transferFrom(accounts[0], accounts[2], 100, "", {from: accounts[1]});
      })
      .catch(function(error) {
        if (error.message.search('invalid JUMP') == -1) throw error
      })
      .then(done);
  });

  it("should throw an error to avoid issue more tokens tahn the max supply ", function(done) {
    var _token;
    return LifToken.new()
      .then(function(token) {
        _token = token;
        return token.totalSupply();
      })
      .then(function(totalSupply) {
        assert.equal(parseInt(totalSupply), 0);
      })
      .then(function() {
        return web3.eth.sendTransaction({from: accounts[0], to: _token.contract.address, value: web3.toWei(10001, 'ether')});
      })
      .catch(function(error) {
        if (error.message.search('invalid JUMP') == -1) throw error
      })
      .then(function() {
        return _token.totalSupply();
      })
      .then(function(totalSupply) {
        assert.equal(parseInt(totalSupply), 0);
      })
      .then(done);
  });

  it("should return correct balances after transfer and show the right JSON data transfered", function(done) {
    var _token, _events;
    return LifToken.new()
      .then(function(token) {
        _token = token;
        events = _token.allEvents();
        return token.totalSupply();
      })
      .then(function(totalSupply) {
        assert.equal(parseInt(totalSupply), 0);
      })
      .then(function() {
        return web3.eth.sendTransaction({from: accounts[0], to: _token.contract.address, value: web3.toWei(0.1, 'ether')});
      })
      .then(function() {
        var dataParsed = JSON.stringify({awesomeField:"AwesomeString"}).hexEncode();
        return _token.transfer(accounts[1], 100, dataParsed);
      })
      .then(function() {
        events.get(function(error, log){
          assert.equal(error, null);
          var decodedObj = JSON.parse(log[0].args.data.toString().hexDecode());
          assert.equal("AwesomeString", decodedObj.awesomeField);
          return;
        });
      })
      .then(function() {
        return _token.balanceOf(accounts[0]);
      })
      .then(function(balance) {
        assert.equal(balance, 0);
      })
      .then(function() {
        return _token.balanceOf(accounts[1]);
      })
      .then(function(balance) {
        assert.equal(balance, 100);
      })
      .then(done);
  });

  it("should return correct balances after transfer and show the right PROTOBUF data transfered", function(done) {
    var _token, _events, AwesomeMessage, message, encodedBuffer, encodedHex;
    return LifToken.new()
      .then(function(token) {
        _token = token;
        events = _token.allEvents();
        return token.totalSupply();
      })
      .then(function(totalSupply) {
        assert.equal(parseInt(totalSupply), 0);
      })
      .then(function() {
        return web3.eth.sendTransaction({from: accounts[0], to: _token.contract.address, value: web3.toWei(0.1, 'ether')});
      })
      .then(function() {
        return protobuf.load("test/awesome.proto")
      })
      .then(function(awesomeRoot) {
        AwesomeMessage = awesomeRoot.lookup("awesomepackage.AwesomeMessage");
        message = AwesomeMessage.create({ awesomeField: "AwesomeString" });
        encodedBuffer = AwesomeMessage.encode(message).finish();
        encodedHex = encodedBuffer.toString().hexEncode();
        return _token.transfer(accounts[1], 0, encodedHex);
      })
      .then(function() {
        events.get(function(error, log){
          assert.equal(error, null);
          var decodedBuffer = new Buffer(log[0].args.data.toString().hexDecode());
          assert.equal("AwesomeString", AwesomeMessage.decode(decodedBuffer).awesomeField);
          return;
        });
      })
      .then(function(balance) {
        return _token.balanceOf(accounts[0]);
      })
      .then(function(balance) {
        assert.equal(balance, 100);
      })
      .then(function() {
        return _token.balanceOf(accounts[1]);
      })
      .then(function(balance) {
        assert.equal(balance, 0);
      })
      .then(done);
  });

});
