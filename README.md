# Líf

Líf is the token of the Winding Tree platform.

Líf is based on the ERC20 token protocol, with the option to also send information between token holders uint new methods transferData and transferDataFrom.
Líf is also a DAO, the token holders can create proposals to change token variables and send value/data to another contracts.

[![Build Status](https://travis-ci.org/windingtree/LifToken.svg?branch=master)](https://travis-ci.org/windingtree/LifToken)

## Requirements

Node v7.6 or higher (versions before 7.6 do not support async/await)

## Install

```sh
npm install
```

## Contract Lifecycle

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
5.- Configuration of the DAO actions, this is how much votes will be needed to call a contract function from the token.
  ```
  buildMinVotes(address target, uint votesPercentage, bytes4 signature)
  ```

## New Token Methods

Líf token is ERC20 compatible but it also has two more methods to allow the transfer of data and execution of calls between users/contracts.

## Important Variables

- OWNER_SUPPLY: How much tokens the owners has the right to issue, after that only the DAO can decide on issue more tokens.

- maxSupply: The maximun number of tokens that can be on circulation.

- totalSupply: The amount of tokens on circulation.

- status = Status of the contract, represented by an integer. (1 = Stoped, 2 = Created, 3 = Crowdsale, 4 = DAO)

- baseProposalFee: The amount of ethers that has to eb payed to submit a proposal.

- totalProposals: The total amount of proposals.

- proposals: All the proposals done and to be done.

- minProposalVotes: The minimun votes needed to submit a proposal.

- totalVotes: The total amount of votes.

- sentTxVotes and receivedTxVotes: The amounts of votes for each address, on received and sent transactions.

- votesIncrementSent and votesIncrementReceived: This is how much the transactions requested to receive a new vote will be growing exponentially, if votesIncrementSent equals 2 the sender will receive a vote each 2,4,8,16,32... transactions sent.

- txsSent and txsReceived: This represents how many transactions sents and receive have each address.

- crowdsaleStages: All the auctions done to sell a maximun number of tokens, it aims to raise an amount of ethers between a minimun and maximun capital, starting at a high price and going lower each certain amount of blocks, till the auction ends or the maximun capital or all tokens are sold.

- futurePayments: The tokens payments that can be claimed.

- proposalBlocksWait = The amount of blocks that a proposal has to be approved

- actionsDAO: The amount of votes in % from 0-100 needed to excute calls with the DAO approval. Every action is indexed by the address and function signature, they can internal or external actions. To add or edit this actions it will need a DAO approval.

### transferData

Transfer tokens from one address to another.
```
transferData(address to, uint value, bytes data, bool doCall) => (bool success)
```
Returns: bool, Success of the operation.

### transferDataFrom

Transfer  an allowed amount of tokens from one address to another.
```
transferDataFrom(address from, address to, uint value, bytes data, bool doCall) => (bool success)
```
Returns: bool, Success of the operation.

## DAO Methods

In order for the DAO to work the deployer of the contract has to set the minimun votes required for every action that the DAO can execute, so once the contract is created the deployer has to use buildMinVotes() function to define the votes needed for every action type, after that once the contract status is correct the DAO can start.

Every DAO proposal will be an action type, depend on the action type the amounts of votes that will be required by the contract to execute the proposal. Every function on Ethereum has a signature, data and value.
The signature is what the contract need to know which function execute, the data is the data that will be sent to this function and the value are the ethers that would be transferred on the function call.

### Standard DAO functions

This functions can be called only internally, in order to do that a token holder needs to create a proposal and reach the necessary votes to be executed.

```
setBaseProposalFee(uint _baseProposalFee)
setProposalBlocksWait(uint _proposalBlocksWait)
sendEther(address to, uint amount)
setStatus(uint newStatus)
addDAOAction(address target, uint balanceNeeded, bytes4 signature)
```

### New Proposal

Creates a new proposal on the token, the token holder that creates the proposal needs to have the more than the fee charged for the proposal creation.
```
newProposal(address target, uint value, string description, uint agePerBlock, bytes4 signature, bytes actionData)
```

### Vote

Vote a proposal for yes or no using the proposal ID.
```
vote(uint proposalID, bool vote)
```

## Test

* To run all tests: `npm test`

* To run a specific test: `npm test -- test/Crowdsale.js`
