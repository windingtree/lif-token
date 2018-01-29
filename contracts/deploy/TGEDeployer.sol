pragma solidity ^0.4.18;

import "../LifCrowdsale.sol";

/**
   @title TGEDeployer, A deployer contract for the Winding Tree TGE

   This contract is used to create a crowdsale and issue presale tokens in batches
   it will also set the weiPerUSD and transfer ownership, after that everything is
   ready for the TGE to succed.
 */
contract TGEDeployer {

  LifCrowdsale public crowdsale;
  address public wallet;
  address public owner;

  function TGEDeployer(
    uint256 startTimestamp,
    uint256 end1Timestamp,
    uint256 end2Timestamp,
    uint256 rate1,
    uint256 rate2,
    uint256 setWeiLockSeconds,
    address foundationWallet,
    address foundersWallet
  ) public {
    crowdsale = new LifCrowdsale(
      startTimestamp, end1Timestamp, end2Timestamp, rate1, rate2,
      setWeiLockSeconds, foundationWallet, foundersWallet
    );
    wallet = foundationWallet;
    owner = msg.sender;
  }

  // Mint a batch of presale tokens
  function addPresaleTokens(address[] contributors, uint256[] values, uint256 rate) public {
    require(msg.sender == owner);
    require(contributors.length == values.length);
    for (uint32 i = 0; i < contributors.length; i ++) {
      crowdsale.addPrivatePresaleTokens(contributors[i], values[i], rate);
    }
  }

  // Set the wei per USD in the crowdsale and then transfer ownership to foundation
  function finish(uint256 weiPerUSDinTGE) public {
    require(msg.sender == owner);
    crowdsale.setWeiPerUSDinTGE(weiPerUSDinTGE);
    crowdsale.transferOwnership(wallet);
  }

}
