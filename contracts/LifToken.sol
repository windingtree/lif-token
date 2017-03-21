pragma solidity ^0.4.8;

import "./zeppelin/token/StandardToken.sol";
import "./zeppelin/Ownable.sol";

/*
 * Líf Token
 *
 * Líf is the cryptocurrency of the Winding Tree platform.
 *
 * Líf is an Old Norse feminine noun meaning "life, the life of the body".
 */

contract LifToken is Ownable, StandardToken {

    // Token Name
    string constant NAME = "Líf";

    // Token Symbol
    string constant SYMBOL = "LIF";

    // Token decimals
    uint constant DECIMALS = 8;
    uint constant LIF_DECIMALS = 100000000;

    // Token price in Wei unit
    uint public tokenPrice;

    // Proposal fees in wei unit
    uint public baseProposalFee;

    // Maximun number of tokens
    uint public maxSupply;

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

    // Transactions
    mapping(address => uint) public txsSent;
    mapping(address => uint) public txsReceived;

    // Contract status
    // 0 = Stoped
    // 1 = Crowdsale
    // 2 = DAO
    // 3 = Migrating
    uint public status;

    // The amount of blocks that a proposal has to be approved
    uint public proposalBlocksWait;

    // Minimun votes for DAO actions in %
    // An action can be a change o some variable on the contract
    // An action can only be a migration request to another contract
    // An action can also be the request to send ethers to another contract
    // An action can also be the request to call another contract sending specific bytes as arguments
    DAOAction[] public DAOActions;

    // Structure of the DAOActions
    struct DAOAction {
        address target;
        uint votesNeeded;
        bytes4 signature;
    }

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

    // Edit of the ERC20 token events to support data argument
    event LifTransfer(address indexed from, address indexed to, uint value, string data);
    event LifApproval(address indexed owner, address indexed spender, uint value);

    // Proposal events
    event proposalAdded(uint proposalId);
    event proposalExecuted(uint proposalId);
    event proposalRemoved(uint proposalId);

    // Vote event
    event VoteAdded(uint proposalId);

    // Change token variables Message
    event Message(string message);

    // Allow only token holders
    modifier onlyTokenHolder {
        if (balances[msg.sender] > 0) _;
    }

    // Allow only required status
    modifier onStatus(uint _status) {
        if (status == _status) _;
    }

    // Dont allow on specified status
    modifier notOnStatus(uint _status) {
        if (status != _status) _;
    }

    // Dont allow on specified status
    modifier fromDAO() {
        if (msg.sender == address(this)) _;
    }

    // LifToken constructor
    function LifToken(uint _baseProposalFee, uint _maxSupply, uint _proposalBlocksWait, uint _votesIncrementSent, uint _votesIncrementReceived, uint _minProposalVotes) {

        baseProposalFee = _baseProposalFee;
        maxSupply = _maxSupply;
        proposalBlocksWait = _proposalBlocksWait;
        votesIncrementReceived = _votesIncrementReceived;
        votesIncrementSent = _votesIncrementSent;
        minProposalVotes = _minProposalVotes;

        totalProposals = 0;
        status = 0;

        proposals.length ++;
        DAOActions.length ++;

    }

    function startCrowdSale(uint _tokenPrice) {

        tokenPrice = _tokenPrice;
        status = 1;

    }

    // Create tokens for the recipient
    function createTokens(address recipient, uint _tokens) payable onStatus(1) {

        if (msg.value == 0) throw;

        if (getPrice(_tokens) > msg.value) throw;

        uint _value = safeMul(_tokens, LIF_DECIMALS);

        if (safeAdd(totalSupply, _value) > safeMul(maxSupply, LIF_DECIMALS)) throw;

        totalSupply = safeAdd(totalSupply, _value);
        balances[recipient] = safeAdd(balances[recipient], _value);

    }

    function setPrice(uint _tokenPrice) onlyOwner() returns (bool) {
        tokenPrice = _tokenPrice;
        Message('Price changed');
        return true;
    }
    function getPrice(uint _tokens) constant returns (uint) {
        return safeMul(_tokens, tokenPrice);
    }

    // Change contract variable functions
    function setBaseProposalFee(uint _baseProposalFee) fromDAO() onStatus(2) returns (bool) {
        baseProposalFee = _baseProposalFee;
        Message('Base proposal fee changed');
        return true;
    }
    function setMinProposalVotes(uint _minProposalVotes) fromDAO() onStatus(2) returns (bool) {
        minProposalVotes = _minProposalVotes;
        Message('Min proposal votes changed');
        return true;
    }
    function setProposalBlocksWait(uint _proposalBlocksWait) fromDAO() onStatus(2) returns (bool) {
        proposalBlocksWait = _proposalBlocksWait;
        Message('Proposal blocks wait changed');
        return true;
    }

    // Send Ether with a DAO proposal approval
    function sendEther(address _to, uint _amount) fromDAO() onStatus(2) returns (bool) {
        if (_to.send(_amount)){
          return true;
        } else {
          return false;
        }
    }

    // Set new status on the contract
    function setStatus(uint _newStatus) fromDAO() {
        status = _newStatus;
    }

    // Transfer token between users
    function transfer(address _to, uint _value, string _data) onlyTokenHolder() onStatus(2) returns (bool success) {

        // If transfer have value process it
        if (_value > 0) {
            balances[msg.sender] = safeSub(balances[msg.sender], _value);
            balances[_to] = safeAdd(balances[_to], _value);
            if ((txsSent[msg.sender] < (votesIncrementSent**sentTxVotes[msg.sender])) && (safeAdd(txsSent[msg.sender],1) >= (votesIncrementSent**sentTxVotes[msg.sender]))){
              sentTxVotes[msg.sender] ++;
              totalVotes ++;
            }
            if ((txsReceived[_to] < (votesIncrementReceived**receivedTxVotes[_to])) && (safeAdd(txsReceived[_to],1) >= (votesIncrementReceived**receivedTxVotes[_to]))){
              receivedTxVotes[_to] ++;
              totalVotes ++;
            }
            txsSent[msg.sender] ++;
            txsReceived[_to] ++;
        }

        LifTransfer(msg.sender, _to, _value, _data);

    }

    // Transfer allowed tokens between users
    function transferFrom(address _from, address _to, uint _value, string _data) onStatus(2) returns (bool success) {

        // If transfer have value process it
        if (_value > 0) {
            uint _allowance = allowed[_from][msg.sender];
            balances[_from] = safeSub(balances[_from], _value);
            balances[_to] = safeAdd(balances[_to], _value);
            allowed[_from][msg.sender] = safeSub(_allowance, _value);
            if ((txsSent[msg.sender] < (votesIncrementSent**sentTxVotes[msg.sender])) && (safeAdd(txsSent[msg.sender],1) >= (votesIncrementSent**sentTxVotes[msg.sender]))){
              sentTxVotes[msg.sender] ++;
              totalVotes ++;
            }
            if ((txsReceived[_to] < (votesIncrementReceived**receivedTxVotes[_to])) && (safeAdd(txsReceived[_to],1) >= (votesIncrementReceived**receivedTxVotes[_to]))){
              receivedTxVotes[_to] ++;
              totalVotes ++;
            }
            txsSent[msg.sender] ++;
            txsReceived[_to] ++;
        }

        LifTransfer(msg.sender, _to, _value, _data);

        return true;

    }

    // Create a new proposal
    function newProposal( address _target, uint _value, string _description, uint _agePerBlock, bytes4 _signature, bytes _actionData ) payable onlyTokenHolder() returns (bool success) {

        // Check sender necessary votes
        if (getVotes(msg.sender) < minProposalVotes) throw;

        // Check proposal fee
        if (msg.value < baseProposalFee) throw;

        totalProposals ++;
        uint _id = totalProposals;

        // Get the needed votes % for action approval
        uint votesNeeded = 0;

        for (uint i = 1; i < DAOActions.length; i ++)
            if ((DAOActions[i].target == _target) && (compareSignature(DAOActions[i].signature, _signature))){
                uint votesPercentage = divide(totalVotes, 100, 1);
                votesNeeded = divide( safeMul(votesPercentage, DAOActions[i].votesNeeded) , 100, 1);
            }

        // If DAOAction exists votesNeeded will be more than cero, proposal is created.
        if (votesNeeded > 0) {
            uint pos = proposals.length++;
            uint _blocksWait = safeAdd(block.number, proposalBlocksWait);
            uint senderVotes = getVotes(msg.sender);
            proposals[pos] = Proposal(_target, _id, _value, _description, 2, block.number, _blocksWait, _agePerBlock, votesNeeded, _actionData, senderVotes);
            proposals[pos].votes[msg.sender] = 1;
            proposalAdded(_id);
        }

        return true;

    }

    // Vote a contract proposal
    function vote( uint _proposalID, bool _vote ) onlyTokenHolder() onStatus(2) returns (bool) {

        //Get the proposal by proposalID
        Proposal p = proposals[_proposalID];

        // If user already voted throw error
        if (p.votes[msg.sender] > 0) throw;

        // If proposal is not active throw error
        if (p.status != 2) throw;

        // Add user vote
        if (_vote){
            p.votes[msg.sender] = 1;
            uint senderVotes = getVotes(msg.sender);
            p.totalVotes = safeAdd(p.totalVotes, senderVotes);
        } else {
            p.votes[msg.sender] = 2;
        }

        VoteAdded(_proposalID);

        return true;

    }

    // Execute a proporal, only the owner can make this call, the check of the votes is optional because it can ran out of gas.
    function executeProposal(uint _proposalID) onlyTokenHolder() onStatus(2) returns (bool success){

        // Get the proposal using proposalsIndex
        Proposal p = proposals[_proposalID];

        // If proposal reach maxBlocksWait throw.
        if (p.maxBlock < block.number) throw;

        // If proposal is not active throw.
        if (p.status != 2) throw;

        // Calculate the needed votes
        uint proposalAge = safeSub(block.number, p.creationBlock);
        uint ageVotes = 0;
        if (proposalAge > p.agePerBlock)
            ageVotes = safeDiv(proposalAge, p.agePerBlock);
        uint votesNeeded = safeAdd(p.votesNeeded, ageVotes);

        // See if proposal reached the needed votes
        if (p.totalVotes <= p.votesNeeded){
            return false;
        } else {

          // Change the status of the proposal to accepted
          p.status = 1;

          if (p.target.call(p.actionData))
              return true;
          else
              return false;

        }

    }

    // Execute a proporal, only the owner can make this call.
    function removeProposal(uint _proposalID) onlyTokenHolder() onStatus(2) returns (bool success){

        // Get the proposal using proposalsIndex
        Proposal p = proposals[_proposalID];

        // If proposal didnt reach maxBlocksWait throw.
        if (p.maxBlock > block.number) throw;

        // Change the status of the proposal to declined
        p.status = 0;

        return true;

    }

    // Functions to edit, add and remove DAOActions
    function changeDaoAction(address _target, uint _votesNeeded, bytes4 _signature) fromDAO() onStatus(2) returns (bool){

        for (uint i = 1; i < DAOActions.length; i ++)
            if ((DAOActions[i].target == _target) && (compareSignature(DAOActions[i].signature, _signature))){
                DAOActions[i].votesNeeded = _votesNeeded;
                return true;
            }

        return false;

    }
    function removeDAOAction(address _target, bytes4 _signature) fromDAO() onStatus(2) returns (bool){

        for (uint i = 1; i < DAOActions.length; i ++)
            if ((DAOActions[i].target == _target) && (compareSignature(DAOActions[i].signature, _signature))){
                delete DAOActions[i];
                return true;
            }

        return false;

    }
    function addDAOAction(address _target, uint _votesNeeded, bytes4 _signature) fromDAO() returns (bool){

        if (((status == 0) && (msg.sender == owner)) || (status == 2)) throw;

        uint pos = DAOActions.length ++;
        DAOActions[pos] = DAOAction(_target, _votesNeeded, _signature);

        return true;
    }

    // Get DAOActions array lenght
    function DAOActionsLength() external constant returns (uint){
        return DAOActions.length;
    }

    // Get proposals array lenght
    function ProposalsLenght() external constant returns (uint){
        return proposals.length;
    }

    // As soon after the contract is created the deployer can set the DAOActions using buildMinVotes
    // Once the min votes are all configured the deployer can start the DAO
    function buildMinVotes(address _target, uint _votesNeeded, bytes4 _signature) onlyOwner() external onStatus(1){
        uint pos = DAOActions.length ++;
        DAOActions[pos] = DAOAction(_target, _votesNeeded, _signature);
    }
    function startDAO() external onlyOwner() onStatus(1){
        status = 2;
    }

    // Compare bytes4 function signatures
    function compareSignature(bytes4 _a, bytes4 _b) internal returns (bool) {
        if (_a.length != _b.length)
            return false;
        for (uint i = 0; i < _a.length; i ++)
            if (_a[i] != _b[i])
                return false;
        return true;
    }

    // Divide function to calculate needed votes
    function divide(uint numerator, uint denominator, uint precision) internal returns (uint) {
       // Check safe-to-multiply here
      uint _numerator  = numerator * 10 ** (precision+1);
      // Rounding of last digit
      uint _quotient =  ((_numerator / denominator) + 5) / 10;
      return ( _quotient);
    }

    // Function to get the total votes of an address
    function getVotes(address voter) constant returns (uint){
      uint senderVotes = safeAdd(sentTxVotes[voter], receivedTxVotes[voter]);
      return senderVotes;
    }

}
