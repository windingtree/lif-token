var help = require('../helpers');
var _ = require('lodash');

var BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

var LifToken = artifacts.require('./token/mocks/LifTokenMock.sol');
var Message = artifacts.require('./Message.sol');

contract('LifToken', function (accounts) {
  var token;

  beforeEach(async function () {
    token = await LifToken.new(
      [help.lif2LifWei(40), help.lif2LifWei(30), help.lif2LifWei(20), help.lif2LifWei(10)],
      [accounts[1], accounts[2], accounts[3], accounts[4]]
    );
  });

  afterEach(function (done) {
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
    await help.checkToken(token, accounts, 100, [40, 30, 20, 10, 0]);
  });

  it('should return correct balances after transfer', async function () {
    await token.transfer(accounts[4], help.lif2LifWei(3.55), { from: accounts[1] });
    await help.checkToken(token, accounts, 100, [36.45, 30, 20, 13.55, 0]);
  });

  it('should throw an error when trying to transfer more than balance', async function () {
    try {
      await token.transfer(accounts[2], help.lif2LifWei(21), { from: accounts[0] });
      assert(false, 'transfer should have thrown');
    } catch (error) {
      if (!help.isInvalidOpcodeEx(error)) throw error;
    }
    await help.checkToken(token, accounts, 100, [40, 30, 20, 10, 0]);
  });

  it('should return correct balances after transfering from another account', async function () {
    await token.approve(accounts[3], help.lif2LifWei(5), { from: accounts[1] });
    await token.transferFrom(accounts[1], accounts[2], help.lif2LifWei(5), { from: accounts[3] });
    await help.checkToken(token, accounts, 100, [35, 35, 20, 10, 0]);
  });

  it('should throw an error when trying to transfer more than allowed', async function () {
    await token.approve(accounts[3], help.lif2LifWei(10), { from: accounts[1] });
    try {
      await token.transferFrom(accounts[1], accounts[3], help.lif2LifWei(11), { from: accounts[3] });
      assert(false, 'transferFrom ERC827 should have thrown');
    } catch (error) {
      if (!help.isInvalidOpcodeEx(error)) throw error;
    }
    await help.checkToken(token, accounts, 100, [40, 30, 20, 10, 0]);
  });

  _.forEach([0, 1], function (tokens) {
    it.skip('should return correct balances after transfer ERC827 with ' + tokens + ' tokens and show the event on receiver contract', async function () {
      let message = await Message.new();
      help.abiDecoder.addABI(Message._json.abi);

      let data = message.contract.showMessage.getData(web3.toHex(123456), 666, 'Transfer Done');

      let transaction = await token.transferAndCall(
        message.contract.address, help.lif2LifWei(tokens), data, { from: accounts[1] }
      );
      let decodedEvents = help.abiDecoder.decodeLogs(transaction.receipt.logs);

      assert.deepEqual(['Transfer', 'Show'], _.map(decodedEvents, (e) => e.name),
        'triggered a Show event in Message and Transfer in the token');

      assert.deepEqual(
        [accounts[1], message.contract.address, help.lif2LifWei(tokens)],
        _.map(decodedEvents[0].events, (e) => e.value),
        'triggered the correct Transfer event'
      );

      assert.equal(help.lif2LifWei(tokens), await token.balanceOf(message.contract.address));

      await help.checkToken(token, accounts, 100, [40 - tokens, 30, 20, 10, 0]);
    });
  });

  _.forEach([0, 1], function (tokens) {
    it.skip('should return correct balances after transferFrom ERC827 with ' + tokens + ' tokens and show the event on receiver contract', async function () {
      let message = await Message.new();
      help.abiDecoder.addABI(Message._json.abi);

      let data = message.contract.showMessage.getData(web3.toHex(123456), 666, 'Transfer Done');

      const lifWei = help.lif2LifWei(tokens);

      await token.approve(accounts[2], lifWei, { from: accounts[1] });

      let transaction = await token.transferFromAndCall(
        accounts[1], message.contract.address, lifWei, data,
        { from: accounts[2] }
      );

      let decodedEvents = help.abiDecoder.decodeLogs(transaction.receipt.logs);

      assert.deepEqual(['Transfer', 'Show'], _.map(decodedEvents, (e) => e.name));
      assert.equal(lifWei, await token.balanceOf(message.contract.address));

      await help.checkToken(token, accounts, 100, [40 - tokens, 30, 20, 10, 0]);
    });
  });

  it.skip('should return correct balances after approve and show the event on receiver contract', async function () {
    let message = await Message.new();
    help.abiDecoder.addABI(Message._json.abi);

    let data = message.contract.showMessage.getData(web3.toHex(123456), 666, 'Transfer Done');

    let transaction = await token.transferAndCall(
      message.contract.address, help.lif2LifWei(1000), data, { from: accounts[1] }
    );
    let decodedEvents = help.abiDecoder.decodeLogs(transaction.receipt.logs);

    assert.equal(2, decodedEvents.length);

    new BigNumber(help.lif2LifWei(1000)).should.be.bignumber.equal(await token.allowance(accounts[1], message.contract.address));

    await help.checkToken(token, accounts, 100, [40, 30, 20, 10, 0]);
  });

  it.skip('should fail on approve ERC827 when spender is the same contract', async function () {
    let message = await Message.new();
    let data = message.contract.showMessage.getData(web3.toHex(123456), 666, 'Transfer Done');

    try {
      await token.approveAndCall(
        message.contract.address, help.lif2LifWei(1000), data, { from: accounts[1] }
      );
      assert(false, 'approve ERC827 should have thrown because the spender should not be the token itself');
    } catch (e) {
      if (!help.isInvalidOpcodeEx(e)) throw e;
    }
  });

  it.skip('should fail inside approve ERC827', async function () {
    let message = await Message.new();
    help.abiDecoder.addABI(Message._json.abi);

    let data = message.contract.fail.getData();

    try {
      await token.approveAndCall(
        message.contract.address, help.lif2LifWei(10), data, { from: accounts[1] }
      );
      assert(false, 'approve ERC827 should have raised');
    } catch (e) {
      assert(help.isInvalidOpcodeEx(e));
    }

    // approval should not have gone through so allowance is still 0
    new BigNumber(0).should.be.bignumber
      .equal(await token.allowance(accounts[1], message.contract.address));

    await help.checkToken(token, accounts, 100, [40, 30, 20, 10, 0]);
  });

  it.skip('should fail inside transfer ERC827', async function () {
    let message = await Message.new();
    help.abiDecoder.addABI(Message._json.abi);

    let data = message.contract.fail.getData();

    try {
      await token.transferAndCall(
        message.contract.address, help.lif2LifWei(10), data, { from: accounts[1] }
      );
      assert(false, 'transfer ERC827 should have failed');
    } catch (e) {
      assert(help.isInvalidOpcodeEx(e));
    }

    // transfer ERC827 should not have gone through, so balance is still 0
    new BigNumber(0).should.be.bignumber
      .equal(await token.balanceOf(message.contract.address));

    await help.checkToken(token, accounts, 100, [40, 30, 20, 10, 0]);
  });

  it.skip('should fail inside transferFrom ERC827', async function () {
    let message = await Message.new();
    help.abiDecoder.addABI(Message._json.abi);

    let data = message.contract.fail.getData();

    await token.approve(accounts[1], help.lif2LifWei(10), { from: accounts[2] });

    try {
      await token.transferFromAndCall(
        message.contract.address, help.lif2LifWei(1000), accounts[2], data, { from: accounts[1] }
      );
      assert(false, 'transferFrom ERC827 should have thrown');
    } catch (e) {
      assert(help.isInvalidOpcodeEx(e));
    }

    // transferFrom ERC827 should have failed so balance is still 0 but allowance is 10
    new BigNumber(help.lif2LifWei(10)).should.be.bignumber
      .equal(await token.allowance(accounts[2], accounts[1]));
    new BigNumber(0).should.be.bignumber
      .equal(await token.balanceOf(message.contract.address));

    await help.checkToken(token, accounts, 100, [40, 30, 20, 10, 0]);
  });

  it.skip('should fail transfer ERC827 when using token contract address as receiver', async function () {
    let message = await Message.new();
    let data = message.contract.showMessage.getData(web3.toHex(123456), 666, 'Transfer Done');

    try {
      await token.transferAndCall(
        message.contract.address, help.lif2LifWei(1000), data, { from: accounts[1] }
      );
      assert(false, 'transfer ERC827 should have thrown');
    } catch (error) {
      if (!help.isInvalidOpcodeEx(error)) throw error;
    }

    await help.checkToken(token, accounts, 100, [40, 30, 20, 10, 0]);
  });

  it.skip('should fail transferFrom ERC827 when using token contract address as receiver', async function () {
    let message = await Message.new();
    await token.approve(accounts[1], help.lif2LifWei(1), { from: accounts[3] });
    let data = message.contract.showMessage.getData(web3.toHex(123456), 666, 'Transfer Done');

    try {
      await token.transferFromAndCall(
        accounts[3], token.contract.address, help.lif2LifWei(1), data, { from: accounts[1] }
      );
      assert(false, 'transferFrom ERC827 should have thrown');
    } catch (error) {
      if (!help.isInvalidOpcodeEx(error)) throw error;
    }

    await help.checkToken(token, accounts, 100, [40, 30, 20, 10, 0]);
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
