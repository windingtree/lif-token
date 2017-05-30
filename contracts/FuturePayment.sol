pragma solidity ^0.4.8;

import './zeppelin/token/ERC20Basic.sol';

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

      if ((payee != msg.sender) || (afterBlock > block.number))
        throw;

      ERC20Basic token = ERC20Basic(tokenAddress);

      token.transfer(payee, token.balanceOf(address(this)));

      PaymentDone();
    }

}
