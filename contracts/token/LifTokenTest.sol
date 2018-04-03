pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/token/ERC827/ERC827Token.sol";
import "zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "zeppelin-solidity/contracts/token/ERC20/MintableToken.sol";
import "zeppelin-solidity/contracts/token/ERC20/BurnableToken.sol";
import "zeppelin-solidity/contracts/token/ERC20/PausableToken.sol";

/**
   @title Líf, the Winding Tree token

   Implementation of Líf, the ERC827 token for Winding Tree, an extension of the
   ERC20 token with extra methods to transfer value and data to execute a call
   on transfer.
   This version of the token is used in test networks, it allows anyone to claim
   tokens.
   Uses OpenZeppelin StandardToken, ERC827Token, BurnableToken, MintableToken and PausableToken.
 */
contract LifTokenTest is StandardToken, ERC827Token, BurnableToken, MintableToken, PausableToken {
  // Token Name
  string public constant NAME = "Líf";

  // Token Symbol
  string public constant SYMBOL = "LIF";

  // Token decimals
  uint public constant DECIMALS = 18;

  // Max Lif faucet (50 tokens)
  uint256 public constant MAX_LIF_FAUCET = 50000000000000000000;

  function approveData(address spender, uint256 value, bytes data) public whenNotPaused returns (bool) {
    return super.approve(spender, value, data);
  }

  function transferData(address to, uint256 value, bytes data) public whenNotPaused returns (bool) {
    return super.transfer(to, value, data);
  }

  function transferDataFrom(address from, address to, uint256 value, bytes data) public whenNotPaused returns (bool) {
    return super.transferFrom(from, to, value, data);
  }

  /**
   * @dev Function to create tokens, it will issue tokens to the tx sender
   */
  function faucetLif() public {
    uint256 amount = MAX_LIF_FAUCET.sub(balances[msg.sender]);
    totalSupply_ = totalSupply_.add(amount);
    balances[msg.sender] = balances[msg.sender].add(amount);
    Transfer(0x0, msg.sender, amount);
  }

  /**
   * @dev Burns a specific amount of tokens.
   *
   * @param _value The amount of tokens to be burned.
   */
  function burn(uint256 _value) public whenNotPaused {
    super.burn(_value);

    // a Transfer event to 0x0 can be useful for observers to keep track of
    // all the Lif by just looking at those events
    Transfer(msg.sender, address(0), _value);
  }

}
