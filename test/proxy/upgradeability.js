var BigNumber = web3.BigNumber;
var help = require('../helpers');

require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

const LifToken = artifacts.require('LifTokenUpgradeableMock.sol');
const Message = artifacts.require('./Message.sol');
const LifTokenV0 = artifacts.require('LifTokenV0');
const OwnedUpgradeabilityProxy = artifacts.require('OwnedUpgradeabilityProxy');

contract('Upgradeable LifToken', function (accounts) {
  it('Upgrade', async function () {
    console.log('Deploying LifToken ERC20 implementation...');
    const lifToken = await LifToken.new();

    console.log('Deploying a proxy pointing to that implementation...');
    const proxy = await OwnedUpgradeabilityProxy.new(lifToken.address);

    console.log('Calling initialize on proxy...');
    let lifTokenProxy = await LifToken.at(proxy.address);
    await lifTokenProxy.initialize([10], [accounts[1]]);

    // Check token proxy address implementation ans storage
    assert.equal(await proxy.implementation(), lifToken.address);
    new BigNumber(10).should.be.bignumber
      .equal(await lifTokenProxy.balanceOf(accounts[1]));

    // Try to use ERC827 method and fail
    let message = await Message.new();
    let data = message.contract.showMessage.getData(web3.toHex(123456), 666, 'Transfer Done');
    try {
      await lifTokenProxy.transferAndCall(accounts[2], 5, data, { from: accounts[1] });
      assert(false, 'transfer ERC827 should have thrown because the method is not implemented');
    } catch (e) {
      if (!help.isNotFunction(e)) throw e;
    }

    await lifTokenProxy.transfer(accounts[2], 5, { from: accounts[1] });

    console.log('Deploying LifTokenV0 ERC827 implementation...');
    const lifTokenV0 = await LifTokenV0.new();

    console.log('Upgrading proxy to v1 implementation...');
    await proxy.upgradeTo(lifTokenV0.address);
    lifTokenProxy = await LifTokenV0.at(proxy.address);

    // Check token proxy address implementation and storage
    assert.equal(await proxy.implementation(), lifTokenV0.address);
    new BigNumber(5).should.be.bignumber
      .equal(await lifTokenProxy.balanceOf(accounts[1]));

    // Try to use ERC827 method and succed
    data = message.contract.showMessage.getData(web3.toHex(123456), 666, 'Transfer Done');
    try {
      await lifTokenProxy.transferAndCall(accounts[2], 5, data, { from: accounts[1] });
    } catch (e) {
      assert(false, 'transfer ERC827 should have success because the method is implemented');
      if (!help.isInvalidOpcodeEx(e)) throw e;
    }

    // Check token storage
    new BigNumber(0).should.be.bignumber
      .equal(await lifTokenProxy.balanceOf(accounts[1]));
    new BigNumber(10).should.be.bignumber
      .equal(await lifTokenProxy.balanceOf(accounts[2]));

    console.log('Wohoo! We\'ve upgraded our contract\'s behavior while preserving storage.');
  });
});
