
var protobuf = require("protobufjs");

var LifToken = artifacts.require("./LifToken.sol");
var Message = artifacts.require("./Message.sol");

String.prototype.hexEncode = function(){
    var hex, i;
    var result = "";
    for (i=0; i<this.length; i++) {
      hex = this.charCodeAt(i).toString(16);
      result += ("000"+hex).slice(-4);
    }
    return result;
};

String.prototype.hexDecode = function(){
    var j;
    var hexes = this.match(/.{1,4}/g) || [];
    var back = "";
    for(j = 0; j<hexes.length; j++) {
      back += String.fromCharCode(parseInt(hexes[j], 16));
    }
    return back;
};

const TOKEN_DECIMALS = 8;
const DEBUG_MODE = true;

function parseBalance(balance){
  return (balance/Math.pow(10,TOKEN_DECIMALS)).toPrecision(TOKEN_DECIMALS);
}
function formatBalance(balance){
  return (balance*Math.pow(10,TOKEN_DECIMALS));
}

function toEther(wei){
  return web3.fromWei(parseInt(wei), 'ether');
}

function toWei(ether){
  return web3.fromEther(parseInt(ether), 'wei');
}

contract('LifToken', function(accounts) {

  var token;
  var eventsWatcher;
  var events = [];

  beforeEach(function(done) {
    LifToken.new(web3.toWei(10, 'ether'), 10000000, 10000)
      .then(function(_token) {
        token = _token;
        eventsWatcher = token.allEvents();
        eventsWatcher.watch(function(error, log){
          console.log('Event:', log.event, ':',log.args);
          events.push(log);
        });
        done();
      });
  });

  afterEach(function(done) {
    eventsWatcher.stopWatching();
    done();
  });

  function chekValues(etherBalance, _totalSupply, _tokenPrice, _accounts) {
    return new Promise(function(resolve, reject) {
      var accountPromises = [];
      accountPromises.push( web3.eth.getBalance(token.contract.address) );
      accountPromises.push( token.totalSupply() );
      accountPromises.push( token.tokenPrice() );
      accountPromises.push( token.balanceOf(accounts[1]) );
      accountPromises.push( token.balanceOf(accounts[2]) );
      accountPromises.push( token.balanceOf(accounts[3]) );
      accountPromises.push( token.balanceOf(accounts[4]) );
      accountPromises.push( token.balanceOf(accounts[5]) );

      Promise.all(accountPromises).then(values => {

        if (DEBUG_MODE) {
          console.log('Contract Balance:', toEther(values[0]), 'Ether;', parseInt(values[0]), 'Wei');
          console.log('Total Supply:', parseBalance(values[1]));
          console.log('Token Price:', parseInt(values[2]));
          console.log('Account[1]', accounts[1], ", Balance:", parseBalance(values[3]));
          console.log('Account[2]', accounts[2], ", Balance:", parseBalance(values[4]));
          console.log('Account[3]', accounts[3], ", Balance:", parseBalance(values[5]));
          console.log('Account[4]', accounts[4], ", Balance:", parseBalance(values[6]));
          console.log('Account[5]', accounts[5], ", Balance:", parseBalance(values[7]));
        }

        assert.equal(toEther(values[0]), etherBalance);
        assert.equal(parseBalance(values[1]), _totalSupply);
        assert.equal(parseInt(values[2]), _tokenPrice);
        assert.equal(parseBalance(values[3]), _accounts[0]);
        assert.equal(parseBalance(values[4]), _accounts[1]);
        assert.equal(parseBalance(values[5]), _accounts[2]);
        assert.equal(parseBalance(values[6]), _accounts[3]);
        assert.equal(parseBalance(values[7]), _accounts[4]);

        resolve();
      }).catch(err => {
        reject(err);
      });
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
          approvalBalance: parseInt(proposal[8]),
          actionData: proposal[9],
          totalVotes: parseInt(proposal[10]),
          positiveVotes: 0,
          balanceNeeded: 0,
          votes: []
        };

        for (var z = 1; z <= parsedProposal.totalVotes; z++)
          votesPromises.push(token.getProposalVote(parsedProposal.id, z));

        token.totalSupply().then(totalSupply => {
          parsedProposal.balanceNeeded = parseBalance(parsedProposal.approvalBalance);

          Promise.all(votesPromises).then(votesDone => {
            for (var i = 0; i < votesDone.length; i++){
              parsedProposal.votes.push({
                address: votesDone[i][0],
                amount: parseBalance(parseInt(votesDone[i][1])),
                vote: parseInt(votesDone[i][2])
              });
              if (parseInt(votesDone[i][2]) == 1)
                parsedProposal.positiveVotes += parseInt(votesDone[i][1]);
            }
            console.log('['+parsedProposal.id+'] To: '+parsedProposal.target+', Value: '+parsedProposal.value +', MaxBlock: '+parsedProposal.maxBlock+', Desc: '+parsedProposal.description+', Status: '+parsedProposal.status, ', Votes: ',parseBalance(parsedProposal.positiveVotes),'/',parsedProposal.balanceNeeded);
            resolve();
          }).catch(err => {
            reject(err);
          });
        });
      });

    });
  }

  ////////////////////////////////////////////////////////
  //                    Lif Token Tests                 //
  ////////////////////////////////////////////////////////

  it.only("should return the correct getPrice", function(done) {
    token.startDAO()
      .then(function() {
        return token.getPrice(100);
      })
      .then(function(price) {
        console.log(parseInt(price));
        done();
      });
  });

  it("should return the correct totalSupply after construction using createTokens", function(done) {
    token.startCrowdSale(web3.toWei(0.1, 'ether'))
      .then(function() {
        return token.createTokens(accounts[1], 10, { value: web3.toWei(1, 'ether'), from: accounts[1] });
      })
      .then(function() {
        return chekValues(1, 10, web3.toWei(0.1, 'ether'), [10, 0, 0, 0, 0]);
      }).then(function(){
        done();
      });
  });

  it("shouldnt allow to buy sending an incorrect amount of ethers", function(done) {
    token.startCrowdSale(web3.toWei(0.1, 'ether'))
      .then(function() {
        return token.createTokens(accounts[1], 11, { value: web3.toWei(1, 'ether'), from: accounts[1] });
      })
      .catch(function(error) {
        if (error.message.search('invalid JUMP') == -1) throw error;
      })
      .then(function() {
        return chekValues(0, 0, web3.toWei(0.1, 'ether'), [0, 0, 0, 0, 0]);
      }).then(function(){
        done();
      });
  });

  it("should return the correct allowance amount after approval", function(done) {
    token.startCrowdSale(web3.toWei(0.1, 'ether'))
      .then(function() {
        return token.createTokens(accounts[1], 10, { value: web3.toWei(1, 'ether'), from: accounts[1] });
      })
      .then(function() {
        return token.startDAO();
      })
      .then(function() {
        return token.approve(accounts[2], formatBalance(10),{ from: accounts[1] });
      })
      .then(function() {
        return token.allowance(accounts[1], accounts[2],{ from: accounts[1]});
      })
      .then(function(allowance) {
        assert.equal(parseBalance(allowance), 10);
        return chekValues(1, 10, web3.toWei(0.1, 'ether'), [10, 0, 0, 0, 0]);
      }).then(function(){
        done();
      });
  });

  it("should return correct balances after transfer", function(done) {
    token.startCrowdSale(web3.toWei(0.1, 'ether'))
      .then(function() {
        return token.createTokens(accounts[1], 10, { value: web3.toWei(1, 'ether'), from: accounts[1] });
      })
      .then(function() {
        return token.startDAO();
      })
      .then(function() {
        return token.transfer(accounts[2], formatBalance(3.3), "",{ from: accounts[1] });
      })
      .then(function() {
        return chekValues(1, 10, web3.toWei(0.1, 'ether'), [6.7, 3.3, 0, 0, 0]);
      }).then(function(){
        done();
      });
  });

  it("should throw an error when trying to transfer more than balance", function(done) {
    token.startCrowdSale(web3.toWei(0.1, 'ether'))
      .then(function() {
        return token.createTokens(accounts[1], 10, { value: web3.toWei(1, 'ether'), from: accounts[1] });
      })
      .then(function() {
        return token.startDAO();
      })
      .then(function() {
        return token.transfer(accounts[2], formatBalance(101), "");
      })
      .catch(function(error) {
        if (error.message.search('invalid JUMP') == -1) throw error;
      })
      .then(function() {
        return chekValues(1, 10, web3.toWei(0.1, 'ether'), [10, 0, 0, 0, 0]);
      }).then(function(){
        done();
      });
  });

  it("should return correct balances after transfering from another account", function(done) {
    token.startCrowdSale(web3.toWei(0.1, 'ether'))
      .then(function() {
        return token.createTokens(accounts[1], 10, { value: web3.toWei(1, 'ether'), from: accounts[1] });
      })
      .then(function() {
        return token.startDAO();
      })
      .then(function() {
        return token.approve(accounts[3], formatBalance(10), {from: accounts[1]});
      })
      .then(function() {
        return token.transferFrom(accounts[1], accounts[3], formatBalance(10), "", {from: accounts[3]});
      })
      .then(function() {
        return chekValues(1, 10, web3.toWei(0.1, 'ether'), [0, 0, 10, 0, 0]);
      }).then(function(){
        done();
      });
  });

  it("should throw an error when trying to transfer more than allowed", function(done) {
    token.startCrowdSale(web3.toWei(0.1, 'ether'))
      .then(function() {
        return token.createTokens(accounts[1], 10, { value: web3.toWei(1, 'ether'), from: accounts[1] });
      })
      .then(function() {
        return token.startDAO();
      })
      .then(function() {
        return token.approve(accounts[2], formatBalance(9.9));
      })
      .then(function() {
        return token.transferFrom(accounts[1], accounts[2], formatBalance(10), "", {from: accounts[2]});
      })
      .catch(function(error) {
        if (error.message.search('invalid JUMP') == -1) throw error;
      })
      .then(function() {
        return chekValues(1, 10, web3.toWei(0.1, 'ether'), [10, 0, 0, 0, 0]);
      }).then(function(){
        done();
      });
  });

  it("should throw an error to avoid issue more tokens than the max supply ", function(done) {
    token.startCrowdSale(web3.toWei(0.1, 'ether'))
      .then(function() {
        return token.createTokens(accounts[1], 100000001, { value: web3.toWei(10000000.1, 'ether'), from: accounts[1] });
      })
      .catch(function(error) {
        if (error.message.search('invalid JUMP') == -1) throw error;
      })
      .then(function() {
        return chekValues(0, 0, web3.toWei(0.1, 'ether'), [0, 0, 0, 0, 0]);
      }).then(function(){
        done();
      });
  });

  it("should return correct balances after transfer and show the right JSON data transfered", function(done) {
    var _events;
    token.startCrowdSale(web3.toWei(0.1, 'ether'))
      .then(function() {
        _events = token.allEvents();
        return token.createTokens(accounts[1], 10, { value: web3.toWei(1, 'ether'), from: accounts[1] });
      })
      .then(function() {
        return token.startDAO();
      })
      .then(function() {
        var dataParsed = JSON.stringify({awesomeField:"AwesomeString"}).hexEncode();
        console.log(dataParsed);
        return token.transfer(accounts[2], formatBalance(10), dataParsed, {from: accounts[1]});
      })
      .then(function(tx) {
        _events.get(function(error, log){
          var decodedObj = JSON.parse(log[0].args.data.hexDecode());
          assert.equal("AwesomeString", decodedObj.awesomeField);
          return chekValues(1, 10, web3.toWei(0.1, 'ether'), [0, 10, 0, 0, 0]);
        });
      }).then(function(){
        done();
      });
  });

  it("should return correct balances after transfer and show the right PROTOBUF data transfered", function(done) {
    var AwesomeMessage, message, encodedBuffer, encodedHex, _events;
    token.startCrowdSale(web3.toWei(0.1, 'ether'))
      .then(function() {
        _events = token.allEvents();
        return token.createTokens(accounts[1], 10, { value: web3.toWei(1, 'ether'), from: accounts[1] });
      })
      .then(function() {
        return token.startDAO();
      })
      .then(function() {
        return protobuf.load("test/awesome.proto");
      })
      .then(function(awesomeRoot) {
        AwesomeMessage = awesomeRoot.lookup("awesomepackage.AwesomeMessage");
        message = AwesomeMessage.create({ awesomeField: "AwesomeString" });
        encodedBuffer = AwesomeMessage.encode(message).finish();
        encodedHex = encodedBuffer.toString().hexEncode();
        return token.transfer(accounts[2], 0, encodedHex, {from: accounts[1]});
      })
      .then(function() {
        _events.get(function(error, log){
          assert.equal(error, null);
          var decodedBuffer = new Buffer(log[0].args.data.toString().hexDecode());
          assert.equal("AwesomeString", AwesomeMessage.decode(decodedBuffer).awesomeField);
          return chekValues(1, 10, web3.toWei(0.1, 'ether'), [10, 0, 0, 0, 0]);
        });
      }).then(function(){
        done();
      });
  });

  ////////////////////////////////////////////////////////
  //                    Lif DAO Tests                   //
  ////////////////////////////////////////////////////////
  //
  it("Should add the min votes needed for native contract actions", function(done) {
    var signature;
    token.startCrowdSale(web3.toWei(0.1, 'ether'))
      .then(function() {
        signature = token.contract.setPrice.getData(0x0).toString('hex').substring(0,10);
        console.log('Action setPrice(uint256) signature', signature);
        return token.buildMinVotes(token.contract.address, 85, signature, {from: accounts[0]});
      })
      .then(function() {
        signature = token.contract.setBaseProposalFee.getData(0x0).toString('hex').substring(0,10);
        console.log('Action setBaseProposalFee(uint256) signature', signature);
        return token.buildMinVotes(token.contract.address, 86, signature, {from: accounts[0]});
      })
      .then(function() {
        signature = token.contract.setProposalBlocksWait.getData(0x0).toString('hex').substring(0,10);
        console.log('Action setProposalBlocksWait(uint256) signature', signature);
        return token.buildMinVotes(token.contract.address, 87, signature, {from: accounts[0]});
      })
      .then(function() {
        signature = token.contract.addDAOAction.getData(0x0, 0x0, 0x0).toString('hex').substring(0,10);
        console.log('Action addDAOAction(address,uint,bytes4) signature', signature);
        return token.buildMinVotes(token.contract.address, 88, signature, {from: accounts[0]});
      })
      .then(function() {
        signature = token.contract.removeDAOAction.getData(0x0, 0x0).toString('hex').substring(0,10);
        console.log('Action removeDAOAction(address,bytes4) signature', signature, {from: accounts[0]});
        return token.buildMinVotes(token.contract.address, 89, signature);
      })
      .then(function() {
        signature = token.contract.changeDaoAction.getData(0x0, 0x0, 0x0).toString('hex').substring(0,10);
        console.log('Action changeDaoAction(address,uint,bytes4) signature', signature, {from: accounts[0]});
        return token.buildMinVotes(token.contract.address, 90, signature);
      })
      .then(function() {
        signature = token.contract.sendEther.getData(0x0, 0x0).toString('hex').substring(0,10);
        console.log('Action sendEther(address,uint) signature', signature);
        return token.buildMinVotes(token.contract.address, 90, signature, {from: accounts[0]});
      })
      .then(function() {
        signature = token.contract.setStatus.getData(0x0).toString('hex').substring(0,10);
        console.log('Action setStatus(uint) signature', signature);
        return token.buildMinVotes(token.contract.address, 90, signature, {from: accounts[0]});
      })
      .then(function() {
        return getActions();
      })
      .then(function(actions){
        assert.equal(actions.length, 8);
        done();
      });
  });

  it("Should add a setPrice proposal, be voted by another user, check it and get executed.", function(done) {
    var signature, data;
    token.startCrowdSale(web3.toWei(0.1, 'ether'))
      .then(function() {
        return token.createTokens(accounts[1], 110, {from: accounts[1], value: web3.toWei(11, 'ether')});
      })
      .then(function() {
        return token.createTokens(accounts[2], 500, {from: accounts[2], value: web3.toWei(50, 'ether')});
      })
      .then(function() {
        signature = token.contract.setPrice.getData(0x0).toString('hex').substring(0,10);
        console.log('Action setPrice(uint256) signature', signature);
        return token.buildMinVotes(token.contract.address, formatBalance(50), signature, {from: accounts[0]});
      })
      .then(function() {
        return token.startDAO();
      })
      .then(function() {
        return chekValues(61, 610, web3.toWei(0.1, 'ether'), [110, 500, 0, 0, 0]);
      })
      .then(function() {
        data = token.contract.setPrice.getData( web3.toHex(web3.toWei(0.0005, 'ether')) ).toString('hex');
        return token.newProposal(token.contract.address, 0, 'Set price to 0.0005 ether', 0, signature, data, {from: accounts[1], value: web3.toWei(10, 'ether')});
      })
      .then(function() {
        return getProposals();
      })
      .then(function(proposals) {
        assert.equal(proposals.length, 1);
        return token.vote(1, true, {from: accounts[2]});
      })
      .then(function() {
        return getProposal(1);
      })
      .then(function(result) {
        return token.executeProposal(1, true, {from: accounts[0]});
      })
      .then(function() {
        return getProposal(1);
      })
      .then(function(){
        return chekValues(71, 610, web3.toWei(0.0005, 'ether'), [110, 500, 0, 0, 0]);
      }).then(function(){
        done();
      });
  });

  it("Should add a setBaseProposalFee proposal, be voted by another user, check it and get executed.", function(done) {
    token.startCrowdSale(web3.toWei(0.1, 'ether'))
      .then(function() {
        return token.startCrowdSale(web3.toWei(0.1, 'ether'), {from: accounts[0]});
      })
      .then(function() {
        return token.createTokens(accounts[1], 110, {from: accounts[1], value: web3.toWei(11, 'ether') });
      })
      .then(function() {
        return token.createTokens(accounts[2], 500, {from: accounts[2], value: web3.toWei(50, 'ether') });
      })
      .then(function() {
        return token.createTokens(accounts[3], 200, {from: accounts[3], value: web3.toWei(20, 'ether') });
      })
      .then(function() {
        signature = token.contract.setBaseProposalFee.getData(0x0).toString('hex').substring(0,10);
        console.log('Action setBaseProposalFee(uint256) signature', signature);
        return token.buildMinVotes(token.contract.address, formatBalance(50), signature, {from: accounts[0]});
      })
      .then(function() {
        return token.startDAO({from: accounts[0]});
      })
      .then(function() {
        return chekValues(81, 810, web3.toWei(0.1, 'ether'), [110, 500, 200, 0, 0]);
      })
      .then(function() {
        var data = token.contract.setBaseProposalFee.getData( web3.toHex( web3.toWei(60, 'ether') ) ).toString('hex');
        return token.newProposal(token.contract.address, 0, 'Set baseProposalFee to 60 Lif', 0, signature, data, {from: accounts[1], value: web3.toWei(10, 'ether')});
      })
      .then(function() {
        return getProposals();
      })
      .then(function(proposals) {
        assert.equal(proposals.length, 1);
        return token.vote(1, true, {from: accounts[2]});
      })
      .then(function(result) {
        return token.vote(1, true, {from: accounts[3]});
      })
      .then(function(result) {
        return token.executeProposal(1, true, {from: accounts[0]});
      })
      .then(function(result) {
        return getProposal(1);
      })
      .then(function() {
        return token.baseProposalFee();
      })
      .then(function(baseProposalFee){
        console.log('New base proposal fee:',parseInt(baseProposalFee));
        assert.equal(parseInt(baseProposalFee), web3.toWei(60, 'ether'));
        return chekValues(91, 810, web3.toWei(0.1, 'ether'), [110, 500, 200, 0, 0]);
      }).then(function(){
        done();
      });
  });

  it("Should add a setProposalBlocksWait proposal, be voted by another user, check it and get executed.", function(done) {
    token.startCrowdSale(web3.toWei(0.1, 'ether'))
      .then(function() {
        return token.startCrowdSale(web3.toWei(0.1, 'ether'));
      })
      .then(function() {
        return token.createTokens(accounts[1], 110, {from: accounts[1], value: web3.toWei(11, 'ether') });
      })
      .then(function() {
        return token.createTokens(accounts[2], 500, {from: accounts[2], value: web3.toWei(50, 'ether') });
      })
      .then(function() {
        signature = token.contract.setProposalBlocksWait.getData(0x0).toString('hex').substring(0,10);
        console.log('Action setProposalBlocksWait(uint256) signature', signature);
        return token.buildMinVotes(token.contract.address, formatBalance(50), signature, {from: accounts[0]});
      })
      .then(function() {
        return token.startDAO();
      })
      .then(function() {
        return chekValues(61, 610, web3.toWei(0.1, 'ether'), [110, 500, 0, 0, 0]);
      })
      .then(function() {
        var data = token.contract.setProposalBlocksWait.getData( web3.toHex(6666) ).toString('hex');
        return token.newProposal(token.contract.address, 0, 'Set setProposalBlocksWait to 6666 blocks', 0, signature, data, {from: accounts[1], value: web3.toWei(10, 'ether')});
      })
      .then(function() {
        return getProposals();
      })
      .then(function(proposals) {
        assert.equal(proposals.length, 1);
        return token.vote(1, true, {from: accounts[2]});
      })
      .then(function() {
        return getProposal(1);
      })
      .then(function(result) {
        return token.executeProposal(1, true, {from: accounts[0]});
      })
      .then(function() {
        return getProposal(1);
      })
      .then(function() {
        return token.proposalBlocksWait();
      })
      .then(function(proposalBlocksWait){
        console.log('New proposal blocks wait:', parseInt(proposalBlocksWait));
        assert.equal(parseInt(proposalBlocksWait), 6666);
        return chekValues(71, 610, web3.toWei(0.1, 'ether'), [110, 500, 0, 0, 0]);
      }).then(function(){
        done();
      });
  });

  it("Should add a proposal to send ethers to another address, be voted by another user, check it and get executed.", function(done) {
    token.startCrowdSale(web3.toWei(0.1, 'ether'))
      .then(function() {
        return token.startCrowdSale(web3.toWei(0.1, 'ether'));
      })
      .then(function() {
        return token.createTokens(accounts[1], 500, {from: accounts[1], value: web3.toWei(50, 'ether') });
      })
      .then(function() {
        signature = token.contract.sendEther.getData(0x0).toString('hex').substring(0,10);
        console.log('Action sendEther(uint256) signature', signature);
        return token.buildMinVotes(token.contract.address, formatBalance(50), signature, {from: accounts[0]});
      })
      .then(function() {
        return token.startDAO();
      })
      .then(function() {
        return token.transfer(accounts[2], formatBalance(400), "", {from: accounts[1]});
      })
      .then(function() {
        return chekValues(50, 500, web3.toWei(0.1, 'ether'), [100, 400, 0, 0, 0]);
      })
      .then(function() {
        var data = token.contract.sendEther.getData(accounts[3], web3.toWei(0.3, 'ether')).toString('hex');
        return token.newProposal(token.contract.address, 0, 'Call sendEther(address,uint256)', 0, signature, data, {from: accounts[1], value: web3.toWei(10, 'ether')});
      })
      .then(function() {
        return getProposals();
      })
      .then(function(proposals) {
        return token.vote(1, true, {from: accounts[2]});
      })
      .then(function() {
        return getProposal(1);
      })
      .then(function(result) {
        return token.executeProposal(1, true, {from: accounts[0]});
      })
      .then(function() {
        return chekValues(59.7, 500, web3.toWei(0.1, 'ether'),  [100, 400, 0, 0, 0]);
      }).then(function(){
        done();
      });
  });

  it("Should add a proposal to call a function outside the contract, be voted by another user, check it and get executed.", function(done) {
    var signature, test;
    Message.new()
      .then(function(_message) {
        message = _message;
        return token.startCrowdSale(web3.toWei(0.1, 'ether'));
      })
      .then(function() {
        return token.createTokens(accounts[1], 110, {from: accounts[1], value: web3.toWei(11, 'ether') });
      })
      .then(function() {
        return token.createTokens(accounts[2], 500, {from: accounts[2], value: web3.toWei(50, 'ether') });
      })
      .then(function() {
        signature = message.contract.showMessage.getData(0x0, 0x0, 0x0).toString('hex').substring(0,10);
        console.log('Action showMessage(bytes32,uint256,string) signature', signature);
        return token.buildMinVotes(message.contract.address, 50, signature, {from: accounts[0]});
      })
      .then(function() {
        return token.startDAO();
      })
      .then(function() {
        return chekValues(61, 610, web3.toWei(0.1, 'ether'), [110, 500, 0, 0, 0]);
      })
      .then(function() {
        var data = message.contract.showMessage.getData( web3.toHex('Test Bytes32'), web3.toHex(666), 'Test String' ).toString('hex');
        return token.newProposal(message.contract.address, 0, 'Call showMessage(bytes32,uint256,string)', 0, signature, data, {from: accounts[1], value: web3.toWei(10, 'ether')});
      })
      .then(function() {
        return getProposals();
      })
      .then(function(proposals) {
        assert.equal(proposals.length, 1);
        return token.vote(1, true, {from: accounts[2]});
      })
      .then(function() {
        return getProposal(1);
      })
      .then(function(result) {
        return token.executeProposal(1, true, {from: accounts[0]});
      })
      .then(function() {
        return getProposal(1);
      })
      .then(function() {
        message.allEvents().get(function(error, log){
          assert.equal(log[0].event, 'Show');
          assert.equal(log[0].args.b32, '0x5465737420427974657333320000000000000000000000000000000000000000');
          assert.equal(parseInt(log[0].args.number), 666);
          assert.equal(log[0].args.text, 'Test String');
          return chekValues(71, 610, web3.toWei(0.1, 'ether'), [110, 500, 0, 0, 0]);
        });
      }).then(function(){
        done();
      });
  });

});
