pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/token/ERC827/ERC827Token.sol";
import "../../LifToken.sol";

/**
   @title Líf, the Winding Tree token

   Implementation of Líf, the ERC827 token for Winding Tree, an extension of the
   ERC20 token with extra methods to transfer value and data to execute a call
   on transfer.
   Uses OpenZeppelin StandardToken, ERC827Token, MintableToken and PausableToken.
 */
contract LifTokenV0 is LifToken, ERC827Token {

}
