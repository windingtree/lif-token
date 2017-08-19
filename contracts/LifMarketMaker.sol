pragma solidity ^0.4.13;

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/token/ERC20.sol";

contract LifMarketMaker is Ownable {
  using SafeMath for uint256;

  // The Lif token contract
  ERC20 public lifToken;

  // The address of the foundation wallet. It can claim part of the eth funds following an
  // exponential curve until the end of the Market Maker lifetime (24 or 48 months). After
  // that it can claim 100% of remaining eth and tokens.
  address public foundationAddr;

  // The amount of wei that the Market Maker received initially
  uint256 initialWei;

  // Start block since which the Market Maker begins to accept buy and sell orders
  uint256 public startBlock;

  // Quantity of blocks in every period, it's roughly equivalent to 30 days
  uint256 public blocksPerPeriod;

  // The total amount of wei gained on buying/selling tokens
  uint256 public totalWeiProfit = 0;

  // The total amount of wei that was claimed by the foundation
  uint256 public totalWeiClaimed = 0;

  // The price at which the market maker buys tokens at the beginning of its lifetime
  uint256 public initialBuyPrice = 0;

  struct DistributionPeriod {
    uint256 startBlock;
    uint256 endBlock;
    // This is % of the initialWei that can be claimed by the foundation from this period
    uint256 deltaDistribution;
  }

  DistributionPeriod[] public distributionPeriods;

  function LifMarketMaker(
    address lifAddr, uint256 _startBlock, uint256 _blocksPerPeriod,
    uint8 _totalPeriods, address _foundationAddr
  ) payable {

    assert(_totalPeriods == 24 || _totalPeriods == 48);

    lifToken = ERC20(lifAddr);
    startBlock = _startBlock;
    blocksPerPeriod = _blocksPerPeriod;
    calculateDistributionPeriods(_startBlock, _totalPeriods, _blocksPerPeriod);
    foundationAddr = _foundationAddr;
    initialWei = msg.value;
    initialBuyPrice = initialWei.div(lifToken.totalSupply());
  }

  function calculateDistributionPeriods(
    uint256 startBlock, uint8 totalPeriods, uint256 blocksPerPeriod
  ) internal {

    assert(totalPeriods == 24 || totalPeriods == 48);
    require(startBlock >= block.number);
    require(blocksPerPeriod > 0);

    // Table with the max delta % that can be distributed back to the foundation on
    // each period. It follows an exponential curve (starts with lower % and ends
    // with higher %) to keep the funds in the market maker longer. deltas24 is
    // used when market maker lifetime is 24 months, deltas48 when it's 48 months.
    // The sum is less than 100% because the last % is missing: after the last period
    // the 100% remaining can be claimed by the foundation. Values multipled by 10^5
    uint256[24] memory deltas24 = [
      uint256(0), 18, 99, 234, 416, 640,
      902, 1202, 1536, 1905, 2305, 2738,
      3201, 3693, 4215, 4766, 5345, 5951,
      6583, 7243, 7929, 8640, 9377, 10138
    ];

    uint256[48] memory deltas48 = [
      uint256(0), 3, 15, 36, 63, 97,
      137, 183, 233, 289, 350, 416,
      486, 561, 641, 724, 812, 904,
      1000, 1101, 1205, 1313, 1425, 1541,
      1660, 1783, 1910, 2041, 2175, 2312,
      2454, 2598, 2746, 2898, 3053, 3211,
      3373, 3537, 3706, 3877, 4052, 4229,
      4410, 4595, 4782, 4972, 5166, 5363
    ];

    for (uint8 i = 0; i < totalPeriods; i++) {
      uint256 distributionDelta;
      if (totalPeriods == 24) {
        distributionDelta = deltas24[i];
      } else {
        distributionDelta = deltas48[i];
      }
      uint256 endBlockPeriod = startBlock.add(blocksPerPeriod).sub(1);

      distributionPeriods.push(DistributionPeriod(
        startBlock, endBlockPeriod, distributionDelta
      ));
      startBlock = startBlock.add(blocksPerPeriod);
    }

  }

  function getCurrentPeriodIndex() constant public returns(uint256) {
    require(block.number > startBlock);
    return block.number.sub(startBlock).div(blocksPerPeriod);
  }

  function getSellRate() public constant returns (uint256) {

    uint256 foundationWei = getFoundationWei();

    uint256 currentMarketMakerWei = this.balance.sub(foundationWei);

    uint256 sellRate = lifToken.totalSupply()
      .div(currentMarketMakerWei);

    return sellRate;
  }

  function getBuyRate() public constant returns (uint256 rate) {

    uint256 blockPeriodIndex = getCurrentPeriodIndex();

    // uint256 buyRate = distributionPeriods[blockPeriodIndex].buyRate;

    return 1;
  }

  // Get the total amount of wei tat the foundation can claim in the current distribution period

  // TODO Calculate the total amount of wei that the foundation can withdraw, not only of current period
  function getFoundationWei() constant public returns (uint256) {

    uint256 currentPeriodIndex = getCurrentPeriodIndex();

    uint256 foundationWei = 0;

    uint256 weiRaied = this.balance
      .sub(foundationWei)
      .sub(initialWei);

    return foundationWei.add(weiRaied);
  }

  function() payable {
    buyLif();
  }

  function buyLif() payable {

    require(msg.value > 0);

    uint256 lifBalance = lifToken.balanceOf(address(this));

    uint256 rate = getBuyRate();

    uint256 amount = msg.value.mul(rate);

    require(amount <= lifBalance);

    lifToken.transfer(msg.sender, amount);

  }

  function sellLif(uint256 amount) {

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

    uint256 blockPeriodIndex = getCurrentPeriodIndex();

    distributionPeriods[ blockPeriodIndex ].deltaDistribution.sub(amountToClaim);

    // require(block.number > endBlock);

    // uint256 lifBalance = lifToken.balanceOf(address(this));

    // lifToken.approve(foundationAddr, lifBalance);

    // foundationAddr.transfer(this.balance);
  }

}
