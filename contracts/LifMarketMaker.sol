pragma solidity ^0.4.13;

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/token/ERC20.sol";

contract LifMarketMaker is Ownable{
  using SafeMath for uint256;

  // The Lif token contract
  ERC20 public lifToken;

  // The address of teh foundation taht can claim the ETH
  address public foundationAddr;

  // The wei gained by buying/selling lif
  uint256 weiRaised;

  // The starting wei that the market maker receives
  uint256 marketMakerWei;

  // Start and end block variables
  uint256 public startBlock;
  uint256 public endBlock;

  // Total amount of blocks that the mm will run
  uint256 public totalBlocks;

  // Amount of blocks that every period will last
  uint256 public blocksPerPeriod;

  bool public isFinalized = false;

  struct BlockPeriod {
    uint256 startBlock;
    uint256 endBlock;
    uint256 buyRate;
    uint256 weiToClaim;
  }

  BlockPeriod[] blockPeriods;

  event Finalized();

  function LifMarketMaker(
    address lifAddr,
    uint256 _startBlock,
    uint256 _endBlock,
    uint256 totalPeriods,
    address _foundationAddr
  ) payable {
    lifToken = ERC20(lifAddr);
    startBlock = _startBlock;
    endBlock = _endBlock;
    totalBlocks = _endBlock.sub(startBlock);
    blocksPerPeriod = totalBlocks.div(totalPeriods);
    foundationAddr = _foundationAddr;
    marketMakerWei = msg.value;
  }

  modifier notFinalized() {
    if (!isFinalized)
      _;
  }

  function addBlockPeriod(uint256 startBlock, uint256 endBlock, uint256 buyRate, uint256 weiToClaim) onlyOwner {

    require(block.number < startBlock);

    // Verify that period not exist and the start and end block are corrects

    BlockPeriod newPeriod;
    newPeriod.startBlock = startBlock;
    newPeriod.endBlock= endBlock;
    newPeriod.buyRate = buyRate;
    newPeriod.weiToClaim = weiToClaim;

    blockPeriods.push(newPeriod);
  }

  function getBlockPeriodIndex() constant public returns(uint256) {
    uint256 blocksAfterStart = block.number.sub(startBlock);
    return blocksAfterStart.div(blocksPerPeriod);
  }

  function getSellRate() public constant returns (uint256) {

    uint256 foundationWei = getFoundationWei();

    uint256 ActualMarketMakerWei = this.balance.sub(foundationWei);

    uint256 foundationTokens = lifToken.balanceOf(foundationAddr);

    uint256 sellRate = lifToken.totalSupply()
      .sub(foundationTokens)
      .div(ActualMarketMakerWei);

    return sellRate;
  }

  function getBuyRate() public constant returns (uint256 rate) {

    uint256 blockPeriodIndex = getBlockPeriodIndex();

    uint256 buyRate = blockPeriods[blockPeriodIndex].buyRate;

    return buyRate;
  }

  function getFoundationWei() internal returns (uint256) {

    uint256 blockPeriodIndex = getBlockPeriodIndex();

    uint256 foundationWei = marketMakerWei
      .mul(10000)
      .div(blockPeriods[blockPeriodIndex].weiToClaim);

    uint256 weiRaied = this.balance
      .sub(foundationWei)
      .sub(marketMakerWei);

    return foundationWei.add(weiRaied);
  }

  function buyLif() notFinalized payable {

    require(msg.value > 0);

    uint256 lifBalance = lifToken.balanceOf(address(this));

    uint256 rate = getBuyRate();

    uint256 amount = msg.value.mul(rate);

    require(amount <= lifBalance);

    lifToken.transfer(msg.sender, amount);

  }

  function sellLif(uint256 amount) notFinalized {

    uint256 allowance = lifToken.allowance(msg.sender, address(this));

    require(amount <= allowance);

    lifToken.transferFrom(msg.sender, address(this), amount);

    uint256 rate = getSellRate();

    uint256 totalWei = amount.mul(rate);

    msg.sender.transfer(totalWei);
  }

  function withdrawFunds(uint256 amountToClaim) {

    require(msg.sender == foundationAddr);

    uint256 available = getFoundationWei();

    require(available >= amountToClaim);

    foundationAddr.transfer(amountToClaim);

    uint256 blockPeriodIndex = getBlockPeriodIndex();

    blockPeriods[ blockPeriodIndex ].weiToClaim.sub(amountToClaim);
  }

  function finalize() {

    require(block.number > endBlock);

    uint256 lifBalance = lifToken.balanceOf(address(this));

    lifToken.approve(foundationAddr, lifBalance);

    foundationAddr.transfer(this.balance);

    isFinalized = true;

    Finalized();
  }

}
