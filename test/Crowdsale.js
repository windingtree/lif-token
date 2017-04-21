
var protobuf = require("protobufjs");

var help = require("./helpers");

var LifToken = artifacts.require("./LifToken.sol");

const LOG_EVENTS = true;

contract('LifToken Crowdsale', function(accounts) {

  var token;
  var eventsWatcher;

  beforeEach(async function() {
    token = await LifToken.new(web3.toWei(10, 'ether'), 10000, 2, 3, 5)
    eventsWatcher = token.allEvents();
    eventsWatcher.watch(function(error, log){
      if (LOG_EVENTS)
        console.log('Event:', log.event, ':',log.args);
    });
  });

  afterEach(function(done) {
    eventsWatcher.stopWatching();
    done();
  });

  it("Should simulate a crowdsale of 7m tokens with on ducth auction stage, using future discount and distribute 3M of the tokens using futurePayments", async function() {
    var currentBlock = web3.eth.blockNumber;
    var startBlock = currentBlock+10;
    var endBlock = currentBlock+110;
    var totalWeiSent = 0;
    var totalTokensBought = 0;
    var lastPrice = 0;
    var presaleTokens = 0;

    // Add crowdsale stage to sell 7M tokens using dutch auction and the future payments.
    await token.addCrowdsaleStage(startBlock, endBlock, web3.toWei(5, 'ether'), 10, web3.toWei(0.4, 'ether'), web3.toWei(10000000, 'ether'), web3.toWei(40000000, 'ether'), 7000000, 40, 385);
    await token.addFuturePayment(accounts[10], endBlock+30, 300000);

    // Add discount of 250000 ethers
    await token.addDiscount(accounts[10], 0, web3.toWei(250000, 'ether'));

    // Check that the crowdsale stage and payments created succesfully with the right values
    let dutchAuction = await help.getStage(token, 0);
    let maxSupply = await token.maxSupply();
    let advisorsPayment = await token.futurePayments.call(0);
    assert.equal(advisorsPayment[0], accounts[10]);
    assert.equal(parseFloat(advisorsPayment[1]), endBlock+30);
    assert.equal(parseFloat(advisorsPayment[2]), 300000);
    assert.equal(parseFloat(dutchAuction[2]), web3.toWei(5, 'ether'));
    assert.equal(parseFloat(dutchAuction[3]), 10);
    assert.equal(parseFloat(dutchAuction[4]), web3.toWei(0.4, 'ether'));
    assert.equal(parseFloat(dutchAuction[5]), web3.toWei(10000000, 'ether'));
    assert.equal(parseFloat(maxSupply), 7300000);

    // Shouldnt be able to submit the bid since first stage didnt started, the ethers will be returned
    try {
      await token.submitBid(accounts[1], 10, { value: web3.toWei(1, 'ether'), from: accounts[1] });
    } catch (error) {
      if (error.message.search('invalid JUMP') == -1) throw error;
    }
    await help.waitToBlock(startBlock, accounts);

    // Submit bid of 500000 on accounts[1]
    let price = await token.getPrice(500000);
    lastPrice = parseFloat(price)/500000;
    assert.equal(price, web3.toWei(5, 'ether')*500000);
    totalWeiSent += parseFloat(price);
    totalTokensBought += 500000;
    await token.submitBid(accounts[1], 500000, { value: web3.toWei(5, 'ether')*500000, from: accounts[1] });
    await help.checkValues(token, accounts, help.toEther(500000*web3.toWei(5, 'ether')), 0, web3.toWei(5, 'ether'), [0, 0, 0, 0, 0]);
    await help.waitToBlock(startBlock+10, accounts);

    // Submit bid of 1000000 on accounts[2]
    // Submit bid of 500000 on accounts[3]
    price = await token.getPrice(1);
    lastPrice = parseFloat(price);
    totalWeiSent += parseFloat(price)*1000000;
    totalWeiSent += parseFloat(price)*500000;
    totalTokensBought += 1000000;
    totalTokensBought += 500000;
    await token.submitBid(accounts[2], 1000000, { value: price*1000000, from: accounts[2] });
    await token.submitBid(accounts[3], 500000, { value: price*500000, from: accounts[3] });
    await help.waitToBlock(startBlock+20, accounts);

    // Submit bid of 1000000 on accounts[4]
    // Submit bid of 2000000 on accounts[5]
    price = await token.getPrice(1);
    lastPrice = parseFloat(price);
    totalWeiSent += parseFloat(price)*1000000;
    totalWeiSent += parseFloat(price)*2000000;
    totalTokensBought += 1000000;
    totalTokensBought += 2000000;
    await token.submitBid(accounts[4], 1000000, { value: price*1000000, from: accounts[4] });
    await token.submitBid(accounts[5], 2000000, { value: price*2000000, from: accounts[5] });
    await help.waitToBlock(startBlock+40, accounts);

    // Submit bid of 750000 on accounts[6]
    // Submit bid of 1000000 on accounts[7]
    // Submit bid of 127451 on accounts[8]
    price = await token.getPrice(1);
    lastPrice = parseFloat(price);
    totalWeiSent += parseFloat(price)*750000;
    totalWeiSent += parseFloat(price)*1000000;
    totalWeiSent += parseFloat(price)*127451;
    totalTokensBought += 750000;
    totalTokensBought += 1000000;
    totalTokensBought += 127451;
    await token.submitBid(accounts[6], 750000, { value: price*750000, from: accounts[6] });
    await token.submitBid(accounts[7], 1000000, { value: price*1000000, from: accounts[7] });
    await token.submitBid(accounts[8], 127451, { value: price*127451, from: accounts[8] });

    // Check that the crowdsale stage is ready to be completed and reached the completion
    let auctionSuccess = await help.getStage(token, 0);
    assert.equal(parseFloat(auctionSuccess[2]), web3.toWei(5, 'ether'));
    assert.equal(parseFloat(auctionSuccess[3]), 10);
    assert.equal(parseFloat(auctionSuccess[4]), web3.toWei(0.4, 'ether'));
    assert.equal(parseFloat(auctionSuccess[5]), web3.toWei(10000000, 'ether'));
    assert.equal(parseFloat(auctionSuccess[6]), web3.toWei(40000000, 'ether'));
    assert.equal(parseFloat(auctionSuccess[7]), 7000000);
    assert.equal(parseFloat(auctionSuccess[8]), 40);
    assert.equal(parseInt(auctionSuccess[9]), 385);
    assert.equal(help.toEther(auctionSuccess[10]), 250000);
    assert.equal(help.parseBalance(auctionSuccess[11]), help.parseBalance(totalWeiSent));
    assert.equal(parseFloat(auctionSuccess[12]), totalTokensBought);
    assert.equal(parseFloat(auctionSuccess[13]), lastPrice);
    presaleTokens = help.toWei(250000)/(lastPrice*0.6);

    // Check token status and update crowdsale stage status
    let tokenStatus = await token.status();
    assert.equal(parseFloat(tokenStatus), 3);
    await help.waitToBlock(endBlock+1, accounts);
    await token.checkCrowdsaleStage(0);
    let auctionEnded = await help.getStage(token, 0);
    tokenStatus = await token.status();

    // Check the values of the ended crowdsale stage, token status, and claim the tokens
    assert.equal(parseInt(tokenStatus), 4);
    assert.equal(parseFloat(auctionEnded[2]), web3.toWei(5, 'ether'));
    assert.equal(parseFloat(auctionEnded[3]), 10);
    assert.equal(parseFloat(auctionEnded[4]), web3.toWei(0.4, 'ether'));
    assert.equal(parseFloat(auctionEnded[5]), web3.toWei(10000000, 'ether'));
    assert.equal(parseFloat(auctionEnded[6]), web3.toWei(40000000, 'ether'));
    assert.equal(parseFloat(auctionEnded[7]), 7000000);
    assert.equal(parseFloat(auctionEnded[8]), 40);
    assert.equal(parseInt(auctionEnded[9]), 0);
    assert.equal(help.toEther(auctionEnded[10]), 250000);
    assert.equal(help.parseBalance(auctionEnded[11]), help.parseBalance(totalWeiSent));
    assert.equal(parseFloat(auctionEnded[12]), totalTokensBought);
    assert.equal(parseFloat(auctionEnded[13]), lastPrice);

    // Distribute the tokens and check values
    await token.distributeTokens(0, accounts[1], false, {from: accounts[0]});
    await token.distributeTokens(0, accounts[2], false, {from: accounts[0]});
    await token.distributeTokens(0, accounts[3], false, {from: accounts[0]});
    await token.distributeTokens(0, accounts[4], false, {from: accounts[0]});
    await token.distributeTokens(0, accounts[5], false, {from: accounts[0]});
    await token.distributeTokens(0, accounts[6], false, {from: accounts[0]});
    await token.distributeTokens(0, accounts[7], false, {from: accounts[0]});
    await token.distributeTokens(0, accounts[8], false, {from: accounts[0]});
    await token.distributeTokens(0, accounts[10], true, {from: accounts[0]});
    await help.checkValues(token, accounts, 0, 7000000, 0, [500000, 1000000, 500000, 1000000, 2000000]);

    // Shouldnt allow to a claim a payment before the requested block
    try {
      await token.claimTokensPayment(3, {from: accounts[10]});
    } catch (error) {
      if (error.message.search('invalid JUMP') == -1) throw error;
    }
    await help.waitToBlock(endBlock+81, accounts);
    // Should be able to claim all the payments
    await token.claimTokensPayment(0, {from: accounts[10]});
    await token.claimTokensPayment(1, {from: accounts[0]});
    await token.claimTokensPayment(2, {from: accounts[0]});
    await token.claimTokensPayment(3, {from: accounts[0]});
    await token.claimTokensPayment(4, {from: accounts[0]});
    await token.claimTokensPayment(5, {from: accounts[0]});
    await token.claimTokensPayment(6, {from: accounts[0]});
    await token.claimTokensPayment(7, {from: accounts[0]});
    await token.claimTokensPayment(8, {from: accounts[0]});
    let ownerBalance = await token.balanceOf(accounts[0]);
    assert.equal(help.parseBalance(ownerBalance), 2695000);
    // Check all final values
    await help.checkValues(token, accounts, 0, 9995000, 0, [500000, 1000000, 500000, 1000000, 2000000]);
  });


  it("Should simulate a crowdsale of 7m tokens with three dutch auction stages, using future discount and distribute 3M of the tokens using futurePayments", async function() {
    var currentBlock = web3.eth.blockNumber;
    var startBlock = currentBlock+10;
    var endBlock = currentBlock+110;
    var totalWeiSent = 0;
    var totalTokensBought = 0;
    var lastPrice = 0;
    var presaleTokens = 0;

    // Add crowdsale stage to sell 7M tokens using dutch auction and the future payments.
    await token.addCrowdsaleStage(startBlock, endBlock, web3.toWei(5, 'ether'), 10, web3.toWei(0.2, 'ether'), web3.toWei(10000000, 'ether'), web3.toWei(40000000, 'ether'), 7000000, 50, 428);

    // Add 250000 ethers discount
    await token.addDiscount(accounts[10], 0, web3.toWei(250000, 'ether'));

    // Check that the crowdsale stage and payments created succesfully with the right values
    let dutchAuction = await help.getStage(token, 0);
    let maxSupply = await token.maxSupply();
    assert.equal(parseFloat(dutchAuction[2]), web3.toWei(5, 'ether'));
    assert.equal(parseFloat(dutchAuction[3]), 10);
    assert.equal(parseFloat(dutchAuction[4]), web3.toWei(0.2, 'ether'));
    assert.equal(parseFloat(dutchAuction[5]), web3.toWei(10000000, 'ether'));
    assert.equal(parseFloat(maxSupply), 7000000);
    await help.waitToBlock(startBlock, accounts);

    // Submit bid of 700000 on accounts[1]
    // Submit bid of 400000 on accounts[2]
    let price = await token.getPrice(1);
    lastPrice = parseFloat(price);
    totalWeiSent += parseFloat(price)*700000;
    totalWeiSent += parseFloat(price)*400000;
    totalTokensBought += 700000;
    totalTokensBought += 400000;
    await token.submitBid(accounts[1], 700000, { value: price*700000, from: accounts[1] });
    await token.submitBid(accounts[2], 400000, { value: price*400000, from: accounts[2] });

    await help.checkValues(token, accounts, help.toEther(totalWeiSent), 0, web3.toWei(5, 'ether'), [0, 0, 0, 0, 0]);
    await help.waitToBlock(startBlock+10, accounts);

    // Submit bid of 200000 on accounts[3]
    // Submit bid of 200000 on accounts[4]
    // Submit bid of 500000 on accounts[5]
    price = await token.getPrice(1);
    lastPrice = parseFloat(price);
    totalWeiSent += parseFloat(price)*200000;
    totalWeiSent += parseFloat(price)*200000;
    totalWeiSent += parseFloat(price)*500000;
    totalTokensBought += 200000;
    totalTokensBought += 200000;
    totalTokensBought += 500000;
    await token.submitBid(accounts[3], 200000, { value: price*200000, from: accounts[3] });
    await token.submitBid(accounts[4], 200000, { value: price*200000, from: accounts[4] });
    await token.submitBid(accounts[5], 500000, { value: price*500000, from: accounts[5] });
    await help.waitToBlock(startBlock+20, accounts);

    // Submit bid of 600000 on accounts[6]
    // Submit bid of 900000 on accounts[7]
    price = await token.getPrice(1);
    lastPrice = parseFloat(price);
    totalWeiSent += parseFloat(price)*600000;
    totalWeiSent += parseFloat(price)*900000;
    totalTokensBought += 600000;
    totalTokensBought += 900000;
    await token.submitBid(accounts[6], 600000, { value: price*600000, from: accounts[6] });
    await token.submitBid(accounts[7], 900000, { value: price*900000, from: accounts[7] });
    await help.waitToBlock(startBlock+50, accounts);

    // Submit bid of 500000 on accounts[8]
    price = await token.getPrice(1);
    lastPrice = parseFloat(price);
    totalWeiSent += parseFloat(price)*500000;
    totalTokensBought += 500000;
    await token.submitBid(accounts[8], 500000, { value: price*500000, from: accounts[8] });
    await help.getStage(token, 0);

    // Check that the crowdsale stage is ready to be completed and reached the completion
    let auctionSuccess = await help.getStage(token, 0);
    assert.equal(parseFloat(auctionSuccess[2]), web3.toWei(5, 'ether'));
    assert.equal(parseFloat(auctionSuccess[3]), 10);
    assert.equal(parseFloat(auctionSuccess[4]), web3.toWei(0.2, 'ether'));
    assert.equal(parseFloat(auctionSuccess[5]), web3.toWei(10000000, 'ether'));
    assert.equal(parseFloat(auctionSuccess[6]), web3.toWei(40000000, 'ether'));
    assert.equal(parseFloat(auctionSuccess[7]), 7000000);
    assert.equal(parseFloat(auctionSuccess[8]), 50);
    assert.equal(parseInt(auctionSuccess[9]), 428);
    assert.equal(help.toEther(auctionSuccess[10]), 250000);
    assert.equal(help.parseBalance(auctionSuccess[11]), help.parseBalance(totalWeiSent));
    assert.equal(parseFloat(auctionSuccess[12]), totalTokensBought);
    assert.equal(parseFloat(auctionSuccess[13]), lastPrice);
    presaleTokens = help.toWei(250000)/(lastPrice*0.5);

    // Check token status and update crowdsale stage status
    let status = await token.status();
    assert.equal(parseFloat(status), 3);
    await help.waitToBlock(endBlock, accounts);
    await token.checkCrowdsaleStage(0);
    let auctionEnded = await help.getStage(token, 0);
    let tokenStatus = await token.status();

    // Check the values of the ended crowdsale stage, token status, and claim the tokens
    assert.equal(parseInt(tokenStatus), 4);
    assert.equal(parseFloat(auctionEnded[2]), web3.toWei(5, 'ether'));
    assert.equal(parseFloat(auctionEnded[3]), 10);
    assert.equal(parseFloat(auctionEnded[4]), web3.toWei(0.2, 'ether'));
    assert.equal(parseFloat(auctionEnded[5]), web3.toWei(10000000, 'ether'));
    assert.equal(parseFloat(auctionEnded[6]), web3.toWei(40000000, 'ether'));
    assert.equal(parseFloat(auctionEnded[7]), 7000000);
    assert.equal(parseFloat(auctionEnded[8]), 50);
    assert.equal(parseInt(auctionEnded[9]), 0);
    assert.equal(help.toEther(auctionEnded[10]), 250000);
    assert.equal(help.parseBalance(auctionEnded[11]), help.parseBalance(totalWeiSent));
    assert.equal(parseFloat(auctionEnded[12]), totalTokensBought);
    assert.equal(parseFloat(auctionEnded[13]), lastPrice);

    // Distribute the sold tokens and check the values
    await token.distributeTokens(0, accounts[1], false, {from: accounts[0]});
    await token.distributeTokens(0, accounts[2], false, {from: accounts[0]});
    await token.distributeTokens(0, accounts[3], false, {from: accounts[0]});
    await token.distributeTokens(0, accounts[4], false, {from: accounts[0]});
    await token.distributeTokens(0, accounts[5], false, {from: accounts[0]});
    await token.distributeTokens(0, accounts[6], false, {from: accounts[0]});
    await token.distributeTokens(0, accounts[7], false, {from: accounts[0]});
    await token.distributeTokens(0, accounts[8], false, {from: accounts[0]});
    await token.distributeTokens(0, accounts[10], true, {from: accounts[0]});
    await help.checkValues(token, accounts, 0, 4125000, 0, [700000, 400000, 200000, 200000, 500000]);

    // Start another stage to try to sell the remaining tokens
    currentBlock = web3.eth.blockNumber;
    startBlock = currentBlock+10;
    endBlock = currentBlock+110;
    await token.addCrowdsaleStage(startBlock, endBlock, web3.toWei(7, 'ether'), 10, web3.toWei(0.2, 'ether'), web3.toWei(10000000, 'ether'), web3.toWei(30000000, 'ether'), 2875000, 0, 428);

    //Try to add a discount, but it will be rejected due to not discount on auction
    try {
      await token.addDiscount(accounts[10], 0, web3.toWei(250000, 'ether'));
    } catch (error) {
      if (error.message.search('invalid JUMP') == -1) throw error;
    }
    let secondDutchAuction = await help.getStage(token, 1);

    // Check that the crowdsale stage and payments created succesfully with the right values
    assert.equal(parseFloat(secondDutchAuction[2]), web3.toWei(7, 'ether'));
    assert.equal(parseFloat(secondDutchAuction[3]), 10);
    assert.equal(parseFloat(secondDutchAuction[4]), web3.toWei(0.2, 'ether'));
    assert.equal(parseFloat(secondDutchAuction[5]), web3.toWei(10000000, 'ether'));
    await help.waitToBlock(startBlock, accounts);

    // Submit bid of 100000 on accounts[3]
    // Submit bid of 300000 on accounts[4]
    price = await token.getPrice(1);
    lastPrice = parseFloat(price);
    totalWeiSent = 0;
    totalTokensBought = 0;
    totalWeiSent += parseFloat(price)*100000;
    totalWeiSent += parseFloat(price)*300000;
    totalTokensBought += 100000;
    totalTokensBought += 300000;
    await token.submitBid(accounts[3], 100000, { value: price*100000, from: accounts[3] });
    await token.submitBid(accounts[4], 300000, { value: price*300000, from: accounts[4] });
    await help.waitToBlock(startBlock+10, accounts);

    // Submit bid of 400000 on accounts[6]
    price = await token.getPrice(1);
    lastPrice = parseFloat(price);
    totalWeiSent += parseFloat(price)*400000;
    totalTokensBought += 400000;
    await token.submitBid(accounts[6], 400000, { value: price*400000, from: accounts[6] });
    await help.waitToBlock(startBlock+20, accounts);

    // Submit bid of 600000 on accounts[7]
    // Submit bid of 600000 on accounts[8]
    price = await token.getPrice(1)
    lastPrice = parseFloat(price);
    totalWeiSent += parseFloat(price)*600000;
    totalWeiSent += parseFloat(price)*600000;
    totalTokensBought += 600000;
    totalTokensBought += 600000;
    await token.submitBid(accounts[7], 600000, { value: price*600000, from: accounts[7] });
    await token.submitBid(accounts[8], 600000, { value: price*600000, from: accounts[8] });

    // Check that the crowdsale stage is ready to be completed and reached the completion
    auctionSuccess = await help.getStage(token, 1);
    assert.equal(parseFloat(auctionSuccess[2]), web3.toWei(7, 'ether'));
    assert.equal(parseFloat(auctionSuccess[3]), 10);
    assert.equal(parseFloat(auctionSuccess[4]), web3.toWei(0.2, 'ether'));
    assert.equal(parseFloat(auctionSuccess[5]), web3.toWei(10000000, 'ether'));
    assert.equal(parseFloat(auctionSuccess[6]), web3.toWei(30000000, 'ether'));
    assert.equal(parseFloat(auctionSuccess[7]), 2875000);
    assert.equal(parseFloat(auctionSuccess[8]), 0);
    assert.equal(parseInt(auctionSuccess[9]), 428);
    assert.equal(help.toEther(auctionSuccess[10]), 0);
    assert.equal(help.parseBalance(auctionSuccess[11]), help.parseBalance(totalWeiSent));
    assert.equal(parseFloat(auctionSuccess[12]), totalTokensBought);
    assert.equal(parseFloat(auctionSuccess[13]), lastPrice);

    // Check token status and update crowdsale stage
    status = await token.status();
    assert.equal(parseFloat(status), 3);
    await help.waitToBlock(endBlock, accounts);
    await token.checkCrowdsaleStage(1);
    auctionEnded = await help.getStage(token, 1);
    tokenStatus = await token.status();

    // Check the values of the ended crowdsale stage, token status, and claim the tokens
    assert.equal(parseInt(tokenStatus), 4);
    assert.equal(parseFloat(auctionEnded[2]), web3.toWei(7, 'ether'));
    assert.equal(parseFloat(auctionEnded[3]), 10);
    assert.equal(parseFloat(auctionEnded[4]), web3.toWei(0.2, 'ether'));
    assert.equal(parseFloat(auctionEnded[5]), web3.toWei(10000000, 'ether'));
    assert.equal(parseFloat(auctionEnded[6]), web3.toWei(30000000, 'ether'));
    assert.equal(parseFloat(auctionEnded[7]), 2875000);
    assert.equal(parseFloat(auctionEnded[8]), 0);
    assert.equal(parseInt(auctionEnded[9]), 0);
    assert.equal(help.toEther(auctionEnded[10]), 0);
    assert.equal(help.parseBalance(auctionEnded[11]), help.parseBalance(totalWeiSent));
    assert.equal(parseFloat(auctionEnded[12]), totalTokensBought);
    assert.equal(parseFloat(auctionEnded[13]), lastPrice);

    // Distribute the tokens sold and check values
    await token.distributeTokens(1, accounts[3], false, {from: accounts[0]});
    await token.distributeTokens(1, accounts[4], false, {from: accounts[0]});
    await token.distributeTokens(1, accounts[6], false, {from: accounts[0]});
    await token.distributeTokens(1, accounts[7], false, {from: accounts[0]});
    await token.distributeTokens(1, accounts[8], false, {from: accounts[0]});
    await help.checkValues(token, accounts, 0, 6125000, 0, [700000, 400000, 300000, 500000, 500000]);

    // Start another stage to try to sell the remaining tokens
    currentBlock = web3.eth.blockNumber;
    startBlock = currentBlock+10;
    endBlock = currentBlock+110;
    await token.addCrowdsaleStage(startBlock, endBlock, web3.toWei(10, 'ether'), 5, web3.toWei(0.1, 'ether'), web3.toWei(5000000, 'ether'), web3.toWei(20000000, 'ether'), 875000, 0, 428);
    let thirdDuctchAuction= await help.getStage(token, 2);

    // Check that the crowdsale stage and payments created succesfully with the right values
    assert.equal(parseFloat(thirdDuctchAuction[2]), web3.toWei(10, 'ether'));
    assert.equal(parseFloat(thirdDuctchAuction[3]), 5);
    assert.equal(parseFloat(thirdDuctchAuction[4]), web3.toWei(0.1, 'ether'));
    assert.equal(parseFloat(thirdDuctchAuction[5]), web3.toWei(5000000, 'ether'));
    assert.equal(parseFloat(thirdDuctchAuction[6]), web3.toWei(20000000, 'ether'));
    await help.waitToBlock(startBlock, accounts);

    // Submit bid of 175000 on accounts[1]
    // Submit bid of 300000 on accounts[2]
    price = await token.getPrice(1);
    lastPrice = parseFloat(price);
    totalWeiSent = 0;
    totalTokensBought = 0;
    totalWeiSent += parseFloat(price)*175000;
    totalWeiSent += parseFloat(price)*300000;
    totalTokensBought += 175000;
    totalTokensBought += 300000;
    await token.submitBid(accounts[1], 175000, { value: price*175000, from: accounts[1] });
    await token.submitBid(accounts[2], 300000, { value: price*300000, from: accounts[2] });
    await help.waitToBlock(startBlock+5, accounts);

    // Submit bid of 200000 on accounts[3]
    price = await token.getPrice(1);
    lastPrice = parseFloat(price);
    totalWeiSent += parseFloat(price)*200000;
    totalTokensBought += 200000;
    await token.submitBid(accounts[3], 200000, { value: price*200000, from: accounts[3] });
    await help.waitToBlock(startBlock+10, accounts);

    // Submit bid of 200000 on accounts[4]
    price = await token.getPrice(1);
    lastPrice = parseFloat(price);
    totalWeiSent += parseFloat(price)*200000;
    totalTokensBought += 200000;
    await token.submitBid(accounts[4], 200000, { value: price*200000, from: accounts[4] });

    await help.waitToBlock(endBlock, accounts);
    await token.checkCrowdsaleStage(2);

    // Check the values of the ended crowdsale stage, token status, and claim the tokens
    let thirdAuctionEnded = await help.getStage(token, 2);
    tokenStatus = await token.status();
    assert.equal(parseInt(tokenStatus), 4);
    assert.equal(parseFloat(thirdAuctionEnded[2]), web3.toWei(10, 'ether'));
    assert.equal(parseFloat(thirdAuctionEnded[3]), 5);
    assert.equal(parseFloat(thirdAuctionEnded[4]), web3.toWei(0.1, 'ether'));
    assert.equal(parseFloat(thirdAuctionEnded[5]), web3.toWei(5000000, 'ether'));
    assert.equal(parseFloat(thirdAuctionEnded[6]), web3.toWei(20000000, 'ether'));
    assert.equal(parseFloat(thirdAuctionEnded[7]), 875000);
    assert.equal(parseFloat(thirdAuctionEnded[8]), 0);
    assert.equal(parseInt(thirdAuctionEnded[9]), 0);
    assert.equal(help.toEther(thirdAuctionEnded[10]), 0);
    assert.equal(help.parseBalance(thirdAuctionEnded[11]), help.parseBalance(totalWeiSent));
    assert.equal(parseFloat(thirdAuctionEnded[12]), totalTokensBought);
    assert.equal(parseFloat(thirdAuctionEnded[13]), lastPrice);

    // Distribute the remaining tokens and check values
    await help.waitToBlock(endBlock, accounts);
    await token.distributeTokens(2, accounts[1], false, {from: accounts[0]});
    await token.distributeTokens(2, accounts[2], false, {from: accounts[0]});
    await token.distributeTokens(2, accounts[3], false, {from: accounts[0]});
    await token.distributeTokens(2, accounts[4], false, {from: accounts[0]});
    await help.checkValues(token, accounts, 0, 7000000, 0, [875000, 700000, 500000, 700000, 500000]);

    // Should be able to claim all the payments
    await help.waitToBlock(endBlock+81, accounts);
    await token.claimTokensPayment(0, {from: accounts[0]});
    await token.claimTokensPayment(1, {from: accounts[0]});
    await token.claimTokensPayment(2, {from: accounts[0]});
    await token.claimTokensPayment(3, {from: accounts[0]});
    await token.claimTokensPayment(4, {from: accounts[0]});
    await token.claimTokensPayment(5, {from: accounts[0]});
    await token.claimTokensPayment(6, {from: accounts[0]});
    await token.claimTokensPayment(7, {from: accounts[0]});
    await token.claimTokensPayment(8, {from: accounts[0]});
    await token.claimTokensPayment(9, {from: accounts[0]});
    await token.claimTokensPayment(10, {from: accounts[0]});
    await token.claimTokensPayment(11, {from: accounts[0]});
    await token.claimTokensPayment(12, {from: accounts[0]});
    await token.claimTokensPayment(13, {from: accounts[0]});
    await token.claimTokensPayment(14, {from: accounts[0]});
    await token.claimTokensPayment(15, {from: accounts[0]});
    await token.claimTokensPayment(16, {from: accounts[0]});
    await token.claimTokensPayment(17, {from: accounts[0]});
    await token.claimTokensPayment(18, {from: accounts[0]});
    await token.claimTokensPayment(19, {from: accounts[0]});
    await token.claimTokensPayment(20, {from: accounts[0]});
    await token.claimTokensPayment(21, {from: accounts[0]});
    await token.claimTokensPayment(22, {from: accounts[0]});
    await token.claimTokensPayment(23, {from: accounts[0]});
    let ownerBalance = await token.balanceOf(accounts[0]);
    assert.equal(help.parseBalance(ownerBalance), 2995992);

    // Check all final values
    await help.checkValues(token, accounts, 0, 9995992, 0, [875000, 700000, 500000, 700000, 500000]);
  });

});
