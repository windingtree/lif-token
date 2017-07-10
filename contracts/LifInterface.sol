pragma solidity ^0.4.11;

import 'zeppelin-solidity/contracts/token/ERC20.sol';

/**
 * @title Lif token interface
 */
contract LifInterface is ERC20 {
  uint public maxSupply;
  function approveData(address spender, uint value, bytes data, bool doCall);
  function transferData(address to, uint value, bytes data, bool doCall);
  function transferDataFrom(address from, address to, uint value, bytes data, bool doCall);
  event TransferData(address indexed from, address indexed to, uint256 value, bytes data);
  event ApprovalData(address indexed from, address indexed spender, uint256 value, bytes data);
}
