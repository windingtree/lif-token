pragma solidity ^0.4.11;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/payment/PullPayment.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "./LifInterface.sol";
import "./FuturePayment.sol";
import "./LifDAOInterface.sol";

/*
 * Líf Crowdsale
 *
 *
 *
 *
 */


contract LifCrowdsale is Ownable, PullPayment {
    using SafeMath for uint;

    // Crowdsale status
    // 1 = Stopped
    // 2 = Created
    // 3 = Finished
    uint public status;

    // TODO: can we just read the constant from the token?
    uint constant DECIMALS = 8;
    uint constant LONG_DECIMALS = 10**DECIMALS;

    address tokenAddress;
    uint startBlock;
    uint endBlock;
    uint public startPrice;
    uint public changePerBlock;
    uint public changePrice;
    uint public minCap;
    uint public maxCap;
    uint public totalTokens;
    uint public presaleBonusRate;
    uint public ownerPercentage;
    uint public totalPresaleWei;
    uint public weiRaised;
    uint public tokensSold;
    uint public lastPrice;
    mapping (address => uint) weiPayed;
    mapping (address => uint) tokens;
    mapping (address => uint) presalePayments;

    address[] public foundersFuturePayments;

    // Allow only certain status
    modifier onStatus(uint one, uint two) {
      require(((one != 0) && (status == one)) || ((two != 0) && (status == two)));
      _;
    }

    // Constructor
    function LifCrowdsale(address _tokenAddress, uint _startBlock, uint _endBlock,
                          uint _startPrice, uint _changePerBlock, uint _changePrice,
                          uint _minCap, uint _maxCap, uint _totalTokens,
                          uint _presaleBonusRate, uint _ownerPercentage) {
      tokenAddress = _tokenAddress;
      startBlock = _startBlock;
      endBlock = _endBlock;
      startPrice = _startPrice;
      changePerBlock = _changePerBlock;
      changePrice = _changePrice;
      minCap = _minCap;
      maxCap = _maxCap;
      totalTokens = _totalTokens;
      presaleBonusRate = _presaleBonusRate;
      ownerPercentage = _ownerPercentage;
      status = 1;
    }

    // Change a crowdsale before it begins
    // Can be called by Owner on created, stopped or finished status
    function edit(uint _startBlock, uint _endBlock, uint _startPrice, uint _changePerBlock, uint _changePrice, uint _minCap, uint _maxCap, uint _totalTokens, uint _ownerPercentage) external {

      // TODO: only edit in certain status
      require((msg.sender == owner) && ((status == 1) || (status == 2)));
      require(block.number < startBlock);

      startBlock = _startBlock;
      endBlock = _endBlock;
      startPrice = _startPrice;
      changePerBlock = _changePerBlock;
      changePrice = _changePrice;
      minCap = _minCap;
      maxCap = _maxCap;
      ownerPercentage = _ownerPercentage;
      totalTokens = _totalTokens;
    }

    // calculates absolute max tokens that can be distributed from the crowdsale, including bids,
    // founders vesting compensation and presale payments
    function getMaxTokens() public returns (uint) {
      uint minTokenPrice = minCap.div(totalTokens);
      uint maxWithBonusTokens = totalPresaleWei.div(minTokenPrice).mul(presaleBonusRate.add(100).div(100));
      uint maxFoundersTokens = maxWithBonusTokens.mul(ownerPercentage).div(1000);

      return totalTokens + maxWithBonusTokens + maxFoundersTokens;
    }

    // Add an address that would be able to spend certain amounts of ethers with a bonus rate
    function addPresalePayment(address target, uint amount) external onlyOwner() onStatus(1,2) {

      require(presaleBonusRate > 0);

      totalPresaleWei = totalPresaleWei.add(amount);
      presalePayments[target] = amount;

      // check that crowdsale balance is AT LEAST max(with bonus)tokens at lowest possible valuation +
      // founders tokens
      uint crowdsaleBalance = LifInterface(tokenAddress).balanceOf(address(this)).div(LONG_DECIMALS);

      assert(crowdsaleBalance >= getMaxTokens());
    }

    function getBuyerPresaleTokens(address buyer) public returns (uint) {
        return presalePayments[buyer].
            mul(uint(100).add(presaleBonusRate)).
            div(lastPrice).
            div(uint(100));
    }

    function distributeTokens(address buyer, bool withBonus) external onStatus(3, 0) {

      if (withBonus){

        require(presalePayments[buyer] > 0);

        uint tokensQty = getBuyerPresaleTokens(buyer);

        tokensSold = tokensSold.add(tokensQty);

        LifInterface(tokenAddress).transfer(buyer, tokensQty.mul(LONG_DECIMALS));

        totalPresaleWei = totalPresaleWei.sub(presalePayments[buyer]);
        presalePayments[buyer] = 0;

      } else {

        require(tokens[buyer] > 0);

        uint weiChange = weiPayed[buyer].sub(tokens[buyer].mul(lastPrice));

        if (weiChange > 0){
          safeSend(buyer, weiChange);
        }

        LifInterface(tokenAddress).transfer(buyer, tokens[buyer].mul(LONG_DECIMALS));

        weiPayed[buyer] = 0;
        tokens[buyer] = 0;
      }

    }

    // Get the token price at the current block
    function getPrice() public constant returns (uint) {

      uint price = 0;

      if ((block.number >= startBlock) && (block.number <= endBlock)) {
        price = startPrice.sub(
          block.number.sub(startBlock).div(changePerBlock).mul(changePrice)
        );
      }

      return price;
    }

    function getPresaleTokens(uint tokenPrice) public returns(uint) {
      if (presaleBonusRate > 0){
        // Calculate how much presale tokens would be distributed at this price
        return totalPresaleWei.
            mul(uint(100).add(presaleBonusRate)).
            div(tokenPrice).
            div(uint(100));
      } else {
        return 0;
      }
    }

    // Creates a bid spending the ethers send by msg.sender.
    function submitBid() external payable onStatus(2,0) {

      require(msg.value > 0);

      uint tokenPrice = getPrice();

      assert(tokenPrice > 0);

      // Calculate the total cost in wei of buying the tokens.
      uint tokensQty = msg.value.div(tokenPrice);
      uint weiCost = tokensQty.mul(tokenPrice);
      uint weiChange = msg.value.sub(weiCost);

      uint presaleTokens = getPresaleTokens(tokenPrice);

      // previous bids tokens + presaleTokens + current bid tokens should not exceed totalTokens
      require(tokensSold.add(presaleTokens).add(tokensQty) <= totalTokens);

      if (weiRaised.add(weiCost) > maxCap)
        throw;

      //
      // bid is accepted from here
      //

      // asynchronously send weiChange if any
      if (weiChange > 0)
        safeSend(msg.sender, weiChange);

      lastPrice = tokenPrice;
      weiPayed[msg.sender] = weiCost;
      tokens[msg.sender] = tokensQty;
      weiRaised = weiRaised.add(weiCost);
      tokensSold = tokensSold.add(tokensQty);
    }

    // See if the status of the crowdsale can be changed
    function checkCrowdsale() external onStatus(2,0) {

      require(block.number > endBlock);

      status = 3; // Finished
      if (weiRaised >= minCap) {
        uint presaleTokens = getPresaleTokens(lastPrice);
        uint foundingTeamTokens = 0;

        if (ownerPercentage > 0) {
          foundingTeamTokens = presaleTokens.add(tokensSold).
                                             mul(ownerPercentage).
                                             mul(LONG_DECIMALS).
                                             div(1000);

          for (uint i = block.number.add(5); i <= block.number.add(40); i = i.add(5)) {
            address futurePayment = new FuturePayment(owner, i, tokenAddress);

            LifInterface(tokenAddress).transfer(futurePayment, foundingTeamTokens.div(8));

            foundersFuturePayments[foundersFuturePayments.length ++] = address(futurePayment);
          }
          /*
          this values would be use on the final version, making payments every 6 months for 4 years, starting 1 year after token deployment.
          for (uint i = block.add(umber, 2102400); i <= block.add(umber, 6307200); i = i,.add(25600))
            futurePayments[futurePayments.length ++] = FuturePayment(owner, i, foundingTeamTokens.div(8));
          */

          ownerPercentage = 0;
        }
        // Return not used tokens to LifToken
        uint toReturnTokens = LifInterface(tokenAddress).balanceOf(address(this)).
            sub(presaleTokens.mul(LONG_DECIMALS)).sub(tokensSold.mul(LONG_DECIMALS));

        LifInterface(tokenAddress).transfer(tokenAddress, toReturnTokens);

      } else if (weiRaised < minCap) {
        // return all tokens
        LifInterface(tokenAddress).transfer(tokenAddress, totalTokens);
      }

    }

    function transferVotes() external onlyOwner() {
      LifDAOInterface(tokenAddress).giveVotes(owner, 0);
    }

    // Function that allows a buyer to claim the ether back of a failed crowdsale
    function claimEth(uint stage) external onStatus(3,0) {

      require(block.number > endBlock);
      require(weiRaised < minCap);
      require(weiPayed[msg.sender] > 0);

      safeSend(msg.sender, weiPayed[msg.sender]);
    }

    // Set new status on the Crowdsale
    function setStatus(uint newStatus) {
      if ((msg.sender == address(this)) || (msg.sender == owner))
        status = newStatus;
    }

    // Safe send of ethers to an address, try to use default send function and if dosent succeed it creates an asyncPayment
    function safeSend(address addr, uint amount) internal {
      if (!addr.send(amount))
        asyncSend(addr, amount);
    }

}
