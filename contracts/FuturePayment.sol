pragma solidity ^0.4.11;

import './LifInterface.sol';

contract FuturePayment {

    // Represents a token payment that can be claimed after certain block from an address
    address public payee;
    uint public afterBlock;
    address public tokenAddress;

    event PaymentDone();

    function FuturePayment(address _payee, uint _afterBlock, address _tokenAddress) {
        payee = _payee;
        afterBlock = _afterBlock;
        tokenAddress = _tokenAddress;
    }

    // Function that allows an address to claim a futurePayment on tokens
    function claimPayment() external {

      require(payee == msg.sender);
      require(block.number >= afterBlock);

      LifInterface lifToken = LifInterface(tokenAddress);

      lifToken.transfer(payee, lifToken.balanceOf(address(this)));

      PaymentDone();
    }

}
