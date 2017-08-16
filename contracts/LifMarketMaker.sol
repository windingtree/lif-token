pragma solidity ^0.4.13;

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "./LifToken.sol";

contract LifMarketMaker {
  using SafeMath for uint256;

  // The Lif token contract
  LifToken public lifToken;

  // The address of teh foundation taht can claim the ETH
  address public foundationAddr;

  // The wei gained by buying/selling lif
  uint256 weiRaised;

  // Start and end block variables
  uint256 public startBlock;
  uint256 public endBlock;
  uint256 public totalBlocks;

  uint256 public lastBlockPayment;
  uint256 public paymentBlockRange;

  bool public isFinalized = false;

  event Finalized();
  event Created();

  function LifMarketMaker(
    address lifAddr,
    uint256 _startBlock,
    uint256 _endBlock,
    uint256 totalPayments,
    address _foundationAddr
  ) {
    lifToken = LifToken(lifAddr);
    startBlock = _startBlock;
    endBlock = _endBlock;
    totalBlocks = _endBlock.sub(startBlock);
    paymentBlockRange = totalBlocks.div(totalPayments);
    foundationAddr = _foundationAddr;
    Created();
  }

  modifier notFinalized() {
    if (!isFinalized)
      _;
  }

  function getSellRate() public constant returns (uint256) {

    // LIF Total Supply / MM balance

    uint256 totalSupply = lifToken.totalSupply();

    uint256 mmWei = this.balance.sub(weiAvaliable(block.number));

    return totalSupply.div(mmWei);

  }

  function getBuyRate() public constant returns (uint256 rate) {

    // Calculate the buy rate

    uint256 mmBlocks = block.number.sub(startBlock);

    uint256 rate = mmBlocks ** 2;

  }

  function weiAvaliable(uint256 onBlock) internal returns (uint256) {

    // Calculate the wei that can be claimed by the foundation on an specific block

  }

  function buyLif() notFinalized payable {

    require(msg.value > 0);

    uint256 lifBalance = lifToken.balanceOf(address(this));

    uint256 rate = getBuyRate();

    uint256 amount = msg.value.mul(rate);

    require(amount <= lifBalance);

    lifToken.transfer(msg.sender, amount);

  }

  function sellLif(uint256 amount) notFinalized {

    uint256 allowance = lifToken.allowance(msg.sender);

    require(amount <= allowance);

    lifToken.transferFrom(msg.sender, address(this));

    uint256 rate = getSellRate();

    uint256 totalWei = amount.mul(rate);

    msg.sender.transfer(totalWei);

  }

  function withdrawFunds() {

    uint256 nextBlockPayment = lastBlockPayment.add(paymentBlockRange);

    require(block.number > nextBlockPayment);
    require(block.number < nextBlockPayment.add(1000));
    require(msg.sender == foundationAddr);

    uint256 available = weiAvaliable(nextBlockPayment);

    foundationAddr.transfer(available);
    lastBlockPayment = nextBlockPayment;
  }

  function finalize() {

    require(block.number > endBlock);

    lifToken.transfer(lifBalance, foundationAddr);
    foundationAddr.transfer(this.balance);
    isFinalized = true;

    Finalized();
  }

}
