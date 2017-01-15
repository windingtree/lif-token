
var abi = require('ethereumjs-abi');

const TOKEN_DECIMALS = 18;
const MAX_ACCOUNTS = 3;
const DEBUG_MODE = true;

function parseBalance(balance){
  return balance/Math.pow(10,TOKEN_DECIMALS);
}
function formatBalance(balance){
  return balance*Math.pow(10,TOKEN_DECIMALS);
}

contract('Lif DAO', function(accounts) {

  var token;
  var events;

  beforeEach(function(done) {
    return LifToken.new()
      .then(function(_token) {
        token = _token;
        events = token.allEvents();
        events.watch(function(error, log){
          console.log('Event:', log.event, ':',log.args);
        });
        done();
      });
  });

  afterEach(function(done) {
    events.stopWatching();
    done();
  });

  function checkValues (_totalSupply, _feesBalance, tokenPrice, tokenFee, _accounts, done) {
    var accountPromises = [];
    accountPromises.push( web3.eth.getBalance(token.contract.address) );
    accountPromises.push( token.totalSupply() );
    accountPromises.push( token.feesBalance() );
    accountPromises.push( token.tokenPrice() );
    accountPromises.push( token.tokenFee() );

    for (var i = 0; i < _accounts.length; i++) {
      accountPromises.push( token.balanceOf(accounts[i]) );
    }

    Promise.all(accountPromises).then(values => {

      if (DEBUG_MODE) {
        console.log('Contract Balance:', web3.fromWei(parseInt(values[0]), 'ether'), 'Ether;', parseInt(values[0], 'wei'), 'Wei');
        console.log('Total Supply:', parseBalance(values[1]));
        console.log('Fees Balance:', web3.fromWei(parseInt(values[2]), 'ether'), 'Ether;', parseInt(values[2], 'wei'), 'Wei');
        console.log('Token Price:', parseInt(values[3]));
        console.log('Token Fee:', parseInt(values[4]));

        for (var z = 5; z < values.length; z++) {
          console.log('Account['+(z-5)+']', accounts[z-5], ", Balance:", parseBalance(values[z]));
        }
      }

      assert.equal(parseBalance(values[1]), _totalSupply);
      assert.equal(web3.fromWei(parseInt(values[2])), _feesBalance);
      assert.equal(parseInt(values[3]), tokenPrice);
      assert.equal(parseInt(values[4]), tokenFee);

      for (var x = 5; x < values.length; x++) {
        assert.equal(parseBalance(values[x]), _accounts[x-5]);
      }
      if (done)
        done();
    }).catch(err => {
      if (done)
        done(err);
      else
        console.error(err);
    });
  }

  function getActions() {
    return new Promise(function(resolve, reject) {

      token.DAOActionsLength().then(actionsLenght => {

        var actionPromises = [];

        for (var z = 1; z < actionsLenght; z++)
          actionPromises.push( token.DAOActions.call(z) );

        Promise.all(actionPromises).then(actions => {

          if (DEBUG_MODE){
            console.log('Total Actions:', parseInt(actionsLenght)-1);
            for (var z = 0; z < actions.length; z++)
              console.log('Signature:', actions[z][2], '; Address:', actions[z][0], '; % Votes:', parseInt(actions[z][1]));
          }
          resolve(actions);
        }).catch(err => {
          reject(err);
        });
      });

    });
  }

  function getProposals() {
    return new Promise(function(resolve, reject) {

      token.ProposalsLenght().then(proposalsLenght => {
        var actionPromises = [];

        for (var z = 1; z < proposalsLenght; z++)
          actionPromises.push( token.proposals.call(z) );

        Promise.all(actionPromises).then(proposals => {
          if (DEBUG_MODE){
            console.log('Total Proposals:', parseInt(proposalsLenght)-1);
            for (var z = 0; z < proposals.length; z++)
              console.log('['+parseInt(proposals[z][1])+'] To: '+proposals[z][0]+', Value: '+web3.fromWei(proposals[z][2],'ether')+', Desc: '+proposals[z][3]+', Status: '+parseInt(proposals[z][4]));
          }
          resolve(proposals);
        }).catch(err => {
          reject(err);
        });
      });

    });
  }

  function getProposal(id) {
    return new Promise(function(resolve, reject) {

      token.proposals.call(id).then(proposal => {
        var votesPromises = [];

        var parsedProposal = {
          target: proposal[0],
          id: parseInt(proposal[1]),
          value: parseInt(proposal[2]),
          description: proposal[3],
          status: parseInt(proposal[4]),
          creationBlock: parseInt(proposal[5]),
          maxBlock: parseInt(proposal[6]),
          executionBlock: parseInt(proposal[7]),
          approvalVotes: parseInt(proposal[8]),
          actionData: proposal[9],
          totalVotes: parseInt(proposal[10]),
          positiveVotes: 0,
          votesNeeded: 0,
          votes: []
        };

        for (var z = 1; z < parsedProposal.totalVotes+1; z++)
          votesPromises.push(token.getProposalVote(parsedProposal.id, z));

        token.totalSupply().then(totalSupply => {
          parsedProposal.votesNeeded = (parsedProposal.approvalVotes / 100) * parseBalance(parseInt(totalSupply));

          Promise.all(votesPromises).then(votesDone => {
            for (var i = 0; i < votesDone.length; i++){
              parsedProposal.votes.push({
                address: votesDone[i].voter,
                amount: parseBalance(parseInt(votesDone[i].balance)),
                vote: votesDone[i].vote
              });
              if (votesDone[i][2])
                parsedProposal.positiveVotes += parseBalance(parseInt(votesDone[i][1]));
            }
            console.log('['+parsedProposal.id+'] To: '+parsedProposal.target+', Value: '+parsedProposal.value+', Desc: '+parsedProposal.description+', Status: '+parsedProposal.status, ', Votes: ',parsedProposal.positiveVotes,'/',parsedProposal.votesNeeded);
            resolve();
          }).catch(err => {
            reject(err);
          });
        });
      });

    });
  }

  function waitBlocks(toWait){
    return new Promise(function(resolve, reject) {
      var toWait =+ web3.eth.blockNumber;
      var wait = setInterval( function() {
          if (web3.eth.blockNumber >= toWait) {
              clearInterval(wait);
              resolve();
          }
      }, 1000 );
    });
  }

  it("Should add the min votes needed for native contract actions", function(done) {
    var signature = '0x'+abi.simpleEncode( "setPrice(uint256)", web3.toHex(0)).toString('hex').substring(0,10);
    console.log('Action setPrice(uint256) signature', signature);
    return token.buildMinVotes(token.contract.address, 85, signature)
      .then(function() {
        var signature = '0x'+abi.simpleEncode( "setFee(uint256)", web3.toHex(0)).toString('hex').substring(0,10);
        console.log('Action setFee(uint256) signature', signature);
        return token.buildMinVotes(token.contract.address, 86, signature);
      })
      .then(function() {
        var signature = '0x'+abi.simpleEncode( "setBaseProposalFee(uint256)", web3.toHex(0)).toString('hex').substring(0,10);
        console.log('Action setBaseProposalFee(uint256) signature', signature);
        return token.buildMinVotes(token.contract.address, 87, signature);
      })
      .then(function() {
        var signature = '0x'+abi.simpleEncode( "setProposalAmountFee(uint256)", web3.toHex(0)).toString('hex').substring(0,10);
        console.log('Action setProposalAmountFee(uint256) signature', signature);
        return token.buildMinVotes(token.contract.address, 88, signature);
      })
      .then(function() {
        var signature = '0x'+abi.simpleEncode( "setMaxSupply(uint256)", web3.toHex(0)).toString('hex').substring(0,10);
        console.log('Action setMaxSupply(uint256) signature', signature);
        return token.buildMinVotes(token.contract.address, 89, signature);
      })
      .then(function() {
        var signature = '0x'+abi.simpleEncode( "setSpecialActionMinVotes(uint256)", web3.toHex(0)).toString('hex').substring(0,10);
        console.log('Action setSpecialActionMinVotes(uint256) signature', signature);
        return token.buildMinVotes(token.contract.address, 90, signature);
      })
      .then(function() {
        var signature = '0x'+abi.simpleEncode( "setMigrationMinVotes(uint256)", web3.toHex(0)).toString('hex').substring(0,10);
        console.log('Action setMigrationMinVotes(uint256) signature', signature);
        return token.buildMinVotes(token.contract.address, 91, signature);
      })
      .then(function() {
        var signature = '0x'+abi.simpleEncode( "setProposalBlocksWait(uint256)", web3.toHex(0)).toString('hex').substring(0,10);
        console.log('Action setProposalBlocksWait(uint256) signature', signature);
        return token.buildMinVotes(token.contract.address, 92, signature);
      })
      .then(function() {
        var signature = '0x'+abi.simpleEncode( "claimFees(address)", web3.toHex(0)).toString('hex').substring(0,10);
        console.log('Action claimFees(address) signature', signature);
        return token.buildMinVotes(token.contract.address, 50, signature);
      })
      .then(function() {
        var signature = '0x'+abi.simpleEncode( "addDAOAction(address,uint,bytes4)", web3.toHex(0), web3.toHex(0), web3.toHex(0)).toString('hex').substring(0,10);
        console.log('Action addDAOAction(address,uint,bytes4) signature', signature);
        return token.buildMinVotes(token.contract.address, 61, signature);
      })
      .then(function() {
        var signature = '0x'+abi.simpleEncode( "removeDAOAction(address,bytes4)", web3.toHex(0), web3.toHex(0)).toString('hex').substring(0,10);
        console.log('Action removeDAOAction(address,bytes4) signature', signature);
        return token.buildMinVotes(token.contract.address, 62, signature);
      })
      .then(function() {
        var signature = '0x'+abi.simpleEncode( "changeDaoAction(address,uint,bytes4)", web3.toHex(0), web3.toHex(0), web3.toHex(0)).toString('hex').substring(0,10);
        console.log('Action changeDaoAction(address,uint,bytes4) signature', signature);
        return token.buildMinVotes(token.contract.address, 63, signature);
      })
      .then(function() {
        return getActions();
      })
      .then(function(actions){
        assert.equal(actions.length, 12);
        done();
      });
  });

  it("Should add a setFee proposal", function(done) {
    var signature = '0x'+abi.simpleEncode( "setFee(uint256)", web3.toHex(0)).toString('hex').substring(0,10);
    console.log('Action setFee(uint256) signature', signature);
    return token.buildMinVotes(token.contract.address, 50, signature)
      .then(function() {
        return token.start();
      })
      .then(function() {
        return token.createTokens(accounts[0], { value: web3.toWei(1, 'ether') });
      })
      .then(function() {
        checkValues(100, 0, 10000000000000000, 100, [100, 0, 0], null);
        var data = '0x'+abi.simpleEncode( "setFee(uint256)", web3.toHex(50)).toString('hex');
        return token.newProposal(token.contract.address, 0, 'Set fee to 50', 0, signature, data, {from: accounts[0]});
      })
      .then(function() {
        return waitBlocks(2);
      })
      .then(function() {
        return getProposals();
      })
      .then(function(proposals) {
        assert.equal(proposals.length, 1);
        return getActions();
      })
      .then(function(actions){
        checkValues(100, 100, 10000000000000000, 100, [0, 0, 0], null);
        assert.equal(actions.length, 1);
        done();
      });
  });

  it("Should fail adding setFee proposal due to low value sent", function(done) {
    var signature = '0x'+abi.simpleEncode( "setFee(uint256)", web3.toHex(0)).toString('hex').substring(0,10);
    console.log('Action setFee(uint256) signature', signature);
    return token.buildMinVotes(token.contract.address, 50, signature)
      .then(function() {
        return token.start();
      })
      .then(function() {
        return token.createTokens(accounts[0], { value: web3.toWei(0.1, 'ether') });
      })
      .then(function() {
        var signature = '0x'+abi.simpleEncode( "setFee(uint256)", web3.toHex(0)).toString('hex').substring(0,10);
        var data = '0x'+abi.simpleEncode( "setFee(uint256)", web3.toHex(50)).toString('hex');
        return token.newProposal(token.contract.address, 0, 'Set fee to 50', 0, signature, data, {from: accounts[0]});
      })
      .catch(function(error) {
        if (error.message.search('invalid JUMP') == -1) throw error;
        done();
      });
  });

  it("Shouldnt add the proposal from an address because sender isnt a token holder", function(done) {
    var signature = '0x'+abi.simpleEncode( "setFee(uint256)", web3.toHex(0)).toString('hex').substring(0,10);
    console.log('Action setFee(uint256) signature', signature);
    return token.buildMinVotes(token.contract.address, 50, signature)
      .then(function() {
        return token.start();
      })
      .then(function() {
        return token.createTokens(accounts[0], { value: web3.toWei(1, 'ether') });
      })
      .then(function() {
        var signature = '0x'+abi.simpleEncode( "setFee(uint256)", web3.toHex(0)).toString('hex').substring(0,10);
        var data = '0x'+abi.simpleEncode( "setFee(uint256)", web3.toHex(50)).toString('hex');
        return token.newProposal(token.contract.address, 0, 'Set fee to 50', 0, signature, data, {from: accounts[1]});
      })
      .then(function() {
        return getProposals();
      })
      .then(function(proposals) {
        assert.equal(proposals.length, 0);
        return getActions();
      })
      .then(function(actions){
        assert.equal(actions.length, 1);
        done();
      });
  });

  it("Should add a setPrice proposal, be voted by another user, check it and get executed.", function(done) {
    var signature = '0x'+abi.simpleEncode( "setPrice(uint256)", web3.toHex(0)).toString('hex').substring(0,10);
    var proposalID;
    console.log('Action setPrice(uint256) signature', signature);
    return token.buildMinVotes(token.contract.address, 50, signature)
      .then(function() {
        return token.start();
      })
      .then(function() {
        return token.createTokens(accounts[0], {from: accounts[0], value: web3.toWei(1.1, 'ether') });
      })
      .then(function() {
        return token.createTokens(accounts[1], {from: accounts[1], value: web3.toWei(5, 'ether') });
      })
      .then(function() {
        checkValues(610, 0, 10000000000000000, 100, [110, 500, 0], null);
        var signature = '0x'+abi.simpleEncode( "setPrice(uint256)", web3.toHex(0)).toString('hex').substring(0,10);
        var data = '0x'+abi.simpleEncode( "setPrice(uint256)", web3.toWei(0.0005, 'ether')).toString('hex');
        return token.newProposal(token.contract.address, 0, 'Set price to 0.0005 ether', 0, signature, data, {from: accounts[0]});
      })
      .then(function() {
        return getProposals();
      })
      .then(function(proposals) {
        assert.equal(proposals.length, 1);
        proposalID = parseInt(proposals[0][1]);
        return token.checkProposal(proposalID);
      })
      .then(function() {
        return token.vote(proposalID, true, {from: accounts[1]});
      })
      .then(function() {
        return waitBlocks(2);
      })
      .then(function() {
        return getProposal(proposalID);
      })
      .then(function() {
        return token.checkProposal(proposalID);
      })
      .then(function() {
        return waitBlocks(2);
      })
      .then(function() {
        return getProposal(proposalID);
      })
      .then(function(){
        checkValues(610, 100, web3.toWei(0.0005, 'ether'), 100, [10, 500, 0], done);
      });
  });

  it("Should add a setFee proposal, be voted by another user, check it and get executed.", function(done) {
    var signature = '0x'+abi.simpleEncode( "setFee(uint256)", web3.toHex(0)).toString('hex').substring(0,10);
    var proposalID;
    console.log('Action setFee(uint256) signature', signature);
    return token.buildMinVotes(token.contract.address, 50, signature)
      .then(function() {
        return token.start();
      })
      .then(function() {
        return token.createTokens(accounts[0], {from: accounts[0], value: web3.toWei(1.1, 'ether') });
      })
      .then(function() {
        return token.createTokens(accounts[1], {from: accounts[1], value: web3.toWei(5, 'ether') });
      })
      .then(function() {
        checkValues(610, 0, 10000000000000000, 100, [110, 500, 0], null);
        var signature = '0x'+abi.simpleEncode( "setFee(uint256)", web3.toHex(0)).toString('hex').substring(0,10);
        var data = '0x'+abi.simpleEncode( "setFee(uint256)", 50).toString('hex');
        return token.newProposal(token.contract.address, 0, 'Set price to 0.0005 ether', 0, signature, data, {from: accounts[0]});
      })
      .then(function() {
        return getProposals();
      })
      .then(function(proposals) {
        assert.equal(proposals.length, 1);
        proposalID = parseInt(proposals[0][1]);
        return token.checkProposal(proposalID);
      })
      .then(function() {
        return token.vote(proposalID, true, {from: accounts[1]});
      })
      .then(function() {
        return waitBlocks(2);
      })
      .then(function() {
        return getProposal(proposalID);
      })
      .then(function() {
        return token.checkProposal(proposalID);
      })
      .then(function() {
        return waitBlocks(2);
      })
      .then(function() {
        return getProposal(proposalID);
      })
      .then(function(){
        checkValues(610, 100, 10000000000000000, 50, [10, 500, 0], done);
      });
  });

  it("Should add a setBaseProposalFee proposal, be voted by another user, check it and get executed.", function(done) {
    var signature = '0x'+abi.simpleEncode( "setBaseProposalFee(uint256)", web3.toHex(0)).toString('hex').substring(0,10);
    var proposalID;
    console.log('Action setBaseProposalFee(uint256) signature', signature);
    return token.buildMinVotes(token.contract.address, 50, signature)
      .then(function() {
        return token.start();
      })
      .then(function() {
        return token.createTokens(accounts[0], {from: accounts[0], value: web3.toWei(1.1, 'ether') });
      })
      .then(function() {
        return token.createTokens(accounts[1], {from: accounts[1], value: web3.toWei(5, 'ether') });
      })
      .then(function() {
        checkValues(610, 0, 10000000000000000, 100, [110, 500, 0], null);
        var data = '0x'+abi.simpleEncode("setBaseProposalFee(uint256)", web3.toHex(60000000000000000000)).toString('hex');
        return token.newProposal(token.contract.address, 0, 'Set baseProposalFee to 60 Lif', 0, signature, data, {from: accounts[0]});
      })
      .then(function() {
        return getProposals();
      })
      .then(function(proposals) {
        assert.equal(proposals.length, 1);
        proposalID = parseInt(proposals[0][1]);
        return token.checkProposal(proposalID);
      })
      .then(function() {
        return token.vote(proposalID, true, {from: accounts[1]});
      })
      .then(function() {
        return waitBlocks(2);
      })
      .then(function() {
        return getProposal(proposalID);
      })
      .then(function() {
        return token.checkProposal(proposalID);
      })
      .then(function() {
        return waitBlocks(2);
      })
      .then(function() {
        return getProposal(proposalID);
      })
      .then(function() {
        return token.baseProposalFee();
      })
      .then(function(baseProposalFee){
        console.log('New base proposal fee:',parseInt(baseProposalFee));
        assert.equal(parseInt(baseProposalFee), 60000000000000000000);
        checkValues(610, 100, 10000000000000000, 100, [10, 500, 0], done);
      });
  });

  it("Should add a setProposalAmountFee proposal, be voted by another user, check it and get executed.", function(done) {
    var signature = '0x'+abi.simpleEncode( "setProposalAmountFee(uint256)", web3.toHex(0)).toString('hex').substring(0,10);
    var proposalID;
    console.log('Action setProposalAmountFee(uint256) signature', signature);
    return token.buildMinVotes(token.contract.address, 50, signature)
      .then(function() {
        return token.start();
      })
      .then(function() {
        return token.createTokens(accounts[0], {from: accounts[0], value: web3.toWei(1.1, 'ether') });
      })
      .then(function() {
        return token.createTokens(accounts[1], {from: accounts[1], value: web3.toWei(5, 'ether') });
      })
      .then(function() {
        checkValues(610, 0, 10000000000000000, 100, [110, 500, 0], null);
        var data = '0x'+abi.simpleEncode("setProposalAmountFee(uint256)", web3.toHex(20)).toString('hex');
        return token.newProposal(token.contract.address, 0, 'Set proposalAmountFee to 2%', 0, signature, data, {from: accounts[0]});
      })
      .then(function() {
        return getProposals();
      })
      .then(function(proposals) {
        assert.equal(proposals.length, 1);
        proposalID = parseInt(proposals[0][1]);
        return token.checkProposal(proposalID);
      })
      .then(function() {
        return token.vote(proposalID, true, {from: accounts[1]});
      })
      .then(function() {
        return waitBlocks(2);
      })
      .then(function() {
        return getProposal(proposalID);
      })
      .then(function() {
        return token.checkProposal(proposalID);
      })
      .then(function() {
        return waitBlocks(2);
      })
      .then(function() {
        return getProposal(proposalID);
      })
      .then(function() {
        return token.proposalAmountFee();
      })
      .then(function(proposalAmountFee){
        console.log('New proposal amountFee fee:',parseInt(proposalAmountFee));
        assert.equal(parseInt(proposalAmountFee), 20);
        checkValues(610, 100, 10000000000000000, 100, [10, 500, 0], done);
      });
  });

  it("Should add a setMaxSupply proposal, be voted by another user, check it and get executed.", function(done) {
    var signature = '0x'+abi.simpleEncode( "setMaxSupply(uint256)", web3.toHex(0)).toString('hex').substring(0,10);
    var proposalID;
    console.log('Action setMaxSupply(uint256) signature', signature);
    return token.buildMinVotes(token.contract.address, 50, signature)
      .then(function() {
        return token.start();
      })
      .then(function() {
        return token.createTokens(accounts[0], {from: accounts[0], value: web3.toWei(1.1, 'ether') });
      })
      .then(function() {
        return token.createTokens(accounts[1], {from: accounts[1], value: web3.toWei(5, 'ether') });
      })
      .then(function() {
        checkValues(610, 0, 10000000000000000, 100, [110, 500, 0], null);
        var data = '0x'+abi.simpleEncode("setMaxSupply(uint256)", web3.toHex(15000000)).toString('hex');
        return token.newProposal(token.contract.address, 0, 'Set setMaxSupply to 15000000 Lif', 0, signature, data, {from: accounts[0]});
      })
      .then(function() {
        return getProposals();
      })
      .then(function(proposals) {
        assert.equal(proposals.length, 1);
        proposalID = parseInt(proposals[0][1]);
        return token.checkProposal(proposalID);
      })
      .then(function() {
        return token.vote(proposalID, true, {from: accounts[1]});
      })
      .then(function() {
        return waitBlocks(2);
      })
      .then(function() {
        return getProposal(proposalID);
      })
      .then(function() {
        return token.checkProposal(proposalID);
      })
      .then(function() {
        return waitBlocks(2);
      })
      .then(function() {
        return getProposal(proposalID);
      })
      .then(function() {
        return token.maxSupply();
      })
      .then(function(maxSupply){
        console.log('New max supply:',parseInt(maxSupply));
        assert.equal(parseInt(maxSupply), 15000000);
        checkValues(610, 100, 10000000000000000, 100, [10, 500, 0], done);
      });
  });

  it("Should add a setProposalBlocksWait proposal, be voted by another user, check it and get executed.", function(done) {
    var signature = '0x'+abi.simpleEncode( "setProposalBlocksWait(uint256)", web3.toHex(0)).toString('hex').substring(0,10);
    var proposalID;
    console.log('Action setProposalBlocksWait(uint256) signature', signature);
    return token.buildMinVotes(token.contract.address, 50, signature)
      .then(function() {
        return token.start();
      })
      .then(function() {
        return token.createTokens(accounts[0], {from: accounts[0], value: web3.toWei(1.1, 'ether') });
      })
      .then(function() {
        return token.createTokens(accounts[1], {from: accounts[1], value: web3.toWei(5, 'ether') });
      })
      .then(function() {
        checkValues(610, 0, 10000000000000000, 100, [110, 500, 0], null);
        var data = '0x'+abi.simpleEncode("setProposalBlocksWait(uint256)", web3.toHex(666)).toString('hex');
        return token.newProposal(token.contract.address, 0, 'Set setProposalBlocksWait to 666 blocks', 0, signature, data, {from: accounts[0]});
      })
      .then(function() {
        return getProposals();
      })
      .then(function(proposals) {
        assert.equal(proposals.length, 1);
        proposalID = parseInt(proposals[0][1]);
        return token.checkProposal(proposalID);
      })
      .then(function() {
        return token.vote(proposalID, true, {from: accounts[1]});
      })
      .then(function() {
        return waitBlocks(2);
      })
      .then(function() {
        return getProposal(proposalID);
      })
      .then(function() {
        return token.checkProposal(proposalID);
      })
      .then(function() {
        return waitBlocks(2);
      })
      .then(function() {
        return getProposal(proposalID);
      })
      .then(function() {
        return token.proposalBlocksWait();
      })
      .then(function(proposalBlocksWait){
        console.log('New base proposal fee:',parseInt(proposalBlocksWait));
        assert.equal(parseInt(proposalBlocksWait), 666);
        checkValues(610, 100, 10000000000000000, 100, [10, 500, 0], done);
      });
  });

  it("Should add a proposal to call a function outside the contract, be voted by another user, check it and get executed.", function(done) {
    var signature = '0x'+abi.simpleEncode("message(bytes32,uint256,string)", web3.toHex(0), web3.toHex(0),web3.toHex(0)).toString('hex').substring(0,10);
    var proposalID;
    var test;
    console.log('Action message(bytes32,uint256,string) signature', signature);
    return Message.new()
      .then(function(_message) {
        message = _message;
        return token.buildMinVotes(message.contract.address, 50, signature);
      })
      .then(function() {
        token.start();
      })
      .then(function() {
        return token.createTokens(accounts[0], {from: accounts[0], value: web3.toWei(1.1, 'ether') });
      })
      .then(function() {
        return token.createTokens(accounts[1], {from: accounts[1], value: web3.toWei(5, 'ether') });
      })
      .then(function() {
        checkValues(610, 0, 10000000000000000, 100, [110, 500, 0], null);
        var data = '0x'+abi.simpleEncode("showMessage(bytes32,uint256,string)", web3.toHex('Test Bytes32'), web3.toHex(666), 'Test String').toString('hex');
        return token.newProposal(message.contract.address, 0, 'Call showMessage(bytes32,uint256,string)', 0, signature, data, {from: accounts[0]});
      })
      .then(function() {
        return waitBlocks(2);
      })
      .then(function() {
        return getProposals();
      })
      .then(function(proposals) {
        assert.equal(proposals.length, 1);
        proposalID = parseInt(proposals[0][1]);
        return token.checkProposal(proposalID);
      })
      .then(function() {
        return token.vote(proposalID, true, {from: accounts[1]});
      })
      .then(function() {
        return waitBlocks(2);
      })
      .then(function() {
        return getProposal(proposalID);
      })
      .then(function() {
        return token.checkProposal(proposalID);
      })
      .then(function() {
        return waitBlocks(2);
      })
      .then(function() {
        return getProposal(proposalID);
      })
      .then(function() {
        message.allEvents().get(function(error, log){
          assert.equal(log[0].event, 'Show');
          assert.equal(log[0].args.b32, '0x5465737420427974657333320000000000000000000000000000000000000000');
          assert.equal(parseInt(log[0].args.number), 666);
          assert.equal(log[0].args.text, 'Test String');
          checkValues(610, 100, 10000000000000000, 100, [10, 500, 0], done);
        });
      });
  });

});
