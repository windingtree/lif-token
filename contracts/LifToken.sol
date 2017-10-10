pragma solidity ^0.4.15;

import "./SmartToken.sol";
import "zeppelin-solidity/contracts/token/MintableToken.sol";
import "zeppelin-solidity/contracts/lifecycle/Pausable.sol";

/**
   @title Líf, the Winding Tree token

   Implementation of Líf, the ERC20 token for Winding Tree, with extra methods
   to transfer value and data to execute a call on transfer.
   Uses OpenZeppelin MintableToken and Pausable.
 */
contract LifToken is SmartToken, MintableToken, Pausable {
  // Token Name
  string public constant NAME = "Líf";

  // Token Symbol
  string public constant SYMBOL = "LIF";

  // Token decimals
  uint public constant DECIMALS = 18;

  function transfer(address _to, uint256 _value) public whenNotPaused returns (bool) {
    return super.transfer(_to, _value);
  }

  function approve(address _spender, uint256 _value) public whenNotPaused returns (bool) {
    return super.approve(_spender, _value);
  }

  function transferFrom(address _from, address _to, uint256 _value) public whenNotPaused returns (bool) {
    return super.transferFrom(_from, _to, _value);
  }

  function approveData(address spender, uint256 value, bytes data) public whenNotPaused returns (bool) {
    return super.approveData(spender, value, data);
  }

  function transferData(address to, uint256 value, bytes data) public whenNotPaused returns (bool) {
    return super.transferData(to, value, data);
  }

  function transferDataFrom(address from, address to, uint256 value, bytes data) public whenNotPaused returns (bool) {
    return super.transferDataFrom(from, to, value, data);
  }

  /**
     @dev Burns a specific amount of tokens.

     @param _value The amount of tokens to be burned.
   */
  function burn(uint256 _value) public whenNotPaused {
    require(_value > 0);

    address burner = msg.sender;
    balances[burner] = balances[burner].sub(_value);
    totalSupply = totalSupply.sub(_value);
    Burn(burner, _value);

    // a Transfer event to 0x0 can be useful for observers to keep track of
    // all the Lif by just looking at those events
    Transfer(burner, address(0), _value);
  }

  event Burn(address indexed burner, uint value);

}
