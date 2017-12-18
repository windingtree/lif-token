pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./LifToken.sol";

/**
   @title Market Validation Mechanism (MVM)
 */
contract LifMarketValidationMechanism is Ownable {
  using SafeMath for uint256;

  // The Lif token contract
  LifToken public lifToken;

  // The address of the foundation wallet. It can claim part of the eth funds
  // following an exponential curve until the end of the MVM lifetime (24 or 48
  // months). After that it can claim 100% of the remaining eth in the MVM.
  address public foundationAddr;

  // The amount of wei that the MVM received initially
  uint256 public initialWei;

  // Start timestamp since which the MVM begins to accept tokens via sendTokens
  uint256 public startTimestamp;

  // Quantity of seconds in every period, usually equivalent to 30 days
  uint256 public secondsPerPeriod;

  // Number of periods. It should be 24 or 48 (each period is roughly a month)
  uint8 public totalPeriods;

  // The total amount of wei that was claimed by the foundation so far
  uint256 public totalWeiClaimed = 0;

  // The price at which the MVM buys tokens at the beginning of its lifetime
  uint256 public initialBuyPrice = 0;

  // Amount of tokens that were burned by the MVM
  uint256 public totalBurnedTokens = 0;

  // Amount of wei that was reimbursed via sendTokens calls
  uint256 public totalReimbursedWei = 0;

  // Total supply of tokens when the MVM was created
  uint256 public originalTotalSupply;

  uint256 constant PRICE_FACTOR = 100000;

  // Has the MVM been funded by calling `fund`? It can be funded only once
  bool public funded = false;

  // true when the market MVM is paused
  bool public paused = false;

  // total amount of seconds that the MVM was paused
  uint256 public totalPausedSeconds = 0;

  // the timestamp where the MVM was paused
  uint256 public pausedTimestamp;

  uint256[] public periods;

  // Events
  event Pause();
  event Unpause(uint256 pausedSeconds);

  event ClaimedWei(uint256 claimedWei);
  event SentTokens(address indexed sender, uint256 price, uint256 tokens, uint256 returnedWei);

  modifier whenNotPaused(){
    assert(!paused);
    _;
  }

  modifier whenPaused(){
    assert(paused);
    _;
  }

  /**
     @dev Constructor

     @param lifAddr the lif token address
     @param _startTimestamp see `startTimestamp`
     @param _secondsPerPeriod see `secondsPerPeriod`
     @param _totalPeriods see `totalPeriods`
     @param _foundationAddr see `foundationAddr`
    */
  function LifMarketValidationMechanism(
    address lifAddr, uint256 _startTimestamp, uint256 _secondsPerPeriod,
    uint8 _totalPeriods, address _foundationAddr
  ) {
    require(lifAddr != address(0));
    require(_startTimestamp > block.timestamp);
    require(_secondsPerPeriod > 0);
    require(_totalPeriods == 24 || _totalPeriods == 48);
    require(_foundationAddr != address(0));

    lifToken = LifToken(lifAddr);
    startTimestamp = _startTimestamp;
    secondsPerPeriod = _secondsPerPeriod;
    totalPeriods = _totalPeriods;
    foundationAddr = _foundationAddr;

  }

  /**
     @dev Receives the initial funding from the Crowdsale. Calculates the
     initial buy price as initialWei / totalSupply
    */
  function fund() public payable onlyOwner {
    assert(!funded);

    originalTotalSupply = lifToken.totalSupply();
    initialWei = msg.value;
    initialBuyPrice = initialWei.
      mul(PRICE_FACTOR).
      div(originalTotalSupply);

    funded = true;
  }

  /**
     @dev calculates the exponential distribution curve. It determines how much
     wei can be distributed back to the foundation every month. It starts with
     very low amounts ending with higher chunks at the end of the MVM lifetime
    */
  function calculateDistributionPeriods() public {
    assert(totalPeriods == 24 || totalPeriods == 48);
    assert(periods.length == 0);

    // Table with the max delta % that can be distributed back to the foundation on
    // each period. It follows an exponential curve (starts with lower % and ends
    // with higher %) to keep the funds in the MVM longer. deltas24
    // is used when MVM lifetime is 24 months, deltas48 when it's 48 months.
    // The sum is less than 100% because the last % is missing: after the last period
    // the 100% remaining can be claimed by the foundation. Values multipled by 10^5

    uint256[24] memory accumDistribution24 = [
      uint256(0), 18, 117, 351, 767, 1407,
      2309, 3511, 5047, 6952, 9257, 11995,
      15196, 18889, 23104, 27870, 33215, 39166,
      45749, 52992, 60921, 69561, 78938, 89076
    ];

    uint256[48] memory accumDistribution48 = [
      uint256(0), 3, 18, 54, 117, 214, 351, 534,
      767, 1056, 1406, 1822, 2308, 2869, 3510, 4234,
      5046, 5950, 6950, 8051, 9256, 10569, 11994, 13535,
      15195, 16978, 18888, 20929, 23104, 25416, 27870, 30468,
      33214, 36112, 39165, 42376, 45749, 49286, 52992, 56869,
      60921, 65150, 69560, 74155, 78937, 83909, 89075, 94438
    ];

    for (uint8 i = 0; i < totalPeriods; i++) {

      if (totalPeriods == 24) {
        periods.push(accumDistribution24[i]);
      } else {
        periods.push(accumDistribution48[i]);
      }

    }
  }

  /**
     @dev Returns the current period as a number from 0 to totalPeriods

     @return the current period as a number from 0 to totalPeriods
    */
  function getCurrentPeriodIndex() public view returns(uint256) {
    assert(block.timestamp >= startTimestamp);
    return block.timestamp.sub(startTimestamp).
      sub(totalPausedSeconds).
      div(secondsPerPeriod);
  }

  /**
     @dev calculates the accumulated distribution percentage as of now,
     following the exponential distribution curve

     @return the accumulated distribution percentage, used to calculate things
     like the maximum amount that can be claimed by the foundation
    */
  function getAccumulatedDistributionPercentage() public view returns(uint256 percentage) {
    uint256 period = getCurrentPeriodIndex();

    assert(period < totalPeriods);

    return periods[period];
  }

  /**
     @dev returns the current buy price at which the MVM offers to buy tokens to
     burn them

     @return the current buy price (in eth/lif, multiplied by PRICE_FACTOR)
    */
  function getBuyPrice() public view returns (uint256 price) {
    uint256 accumulatedDistributionPercentage = getAccumulatedDistributionPercentage();

    return initialBuyPrice.
      mul(PRICE_FACTOR.sub(accumulatedDistributionPercentage)).
      div(PRICE_FACTOR);
  }

  /**
     @dev Returns the maximum amount of wei that the foundation can claim. It's
     a portion of the ETH that was not claimed by token holders

     @return the maximum wei claimable by the foundation as of now
    */
  function getMaxClaimableWeiAmount() public view returns (uint256) {
    if (isFinished()) {
      return this.balance;
    } else {
      uint256 claimableFromReimbursed = initialBuyPrice.
        mul(totalBurnedTokens).div(PRICE_FACTOR).
        sub(totalReimbursedWei);
      uint256 currentCirculation = lifToken.totalSupply();
      uint256 accumulatedDistributionPercentage = getAccumulatedDistributionPercentage();
      uint256 maxClaimable = initialWei.
        mul(accumulatedDistributionPercentage).div(PRICE_FACTOR).
        mul(currentCirculation).div(originalTotalSupply).
        add(claimableFromReimbursed);

      if (maxClaimable > totalWeiClaimed) {
        return maxClaimable.sub(totalWeiClaimed);
      } else {
        return 0;
      }
    }
  }

  /**
     @dev allows to send tokens to the MVM in exchange of Eth at the price
     determined by getBuyPrice. The tokens are burned
    */
  function sendTokens(uint256 tokens) public whenNotPaused {
    require(tokens > 0);

    uint256 price = getBuyPrice();
    uint256 totalWei = tokens.mul(price).div(PRICE_FACTOR);

    lifToken.transferFrom(msg.sender, address(this), tokens);
    lifToken.burn(tokens);
    totalBurnedTokens = totalBurnedTokens.add(tokens);

    SentTokens(msg.sender, price, tokens, totalWei);

    totalReimbursedWei = totalReimbursedWei.add(totalWei);
    msg.sender.transfer(totalWei);
  }

  /**
     @dev Returns whether the MVM end-of-life has been reached. When that
     happens no more tokens can be sent to the MVM and the foundation can claim
     100% of the remaining balance in the MVM

     @return true if the MVM end-of-life has been reached
    */
  function isFinished() public view returns (bool finished) {
    return getCurrentPeriodIndex() >= totalPeriods;
  }

  /**
     @dev Called from the foundation wallet to claim eth back from the MVM.
     Maximum amount that can be claimed is determined by
     getMaxClaimableWeiAmount
    */
  function claimWei(uint256 weiAmount) public whenNotPaused {
    require(msg.sender == foundationAddr);

    uint256 claimable = getMaxClaimableWeiAmount();

    assert(claimable >= weiAmount);

    foundationAddr.transfer(weiAmount);

    totalWeiClaimed = totalWeiClaimed.add(weiAmount);

    ClaimedWei(weiAmount);
  }

  /**
     @dev Pauses the MVM. No tokens can be sent to the MVM and no eth can be
     claimed from the MVM while paused. MVM total lifetime is extended by the
     period it stays paused
    */
  function pause() public onlyOwner whenNotPaused {
    paused = true;
    pausedTimestamp = block.timestamp;

    Pause();
  }

  /**
     @dev Unpauses the MVM. See `pause` for more details about pausing
    */
  function unpause() public onlyOwner whenPaused {
    uint256 pausedSeconds = block.timestamp.sub(pausedTimestamp);
    totalPausedSeconds = totalPausedSeconds.add(pausedSeconds);
    paused = false;

    Unpause(pausedSeconds);
  }

}
