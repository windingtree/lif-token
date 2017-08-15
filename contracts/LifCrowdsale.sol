pragma solidity ^0.4.13;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "./LifToken.sol";

contract LifCrowdsale is Ownable, Pausable {
  using SafeMath for uint256;

  // The token being sold
  LifToken public token;

  // start and end of the public presale
  uint256 public startPublicPresaleBlock;
  uint256 public endPublicPresaleBlock;

  // start and end block where investments are allowed (both inclusive)
  uint256 public startBlock;
  uint256 public endBlock1;
  uint256 public endBlock2;

  // address where funds are collected
  address public foundationWallet;
  address public marketMaker;

  // how much wei a token unit costs to a buyer, during the private presale stage
  uint256 public privatePresaleRate;

  // how much wei a token unit costs to a buyer, during the public presale
  uint256 public ratePublicPresale;
  // how much wei a token unit costs to a buyer, during the first half of the crowdsale
  uint256 public rate1;
  // how much wei a token unit costs to a buyer, during the second half of the crowdsale
  uint256 public rate2;

  // amount of raised money in wei
  uint256 public weiRaised;

  // total amount of tokens sold on the ICO
  uint256 public tokensSold;

  // total amount of wei received as presale payments (both private and public)
  uint256 public totalPresaleWei;

  // maximun amount of ether that can be raised using presale payments in wei unit
  uint256 public maxPresaleWei;

  //  minimun amount of wei to be raised in order to succed
  uint256 public minCap;

  mapping(address => uint256) public purchases;

  bool public isFinalized = false;

  event Finalized();

  /**
   * event for token purchase logging
   * @param purchaser who paid for the tokens
   * @param beneficiary who got the tokens
   * @param value weis paid for purchase
   * @param amount amount of tokens purchased
   */
  event TokenPurchase(
    address indexed purchaser,
    address indexed beneficiary,
    uint256 value,
    uint256 amount
  );

  function LifCrowdsale(
    uint256 _startPublicPresaleBlock,
    uint256 _endPublicPresaleBlock,
    uint256 _startBlock,
    uint256 _endBlock1,
    uint256 _endBlock2,
    uint256 _ratePublicPresale,
    uint256 _rate1,
    uint256 _rate2,
    uint256 _privatePresaleRate,
    address _foundationWallet,
    address _marketMaker,
    uint256 _minCap,
    uint256 _maxPresaleWei
  ) {
    require(_startPublicPresaleBlock >= block.number);
    require(_endPublicPresaleBlock > _startPublicPresaleBlock);
    require(_startBlock > _endPublicPresaleBlock);
    require(_endBlock1 > _startBlock);
    require(_endBlock2 > _endBlock1);
    require(_ratePublicPresale > 0);
    require(_rate1 > 0);
    require(_rate2 > 0);
    require(_minCap > 0);
    require(_foundationWallet != 0x0);
    require(_marketMaker != 0x0);

    token = new LifToken();
    token.pause();

    startPublicPresaleBlock = _startPublicPresaleBlock;
    endPublicPresaleBlock = _endPublicPresaleBlock;
    startBlock = _startBlock;
    endBlock1 = _endBlock1;
    endBlock2 = _endBlock2;
    ratePublicPresale = _ratePublicPresale;
    rate1 = _rate1;
    rate2 = _rate2;
    privatePresaleRate = _privatePresaleRate;
    foundationWallet = _foundationWallet;
    marketMaker = _marketMaker;
    minCap = _minCap;
    maxPresaleWei = _maxPresaleWei;
  }

  // returns the current rate or 0 if current block is not within the crowdsale period
  function getRate() public constant returns (uint256) {
    if (block.number < startPublicPresaleBlock)
      return 0;
    else if (block.number <= endPublicPresaleBlock)
      return ratePublicPresale;
    else if (block.number <= startBlock)
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

    // check if we are in the public presale block range
    if (rate == ratePublicPresale) {
      // store how much wei did we receive in presale
      totalPresaleWei = totalPresaleWei.add(weiAmount);
    } else {
      // store wei amount in case of ICO min cap not reached
      weiRaised = weiRaised.add(weiAmount);
      purchases[beneficiary] = weiAmount;
      tokensSold = tokensSold.add(tokens);
    }

    token.mint(beneficiary, tokens);
    TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);
  }

  function addPrivatePresaleTokens(address beneficiary, uint256 weiSent) onlyOwner {
    require(block.number < startPublicPresaleBlock);
    require(beneficiary != address(0));
    require(weiSent > 0);

    uint256 tokens = weiSent.mul(privatePresaleRate);

    require(totalPresaleWei.add(weiSent) <= maxPresaleWei);

    totalPresaleWei.add(weiSent);

    token.mint(beneficiary, tokens);
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
    bool withinPublicPresalePeriod = current >= startPublicPresaleBlock && current <= endPublicPresaleBlock;
    bool maxPresaleNotReached = totalPresaleWei.add(msg.value) <= maxPresaleWei;
    bool withinPeriod = current >= startBlock && current <= endBlock2;
    bool nonZeroPurchase = msg.value != 0;
    return (withinPublicPresalePeriod && maxPresaleNotReached && nonZeroPurchase) || (withinPeriod && nonZeroPurchase);
  }

  // @return true if crowdsale event has ended
  function hasEnded() public constant returns (bool) {
    return block.number > endBlock2;
  }

  function funded() public constant returns (bool) {
    return weiRaised >= minCap;
  }

  // return the eth if the crowdsale didnt reach the minCap
  function claimEth() public {
    require(isFinalized);
    require(hasEnded());
    require(funded());

    uint256 toReturn = purchases[msg.sender];
    assert(toReturn > 0);

    purchases[msg.sender] = 0;

    msg.sender.transfer(toReturn);
  }

  // should be called after crowdsale ends, to do
  // some extra finalization work
  function finalize() public {
    require(!isFinalized);
    require(hasEnded());

    // TODO: transfer an extra 25% of tokens to the foundation, for the team
    // TODO: transfer 13% to founders with a vesting mechanism?

    // foward founds and unpause token only if minCap is reached
    if (funded()) {

      token.finishMinting();
      forwardFunds();
      token.unpause();

      token.transferOwnership(owner);

    }

    Finalized();

    isFinalized = true;
  }

}
