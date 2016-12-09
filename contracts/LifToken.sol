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

  event Transfer(address indexed from, address indexed to, uint value, string data);
  event Approval(address indexed owner, address indexed spender, uint value);

  // 1 ether = 100 lif tokens, price is in wei unit
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

  function transfer(address _to, uint _value, string _data) returns (bool success) {
    balances[msg.sender] = safeSub(balances[msg.sender], _value);
    balances[_to] = safeAdd(balances[_to], _value);
    Transfer(msg.sender, _to, _value, _data);
    return true;
  }

  function transferFrom(address _from, address _to, uint _value, string _data) returns (bool success) {
    var _allowance = allowed[_from][msg.sender];

    balances[_to] = safeAdd(balances[_to], _value);
    balances[_from] = safeSub(balances[_from], _value);
    allowed[_from][msg.sender] = safeSub(_allowance, _value);
    Transfer(_from, _to, _value, _data);
    return true;
  }

}
