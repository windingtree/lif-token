pragma solidity ^0.4.4;


import "./zeppelin/token/StandardToken.sol";
import "./zeppelin/Ownable.sol";

/*
 * Líf Token
 *
 * Líf is the cryptocurrency of the Winding Tree platform.
 *
 * Líf is an Old Norse feminine noun meaning "life, the life of the body".
 */
contract LifToken is StandardToken, Ownable {

  // Token Name
  string public name = "Líf";

  // Token Symbol
  string public symbol = "LIF";

  // Token decimals
  uint public decimals = 18;
  uint public baseDecimals = 1000000000000000000;

  // Total balance gathered with fees on wei
  uint public feesBalance = 0;

  // Edit of the ERC20 token events to support data argument
  event Transfer(address indexed from, address indexed to, uint value, string data);
  event Approval(address indexed owner, address indexed spender, uint value);

  // Token price in wei unit: 1 ETH = 100 LIF
  uint public tokenPrice = 1000000000000000;

  // Token fee per tranfer: 100 = 1 % fee per transaction with value
  uint public tokenFee = 100;

  // Maximun number of tokens = 10 million
  uint public maxSupply = 10000000*baseDecimals;

  function () payable {
    createTokens(msg.sender);
  }

  function claimFees(address _to) onlyOwner {
    if (_to.send(feesBalance)){
      feesBalance = 0;
    }
  }

  function createTokens(address recipient) payable {
    if (msg.value == 0) throw;

    if (msg.value % tokenPrice != 0) throw;

    uint tokens = safeMul( safeDiv(msg.value, tokenPrice), baseDecimals);

    if (safeAdd(totalSupply, tokens) > maxSupply) throw;

    totalSupply = safeAdd(totalSupply, tokens);
    balances[recipient] = safeAdd(balances[recipient], tokens);
  }

  function setPrice(uint _newPrice) onlyOwner {
    tokenPrice = _newPrice;
  }

  function setFee(uint _newFee) onlyOwner {
    tokenFee = _newFee;
  }

  function transfer(address _to, uint _value, string _data) returns (bool success) {
    if (_value > 0) {
      uint feeInToken = safeDiv(_value, tokenFee);
      uint totalValue = safeSub(_value, feeInToken);
      uint feeInWei = safeMul(feeInToken, tokenPrice);
      balances[msg.sender] = safeSub(balances[msg.sender], _value);
      balances[_to] = safeAdd(balances[_to], totalValue);
      feesBalance = safeAdd(feesBalance, feeInWei);
      totalSupply = safeSub(totalSupply, feeInToken);
    }

    Transfer(msg.sender, _to, _value, _data);
    return true;

  }

  function transferFrom(address _from, address _to, uint _value, string _data) returns (bool success) {
    if (_value > 0) {
      uint _allowance = allowed[_from][msg.sender];
      uint feeInToken = safeDiv(_value, tokenFee);
      uint totalValue = safeSub(_value, feeInToken);
      uint feeInWei = safeMul(feeInToken, tokenPrice);
      balances[_from] = safeSub(balances[_from], _value);
      balances[_to] = safeAdd(balances[_to], totalValue);
      allowed[_from][msg.sender] = safeSub(_allowance, _value);
      feesBalance = safeAdd(feesBalance, feeInWei);
      totalSupply = safeSub(totalSupply, feeInToken);
    }

    Transfer(msg.sender, _to, _value, _data);
    return true;

  }

}
