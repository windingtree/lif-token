# Líf

Líf is the token of the Winding Tree platform.

Líf is based on the ERC20 token protocol, with the option to also send information between token holders using edited versions of the transfer and transferFrom methods.
Lif is also a DAO, the token holders can create proposals to change token variables and send value/data to another contracts.

## Install

```sh
npm install ethereumjs-testrpc -g
npm install truffle -g
npm install zeppelin-solidity@1.0.0
npm install
```

## Token Methods

### transfer

Transfer tokens from one address to another.
```
transfer(address _to, uint _value, string _data) => (bool success)
```
Returns: bool, Success of the operation.

### transferFrom

Transfer tokens from one address to another with the allowance of tokens required between addresses.
```
transferFrom(address _from, address _to, uint _value, string _data) => (bool success)
```
Returns: bool, Success of the operation.

### balanceOf

Get the balance of the address.
```
balanceOf(address _owner) => (uint balance)
```
Returns: uint, balance of the address.

### approve

Approve the transfer of tokens to an address.
```
allowance(address _spender, uint _value) => (bool success)
```
Returns: bool, Success of the operation.

### allowance

Get the alolowance of tokens to be transfered between two addreses.
```
allowance(address _owner, address _spender) => (uint remaining)
```
Returns: uint, balance of tokens allowed to be transfered.

## DAO Methods

In order for the DAO to work the deployer of the contract has to set the minimun votes required for every action that the DAO can execute, so once the contract is created the deployer has to use buildMinVotes() function to define the votes needed for every action type, after that the start() method can be called by the deployer and start the DAO.

Every DAO proposal will be an action type, depend on the action type the amounts of votes that will be required by the contract to execute the proposal. Every function on Ethereum has a signature, data,  value.
The signature is what the contract need to know what function execute, the data is the data that will be sent to this function and the value are the ethers that would be transferred on the function call, each function call is a transaction on the blockhain.

### Edit contract variables

This methods can be called only internally, in order to do that a token holder needs to create a proposal and reach the necessary votes to be executed.

```
setPrice(uint256)
setFee(uint256)
setBaseProposalFee(uint256)
setProposalAmountFee(uint256)
setMaxSupply(uint256)
setProposalBlocksWait(uint256)
```

### Claim fees

This method will send an amount of ethers gathered as fee to an address. It needs an approved DAO proposal to be executed.

```
claimFees(address, uint256) // 0 = Created, 1 = Stoped, 2 = Normal, 3 = Migrating.
```

### Set Status

This method change the status of the contract. It needs an approved DAO proposal to be executed.

```
claimFees(address, uint256)
```

### New Proposal

Creates a new proposal on the token, the token holder that creates the proposal needs to have the more than the fee charged for the proposal creation.
```
newProposal( address _target, uint _value, string _description, uint _executionBlock, bytes4 _signature, bytes _actionData )
```
### Vote

Vote a proposal for yes or no using the proposal ID.
```
vote( uint _proposalID, bool _vote )
```
### CheckProposal

It checks if the maxBlocksWait has been reached on the proposal, if so the proposal is removed. If the maxBlocksWait wanst reached yet and the proposal have the necessary votes it gets executed.
```
checkProposal( uint _proposalID )
```
### Get Proposal Vote

It returns the balance of the voter in the especified position on the proposal.
```
getProposalVote(uint _proposalID, uint _position)
```
### Build Min Votes

This method needs to be called by the deployer of the contract to set the minimun and necessary votes to exeucte the DAO proposals.

```
buildMinVotes(address _target, uint _votesNeeded, bytes4 _signature)
```
### Start DAO

This methos start the DAO and change his status.

```
start()
```

## Test

To test the token first run `npm run testrpc` and this will create a testnet locally with three acocunts with a lot of balance.

After testrpc starts run `truffle test`.
