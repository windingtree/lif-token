pragma solidity ^0.4.13;

import "zeppelin-solidity/contracts/token/MintableToken.sol";
import "zeppelin-solidity/contracts/lifecycle/Pausable.sol";

contract LifToken is MintableToken, Pausable {
  // Token Name
  string public constant NAME = "Líf";

  // Token Symbol
  string public constant SYMBOL = "LIF";

  // Token decimals
  uint public constant DECIMALS = 18;

  // Edit of the ERC20 token events to support data argument
  event TransferData(address indexed from, address indexed to, uint value, bytes data);
  event ApprovalData(address indexed from, address indexed spender, uint value, bytes data);

  //ERC20 token approve method with data call.
  function approveData(address spender, uint value, bytes data) {

    require(spender != address(this));

    allowed[tx.origin][spender] = value;

    if (spender.call(data))
      ApprovalData(tx.origin, spender, value, data);

  }

  // ERC20 transfer method with data call.
  function transferData(address to, uint value, bytes data) {

    require(to != address(this));

    // If transfer have value process it
    if (value > 0) {
      balances[tx.origin] = balances[tx.origin].sub(value);
      balances[to] = balances[to].add(value);
    }

    if (to.call(data))
      TransferData(tx.origin, to, value, data);

  }

  // ERC20 transferFrom method with data call.
  function transferDataFrom(address from, address to, uint value, bytes data) {

    require(to != address(this));

    // If transfer have value process it
    if (value > 0) {
      uint allowance = allowed[from][tx.origin];
      balances[from] = balances[from].sub(value);
      balances[to] = balances[to].add(value);
      allowed[from][tx.origin] = allowance.sub(value);
    }

    if (to.call(data))
      TransferData(tx.origin, to, value, data);

  }
}
