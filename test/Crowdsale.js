
var protobuf = require("protobufjs");
var _ = require('lodash');

var help = require("./helpers");

var LifToken = artifacts.require("./LifToken.sol");
var LifCrowdsale = artifacts.require("./LifCrowdsale.sol");

const LOG_EVENTS = true;

contract('LifToken Crowdsale', function(accounts) {

  it("can create a Crowndsale", async function() {
    let crowdsale = await LifCrowdsale.new(
      web3.eth.blockNumber+10, web3.eth.blockNumber+15, web3.eth.blockNumber+20,
      100, 110,
      accounts[0], accounts[1],
      100000000
    );

    console.log(crowdsale.address);

    console.log(await crowdsale.startBlock.call())
    console.log(await crowdsale.endBlock1.call())
    console.log(await crowdsale.endBlock2.call())
    console.log(await crowdsale.rate1.call())
    console.log(await crowdsale.rate2.call())
    console.log(await crowdsale.foundationWallet.call())
    console.log(await crowdsale.marketMaker.call())
    console.log(await crowdsale.minCap.call())

    assert.equal(web3.eth.blockNumber+10, parseInt(await crowdsale.startBlock.call()));

  });

});
