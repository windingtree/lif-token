var LifCrowdsale = artifacts.require('./LifCrowdsale.sol'),
  LifToken = artifacts.require('./LifToken.sol'),
  TGEDeployer = artifacts.require('./deploy/TGEDeployer.sol');

let help = require('../helpers');

var BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

var { duration } = require('../helpers/increaseTime');
const _ = require('lodash');

const TGEDistribution = require('./TGEDistribution');

contract('TGE Deployer', function ([deployAddress, foundationWallet, foundersWallet]) {
  it.skip('Deploy a TGE correctly', async function () {
    const startTimestamp = new Date('28 Jan 2019 15:00:00 GMT-3').getTime() / 1000;
    const end1Timestamp = new Date('28 Jan 2019 24:00:00 GMT-3').getTime() / 1000;
    const end2Timestamp = new Date('29 Jan 2019 12:00:00 GMT-3').getTime() / 1000;
    const rate1 = 1000;
    const rate2 = 900;
    const setWeiLockSeconds = duration.minutes(30);
    var totalSupply = new BigNumber(0);
    var ETHRaised = new BigNumber(0);
    const USDperETH = 100000000;
    const weiPerUSDinTGE = web3.toWei(1 / USDperETH);

    const deployer = await TGEDeployer.new(
      startTimestamp, end1Timestamp, end2Timestamp, rate1,
      rate2, setWeiLockSeconds, foundationWallet, foundersWallet,
      { from: deployAddress }
    );

    const crowdsale = LifCrowdsale.at(await deployer.crowdsale());
    const token = LifToken.at(await crowdsale.token());

    help.debug('Data to create Deployer contract:');
    help.debug(web3.eth.getTransaction(deployer.contract.transactionHash).input);
    help.debug('--------------------------------------------------');

    // Check values
    assert.equal(startTimestamp, parseInt(await crowdsale.startTimestamp.call()));
    assert.equal(end1Timestamp, parseInt(await crowdsale.end1Timestamp.call()));
    assert.equal(end2Timestamp, parseInt(await crowdsale.end2Timestamp.call()));
    assert.equal(rate1, parseInt(await crowdsale.rate1.call()));
    assert.equal(rate2, parseInt(await crowdsale.rate2.call()));
    assert.equal(foundationWallet, parseInt(await crowdsale.foundationWallet.call()));
    assert.equal(foundersWallet, parseInt(await crowdsale.foundersWallet.call()));

    var processStage = async function (stage) {
      // Check right amount of contributos and values
      assert.equal(stage.contributors.length, stage.values.length);
      var stageETH = new BigNumber(0);

      // Parse ETH to wei
      stage.values.map(function (value, i) {
        stage.values[i] = new BigNumber(stage.values[i]);
        ETHRaised = ETHRaised.add(stage.values[i]);
        stageETH = stageETH.add(stage.values[i]);
        stage.values[i] = web3.toWei(stage.values[i]);
      });

      // Add TGE stage
      const contributorsChunks = _.chunk(stage.contributors, 150);
      const valuesChunks = _.chunk(stage.values, 150);
      var txs = [];
      for (var i = 0; i < contributorsChunks.length; i++) {
        const data = await deployer.contract.addPresaleTokens.getData(
          contributorsChunks[i], valuesChunks[i], stage.rate
        );
        await deployer.addPresaleTokens(
          contributorsChunks[i], valuesChunks[i], stage.rate,
          { from: deployAddress }
        );
        txs.push(data);
      }

      // Calculate tokens and check total supply
      const stageTokens = new BigNumber(stageETH).mul(stage.rate);
      totalSupply = totalSupply.add(stageTokens);
      help.debug('TXs for stage', stage.name);
      txs.map(function (tx, i) { help.debug('TX [', i, ']', tx); });
      help.debug('--------------------------------------------------');
      totalSupply.should.be.bignumber
        .equal(help.lifWei2Lif(await token.totalSupply()), 2);
    };

    await processStage(TGEDistribution[0]);
    await processStage(TGEDistribution[1]);
    await processStage(TGEDistribution[2]);
    await processStage(TGEDistribution[3]);
    await processStage(TGEDistribution[4]);

    const finalizeData = await deployer.contract.finish.getData(weiPerUSDinTGE);

    await deployer.finish(weiPerUSDinTGE, { from: deployAddress });

    help.debug('Data to finalize Deployer:');
    help.debug(finalizeData);
    help.debug('--------------------------------------------------');

    assert.equal(foundationWallet, parseInt(await crowdsale.owner.call()));
    assert.equal(weiPerUSDinTGE, parseInt(await crowdsale.weiPerUSDinTGE.call()));

    const USDRaised = ETHRaised * USDperETH;
    console.log('USD raised', USDRaised);
    console.log('Funded', await crowdsale.funded());

    // Check USD raised
    new BigNumber(USDRaised).should.be.bignumber
      .equal((await crowdsale.weiRaised()).div(weiPerUSDinTGE), 2);

    // Check ETH raised
    ETHRaised.should.be.bignumber
      .equal(web3.fromWei(await crowdsale.weiRaised()), 2);

    // Check final total supply
    totalSupply.should.be.bignumber
      .equal(help.lifWei2Lif(await token.totalSupply()), 2);
  });
});
