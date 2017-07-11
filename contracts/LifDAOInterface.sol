pragma solidity ^0.4.11;

/**
 * @title Lif token interface
 */
contract LifDAOInterface {
  uint public totalVotes;
  function newProposal(address target, uint value, string description, uint agePerBlock, bytes4 signature, bytes actionData) payable;
  function vote(uint proposalID, bool vote);
  function executeProposal(uint proposalID);
  function removeProposal(uint proposalID);
  function giveVotes(address receiver, uint amount);
  function getActionDAO(address target, bytes4 signature) constant returns (uint);
  function proposalsLenght() constant returns (uint);
  function getVotes(address voter) constant returns (uint);
  event proposalAdded(uint proposalId);
  event proposalExecuted(uint proposalId);
  event proposalRemoved(uint proposalId);
  event VoteAdded(uint proposalId);
}
