pragma solidity ^0.4.4;


import "./zeppelin/token/StandardToken.sol";


/*
 * Lif Token
 *
 * Lif is a corwdsale token for the winding tree platform.
 */
contract LifToken is StandardToken {

  string public name = "Lif";
  string public symbol = "LIF";
  uint public decimals = 18;

  // 1 ether = 100 example tokens, price is in wei unit
  uint PRICE = 1000000000000000;

  // Maximun number of tokens
  uint MAX_SUPPLY = 10000000;

  function () payable {
    createTokens(msg.sender);
  }

  function createTokens(address recipient) payable {
    if (msg.value == 0) throw;

    if (msg.value % getPrice() != 0) throw;

    uint tokens = msg.value / getPrice();

    if (safeAdd(totalSupply, tokens) > MAX_SUPPLY) throw;

    totalSupply = safeAdd(totalSupply, tokens);
    balances[recipient] = safeAdd(balances[recipient], tokens);
  }

  function getPrice() constant returns (uint result){

    // Here we can set the price to be reaising exponentialy depending
    // of the amounts of tokens sold, the first token will be the cheapest one and
    // the token MAX_SUPPLY will be the more expensive.

    return PRICE;
  }
}
