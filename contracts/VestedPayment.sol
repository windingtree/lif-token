pragma solidity ^0.4.13;

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./LifToken.sol";

contract VestedPayment is Ownable {
  using SafeMath for uint256;

  // when the vested schedule starts
  uint256 public startTimestamp;

  // how much seconds each period will last
  uint256 public secondsPerPeriod;

  // how much periods will have in total
  uint256 public totalPeriods;

  // the amount of tokens to be vested in total
  uint256 public tokens;

  // how much tokens were claimed
  uint256 public claimed;

  // the token contract
  LifToken public token;

  // duration (in periods) of the initial cliff in the vesting schedule
  uint256 public cliffDuration;

  function VestedPayment(
    uint256 _startTimestamp, uint256 _secondsPerPeriod,
    uint256 _totalPeriods, uint256 _cliffDuration,
    uint256 _tokens, address tokenAddress
  ) {
    require(_startTimestamp >= block.timestamp);
    require(_secondsPerPeriod > 0);
    require(_totalPeriods > 0);
    require(tokenAddress != address(0));
    require(_cliffDuration < _totalPeriods);
    require(_tokens > 0);

    startTimestamp = _startTimestamp;
    secondsPerPeriod = _secondsPerPeriod;
    totalPeriods = _totalPeriods;
    cliffDuration = _cliffDuration;
    tokens = _tokens;
    token = LifToken(tokenAddress);
  }

  // how much tokens are available to be claimed
  function getAvailableTokens() public constant returns (uint256) {
    uint256 period = block.timestamp.sub(startTimestamp).div(secondsPerPeriod);

    if (period < cliffDuration) {
      return 0;
    } else if (period >= totalPeriods) {
      return tokens.sub(claimed);
    } else {
      return tokens.mul(period.add(1)).div(totalPeriods).sub(claimed);
    }
  }

  // claim the tokens, they can be claimed only by the owner of the contract
  function claimTokens(uint256 amount) onlyOwner {
    assert(getAvailableTokens() >= amount);

    claimed = claimed.add(amount);
    token.transfer(owner, amount);
  }

}
