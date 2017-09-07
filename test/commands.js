var LifMarketMaker = artifacts.require("./LifMarketMaker.sol");

var BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

var _ = require('lodash');
var jsc = require("jsverify");
var help = require("./helpers");
var gen = require("./generators");
var latestTime = require('./helpers/latestTime');
var {increaseTimeTestRPC, increaseTimeTestRPCTo, duration} = require('./helpers/increaseTime');

const isZeroAddress = (addr) => addr == help.zeroAddress;

let isCouldntUnlockAccount = (e) => e.message.search('could not unlock signer account') >= 0;

let assertExpectedException = (e, shouldThrow, addressZero, state, command) => {
  let isKnownException = help.isInvalidOpcodeEx(e) ||
    (isCouldntUnlockAccount(e) && addressZero);
  if (!shouldThrow || !isKnownException)
    throw(new ExceptionRunningCommand(e, state, command));
}

let runWaitBlockCommand = async (command, state) => {
  await help.waitBlocks(command.blocks);
  return state;
}

let runWaitTimeCommand = async (command, state) => {
  await increaseTimeTestRPC(command.seconds);
  return state;
}

function ExceptionRunningCommand(e, state, command) {
  this.error = e;
  this.state = state;
  this.command = command;
}

ExceptionRunningCommand.prototype = Object.create(Error.prototype);
ExceptionRunningCommand.prototype.constructor = ExceptionRunningCommand;

let runCheckRateCommand = async (command, state) => {
  let expectedRate = help.getCrowdsaleExpectedRate(state.crowdsaleData, latestTime());
  let rate = parseFloat(await state.crowdsaleContract.getRate());

  assert.equal(expectedRate, rate,
    "expected rate is different! Expected: " + expectedRate + ", actual: " + rate + ". blocks: " + web3.eth.blockTimestamp +
    ", public presale start/end: " + state.crowdsaleData.publicPresaleStartTimestamp + "/" + state.crowdsaleData.publicPresaleEndTimestamp +
    ", start/end1/end2: " + state.crowdsaleData.startTimestamp + "/" + state.crowdsaleData.end1Timestamp + "/" + state.crowdsaleData.end2Timestamp);

  return state;
}

let getBalance = (state, account) => {
  return state.balances[account] || new BigNumber(0);
}

let runBuyTokensCommand = async (command, state) => {
  let crowdsale = state.crowdsaleData,
    { startTimestamp, end2Timestamp, weiPerUSDinTGE} = crowdsale,
    weiCost = parseInt(web3.toWei(command.eth, 'ether')),
    nextTimestamp = latestTime(),
    rate = help.getCrowdsaleExpectedRate(crowdsale, nextTimestamp),
    tokens = command.eth * rate,
    account = gen.getAccount(command.account),
    beneficiaryAccount = gen.getAccount(command.beneficiary),
    hasZeroAddress = _.some([account, beneficiaryAccount], isZeroAddress);

  let shouldThrow = (nextTimestamp < startTimestamp) ||
    (nextTimestamp > end2Timestamp) ||
    (state.crowdsalePaused) ||
    (state.crowdsaleFinalized) ||
    (state.weiPerUSDinTGE == 0) ||
    hasZeroAddress ||
    (command.eth == 0);

  try {
    help.debug("buyTokens rate:", rate, "eth:", command.eth, "endBlocks:", crowdsale.end1Timestamp, end2Timestamp, "blockTimestamp:", nextTimestamp);

    await state.crowdsaleContract.buyTokens(beneficiaryAccount, {value: weiCost, from: account});
    assert.equal(false, shouldThrow, "buyTokens should have thrown but it didn't");

    state.purchases = _.concat(state.purchases,
      {tokens: tokens, rate: rate, wei: weiCost, beneficiary: command.beneficiary, account: command.account}
    );
    state.balances[command.beneficiary] = getBalance(state, command.beneficiary).plus(help.lif2LifWei(tokens));
    state.weiRaised = state.weiRaised.plus(weiCost);
  } catch(e) {
    assertExpectedException(e, shouldThrow, hasZeroAddress, state, command);
  }
  return state;
}

let runBuyPresaleTokensCommand = async (command, state) => {
  let crowdsale = state.crowdsaleData,
    { publicPresaleStartTimestamp, publicPresaleEndTimestamp,
      startTimestamp, publicPresaleRate } = crowdsale,
    weiCost = parseInt(web3.toWei(command.eth, 'ether')),
    nextTimestamp = latestTime(),
    rate = help.getCrowdsaleExpectedRate(crowdsale, nextTimestamp),
    tokens = command.eth * rate,
    account = gen.getAccount(command.account),
    beneficiaryAccount = gen.getAccount(command.beneficiary),
    maxPresaleWei = crowdsale.maxPresaleCapUSD*state.weiPerUSDinPresale,
    hasZeroAddress = _.some([beneficiaryAccount, account], isZeroAddress);

  console.log('now', nextTimestamp, 'start', publicPresaleStartTimestamp);
  let shouldThrow = (nextTimestamp < publicPresaleStartTimestamp) ||
    (state.totalPresaleWei.plus(weiCost) > maxPresaleWei) ||
    (nextTimestamp > publicPresaleEndTimestamp) ||
    (state.crowdsalePaused) ||
    (state.crowdsaleFinalized) ||
    (state.weiPerUSDinPresale == 0) ||
    (command.eth == 0) ||
    hasZeroAddress;

  try {
    help.debug("buying presale tokens, rate:", rate, "eth:", command.eth, "endBlock:", crowdsale.publicPresaleEndTimestamp, "blockTimestamp:", nextTimestamp);

    await state.crowdsaleContract.buyPresaleTokens(beneficiaryAccount, {value: weiCost, from: account});

    assert.equal(false, shouldThrow, "buyPresaleTokens should have thrown but it didn't");

    state.totalPresaleWei = state.totalPresaleWei.plus(weiCost);

  } catch(e) {
    assertExpectedException(e, shouldThrow, hasZeroAddress, state, command);
  }
  return state;
}


let runSendTransactionCommand = async (command, state) => {
  let crowdsale = state.crowdsaleData,
    { publicPresaleStartTimestamp, publicPresaleEndTimestamp,
      startTimestamp, end2Timestamp, publicPresaleRate,
      rate1, rate2 } = crowdsale,
    weiCost = parseInt(web3.toWei(command.eth, 'ether')),
    nextTimestamp = latestTime(),
    rate = help.getCrowdsaleExpectedRate(crowdsale, nextTimestamp),
    tokens = command.eth * rate,
    account = gen.getAccount(command.account),
    maxPresaleWei = crowdsale.maxPresaleCapUSD*state.weiPerUSDinPresale;

  let inPresale = nextTimestamp >= publicPresaleStartTimestamp && nextTimestamp <= publicPresaleEndTimestamp,
    inTGE = nextTimestamp >= startTimestamp && nextTimestamp <= end2Timestamp,
    hasZeroAddress = isZeroAddress(account);

  let shouldThrow = (!inPresale && !inTGE) ||
    (inTGE && state.weiPerUSDinTGE == 0) ||
    (inPresale && state.weiPerUSDinPresale == 0) ||
    (inPresale && (state.totalPresaleWei.plus(weiCost) > maxPresaleWei)) ||
    (state.crowdsalePaused) ||
    (state.crowdsaleFinalized) ||
    (command.eth == 0) ||
    hasZeroAddress;

  try {
    // help.debug("buyTokens rate:", rate, "eth:", command.eth, "endBlocks:", crowdsale.end1Timestamp, end2Timestamp, "blockTimestamp:", nextTimestamp);

    await state.crowdsaleContract.sendTransaction({value: weiCost, from: account});

    assert.equal(false, shouldThrow, "sendTransaction should have thrown but it didn't");
    if (inTGE) {
      state.purchases = _.concat(state.purchases,
        {tokens: tokens, rate: rate, wei: weiCost, beneficiary: command.beneficiary, account: command.account}
      );
      state.weiRaised = state.weiRaised.plus(weiCost);
    } else if (inPresale) {
      state.totalPresaleWei = state.totalPresaleWei.plus(weiCost);
    } else {
      throw(new Error("sendTransaction not in presale or TGE should have thrown"));
    }
  } catch(e) {
    assertExpectedException(e, shouldThrow, hasZeroAddress, state, command);
  }
  return state;
}

let runBurnTokensCommand = async (command, state) => {
  let account = gen.getAccount(command.account),
    balance = state.balances[command.account],
    hasZeroAddress = isZeroAddress(account);

  let shouldThrow = state.tokenPaused ||
    (balance < command.tokens) ||
    hasZeroAddress;

  try {
    await state.token.burn(command.tokens, {from: account});
    assert.equal(false, shouldThrow, "burn should have thrown but it didn't");

    state.balances[account] = balance - command.tokens;

  } catch(e) {
    assertExpectedException(e, shouldThrow, hasZeroAddress, state, command);
  }
  return state;
};

let runSetWeiPerUSDinPresaleCommand = async (command, state) => {

  let crowdsale = state.crowdsaleData,
    { publicPresaleStartTimestamp, setWeiLockSeconds } = crowdsale,
    nextTimestamp = latestTime(),
    account = gen.getAccount(command.fromAccount),
    hasZeroAddress = isZeroAddress(account);

  let shouldThrow = (nextTimestamp >= publicPresaleStartTimestamp-setWeiLockSeconds) ||
    (command.fromAccount != state.owner) ||
    (command.wei == 0) ||
    hasZeroAddress;

  help.debug("seting wei per usd in presale:", command.wei);
  try {
    await state.crowdsaleContract.setWeiPerUSDinPresale(command.wei, {from: account});
    assert.equal(false, shouldThrow);
    state.weiPerUSDinPresale = command.wei;
  } catch(e) {
    assertExpectedException(e, shouldThrow, hasZeroAddress, state, command);
  }
  return state;
};

let runSetWeiPerUSDinTGECommand = async (command, state) => {

  let crowdsale = state.crowdsaleData,
    { startTimestamp, setWeiLockSeconds } = crowdsale,
    nextTimestamp = latestTime(),
    account = gen.getAccount(command.fromAccount),
    hasZeroAddress = isZeroAddress(account);

  let shouldThrow = (nextTimestamp >= startTimestamp-setWeiLockSeconds) ||
    (command.fromAccount != state.owner) ||
    hasZeroAddress ||
    (command.wei == 0);

  help.debug("seting wei per usd in tge:", command.wei);
  try {
    await state.crowdsaleContract.setWeiPerUSDinTGE(command.wei, {from: account});
    assert.equal(false, shouldThrow, "setWeiPerUSDinTGE should have thrown but it didn't");
    state.weiPerUSDinTGE = command.wei;
  } catch(e) {
    assertExpectedException(e, shouldThrow, hasZeroAddress, state, command);
  }
  return state;
};

let runPauseCrowdsaleCommand = async (command, state) => {
  let account = gen.getAccount(command.fromAccount),
    hasZeroAddress = isZeroAddress(account);

  let shouldThrow = (state.crowdsalePaused == command.pause) ||
    (command.fromAccount != state.owner) ||
    hasZeroAddress;

  help.debug("pausing crowdsale, previous state:", state.crowdsalePaused, "new state:", command.pause);
  try {
    if (command.pause) {
      await state.crowdsaleContract.pause({from: account});
    } else {
      await state.crowdsaleContract.unpause({from: account});
    }
    assert.equal(false, shouldThrow);
    state.crowdsalePaused = command.pause;
  } catch(e) {
    assertExpectedException(e, shouldThrow, hasZeroAddress, state, command);
  }
  return state;
};

let runPauseTokenCommand = async (command, state) => {
  let account = gen.getAccount(command.fromAccount),
    hasZeroAddress = isZeroAddress(account);

  let shouldThrow = (state.tokenPaused == command.pause) ||
    !state.crowdsaleFinalized ||
    (command.fromAccount != state.owner) ||
    hasZeroAddress;

  help.debug("pausing token, previous state:", state.tokenPaused, "new state:", command.pause);
  try {
    if (command.pause) {
      await state.token.pause({from: account});
    } else {
      await state.token.unpause({from: account});
    }
    assert.equal(false, shouldThrow);
    state.tokenPaused = command.pause;
  } catch(e) {
    assertExpectedException(e, shouldThrow, hasZeroAddress, state, command);
  }
  return state;
};

let runFinalizeCrowdsaleCommand = async (command, state) => {
  let nextTimestamp = latestTime(),
    account = gen.getAccount(command.fromAccount),
    hasZeroAddress = isZeroAddress(account);

  let shouldThrow = state.crowdsaleFinalized ||
    state.crowdsalePaused || (state.weiPerUSDinTGE == 0) ||
    hasZeroAddress ||
    (nextTimestamp <= state.crowdsaleData.end2Timestamp);

  try {

    let crowdsaleFunded = (state.weiRaised > state.crowdsaleData.minCapUSD*state.weiPerUSDinTGE);

    help.debug("finishing crowdsale on block", nextTimestamp, ", from address:", gen.getAccount(command.fromAccount), ", funded:", crowdsaleFunded);

    let finalizeTx = await state.crowdsaleContract.finalize({from: account});

    if (crowdsaleFunded) {

      let marketMakerInitialBalance = state.weiRaised.minus(state.crowdsaleData.minCapUSD * state.weiPerUSDinTGE);
      let marketMakerPeriods = (marketMakerInitialBalance > (state.crowdsaleData.marketMaker24PeriodsCapUSD*state.weiPerUSDinTGE)) ? 48 : 24;
      let mmAddress = await state.crowdsaleContract.marketMaker();
      help.debug('MarketMaker contract address', mmAddress);

      let marketMaker = new LifMarketMaker(mmAddress);

      assert.equal(24, parseInt(await marketMaker.totalPeriods()));
      assert.equal(state.crowdsaleData.foundationWallet, await marketMaker.foundationAddr());

      state.marketMaker = marketMaker;
    }

    assert.equal(false, shouldThrow);
    state.crowdsaleFinalized = true;
    state.crowdsaleFunded = crowdsaleFunded;
  } catch(e) {
    assertExpectedException(e, shouldThrow, hasZeroAddress, state, command);
  }
  return state;
};

let runAddPrivatePresalePaymentCommand = async (command, state) => {

  let crowdsale = state.crowdsaleData,
    { publicPresaleStartTimestamp, privatePresaleRate } = crowdsale,
    nextTimestamp = latestTime(),
    weiToSend = web3.toWei(command.eth, 'ether'),
    account = gen.getAccount(command.fromAccount),
    beneficiary = gen.getAccount(command.beneficiaryAccount),
    hasZeroAddress = _.some([account, beneficiary], isZeroAddress);

  let shouldThrow = (nextTimestamp >= publicPresaleStartTimestamp) ||
    (state.crowdsalePaused) ||
    (account != gen.getAccount(state.owner)) ||
    (state.crowdsaleFinalized) ||
    hasZeroAddress ||
    (weiToSend == 0);

  try {
    help.debug("Adding presale private tokens for account:", command.beneficiaryAccount, "eth:", command.eth, "fromAccount:", command.fromAccount, "blockTimestamp:", nextTimestamp);

    await state.crowdsaleContract.addPrivatePresaleTokens(beneficiary, weiToSend, {from: account});

    assert.equal(false, shouldThrow, "buyTokens should have thrown but it didn't");

    state.totalPresaleWei = state.totalPresaleWei.plus(weiToSend);
  } catch(e) {
    assertExpectedException(e, shouldThrow, hasZeroAddress, state, command);
  }
  return state;
};

let runClaimEthCommand = async (command, state) => {

  let crowdsale = state.crowdsaleData,
    { publicPresaleStartTimestamp, maxPresaleWei, privatePresaleRate } = crowdsale,
    nextTimestamp = latestTime(),
    account = gen.getAccount(command.fromAccount),
    purchases = _.filter(state.purchases, (p) => p.account == command.fromAccount),
    hasZeroAddress = isZeroAddress(account);

  let shouldThrow = !state.crowdsaleFinalized ||
    !state.crowdsaleFunded ||
    (purchases.length == 0) ||
    hasZeroAddress ||
    state.claimedEth[command.account] > 0;

  try {
    await state.crowdsaleContract.claimEth({from: account});

    assert.equal(false, shouldThrow, "claimEth should have thrown but it didn't");

    state.claimedEth[command.account] = _.sumBy(purchases, (p) => p.amount);
  } catch(e) {
    assertExpectedException(e, shouldThrow, hasZeroAddress, state, command);
  }
  return state;
}

let runTransferCommand = async (command, state) => {

  let token = state.token,
    fromAddress = gen.getAccount(command.fromAccount),
    toAddress = gen.getAccount(command.toAccount),
    fromBalance = getBalance(state, command.fromAccount),
    lifWei = help.lif2LifWei(command.lif),
    hasZeroAddress = _.some([fromAddress, toAddress], isZeroAddress),
    shouldThrow = state.tokenPaused || fromBalance.lt(lifWei) || hasZeroAddress;

  try {
    await state.token.transfer(toAddress, lifWei, {from: fromAddress});

    assert.equal(false, shouldThrow, "transfer should have thrown but it didn't");

    // TODO: take spent gas into account?
    state.balances[command.fromAccount] = fromBalance.minus(lifWei);
    state.balances[command.toAccount] = getBalance(state, command.toAccount).plus(lifWei);
  } catch(e) {
    assertExpectedException(e, shouldThrow, hasZeroAddress, state, command);
  }
  return state;
}

let getAllowance = (state, sender, from) => {
  if (!state.allowances[sender])
    state.allowances[sender] = {};
  return state.allowances[sender][from] || 0;
}

let setAllowance = (state, sender, from, allowance) => {
  if (!state.allowances[sender])
    state.allowances[sender] = {};
  return state.allowances[sender][from] = allowance;
}

let runApproveCommand = async (command, state) => {

  let token = state.token,
    fromAddress = gen.getAccount(command.fromAccount),
    spenderAddress = gen.getAccount(command.spenderAccount),
    lifWei = help.lif2LifWei(command.lif),
    hasZeroAddress = _.some([fromAddress, spenderAddress], isZeroAddress),
    shouldThrow = state.tokenPaused || hasZeroAddress;

  try {
    await state.token.approve(spenderAddress, lifWei, {from: fromAddress});

    assert.equal(false, shouldThrow, "approve should have thrown but it didn't");

    // TODO: take spent gas into account?
    setAllowance(state, command.fromAccount, command.spenderAccount, lifWei);
  } catch(e) {
    assertExpectedException(e, shouldThrow, hasZeroAddress, state, command);
  }
  return state;
}

let runTransferFromCommand = async (command, state) => {

  let token = state.token,
    senderAddress = gen.getAccount(command.senderAccount),
    fromAddress = gen.getAccount(command.fromAccount),
    toAddress = gen.getAccount(command.toAccount),
    fromBalance = getBalance(state, command.fromAccount),
    lifWei = help.lif2LifWei(command.lif),
    allowance = getAllowance(state, command.senderAccount, command.fromAccount),
    hasZeroAddress = _.some([senderAddress, fromAddress, toAddress], isZeroAddress)

  let shouldThrow = state.tokenPaused ||
    fromBalance.lt(lifWei) ||
    hasZeroAddress ||
    (allowance < lifWei);

  try {
    await state.token.transferFrom(fromAddress, toAddress, lifWei, {from: senderAddress});

    assert.equal(false, shouldThrow, "transferFrom should have thrown but it didn't");

    // TODO: take spent gas into account?
    state.balances[command.fromAccount] = fromBalance.minus(lifWei);
    state.balances[command.toAccount] = getBalance(state, command.toAccount).plus(lifWei);
    setAllowance(state, command.senderAccount, command.fromAccount, allowance.sub(lifWei));
  } catch(e) {
    assertExpectedException(e, shouldThrow, hasZeroAddress, state, command);
  }
  return state;
}


//
// Market Maker commands
//

let priceFactor = 100000

let getMMMaxClaimableWei = function(state) {
  if (state.marketMakerMonth >= state.marketMakerPeriods) {
    help.debug("calculating maxClaimableEth with", state.marketMakerStartingBalance,
      state.marketMakerClaimedWei,
      state.returnedWeiForBurnedTokens);
    return state.marketMakerStartingBalance.
      minus(state.marketMakerClaimedWei).
      minus(state.returnedWeiForBurnedTokens);
  } else {
    const maxClaimable = state.marketMakerStartingBalance.
      mul(state.claimablePercentage).dividedBy(priceFactor).
      mul(state.initialTokenSupply - state.marketMakerBurnedTokens).
      dividedBy(state.initialTokenSupply).
      minus(state.marketMakerClaimedWei);
    return _.max([0, maxClaimable]);
  }
}

// TODO: implement finished
let isMarketMakerFinished = (state) => false

let runMarketMakerSendTokensCommand = async (command, state) => {
  if (state.marketMaker === undefined) {
    // doesn't make sense to execute the actual command, let's just assert
    // that the crowdsale was not funded (in which case there should be MM)
    // except when the soft cap was not reached
    // TODO: test whether the crowdsale was funded but soft cap was not reached
    assert.equal(false, state.crowdsaleFinalized && state.crowdsaleFunded,
      "if there's no market Maker, crowdsale should not have been funded");
  } else {
    let lifWei = help.lif2LifWei(command.tokens),
      lifBuyPrice = state.marketMakerBuyPrice.div(priceFactor),
      tokensCost = new BigNumber(lifWei).mul(lifBuyPrice),
      fromAddress = gen.getAccount(command.from),
      ethBalanceBeforeSend = state.ethBalances[command.from] || new BigNumber(0),
      initialLifBalance = getBalance(state, command.from),
      hasZeroAddress = isZeroAddress(fromAddress);

    let shouldThrow = !state.crowdsaleFinalized ||
      !state.crowdsaleFunded ||
      state.marketMakerPaused ||
      (command.tokens == 0) ||
      isMarketMakerFinished(state) ||
      hasZeroAddress;

    try {
      help.debug('Selling ',command.tokens, ' tokens in exchange of ', web3.fromWei(tokensCost, 'ether'), 'eth');
      tx1 = await state.token.approve(state.marketMaker.address, lifWei, {from: fromAddress}),
        tx2 = await state.marketMaker.sendTokens(lifWei, {from: fromAddress}),
        gas = tx1.receipt.gasUsed + tx2.receipt.gasUsed;

      help.debug("sold tokens to market Maker");

      state.ethBalances[command.from] = ethBalanceBeforeSend.plus(tokensCost).minus(help.gasPrice.mul(gas));
      state.marketMakerEthBalance = state.marketMakerEthBalance.minus(tokensCost);
      state.burnedTokens = state.burnedTokens.plus(lifWei);
      state.marketMakerBurnedTokens = state.marketMakerBurnedTokens.plus(lifWei);
      state.returnedWeiForBurnedTokens = state.returnedWeiForBurnedTokens.plus(tokensCost);
      state.balances[command.from] = getBalance(state, command.from).minus(lifWei);
      state.marketMakerMaxClaimableWei = getMMMaxClaimableWei(state);

    } catch(e) {
      assertExpectedException(e, shouldThrow, hasZeroAddress, state, command);
    }
  }

  return state;
}

const commands = {
  // waitBlock: {gen: gen.waitBlockCommandGen, run: runWaitBlockCommand},
  waitTime: {gen: gen.waitTimeCommandGen, run: runWaitTimeCommand},
  checkRate: {gen: gen.checkRateCommandGen, run: runCheckRateCommand},
  sendTransaction: {gen: gen.sendTransactionCommandGen, run: runSendTransactionCommand},
  setWeiPerUSDinPresale: {gen: gen.setWeiPerUSDinPresaleCommandGen, run: runSetWeiPerUSDinPresaleCommand},
  setWeiPerUSDinTGE: {gen: gen.setWeiPerUSDinTGECommandGen, run: runSetWeiPerUSDinTGECommand},
  buyTokens: {gen: gen.buyTokensCommandGen, run: runBuyTokensCommand},
  buyPresaleTokens: {gen: gen.buyPresaleTokensCommandGen, run: runBuyPresaleTokensCommand},
  burnTokens: {gen: gen.burnTokensCommandGen, run: runBurnTokensCommand},
  pauseCrowdsale: {gen: gen.pauseCrowdsaleCommandGen, run: runPauseCrowdsaleCommand},
  pauseToken: {gen: gen.pauseTokenCommandGen, run: runPauseTokenCommand},
  finalizeCrowdsale: {gen: gen.finalizeCrowdsaleCommandGen, run: runFinalizeCrowdsaleCommand},
  addPrivatePresalePayment: {gen: gen.addPrivatePresalePaymentCommandGen, run: runAddPrivatePresalePaymentCommand},
  claimEth: {gen: gen.claimEthCommandGen, run: runClaimEthCommand},
  transfer: {gen: gen.transferCommandGen, run: runTransferCommand},
  approve: {gen: gen.approveCommandGen, run: runApproveCommand},
  transferFrom: {gen: gen.transferFromCommandGen, run: runTransferFromCommand},
  marketMakerSendTokens: {gen: gen.marketMakerSendTokensCommandGen, run: runMarketMakerSendTokensCommand}
};

module.exports = {
  commands: commands,

  commandsGen: jsc.oneof(_.map(commands, (c) => c.gen)),

  findCommand: (type) => {
    let command = commands[type];
    if (command === undefined)
      throw(new Error("unknown command " + type));
    return command;
  },

  ExceptionRunningCommand: ExceptionRunningCommand
}
