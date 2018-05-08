var help = require('../helpers');
var ethUtils = require('ethereumjs-util');

var BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

var LifTokenTest = artifacts.require('./token/LifTokenTest.sol');
var LifChannels = artifacts.require('./LifChannels.sol');
var ECRecovery = artifacts.require('./ECRecovery.sol');

var { increaseTimeTestRPC } = require('../helpers/increaseTime');

const LOG_EVENTS = true;

contract('LifToken', function (accounts) {
  var token;
  var lifChannels;
  var eventsWatcher;

  // This private keys should match the ones used by testrpc
  const privateKeys = {};
  privateKeys[accounts[0]] = '0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501200';
  privateKeys[accounts[1]] = '0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501201';
  privateKeys[accounts[2]] = '0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501202';
  privateKeys[accounts[3]] = '0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501203';

  // Sign a message with a private key, it returns the signature in rpc format
  function signMsg (msg, pvKey) {
    const sig = ethUtils.ecsign(ethUtils.toBuffer(msg), ethUtils.toBuffer(pvKey));
    return ethUtils.toRpcSig(sig.v, sig.r, sig.s);
  }

  beforeEach(async function () {
    const ecrecovery = await ECRecovery.new();
    LifChannels.link('ECRecovery', ecrecovery.address);
    token = await LifTokenTest.new();
    await token.faucetLif({ from: accounts[1] });
    await token.faucetLif({ from: accounts[2] });
    await token.faucetLif({ from: accounts[3] });
    lifChannels = await LifChannels.new(token.address, 60);
    eventsWatcher = lifChannels.allEvents();
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

  it('create channel', async function () {
    await token.approve(lifChannels.address, help.lif2LifWei(30), { from: accounts[2] });
    const nonce = 66;
    help.debug('Creating channel between ' + accounts[1] + ' and' + accounts[2]);
    await lifChannels.openChannel(accounts[1], help.lif2LifWei(30), nonce, { from: accounts[2] });
    const channelInfo = await lifChannels.getChannelInfo(accounts[2], accounts[1], nonce);
    assert.equal(channelInfo[1], help.lif2LifWei(30));
    assert.equal(channelInfo[2], 0);
    assert.equal(channelInfo[3], 0);
  });

  it('create channel and close it with a mutual agreement from sender', async function () {
    await token.approve(lifChannels.address, help.lif2LifWei(30), { from: accounts[2] });
    const nonce = 33;
    await lifChannels.openChannel(accounts[1], help.lif2LifWei(30), nonce, { from: accounts[2] });
    help.debug('Sharing sig to send 20 Lif to ' + accounts[1] + ' from ' + accounts[2]);
    const hash = await lifChannels.generateBalanceHash(accounts[1], nonce, help.lif2LifWei(20));
    const senderSig = signMsg(hash, privateKeys[accounts[2]]);
    assert.equal(accounts[2],
      await lifChannels.getSignerOfBalanceHash(accounts[1], nonce, help.lif2LifWei(20), senderSig)
    );
    help.debug('Sharing sig to accept 20 Lif from ' + accounts[2] + ' to ' + accounts[1]);
    const senderHash = await lifChannels.generateKeccak256(senderSig);
    const closingSig = signMsg(senderHash, privateKeys[accounts[1]]);
    help.debug('Closing channel from ' + accounts[2]);
    await lifChannels.cooperativeClose(accounts[1], nonce, help.lif2LifWei(20), senderSig, closingSig, { from: accounts[1] });
    (await token.balanceOf(accounts[2])).should.be.bignumber
      .equal(help.lif2LifWei(30));
    (await token.balanceOf(accounts[1])).should.be.bignumber
      .equal(help.lif2LifWei(70));
  });

  it('create channel and close it with a mutual agreement from receiver', async function () {
    await token.approve(lifChannels.address, help.lif2LifWei(30), { from: accounts[2] });
    const nonce = 33;
    await lifChannels.openChannel(accounts[1], help.lif2LifWei(30), nonce, { from: accounts[2] });
    help.debug('Sharing sig to send 20 Lif to ' + accounts[1] + ' from ' + accounts[2]);
    const hash = await lifChannels.generateBalanceHash(accounts[1], nonce, help.lif2LifWei(20));
    const senderSig = signMsg(hash, privateKeys[accounts[2]]);
    assert.equal(accounts[2],
      await lifChannels.getSignerOfBalanceHash(accounts[1], nonce, help.lif2LifWei(20), senderSig)
    );
    help.debug('Sharing sig to accept 20 Lif from ' + accounts[2] + ' to ' + accounts[1]);
    const senderHash = await lifChannels.generateKeccak256(senderSig);
    const closingSig = signMsg(senderHash, privateKeys[accounts[1]]);
    help.debug('Closing channel from ' + accounts[2]);
    await lifChannels.cooperativeClose(accounts[1], nonce, help.lif2LifWei(20), senderSig, closingSig, { from: accounts[2] });
    (await token.balanceOf(accounts[2])).should.be.bignumber
      .equal(help.lif2LifWei(30));
    (await token.balanceOf(accounts[1])).should.be.bignumber
      .equal(help.lif2LifWei(70));
  });

  it('create channel and close it from sender with uncooperativeClose', async function () {
    await token.approve(lifChannels.address, help.lif2LifWei(30), { from: accounts[2] });
    const nonce = 33;
    await lifChannels.openChannel(accounts[1], help.lif2LifWei(30), nonce, { from: accounts[2] });
    help.debug('Sharing sig to send 10 Lif to ' + accounts[1] + ' from ' + accounts[2]);
    const hash = await lifChannels.generateBalanceHash(accounts[1], nonce, help.lif2LifWei(10));
    const senderSig = signMsg(hash, privateKeys[accounts[2]]);
    assert.equal(accounts[2],
      await lifChannels.getSignerOfBalanceHash(accounts[1], nonce, help.lif2LifWei(10), senderSig)
    );
    help.debug('Closing channel from ' + accounts[2]);
    await lifChannels.uncooperativeClose(accounts[1], nonce, help.lif2LifWei(10), { from: accounts[2] });
    try {
      await lifChannels.closeChannel(accounts[1], nonce, { from: accounts[2] });
      assert(false, 'close should have thrown');
    } catch (error) {
      if (!help.isInvalidOpcodeEx(error)) throw error;
    }
    await increaseTimeTestRPC(61);
    await lifChannels.closeChannel(accounts[1], nonce, { from: accounts[2] });
    (await token.balanceOf(accounts[2])).should.be.bignumber
      .equal(help.lif2LifWei(40));
    (await token.balanceOf(accounts[1])).should.be.bignumber
      .equal(help.lif2LifWei(60));
  });

  it('create channel and close it from receiver after sender chanllenge with different balance', async function () {
    await token.approve(lifChannels.address, help.lif2LifWei(30), { from: accounts[2] });
    const nonce = 33;
    await lifChannels.openChannel(accounts[1], help.lif2LifWei(30), nonce, { from: accounts[2] });
    help.debug('Sharing sig to send 20 Lif to ' + accounts[1] + ' from ' + accounts[2]);
    const hash = await lifChannels.generateBalanceHash(accounts[1], nonce, help.lif2LifWei(20));
    const senderSig = signMsg(hash, privateKeys[accounts[2]]);
    assert.equal(accounts[2],
      await lifChannels.getSignerOfBalanceHash(accounts[1], nonce, help.lif2LifWei(20), senderSig)
    );
    help.debug('Sharing sig to accept 20 Lif from ' + accounts[2] + ' to ' + accounts[1]);
    const senderHash = await lifChannels.generateKeccak256(senderSig);
    const closingSig = signMsg(senderHash, privateKeys[accounts[1]]);
    help.debug('Start close channel request from ' + accounts[2] + ' with 10 lif');
    await lifChannels.uncooperativeClose(accounts[1], nonce, help.lif2LifWei(10), { from: accounts[2] });
    await increaseTimeTestRPC(10);
    help.debug('Claim the 20 agreed before from ' + accounts[1]);
    await lifChannels.cooperativeClose(accounts[1], nonce, help.lif2LifWei(20), senderSig, closingSig, { from: accounts[1] });
    (await token.balanceOf(accounts[2])).should.be.bignumber
      .equal(help.lif2LifWei(30));
    (await token.balanceOf(accounts[1])).should.be.bignumber
      .equal(help.lif2LifWei(70));
  });
});
