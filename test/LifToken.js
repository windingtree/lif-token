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
        return _token.transfer(accounts[1], 100);
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
        return _token.transfer(accounts[1], 101);
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
        return _token.transferFrom(accounts[0], accounts[2], 100, {from: accounts[1]});
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
        return _token.transferFrom(accounts[0], accounts[2], 100, {from: accounts[1]});
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

});
