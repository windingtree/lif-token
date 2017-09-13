var LifCrowdsale = artifacts.require('./LifCrowdsale.sol');

var latestTime = require('./helpers/latestTime');
var {duration} = require('./helpers/increaseTime');


contract('LifToken Crowdsale', function(accounts) {

  it('can create a Crowndsale', async function() {
    const startTimestamp = latestTime() + duration.days(1),
      end1Timestamp = startTimestamp + duration.days(1),
      end2Timestamp = startTimestamp + duration.days(2);

    let crowdsale = await LifCrowdsale.new(
      startTimestamp, end1Timestamp, end2Timestamp,
      100, 110, 150, duration.minutes(30),
      accounts[0]
    );

    assert.equal(startTimestamp, parseInt(await crowdsale.startTimestamp.call()));
    assert.equal(end1Timestamp, parseInt(await crowdsale.end1Timestamp.call()));
    assert.equal(end2Timestamp, parseInt(await crowdsale.end2Timestamp.call()));
    assert.equal(100, parseInt(await crowdsale.rate1.call()));
    assert.equal(110, parseInt(await crowdsale.rate2.call()));
    assert.equal(accounts[0], parseInt(await crowdsale.foundationWallet.call()));

  });

});
