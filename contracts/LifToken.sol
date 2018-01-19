pragma solidity ^0.4.18;

import "./ERC827Token.sol";
import "zeppelin-solidity/contracts/token/MintableToken.sol";
import "zeppelin-solidity/contracts/token/BurnableToken.sol";
import "zeppelin-solidity/contracts/token/PausableToken.sol";

/**
   @title Líf, the Winding Tree token

   Implementation of Líf, the ERC20 token for Winding Tree, with extra methods
   to transfer value and data to execute a call on transfer.
   Uses OpenZeppelin MintableToken and Pausable.
 */
contract LifToken is ERC827Token, BurnableToken, MintableToken, PausableToken {
  // Token Name
  string public constant NAME = "Líf";

  // Token Symbol
  string public constant SYMBOL = "LIF";

  // Token decimals
  uint public constant DECIMALS = 18;

  /**
     @dev Burns a specific amount of tokens.

     @param _value The amount of tokens to be burned.
   */
  function burn(uint256 _value) public whenNotPaused {
    super.burn(_value);

    // a Transfer event to 0x0 can be useful for observers to keep track of
    // all the Lif by just looking at those events
    Transfer(msg.sender, address(0), _value);
  }

}
