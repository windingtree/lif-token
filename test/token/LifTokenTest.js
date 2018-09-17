
var BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

var LifTokenTest = artifacts.require('./token/LifTokenTest.sol');

const LOG_EVENTS = true;

contract('LifTokenTest', function (accounts) {
  var token;
  var eventsWatcher;

  beforeEach(async function () {
    token = await LifTokenTest.new();
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
    new BigNumber(50000000000000000000)
      .should.be.bignumber.equal(await token.MAX_LIF_FAUCET.call());
  });

  it('should return the correct balance amount after claiming tokens', async function () {
    await token.faucetLif();
    new BigNumber(50000000000000000000)
      .should.be.bignumber.equal(await token.balanceOf(accounts[0]));
  });
});
