pragma solidity ^0.4.13;

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "./LifToken.sol";

contract LifMarketMaker {
  using SafeMath for uint256;

  // The Lif token contract
  LifToken public lifToken;

  // The address of teh foundation taht can claim the ETH
  address public foundationAddr;

  // The wei gained by buying/selling lif
  uint256 weiRaised;

  // Start and end block variables
  uint256 public startBlock;
  uint256 public endBlock;
  uint256 public totalBlocks;

  struct RateRange {
    uint256 startBlock;
    uint256 endBlock;
    uint256 rate;
  }

  RateRange[] rates;

  event Finalized();
  event Created();

  function LifMarketMaker(address lifAddr, uint256 _startBlock, uint256 _endBlock, address _foundationAddr) {
    lifToken = LifToken(lifAddr);
    startBlock = _startBlock;
    endBlock = _endBlock;
    totalBlocks = _endBlock.sub(startBlock);
    foundationAddr = _foundationAddr;
    Created();
  }

  function addRateRange(uint256 startBlock, uint256 endBlock, uint256 rate) {
    RateRange newRate;
    newRate.startBlock = startBlock;
    newRate.endBlock = endBlock;
    newRate.rate = rate;
    rates.push(newRate);
  }

  function getSellRate() public constant returns (uint256) {

    // LIF Total Supply / MM balance

    uint256 totalSupply = lifToken.totalSupply();

    return totalSupply.div(this.balance);
  }

  function getBuyRate() public constant returns (uint256 rate, uint256 indexd) {
    for (uint256 i = 0; i < rates.length; i ++)
      if (rates[i].startBlock <= block.number && block.number <= rates[i].endBlock)
        return (rates[i].rate, i);
    return (0, 0);
  }

  function buyLif() payable {

    require(msg.value > 0);

    uint256 lifBalance = lifToken.balanceOf(address(this));

    uint256 rate = getBuyRate().rate;

    uint256 amount = msg.value.mul(rate);

    require(amount <= lifBalance);

    lifToken.transfer(msg.sender, amount);

  }

  function sellLif(uint256 amount) {

    uint256 allowance = lifToken.allowance(msg.sender);

    require(amount <= allowance);

    lifToken.transferFrom(msg.sender, address(this));

    uint256 rate = getSellRate();

    uint256 totalWei = amount.mul(rate);

    msg.sender.transfer(totalWei);

  }

  function withdrawFunds(uint256 amount) {

    require(msg.sender == foundationAddr);
    require(amount <= weiRaised);

    foundationAddr.transfer(amount);
  }

}
