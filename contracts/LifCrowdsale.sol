pragma solidity ^0.4.13;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "./LifToken.sol";
import "./LifMarketValidationMechanism.sol";

/**
   @title Crowdsale for the Lif Token Generation Even

   Implementation of the Lif Token Generation Event (TGE) Crowdsale: A 2 week
   fixed price, uncapped
   token sale, with a discounted rate during the 1st week and discounted rates
   for contributions during the presale period and a Market Validation Mechanism
   that will receive the funds over the USD 10M
   soft cap.
   The crowdsale has a minimum cap of USD 5M which in case of not being reached
   by purchases made during the 2 week period the token will not start operating
   and all funds sent during that period will be made available to be claimed by
   the originating addresses.
   Funds up to the USD 10M soft cap will be sent to the Winding Tree Foundation
   wallet at the end of the crowdsale.
   Funds over that amount will be put in a MarketValidationMechanism (MVM) smart
   contract that guarantees a price floor for a period of 2 or 4 years, allowing
   any token holder to burn their tokens in exchange of part of the eth amount
   sent during the TGE in exchange of those tokens.
 */
contract LifCrowdsale is Ownable, Pausable {
  using SafeMath for uint256;

  // The token being sold.
  LifToken public token;

  // Start and end timestamps of the public presale.
  uint256 public publicPresaleStartTimestamp;
  uint256 public publicPresaleEndTimestamp;

  // Beginning of the period where tokens can be purchased at rate `rate1`.
  uint256 public startTimestamp;
  // Moment after which the rate to buy tokens goes from `rate1` to `rate2`.
  uint256 public end1Timestamp;
  // Marks the end of the Token Generation Event.
  uint256 public end2Timestamp;

  // Address of the Winding Tree Foundation wallet. Funds up to the soft cap are
  // sent to this address. It's also the address to which the MVM distributes
  // the funds that are made available month after month. An extra 5% of tokens
  // are put in a Vested Payment with this address as beneficiary, acting as a
  // long-term reserve for the foundation.
  address public foundationWallet;

  // Public presale max cap, in USD. Converted to wei using `weiPerUSDinPresale`
  uint256 public maxPresaleCapUSD = 1000000;

  // TGE min cap, in USD. Converted to wei using `weiPerUSDinTGE`.
  uint256 public minCapUSD = 5000000;

  // Maximun amount from the TGE that the foundation receives, in USD. Converted
  // to wei using `weiPerUSDinTGE`. Funds over this cap go to the MVM.
  uint256 public maxFoundationCapUSD = 10000000;

  // Maximum amount from the TGE that makes the MVM to last for 24 months. If
  // funds from the TGE exceed this amount, the MVM will last for 24 months.
  uint256 public MVM24PeriodsCapUSD = 40000000;

  // Conversion rate from USD to wei to use during the presale.
  uint256 public weiPerUSDinPresale = 0;

  // Conversion rate from USD to wei to use during the TGE.
  uint256 public weiPerUSDinTGE = 0;

  // Seconds before the Presale and the TGE since when the corresponding USD to
  // wei rate cannot be set by the owner anymore.
  uint256 public setWeiLockSeconds = 0;

  // Quantity of Lif that is received in exchange of 1 Ether during the private
  // presale
  uint256 public privatePresaleRate;

  // Quantity of Lif that is received in exchange of 1 Ether during the public
  // presale
  uint256 public publicPresaleRate;

  // Quantity of Lif that is received in exchage of 1 Ether during the first
  // week of the 2 weeks TGE
  uint256 public rate1;

  // Quantity of Lif that is received in exchage of 1 Ether during the second
  // week of the 2 weeks TGE
  uint256 public rate2;

  // Amount of wei received in exchange of tokens during the 2 weeks TGE
  uint256 public weiRaised;

  // Amount of lif minted and transferred during the TGE
  uint256 public tokensSold;

  // Amount of wei received as presale payments (both private and public)
  uint256 public totalPresaleWei;

  // Address of the MVM created at the end of the crowdsale
  address public MVM;

  // Tracks the wei sent per address during the 2 week TGE. This is the amount
  // that can be claimed by each address in case the minimum cap is not reached
  mapping(address => uint256) public purchases;

  // Has the Crowdsale been finalized by a successful call to `finalize`?
  bool public isFinalized = false;

  /**
     @dev Event triggered (at most once) on a successful call to `finalize`
  **/
  event Finalized();

  /**
     @dev Event triggered on every purchase during the public presale and TGE

     @param purchaser who paid for the tokens
     @param beneficiary who got the tokens
     @param value amount of wei paid
     @param amount amount of tokens purchased
   */
  event TokenPurchase(
    address indexed purchaser,
    address indexed beneficiary,
    uint256 value,
    uint256 amount
  );

  /**
     @dev Constructor. Creates the token in a paused state

     @param _publicPresaleStartTimestamp see `publicPresaleStartTimestamp`
     @param _publicPresaleEndTimestamp see `publicPresaleEndTimestamp`
     @param _startTimestamp see `startTimestamp`
     @param _end1Timestamp see `end1Timestamp`
     @param _end2Timestamp see `end2Timestamp
     @param _publicPresaleRate see `publicPresaleRate`
     @param _rate1 see `rate1`
     @param _rate2 see `rate2`
     @param _privatePresaleRate see `privatePresaleRate`
     @param _foundationWallet see `foundationWallet`
   */
  function LifCrowdsale(
    uint256 _publicPresaleStartTimestamp,
    uint256 _publicPresaleEndTimestamp,
    uint256 _startTimestamp,
    uint256 _end1Timestamp,
    uint256 _end2Timestamp,
    uint256 _publicPresaleRate,
    uint256 _rate1,
    uint256 _rate2,
    uint256 _privatePresaleRate,
    uint256 _setWeiLockSeconds,
    address _foundationWallet
  ) {

    require(_publicPresaleStartTimestamp >= block.timestamp);
    require(_publicPresaleEndTimestamp > _publicPresaleStartTimestamp);
    require(_startTimestamp > _publicPresaleEndTimestamp);
    require(_end1Timestamp > _startTimestamp);
    require(_end2Timestamp > _end1Timestamp);
    require(_publicPresaleRate > 0);
    require(_rate1 > 0);
    require(_rate2 > 0);
    require(_setWeiLockSeconds > 0);
    require(_foundationWallet != 0x0);

    token = new LifToken();
    token.pause();

    publicPresaleStartTimestamp = _publicPresaleStartTimestamp;
    publicPresaleEndTimestamp = _publicPresaleEndTimestamp;
    startTimestamp = _startTimestamp;
    end1Timestamp = _end1Timestamp;
    end2Timestamp = _end2Timestamp;
    publicPresaleRate = _publicPresaleRate;
    rate1 = _rate1;
    rate2 = _rate2;
    privatePresaleRate = _privatePresaleRate;
    setWeiLockSeconds = _setWeiLockSeconds;
    foundationWallet = _foundationWallet;
  }

  /**
     @dev Set the wei per USD rate for the public presale. Has to be called by
     the owner up to `setWeiLockSeconds` before `publicPresaleStartTimestamp`

     @param _weiPerUSD wei per USD rate valid during the public presale
  */
  function setWeiPerUSDinPresale(uint256 _weiPerUSD) onlyOwner {
    require(_weiPerUSD > 0);
    assert(block.timestamp < publicPresaleStartTimestamp.sub(setWeiLockSeconds));

    weiPerUSDinPresale = _weiPerUSD;
  }

  /**
     @dev Set the wei per USD rate for the TGE. Has to be called by
     the owner up to `setWeiLockSeconds` before `startTimestamp`

     @param _weiPerUSD wei per USD rate valid during the TGE
   */
  function setWeiPerUSDinTGE(uint256 _weiPerUSD) onlyOwner {
    require(_weiPerUSD > 0);
    assert(block.timestamp < startTimestamp.sub(setWeiLockSeconds));

    weiPerUSDinTGE = _weiPerUSD;
  }

  /**
     @dev Returns the current Lif per Eth rate during the presale and TGE

     @return the current Lif per Eth rate or 0 when not during presale or TGE
   */
  function getRate() public constant returns (uint256) {
    if (block.timestamp < publicPresaleStartTimestamp)
      return 0;
    else if (block.timestamp <= publicPresaleEndTimestamp)
      return publicPresaleRate;
    else if (block.timestamp < startTimestamp)
      return 0;
    else if (block.timestamp <= end1Timestamp)
      return rate1;
    else if (block.timestamp <= end2Timestamp)
      return rate2;
    else
      return 0;
  }

  /**
     @dev Fallback function, payable. Calls `buyTokens` or `buyPresaleTokens`
     depending on the current timestamp
   */
  function () payable {
    if (block.timestamp >= startTimestamp)
      buyTokens(msg.sender);
    else
      buyPresaleTokens(msg.sender);
  }

  /**
     @dev Allows to get tokens during the TGE. Payable. The value is converted to
     Lif using the current rate obtained by calling `getRate()`.

     @param beneficiary Address to which Lif should be sent
   */
  function buyTokens(address beneficiary) payable {
    require(beneficiary != 0x0);
    require(validPurchase());
    assert(weiPerUSDinTGE > 0);

    uint256 weiAmount = msg.value;

    // get current price (it depends on current block number)
    uint256 rate = getRate();

    assert(rate > 0);

    // calculate token amount to be created
    uint256 tokens = weiAmount.mul(rate);

    // store wei amount in case of TGE min cap not reached
    weiRaised = weiRaised.add(weiAmount);
    purchases[beneficiary] = weiAmount;
    tokensSold = tokensSold.add(tokens);

    token.mint(beneficiary, tokens);
    TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);
  }

  /**
     @dev Allows to get tokens during the public presale. The value is converted
     to Lif using the current rate obtained by calling `getRate()`

     @param beneficiary Address to which Lif should be sent
   */
  function buyPresaleTokens(address beneficiary) payable {
    require(beneficiary != 0x0);
    require(validPresalePurchase());
    assert(weiPerUSDinPresale > 0);

    uint256 weiAmount = msg.value;

    // get current price (it depends on current block number)
    uint256 rate = getRate();

    assert(rate > 0);

    // calculate token amount to be created
    uint256 tokens = weiAmount.mul(rate);

    // store how much wei did we receive in presale
    totalPresaleWei = totalPresaleWei.add(weiAmount);

    token.mint(beneficiary, tokens);
    TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);
  }

  /**
     @dev Allows to add the address and the amount of wei sent by a contributor
     in the private presale. Can only be called by the owner before the beginning
     of the public presale

     @param beneficiary Address to which Lif will be sent
     @param weiSent Amount of wei contributed
   */
  function addPrivatePresaleTokens(address beneficiary, uint256 weiSent) onlyOwner {
    require(block.timestamp < publicPresaleStartTimestamp);
    require(beneficiary != address(0));
    require(weiSent > 0);

    uint256 tokens = weiSent.mul(privatePresaleRate);

    totalPresaleWei.add(weiSent);

    token.mint(beneficiary, tokens);
  }

  /**
     @dev Internal. Forwards funds to the foundation wallet and in case the soft
     cap was exceeded it also creates and funds the Market Validation Mechanism.
   */
  function forwardFunds() internal {

    // calculate the max amount of wei for the foundation
    uint256 foundationBalanceCapWei = maxFoundationCapUSD.mul(weiPerUSDinTGE);

    // if the minimiun cap for the MVM is not reached transfer all funds to foundation
    // else if the min cap for the MVM is reached, create it and send the remaining funds
    if (this.balance <= foundationBalanceCapWei) {

      foundationWallet.transfer(this.balance);

    } else {

      uint256 mmFundBalance = this.balance.sub(foundationBalanceCapWei);

      // check how much preiods we have to use on the MVM
      uint8 MVMPeriods = 24;
      if (mmFundBalance > MVM24PeriodsCapUSD.mul(weiPerUSDinTGE))
        MVMPeriods = 48;

      foundationWallet.transfer(foundationBalanceCapWei);

      // TODO: create the MVM with a start block that equals one month after crowdsale ends
      LifMarketValidationMechanism newMVM = new LifMarketValidationMechanism(
        address(token), block.timestamp.add(10), 30 days, MVMPeriods, foundationWallet
      );
      newMVM.fund.value(mmFundBalance)();
      newMVM.transferOwnership(foundationWallet);

      MVM = address(newMVM);

    }
  }

  /**
     @dev Modifier
     @return true if the transaction can buy tokens on TGE
   */
  function validPurchase() internal constant returns (bool) {
    bool withinPeriod = now >= startTimestamp && now <= end2Timestamp;
    bool nonZeroPurchase = msg.value != 0;
    return (withinPeriod && nonZeroPurchase);
  }

  /**
     @dev Modifier
     @return true if the transaction can buy tokens on presale
   */
  function validPresalePurchase() internal constant returns (bool) {
    bool withinPublicPresalePeriod = now >= publicPresaleStartTimestamp && now <= publicPresaleEndTimestamp;
    bool maxPresaleNotReached = totalPresaleWei.add(msg.value) <= maxPresaleCapUSD.mul(weiPerUSDinPresale);
    bool nonZeroPurchase = msg.value != 0;
    return (withinPublicPresalePeriod && maxPresaleNotReached && nonZeroPurchase);
  }

  /**
     @dev Modifier
     @return true if crowdsale event has ended
  */
  function hasEnded() public constant returns (bool) {
    return block.timestamp > end2Timestamp;
  }

  /**
     @dev Modifier
     @return true if minCapUSD has been reached by contributions during the TGE
  */
  function funded() public constant returns (bool) {
    assert(weiPerUSDinTGE > 0);
    return weiRaised >= minCapUSD.mul(weiPerUSDinTGE);
  }

  /**
     @dev Allows a TGE contributor to claim their contributed eth in case the
     TGE has finished without reaching the minCapUSD
   */
  function claimEth() public {
    require(isFinalized);
    require(hasEnded());
    require(!funded());

    uint256 toReturn = purchases[msg.sender];
    assert(toReturn > 0);

    purchases[msg.sender] = 0;

    msg.sender.transfer(toReturn);
  }

  /**
     @dev Finalizes the crowdsale, taking care of transfer of funds to the
     Winding Tree Foundation and creation and funding of the Market Validation
     Mechanism in case the soft cap was exceeded. It also unpauses the token to
     enable transfers. It can be called only once, after `end2Timestamp`
   */
  function finalize() public {
    require(!isFinalized);
    require(hasEnded());

    // TODO: transfer an extra 25% of tokens to the foundation, for the team
    // TODO: transfer 13% to founders with a vesting mechanism?

    // foward founds and unpause token only if minCap is reached
    if (funded()) {

      // finish the minting of the token, unpause it and transfer the ownership to the foundation
      token.finishMinting();
      token.unpause();
      token.transferOwnership(owner);

      forwardFunds();
    }

    Finalized();
    isFinalized = true;
  }

}
