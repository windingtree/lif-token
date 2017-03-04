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
        uint balanceNeeded;
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
        uint executionBlock;
        uint approvalBalance;
        bytes actionData;
        uint totalVotes;
        mapping (uint => address) voters;
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
    function LifToken(uint _baseProposalFee, uint _maxSupply, uint _proposalBlocksWait) {

        baseProposalFee = _baseProposalFee;
        maxSupply = _maxSupply;
        proposalBlocksWait = _proposalBlocksWait;

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

    function getPrice(uint _tokens) constant returns (uint) {
        return safeMul(_tokens, tokenPrice);
    }

    // Change contract variable functions
    function setPrice(uint _tokenPrice) fromDAO() onStatus(2) returns (bool) {
        tokenPrice = _tokenPrice;
        Message('Price Changed');
        return true;
    }
    function setBaseProposalFee(uint _baseProposalFee) fromDAO() onStatus(2) returns (bool) {
        baseProposalFee = _baseProposalFee;
        Message('Base Proposal Fee Changed');
        return true;
    }
    function setProposalBlocksWait(uint _proposalBlocksWait) fromDAO() onStatus(2) returns (bool) {
        proposalBlocksWait = _proposalBlocksWait;
        Message('Proposal Blocks Wait Changed');
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
        }

        LifTransfer(msg.sender, _to, _value, _data);

        return true;

    }

    // Create a new proposal
    function newProposal( address _target, uint _value, string _description, uint _executionBlock, bytes4 _signature, bytes _actionData ) payable onlyTokenHolder() returns (bool success) {

        if (msg.value < baseProposalFee) throw;

        totalProposals ++;
        uint _id = totalProposals;

        // Get the needed votes % for action approval
        uint _approvalBalance = 0;

        for (uint i = 1; i < DAOActions.length; i ++)
            if ((DAOActions[i].target == _target) && (compareSignature(DAOActions[i].signature, _signature)))
                _approvalBalance = DAOActions[i].balanceNeeded;

        // If DAOAction exists _approvalBalance will be more than cero, proposal is created.
        if (_approvalBalance > 0) {
            uint pos = proposals.length++;
            uint _blocksWait = safeAdd(block.number, proposalBlocksWait);
            proposals[pos] = Proposal(_target, _id, _value, _description, 2, block.number, _blocksWait, _executionBlock, _approvalBalance, _actionData, 1);
            proposals[pos].voters[ proposals[pos].totalVotes ] = msg.sender;
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
        if (_vote)
            p.votes[msg.sender] = 1;
        else
            p.votes[msg.sender] = 2;
        p.totalVotes ++;
        p.voters[p.totalVotes] = msg.sender;

        VoteAdded(_proposalID);

        return true;

    }

    // Functions to get the amount f votes on a proposal
    function getProposalVote(uint _proposalID, uint _position) constant returns (address voter, uint balance, uint vote) {

        //Get the proposal using proposalsIndex
        Proposal p = proposals[_proposalID];

        if (_position > p.totalVotes) throw;

        return (p.voters[_position], balances[ p.voters[_position] ], p.votes[ p.voters[_position] ]);

    }

    // Execute a proporal, only the owner can make this call, the check of the votes is optional because it can ran out of gas.
    function executeProposal(uint _proposalID, bool checkVotes) onlyOwner() onStatus(2) returns (bool success){

        // Get the proposal using proposalsIndex
        Proposal p = proposals[_proposalID];

        // If proposal reach maxBlocksWait throw.
        if (p.maxBlock < block.number) throw;

        // The votes have to be checked recursively, this would be option since it can rans out of gas.
        if (checkVotes){
            // Calculate the total votes
            uint totalVotes = 0;
            for (uint i = 1; i <= p.totalVotes; i ++){
                if (p.votes[ p.voters[i] ] == 1){
                    totalVotes = safeAdd(totalVotes, balances[p.voters[i]]);
                }
            }

            // See if proposal reached the needed votes
            if (totalVotes <= p.approvalBalance){
                return false;
            }
        }

        // Change the status of the proposal to accepted
        p.status = 1;

        if (p.target.call(p.actionData))
            return true;
        else
            return false;

    }

    // Execute a proporal, only the owner can make this call.
    function removeProposal(uint _proposalID) onlyOwner() onStatus(2) returns (bool success){

        // If proposal didnt reach maxBlocksWait throw.
        if (p.maxBlock > block.number) throw;

        // Get the proposal using proposalsIndex
        Proposal p = proposals[_proposalID];

        // Change the status of the proposal to declined
        p.status = 0;

        return true;

    }

    // Functions to edit, add and remove DAOActions
    function changeDaoAction(address _target, uint _balanceNeeded, bytes4 _signature) fromDAO() onStatus(2) returns (bool){

        for (uint i = 1; i < DAOActions.length; i ++)
            if ((DAOActions[i].target == _target) && (compareSignature(DAOActions[i].signature, _signature))){
                DAOActions[i].balanceNeeded = _balanceNeeded;
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
    function addDAOAction(address _target, uint _balanceNeeded, bytes4 _signature) fromDAO() returns (bool){

        if (((status == 0) && (msg.sender == owner)) || (status == 2)) throw;

        uint pos = DAOActions.length ++;
        DAOActions[pos] = DAOAction(_target, _balanceNeeded, _signature);

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
    function buildMinVotes(address _target, uint _balanceNeeded, bytes4 _signature) onlyOwner() external onStatus(1){
        uint pos = DAOActions.length ++;
        DAOActions[pos] = DAOAction(_target, _balanceNeeded, _signature);
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

}
