pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "./LifToken.sol";
import "./VestedPayment.sol";
import "./LifMarketValidationMechanism.sol";

/**
   @title Crowdsale for the Lif Token Generation Event

   Implementation of the Lif Token Generation Event (TGE) Crowdsale: A 2 week
   fixed price, uncapped token sale, with a discounted ratefor contributions
   ìn the private presale and a Market Validation Mechanism that will receive
   the funds over the USD 10M soft cap.
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

  // Address of the Winding Tree Founders wallet. An extra 12.8% of tokens
  // are put in a Vested Payment with this address as beneficiary, with 1 year
  // cliff and 4 years duration.
  address public foundersWallet;

  // TGE min cap, in USD. Converted to wei using `weiPerUSDinTGE`.
  uint256 public minCapUSD = 5000000;

  // Maximun amount from the TGE that the foundation receives, in USD. Converted
  // to wei using `weiPerUSDinTGE`. Funds over this cap go to the MVM.
  uint256 public maxFoundationCapUSD = 10000000;

  // Maximum amount from the TGE that makes the MVM to last for 24 months. If
  // funds from the TGE exceed this amount, the MVM will last for 24 months.
  uint256 public MVM24PeriodsCapUSD = 40000000;

  // Conversion rate from USD to wei to use during the TGE.
  uint256 public weiPerUSDinTGE = 0;

  // Seconds before the TGE since when the corresponding USD to
  // wei rate cannot be set by the owner anymore.
  uint256 public setWeiLockSeconds = 0;

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

  // Amount of wei received as private presale payments
  uint256 public totalPresaleWei;

  // Address of the vesting schedule for the foundation created at the
  // end of the crowdsale
  VestedPayment public foundationVestedPayment;

  // Address of the vesting schedule for founders created at the
  // end of the crowdsale
  VestedPayment public foundersVestedPayment;

  // Address of the MVM created at the end of the crowdsale
  LifMarketValidationMechanism public MVM;

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
     @dev Event triggered every time a presale purchase is done
  **/
  event TokenPresalePurchase(address indexed beneficiary, uint256 weiAmount, uint256 rate);

  /**
     @dev Event triggered on every purchase during the TGE

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

     @param _startTimestamp see `startTimestamp`
     @param _end1Timestamp see `end1Timestamp`
     @param _end2Timestamp see `end2Timestamp
     @param _rate1 see `rate1`
     @param _rate2 see `rate2`
     @param _foundationWallet see `foundationWallet`
   */
  function LifCrowdsale(
    uint256 _startTimestamp,
    uint256 _end1Timestamp,
    uint256 _end2Timestamp,
    uint256 _rate1,
    uint256 _rate2,
    uint256 _setWeiLockSeconds,
    address _foundationWallet,
    address _foundersWallet
  ) {

    require(_startTimestamp > block.timestamp);
    require(_end1Timestamp > _startTimestamp);
    require(_end2Timestamp > _end1Timestamp);
    require(_rate1 > 0);
    require(_rate2 > 0);
    require(_setWeiLockSeconds > 0);
    require(_foundationWallet != address(0));
    require(_foundersWallet != address(0));

    token = new LifToken();
    token.pause();

    startTimestamp = _startTimestamp;
    end1Timestamp = _end1Timestamp;
    end2Timestamp = _end2Timestamp;
    rate1 = _rate1;
    rate2 = _rate2;
    setWeiLockSeconds = _setWeiLockSeconds;
    foundationWallet = _foundationWallet;
    foundersWallet = _foundersWallet;
  }

  /**
     @dev Set the wei per USD rate for the TGE. Has to be called by
     the owner up to `setWeiLockSeconds` before `startTimestamp`

     @param _weiPerUSD wei per USD rate valid during the TGE
   */
  function setWeiPerUSDinTGE(uint256 _weiPerUSD) public onlyOwner {
    require(_weiPerUSD > 0);
    assert(block.timestamp < startTimestamp.sub(setWeiLockSeconds));

    weiPerUSDinTGE = _weiPerUSD;
  }

  /**
     @dev Returns the current Lif per Eth rate during the TGE

     @return the current Lif per Eth rate or 0 when not in TGE
   */
  function getRate() public view returns (uint256) {
    if (block.timestamp < startTimestamp)
      return 0;
    else if (block.timestamp <= end1Timestamp)
      return rate1;
    else if (block.timestamp <= end2Timestamp)
      return rate2;
    else
      return 0;
  }

  /**
     @dev Fallback function, payable. Calls `buyTokens`
   */
  function () payable {
    buyTokens(msg.sender);
  }

  /**
     @dev Allows to get tokens during the TGE. Payable. The value is converted to
     Lif using the current rate obtained by calling `getRate()`.

     @param beneficiary Address to which Lif should be sent
   */
  function buyTokens(address beneficiary) public payable whenNotPaused validPurchase {
    require(beneficiary != address(0));
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
     @dev Allows to add the address and the amount of wei sent by a contributor
     in the private presale. Can only be called by the owner before the beginning
     of TGE

     @param beneficiary Address to which Lif will be sent
     @param weiSent Amount of wei contributed
     @param rate Lif per ether rate at the moment of the contribution
   */
  function addPrivatePresaleTokens(
    address beneficiary, uint256 weiSent, uint256 rate
  ) public onlyOwner {
    require(block.timestamp < startTimestamp);
    require(beneficiary != address(0));
    require(weiSent > 0);

    // validate that rate is higher than TGE rate
    require(rate > rate1);

    uint256 tokens = weiSent.mul(rate);

    totalPresaleWei = totalPresaleWei.add(weiSent);

    token.mint(beneficiary, tokens);

    TokenPresalePurchase(beneficiary, weiSent, rate);
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
    if (weiRaised <= foundationBalanceCapWei) {

      foundationWallet.transfer(this.balance);

      mintExtraTokens(uint256(24));

    } else {

      uint256 mmFundBalance = this.balance.sub(foundationBalanceCapWei);

      // check how much preiods we have to use on the MVM
      uint8 MVMPeriods = 24;
      if (mmFundBalance > MVM24PeriodsCapUSD.mul(weiPerUSDinTGE))
        MVMPeriods = 48;

      foundationWallet.transfer(foundationBalanceCapWei);

      MVM = new LifMarketValidationMechanism(
        address(token), block.timestamp.add(30 days), 30 days, MVMPeriods, foundationWallet
      );
      MVM.calculateDistributionPeriods();

      mintExtraTokens(uint256(MVMPeriods));

      MVM.fund.value(mmFundBalance)();
      MVM.transferOwnership(foundationWallet);

    }
  }

  /**
     @dev Internal. Distribute extra tokens among founders,
     team and the foundation long-term reserve. Founders receive
     12.8% of tokens in a 4y (1y cliff) vesting schedule.
     Foundation long-term reserve receives 5% of tokens in a
     vesting schedule with the same duration as the MVM that
     starts when the MVM ends. An extra 7.2% is transferred to
     the foundation to be distributed among advisors and future hires
   */
  function mintExtraTokens(uint256 foundationMonthsStart) internal {
    // calculate how much tokens will the founders,
    // foundation and advisors will receive
    uint256 foundersTokens = token.totalSupply().mul(128).div(1000);
    uint256 foundationTokens = token.totalSupply().mul(50).div(1000);
    uint256 teamTokens = token.totalSupply().mul(72).div(1000);

    // create the vested payment schedule for the founders
    foundersVestedPayment = new VestedPayment(
      block.timestamp, 30 days, 48, 12, foundersTokens, token
    );
    token.mint(foundersVestedPayment, foundersTokens);
    foundersVestedPayment.transferOwnership(foundersWallet);

    // create the vested payment schedule for the foundation
    uint256 foundationPaymentStart = foundationMonthsStart.mul(30 days);
    foundationVestedPayment = new VestedPayment(
      block.timestamp.add(foundationPaymentStart), 30 days,
      foundationMonthsStart, 0, foundationTokens, token
    );
    token.mint(foundationVestedPayment, foundationTokens);
    foundationVestedPayment.transferOwnership(foundationWallet);

    // transfer the token for advisors and future employees to the foundation
    token.mint(foundationWallet, teamTokens);

  }

  /**
     @dev Modifier
     ok if the transaction can buy tokens on TGE
   */
  modifier validPurchase() {
    bool withinPeriod = now >= startTimestamp && now <= end2Timestamp;
    bool nonZeroPurchase = msg.value != 0;
    assert(withinPeriod && nonZeroPurchase);
    _;
  }

  /**
     @dev Modifier
     ok when block.timestamp is past end2Timestamp
  */
  modifier hasEnded() {
    assert(block.timestamp > end2Timestamp);
    _;
  }

  /**
     @dev Modifier
     @return true if minCapUSD has been reached by contributions during the TGE
  */
  function funded() public view returns (bool) {
    assert(weiPerUSDinTGE > 0);
    return weiRaised >= minCapUSD.mul(weiPerUSDinTGE);
  }

  /**
     @dev Allows a TGE contributor to claim their contributed eth in case the
     TGE has finished without reaching the minCapUSD
   */
  function claimEth() public whenNotPaused hasEnded {
    require(isFinalized);
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
  function finalize() public whenNotPaused hasEnded {
    require(!isFinalized);

    // foward founds and unpause token only if minCap is reached
    if (funded()) {

      forwardFunds();

      // finish the minting of the token and unpause it
      token.finishMinting();
      token.unpause();

      // transfer the ownership of the token to the foundation
      token.transferOwnership(owner);

    }

    Finalized();
    isFinalized = true;
  }

}
