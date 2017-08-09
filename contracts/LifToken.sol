pragma solidity ^0.4.13;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/token/MintableToken.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";

contract LifToken is MintableToken {
    // Token Name
    string public constant NAME = "Líf";

    // Token Symbol
    string public constant SYMBOL = "LIF";

    // Token decimals
    uint public constant DECIMALS = 18;
}
