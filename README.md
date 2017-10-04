# Líf

Líf is the token of the Winding Tree platform.

Líf is based on the ERC20 token protocol, with the option to also send information between token holders
via the added methods transferData and transferDataFrom.

[![Build Status](https://travis-ci.org/windingtree/LifToken.svg?branch=master)](https://travis-ci.org/windingtree/LifToken)
[![Coverage Status](https://coveralls.io/repos/github/windingtree/LifToken/badge.svg?branch=master)](https://coveralls.io/github/windingtree/LifToken?branch=master)

## Requirements

Node v7.6 or higher (versions before 7.6 do not support async/await that is used in the LifToken tests)

## Install

```sh
npm install
```

## Main Contracts

- [LifToken](blob/master/contracts/LifToken.sol): ERC20 token for the Winding Tree platform, with extra methods
   to transfer value and data and execute a call on transfer. Uses OpenZeppelin MintableToken and Pausable contracts.
- [LifCrowdsale](blob/master/contracts/LifCrowdsale.sol): Implementation of the Lif Token Generation Event (TGE)
  Crowdsale: A 2 week fixed price, uncapped token sale, with a discounted rate for contributions during the private
  presale and a Market Validation Mechanism that will receive the funds over the USD 10M soft cap.
- [LifMarketValidationMechanism](blob/master/contracts/LifMarketValidationMechanism.sol) (MVM): holds the ETH received during
  the TGE in excess of $10M for a fixed period of time (24 or 48 months depending on the total amount received) releasing
  part of the funds to the foundation in a monthly basis with a distribution skewed towards the end (most of the funds are
  released by the end of the MVM lifetime). Token holders can send their tokens to the MVM in exchange of eth at a rate
  that complements the distribution curve (the rate is higher at the beginning of the MVM and goes towards 0 by the end of it).
-[VestedPayment.sol](blob/master/contracts/LifMarketValidationMechanism.sol): Handles two time-locked payments: The 5% extra tokens
 that the foundation receives for long-term funding (starts after the MVM finishes, with same duration as the MVM: 2 or 4 years)
 and the 12.8% extra tokens that the founders receive (1y cliff, 4y total). Both are created during the Crowdsale finalization.

## New Token Methods

Líf token is ERC20 compatible but it also has two more methods to allow the transfer of data and execution of calls between users/contracts.

### transferData

Transfer tokens from one address to another and execute a call with the sent data on the same transaction.
```
transferData(address to, uint value, bytes data, bool doCall) => void
```

Returns true if the call execution was successful

### transferDataFrom

Transfer an allowed amount of tokens from one address to another and execute a call with the sent data on the same transaction.
```
transferDataFrom(address from, address to, uint value, bytes data, bool doCall) => void
```
Returns true if the call execution was successful

## Test

* To run all tests: `npm test`

* To run a specific test: `npm test -- test/Crowdsale.js`

There are also two environment variables (`GEN_TESTS_QTY` and `GEN_TESTS_TIMEOUT`) that regulate the duration/depth of the property-based tests, so for example:

```sh
GEN_TESTS_QTY=50 GEN_TESTS_TIMEOUT=300 npm test
```

will make the property-based tests in `test/CrowdsaleGenTest.js` to run 50 examples in a maximum of 5 minutes


## License

Líf Token is open source and distributed under the Apache License v2.0
