pragma solidity ^0.4.11;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/payment/PullPayment.sol";
import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import './LifInterface.sol';
import './LifDAOInterface.sol';

/*
 * Líf Token
 *
 * Líf is the cryptocurrency of the Winding Tree platform.
 *
 * Líf is an Old Norse feminine noun meaning "life, the life of the body".
 */


contract LifToken is LifInterface, LifDAOInterface, Ownable, PullPayment {
    using SafeMath for uint;

    // Token Name
    string constant NAME = "Líf";

    // Token Symbol
    string constant SYMBOL = "LIF";

    // Token decimals
    uint constant DECIMALS = 8;
    uint constant LONG_DECIMALS = 10**DECIMALS;

    // The amount of tokens that the owner can issue.
    uint constant OWNER_SUPPLY = 10000000;

    // Proposal fees in wei unit
    uint public baseProposalFee;

    // Maximun number of tokens
    uint public maxSupply;

    // Total supply of tokens
    uint public totalSupply;

    // DAO Proposals to be done
    Proposal[] public proposals;
    uint public totalProposals;

    // Minimun votes needed to create a proposal
    uint public minProposalVotes;

    // DAO Votes
    uint public totalVotes;
    mapping(address => uint) public sentTxVotes;
    mapping(address => uint) public receivedTxVotes;

    //Votes increment
    uint public votesIncrementSent;
    uint public votesIncrementReceived;

    //ERC20 token balances and allowance
    mapping(address => uint) balances;
    mapping (address => mapping (address => uint)) allowed;

    // Transactions
    mapping(address => uint) public txsSent;
    mapping(address => uint) public txsReceived;

    // Contract status
    // 1 = Stoped
    // 2 = Created
    // 3 = Crowdsale
    // 4 = DAO
    uint public status;

    // The amount of blocks that a proposal has to be approved
    uint public proposalBlocksWait;

    // Minimun votes for DAO actions in %
    // An action can be a change o some variable on the contract
    // An action can only be a migration request to another contract
    // An action can also be the request to send ethers to another contract
    // An action can also be the request to call another contract sending specific bytes as arguments
    mapping(address => mapping(bytes4 => uint)) public actionsDAO;

    // Structure of the Proposals
    struct Proposal {
      address target;
      uint id;
      uint value;
      string description;
      uint status; // 0 = Declined, 1 = Accepted, 2 = Active
      uint creationBlock;
      uint maxBlock;
      uint agePerBlock;
      uint votesNeeded;
      bytes actionData;
      uint totalVotes;
      mapping (address => uint) votes; // 0 = Vote not done, 1 = Positive, 2 = Negative.
    }

    // ERC20 Events
    event Transfer(address indexed from, address indexed to, uint value);
    event Approval(address indexed owner, address indexed spender, uint value);

    // Edit of the ERC20 token events to support data argument
    event TransferData(address indexed from, address indexed to, uint value, bytes data);
    event ApprovalData(address indexed from, address indexed spender, uint value, bytes data);

    // Proposal events
    event proposalAdded(uint proposalId);
    event proposalExecuted(uint proposalId);
    event proposalRemoved(uint proposalId);

    // Vote event
    event VoteAdded(uint proposalId);

    // Allow only required status
    modifier onStatus(uint one, uint two) {
      require(((one != 0) && (status == one)) || ((two != 0) && (status == two)));

      _;
    }

    // Dont allow on specified status
    modifier fromSelf() {
      require(msg.sender == address(this));

      _;
    }

    // LifToken constructor
    function LifToken(uint _baseProposalFee, uint _proposalBlocksWait, uint _votesIncrementSent, uint _votesIncrementReceived, uint _minProposalVotes) {

      baseProposalFee = _baseProposalFee;
      proposalBlocksWait = _proposalBlocksWait;
      votesIncrementReceived = _votesIncrementReceived;
      votesIncrementSent = _votesIncrementSent;
      minProposalVotes = _minProposalVotes;

      maxSupply = 0;
      totalProposals = 0;
      status = 2;

      proposals.length ++;

    }

    // Issue more tokens. When called by owner, it cannot make totalSupply to exceed OWNER_SUPPLY
    // Can be called by the DAO on DAO status
    // Can be called by Owner on Created or DAO status
    function issueTokens(uint amount) external {

      require(((msg.sender == address(this)) && (status == 4)) ||
              ((msg.sender == owner) && ((status == 2) || (status == 4))
               && (OWNER_SUPPLY >= maxSupply.add(amount))));

      uint formatedBalance = amount.mul(LONG_DECIMALS);
      balances[address(this)] = balances[address(this)].add(formatedBalance);
      allowed[address(this)][owner] = allowed[address(this)][owner].add(formatedBalance);
      totalSupply = totalSupply.add(amount);
      maxSupply = maxSupply.add(amount);
    }

    // Change contract variable functions
    function setBaseProposalFee(uint _baseProposalFee) fromSelf() onStatus(4,0) returns (bool) {
      baseProposalFee = _baseProposalFee;
      return true;
    }
    function setMinProposalVotes(uint _minProposalVotes) fromSelf() onStatus(4,0) returns (bool) {
      minProposalVotes = _minProposalVotes;
      return true;
    }
    function setProposalBlocksWait(uint _proposalBlocksWait) fromSelf() onStatus(4,0) returns (bool) {
      proposalBlocksWait = _proposalBlocksWait;
      return true;
    }

    // Send Ether with a DAO proposal approval or using owner account
    function sendEther(address to, uint amount) onStatus(4,0) returns (bool) {
      if ((msg.sender == address(this)) || (msg.sender == owner))
        safeSend(to, amount);
      return true;
    }

    // Set new status on the contract
    function setStatus(uint newStatus) {
      if ((msg.sender == address(this)) || (msg.sender == owner))
        status = newStatus;
    }

    //ERC20 token transfer method
    function transfer(address to, uint value) returns (bool) {

      balances[msg.sender] = balances[msg.sender].sub(value);
      balances[to] = balances[to].add(value);
      issueVotes(msg.sender, to);
      Transfer(msg.sender, to, value);

      return(true);

    }

    //ERC20 token transfer method
    function transferFrom(address from, address to, uint value) returns (bool) {
      require(to != address(this));

      uint allowance = allowed[from][msg.sender];
      balances[to] = balances[to].add(value);
      balances[from] = balances[from].sub(value);
      allowed[from][msg.sender] = allowance.sub(value);
      issueVotes(msg.sender, to);
      Transfer(from, to, value);

      return(true);

    }

    //ERC20 token approve method
    function approve(address spender, uint value) returns (bool) {

      require(spender != address(this));

      // To change the approve amount you first have to reduce the addresses`
      //  allowance to zero by calling `approve(spender, 0)` if it is not
      //  already 0 to mitigate the race condition described here:
      //  https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
      require((value == 0) || (allowed[msg.sender][spender] == 0));

      allowed[msg.sender][spender] = value;
      Approval(msg.sender, spender, value);

      return(true);

    }

    //ERC20 token approve method with data call/log option.
    function approveData(address spender, uint value, bytes data) {

      require(spender != address(this));

      allowed[tx.origin][spender] = value;

      if (spender.call(data))
        ApprovalData(tx.origin, spender, value, data);

    }

    // ERC20 transfer method with data call/log option.
    function transferData(address to, uint value, bytes data) {

      require(to != address(this));

      // If transfer have value process it
      if (value > 0) {
        balances[tx.origin] = balances[tx.origin].sub(value);
        balances[to] = balances[to].add(value);
        issueVotes(tx.origin, to);
      }

      if (to.call(data))
        TransferData(tx.origin, to, value, data);

    }

    // ERC20 transferFrom method with data call/log option.
    function transferDataFrom(address from, address to, uint value, bytes data) {

      require(to != address(this));

      // If transfer have value process it
      if (value > 0) {
        uint allowance = allowed[from][tx.origin];
        balances[from] = balances[from].sub(value);
        balances[to] = balances[to].add(value);
        allowed[from][tx.origin] = allowance.sub(value);
        issueVotes(tx.origin, to);
      }

      if (to.call(data))
        TransferData(tx.origin, to, value, data);

    }

    // Create a new proposal
    function newProposal(address target, uint value, string description, uint agePerBlock, bytes4 signature, bytes actionData) onStatus(4,0) payable {

      // Check that action is valid by target and signature
      // Check sender necessary votes
      // Check proposal fee
      require(actionsDAO[target][signature] > 0);
      require(getVotes(msg.sender) >= minProposalVotes);
      require(msg.value >= baseProposalFee);

      // Get the needed votes % for action approval
      uint votesNeeded = divide(totalVotes, 100, 1);
      votesNeeded = votesNeeded.mul(actionsDAO[target][signature]);
      votesNeeded = divide(votesNeeded, 100, 1);

      // If DAOAction exists votesNeeded will be more than cero, proposal is created.
      if (votesNeeded > 0) {
        totalProposals ++;
        uint pos = proposals.length++;
        uint blocksWait = block.number.add(proposalBlocksWait);
        uint senderVotes = getVotes(msg.sender);
        proposals[pos] = Proposal(target, totalProposals, value, description, 2, block.number, blocksWait, agePerBlock, votesNeeded, actionData, senderVotes);
        proposals[pos].votes[msg.sender] = 1;
        proposalAdded(totalProposals);
      }

    }

    // Vote a contract proposal
    function vote(uint proposalID, bool vote) onStatus(3,4) {

      //Get the proposal by proposalID
      Proposal p = proposals[proposalID];

      // Check sender vote and proposal status
      require(p.votes[msg.sender] == 0);
      require(p.status == 2);

      // Add user vote
      if (vote) {
        p.votes[msg.sender] = 1;
        uint senderVotes = getVotes(msg.sender);
        p.totalVotes = p.totalVotes.add(senderVotes);
      } else {
        p.votes[msg.sender] = 2;
      }

      VoteAdded(proposalID);

    }

    // Execute a proposal, only the owner can make this call, the check of the votes is optional because it can ran out of gas.
    function executeProposal(uint proposalID) onStatus(4,0) {

      // Get the proposal using proposalsIndex
      Proposal p = proposals[proposalID];

      // Check proposal age and status
      require(block.number <= p.maxBlock);
      require(p.status == 2);

      // Calculate the needed votes
      uint proposalAge = block.number.sub(p.creationBlock);
      uint ageVotes = 0;
      if (proposalAge > p.agePerBlock)
        ageVotes = proposalAge.div(p.agePerBlock);
      uint votesNeeded = p.votesNeeded.add(ageVotes);

      // See if proposal reached the needed votes
      if (p.totalVotes >= p.votesNeeded) {

        // Change the status of the proposal to accepted
        p.status = 1;

        // Execute proposal call
        if (p.target.call(p.actionData))
          proposalExecuted(proposalID);

      }

    }

    // Remove a proposal if it passed the maxBlock number.
    function removeProposal(uint proposalID) onStatus(4,0) {

      // Get the proposal using proposalsIndex
      Proposal p = proposals[proposalID];

      // require to have reached proposal maxBlock
      require(block.number > p.maxBlock);

      // Change the status of the proposal to declined
      p.status = 0;

      proposalRemoved(proposalID);

    }

    // Add a DAOAction or override ar existing one.
    // Only can be called by the DAO on DAO status or by Owner on Created status
    function addDAOAction(address target, uint votesNeeded, bytes4 signature) public {

      if (((status == 2) && (msg.sender == owner)) || ((status == 4) && (msg.sender == address(this))))
        actionsDAO[target][signature] = votesNeeded;

    }

    //ERC20 token balanceOf method
    function balanceOf(address owner) public constant returns (uint balance) {
      return balances[owner];
    }

    //ERC20 token allowance method
    function allowance(address owner, address spender) public constant returns (uint remaining) {
      return allowed[owner][spender];
    }

    // Get votes needed for a DAO action
    function getActionDAO(address target, bytes4 signature) constant returns (uint) {
      return actionsDAO[target][signature];
    }

    // Get proposals array lenght
    function proposalsLenght() constant returns (uint) {
      return proposals.length;
    }

    // Function to get the total votes of an address
    function getVotes(address voter) constant returns (uint) {
      uint senderVotes = sentTxVotes[voter].add(receivedTxVotes[voter]);
      return senderVotes;
    }

    // INTERNAL FUNCTIONS

    // Divide function with precision
    function divide(uint numerator, uint denominator, uint precision) internal returns (uint) {

      // Check safe-to-multiply here
      uint _numerator = numerator * 10 ** (precision+1);
      // Rounding of last digit
      uint _quotient = ((_numerator / denominator) + 5) / 10;

      return (_quotient);

    }

    // Internal contract function that add votes if necessary sent/receive txs amount is reached
    function issueVotes(address sender, address receiver) internal {

      if ((txsSent[sender] < (votesIncrementSent**sentTxVotes[sender])) && (txsSent[sender].add(1) >= (votesIncrementSent**sentTxVotes[sender]))) {
        sentTxVotes[sender] ++;
        totalVotes ++;
      }
      if ((txsReceived[receiver] < (votesIncrementReceived**receivedTxVotes[receiver])) && (txsReceived[receiver].add(1) >= (votesIncrementReceived**receivedTxVotes[receiver]))) {
        receivedTxVotes[receiver] ++;
        totalVotes ++;
      }

      txsSent[sender] ++;
      txsReceived[receiver] ++;

    }

    function giveVotes(address receiver, uint amount) {
      if (amount == 0){
        sentTxVotes[receiver] = sentTxVotes[receiver].add(sentTxVotes[msg.sender]);
        receivedTxVotes[receiver] = receivedTxVotes[receiver].add(receivedTxVotes[msg.sender]);
        sentTxVotes[msg.sender] = 0;
        receivedTxVotes[msg.sender] = 0;
      } else {
        sentTxVotes[msg.sender] = sentTxVotes[msg.sender].sub(amount);
        receivedTxVotes[msg.sender] = receivedTxVotes[msg.sender].sub(amount);
        sentTxVotes[receiver] = sentTxVotes[receiver].add(amount);
        receivedTxVotes[receiver] = receivedTxVotes[receiver].add(amount);
      }
    }

    // Safe send of ethers to an address, try to use default send function and if dosent succeed it creates an asyncPayment
    function safeSend(address addr, uint amount) internal {
      if (!addr.send(amount))
        asyncSend(addr, amount);
    }

}
