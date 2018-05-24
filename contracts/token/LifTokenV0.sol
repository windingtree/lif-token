pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/token/ERC827/ERC827Token.sol";
import "./LifToken.sol";
import "zos-lib/contracts/migrations/Initializable.sol";


/**
   @title Líf, the Winding Tree token

   First version of Líf, the token for Winding Tree.
   Uses OpenZeppelin StandardToken, MintableToken and PausableToken.
 */
contract LifTokenV0 is LifToken, Initializable {

  /**
   * @dev initilizer function of the proxy
   * @param _owner address, the address of the token owner
   */
  function initialize(address _owner) isInitializer {
    owner = _owner;
  }

}
