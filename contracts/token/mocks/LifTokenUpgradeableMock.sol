pragma solidity ^0.4.18;

import "../LifToken.sol";
import "zos-lib/contracts/migrations/Initializable.sol";

contract LifTokenUpgradeableMock is LifToken, Initializable {


  function initialize(uint256[] initialBalances, address[] addrs) isInitializer {
    for(uint8 i = 0; i < initialBalances.length; i ++) {
      balances[addrs[i]] = initialBalances[i];
      totalSupply_ = totalSupply_.add(initialBalances[i]);
    }
  }

}
