pragma solidity ^0.4.18;

import "../LifTokenV0.sol";

contract LifTokenV0Mock is LifTokenV0 {

  function initialize(address _owner, uint256[] initialBalances, address[] addrs) isInitializer {
    owner = _owner;
    for(uint8 i = 0; i < initialBalances.length; i ++) {
      balances[addrs[i]] = initialBalances[i];
      totalSupply_ = totalSupply_.add(initialBalances[i]);
    }
  }

}
