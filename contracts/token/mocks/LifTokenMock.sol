pragma solidity ^0.4.18;

import "../LifToken.sol";

contract LifTokenMock is LifToken {

  function LifTokenMock(uint256[] initialBalances, address[] addrs) {
    for(uint8 i = 0; i < initialBalances.length; i ++) {
      balances[addrs[i]] = initialBalances[i];
      totalSupply_ = totalSupply_.add(initialBalances[i]);
    }
  }

}
