var jsc = require("jsverify");

// this is just to have web3 available and correctly initialized
artifacts.require("./LifToken.sol");

const accountGen = jsc.nat(web3.eth.accounts.length - 1);

module.exports = {

  accountGen: accountGen,

  crowdsaleGen: jsc.record({
    publicPresaleRate: jsc.nat,
    rate1: jsc.nat,
    rate2: jsc.nat,
    privatePresaleRate: jsc.nat,
    foundationWallet: accountGen,
    setWeiLockSeconds: jsc.nat(600,3600),
    owner: accountGen
  }),

  waitBlockCommandGen: jsc.record({
    type: jsc.constant("waitBlock"),
    blocks: jsc.nat
  }),

  waitTimeCommandGen: jsc.record({
    type: jsc.constant("waitTime"),
    seconds: jsc.nat
  }),

  checkRateCommandGen: jsc.record({
    type: jsc.constant("checkRate")
  }),

  setWeiPerUSDinPresaleCommandGen: jsc.record({
    type: jsc.constant("setWeiPerUSDinPresale"),
    wei: jsc.nat(0,10000000000000000), // between 0-0.01 ETH
    fromAccount: accountGen
  }),

  setWeiPerUSDinTGECommandGen: jsc.record({
    type: jsc.constant("setWeiPerUSDinTGE"),
    wei: jsc.nat(0,10000000000000000), // between 0-0.01 ETH
    fromAccount: accountGen
  }),

  buyTokensCommandGen: jsc.record({
    type: jsc.constant("buyTokens"),
    account: accountGen,
    beneficiary: accountGen,
    eth: jsc.nat
  }),

  burnTokensCommandGen: jsc.record({
    type: jsc.constant("burnTokens"),
    account: accountGen,
    tokens: jsc.nat
  }),

  buyPresaleTokensCommandGen: jsc.record({
    type: jsc.constant("buyPresaleTokens"),
    account: accountGen,
    beneficiary: accountGen,
    eth: jsc.nat
  }),

  sendTransactionCommandGen: jsc.record({
    type: jsc.constant("sendTransaction"),
    account: accountGen,
    beneficiary: accountGen,
    eth: jsc.nat
  }),

  pauseCrowdsaleCommandGen: jsc.record({
    type: jsc.constant("pauseCrowdsale"),
    pause: jsc.bool,
    fromAccount: accountGen
  }),

  pauseTokenCommandGen: jsc.record({
    type: jsc.constant("pauseToken"),
    pause: jsc.bool,
    fromAccount: accountGen
  }),

  finalizeCrowdsaleCommandGen: jsc.record({
    type: jsc.constant("finalizeCrowdsale"),
    fromAccount: accountGen
  }),

  addPrivatePresalePaymentCommandGen: jsc.record({
    type: jsc.constant("addPrivatePresalePayment"),
    beneficiaryAccount: accountGen,
    fromAccount: accountGen,
    eth: jsc.nat(0,200)
  }),

  claimEthCommandGen: jsc.record({
    type: jsc.constant("claimEth"),
    eth: jsc.nat(0, 200),
    fromAccount: accountGen
  }),

  transferCommandGen: jsc.record({
    type: jsc.constant("transfer"),
    lif: jsc.nat(0, 200),
    fromAccount: accountGen,
    toAccount: accountGen
  }),

  approveCommandGen: jsc.record({
    type: jsc.constant("approve"),
    lif: jsc.nat(0, 200),
    fromAccount: accountGen,
    spenderAccount: accountGen
  }),

  transferFromCommandGen: jsc.record({
    type: jsc.constant("transferFrom"),
    lif: jsc.nat(0, 200),
    senderAccount: accountGen,
    fromAccount: accountGen,
    toAccount: accountGen
  }),

  marketMakerSendTokensCommandGen: jsc.record({
    type: jsc.constant("marketMakerSendTokens"),
    tokens: jsc.nat,
    from: accountGen
  }),

}

