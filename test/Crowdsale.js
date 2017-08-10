
var protobuf = require("protobufjs");
var _ = require('lodash');

var help = require("./helpers");

var LifToken = artifacts.require("./LifToken.sol");
var LifCrowdsale = artifacts.require("./LifCrowdsale.sol");

const LOG_EVENTS = true;

contract('LifToken Crowdsale', function(accounts) {

  it("can create a Crowndsale", async function() {
    const startBlock = web3.eth.blockNumber;

    let crowdsale = await LifCrowdsale.new(
      startBlock+10, startBlock+15, startBlock+20,
      100, 110,
      accounts[0], accounts[1],
      100000000
    );

    assert.equal(startBlock+10, parseInt(await crowdsale.startBlock.call()));
    assert.equal(startBlock+15, parseInt(await crowdsale.endBlock1.call()));
    assert.equal(startBlock+20, parseInt(await crowdsale.endBlock2.call()));
    assert.equal(100, parseInt(await crowdsale.rate1.call()));
    assert.equal(110, parseInt(await crowdsale.rate2.call()));
    assert.equal(accounts[0], parseInt(await crowdsale.foundationWallet.call()));
    assert.equal(accounts[1], parseInt(await crowdsale.marketMaker.call()));
    assert.equal(100000000, parseInt(await crowdsale.minCap.call()));

  });

});
