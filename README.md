# Líf Token

Lif Token is based on the ERC20 token protocol, with the option to also send information beetwen users using edited versions of the transfer and transferFrom methods.

## Install

```sh
npm install ethereumjs-testrpc -g
npm install truffle -g
npm install
```

## Token Methods

### getPrice

Returns: uint, Price of the a token in wei.

### transfer

Params: address _to, uint _value, string _data

Description: Transfer tokens from one address to another.

Returns: bool, Success of the operation.

### transferFrom

Params: address _from, address _to, uint _value, string _data

Description: Transfer tokens from one address to another with the allowance of tokens required between addresses.

Returns: bool, Success of the operation.

### balanceOf

Params: address _owner

Description: Get the balance of the address.

Returns: uint, balance of the address.

### approve

Params: address _spender, uint _value

Description: Approve the transfer of tokens to an address.

Returns: bool, Success of the operation.

### allowance

Params: address _owner, address _spender

Description: Get the alolowance of tokens to be transfered between two addreses.

Returns: uint, balance of tokens allowed to be transfered.

## Test

To test the token first run `npm run testrpc` and this will create a testnet locally with three acocunts with a lot of balance.

After testrpc starts run `truffle test`.
