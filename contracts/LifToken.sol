pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "zeppelin-solidity/contracts/token/ERC20/MintableToken.sol";
import "zeppelin-solidity/contracts/token/ERC20/PausableToken.sol";

/**
   @title Líf, the Winding Tree token

   Implementation of Líf, the ERC827 token for Winding Tree, an extension of the
   ERC20 token with extra methods to transfer value and data to execute a call
   on transfer.
   Uses OpenZeppelin StandardToken, ERC827Token, MintableToken and PausableToken.
 */
contract LifToken is StandardToken, MintableToken, PausableToken {
  // Token Name
  string public constant NAME = "Líf";

  // Token Symbol
  string public constant SYMBOL = "LIF";

  // Token decimals
  uint public constant DECIMALS = 18;

  /**
   * @dev Burns a specific amount of tokens.
   *
   * @param _value The amount of tokens to be burned.
   */
  function burn(uint256 _value) public whenNotPaused {

    require(_value <= balances[msg.sender]);

    balances[msg.sender] = balances[msg.sender].sub(_value);
    totalSupply_ = totalSupply_.sub(_value);

    // a Transfer event to 0x0 can be useful for observers to keep track of
    // all the Lif by just looking at those events
    Transfer(msg.sender, address(0), _value);
  }

  /**
   * @dev Burns a specific amount of tokens of an address
   * This function can be called only by the owner in the minting process
   *
   * @param _value The amount of tokens to be burned.
   */
  function burn(address burner, uint256 _value) public onlyOwner {

    require(!mintingFinished);

    require(_value <= balances[burner]);

    balances[burner] = balances[burner].sub(_value);
    totalSupply_ = totalSupply_.sub(_value);

    // a Transfer event to 0x0 can be useful for observers to keep track of
    // all the Lif by just looking at those events
    Transfer(burner, address(0), _value);
  }
}
