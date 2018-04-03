var LifMarketValidationMechanism = artifacts.require('./distribution/LifMarketValidationMechanism.sol');
var VestedPayment = artifacts.require('./distribution/VestedPayment.sol');

var BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

var _ = require('lodash');
var jsc = require('jsverify');
var help = require('./helpers');
var gen = require('./generators');
var latestTime = require('./helpers/latestTime');
var { increaseTimeTestRPC, increaseTimeTestRPCTo, duration } = require('./helpers/increaseTime');

const priceFactor = 100000;

const isZeroAddress = (addr) => addr === help.zeroAddress;

let isCouldntUnlockAccount = (e) => e.message.search('could not unlock signer account') >= 0;

function assertExpectedException (e, shouldThrow, addressZero, state, command) {
  let isKnownException = help.isInvalidOpcodeEx(e) ||
    (isCouldntUnlockAccount(e) && addressZero);
  if (!shouldThrow || !isKnownException) {
    throw (new ExceptionRunningCommand(e, state, command));
  }
}

function increaseEthBalance (state, accountIndex, ethDelta) {
  if (accountIndex === 'zero') {
    return state;
  } else {
    state.ethBalances[accountIndex] = state.ethBalances[accountIndex].plus(ethDelta);
    return state;
  }
}

function decreaseEthBalance (state, accountIndex, ethDelta) {
  return increaseEthBalance(state, accountIndex, -ethDelta);
}

function trackGasFromLastBlock (state, accountIndex) {
  if (accountIndex === 'zero') {
    return state;
  } else {
    const block = web3.eth.getBlock('latest');
    const gasCost = help.gasPrice.mul(block.gasUsed);

    return decreaseEthBalance(state, accountIndex, gasCost);
  }
}

async function runWaitTimeCommand (command, state) {
  await increaseTimeTestRPC(command.seconds);
  return state;
}

function ExceptionRunningCommand (e, state, command) {
  this.error = e;
  this.state = state;
  this.command = command;
  this.message = 'command ' + JSON.stringify(command) + ' has thrown.' + '\nError: ' + e;
}

ExceptionRunningCommand.prototype = Object.create(Error.prototype);
ExceptionRunningCommand.prototype.constructor = ExceptionRunningCommand;

async function runCheckRateCommand (command, state) {
  let expectedRate = help.getCrowdsaleExpectedRate(state.crowdsaleData, latestTime());
  let rate = parseFloat(await state.crowdsaleContract.getRate());

  assert.equal(expectedRate, rate,
    'expected rate is different! Expected: ' + expectedRate + ', actual: ' + rate + '. blocks: ' + web3.eth.blockTimestamp +
    ', start/end1/end2: ' + state.crowdsaleData.startTimestamp + '/' + state.crowdsaleData.end1Timestamp + '/' + state.crowdsaleData.end2Timestamp);

  return state;
}

function getBalance (state, account) {
  return state.balances[account] || new BigNumber(0);
}

async function runBuyTokensCommand (command, state) {
  let crowdsale = state.crowdsaleData,
    { startTimestamp, end2Timestamp } = crowdsale,
    weiCost = web3.toWei(new BigNumber(command.eth), 'ether'),
    nextTimestamp = latestTime(),
    rate = help.getCrowdsaleExpectedRate(crowdsale, nextTimestamp),
    tokens = new BigNumber(command.eth).mul(rate),
    account = gen.getAccount(command.account),
    beneficiaryAccount = gen.getAccount(command.beneficiary),
    hasZeroAddress = _.some([account, beneficiaryAccount], isZeroAddress);

  let shouldThrow = (nextTimestamp < startTimestamp) ||
    (nextTimestamp > end2Timestamp) ||
    (state.crowdsalePaused) ||
    (state.crowdsaleFinalized) ||
    (state.weiPerUSDinTGE === 0) ||
    hasZeroAddress ||
    (command.eth === 0);

  try {
    help.debug('buyTokens rate:', rate, 'eth:', command.eth, 'endBlocks:', crowdsale.end1Timestamp, end2Timestamp, 'blockTimestamp:', nextTimestamp);

    const tx = await state.crowdsaleContract.buyTokens(beneficiaryAccount, { value: weiCost, from: account });
    assert.equal(false, shouldThrow, 'buyTokens should have thrown but it didnt');

    state.purchases = _.concat(state.purchases,
      { tokens: tokens, rate: rate, wei: weiCost, beneficiary: command.beneficiary, account: command.account }
    );
    state.balances[command.beneficiary] = getBalance(state, command.beneficiary).plus(help.lif2LifWei(tokens));
    state.weiRaised = state.weiRaised.plus(weiCost);
    state.totalSupply = state.totalSupply.plus(help.lif2LifWei(tokens));

    state = decreaseEthBalance(state, command.account, weiCost);
    state = decreaseEthBalance(state, command.account, help.txGasCost(tx));
  } catch (e) {
    state = trackGasFromLastBlock(state, command.account);
    assertExpectedException(e, shouldThrow, hasZeroAddress, state, command);
  }
  return state;
}

async function runSendTransactionCommand (command, state) {
  let crowdsale = state.crowdsaleData,
    { startTimestamp, end2Timestamp } = crowdsale,
    weiCost = web3.toWei(new BigNumber(command.eth), 'ether'),
    nextTimestamp = latestTime(),
    rate = help.getCrowdsaleExpectedRate(crowdsale, nextTimestamp),
    tokens = new BigNumber(command.eth).mul(rate),
    account = gen.getAccount(command.account);

  let inTGE = nextTimestamp >= startTimestamp && nextTimestamp <= end2Timestamp,
    hasZeroAddress = isZeroAddress(account);

  let shouldThrow = (!inTGE) ||
    (inTGE && state.weiPerUSDinTGE === 0) ||
    (state.crowdsalePaused) ||
    (state.crowdsaleFinalized) ||
    (command.eth === 0) ||
    hasZeroAddress;

  try {
    // help.debug('buyTokens rate:', rate, 'eth:', command.eth, 'endBlocks:', crowdsale.end1Timestamp, end2Timestamp, 'blockTimestamp:', nextTimestamp);

    const tx = await state.crowdsaleContract.sendTransaction({ value: weiCost, from: account });
    assert.equal(false, shouldThrow, 'sendTransaction should have thrown but it did not');
    if (inTGE) {
      state.purchases = _.concat(state.purchases,
        { tokens: tokens, rate: rate, wei: weiCost, beneficiary: command.beneficiary, account: command.account }
      );
      state.weiRaised = state.weiRaised.plus(weiCost);
    } else {
      throw (new Error('sendTransaction not in TGE should have thrown'));
    }
    state.totalSupply = state.totalSupply.plus(help.lif2LifWei(tokens));
    state = decreaseEthBalance(state, command.account, weiCost);
    state = decreaseEthBalance(state, command.account, help.txGasCost(tx));
  } catch (e) {
    state = trackGasFromLastBlock(state, command.account);
    assertExpectedException(e, shouldThrow, hasZeroAddress, state, command);
  }
  return state;
}

async function runBurnTokensCommand (command, state) {
  let account = gen.getAccount(command.account),
    balance = getBalance(state, command.account),
    hasZeroAddress = isZeroAddress(account),
    lifWei = help.lif2LifWei(command.tokens);

  let shouldThrow = state.tokenPaused ||
    (balance.lt(lifWei)) ||
    hasZeroAddress;

  try {
    const tx = await state.token.burn(lifWei, { from: account });
    assert.equal(false, shouldThrow, 'burn should have thrown but it did not');

    state.balances[account] = balance.minus(lifWei);
    state.totalSupply = state.totalSupply.minus(lifWei);

    state = decreaseEthBalance(state, command.account, help.txGasCost(tx));
  } catch (e) {
    state = trackGasFromLastBlock(state, command.account);
    assertExpectedException(e, shouldThrow, hasZeroAddress, state, command);
  }
  return state;
}

async function runSetWeiPerUSDinTGECommand (command, state) {
  let crowdsale = state.crowdsaleData,
    { startTimestamp, setWeiLockSeconds } = crowdsale,
    nextTimestamp = latestTime(),
    account = gen.getAccount(command.fromAccount),
    hasZeroAddress = isZeroAddress(account);

  let shouldThrow = (nextTimestamp >= startTimestamp - setWeiLockSeconds) ||
    (command.fromAccount !== state.owner) ||
    hasZeroAddress ||
    (command.wei === 0);

  help.debug('setting wei per usd in tge:', command.wei);
  try {
    let tx = await state.crowdsaleContract.setWeiPerUSDinTGE(command.wei, { from: account });
    assert.equal(false, shouldThrow, 'setWeiPerUSDinTGE should have thrown but it did not');
    state.weiPerUSDinTGE = new BigNumber(command.wei.toString());
    state = decreaseEthBalance(state, command.fromAccount, help.txGasCost(tx));
  } catch (e) {
    state = trackGasFromLastBlock(state, command.fromAccount);
    assertExpectedException(e, shouldThrow, hasZeroAddress, state, command);
  }
  return state;
}

async function runPauseCrowdsaleCommand (command, state) {
  let account = gen.getAccount(command.fromAccount),
    hasZeroAddress = isZeroAddress(account);

  let shouldThrow = (state.crowdsalePaused === command.pause) ||
    (command.fromAccount !== state.owner) ||
    hasZeroAddress;

  help.debug('pausing crowdsale, previous state:', state.crowdsalePaused, 'new state:', command.pause);
  try {
    let tx;
    if (command.pause) {
      tx = await state.crowdsaleContract.pause({ from: account });
    } else {
      tx = await state.crowdsaleContract.unpause({ from: account });
    }
    assert.equal(false, shouldThrow);
    state.crowdsalePaused = command.pause;
    state = decreaseEthBalance(state, command.fromAccount, help.txGasCost(tx));
  } catch (e) {
    state = trackGasFromLastBlock(state, command.fromAccount);
    assertExpectedException(e, shouldThrow, hasZeroAddress, state, command);
  }
  return state;
}

async function runPauseTokenCommand (command, state) {
  let account = gen.getAccount(command.fromAccount),
    hasZeroAddress = isZeroAddress(account);

  let shouldThrow = (state.tokenPaused === command.pause) ||
    !state.crowdsaleFinalized ||
    (command.fromAccount !== state.owner) ||
    hasZeroAddress;

  help.debug('pausing token, previous state:', state.tokenPaused, 'new state:', command.pause);
  try {
    let tx;
    if (command.pause) {
      tx = await state.token.pause({ from: account });
    } else {
      tx = await state.token.unpause({ from: account });
    }
    assert.equal(false, shouldThrow, 'tokenPause throw when it shouldnt');
    state.tokenPaused = command.pause;
    state = decreaseEthBalance(state, command.fromAccount, help.txGasCost(tx));
  } catch (e) {
    state = trackGasFromLastBlock(state, command.fromAccount);
    assertExpectedException(e, shouldThrow, hasZeroAddress, state, command);
  }
  return state;
}

async function runFinalizeCrowdsaleCommand (command, state) {
  let nextTimestamp = latestTime(),
    account = gen.getAccount(command.fromAccount),
    hasZeroAddress = isZeroAddress(account);

  let shouldThrow = state.crowdsaleFinalized ||
    state.crowdsalePaused || (state.weiPerUSDinTGE === 0) ||
    (account !== gen.getAccount(state.owner)) ||
    hasZeroAddress ||
    (nextTimestamp <= state.crowdsaleData.end2Timestamp);

  try {
    let crowdsaleFunded = (state.weiRaised >= state.crowdsaleData.minCapUSD * state.weiPerUSDinTGE);

    help.debug('finishing crowdsale on block', nextTimestamp, ', from address:', gen.getAccount(command.fromAccount), ', funded:', crowdsaleFunded);
    let tx = await state.crowdsaleContract.finalize(true, { from: account });
    help.debug('gas used in finalize:', tx.receipt.gasUsed);

    if (!help.inCoverage()) { // gas cannot be measured correctly when running coverage
      assert(tx.receipt.gasUsed < 6700000,
        'gas used in finalize (' + tx.receipt.gasUsed + ') should be less than gas limit in mainnet');
    }

    state = decreaseEthBalance(state, command.fromAccount, help.txGasCost(tx));

    let fundsRaised = state.weiRaised.div(state.weiPerUSDinTGE),
      minimumForMVM = await state.crowdsaleContract.maxFoundationCapUSD.call();

    if (crowdsaleFunded) {
      let totalSupplyBeforeFinalize = state.totalSupply;

      let vestedPaymentFounders = new VestedPayment(
        await state.crowdsaleContract.foundersVestedPayment()
      );
      let vestedPaymentFoundation = new VestedPayment(
        await state.crowdsaleContract.foundationVestedPayment()
      );

      assert.equal(state.crowdsaleData.foundersWallet, await vestedPaymentFounders.owner());
      assert.equal(state.crowdsaleData.foundationWallet, await vestedPaymentFoundation.owner());

      totalSupplyBeforeFinalize.mul(0.128).floor().should.be.bignumber.equal(
        await state.token.balanceOf(vestedPaymentFounders.address)
      );
      totalSupplyBeforeFinalize.mul(0.05).floor().should.be.bignumber.equal(
        await state.token.balanceOf(vestedPaymentFoundation.address)
      );

      // add founders, team and foundation long-term reserve to the totalSupply
      // in separate steps to round after each of them, exactly as in the contract
      let foundersVestingTokens = state.totalSupply.mul(0.128).floor(),
        longTermReserve = state.totalSupply.mul(0.05).floor(),
        teamTokens = state.totalSupply.mul(0.072).floor();

      state.totalSupply = state.totalSupply.plus(foundersVestingTokens)
        .plus(longTermReserve).plus(teamTokens);

      // used for some MVM calculations
      state.initialTokenSupply = state.totalSupply;

      if (fundsRaised.lte(minimumForMVM)) {
        state = increaseEthBalance(state, state.foundationWallet, state.weiRaised);
      } else {
        const foundationWeiAmount = minimumForMVM.mul(state.weiPerUSDinTGE);
        state = increaseEthBalance(state, state.foundationWallet, foundationWeiAmount);

        let MVMInitialBalance = state.weiRaised.minus(state.weiPerUSDinTGE.mul(state.crowdsaleData.minCapUSD));
        let MVMPeriods = MVMInitialBalance.gt(state.weiPerUSDinTGE.mul(state.crowdsaleData.MVM24PeriodsCapUSD)) ? 48 : 24;
        let mmAddress = await state.crowdsaleContract.MVM();
        help.debug('MVM contract address', mmAddress);

        let MVM = LifMarketValidationMechanism.at(mmAddress);

        assert.equal(MVMPeriods, parseInt(await MVM.totalPeriods()), 'MVM should last for ' + MVMPeriods + ' periods');
        assert.equal(state.crowdsaleData.foundationWallet, await MVM.foundationAddr());
        assert.equal(state.crowdsaleData.foundationWallet, await MVM.owner());

        state.MVM = MVM;

        const txTimestamp = web3.eth.getBlock(tx.receipt.blockNumber).timestamp;
        state.MVMStartTimestamp = txTimestamp + duration.days(30);
        assert.equal(state.MVMStartTimestamp, parseInt(await state.MVM.startTimestamp.call()),
          'state timestamp equal to contract?');

        state.MVMStartingBalance = MVMInitialBalance;
        state.MVMWeiBalance = MVMInitialBalance;
        state.MVMInitialBuyPrice = MVMInitialBalance
          .mul(priceFactor)
          .dividedBy(help.lif2LifWei(state.totalSupply)).floor();
      }
    } else {
      state.initialTokenSupply = state.totalSupply;
    }
    assert.equal(false, shouldThrow);
    state.crowdsaleFinalized = true;
    state.crowdsaleFunded = crowdsaleFunded;
  } catch (e) {
    state = trackGasFromLastBlock(state, command.fromAccount);
    assertExpectedException(e, shouldThrow, hasZeroAddress, state, command);
  }
  return state;
}

async function runAddPrivatePresalePaymentCommand (command, state) {
  let { startTimestamp } = state.crowdsaleData,
    nextTimestamp = latestTime(),
    weiSent = web3.toWei(command.eth, 'ether'),
    account = gen.getAccount(command.fromAccount),
    beneficiary = gen.getAccount(command.beneficiaryAccount),
    hasZeroAddress = _.some([account, beneficiary], isZeroAddress);

  let shouldThrow = (nextTimestamp >= startTimestamp) ||
    (state.crowdsalePaused) ||
    (account !== gen.getAccount(state.owner)) ||
    (state.crowdsaleFinalized) ||
    hasZeroAddress ||
    (weiSent === 0) ||
    (command.rate <= state.crowdsaleData.rate1);

  try {
    help.debug('Adding presale private tokens for account:', command.beneficiaryAccount, 'eth:', command.eth, 'fromAccount:', command.fromAccount, 'blockTimestamp:', nextTimestamp);

    const tx = await state.crowdsaleContract.addPrivatePresaleTokens(beneficiary, weiSent, command.rate, { from: account });

    assert.equal(false, shouldThrow, 'buyTokens should have thrown but it did not');

    state.totalSupply = state.totalSupply.plus(weiSent * command.rate);
    state.weiRaised = state.weiRaised.plus(weiSent);
    state.presalePurchases = _.concat(state.presalePurchases,
      { rate: command.rate, wei: weiSent, beneficiary: command.beneficiary, account: command.fromAccount }
    );
    state = decreaseEthBalance(state, command.fromAccount, help.txGasCost(tx));
  } catch (e) {
    state = trackGasFromLastBlock(state, command.fromAccount);
    assertExpectedException(e, shouldThrow, hasZeroAddress, state, command);
  }
  return state;
}

async function runClaimEthCommand (command, state) {
  let account = gen.getAccount(command.fromAccount),
    purchases = _.filter(state.purchases, (p) => p.account === command.fromAccount),
    hasZeroAddress = isZeroAddress(account);

  let shouldThrow = !state.crowdsaleFinalized ||
    state.crowdsaleFunded ||
    state.crowdsalePaused ||
    (purchases.length === 0) ||
    hasZeroAddress ||
    state.claimedEth[command.fromAccount] > 0;

  try {
    help.debug('claiming eth', command.fromAccount, JSON.stringify(purchases));
    const tx = await state.crowdsaleContract.claimEth({ from: account });

    assert.equal(false, shouldThrow, 'claimEth should have thrown but it did not');

    const claimedEthAmount = _.reduce(
      _.map(purchases, (p) => p.wei),
      (accum, wei) => accum.plus(wei)
    );
    state.claimedEth[command.account] = claimedEthAmount;
    state = increaseEthBalance(state, command.fromAccount, claimedEthAmount);
    state = decreaseEthBalance(state, command.fromAccount, help.txGasCost(tx));
  } catch (e) {
    state = trackGasFromLastBlock(state, command.fromAccount);
    assertExpectedException(e, shouldThrow, hasZeroAddress, state, command);
  }
  return state;
}

async function runReturnPurchaseCommand (command, state) {
  let account = gen.getAccount(command.fromAccount),
    contributor = gen.getAccount(command.contributor),
    purchases = _.filter(state.purchases, (p) => p.beneficiary === command.contributor),
    hasZeroAddress = (isZeroAddress(contributor) || isZeroAddress(account)),
    nextTimestamp = latestTime();

  let shouldThrow = state.crowdsaleFinalized ||
    (purchases.length === 0) ||
    hasZeroAddress ||
    (account !== gen.getAccount(state.owner)) ||
    (nextTimestamp <= state.crowdsaleData.end2Timestamp);

  try {
    help.debug('returning purhcase', command.contributor, JSON.stringify(purchases));
    const tx = await state.crowdsaleContract.returnPurchase(contributor, { from: account });

    assert.equal(false, shouldThrow, 'returnPurchase should have thrown but it did not');

    const returnedAmount = _.reduce(
      _.map(purchases, (p) => p.wei),
      (accum, wei) => accum.plus(wei)
    );

    state.purchases = _.remove(state.purchases, function (p) {
      return p.beneficiary !== command.contributor;
    });

    state.weiRaised = state.weiRaised.sub(returnedAmount);
    state.totalSupply = state.totalSupply.sub(state.balances[command.contributor]);
    state.balances[command.contributor] = 0;

    state = increaseEthBalance(state, command.contributor, returnedAmount);
    state = decreaseEthBalance(state, command.fromAccount, help.txGasCost(tx));
  } catch (e) {
    state = trackGasFromLastBlock(state, command.fromAccount);
    assertExpectedException(e, shouldThrow, hasZeroAddress, state, command);
  }
  return state;
}

async function runTransferCommand (command, state) {
  let fromAddress = gen.getAccount(command.fromAccount),
    toAddress = gen.getAccount(command.toAccount),
    fromBalance = getBalance(state, command.fromAccount),
    lifWei = help.lif2LifWei(command.lif),
    hasZeroAddress = _.some([fromAddress, toAddress], isZeroAddress),
    shouldThrow = state.tokenPaused || fromBalance.lt(lifWei) ||
      hasZeroAddress;

  try {
    const tx = await state.token.transfer(toAddress, lifWei, { from: fromAddress });

    assert.equal(false, shouldThrow, 'transfer should have thrown but it did not');

    state.balances[command.fromAccount] = fromBalance.minus(lifWei);
    state.balances[command.toAccount] = getBalance(state, command.toAccount).plus(lifWei);
    state = decreaseEthBalance(state, command.fromAccount, help.txGasCost(tx));
  } catch (e) {
    state = trackGasFromLastBlock(state, command.fromAccount);
    assertExpectedException(e, shouldThrow, hasZeroAddress, state, command);
  }
  return state;
}

function getAllowance (state, sender, from) {
  if (!state.allowances[sender]) { state.allowances[sender] = {}; }
  return state.allowances[sender][from] || new BigNumber(0);
}

function setAllowance (state, sender, from, allowance) {
  if (!state.allowances[sender]) { state.allowances[sender] = {}; }
  return (state.allowances[sender][from] = allowance);
}

async function runApproveCommand (command, state) {
  let fromAddress = gen.getAccount(command.fromAccount),
    spenderAddress = gen.getAccount(command.spenderAccount),
    lifWei = help.lif2LifWei(command.lif),
    hasZeroAddress = isZeroAddress(fromAddress),
    shouldThrow = state.tokenPaused || hasZeroAddress || (lifWei === 0);

  try {
    const tx = await state.token.approve(spenderAddress, lifWei, { from: fromAddress });

    assert.equal(false, shouldThrow, 'approve should have thrown but it did not');

    setAllowance(state, command.fromAccount, command.spenderAccount, lifWei);
    state = decreaseEthBalance(state, command.fromAccount, help.txGasCost(tx));
  } catch (e) {
    state = trackGasFromLastBlock(state, command.fromAccount);
    assertExpectedException(e, shouldThrow, hasZeroAddress, state, command);
  }
  return state;
}

async function runTransferFromCommand (command, state) {
  let senderAddress = gen.getAccount(command.senderAccount),
    fromAddress = gen.getAccount(command.fromAccount),
    toAddress = gen.getAccount(command.toAccount),
    fromBalance = getBalance(state, command.fromAccount),
    lifWei = help.lif2LifWei(command.lif),
    hasZeroAddress = _.some([senderAddress, fromAddress, toAddress], isZeroAddress),
    allowance = getAllowance(state, command.senderAccount, command.fromAccount);

  let shouldThrow = state.tokenPaused ||
    fromBalance.lt(lifWei) ||
    hasZeroAddress ||
    (allowance < lifWei);

  try {
    const tx = await state.token.transferFrom(senderAddress, toAddress, lifWei, { from: fromAddress });

    assert.equal(false, shouldThrow, 'transferFrom should have thrown but it did not');

    state.balances[command.fromAccount] = fromBalance.minus(lifWei);
    state.balances[command.toAccount] = getBalance(state, command.toAccount).plus(lifWei);
    setAllowance(state, command.senderAccount, command.fromAccount, allowance.minus(lifWei));
    state = decreaseEthBalance(state, command.senderAccount, help.txGasCost(tx));
  } catch (e) {
    state = trackGasFromLastBlock(state, command.senderAccount);
    assertExpectedException(e, shouldThrow, hasZeroAddress, state, command);
  }
  return state;
}

//
// Composed commands
//

async function startCrowdsaleAndBuyTokens (account, eth, weiPerUSD, state) {
  // unpause the crowdsale if needed
  if (state.crowdsalePaused) {
    state = await runPauseCrowdsaleCommand({ pause: false, fromAccount: state.owner }, state);
  }

  // set weiPerUSDinTGE rate if needed
  if (state.weiPerUSDinTGE !== weiPerUSD) {
    state = await runSetWeiPerUSDinTGECommand({ wei: weiPerUSD, fromAccount: state.owner }, state);
  }

  if (eth.gt(0)) {
    // wait for crowdsale startTimestamp
    if (latestTime() < state.crowdsaleData.startTimestamp) {
      await increaseTimeTestRPCTo(state.crowdsaleData.startTimestamp);
    }

    let weiRaisedBeforeBuy = state.weiRaised;

    // buy enough tokens to exactly reach the minCap (which is less than softCap)
    let buyTokensCommand = { account: account, eth: eth, beneficiary: account };

    state = await runBuyTokensCommand(buyTokensCommand, state);

    web3.toWei(eth, 'ether').plus(weiRaisedBeforeBuy)
      .should.be.bignumber.equal(state.weiRaised);
  }

  return state;
}

async function runFundCrowdsaleBelowMinCap (command, state) {
  let weiPerUSD = web3.toWei(1 / 300), // USD 300 per eth
    minCapUSD = await state.crowdsaleContract.minCapUSD.call(),
    currentUSDFunding = state.weiRaised.div(weiPerUSD).floor();

  if (!state.crowdsaleFinalized && currentUSDFunding.lt(minCapUSD)) {
    let minCapUSD = await state.crowdsaleContract.minCapUSD.call(),
      eth = new BigNumber(command.fundingEth);

    state = await startCrowdsaleAndBuyTokens(command.account, eth, weiPerUSD, state);

    // take current funding again, because previous command might have skipped
    // buying tokens if eth was lte 0
    currentUSDFunding = state.weiRaised.div(weiPerUSD).floor();

    currentUSDFunding.should.be.bignumber.lt(minCapUSD);

    if (command.finalize) {
      // wait for crowdsale end2Timestamp
      if (latestTime() < state.crowdsaleData.end2Timestamp) {
        await increaseTimeTestRPCTo(state.crowdsaleData.end2Timestamp + 1);
      }

      state = await runFinalizeCrowdsaleCommand({ fromAccount: state.owner }, state);

      // verify that the crowdsale is finalized and funded
      assert.equal(true, state.crowdsaleFinalized);
      assert.equal(false, state.crowdsaleFunded);

      // verify that there's no MVM
      assert(state.MVM === undefined, 'no MVM should have been created because funding is below min cap');
    }
  }

  return state;
}

async function runFundCrowdsaleBelowSoftCap (command, state) {
  if (!state.crowdsaleFinalized) {
    let weiPerUSD = 10000;

    // buy enough tokens to exactly reach the minCap (which is less than softCap)
    let minCapUSD = await state.crowdsaleContract.minCapUSD.call(),
      currentUSDFunding = state.weiRaised.div(weiPerUSD).floor(),
      wei = minCapUSD.minus(currentUSDFunding).mul(weiPerUSD),
      eth = web3.fromWei(wei, 'ether');

    state = await startCrowdsaleAndBuyTokens(command.account, eth, weiPerUSD, state);

    // take current funding again, because previous command might have skipped
    // buying tokens if eth was lte 0
    currentUSDFunding = state.weiRaised.div(weiPerUSD);

    if (command.finalize) {
      // wait for crowdsale end2Timestamp
      if (latestTime() < state.crowdsaleData.end2Timestamp) {
        await increaseTimeTestRPCTo(state.crowdsaleData.end2Timestamp + 1);
      }

      state = await runFinalizeCrowdsaleCommand({ fromAccount: state.owner }, state);

      // verify that the crowdsale is finalized and funded
      assert.equal(true, state.crowdsaleFinalized);
      assert.equal(true, state.crowdsaleFunded);

      // it might be that the funding was already over the soft cap, so let's check
      let softCap = await state.crowdsaleContract.maxFoundationCapUSD.call();

      if (currentUSDFunding.gt(softCap)) {
        assert(state.MVM);
        const capFor48Months = await state.crowdsaleContract.MVM24PeriodsCapUSD.call();
        if (currentUSDFunding.gte(capFor48Months)) {
          assert.equal(48, parseInt(await state.MVM.totalPeriods()),
            'MVM should last for 48 months');
        } else {
          assert.equal(24, parseInt(await state.MVM.totalPeriods()),
            'MVM should last for 24 months');
        }
        assert.equal(state.crowdsaleData.foundationWallet, await state.MVM.foundationAddr());
      } else {
        // verify that there's no MVM
        assert(state.MVM === undefined,
          'no MVM should have been created because funding is below soft cap');
      }
    }
  }

  return state;
}

async function runFundCrowdsaleOverSoftCap (command, state) {
  if (!state.crowdsaleFinalized) {
    let weiPerUSD = 10000,
      softCap = await state.crowdsaleContract.maxFoundationCapUSD.call(),
      currentUSDFunding = state.weiRaised.div(weiPerUSD),
      wei = softCap.minus(currentUSDFunding).mul(weiPerUSD).plus(command.softCapExcessWei),
      eth = web3.fromWei(wei, 'ether');

    state = await startCrowdsaleAndBuyTokens(command.account, eth, weiPerUSD, state);

    currentUSDFunding = state.weiRaised.div(weiPerUSD);

    if (command.finalize) {
      // wait for crowdsale end2Timestamp
      if (latestTime() < state.crowdsaleData.end2Timestamp) {
        await increaseTimeTestRPCTo(state.crowdsaleData.end2Timestamp + 1);
      }

      state = await runFinalizeCrowdsaleCommand({ fromAccount: state.owner }, state);

      // verify that the crowdsale is finalized and funded, but there's no MVM
      assert.equal(true, state.crowdsaleFinalized);
      assert.equal(true, state.crowdsaleFunded,
        'crowdwsale should be funded after fund over soft cap command');

      if (currentUSDFunding.gt(softCap)) {
        assert(state.MVM, 'there is MVM b/c funding is over the soft cap');
        assert.equal(24, parseInt(await state.MVM.totalPeriods()));
        assert.equal(state.crowdsaleData.foundationWallet, await state.MVM.foundationAddr());
      } else {
        assert(state.MVM === undefined, 'No MVM b/c funding is exactly the soft cap');
      }
    }
  }

  return state;
}

//
// Market Maker commands
//

let getMVMMaxClaimableWei = function (state) {
  if (state.MVMMonth >= state.MVMPeriods) {
    help.debug('calculating maxClaimableEth with', state.MVMStartingBalance,
      state.MVMClaimedWei,
      state.returnedWeiForBurnedTokens);
    return state.MVMStartingBalance
      .minus(state.MVMClaimedWei)
      .minus(state.returnedWeiForBurnedTokens);
  } else {
    const claimableFromReimbursements = state.MVMInitialBuyPrice
      .mul(state.MVMBurnedTokens).div(priceFactor)
      .minus(state.returnedWeiForBurnedTokens);

    const maxClaimable = state.MVMStartingBalance
      .mul(state.claimablePercentage).dividedBy(priceFactor)
      .mul(state.initialTokenSupply - state.MVMBurnedTokens)
      .dividedBy(state.initialTokenSupply)
      .minus(state.MVMClaimedWei)
      .plus(claimableFromReimbursements);

    return maxClaimable.gt(0) ? maxClaimable : new BigNumber(0);
  }
};

let isMVMFinished = (state) => state.MVM !== undefined &&
  state.MVMMonth >= state.MVMPeriods;

async function runMVMClaimWeiCommand (command, state) {
  if (state.MVM !== undefined) {
    let weiToClaim = web3.toWei(command.eth),
      hasZeroAddress = false;

    let shouldThrow = getMVMMaxClaimableWei(state).lt(weiToClaim) ||
      state.MVMMonth < 0 ||
      state.MVMPaused;

    try {
      help.debug('Claiming ', weiToClaim.toString(), 'wei (', command.eth.toString(), 'eth)');
      const tx = await state.MVM.claimWei(weiToClaim, { from: state.crowdsaleData.foundationWallet });

      state.MVMClaimedWei = state.MVMClaimedWei.plus(weiToClaim);
      state.MVMWeiBalance = state.MVMWeiBalance.minus(weiToClaim);
      state.MVMMaxClaimableWei = getMVMMaxClaimableWei(state);

      state = decreaseEthBalance(state, state.foundationWallet, help.txGasCost(tx));
      state = increaseEthBalance(state, state.foundationWallet, weiToClaim);
    } catch (e) {
      state = trackGasFromLastBlock(state, state.foundationWallet);
      assertExpectedException(e, shouldThrow, hasZeroAddress, state, command);
    }
  }

  return state;
}

async function runMVMSendTokensCommand (command, state) {
  if (state.MVM === undefined) {
    // doesn't make sense to execute the rest of the command, let's just assert
    // that the crowdsale was not funded (in which case there should be MM)
    // or the soft cap was not reached
    let TGEFunding = state.weiRaised.div(state.weiPerUSDinTGE).floor(),
      MVMMinCap = await state.crowdsaleContract.maxFoundationCapUSD.call();
    let shouldHaveMVM = state.crowdsaleFinalized && state.crowdsaleFunded &&
      (TGEFunding.gt(MVMMinCap));
    assert.equal(false, shouldHaveMVM,
      'if there is no MVM, crowdsale should not have been funded');
  } else {
    let lifWei = help.lif2LifWei(command.tokens),
      lifBuyPrice = state.MVMBuyPrice.div(priceFactor),
      tokensCost = new BigNumber(lifWei).mul(lifBuyPrice),
      fromAddress = gen.getAccount(command.from),
      lifBalanceBeforeSend = getBalance(state, command.from),
      hasZeroAddress = isZeroAddress(fromAddress);

    let shouldThrow = !state.crowdsaleFinalized ||
      !state.crowdsaleFunded ||
      state.MVMPaused ||
      lifBalanceBeforeSend.lt(lifWei) ||
      (command.tokens === 0) ||
      isMVMFinished(state) ||
      hasZeroAddress;

    try {
      help.debug('Selling ', command.tokens, ' tokens in exchange of ', web3.fromWei(tokensCost, 'ether'), 'eth at a price of', lifBuyPrice.toString());
      let tx1 = await state.token.approve(state.MVM.address, lifWei, { from: fromAddress });

      // decrease gas from tx1 already, so in case tx2 fails it is already taken into account
      state = decreaseEthBalance(state, command.from, help.txGasCost(tx1));

      let tx2 = await state.MVM.sendTokens(lifWei, { from: fromAddress });
      state = decreaseEthBalance(state, command.from, help.txGasCost(tx2));

      help.debug('sold tokens to MVM');

      state.totalSupply = state.totalSupply.minus(lifWei);
      state.MVMWeiBalance = state.MVMWeiBalance.minus(tokensCost);
      state.burnedTokens = state.burnedTokens.plus(lifWei);
      state.MVMBurnedTokens = state.MVMBurnedTokens.plus(lifWei);
      state.returnedWeiForBurnedTokens = state.returnedWeiForBurnedTokens.plus(tokensCost);
      state.balances[command.from] = getBalance(state, command.from).minus(lifWei);
      state.MVMMaxClaimableWei = getMVMMaxClaimableWei(state);

      state = increaseEthBalance(state, command.from, tokensCost);
    } catch (e) {
      state = trackGasFromLastBlock(state, command.from);
      assertExpectedException(e, shouldThrow, hasZeroAddress, state, command);
    }
  }

  return state;
}

let distributionDeltas24 = [
  0, 18, 99, 234, 416, 640,
  902, 1202, 1536, 1905, 2305, 2738,
  3201, 3693, 4215, 4766, 5345, 5951,
  6583, 7243, 7929, 8640, 9377, 10138,
];

let distributionDeltas48 = [
  0, 3, 15, 36, 63, 97,
  137, 183, 233, 289, 350, 416,
  486, 561, 641, 724, 812, 904,
  1000, 1101, 1205, 1313, 1425, 1541,
  1660, 1783, 1910, 2041, 2175, 2312,
  2454, 2598, 2746, 2898, 3053, 3211,
  3373, 3537, 3706, 3877, 4052, 4229,
  4410, 4595, 4782, 4972, 5166, 5363,
];

async function runMVMWaitForMonthCommand (command, state) {
  const targetTimestamp = state.MVMStartTimestamp + command.month * duration.days(30) + parseInt(state.MVMPausedSeconds);

  if (targetTimestamp > latestTime()) {
    await increaseTimeTestRPCTo(targetTimestamp);

    let period;

    if (command.month >= state.MVMPeriods) {
      period = state.MVMPeriods; // use last period as period
      state.claimablePercentage = priceFactor;
    } else {
      period = command.month;
      const distributionDeltas = state.MVMPeriods === 24 ? distributionDeltas24 : distributionDeltas48;
      state.claimablePercentage = _.sumBy(_.take(distributionDeltas, period + 1), (x) => x);
    }

    help.debug('updating state on new month', command.month, '(period:', period, ')');
    state.MVMBuyPrice = state.MVMInitialBuyPrice
      .mul(priceFactor - state.claimablePercentage)
      .dividedBy(priceFactor).floor();
    state.MVMMonth = command.month;
    state.MVMMaxClaimableWei = getMVMMaxClaimableWei(state);
  }

  return state;
}

async function runMVMPauseCommand (command, state) {
  if (state.MVM !== undefined) {
    let fromAccount = gen.getAccount(command.fromAccount);

    const shouldThrow = (state.MVMPaused === command.pause) ||
      (command.fromAccount !== state.foundationWallet);

    try {
      let tx;
      if (command.pause) {
        tx = await state.MVM.pause({ from: fromAccount });
        state.MVMLastPausedAt = latestTime();
      } else {
        tx = await state.MVM.unpause({ from: fromAccount });
        const pausedSeconds = latestTime() - state.MVMLastPausedAt;
        state.MVMPausedSeconds = state.MVMPausedSeconds.plus(pausedSeconds);
      }

      state.MVMPaused = command.pause;
      state = decreaseEthBalance(state, command.fromAccount, help.txGasCost(tx));
    } catch (e) {
      state = trackGasFromLastBlock(state, command.fromAccount);
      assertExpectedException(e, shouldThrow, false, state, command);
    }
  }

  return state;
}

const commands = {
  waitTime: { gen: gen.waitTimeCommandGen, run: runWaitTimeCommand },
  checkRate: { gen: gen.checkRateCommandGen, run: runCheckRateCommand },
  sendTransaction: { gen: gen.sendTransactionCommandGen, run: runSendTransactionCommand },
  setWeiPerUSDinTGE: { gen: gen.setWeiPerUSDinTGECommandGen, run: runSetWeiPerUSDinTGECommand },
  buyTokens: { gen: gen.buyTokensCommandGen, run: runBuyTokensCommand },
  burnTokens: { gen: gen.burnTokensCommandGen, run: runBurnTokensCommand },
  pauseCrowdsale: { gen: gen.pauseCrowdsaleCommandGen, run: runPauseCrowdsaleCommand },
  pauseToken: { gen: gen.pauseTokenCommandGen, run: runPauseTokenCommand },
  finalizeCrowdsale: { gen: gen.finalizeCrowdsaleCommandGen, run: runFinalizeCrowdsaleCommand },
  addPrivatePresalePayment: { gen: gen.addPrivatePresalePaymentCommandGen, run: runAddPrivatePresalePaymentCommand },
  claimEth: { gen: gen.claimEthCommandGen, run: runClaimEthCommand },
  returnPurchase: { gen: gen.returnPurchaseCommandGen, run: runReturnPurchaseCommand },
  transfer: { gen: gen.transferCommandGen, run: runTransferCommand },
  approve: { gen: gen.approveCommandGen, run: runApproveCommand },
  transferFrom: { gen: gen.transferFromCommandGen, run: runTransferFromCommand },
  MVMSendTokens: { gen: gen.MVMSendTokensCommandGen, run: runMVMSendTokensCommand },
  MVMClaimWei: { gen: gen.MVMClaimWeiCommandGen, run: runMVMClaimWeiCommand },
  MVMWaitForMonth: { gen: gen.MVMWaitForMonthCommandGen, run: runMVMWaitForMonthCommand },
  MVMPause: { gen: gen.MVMPauseCommandGen, run: runMVMPauseCommand },
  fundCrowdsaleBelowMinCap: { gen: gen.fundCrowdsaleBelowMinCap, run: runFundCrowdsaleBelowMinCap },
  fundCrowdsaleBelowSoftCap: { gen: gen.fundCrowdsaleBelowSoftCap, run: runFundCrowdsaleBelowSoftCap },
  fundCrowdsaleOverSoftCap: { gen: gen.fundCrowdsaleOverSoftCap, run: runFundCrowdsaleOverSoftCap },
};

module.exports = {
  commands: commands,

  commandsGen: jsc.oneof(_.map(commands, (c) => c.gen)),

  findCommand: (type) => {
    let command = commands[type];
    if (command === undefined) { throw (new Error('unknown command ' + type)); }
    return command;
  },

  ExceptionRunningCommand: ExceptionRunningCommand,
};
