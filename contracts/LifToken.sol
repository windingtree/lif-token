pragma solidity ^0.4.11;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/payment/PullPayment.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";

contract LifToken is MintableToken {
    // Token Name
    string constant NAME = "Líf";

    // Token Symbol
    string constant SYMBOL = "LIF";

    // Token decimals
    uint constant DECIMALS = 18;
}
