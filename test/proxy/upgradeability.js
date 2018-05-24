var BigNumber = web3.BigNumber;
var help = require('../helpers');

require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

const LifTokenV0 = artifacts.require('LifTokenV0Mock.sol');
const Message = artifacts.require('./Message.sol');
const LifTokenV1 = artifacts.require('LifTokenV1');
const AdminUpgradeabilityProxy = artifacts.require('AdminUpgradeabilityProxy');
const UpgradeabilityProxyFactory = artifacts.require('UpgradeabilityProxyFactory');

contract('Upgradeable LifToken', function ([admin, tokenOwner, sender, receiver]) {
  it('Upgrade with factory', async function () {
    console.log('Deploying proxy factory...');
    const proxyFactory = await UpgradeabilityProxyFactory.new();

    console.log('Deploying LifTokenV0 ERC20 implementation...');
    const lifTokenV0 = await LifTokenV0.new();

    console.log('Deploying a proxy with proxyFactory pointing to that implementation...');
    const initializeData = lifTokenV0.contract.initialize.getData(tokenOwner, [10], [sender]);
    const createProxyTx = await proxyFactory.createProxyAndCall(admin, lifTokenV0.address, initializeData);
    const proxy = await AdminUpgradeabilityProxy.at(createProxyTx.logs[0].args.proxy);

    console.log('Calling initialize on proxy...');
    let lifTokenProxy = await LifTokenV0.at(proxy.address);

    // Check proxy and token ownerhsip
    assert.equal(await proxy.admin({ from: admin }), admin);
    assert.equal(await lifTokenProxy.owner({ from: tokenOwner }), tokenOwner);

    // Check token proxy address implementation and storage
    assert.equal(await proxy.implementation({ from: admin }), lifTokenV0.address);
    new BigNumber(10).should.be.bignumber
      .equal(await lifTokenProxy.balanceOf(sender, { from: receiver }));

    // Try to use ERC827 method and fail
    let message = await Message.new();
    let data = message.contract.showMessage.getData(web3.toHex(123456), 666, 'Transfer Done');
    try {
      await lifTokenProxy.transferAndCall(receiver, 5, data, { from: sender });
      assert(false, 'transfer ERC827 should have thrown because the method is not implemented');
    } catch (e) {
      if (!help.isNotFunction(e)) throw e;
    }

    await lifTokenProxy.transfer(receiver, 5, { from: sender });

    console.log('Deploying LifTokenV1 ERC827 implementation...');
    const lifTokenV1 = await LifTokenV1.new();

    console.log('Upgrading proxy to v1 implementation...');
    await proxy.upgradeTo(lifTokenV1.address);
    lifTokenProxy = await LifTokenV1.at(proxy.address);

    // Check token proxy address implementation and storage
    assert.equal(await proxy.implementation({ from: admin }), lifTokenV1.address);
    new BigNumber(5).should.be.bignumber
      .equal(await lifTokenProxy.balanceOf(sender, { from: receiver }));

    // Try to use ERC827 method and succed
    data = message.contract.showMessage.getData(web3.toHex(123456), 666, 'Transfer Done');
    try {
      await lifTokenProxy.transferAndCall(receiver, 5, data, { from: sender });
    } catch (e) {
      assert(false, 'transfer ERC827 should have success because the method is implemented');
      if (!help.isInvalidOpcodeEx(e)) throw e;
    }

    // Check token storage
    new BigNumber(0).should.be.bignumber
      .equal(await lifTokenProxy.balanceOf(sender, { from: receiver }));
    new BigNumber(10).should.be.bignumber
      .equal(await lifTokenProxy.balanceOf(receiver, { from: receiver }));

    console.log('Wohoo! We\'ve upgraded our contract\'s behavior while preserving storage.');
  });

  it('Upgrade deploying proxy', async function () {
    console.log('Deploying LifToken ERC20 implementation...');
    const lifTokenV0 = await LifTokenV0.new({ from: admin });

    console.log('Deploying a proxy pointing to that implementation...');
    const proxy = await AdminUpgradeabilityProxy.new(lifTokenV0.address, { from: admin });

    assert.equal(await proxy.admin(), admin);

    console.log('Calling initialize on proxy...');
    let lifTokenProxy = await LifTokenV0.at(proxy.address);
    await lifTokenProxy.initialize(tokenOwner, [10], [sender], { from: sender });

    assert.equal(await lifTokenProxy.owner({ from: sender }), tokenOwner);

    // Check token proxy address implementation and storage
    assert.equal(await proxy.implementation({ from: admin }), lifTokenV0.address);
    new BigNumber(10).should.be.bignumber
      .equal(await lifTokenProxy.balanceOf(sender, { from: receiver }));

    // Try to use ERC827 method and fail
    let message = await Message.new();
    let data = message.contract.showMessage.getData(web3.toHex(123456), 666, 'Transfer Done');
    try {
      await lifTokenProxy.transferAndCall(receiver, 5, data, { from: sender });
      assert(false, 'transfer ERC827 should have thrown because the method is not implemented');
    } catch (e) {
      if (!help.isNotFunction(e)) throw e;
    }

    await lifTokenProxy.transfer(receiver, 5, { from: sender });

    console.log('Deploying LifTokenV1 ERC827 implementation...');
    const lifTokenV1 = await LifTokenV1.new();

    console.log('Upgrading proxy to v1 implementation...');
    await proxy.upgradeTo(lifTokenV1.address);
    lifTokenProxy = await LifTokenV1.at(proxy.address);

    // Check token proxy address implementation and storage
    assert.equal(await proxy.implementation({ from: admin }), lifTokenV1.address);
    new BigNumber(5).should.be.bignumber
      .equal(await lifTokenProxy.balanceOf(sender, { from: receiver }));

    // Try to use ERC827 method and succed
    data = message.contract.showMessage.getData(web3.toHex(123456), 666, 'Transfer Done');
    try {
      await lifTokenProxy.transferAndCall(receiver, 5, data, { from: sender });
    } catch (e) {
      assert(false, 'transfer ERC827 should have success because the method is implemented');
      if (!help.isInvalidOpcodeEx(e)) throw e;
    }

    // Check token storage
    new BigNumber(0).should.be.bignumber
      .equal(await lifTokenProxy.balanceOf(sender, { from: receiver }));
    new BigNumber(10).should.be.bignumber
      .equal(await lifTokenProxy.balanceOf(receiver, { from: receiver }));

    console.log('Wohoo! We\'ve upgraded our contract\'s behavior while preserving storage.');
  });
});
