pragma solidity ^0.4.8;

import "./zeppelin/token/ERC20.sol";
import "./zeppelin/ownership/Ownable.sol";
import "./zeppelin/payment/PullPayment.sol";
import "./zeppelin/SafeMath.sol";

/*
 * Líf Token
 *
 * Líf is the cryptocurrency of the Winding Tree platform.
 *
 * Líf is an Old Norse feminine noun meaning "life, the life of the body".
 */


contract LifToken is Ownable, ERC20, SafeMath, PullPayment {

    // Token Name
    string constant NAME = "Líf";

    // Token Symbol
    string constant SYMBOL = "LIF";

    // Token decimals
    uint constant DECIMALS = 8;
    uint constant LIF_DECIMALS = 100000000;

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

    //ERC20 token balances and allowance
    mapping(address => uint) balances;
    mapping (address => mapping (address => uint)) allowed;

    // Transactions
    mapping(address => uint) public txsSent;
    mapping(address => uint) public txsReceived;

    // Crowdsale Stages
    CrowdsaleStage[] public crowdsaleStages;

    // Presale addresses
    FuturePayment[] public futurePayments;

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

    // Structure of the Crowdsale Stage
    struct CrowdsaleStage {
      uint startBlock;
      uint endBlock;
      uint startPrice;
      uint changePerBlock;
      uint changePrice;
      uint minCap;
      uint maxCap;
      uint totalTokens;
      uint presaleDiscount;
      uint ownerPercentage;
      uint totalPresaleWei;
      uint weiRaised;
      uint tokensSold;
      uint lastPrice;
      mapping (address => uint) weiPayed;
      mapping (address => uint) tokens;
      mapping (address => uint) presalePayments;
    }

    // Structure of the FuturePayment
    struct FuturePayment {
      address owner;
      uint afterBlock;
      uint tokens;
    }

    // Edit of the ERC20 token events to support data argument
    event TransferData(address indexed from, address indexed to, uint value, string data);

    // Proposal events
    event proposalAdded(uint proposalId);
    event proposalExecuted(uint proposalId);
    event proposalRemoved(uint proposalId);

    // Vote event
    event VoteAdded(uint proposalId);

    // Allow only token holders
    modifier onlyTokenHolder {
      if (balances[msg.sender] > 0)
        _;
    }

    // Allow only required status
    modifier onStatus(uint one, uint two) {
      if (((one != 0) && (status == one)) || ((two != 0) && (status == two)))
        _;
    }

    // Dont allow on specified status
    modifier fromDAO() {
      if (msg.sender == address(this))
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

    // Add a token payment that can be claimed after certain block from an address
    function addFuturePayment(address owner, uint afterBlock, uint tokens) external onlyOwner() onStatus(2,0) {
      futurePayments[futurePayments.length ++] = FuturePayment(owner, afterBlock, tokens);
      maxSupply = safeAdd(maxSupply, tokens);
    }

    // Add an address that would be able to spend certain amounts of ethers with discount on a stage
    function addDiscount(address target, uint stage, uint amount) external onlyOwner() onStatus(2,0) {

      if (crowdsaleStages[stage].presaleDiscount == 0)
        throw;

      crowdsaleStages[stage].presalePayments[target] = amount;
      crowdsaleStages[stage].totalPresaleWei = safeAdd(crowdsaleStages[stage].totalPresaleWei, amount);

    }

    // Add a crowdsale stage
    function addCrowdsaleStage(uint startBlock, uint endBlock, uint startPrice, uint changePerBlock, uint changePrice, uint minCap, uint maxCap, uint totalTokens, uint presaleDiscount, uint ownerPercentage) external onlyOwner() {

      if ((msg.sender != address(this)) && (msg.sender != owner))
        throw;

      crowdsaleStages.push(CrowdsaleStage(startBlock, endBlock, startPrice, changePerBlock, changePrice, minCap, maxCap, totalTokens, presaleDiscount, ownerPercentage, 0, 0, 0, 0));
      maxSupply = safeAdd(maxSupply, totalTokens);

    }

    // Change a crowdsale stage status before it begins
    function editCrowdsaleStage(uint stage, uint _startBlock, uint _endBlock, uint _startPrice, uint _changePerBlock, uint _changePrice, uint _minCap, uint _maxCap, uint _totalTokens, uint _ownerPercentage) external onlyOwner() {

      if (block.number >= crowdsaleStages[stage].startBlock)
        throw;

      crowdsaleStages[stage].startBlock = _startBlock;
      crowdsaleStages[stage].endBlock = _endBlock;
      crowdsaleStages[stage].startPrice = _startPrice;
      crowdsaleStages[stage].changePerBlock = _changePerBlock;
      crowdsaleStages[stage].changePrice = _changePrice;
      crowdsaleStages[stage].minCap = _minCap;
      crowdsaleStages[stage].maxCap = _maxCap;
      crowdsaleStages[stage].ownerPercentage = _ownerPercentage;
      maxSupply = safeSub(maxSupply, crowdsaleStages[stage].totalTokens);
      maxSupply = safeAdd(maxSupply, _totalTokens);
      crowdsaleStages[stage].totalTokens = _totalTokens;

    }

    // See if the status of a crowdsale stage and the token status can be changed
    function checkCrowdsaleStage(uint stage) external onlyOwner() {

      if (block.number <= crowdsaleStages[stage].endBlock)
        throw;

      uint foundingTeamTokens = 0;
      if ((status == 3) && (crowdsaleStages[stage].weiRaised >= crowdsaleStages[stage].minCap)) {
        status = 4;
        maxSupply = safeSub(maxSupply, crowdsaleStages[stage].totalTokens);
        maxSupply = safeAdd(maxSupply, crowdsaleStages[stage].tokensSold);
        uint presaleTokens = 0;
        if (crowdsaleStages[stage].presaleDiscount > 0) {
          presaleTokens = safeDiv(crowdsaleStages[stage].lastPrice, 100);
          presaleTokens = safeMul(presaleTokens, safeSub(100, crowdsaleStages[stage].presaleDiscount));
          presaleTokens = safeDiv(crowdsaleStages[stage].totalPresaleWei, presaleTokens);
          maxSupply = safeAdd(maxSupply, presaleTokens);
        }
        if (crowdsaleStages[stage].ownerPercentage > 0) {
          foundingTeamTokens = safeAdd(presaleTokens, crowdsaleStages[stage].tokensSold);
          foundingTeamTokens = safeDiv(foundingTeamTokens, 1000);
          foundingTeamTokens = safeMul(foundingTeamTokens, crowdsaleStages[stage].ownerPercentage);

          for (uint i = safeAdd(block.number, 10); i <= safeAdd(block.number, 80); i = safeAdd(i, 10))
            futurePayments[futurePayments.length ++] = FuturePayment(owner, i, safeDiv(foundingTeamTokens, 8));
          /*
          this values would be use on the final version, making payments every 6 months for 4 years, starting 1 year after token deployment.
          for (uint i = safeAdd(block.number, 2102400); i <= safeAdd(block.number, 6307200); i = safeAdd(i, 525600))
            futurePayments[futurePayments.length ++] = FuturePayment(owner, i, safeDiv(foundingTeamTokens, 8));
          */
          maxSupply = safeAdd(maxSupply, foundingTeamTokens);
          crowdsaleStages[stage].ownerPercentage = 0;
        }
      } else if (crowdsaleStages[stage].weiRaised < crowdsaleStages[stage].minCap) {
        status = 4;
        maxSupply = safeSub(maxSupply, crowdsaleStages[stage].totalTokens);
      }

    }

    // Function that allows a buyer to claim the ether back of a failed stage
    function claimEth(uint stage) external onStatus(4,0) {

      if ((block.number < crowdsaleStages[stage].endBlock) || (crowdsaleStages[stage].weiRaised > crowdsaleStages[stage].minCap) || (crowdsaleStages[stage].weiPayed[msg.sender] == 0))
        throw;

      safeSend(msg.sender, crowdsaleStages[stage].weiPayed[msg.sender]);

    }

    // Function that allows the owner to distribute the tokens after a crowdsale
    function distributeTokens(uint stage, address buyer, bool discount) external onStatus(4,0) onlyOwner() {

      if (discount){

        if (crowdsaleStages[stage].presalePayments[buyer] == 0)
          throw;

        uint tokens = safeDiv(crowdsaleStages[stage].lastPrice, 100);
        tokens = safeMul(tokens, safeSub(100, crowdsaleStages[stage].presaleDiscount));
        tokens = safeDiv(crowdsaleStages[stage].presalePayments[buyer], tokens);

        totalSupply = safeAdd(totalSupply, tokens);
        crowdsaleStages[stage].tokensSold = safeAdd(crowdsaleStages[stage].tokensSold, tokens);

        tokens = safeMul(tokens, LIF_DECIMALS);
        balances[buyer] = safeAdd(balances[buyer], tokens);

        crowdsaleStages[stage].totalPresaleWei = safeSub(crowdsaleStages[stage].totalPresaleWei, crowdsaleStages[stage].presalePayments[msg.sender]);
        crowdsaleStages[stage].presalePayments[buyer] = 0;

      } else {

        if (crowdsaleStages[stage].tokens[buyer] == 0)
          throw;

        uint formatedBalance = safeMul(crowdsaleStages[stage].tokens[buyer], LIF_DECIMALS);
        uint weiChange = safeMul(crowdsaleStages[stage].tokens[buyer], crowdsaleStages[stage].lastPrice);
        weiChange = safeSub(crowdsaleStages[stage].weiPayed[buyer], weiChange);

        totalSupply = safeAdd(totalSupply, crowdsaleStages[stage].tokens[buyer]);
        balances[buyer] = safeAdd(balances[buyer], formatedBalance);

        safeSend(buyer, weiChange);

        crowdsaleStages[stage].weiPayed[buyer] = 0;
        crowdsaleStages[stage].tokens[buyer] = 0;
      }

    }

    // Function that allows an address to claim a futurePayment on tokens
    function claimTokensPayment(uint pos) external onStatus(4,0) {

      if ((futurePayments[pos].tokens == 0) || (futurePayments[pos].owner != msg.sender) ||
        ((futurePayments[pos].afterBlock > 0) && (futurePayments[pos].afterBlock > block.number)))
        throw;

      uint formatedBalance = safeMul(futurePayments[pos].tokens, LIF_DECIMALS);

      totalSupply = safeAdd(totalSupply, futurePayments[pos].tokens);
      balances[msg.sender] = safeAdd(balances[msg.sender], formatedBalance);
      futurePayments[pos].tokens = 0;

    }

    // Create tokens for the recipient
    function submitBid(address recipient, uint tokens) external payable {

      if (tokens == 0)
        throw;

      bool done = false;

      for (uint i = 0; i < crowdsaleStages.length; i ++) {
        if ((crowdsaleStages[i].startBlock <= block.number) && (block.number <= crowdsaleStages[i].endBlock)) {

          // Calculate the total cost in wei of buying the tokens.
          uint weiCost = getPrice(tokens);
          if (weiCost == 0)
            break;

          uint presaleTokens = tokens;

          if (crowdsaleStages[i].presaleDiscount > 0){

            // Calculate how much presale tokens would be distributed at this price
            presaleTokens = safeDiv(getPrice(1), 100);
            presaleTokens = safeMul(presaleTokens, safeSub(100, crowdsaleStages[i].presaleDiscount));
            presaleTokens = safeDiv(crowdsaleStages[i].totalPresaleWei, presaleTokens);

            // Add the bid tokens to presaleTokens to check not to pass the supply of the stage
            presaleTokens = safeAdd(presaleTokens, tokens);
          }

          if (safeAdd(crowdsaleStages[i].tokensSold, presaleTokens) > crowdsaleStages[i].totalTokens)
            break;

          if (msg.value < weiCost) {
            break;
          } else if (safeAdd(crowdsaleStages[i].weiRaised, weiCost) <= crowdsaleStages[i].maxCap){

            if (status != 3)
              status = 3;

            crowdsaleStages[i].lastPrice = getPrice(1);

            if (msg.value > weiCost){
              uint change = safeSub(msg.value, weiCost);
              safeSend(msg.sender, change);
            }

            crowdsaleStages[i].weiPayed[msg.sender] = weiCost;
            crowdsaleStages[i].tokens[msg.sender] = tokens;
            crowdsaleStages[i].weiRaised = safeAdd(crowdsaleStages[i].weiRaised, weiCost);
            crowdsaleStages[i].tokensSold = safeAdd(crowdsaleStages[i].tokensSold, tokens);
            done = true;
            break;

          }
        }
      }

      if ( !done && (msg.value > 0))
        safeSend(msg.sender, msg.value);

    }

    // Change contract variable functions
    function setBaseProposalFee(uint _baseProposalFee) fromDAO() onStatus(4,0) returns (bool) {
      baseProposalFee = _baseProposalFee;
      return true;
    }
    function setMinProposalVotes(uint _minProposalVotes) fromDAO() onStatus(4,0) returns (bool) {
      minProposalVotes = _minProposalVotes;
      return true;
    }
    function setProposalBlocksWait(uint _proposalBlocksWait) fromDAO() onStatus(4,0) returns (bool) {
      proposalBlocksWait = _proposalBlocksWait;
      return true;
    }

    // Send Ether with a DAO proposal approval
    function sendEther(address to, uint amount) fromDAO() onStatus(4,0) returns (bool) {
      safeSend(to, amount);
      return true;
    }

    // Set new status on the contract
    function setStatus(uint newStatus) fromDAO() {
      if ((msg.sender == address(this)) || (msg.sender == owner))
        status = newStatus;
    }

    //ERC20 token transfer method
    function transfer(address to, uint value) returns (bool success) {

      balances[msg.sender] = safeSub(balances[msg.sender], value);
      balances[to] = safeAdd(balances[to], value);
      giveVotes(msg.sender, to);
      Transfer(msg.sender, to, value);

      return true;

    }

    //ERC20 token transfer method
    function transferFrom(address from, address to, uint value) returns (bool success) {

      uint allowance = allowed[from][msg.sender];
      balances[to] = safeAdd(balances[to], value);
      balances[from] = safeSub(balances[from], value);
      allowed[from][msg.sender] = safeSub(allowance, value);
      giveVotes(msg.sender, to);
      Transfer(from, to, value);

      return true;

    }

    //ERC20 token approve method
    function approve(address spender, uint value) returns (bool success) {

      allowed[msg.sender][spender] = value;
      Approval(msg.sender, spender, value);

      return true;

    }

    // ERC20 transfer method but with data parameter.
    function transferData(address to, uint value, string data) onlyTokenHolder() onStatus(3,4) returns (bool success) {

      // If transfer have value process it
      if (value > 0) {
        balances[msg.sender] = safeSub(balances[msg.sender], value);
        balances[to] = safeAdd(balances[to], value);
        giveVotes(msg.sender, to);
      }

      TransferData(msg.sender, to, value, data);

      return true;

    }

    // ERC20 transferFrom method but with data parameter.
    function transferDataFrom(address from, address to, uint value, string data) onStatus(3,4) returns (bool success) {

      // If transfer have value process it
      if (value > 0) {
        uint allowance = allowed[from][msg.sender];
        balances[from] = safeSub(balances[from], value);
        balances[to] = safeAdd(balances[to], value);
        allowed[from][msg.sender] = safeSub(allowance, value);
        giveVotes(msg.sender, to);
      }

      TransferData(msg.sender, to, value, data);

      return true;

    }

    // Create a new proposal
    function newProposal(address target, uint value, string description, uint agePerBlock, bytes4 signature, bytes actionData) payable {

      // Check status inside function because arguments stack is to deep to add modifier
      // Check that action is valid by target and signature
      // Check sender necessary votes
      // Check proposal fee
      if (((status != 3) && (status != 4))
        || (actionsDAO[target][signature] == 0)
        || (getVotes(msg.sender) < minProposalVotes)
        || (msg.value < baseProposalFee))
        throw;

      // Get the needed votes % for action approval
      uint votesNeeded = divide(totalVotes, 100, 1);
      votesNeeded = safeMul(votesNeeded, actionsDAO[target][signature]);
      votesNeeded = divide(votesNeeded, 100, 1);

      // If DAOAction exists votesNeeded will be more than cero, proposal is created.
      if (votesNeeded > 0) {
        totalProposals ++;
        uint pos = proposals.length++;
        uint blocksWait = safeAdd(block.number, proposalBlocksWait);
        uint senderVotes = getVotes(msg.sender);
        proposals[pos] = Proposal(target, totalProposals, value, description, 2, block.number, blocksWait, agePerBlock, votesNeeded, actionData, senderVotes);
        proposals[pos].votes[msg.sender] = 1;
        proposalAdded(totalProposals);
      }

    }

    // Vote a contract proposal
    function vote(uint proposalID, bool vote) onlyTokenHolder() onStatus(3,4) returns (bool) {

      //Get the proposal by proposalID
      Proposal p = proposals[proposalID];

      // Check sender vote and proposal status
      if ((p.votes[msg.sender] > 0) || (p.status != 2))
        throw;

      // Add user vote
      if (vote) {
        p.votes[msg.sender] = 1;
        uint senderVotes = getVotes(msg.sender);
        p.totalVotes = safeAdd(p.totalVotes, senderVotes);
      } else {
        p.votes[msg.sender] = 2;
      }

      VoteAdded(proposalID);

      return true;

    }

    // Execute a proporal, only the owner can make this call, the check of the votes is optional because it can ran out of gas.
    function executeProposal(uint proposalID) onlyTokenHolder() onStatus(4,0) {

      // Get the proposal using proposalsIndex
      Proposal p = proposals[proposalID];

      // Check proposal age and status
      if ((p.maxBlock < block.number) || (p.status != 2))
        throw;

      // Calculate the needed votes
      uint proposalAge = safeSub(block.number, p.creationBlock);
      uint ageVotes = 0;
      if (proposalAge > p.agePerBlock)
        ageVotes = safeDiv(proposalAge, p.agePerBlock);
      uint votesNeeded = safeAdd(p.votesNeeded, ageVotes);

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
    function removeProposal(uint proposalID) onlyTokenHolder() onStatus(4,0) {

      // Get the proposal using proposalsIndex
      Proposal p = proposals[proposalID];

      // If proposal didnt reach maxBlocksWait throw.
      if (p.maxBlock > block.number)
        throw;

      // Change the status of the proposal to declined
      p.status = 0;

      proposalRemoved(proposalID);

    }

    // Add a DAOAction or override ar existing one.
    // Only can be called by the DAO by DAO status or by Owner on Created status
    function addDAOAction(address target, uint votesNeeded, bytes4 signature) {

      if (((status == 2) && (msg.sender == owner)) || ((status == 4) && (msg.sender == address(this))))
        actionsDAO[target][signature] = votesNeeded;

    }

    // Get the token price at the current block if it is on a valid stage
    function getPrice(uint tokens) constant returns (uint) {

      uint price = 0;

      for (uint i = 0; i < crowdsaleStages.length; i ++) {
        if ((crowdsaleStages[i].startBlock <= block.number) && (block.number <= crowdsaleStages[i].endBlock)) {
          price = safeSub(block.number, crowdsaleStages[i].startBlock);
          price = safeDiv(price, crowdsaleStages[i].changePerBlock);
          price = safeMul(price, crowdsaleStages[i].changePrice);
          price = safeSub(crowdsaleStages[i].startPrice, price);
          price = safeMul(price, tokens);
          break;
        }
      }

      return price;

    }

    //ERC20 token balanceOf method
    function balanceOf(address owner) constant returns (uint balance) {
      return balances[owner];
    }

    //ERC20 token allowance method
    function allowance(address owner, address spender) constant returns (uint remaining) {
      return allowed[owner][spender];
    }

    // Get votes needed for a DAO action
    function getActionDAO(address target, bytes4 signature) external constant returns (uint) {
      return actionsDAO[target][signature];
    }

    // Get proposals array lenght
    function proposalsLenght() external constant returns (uint) {
      return proposals.length;
    }

    // Function to get the total votes of an address
    function getVotes(address voter) constant returns (uint) {
      uint senderVotes = safeAdd(sentTxVotes[voter], receivedTxVotes[voter]);
      return senderVotes;
    }

    // Divide function with precision
    function divide(uint numerator, uint denominator, uint precision) internal returns (uint) {

      // Check safe-to-multiply here
      uint _numerator = numerator * 10 ** (precision+1);
      // Rounding of last digit
      uint _quotient = ((_numerator / denominator) + 5) / 10;

      return (_quotient);

    }

    // Internal contract function that add votes if necessary sent/receive txs amount is reached
    function giveVotes(address sender, address receiver) internal {

      if ((txsSent[sender] < (votesIncrementSent**sentTxVotes[sender])) && (safeAdd(txsSent[sender],1) >= (votesIncrementSent**sentTxVotes[sender]))) {
        sentTxVotes[sender] ++;
        totalVotes ++;
      }
      if ((txsReceived[receiver] < (votesIncrementReceived**receivedTxVotes[receiver])) && (safeAdd(txsReceived[receiver],1) >= (votesIncrementReceived**receivedTxVotes[receiver]))) {
        receivedTxVotes[receiver] ++;
        totalVotes ++;
      }

      txsSent[sender] ++;
      txsReceived[receiver] ++;

    }

    // Safe send of ethers to an address, try to use default send function and if dosent succeed it creates an asyncPayment
    function safeSend(address addr, uint amount) internal {
      if (!addr.send(amount))
        asyncSend(addr, amount);
    }

    // No fallback function
    function() {
      throw;
    }

}
