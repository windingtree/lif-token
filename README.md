# Líf Token

Líf is the token of the Winding Tree platform.

Líf is a SmartToken, based in the ERC20 standard with extra methods to send value and data on transfers and approvals, allowing the execution of calls in those methdos too.

This repository also has all the contracts related with the Token Generation Event (TGE), an strategy that combines a crowdsale, a market validation mechanism and vested payments.

[![Build Status](https://travis-ci.org/windingtree/LifToken.svg?branch=master)](https://travis-ci.org/windingtree/LifToken)
[![Coverage Status](https://coveralls.io/repos/github/windingtree/LifToken/badge.svg?branch=master)](https://coveralls.io/github/windingtree/LifToken?branch=master&v=2.0)

## Requirements

Node v7.6 or higher (versions before 7.6 do not support async/await that is used in the LifToken tests)

## Install

```sh
npm install
```

## Contracts

- [LifToken](contracts/LifToken.sol): ERC827 token for the Winding Tree platform.
 Uses OpenZeppelin ERC827Token, StandardToken, BurnableToken, MintableToken and PausableToken contracts.
 - [LifChannels](contracts/LifChannels.sol): Implementation of simple state channels for Lif token holders.
- [LifCrowdsale](contracts/LifCrowdsale.sol): Implementation of the Lif Token Generation Event (TGE)
  Crowdsale: A 2 week fixed price, uncapped token sale, with a discounted rate for contributions during the private
  presale and a Market Validation Mechanism that will receive the funds over the USD 10M soft cap.
- [LifMarketValidationMechanism](contracts/LifMarketValidationMechanism.sol) (MVM): holds the ETH received during
  the TGE in excess of $10M for a fixed period of time (24 or 48 months depending on the total amount received) releasing
  part of the funds to the foundation in a monthly basis with a distribution skewed towards the end (most of the funds are
  released by the end of the MVM lifetime). Token holders can send their tokens to the MVM in exchange of eth at a rate
  that complements the distribution curve (the rate is higher at the beginning of the MVM and goes towards 0 by the end of it).
- [VestedPayment.sol](contracts/VestedPayment.sol): Handles two time-locked payments: The 5% extra tokens
  that the foundation receives for long-term funding (starts after the MVM finishes, with same duration as the MVM: 2 or 4 years)
  and the 12.8% extra tokens that the founders receive (1y cliff, 4y total). Both are created during the Crowdsale finalization.

## Test

* To run all tests: `npm test`

* To run a specific test: `npm test -- test/Crowdsale.js`

There are also two environment variables (`GEN_TESTS_QTY` and `GEN_TESTS_TIMEOUT`) that regulate the duration/depth of the property-based tests, so for example:

```sh
GEN_TESTS_QTY=50 GEN_TESTS_TIMEOUT=300 npm test
```

Will make the property-based tests in `test/CrowdsaleGenTest.js` to run 50 examples in a maximum of 5 minutes


## License

Líf Token is open source and distributed under the GPL v3 license.
