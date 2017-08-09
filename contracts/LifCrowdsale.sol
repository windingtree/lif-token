pragma solidity ^0.4.13;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "./LifToken.sol";

contract LifCrowdsale is Ownable {
  using SafeMath for uint256;

  // The token being sold
  LifToken public token;

  // start and end block where investments are allowed (both inclusive)
  uint256 public startBlock;
  uint256 public endBlock1;
  uint256 public endBlock2;

  // address where funds are collected
  address public foundationWallet;
  address public marketMaker;

  // how much wei a token unit costs to a buyer, during the first half of the crowdsale
  uint256 public rate1;
  // how much wei a token unit costs to a buyer, during the second half of the crowdsale
  uint256 public rate2;

  // amount of raised money in wei
  uint256 public weiRaised;

  bool public isFinalized = false;

  event Finalized();

  /**
   * event for token purchase logging
   * @param purchaser who paid for the tokens
   * @param beneficiary who got the tokens
   * @param value weis paid for purchase
   * @param amount amount of tokens purchased
   */
  event TokenPurchase(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);


  function Crowdsale(uint256 _startBlock, uint256 _endBlock1, uint256 _endBlock2, uint256 _rate1, uint256 _rate2, address _foundationWallet, address _marketMaker) {
    require(_startBlock >= block.number);
    require(_endBlock1 > _startBlock);
    require(_endBlock2 > _endBlock1);
    require(_rate1 > 0);
    require(_rate2 > 0);
    require(_foundationWallet != 0x0);
    require(_marketMaker != 0x0);

    token = new LifToken();
    startBlock = _startBlock;
    endBlock1 = _endBlock1;
    endBlock2 = _endBlock2;
    rate1 = _rate1;
    rate2 = _rate2;
    foundationWallet = _foundationWallet;
    marketMaker = _marketMaker;
  }

  // returns the current rate or 0 if current block is not within the crowdsale period
  function getRate() public constant returns (uint256) {
    if (block.number < startBlock)
        return 0;
    else if (block.number <= endBlock1)
        return rate1;
    else if (block.number <= endBlock2)
        return rate2;
    else
        return 0;
  }

  // fallback function can be used to buy tokens
  function () payable {
    buyTokens(msg.sender);
  }

  // low level token purchase function
  function buyTokens(address beneficiary) payable {
    require(beneficiary != 0x0);
    require(validPurchase());

    uint256 weiAmount = msg.value;

    // get current price (it depends on current block number)
    uint256 rate = getRate();

    assert(rate > 0);

    // calculate token amount to be created
    uint256 tokens = weiAmount.mul(rate);

    // update state
    weiRaised = weiRaised.add(weiAmount);

    token.mint(beneficiary, tokens);
    TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);
  }

  // send ether to the fund collection wallet
  function forwardFunds() onlyOwner {
    foundationWallet.transfer(this.balance);
    // TODO
    // marketMaker.transfer(marketMakerPercentage * this.balance);
  }

  // @return true if the transaction can buy tokens
  function validPurchase() internal constant returns (bool) {
    uint256 current = block.number;
    bool withinPeriod = current >= startBlock && current <= endBlock2;
    bool nonZeroPurchase = msg.value != 0;
    return withinPeriod && nonZeroPurchase;
  }

  // @return true if crowdsale event has ended
  function hasEnded() public constant returns (bool) {
    return block.number > endBlock2;
  }

  // should be called after crowdsale ends, to do
  // some extra finalization work
  function finalize() onlyOwner {
    require(!isFinalized);
    require(hasEnded());

    token.finishMinting();
    // forwardFunds
    forwardFunds();

    Finalized();

    isFinalized = true;
  }

}
