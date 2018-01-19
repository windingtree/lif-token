var help = require('./helpers');
var _ = require('lodash');

var BigNumber = web3.BigNumber;
var ethjsABI = require('ethjs-abi');

require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

var LifToken = artifacts.require('LifToken.sol');
var Message = artifacts.require('Message.sol');

const LOG_EVENTS = true;

contract('LifToken', function (accounts) {
  var token;
  var eventsWatcher;

  function findMethod (abi, name, args) {
    for (var i = 0; i < abi.length; i++) {
      const methodArgs = _.map(abi[i].inputs, 'type').join(',');
      if ((abi[i].name === name) && (methodArgs === args)) {
        return abi[i];
      }
    }
  }

  beforeEach(async function () {
    const rate = 100000000000;
    const crowdsale = await help.simulateCrowdsale(rate, [40, 30, 20, 10, 0], accounts, 1);
    token = LifToken.at(await crowdsale.token.call());
    eventsWatcher = token.allEvents();
    eventsWatcher.watch(function (error, log) {
      if (LOG_EVENTS) {
        if (error) {
          console.log('Error in event:', error);
        } else {
          console.log('Event:', log.event, ':', log.args);
        }
      }
    });
  });

  afterEach(function (done) {
    eventsWatcher.stopWatching();
    done();
  });

  it('has name, symbol and decimals', async function () {
    assert.equal('Líf', await token.NAME.call());
    assert.equal('LIF', await token.SYMBOL.call());
    assert.equal(18, await token.DECIMALS.call());
  });

  it('should return the correct allowance amount after approval', async function () {
    await token.approve(accounts[2], help.lif2LifWei(10), { from: accounts[1] });
    let allowance = await token.allowance(accounts[1], accounts[2], { from: accounts[1] });
    assert.equal(help.lifWei2Lif(allowance), 10);
    await help.checkToken(token, accounts, 125, [40, 30, 20, 10, 0]);
  });

  it('should return correct balances after transfer', async function () {
    await token.transfer(accounts[4], help.lif2LifWei(3.55), { from: accounts[1] });
    await help.checkToken(token, accounts, 125, [36.45, 30, 20, 13.55, 0]);
  });

  it('should throw an error when trying to transfer more than balance', async function () {
    try {
      await token.transfer(accounts[2], help.lif2LifWei(21));
      assert(false, 'transfer should have thrown');
    } catch (error) {
      if (!help.isInvalidOpcodeEx(error)) throw error;
    }
    await help.checkToken(token, accounts, 125, [40, 30, 20, 10, 0]);
  });

  it('should return correct balances after transfering from another account', async function () {
    await token.approve(accounts[3], help.lif2LifWei(5), { from: accounts[1] });
    await token.transferFrom(accounts[1], accounts[2], help.lif2LifWei(5), { from: accounts[3] });
    await help.checkToken(token, accounts, 125, [35, 35, 20, 10, 0]);
  });

  it('should throw an error when trying to transfer more than allowed', async function () {
    await token.approve(accounts[3], help.lif2LifWei(10), { from: accounts[1] });
    try {
      await token.transferFrom(accounts[1], accounts[3], help.lif2LifWei(11), { from: accounts[3] });
      assert(false, 'transferFrom should have thrown');
    } catch (error) {
      if (!help.isInvalidOpcodeEx(error)) throw error;
    }
    await help.checkToken(token, accounts, 125, [40, 30, 20, 10, 0]);
  });

  _.forEach([0, 1], function (tokens) {
    it('should return correct balances after transfer with ' + tokens + ' tokens and show the event on receiver contract', async function () {
      let messageContract = (await Message.new()).contract;
      help.abiDecoder.addABI(Message._json.abi);

      let data = messageContract.showMessage.getData(web3.toHex(123456), 666, 'Transfer Done');
      const abiMethod = findMethod(token.abi, 'transfer', 'address,uint256,bytes');
      const transferData = ethjsABI.encodeMethod(abiMethod,
        [messageContract.address, help.lif2LifWei(tokens), data]
      );
      let transaction = await token.sendTransaction(
        { from: accounts[1], data: transferData }
      );

      let decodedEvents = help.abiDecoder.decodeLogs(transaction.receipt.logs);

      assert.deepEqual(['Transfer', 'Show'], _.map(decodedEvents, (e) => e.name),
        'triggered a Show event in Message and Transfer in the token');

      assert.deepEqual(
        [accounts[1], messageContract.address, help.lif2LifWei(tokens)],
        _.map(decodedEvents[0].events, (e) => e.value),
        'triggered the correct Transfer event'
      );

      assert.equal(help.lif2LifWei(tokens), await token.balanceOf(messageContract.address));

      await help.checkToken(token, accounts, 125, [40 - tokens, 30, 20, 10, 0]);
    });
  });

  _.forEach([0, 1], function (tokens) {
    it('should return correct balances after transferFrom with ' + tokens + ' tokens and show the event on receiver contract', async function () {
      let messageContract = (await Message.new()).contract;
      help.abiDecoder.addABI(Message._json.abi);

      const lifWei = help.lif2LifWei(tokens);

      await token.approve(accounts[2], lifWei, { from: accounts[1] });

      let data = messageContract.showMessage.getData(web3.toHex(123456), 666, 'Transfer Done');
      const abiMethod = findMethod(token.abi, 'transferFrom', 'address,address,uint256,bytes');
      const transferFromData = ethjsABI.encodeMethod(abiMethod,
        [accounts[1], messageContract.address, lifWei, data]
      );
      let transaction = await token.sendTransaction(
        { from: accounts[2], data: transferFromData }
      );

      let decodedEvents = help.abiDecoder.decodeLogs(transaction.receipt.logs);

      assert.deepEqual(['Transfer', 'Show'], _.map(decodedEvents, (e) => e.name));
      assert.equal(lifWei, await token.balanceOf(messageContract.address));

      await help.checkToken(token, accounts, 125, [40 - tokens, 30, 20, 10, 0]);
    });
  });

  it('should return correct balances after approve and show the event on receiver contract', async function () {
    let messageContract = (await Message.new()).contract;
    help.abiDecoder.addABI(Message._json.abi);

    let data = messageContract.showMessage.getData(web3.toHex(123456), 666, 'Transfer Done');
    const abiMethod = findMethod(token.abi, 'approve', 'address,uint256,bytes');
    const approveData = ethjsABI.encodeMethod(abiMethod,
      [messageContract.address, help.lif2LifWei(1000), data]
    );
    let transaction = await token.sendTransaction(
      { from: accounts[1], data: approveData }
    );

    let decodedEvents = help.abiDecoder.decodeLogs(transaction.receipt.logs);

    assert.equal(2, decodedEvents.length);

    new BigNumber(help.lif2LifWei(1000)).should.be.bignumber.equal(await token.allowance(accounts[1], messageContract.address));

    await help.checkToken(token, accounts, 125, [40, 30, 20, 10, 0]);
  });

  it('should fail inside approve', async function () {
    let messageContract = (await Message.new()).contract;
    help.abiDecoder.addABI(Message._json.abi);

    let data = messageContract.fail.getData();
    const abiMethod = findMethod(token.abi, 'approve', 'address,uint256,bytes');
    const approveData = ethjsABI.encodeMethod(abiMethod,
      [messageContract.address, help.lif2LifWei(10), data]
    );

    try {
      await token.sendTransaction(
        { from: accounts[1], data: approveData }
      );
      assert(false, 'approve should have raised');
    } catch (e) {
      assert(help.isInvalidOpcodeEx(e));
    }

    // approval should not have gone through so allowance is still 0
    new BigNumber(0).should.be.bignumber
      .equal(await token.allowance(accounts[1], messageContract.address));

    await help.checkToken(token, accounts, 125, [40, 30, 20, 10, 0]);
  });

  it('should fail inside transfer', async function () {
    let messageContract = (await Message.new()).contract;
    help.abiDecoder.addABI(Message._json.abi);

    let data = messageContract.fail.getData();
    const abiMethod = findMethod(token.abi, 'transfer', 'address,uint256,bytes');
    const transferData = ethjsABI.encodeMethod(abiMethod,
      [messageContract.address, help.lif2LifWei(10), data]
    );
    try {
      await token.sendTransaction({ from: accounts[1], data: transferData });
      assert(false, 'transfer should have failed');
    } catch (e) {
      assert(help.isInvalidOpcodeEx(e));
    }

    // transfer should not have gone through, so balance is still 0
    new BigNumber(0).should.be.bignumber
      .equal(await token.balanceOf(messageContract.address));

    await help.checkToken(token, accounts, 125, [40, 30, 20, 10, 0]);
  });

  it('should fail inside transferFrom', async function () {
    let messageContract = (await Message.new()).contract;
    help.abiDecoder.addABI(Message._json.abi);

    await token.approve(accounts[1], help.lif2LifWei(10), { from: accounts[2] });

    let data = messageContract.fail.getData();
    const abiMethod = findMethod(token.abi, 'transferFrom', 'address,address,uint256,bytes');
    const transferFromData = ethjsABI.encodeMethod(abiMethod,
      [accounts[2], messageContract.address, help.lif2LifWei(10), data]
    );
    try {
      await token.sendTransaction({ from: accounts[1], data: transferFromData });
      assert(false, 'transferFrom should have thrown');
    } catch (e) {
      assert(help.isInvalidOpcodeEx(e));
    }

    // transferFrom should have failed so balance is still 0 but allowance is 10
    new BigNumber(help.lif2LifWei(10)).should.be.bignumber
      .equal(await token.allowance(accounts[2], accounts[1]));
    new BigNumber(0).should.be.bignumber
      .equal(await token.balanceOf(messageContract.address));

    await help.checkToken(token, accounts, 125, [40, 30, 20, 10, 0]);
  });

  it('should fail transfer when using LifToken contract address as receiver', async function () {
    let messageContract = (await Message.new()).contract;
    let data = messageContract.showMessage.getData(web3.toHex(123456), 666, 'Transfer Done');
    const abiMethod = findMethod(token.abi, 'transfer', 'address,uint256,bytes');
    const transferData = ethjsABI.encodeMethod(abiMethod,
      [token.contract.address, help.lif2LifWei(1000), data]
    );

    try {
      await token.sendTransaction({ from: accounts[1], getData: transferData });
      assert(false, 'transfer should have thrown');
    } catch (error) {
      if (!help.isInvalidOpcodeEx(error)) throw error;
    }

    await help.checkToken(token, accounts, 125, [40, 30, 20, 10, 0]);
  });

  it('should fail approve when using LifToken contract address as spender', async function () {
    let messageContract = (await Message.new()).contract;
    let data = messageContract.showMessage.getData(web3.toHex(123456), 666, 'Transfer Done');
    const abiMethod = findMethod(token.abi, 'approve', 'address,uint256,bytes');
    const approveData = ethjsABI.encodeMethod(abiMethod,
      [token.contract.address, help.lif2LifWei(1), data]
    );

    try {
      await token.sendTransaction({ from: accounts[1], getData: approveData });
      assert(false, 'approve should have thrown');
    } catch (error) {
      if (!help.isInvalidOpcodeEx(error)) throw error;
    }

    await help.checkToken(token, accounts, 125, [40, 30, 20, 10, 0]);
  });

  it('should fail transferFrom when using LifToken contract address as receiver', async function () {
    let messageContract = (await Message.new()).contract;
    await token.approve(accounts[1], help.lif2LifWei(1), { from: accounts[3] });
    let data = messageContract.showMessage.getData(web3.toHex(123456), 666, 'Transfer Done');
    const abiMethod = findMethod(token.abi, 'transferFrom', 'address,address,uint256,bytes');
    const transferFromData = ethjsABI.encodeMethod(abiMethod,
      [accounts[3], token.contract.address, help.lif2LifWei(1), data]
    );
    try {
      await token.sendTransaction({ from: accounts[1], getData: transferFromData });
      assert(false, 'transferFrom should have thrown');
    } catch (error) {
      if (!help.isInvalidOpcodeEx(error)) throw error;
    }

    await help.checkToken(token, accounts, 125, [40, 30, 20, 10, 0]);
  });

  it('can burn tokens', async function () {
    let totalSupply = await token.totalSupply.call();
    new BigNumber(0).should.be.bignumber.equal(await token.balanceOf(accounts[5]));

    let initialBalance = web3.toWei(1);
    await token.transfer(accounts[5], initialBalance, { from: accounts[1] });
    initialBalance.should.be.bignumber.equal(await token.balanceOf(accounts[5]));

    let burned = web3.toWei(0.3);

    assert.equal(accounts[0], await token.owner());

    // pause the token
    await token.pause({ from: accounts[0] });

    try {
      await token.burn(burned, { from: accounts[5] });
      assert(false, 'burn should have thrown');
    } catch (error) {
      if (!help.isInvalidOpcodeEx(error)) throw error;
    }
    await token.unpause({ from: accounts[0] });

    // now burn should work
    await token.burn(burned, { from: accounts[5] });

    new BigNumber(initialBalance).minus(burned)
      .should.be.bignumber.equal(await token.balanceOf(accounts[5]));
    totalSupply.minus(burned).should.be.bignumber.equal(await token.totalSupply.call());
  });
});
