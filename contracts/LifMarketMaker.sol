pragma solidity ^0.4.13;

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./LifToken.sol";

contract LifMarketMaker is Ownable {
  using SafeMath for uint256;

  // The Lif token contract
  LifToken public lifToken;

  // The address of the foundation wallet. It can claim part of the eth funds following an
  // exponential curve until the end of the Market Maker lifetime (24 or 48 months). After
  // that it can claim 100% of remaining eth and tokens.
  address public foundationAddr;

  // The amount of wei that the Market Maker received initially
  uint256 public initialWei;

  // Start block since which the Market Maker begins to accept buy and sell orders
  uint256 public startBlock;

  // Quantity of blocks in every period, it's roughly equivalent to 30 days
  uint256 public blocksPerPeriod;

  // Number of periods. It should be 24 or 48 (each period is roughly a month)
  uint8 public totalPeriods;

  // The total amount of wei that was claimed by the foundation
  uint256 public totalWeiClaimed = 0;

  // The price at which the market maker buys tokens at the beginning of its lifetime
  uint256 public initialBuyPrice = 0;

  // Amount of tokens that were burned by the market maker
  uint256 public totalBurnedTokens = 0;

  // Total supply of tokens when the Market Maker was created
  uint256 public originalTotalSupply;

  uint256 constant PERCENTAGE_FACTOR = 100000;
  uint256 constant PRICE_FACTOR = 100000;

  bool public funded = false;

  struct MarketMakerPeriod {
    uint256 startBlock;
    uint256 endBlock;
    // delta % of the initialWei that can be claimed by the foundation from this period
    uint256 deltaDistribution;
    // accumulated % of the initialWei that can be claimed by the foundation on this period
    uint256 accumDistribution;
  }

  MarketMakerPeriod[] public marketMakerPeriods;

  function LifMarketMaker(
    address lifAddr, uint256 _startBlock, uint256 _blocksPerPeriod,
    uint8 _totalPeriods, address _foundationAddr
  ) {

    assert(_totalPeriods == 24 || _totalPeriods == 48);

    lifToken = LifToken(lifAddr);
    startBlock = _startBlock;
    blocksPerPeriod = _blocksPerPeriod;
    totalPeriods = _totalPeriods;
    foundationAddr = _foundationAddr;
    originalTotalSupply = lifToken.totalSupply();
  }

  function fund() payable onlyOwner {
    assert(!funded);

    initialWei = msg.value;
    initialBuyPrice = initialWei.
      mul(PRICE_FACTOR).
      div(lifToken.totalSupply());

    funded = true;
  }

  function calculateDistributionPeriods() {

    assert(totalPeriods == 24 || totalPeriods == 48);
    require(startBlock >= block.number);
    require(blocksPerPeriod > 0);

    // Table with the max delta % that can be distributed back to the foundation on
    // each period. It follows an exponential curve (starts with lower % and ends
    // with higher %) to keep the funds in the market maker longer. deltas24
    // is used when market maker lifetime is 24 months, deltas48 when it's 48 months.
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

    uint256 accumDistribution = 0;
    uint256 deltaDistribution = 0;
    uint256 startBlockPeriod = startBlock;

    require(marketMakerPeriods.length == 0);

    for (uint8 i = 0; i < totalPeriods; i++) {

      if (totalPeriods == 24) {
        deltaDistribution = deltas24[i];
      } else {
        deltaDistribution = deltas48[i];
      }

      accumDistribution = accumDistribution.add(deltaDistribution);

      marketMakerPeriods.push(MarketMakerPeriod(
        startBlockPeriod, startBlockPeriod.add(blocksPerPeriod).sub(1),
        deltaDistribution, accumDistribution
      ));

      startBlockPeriod = startBlockPeriod.add(blocksPerPeriod);
    }

  }

  function getCurrentPeriodIndex() constant public returns(uint256) {
    require(block.number >= startBlock);
    return block.number.sub(startBlock).div(blocksPerPeriod);
  }

  function getAccumulatedDistributionPercentage() public constant returns(uint256 percentage) {
    uint256 period = getCurrentPeriodIndex();

    assert(period < totalPeriods);

    return marketMakerPeriods[period].accumDistribution;
  }

  function getBuyPrice() public constant returns (uint256 price) {

    uint256 accumulatedDistributionPercentage = getAccumulatedDistributionPercentage();

    return initialBuyPrice.
      mul(PERCENTAGE_FACTOR.sub(accumulatedDistributionPercentage)).
      div(PERCENTAGE_FACTOR);
  }

  // Get the maximum amount of wei that the foundation can claim. It's a portion of
  // the ETH that was not claimed by token holders
  function getMaxClaimableWeiAmount() constant public returns (uint256) {

    if (isFinished()) {
      return this.balance;
    } else {
      uint256 currentCirculation = lifToken.totalSupply();
      uint256 accumulatedDistributionPercentage = getAccumulatedDistributionPercentage();
      uint256 maxClaimable = initialWei.
        mul(accumulatedDistributionPercentage).div(PERCENTAGE_FACTOR).
        mul(currentCirculation).div(originalTotalSupply);

      if (maxClaimable > totalWeiClaimed) {
        return maxClaimable.sub(totalWeiClaimed);
      } else {
        return 0;
      }
    }
  }

  // sends tokens from Market Maker to the msg.sender, in exchange of Eth at the price of getBuyPrice
  function sendTokens(uint256 tokens) {
    require(tokens > 0);

    uint256 price = getBuyPrice();
    uint256 totalWei = tokens.mul(price).div(PRICE_FACTOR);

    lifToken.transferFrom(msg.sender, address(this), tokens);
    lifToken.burn(tokens);
    totalBurnedTokens = totalBurnedTokens.add(tokens);

    msg.sender.transfer(totalWei);
  }

  function isFinished() public constant returns (bool finished) {
    return getCurrentPeriodIndex() >= totalPeriods;
  }

  // Called from the foundation wallet to claim eth back from the Market Maker. Maximum amount
  // that can be claimed is determined by getMaxClaimableWeiAmount
  function claimEth(uint256 weiAmount) {

    require(msg.sender == foundationAddr);

    uint256 claimable = getMaxClaimableWeiAmount();

    assert(claimable >= weiAmount);

    foundationAddr.transfer(weiAmount);

    totalWeiClaimed = totalWeiClaimed.add(weiAmount);

    // TODO: allow to claim all the remaining ETH after the market maker lifetim (24/48 mo.)
    // require(block.number > endBlock);

    // uint256 lifBalance = lifToken.balanceOf(address(this));

    // lifToken.approve(foundationAddr, lifBalance);

    // foundationAddr.transfer(this.balance);
  }

}
