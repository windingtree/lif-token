# Líf

Líf is the token of the Winding Tree platform.

Líf is based on the ERC20 token protocol, with the option to also send information between token holders uint new methods transferData and transferDataFrom.

[![Build Status](https://travis-ci.org/windingtree/LifToken.svg?branch=master)](https://travis-ci.org/windingtree/LifToken)
[![Coverage Status](https://coveralls.io/repos/github/windingtree/LifToken/badge.svg?branch=master)](https://coveralls.io/github/windingtree/LifToken?branch=master)

## Requirements

Node v7.6 or higher (versions before 7.6 do not support async/await that is used in the LifToken tests)

## Install

```sh
npm install
```

## Contract Lifecycle

TODO: Rewrite this section

1.- First the contract is deployed on status 2, where the deployer specify the base proposal fee, max supply, proposal blocks wait, exponential increment of votes rewards and minimun votes needed to create a proposal.
  ```
  // LífToken constructor
  LífToken(uint _baseProposalFee, uint _maxSupply, uint _proposalBlocksWait, uint _votesIncrementSent, uint _votesIncrementReceived, uint _minProposalVotes) {...}
  ```
2.- Addition of future payments to distribute the tokens on the future to founders and future members.
  ```
  addFuturePayment(address owner, uint afterBlock, uint tokens, string name) external onlyOwner() onStatus(2,0) {...}
  ```
3.- Creation of the token crowdsale stages
  ```
  addCrowdsaleStage(uint startBlock, uint endBlock, uint startPrice, uint changePerBlock, uint changePrice, uint minCap, uint totalTokens, uint presaleDiscount) external onlyOwner() onStatus(2,0) {...}
  ```
4.- Addition of the addressese that would be able to spend a certain amount of ethers with discount.
  ```
  addDiscount(address target, uint stage, uint amount) external onlyOwner() onStatus(2,0) {...}
  ```

## Important Contracts

- [LifToken](blob/master/contracts/LifToken.sol)
- [LifCrowdsale](blob/master/contracts/LifCrowdsale.sol)
- [LifMarketMaker](blob/master/contracts/LifMarketMaker.sol)

## New Token Methods

Líf token is ERC20 compatible but it also has two more methods to allow the transfer of data and execution of calls between users/contracts.

### transferData

Transfer tokens from one address to another.
```
transferData(address to, uint value, bytes data, bool doCall) => void
```

No return value. Throws when not successful

### transferDataFrom

Transfer  an allowed amount of tokens from one address to another.
```
transferDataFrom(address from, address to, uint value, bytes data, bool doCall) => void
```
No return value. Throws when not successful

## Test

* To run all tests: `npm test`

* To run a specific test: `npm test -- test/Crowdsale.js`

There are also two environment variables (`GEN_TESTS_QTY` and `GEN_TESTS_TIMEOUT`) that regulate the duration/depth of the property-based tests, so for example:

```sh
GEN_TESTS_QTY=50 GEN_TESTS_TIMEOUT=300 npm test
```

will make the property-based tests in `test/CrowdsaleGenTest.js` to run 50 examples in a maximum of 5 minutes



