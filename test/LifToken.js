var protobuf = require("protobufjs");

String.prototype.hexEncode = function(){
    var hex, i;
    var result = "";
    for (i=0; i<this.length; i++) {
      hex = this.charCodeAt(i).toString(16);
      result += ("000"+hex).slice(-4);
    }
    return result;
};

String.prototype.hexDecode = function(){
    var j;
    var hexes = this.match(/.{1,4}/g) || [];
    var back = "";
    for(j = 0; j<hexes.length; j++) {
      back += String.fromCharCode(parseInt(hexes[j], 16));
    }
    return back;
};

const TOKEN_DECIMALS = 18;
const MAX_ACCOUNTS = 3;
const DEBUG_MODE = true;

function parseBalance(balance){
  return balance /Math.pow(10,TOKEN_DECIMALS);
}
function formatBalance(balance){
  return balance *Math.pow(10,TOKEN_DECIMALS);
}

contract('LifToken', function(accounts) {

  var _token;

  function checkValues (_totalSupply, _feesBalance, _tokenPrice, _tokenFee, _accounts, done) {
    var accountPromises = [];
    accountPromises.push( web3.eth.getBalance(_token.contract.address) );
    accountPromises.push( _token.totalSupply() );
    accountPromises.push( _token.feesBalance() );
    accountPromises.push( _token.tokenPrice() );
    accountPromises.push( _token.tokenFee() );

    for (var i = 0; i < _accounts.length; i++) {
      accountPromises.push( _token.balanceOf(accounts[i]) );
    }

    Promise.all(accountPromises).then(values => {

      if (DEBUG_MODE) {
        console.log('Contract Balance:', web3.fromWei(parseInt(values[0]), 'ether'), 'Ether;', parseInt(values[0], 'wei'), 'Wei');
        console.log('Total Supply:', parseBalance(values[1]));
        console.log('Fees Balance:', web3.fromWei(parseInt(values[2]), 'ether'), 'Ether;', parseInt(values[2], 'wei'), 'Wei');
        console.log('Token Price:', parseInt(values[3]));
        console.log('Token Fee:', parseInt(values[4]));

        for (var z = 5; z < values.length; z++) {
          console.log('Account['+(z-5)+']', accounts[z-5], ", Balance:", parseBalance(values[z]));
        }
      }

      assert.equal(parseBalance(values[1]), _totalSupply);
      assert.equal(web3.fromWei(parseInt(values[2])), _feesBalance);
      assert.equal(parseInt(values[3]), _tokenPrice);
      assert.equal(parseInt(values[4]), _tokenFee);

      for (var x = 5; x < values.length; x++) {
        assert.equal(parseBalance(values[x]), _accounts[x-5]);
      }

      done();
    }).catch(err => {
      done(err);
    });
  }

  it("should return the correct totalSupply after construction using createTokens", function(done) {
    return LifToken.new()
      .then(function(token) {
        _token = token;
        return _token.createTokens(accounts[0], {value: web3.toWei(1, 'ether')});
      })
      .then(function() {
        checkValues(1000, 0, 1000000000000000, 100, [1000, 0, 0], done);

      });
  });

  it("should return the correct totalSupply after construction and setPrice", function(done) {
    return LifToken.new()
      .then(function(token) {
        _token = token;
        return _token.setPrice(10000000000000000);
      })
      .then(function() {
        return web3.eth.sendTransaction({from: accounts[0], to: _token.contract.address, value: web3.toWei(1, 'ether')});
      })
      .then(function() {
        checkValues(100, 0, 10000000000000000, 100, [100, 0, 0], done);
      });
  });

  it("shouldnt allow to buy sending an incorrect amount of ethers", function(done) {
    return LifToken.new()
      .then(function(token) {
        _token = token;
        return web3.eth.sendTransaction({from: accounts[0], to: _token.contract.address, value: web3.toWei(0.333333, 'ether')});
      })
      .catch(function(error) {
        if (error.message.search('invalid JUMP') == -1) throw error;
      })
      .then(function() {
        checkValues(0, 0, 1000000000000000, 100, [0, 0, 0], done);
      });
  });

  it("should return the correct allowance amount after approval", function(done) {
    return LifToken.new()
      .then(function(token) {
        _token = token;
        return web3.eth.sendTransaction({from: accounts[0], to: _token.contract.address, value: web3.toWei(1, 'ether')});
      })
      .then(function() {
        return _token.approve(accounts[1], formatBalance(100));
      })
      .then(function() {
        return _token.allowance(accounts[0], accounts[1]);
      })
      .then(function(allowance) {
        assert.equal(parseBalance(allowance), 100);
        checkValues(1000, 0, 1000000000000000, 100, [1000, 0, 0], done);
      });
  });

  it("should return correct balances after transfer", function(done) {
    return LifToken.new()
      .then(function(token) {
        _token = token;
        return web3.eth.sendTransaction({from: accounts[0], to: _token.contract.address, value: web3.toWei(0.1, 'ether')});
      })
      .then(function() {
        return _token.transfer(accounts[1], formatBalance(33), "");
      })
      .then(function() {
        checkValues(99.67, 0.000000000000000003, 1000000000000000, 100, [67, 32.67, 0], done);
      });
  });

  it("should return correct feesBalance after setFee and transfer", function(done) {
    return LifToken.new()
      .then(function(token) {
        _token = token;
        return _token.setFee(50);
      })
      .then(function() {
        return web3.eth.sendTransaction({from: accounts[0], to: _token.contract.address, value: web3.toWei(0.1, 'ether')});
      })
      .then(function() {
        return _token.transfer(accounts[1], formatBalance(33), "");
      })
      .then(function() {
        checkValues(99.34, 0.000000000000000006, 1000000000000000, 50, [67, 32.34, 0], done);
      });
  });

  it("should throw an error when trying to transfer more than balance", function(done) {
    return LifToken.new()
      .then(function(token) {
        _token = token;
        return web3.eth.sendTransaction({from: accounts[0], to: _token.contract.address, value: web3.toWei(0.1, 'ether')});
      })
      .then(function() {
        return _token.transfer(accounts[1], formatBalance(101), "");
      })
      .catch(function(error) {
        if (error.message.search('invalid JUMP') == -1) throw error;
      })
      .then(function() {
        checkValues(100, 0, 1000000000000000, 100, [100, 0, 0], done);
      });
  });

  it("should return correct balances after transfering from another account", function(done) {
    return LifToken.new()
      .then(function(token) {
        _token = token;
        return web3.eth.sendTransaction({from: accounts[0], to: _token.contract.address, value: web3.toWei(0.1, 'ether')});
      })
      .then(function() {
        return _token.approve(accounts[1], formatBalance(100));
      })
      .then(function() {
        return _token.transferFrom(accounts[0], accounts[2], formatBalance(100), "", {from: accounts[1]});
      })
      .then(function() {
        checkValues(99, 0.000000000000000001, 1000000000000000, 100, [0, 0, 99], done);
      });
  });

  it("should throw an error when trying to transfer more than allowed", function(done) {
    return LifToken.new()
      .then(function(token) {
        _token = token;
        return web3.eth.sendTransaction({from: accounts[0], to: _token.contract.address, value: web3.toWei(0.1, 'ether')});
      })
      .then(function() {
        return _token.approve(accounts[1], formatBalance(99));
      })
      .then(function() {
        return _token.transferFrom(accounts[0], accounts[2], formatBalance(100), "", {from: accounts[1]});
      })
      .catch(function(error) {
        if (error.message.search('invalid JUMP') == -1) throw error;
      })
      .then(function() {
        checkValues(100, 0, 1000000000000000, 100, [100, 0, 0], done);
      });
  });

  it("should throw an error to avoid issue more tokens than the max supply ", function(done) {
    return LifToken.new()
      .then(function(token) {
        _token = token;
        return web3.eth.sendTransaction({from: accounts[0], to: _token.contract.address, value: web3.toWei(10001, 'ether')});
      })
      .catch(function(error) {
        if (error.message.search('invalid JUMP') == -1) throw error;
      })
      .then(function() {
        checkValues(0, 0, 1000000000000000, 100, [0, 0, 0], done);
      });
  });

  it("should return correct balances after transfer and show the right JSON data transfered", function(done) {
    var _events;
    return LifToken.new()
      .then(function(token) {
        _token = token;
        events = _token.allEvents();
        return web3.eth.sendTransaction({from: accounts[0], to: _token.contract.address, value: web3.toWei(0.1, 'ether')});
      })
      .then(function() {
        var dataParsed = JSON.stringify({awesomeField:"AwesomeString"}).hexEncode();
        return _token.transfer(accounts[1], formatBalance(100), dataParsed);
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
        checkValues(99, 0.000000000000000001, 1000000000000000, 100, [0, 99, 0], done);
      });
  });

  it("should return correct balances after transfer and show the right PROTOBUF data transfered", function(done) {
    var _events, AwesomeMessage, message, encodedBuffer, encodedHex;
    return LifToken.new()
      .then(function(token) {
        _token = token;
        events = _token.allEvents();
        return web3.eth.sendTransaction({from: accounts[0], to: _token.contract.address, value: web3.toWei(0.1, 'ether')});
      })
      .then(function() {
        return protobuf.load("test/awesome.proto");
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
      .then(function() {
        checkValues(100, 0, 1000000000000000, 100, [100, 0, 0], done);
      });
  });

});
