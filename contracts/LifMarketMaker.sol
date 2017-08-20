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
  uint256 public initialWei;

  // Start block since which the Market Maker begins to accept buy and sell orders
  uint256 public startBlock;

  // Quantity of blocks in every period, it's roughly equivalent to 30 days
  uint256 public blocksPerPeriod;

  // Number of periods. It should be 24 or 48 (each period is roughly a month)
  uint8 public totalPeriods;

  // The total amount of wei gained on buying/selling tokens
  uint256 public totalWeiProfit = 0;

  // The total amount of wei that was claimed by the foundation
  uint256 public totalWeiClaimed = 0;

  // The price at which the market maker buys tokens at the beginning of its lifetime
  uint256 public initialBuyPrice = 0;

  // The price at which the market maker sell tokens at the beginning of its lifetime
  uint256 public initialSellPrice = 0;

  uint256 constant PERCENTAGE_FACTOR = 10000;
  uint256 constant PRICE_FACTOR = 10000;

  struct MarketMakerPeriod {
    uint256 startBlock;
    uint256 endBlock;
    // delta % of the initialWei that can be claimed by the foundation from this period
    uint256 deltaDistribution;
    // accumulated % of the initialWei that can be claimed by the foundation on this period
    uint256 accumDistribution;
    // accumulated % of the increment in the sell price in this period
    uint256 accumSellPriceIncrement;
  }

  MarketMakerPeriod[] public marketMakerPeriods;

  function LifMarketMaker(
    address lifAddr, uint256 _startBlock, uint256 _blocksPerPeriod,
    uint8 _totalPeriods, address _foundationAddr, uint256 initialPriceSpread
  ) payable {

    assert(_totalPeriods == 24 || _totalPeriods == 48);

    lifToken = ERC20(lifAddr);
    startBlock = _startBlock;
    blocksPerPeriod = _blocksPerPeriod;
    totalPeriods = _totalPeriods;
    foundationAddr = _foundationAddr;
    initialWei = msg.value;
    initialBuyPrice = initialWei
      .mul(PRICE_FACTOR)
      .div(lifToken.totalSupply().div(PRICE_FACTOR));

    initialSellPrice = initialBuyPrice
      .mul(initialPriceSpread)
      .div(PRICE_FACTOR);
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

    for (uint8 i = 0; i < totalPeriods; i++) {

      require(marketMakerPeriods.length <= i);

      if (totalPeriods == 24) {
        deltaDistribution = deltas24[i];
      } else {
        deltaDistribution = deltas48[i];
      }

      accumDistribution = accumDistribution.add(deltaDistribution);

      uint256 endBlockPeriod = startBlockPeriod.add(blocksPerPeriod).sub(1);

      marketMakerPeriods.push(MarketMakerPeriod(
        startBlockPeriod, endBlockPeriod,
        deltaDistribution, accumDistribution,
        0
      ));

      startBlockPeriod = startBlockPeriod.add(blocksPerPeriod);
    }

  }

  function calculateSellPricePeriods() {

    assert(totalPeriods == 24 || totalPeriods == 48);
    require(startBlock >= block.number);
    require(blocksPerPeriod > 0);

    // The sellPriceIncrements represents how much is going to increase in % the sellPrice
    // every period.

    uint256[48] memory accumSellPriceIncrements = [
      uint256(0), 1000, 2010, 3030, 4060, 5101,
      6152, 7213, 8285, 9368, 10462,
      11566, 12682, 13809, 14947, 16096,
      17257, 18430, 19614, 20810, 22019,
      23239, 24471, 25716, 26973, 28243,
      29525, 30820, 32129, 33450, 34784,
      36132, 37494, 38869, 40257, 41660,
      43076, 44507, 45952, 47412, 48886,
      50375, 51878, 53397, 54931, 56481,
      58045, 59626
    ];

    uint256 accumSellPriceIncrement = 0;

    for (uint8 i = 0; i < totalPeriods; i++) {

      require(marketMakerPeriods[i].startBlock > 0);

      marketMakerPeriods[i].accumSellPriceIncrement = accumSellPriceIncrements[i];

    }

  }

  function getCurrentPeriodIndex() constant public returns(uint256) {
    require(block.number >= startBlock);
    return block.number.sub(startBlock).div(blocksPerPeriod);
  }

  function getSellPrice() public constant returns (uint256) {

    uint256 periodIndex = getCurrentPeriodIndex();

    uint256 sellPriceIncrement = initialSellPrice
      .mul(PRICE_FACTOR.add(marketMakerPeriods[periodIndex].accumSellPriceIncrement))
      .div(PRICE_FACTOR);

    return sellPriceIncrement;

  }

  function getBuyPrice() public constant returns (uint256 price) {

    uint256 accumulatedDistributionPercentage = marketMakerPeriods[getCurrentPeriodIndex()].
      accumDistribution;

    return initialWei.
      mul(PERCENTAGE_FACTOR.sub(accumulatedDistributionPercentage)).
      div(lifToken.totalSupply()).
      div(PERCENTAGE_FACTOR);
  }

  // Get the maximum amount of wei that the foundation can claim, without discounting what it
  // claimed already (so the actual amount that it can claim can be lower). It's a portion of
  // the ETH that was not claimed by token holders plus the profits made by the market maker
  // by buying and selling tokens
  function getMaxClaimableWeiAmount() constant public returns (uint256) {

    uint256 totalSupply = lifToken.totalSupply();
    uint256 totalCirculation = totalSupply.sub(lifToken.balanceOf(address(this)));
    uint256 accumulatedDistributionPercentage = marketMakerPeriods[getCurrentPeriodIndex()].accumDistribution;

    return initialWei.
      mul(accumulatedDistributionPercentage).div(PERCENTAGE_FACTOR).
      mul(totalCirculation).div(totalSupply).
      add(totalWeiProfit);
  }

  function() payable {
    getTokens();
  }

  function getTokens() payable {

    require(msg.value > 0);

    uint256 price = getBuyPrice();
    uint256 tokens = msg.value.
      mul(PRICE_FACTOR).
      div(price);

    require(tokens <= lifToken.balanceOf(address(this)));

    lifToken.transfer(msg.sender, tokens);
  }

  // sends tokens from Market Maker to the msg.sender, in exchange of Eth at the price of getBuyPrice
  function sendTokens(uint256 tokens) {
    require(tokens > 0);

    uint256 price = getBuyPrice();
    uint initialPrice = initialWei.div(lifToken.totalSupply());
    uint256 profitPerToken = initialPrice.sub(price);
    uint256 totalWei = tokens.mul(price);

    totalWeiProfit = totalWeiProfit.add(profitPerToken.mul(tokens));

    lifToken.transferFrom(msg.sender, address(this), tokens);

    msg.sender.transfer(totalWei);
  }

  // Called from the foundation wallet to claim eth back from the Market Maker. Maximum amount
  // that can be claimed is determined by getMaxClaimableWeiAmount and how much
  // wei has the foundation claimed already (totalWeiClaimed)
  function claimEth(uint256 weiAmount) {

    require(msg.sender == foundationAddr);

    uint256 claimable = getMaxClaimableWeiAmount().sub(totalWeiClaimed);

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
