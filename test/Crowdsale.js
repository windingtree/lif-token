
var protobuf = require("protobufjs");
var _ = require('lodash');

var help = require("./helpers");

var LifToken = artifacts.require("./LifToken.sol");
var LifCrowdsale = artifacts.require("./LifCrowdsale.sol");
var FuturePayment = artifacts.require("./FuturePayment.sol");

const LOG_EVENTS = true;

contract('LifToken Crowdsale', function(accounts) {

  var token;
  var eventsWatcher;

  beforeEach(async function() {
    token = await LifToken.new(web3.toWei(10, 'ether'), 10000, 2, 3, 5, {from: accounts[0]});
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

  it("Should simulate a crowdsale of 7m tokens, no owner payment, with one dutch auction and just 1 bidder", async function() {
    var currentBlock = web3.eth.blockNumber;
    var startBlock = currentBlock+5;
    var endBlock = currentBlock+10;
    var totalWeiSent = 0;
    var totalTokensBought = 0;
    var presaleTokens = 0;
    var maxTokens = 7000000;
    var paymentTokens = 0;
    var startPrice = web3.toWei(5, 'ether');
    var minCap = web3.toWei(2.5*1000*1000, 'ether');
    var maxCap = web3.toWei(40*1000*1000, 'ether');
    var ownerPercentage = 0;

    // Add crowdsale stage to sell 7M tokens using dutch auction
    var crowdsale = await help.createAndFundCrowdsale({
      token: token,
      startBlock: startBlock, endBlock: endBlock,
      startPrice: startPrice,
      changePerBlock: 10, changePrice: web3.toWei(0.4, 'ether'),
      minCap: minCap, maxCap: maxCap,
      maxTokens: maxTokens,
      presaleDiscount: 40, ownerPercentage: ownerPercentage
    }, accounts);

    assert.equal(parseFloat(await token.maxSupply()), maxTokens + paymentTokens);

    // Set crowdsale status=started
    await crowdsale.setStatus(2);

    // Shouldnt be able to submit the bid since first stage didnt start, the ethers will be returned
    try {
      await crowdsale.submitBid({ value: web3.toWei(1, 'ether'), from: accounts[1] });
      assert.equal(false, true, "submitBid should have thrown an error because crowdsale has not started yet");
    } catch (error) {
      if (error.message.search('invalid JUMP') == -1) throw error;
    }

    // Assert price == 0 before start
    var price = parseFloat(await crowdsale.getPrice());
    assert.equal(price, web3.toWei(0, 'ether'));

    await help.waitToBlock(startBlock+1, accounts);

    // Submit bid of 500000 on accounts[1]
    price = parseFloat(await crowdsale.getPrice());
    var tokens1 = 500000;
    assert.equal(price, startPrice);
    totalWeiSent += price*tokens1;
    totalTokensBought += tokens1;
    await crowdsale.submitBid({value: web3.toWei(5, 'ether')*tokens1, from: accounts[1] });
    await help.checkToken(token, accounts, maxTokens, [0, 0, 0, 0, 0]);
    await help.checkCrowdsale(crowdsale, help.toEther(tokens1*web3.toWei(5, 'ether')), 0);
    await help.waitToBlock(startBlock+5, accounts);

    // Check that the crowdsale stage is ready to be completed and reached the completion
    assert.equal(parseFloat(await crowdsale.startPrice()), startPrice);
    assert.equal(parseFloat(await crowdsale.changePerBlock()), 10);
    assert.equal(parseFloat(await crowdsale.changePrice()), web3.toWei(0.4, 'ether'));
    assert.equal(parseFloat(await crowdsale.minCap()), minCap);
    assert.equal(parseFloat(await crowdsale.maxCap()), maxCap);
    assert.equal(parseFloat(await crowdsale.totalTokens()), 7000000);
    assert.equal(parseFloat(await crowdsale.presaleDiscount()), 40);
    assert.equal(parseInt(await crowdsale.ownerPercentage()), ownerPercentage);
    assert.equal(help.toEther(await crowdsale.totalPresaleWei()), 0);
    assert.equal(parseFloat(await crowdsale.weiRaised()), totalWeiSent);
    assert(parseFloat(await crowdsale.weiRaised()) >= minCap, "at least minCap has been raised");
    assert.equal(parseFloat(await crowdsale.tokensSold()), totalTokensBought);
    assert.equal(parseFloat(await crowdsale.lastPrice()), price);
    presaleTokens = 0;

    // Check token status and update crowdsale stage status
    let crowdsaleStatus = await crowdsale.status();
    assert.equal(parseFloat(await crowdsale.status()), 2);
    await help.waitToBlock(endBlock+1, accounts);

    // crowdsale has all the tokens before checkCrowdsale
    assert.equal(parseFloat(await token.balanceOf(token.contract.address)), 0);
    assert.equal(parseFloat(await token.balanceOf(crowdsale.contract.address)), help.lif2LifWei(maxTokens));

    await crowdsale.checkCrowdsale();

    // crowdsale has returned unused tokens to the LifToken (keeps only tokens for the bids actually made
    assert.equal(parseFloat(await token.balanceOf(crowdsale.contract.address)), help.lif2LifWei(tokens1));
    assert.equal(parseFloat(await token.balanceOf(token.contract.address)), help.lif2LifWei(maxTokens - tokens1));

    // Check the values of the ended crowdsale stage, token status, and claim the tokens
    assert.equal(parseInt(await crowdsale.status()), 3);
    assert.equal(parseFloat(await crowdsale.startPrice()), startPrice);
    assert.equal(parseFloat(await crowdsale.changePerBlock()), 10);
    assert.equal(parseFloat(await crowdsale.changePrice()), web3.toWei(0.4, 'ether'));
    assert.equal(parseFloat(await crowdsale.minCap()), minCap);
    assert.equal(parseFloat(await crowdsale.maxCap()), maxCap);
    assert.equal(parseFloat(await crowdsale.totalTokens()), 7000000);
    assert.equal(parseFloat(await crowdsale.presaleDiscount()), 40);
    assert.equal(parseInt(await crowdsale.ownerPercentage()), 0);
    assert.equal(help.toEther(await crowdsale.totalPresaleWei()), 0);
    assert.equal(parseFloat(await crowdsale.weiRaised()), totalWeiSent);
    assert.equal(parseFloat(await crowdsale.tokensSold()), totalTokensBought);
    assert.equal(parseFloat(await crowdsale.lastPrice()), price);

    // Distribute the tokens and check values
    console.log("before distribute tokens");
    assert.equal(parseFloat(await token.balanceOf(accounts[1])), 0);
    await crowdsale.distributeTokens(accounts[1], false);
    assert.equal(parseFloat(await token.balanceOf(crowdsale.contract.address)), 0);
    assert.equal(parseFloat(await token.balanceOf(accounts[1])), help.lif2LifWei(tokens1));
    console.log("before check values");
    await help.checkToken(token, accounts, maxTokens, [tokens1, 0, 0, 0, 0]);
    await help.checkCrowdsale(crowdsale, 0, 0);
    // Check all final values
    console.log("before final check values");
    await help.checkToken(token, accounts, maxTokens, [tokens1, 0, 0, 0, 0]);
    await help.checkCrowdsale(crowdsale, 0, 0);

    // check that the owner can fund a new crowdsale with the unused tokens

    var crowdsale2 = await LifCrowdsale.new(
      token.address, startBlock, endBlock, startPrice, 10, web3.toWei(0.4, 'ether'), minCap, maxCap, maxTokens - tokens1, 40, ownerPercentage
    );

    // Transfer tokens to the crowdsale
    assert.equal(parseFloat(await token.balanceOf(crowdsale2.contract.address)), 0);
    /*
     * TODO: Make this to work: owner should be able to fund a new crowdsale with the unused tokens
     *
    await token.transferFrom(token.contract.address, crowdsale2.contract.address, help.lif2LifWei(maxTokens - tokens1), {from: accounts[0]});
    assert.equal(parseFloat(await token.balanceOf(crowdsale2.contract.address)), help.lif2LifWei(maxTokens - tokens1));
    */
  });

  it("Should simulate a crowdsale of 7m tokens with one ducth auction stage, using future discount and distribute 3M of the tokens using futurePayments", async function() {
    var currentBlock = web3.eth.blockNumber;
    var startBlock = currentBlock+15;
    var endBlock = startBlock+50;
    var totalWeiSent = 0;
    var totalTokensBought = 0;
    var presaleTokens = 0;
    var maxTokens = 7000000;
    var paymentTokens = 300000;
    var ownerPercentage = 275;
    var presaleDiscount = 40;
    var minCap = 10000000;
    var maxCap = 40000000;

    // Add crowdsale stage to sell 7M tokens using dutch auction and the future payments.
    var crowdsale = await help.createAndFundCrowdsale({
      token: token,
      startBlock: startBlock, endBlock: endBlock,
      startPrice: web3.toWei(5, 'ether'),
      changePerBlock: 10, changePrice: web3.toWei(0.4, 'ether'),
      minCap: web3.toWei(minCap, 'ether'), maxCap: web3.toWei(maxCap, 'ether'),
      maxTokens: maxTokens,
      presaleDiscount: presaleDiscount, ownerPercentage: ownerPercentage
    }, accounts);

    // create future payment, issue & transfer tokens into it
    let futurePayment = await FuturePayment.new(accounts[10], endBlock+20, token.address);
    assert.equal(await futurePayment.afterBlock(), endBlock+20);
    assert.equal(await futurePayment.payee(), accounts[10]);
    assert.equal(await futurePayment.tokenAddress(), token.address);

    await token.issueTokens(paymentTokens);
    await token.transferFrom(token.address, futurePayment.address, help.lif2LifWei(paymentTokens), {from: accounts[0]});

    // Add discount of 250000 ethers
    // But first let's transfer the max tokens this discounted amount can buy
    let minTokenPrice = minCap / maxTokens;
    let discountedAmount = 250000;
    let maxDiscountTokens = (discountedAmount / minTokenPrice) * (presaleDiscount + 100) / 100;
    console.log("Issuing & transferring max discount tokens: ", maxDiscountTokens);
    await token.issueTokens(maxDiscountTokens);
    await token.transferFrom(token.address, crowdsale.address, help.lif2LifWei(maxDiscountTokens), {from: accounts[0]});

    await crowdsale.addDiscount(accounts[10], web3.toWei(discountedAmount, 'ether'));

    // issue & transfer tokens for founders payments
    let maxFoundersPaymentTokens = (maxTokens + maxDiscountTokens) * (ownerPercentage / 1000.0) ;
    console.log("before issue founders tokens, maxSupply: ", await token.maxSupply(),
      " ownerPercentage / 1000: ", ownerPercentage / 1000,
      "\n tokens for founders: ", maxFoundersPaymentTokens);
    await token.issueTokens(maxFoundersPaymentTokens);
    await token.transferFrom(token.address, crowdsale.address, help.lif2LifWei(maxFoundersPaymentTokens), {from: accounts[0]});

    // Check that the payment was created succesfully with the right values
    assert.equal(await token.balanceOf(futurePayment.contract.address), help.lif2LifWei(300000));
    assert.equal(parseFloat(await token.maxSupply()), maxTokens + paymentTokens + maxDiscountTokens + maxFoundersPaymentTokens);

    // Shouldnt be able to submit the bid since first stage didnt started, the ethers will be returned
    try {
      await crowdsale.submitBid({ value: web3.toWei(1, 'ether'), from: accounts[1] });
      assert.equal(false, true, "submitBid should have thrown an error because crowdsale has not started yet");
    } catch (error) {
      if (error.message.search('invalid JUMP') == -1) throw error;
    }

    console.log("after try submitbid");

    // assert price == 0 before start
    // but first assert we are before start
    assert(web3.eth.blockNumber < startBlock, "crowdsale should not have started yet");
    var price = parseFloat(await crowdsale.getPrice());
    assert.equal(price, web3.toWei(0, 'ether'), "price should be 0 before the crowdsale starts");

    await help.waitToBlock(startBlock+1, accounts);

    // start crowdsale
    await crowdsale.setStatus(2);

    let bids = [
      500 * 1000,
      1000 * 1000,
      500 * 1000,
      1000 * 1000,
      2000 * 1000,
      750 * 1000,
      1000 * 1000,
      127451
    ];

    let totalBids = _.sum(bids);
    assert(maxTokens >= totalBids, "totalBids do not exceed maxTokens");

    // Submit bid of 500000 on accounts[1]
    price = parseFloat(await crowdsale.getPrice());
    lastprice = price;
    assert.equal(price, web3.toWei(5, 'ether'));
    totalWeiSent += price*bids[0];
    totalTokensBought += bids[0];
    await crowdsale.submitBid({ value: web3.toWei(5, 'ether')*bids[0], from: accounts[1] });
    await help.checkToken(token, accounts, 0, [0, 0, 0, 0, 0]);
    await help.checkCrowdsale(crowdsale, help.toEther(bids[0]*web3.toWei(5, 'ether')), 0);
    await help.waitToBlock(startBlock+10, accounts);

    console.log("after first submitbid and checkToken");

    // Submit bid of 1000000 on accounts[2]
    // Submit bid of 500000 on accounts[3]
    price = parseFloat(await crowdsale.getPrice());
    totalWeiSent += price*bids[1];
    totalWeiSent += price*bids[2];
    totalTokensBought += bids[1];
    totalTokensBought += bids[2];
    await crowdsale.submitBid({ value: price*bids[1], from: accounts[2] });
    await crowdsale.submitBid({ value: price*bids[2], from: accounts[3] });
    await help.waitToBlock(startBlock+20, accounts);

    // Submit bid of 1000000 on accounts[4]
    // Submit bid of 2000000 on accounts[5]
    price = parseFloat(await crowdsale.getPrice());
    totalWeiSent += price*bids[3];
    totalWeiSent += price*bids[4];
    totalTokensBought += bids[3];
    totalTokensBought += bids[4];
    await crowdsale.submitBid({ value: price*bids[3], from: accounts[4] });
    await crowdsale.submitBid({ value: price*bids[4], from: accounts[5] });
    await help.waitToBlock(startBlock+40, accounts);

    // Submit bid of 750000 on accounts[6]
    // Submit bid of 1000000 on accounts[7]
    // Submit bid of 127451 on accounts[8]
    price = parseFloat(await crowdsale.getPrice());
    totalWeiSent += price*bids[5];
    totalWeiSent += price*bids[6];
    totalWeiSent += price*bids[7];
    totalTokensBought += bids[5];
    totalTokensBought += bids[6];
    totalTokensBought += bids[7];
    await crowdsale.submitBid({ value: price*bids[5], from: accounts[6] });
    await crowdsale.submitBid({ value: price*bids[6], from: accounts[7] });
    await crowdsale.submitBid({ value: price*bids[7], from: accounts[8] });

    assert.equal(totalTokensBought, totalBids);

    // Check that the crowdsale stage is ready to be completed and reached the completion
    assert.equal(parseFloat(await crowdsale.startPrice()), web3.toWei(5, 'ether'));
    assert.equal(parseFloat(await crowdsale.changePerBlock()), 10);
    assert.equal(parseFloat(await crowdsale.changePrice()), web3.toWei(0.4, 'ether'));
    assert.equal(parseFloat(await crowdsale.minCap()), web3.toWei(10000000, 'ether'));
    assert.equal(parseFloat(await crowdsale.maxCap()), web3.toWei(40000000, 'ether'));
    assert.equal(parseFloat(await crowdsale.totalTokens()), 7000000);
    assert.equal(parseFloat(await crowdsale.presaleDiscount()), presaleDiscount);
    assert.equal(parseInt(await crowdsale.ownerPercentage()), ownerPercentage);
    assert.equal(help.toEther(await crowdsale.totalPresaleWei()), 250000);
    assert.equal(help.lifWei2Lif(await crowdsale.weiRaised()), help.lifWei2Lif(totalWeiSent));
    assert.equal(parseFloat(await crowdsale.tokensSold()), totalTokensBought);
    assert.equal(parseFloat(await crowdsale.lastPrice()), price);
    presaleTokens = help.toWei(250000)/(price*0.6);

    // Check token status and update crowdsale stage status
    let crowdsaleStatus = await crowdsale.status();
    assert.equal(parseFloat(await crowdsale.status()), 2);
    await help.waitToBlock(endBlock+1, accounts);
    await crowdsale.checkCrowdsale();

    // Check the values of the ended crowdsale stage, token status, and claim the tokens
    assert.equal(parseInt(await crowdsale.status()), 3);
    assert.equal(parseFloat(await crowdsale.startPrice()), web3.toWei(5, 'ether'));
    assert.equal(parseFloat(await crowdsale.changePerBlock()), 10);
    assert.equal(parseFloat(await crowdsale.changePrice()), web3.toWei(0.4, 'ether'));
    assert.equal(parseFloat(await crowdsale.minCap()), web3.toWei(10000000, 'ether'));
    assert.equal(parseFloat(await crowdsale.maxCap()), web3.toWei(40000000, 'ether'));
    assert.equal(parseFloat(await crowdsale.totalTokens()), 7000000);
    assert.equal(parseFloat(await crowdsale.presaleDiscount()), presaleDiscount);
    assert.equal(parseInt(await crowdsale.ownerPercentage()), 0);
    assert.equal(help.toEther(await crowdsale.totalPresaleWei()), 250000);
    assert.equal(help.lifWei2Lif(await crowdsale.weiRaised()), help.lifWei2Lif(totalWeiSent));
    assert.equal(parseFloat(await crowdsale.tokensSold()), totalTokensBought);
    assert.equal(parseFloat(await crowdsale.lastPrice()), price);

    // Distribute the tokens and check values
    await crowdsale.distributeTokens(accounts[1], false);
    await crowdsale.distributeTokens(accounts[2], false);
    await crowdsale.distributeTokens(accounts[3], false);
    await crowdsale.distributeTokens(accounts[4], false);
    await crowdsale.distributeTokens(accounts[5], false);
    await crowdsale.distributeTokens(accounts[6], false);
    await crowdsale.distributeTokens(accounts[7], false);
    await crowdsale.distributeTokens(accounts[8], false);
    await crowdsale.distributeTokens(accounts[10], true);
    console.log("before check values");
    await help.checkToken(token, accounts, maxTokens + paymentTokens + maxDiscountTokens + maxFoundersPaymentTokens, [500000, 1000000, 500000, 1000000, 2000000]);
    await help.checkCrowdsale(crowdsale, 0, 0);
    // Shouldnt allow to a claim a payment before the requested block
    try {
      await futurePayment.claimPayment({from: accounts[10]});
      throw("claimTokensPayment should have failed and thrown an exception because we are before requested block");
    } catch (error) {
      if (error.message.search('invalid JUMP') == -1) throw error;
    }
    await help.waitToBlock(endBlock+41, accounts);
    // Should be able to claim all the payments
    await futurePayment.claimPayment({from: accounts[10]});

    for(let i = 0; i < 8; i++) {
      let futurePaymentAddress = await crowdsale.foundersFuturePayments(i);
      let futurePayment = await FuturePayment.at(futurePaymentAddress);
      await futurePayment.claimPayment({from: accounts[0]});
    }

    actualPrice = await crowdsale.lastPrice();
    expectedDiscountedTokens = Math.round((discountedAmount / help.toEther(actualPrice)) / (100 - presaleDiscount) * 100);

    assert.equal(paymentTokens + expectedDiscountedTokens, help.lifWei2Lif(await token.balanceOf(accounts[10])),
      "accounts[10] should have received the paymentTokens + the actual discounted tokens (given the actual price)");
    let expectedFoundersTokens = Math.round((totalBids + expectedDiscountedTokens) * (ownerPercentage / 1000));
    let ownerBalance = await token.balanceOf(accounts[0]);
    assert.equal(help.lifWei2Lif(ownerBalance), expectedFoundersTokens);
    // Check all final values
    let totalIssuedTokens = maxTokens + paymentTokens + maxDiscountTokens + maxFoundersPaymentTokens;
    await help.checkToken(token, accounts, totalIssuedTokens, [500000, 1000000, 500000, 1000000, 2000000]);
    await help.checkCrowdsale(crowdsale, 0);

    assert.equal(help.lifWei2Lif(await token.balanceOf(token.contract.address)),
      Math.round(
        (maxDiscountTokens - expectedDiscountedTokens) +
        (maxTokens - totalBids) +
        (maxFoundersPaymentTokens - expectedFoundersTokens)
      ), "unused tokens should have been returned to the token contract");
  });


  /*
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
    await crowdsale.addDiscount(accounts[10], web3.toWei(250000, 'ether'));

    // Check that the crowdsale stage and payments created succesfully with the right values
    let dutchAuction = await help.getStage(token, 0);
    let maxSupply = await token.maxSupply();
    assert.equal(parseFloat(dutchAuction[2]), web3.toWei(5, 'ether'));
    assert.equal(parseFloat(dutchAuction[3]), 10);
    assert.equal(parseFloat(dutchAuction[4]), web3.toWei(0.2, 'ether'));
    assert.equal(parseFloat(dutchAuction[5]), web3.toWei(10000000, 'ether'));
    assert.equal(parseFloat(maxSupply), 7000000);
    await help.waitToBlock(startBlock+1, accounts);

    // Submit bid of 700000 on accounts[1]
    // Submit bid of 400000 on accounts[2]
    let price = parseFloat((await crowdsale.getPrice())[0]);
    lastPrice = price;
    totalWeiSent += price*700000;
    totalWeiSent += price*400000;
    totalTokensBought += 700000;
    totalTokensBought += 400000;
    await crowdsale.submitBid({ value: price*700000, from: accounts[1] });
    await crowdsale.submitBid({ value: price*400000, from: accounts[2] });

    await help.checkToken(token, accounts, help.toEther(totalWeiSent), 0, web3.toWei(5, 'ether'), [0, 0, 0, 0, 0]);
    await help.waitToBlock(startBlock+10, accounts);

    // Submit bid of 200000 on accounts[3]
    // Submit bid of 200000 on accounts[4]
    // Submit bid of 500000 on accounts[5]
    price = parseFloat((await crowdsale.getPrice())[0]);
    lastPrice = price;
    totalWeiSent += price*200000;
    totalWeiSent += price*200000;
    totalWeiSent += price*500000;
    totalTokensBought += 200000;
    totalTokensBought += 200000;
    totalTokensBought += 500000;
    await crowdsale.submitBid({ value: price*200000, from: accounts[3] });
    await crowdsale.submitBid({ value: price*200000, from: accounts[4] });
    await crowdsale.submitBid({ value: price*500000, from: accounts[5] });
    await help.waitToBlock(startBlock+20, accounts);

    // Submit bid of 600000 on accounts[6]
    // Submit bid of 900000 on accounts[7]
    price = parseFloat((await crowdsale.getPrice())[0]);
    lastPrice = price;
    totalWeiSent += price*600000;
    totalWeiSent += price*900000;
    totalTokensBought += 600000;
    totalTokensBought += 900000;
    await crowdsale.submitBid({ value: price*600000, from: accounts[6] });
    await crowdsale.submitBid({ value: price*900000, from: accounts[7] });
    await help.waitToBlock(startBlock+50, accounts);

    // Submit bid of 500000 on accounts[8]
    price = parseFloat((await crowdsale.getPrice())[0]);
    lastPrice = price;
    totalWeiSent += parseFloat(price)*500000;
    totalTokensBought += 500000;
    await crowdsale.submitBid({ value: price*500000, from: accounts[8] });
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
    assert.equal(help.lifWei2Lif(auctionSuccess[11]), help.lifWei2Lif(totalWeiSent));
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
    assert.equal(help.lifWei2Lif(auctionEnded[11]), help.lifWei2Lif(totalWeiSent));
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
    await help.checkToken(token, accounts, 0, 4125000, 0, [700000, 400000, 200000, 200000, 500000]);

    // Start another stage to try to sell the remaining tokens
    currentBlock = web3.eth.blockNumber;
    startBlock = currentBlock+10;
    endBlock = currentBlock+110;
    await token.addCrowdsaleStage(startBlock, endBlock, web3.toWei(7, 'ether'), 10, web3.toWei(0.2, 'ether'), web3.toWei(10000000, 'ether'), web3.toWei(30000000, 'ether'), 2875000, 0, 428);

    //Try to add a discount, but it will be rejected due to not discount on auction
    try {
      await crowdsale.addDiscount(accounts[10], web3.toWei(250000, 'ether'));
    } catch (error) {
      if (error.message.search('invalid JUMP') == -1) throw error;
    }
    let secondDutchAuction = await help.getStage(token, 1);

    // Check that the crowdsale stage and payments created succesfully with the right values
    assert.equal(parseFloat(secondDutchAuction[2]), web3.toWei(7, 'ether'));
    assert.equal(parseFloat(secondDutchAuction[3]), 10);
    assert.equal(parseFloat(secondDutchAuction[4]), web3.toWei(0.2, 'ether'));
    assert.equal(parseFloat(secondDutchAuction[5]), web3.toWei(10000000, 'ether'));
    await help.waitToBlock(startBlock+1, accounts);

    // Submit bid of 100000 on accounts[3]
    // Submit bid of 300000 on accounts[4]
    price = parseFloat((await crowdsale.getPrice())[0]);
    lastPrice = price;
    totalWeiSent = 0;
    totalTokensBought = 0;
    totalWeiSent += price*100000;
    totalWeiSent += price*300000;
    totalTokensBought += 100000;
    totalTokensBought += 300000;
    await crowdsale.submitBid({ value: price*100000, from: accounts[3] });
    await crowdsale.submitBid({ value: price*300000, from: accounts[4] });
    await help.waitToBlock(startBlock+10, accounts);

    // Submit bid of 400000 on accounts[6]
    price = parseFloat((await crowdsale.getPrice())[0]);
    lastPrice = price;
    totalWeiSent += price*400000;
    totalTokensBought += 400000;
    await crowdsale.submitBid({ value: price*400000, from: accounts[6] });
    await help.waitToBlock(startBlock+20, accounts);

    // Submit bid of 600000 on accounts[7]
    // Submit bid of 600000 on accounts[8]
    price = parseFloat((await crowdsale.getPrice())[0]);
    lastPrice = price;
    totalWeiSent += price*600000;
    totalWeiSent += price*600000;
    totalTokensBought += 600000;
    totalTokensBought += 600000;
    await crowdsale.submitBid({ value: price*600000, from: accounts[7] });
    await crowdsale.submitBid({ value: price*600000, from: accounts[8] });

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
    assert.equal(help.lifWei2Lif(auctionSuccess[11]), help.lifWei2Lif(totalWeiSent));
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
    assert.equal(help.lifWei2Lif(auctionEnded[11]), help.lifWei2Lif(totalWeiSent));
    assert.equal(parseFloat(auctionEnded[12]), totalTokensBought);
    assert.equal(parseFloat(auctionEnded[13]), lastPrice);

    // Distribute the tokens sold and check values
    await token.distributeTokens(1, accounts[3], false, {from: accounts[0]});
    await token.distributeTokens(1, accounts[4], false, {from: accounts[0]});
    await token.distributeTokens(1, accounts[6], false, {from: accounts[0]});
    await token.distributeTokens(1, accounts[7], false, {from: accounts[0]});
    await token.distributeTokens(1, accounts[8], false, {from: accounts[0]});
    await help.checkToken(token, accounts, 0, 6125000, 0, [700000, 400000, 300000, 500000, 500000]);

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
    await help.waitToBlock(startBlock+1, accounts);

    // Submit bid of 175000 on accounts[1]
    // Submit bid of 300000 on accounts[2]
    price = parseFloat((await crowdsale.getPrice())[0]);
    lastPrice = price;
    totalWeiSent = 0;
    totalTokensBought = 0;
    totalWeiSent += parseFloat(price)*175000;
    totalWeiSent += parseFloat(price)*300000;
    totalTokensBought += 175000;
    totalTokensBought += 300000;
    await crowdsale.submitBid({ value: price*175000, from: accounts[1] });
    await crowdsale.submitBid({ value: price*300000, from: accounts[2] });
    await help.waitToBlock(startBlock+5, accounts);

    // Submit bid of 200000 on accounts[3]
    price = parseFloat((await crowdsale.getPrice())[0]);
    lastPrice = price;
    totalWeiSent += parseFloat(price)*200000;
    totalTokensBought += 200000;
    await crowdsale.submitBid({ value: price*200000, from: accounts[3] });
    await help.waitToBlock(startBlock+10, accounts);

    // Submit bid of 200000 on accounts[4]
    price = parseFloat((await crowdsale.getPrice())[0]);
    lastPrice = price;
    totalWeiSent += parseFloat(price)*200000;
    totalTokensBought += 200000;
    await crowdsale.submitBid({ value: price*200000, from: accounts[4] });

    await help.waitToBlock(endBlock, accounts);
    await crowdsale.checkCrowdsale();

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
    assert.equal(help.lifWei2Lif(thirdAuctionEnded[11]), help.lifWei2Lif(totalWeiSent));
    assert.equal(parseFloat(thirdAuctionEnded[12]), totalTokensBought);
    assert.equal(parseFloat(thirdAuctionEnded[13]), lastPrice);

    // Distribute the remaining tokens and check values
    await help.waitToBlock(endBlock, accounts);
    await token.distributeTokens(2, accounts[1], false, {from: accounts[0]});
    await token.distributeTokens(2, accounts[2], false, {from: accounts[0]});
    await token.distributeTokens(2, accounts[3], false, {from: accounts[0]});
    await token.distributeTokens(2, accounts[4], false, {from: accounts[0]});
    await help.checkToken(token, accounts, 0, 7000000, 0, [875000, 700000, 500000, 700000, 500000]);

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
    assert.equal(help.lifWei2Lif(ownerBalance), 2995992);

    // Check all final values
    await help.checkToken(token, accounts, 0, 9995992, 0, [875000, 700000, 500000, 700000, 500000]);
  });
  */

});
