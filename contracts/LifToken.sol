pragma solidity ^0.4.6;

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
    uint constant DECIMALS = 18;
    uint constant LIF_DECIMALS = 1000000000000000000;

    // Total balance gathered with fees on Wei
    uint public feesBalance;

    // Token price in Wei unit: 1 ETH = 100 LIF
    uint public tokenPrice;

    // Token fee per tranfer: 100 = 1 % fee per transaction with value
    uint public tokenFee;

    // Proposal fees
    uint public baseProposalFee;
    uint public proposalAmountFee;

    // Maximun number of tokens = 10 million
    uint public maxSupply; // 10 Million Líf

    // DAO Proposals to be done
    Proposal[] public proposals;
    uint public totalProposals;

    // Contract status
    // 0 = Created
    // 1 = Stoped
    // 2 = Normal
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
        uint executionBlock;
        uint approvalVotes;
        bytes actionData;
        uint totalVotes;
        mapping (uint => address) voters;
        mapping (address => uint) votes; // 0 = Vote not done, 1 = Positive, 2 = Negative.
    }

    // Edit of the ERC20 token events to support data argument
    event Transfer(address indexed from, address indexed to, uint value, string data);
    event Approval(address indexed owner, address indexed spender, uint value);

    // Proposal events
    event proposalAdded(uint proposalId);
    event proposalExecuted(uint proposalId);
    event proposalRemoved(uint proposalId);

    //Change token variables Message
    event Message(string message);

    // Allow only token holders
    modifier onlyTokenHolders {
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

    // Contract constructor
    function LifToken() {
        feesBalance = 0;
        tokenPrice = 10000000000000000; //In Wei, 1 ETH = 100 LIF
        tokenFee = 100; // 1 %
        baseProposalFee = 100000000000000000000; // 100 Líf
        proposalAmountFee = 100; // 1 % fee for amount on proposal
        maxSupply = 10000000; // 10 Million Líf
        proposals.length ++;
        totalProposals = 0;
        status = 0;
        proposalBlocksWait = 10000;
        DAOActions.length ++;
    }

    // Token function fallback to create tokens more easily
    function () payable onStatus(2) {
        createTokens(msg.sender);
    }

    // Create tokens for the recipient
    function createTokens(address recipient) payable onStatus(2) {

        if (msg.value == 0) throw;
        if (msg.value % tokenPrice != 0) throw;

        uint tokens = safeMul( safeDiv(msg.value, tokenPrice), LIF_DECIMALS);

        if (safeAdd(totalSupply, tokens) > safeMul(maxSupply, LIF_DECIMALS)) throw;

        totalSupply = safeAdd(totalSupply, tokens);
        balances[recipient] = safeAdd(balances[recipient], tokens);

    }

    // Change contracts variable functions
    function setPrice(uint _tokenPrice) fromDAO() onStatus(2) {
        tokenPrice = _tokenPrice;
        Message('Price Changed');
    }
    function setFee(uint _tokenFee) fromDAO() onStatus(2) {
        tokenFee = _tokenFee;
        Message('Fee Changed');
    }
    function setBaseProposalFee(uint _baseProposalFee) fromDAO() onStatus(2) {
        baseProposalFee = _baseProposalFee;
        Message('Base Proposal Fee Changed');
    }
    function setProposalAmountFee(uint _proposalAmountFee) fromDAO() onStatus(2) {
        proposalAmountFee = _proposalAmountFee;
        Message('Proposal Amount Fee Changed');
    }
    function setMaxSupply(uint _maxSupply) fromDAO() onStatus(2) {
        maxSupply = _maxSupply;
        Message('Max Supply Changed');
    }
    function setProposalBlocksWait(uint _proposalBlocksWait) fromDAO() onStatus(2) {
        proposalBlocksWait = _proposalBlocksWait;
        Message('Proposal Blocks Wait Changed');
    }

    // Claim the fees of the contract
    function claimFees(address _to, uint _amount) fromDAO() onStatus(2) {

        if (_amount > this.balance) throw;

        if (_to.send(_amount))
            feesBalance = safeSub(feesBalance, _amount);

    }

    // Set new status on the contract
    function setStatus(uint _newStatus) fromDAO() {
        status = _newStatus;
    }

    // Transfer token between users
    function transfer(address _to, uint _value, string _data) onlyTokenHolders() onStatus(2) returns (bool success) {

        // If transfer have value process it
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

    }

    // Transfer allowed tokens between users
    function transferFrom(address _from, address _to, uint _value, string _data) onStatus(2) returns (bool success) {

        // If transfer have value process it
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

    //Create a neamountw proposal
    function newProposal( address _target, uint _value, string _description, uint _executionBlock, bytes4 _signature, bytes _actionData ) payable onlyTokenHolders() returns (bool success) {

        if (balances[msg.sender] < baseProposalFee) throw;

        balances[msg.sender] = safeSub(balances[msg.sender], baseProposalFee);
        feesBalance = safeAdd(feesBalance, baseProposalFee);

        if (_value > 0) {
            uint proposalValueFee = safeDiv(_value, proposalAmountFee);
            uint proposalTotalFee = safeAdd(baseProposalFee, proposalValueFee);
            if (msg.value < proposalTotalFee)
                throw;
        }

        //Check the ammount match the fee
        totalProposals ++;
        uint _id = totalProposals;

        // Get the needed votes % for action approval
        uint _approvalVotes = 0;

        for (uint i = 1; i < DAOActions.length; i ++)
            if ((DAOActions[i].target == _target) && (compareSignature(DAOActions[i].signature, _signature)))
                _approvalVotes = DAOActions[i].votesNeeded;

        // If DAOAction exists _approvalVotes will be more than cero, proposal is created.
        if (_approvalVotes > 0) {
            uint pos = proposals.length++;
            proposals[pos] = Proposal(_target, _id, _value, _description, 2, block.number, block.number + proposalBlocksWait, _executionBlock, _approvalVotes, _actionData, 1);
            proposals[pos].voters[1] = msg.sender;
            proposals[pos].votes[msg.sender] = 1;
            proposalAdded(_id);
        }

        return true;

    }

    // Vote a contract proposal
    function vote( uint _proposalID, bool _vote ) onlyTokenHolders() {

        //Get the proposal using proposalsIndex
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

    }

    // Functions to check proposal
    function checkProposal( uint _proposalID ) onlyTokenHolders returns (bool) {

        //Get the proposal using proposalsIndex
        Proposal p = proposals[_proposalID];

        // If proposal reach maxBlocksWait remove it.
        if (p.maxBlock < block.number) {
            if (removeProposal(p.id)) {
                proposalRemoved(p.id);
                return true;
            } else {
                return false;
            }
        }

        uint totalVotes = 0;
        uint votesNeeded = safeMul(p.approvalVotes, safeDiv(totalSupply, 100));

        for (uint i = 1; i < p.totalVotes+1; i ++)
            if (p.votes[ p.voters[i] ] == 1)
                totalVotes = safeAdd(totalVotes, balances[p.voters[i]]);

        // If proposal reach votes for approval, execute it, if not remove it.
        if ((totalVotes > votesNeeded) && (p.executionBlock < block.number)){
            if (executeProposal(_proposalID)) {
                proposalExecuted(p.id);
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }

    }

    // Functions to get the amount f votes on a proposal
    function getProposalVote(uint _proposalID, uint _position) onlyTokenHolders constant returns (address voter, uint balance, uint vote) {

        //Get the proposal using proposalsIndex
        Proposal p = proposals[_proposalID];

        if (_position > p.totalVotes) throw;

        return (p.voters[_position], balances[ p.voters[_position] ], p.votes[ p.voters[_position] ]);

    }

    // Internal functions to executre or remove proposal
    function executeProposal(uint _proposalID) internal returns (bool success){

        //Get the proposal using proposalsIndex
        Proposal p = proposals[_proposalID];

        // Change the status of the proposal to accepted
        p.status = 1;

        if ((p.target != address(this)) && (p.value > 0)){
            if (p.target.send(p.value))
                return true;
            else
                return false;
        } else {
            if (p.target.call(p.actionData))
                return true;
            else
                return false;
        }

    }
    function removeProposal(uint _proposalID) internal returns (bool success){

        // Get the proposal using proposalsIndex
        Proposal p = proposals[_proposalID];

        // Change the status of the proposal to declined
        p.status = 0;

        return true;

    }

    // Functions to edit, add and remove DAOActions
    function changeDaoAction(address _target, uint _votesNeeded, bytes4 _signature) internal fromDAO() onStatus(2){

        for (uint i = 1; i < DAOActions.length; i ++)
            if ((DAOActions[i].target == _target) && (compareSignature(DAOActions[i].signature, _signature)))
                DAOActions[i].votesNeeded = _votesNeeded;

    }
    function removeDAOAction(address _target, bytes4 _signature) internal fromDAO() onStatus(2){

        for (uint i = 1; i < DAOActions.length; i ++)
            if ((DAOActions[i].target == _target) && (compareSignature(DAOActions[i].signature, _signature)))
                delete DAOActions[i];

    }
    function addDAOAction(address _target, uint _votesNeeded, bytes4 _signature) internal fromDAO(){

        if (status > 2) throw;

        uint pos = DAOActions.length ++;
        DAOActions[pos] = DAOAction(_target, _votesNeeded, _signature);

    }

    //Get DAOActions array lenght
    function DAOActionsLength() external constant returns (uint){
        return DAOActions.length;
    }

    //Get proposals array lenght
    function ProposalsLenght() external constant returns (uint){
        return proposals.length;
    }

    // As soon after the contract is created the deployer can set the DAOActions for the DAOActions using buildMinVotes
    // Once the min votes are all configured the deployer can start the contract
    function buildMinVotes(address _target, uint _votesNeeded, bytes4 _signature) onlyOwner() external onStatus(0){
        uint pos = DAOActions.length ++;
        DAOActions[pos] = DAOAction(_target, _votesNeeded, _signature);
    }
    function start() external onlyOwner() onStatus(0){
        status = 2;
    }

    // Compare bytes4 call signatures
    function compareSignature(bytes4 _a, bytes4 _b) internal returns (bool) {
        if (_a.length != _b.length)
			return false;
		// @todo unroll this loop
		for (uint i = 0; i < _a.length; i ++)
			if (_a[i] != _b[i])
				return false;
		return true;
    }

}
