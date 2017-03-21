
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
  const logEvents = false;

  beforeEach(function(done) {
    LifToken.new(web3.toWei(10, 'ether'), 10000000, 10000, 2, 3, 5)
      .then(function(_token) {
        token = _token;
        eventsWatcher = token.allEvents();
        eventsWatcher.watch(function(error, log){
          if (logEvents)
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

  function waitBlocks(toWait){
    return new Promise(function(resolve, reject) {
      toWait += parseInt(web3.eth.blockNumber);
      var wait = setInterval( function() {
        console.log('Waiting '+parseInt(web3.eth.blockNumber-toWait)+' blocks..');
        if (web3.eth.blockNumber >= toWait) {
            clearInterval(wait);
            resolve();
        } else {
          web3.eth.sendTransaction({from: accounts[0], to: accounts[1], value: 1});
        }
      }, 1000 );
    });
  }

  function chekValues(etherBalance, totalSupply, tokenPrice, balances, votes, txsSent, txsReceived) {
    return new Promise(function(resolve, reject) {
      Promise.all([
        web3.eth.getBalance(token.contract.address),
        token.totalSupply(),
        token.tokenPrice(),
        token.totalVotes(),
        token.votesIncrementSent(),
        token.votesIncrementReceived(),
        token.balanceOf(accounts[1]),
        token.balanceOf(accounts[2]),
        token.balanceOf(accounts[3]),
        token.balanceOf(accounts[4]),
        token.balanceOf(accounts[5]),
        token.getVotes(accounts[1]),
        token.getVotes(accounts[2]),
        token.getVotes(accounts[3]),
        token.getVotes(accounts[4]),
        token.getVotes(accounts[5]),
        token.txsSent(accounts[1]),
        token.txsSent(accounts[2]),
        token.txsSent(accounts[3]),
        token.txsSent(accounts[4]),
        token.txsSent(accounts[5]),
        token.txsReceived(accounts[1]),
        token.txsReceived(accounts[2]),
        token.txsReceived(accounts[3]),
        token.txsReceived(accounts[4]),
        token.txsReceived(accounts[5]),
      ]).then(values => {

        if (DEBUG_MODE) {
          console.log('Contract Balance:', toEther(values[0]), 'Ether;', parseInt(values[0]), 'Wei');
          console.log('Total Supply:', parseBalance(values[1]));
          console.log('Token Price:', parseInt(values[2]));
          console.log('Dao Total Votes:', parseInt(values[3]), 'Dao Votes Increment Exponent sent/received:', parseInt(values[4]),'/',parseInt(values[5]));
          console.log('Account[1]', accounts[1], ", Balance:", parseBalance(values[6]), ", Votes:", parseInt(values[11]), ", txsSent / txsReceived:", parseInt(values[16]), parseInt(values[21]));
          console.log('Account[2]', accounts[2], ", Balance:", parseBalance(values[7]), ", Votes:", parseInt(values[12]), ", txsSent / txsReceived:", parseInt(values[17]), parseInt(values[22]));
          console.log('Account[3]', accounts[3], ", Balance:", parseBalance(values[8]), ", Votes:", parseInt(values[13]), ", txsSent / txsReceived:", parseInt(values[18]), parseInt(values[23]));
          console.log('Account[4]', accounts[4], ", Balance:", parseBalance(values[9]), ", Votes:", parseInt(values[14]), ", txsSent / txsReceived:", parseInt(values[19]), parseInt(values[24]));
          console.log('Account[5]', accounts[5], ", Balance:", parseBalance(values[10]), ", Votes:", parseInt(values[15]), ", txsSent / txsReceived:", parseInt(values[20]), parseInt(values[25]));
        }

        if (etherBalance)
          assert.equal(toEther(values[0]), etherBalance);
        if (totalSupply)
          assert.equal(parseBalance(values[1]), totalSupply);
        if (tokenPrice)
          assert.equal(parseInt(values[2]), tokenPrice);
        if (balances){
          assert.equal(parseBalance(values[6]), balances[0]);
          assert.equal(parseBalance(values[7]), balances[1]);
          assert.equal(parseBalance(values[8]), balances[2]);
          assert.equal(parseBalance(values[9]), balances[3]);
          assert.equal(parseBalance(values[10]), balances[4]);
        }
        if (votes){
          assert.equal(parseInt(values[11]), votes[0]);
          assert.equal(parseInt(values[12]), votes[1]);
          assert.equal(parseInt(values[13]), votes[2]);
          assert.equal(parseInt(values[14]), votes[3]);
          assert.equal(parseInt(values[15]), votes[4]);
        }
        if (txsSent){
          assert.equal(parseInt(values[16]), txsSent[0]);
          assert.equal(parseInt(values[17]), txsSent[1]);
          assert.equal(parseInt(values[18]), txsSent[2]);
          assert.equal(parseInt(values[19]), txsSent[3]);
          assert.equal(parseInt(values[20]), txsSent[4]);
        }
        if (txsReceived){
          assert.equal(parseInt(values[21]), txsReceived[0]);
          assert.equal(parseInt(values[22]), txsReceived[1]);
          assert.equal(parseInt(values[23]), txsReceived[2]);
          assert.equal(parseInt(values[24]), txsReceived[3]);
          assert.equal(parseInt(values[25]), txsReceived[4]);
        }
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
              console.log('['+parseInt(proposals[z][1])+'] To: '+proposals[z][0]+', Value: '+web3.fromWei(proposals[z][2],'ether')+', Desc: '+proposals[z][3]+', Status: '+parseInt(proposals[z][4])+', Votes Needed: '+parseInt(proposals[z][8]));
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
          agePerBlock: parseInt(proposal[7]),
          votesNeeded: parseInt(proposal[8]),
          actionData: proposal[9],
          totalVotes: parseInt(proposal[10])
        };

        console.log('['+parsedProposal.id+'] To: '+parsedProposal.target+', Value: '+parsedProposal.value +', MaxBlock: '+parsedProposal.maxBlock+', Desc: '+parsedProposal.description+', Status: '+parsedProposal.status, ', Votes: ',parsedProposal.totalVotes);
        resolve();
      }).catch(err => {
        reject(err);
      });

    });
  }

  ////////////////////////////////////////////////////////
  //                    Lif Token Tests                 //
  ////////////////////////////////////////////////////////

  it("should return the correct getPrice", function(done) {
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

  it("Should add a setMinProposalVotes proposal, be voted by another user, check it and get executed.", function(done) {
    var signature, data;
    token.startCrowdSale(web3.toWei(0.1, 'ether'))
      .then(function() {
        return token.createTokens(accounts[1], 110, {from: accounts[1], value: web3.toWei(11, 'ether')});
      })
      .then(function() {
        return token.createTokens(accounts[2], 500, {from: accounts[2], value: web3.toWei(50, 'ether')});
      })
      .then(function() {
        signature = token.contract.setMinProposalVotes.getData(0x0).toString('hex').substring(0,10);
        console.log('Action setMinProposalVotes(uint256) signature', signature);
        return token.buildMinVotes(token.contract.address, 90, signature, {from: accounts[0]});
      })
      .then(function() {
        return token.startDAO();
      })
      .then(function() {
        var transfers = [];
        for (var i = 0; i < 15; i++)
          transfers.push(token.transfer(accounts[1], formatBalance(12), "", {from: accounts[2]}));
        for (i = 0; i < 6; i++)
          transfers.push(token.transfer(accounts[3], formatBalance(10), "", {from: accounts[1]}));
        return Promise.all(transfers);
      })
      .then(function() {
        return chekValues(61, 610, web3.toWei(0.1, 'ether'), [230, 320, 60, 0, 0], [6, 4, 2, 0, 0], [6, 15, 0, 0, 0], [15, 0, 6, 0, 0]);
      })
      .then(function() {
        data = token.contract.setMinProposalVotes.getData( web3.toHex(10) ).toString('hex');
        return token.newProposal(token.contract.address, 0, 'Set minProposalVotes to 10', 100, signature, data, {from: accounts[1], value: web3.toWei(10, 'ether')});
      })
      .then(function(proposals) {
        return token.vote(1, true, {from: accounts[2]});
      })
      .then(function() {
        return token.vote(1, true, {from: accounts[3]});
      })
      .then(function(result) {
        return token.executeProposal(1, {from: accounts[1]});
      })
      .then(function() {
        data = token.contract.setMinProposalVotes.getData( web3.toHex(20) ).toString('hex');
        return token.newProposal(token.contract.address, 0, 'Set minProposalVotes to 20', 100, signature, data, {from: accounts[1], value: web3.toWei(10, 'ether')});
      })
      .catch(function(error) {
        if (error.message.indexOf('invalid JUMP') < 0) throw error;
      })
      .then(function() {
        return token.minProposalVotes();
      })
      .then(function(minProposalVotes){
        console.log('New minProposalVotes on token:', parseInt(minProposalVotes));
        assert.equal(parseInt(minProposalVotes), 10);
        return chekValues(71, 610, web3.toWei(0.1, 'ether'), [230, 320, 60, 0, 0], [6, 4, 2, 0, 0], [6, 15, 0, 0, 0], [15, 0, 6, 0, 0]);
      }).then(function(){
        done();
      });
  });

  it("Should add a setBaseProposalFee proposal, be voted by another user, check it and get executed.", function(done) {
    var signature, data;
    token.startCrowdSale(web3.toWei(0.1, 'ether'))
      .then(function() {
        return token.createTokens(accounts[1], 110, {from: accounts[1], value: web3.toWei(11, 'ether')});
      })
      .then(function() {
        return token.createTokens(accounts[2], 500, {from: accounts[2], value: web3.toWei(50, 'ether')});
      })
      .then(function() {
        signature = token.contract.setBaseProposalFee.getData(0x0).toString('hex').substring(0,10);
        console.log('Action setBaseProposalFee(uint256) signature', signature);
        return token.buildMinVotes(token.contract.address, 90, signature, {from: accounts[0]});
      })
      .then(function() {
        return token.startDAO();
      })
      .then(function() {
        var transfers = [];
        for (var i = 0; i < 15; i++)
          transfers.push(token.transfer(accounts[1], formatBalance(12), "", {from: accounts[2]}));
        for (i = 0; i < 6; i++)
          transfers.push(token.transfer(accounts[3], formatBalance(10), "", {from: accounts[1]}));
        return Promise.all(transfers);
      })
      .then(function() {
        return chekValues(61, 610, web3.toWei(0.1, 'ether'), [230, 320, 60, 0, 0], [6, 4, 2, 0, 0], [6, 15, 0, 0, 0], [15, 0, 6, 0, 0]);
      })
      .then(function() {
        var data = token.contract.setBaseProposalFee.getData( web3.toHex( web3.toWei(60, 'ether') ) ).toString('hex');
        return token.newProposal(token.contract.address, 0, 'Set baseProposalFee to 60 ETH', 100, signature, data, {from: accounts[1], value: web3.toWei(10, 'ether')});
      })
      .then(function() {
        return token.vote(1, true, {from: accounts[2]});
      })
      .then(function() {
        return token.vote(1, true, {from: accounts[3]});
      })
      .then(function(result) {
        return token.executeProposal(1, {from: accounts[1]});
      })
      .then(function() {
        return token.baseProposalFee();
      })
      .then(function(baseProposalFee) {
        assert.equal(parseInt(baseProposalFee), web3.toWei(60, 'ether'));
        var data = token.contract.setBaseProposalFee.getData( web3.toHex( web3.toWei(100, 'ether') ) ).toString('hex');
        return token.newProposal(token.contract.address, 0, 'Set baseProposalFee to 100 ETH', 100, signature, data, {from: accounts[1], value: web3.toWei(10, 'ether')});
      })
      .catch(function(error) {
        if (error.message.indexOf('invalid JUMP') < 0) throw error;
      })
      .then(function() {
        var data = token.contract.setBaseProposalFee.getData( web3.toHex( web3.toWei(100, 'ether') ) ).toString('hex');
        return token.newProposal(token.contract.address, 0, 'Set baseProposalFee to 100 ETH', 100, signature, data, {from: accounts[1], value: web3.toWei(60, 'ether')});
      })
      .then(function() {
        return token.vote(2, true, {from: accounts[2]});
      })
      .then(function() {
        return token.vote(2, true, {from: accounts[3]});
      })
      .then(function(result) {
        return token.executeProposal(2, {from: accounts[1]});
      })
      .then(function() {
        return token.baseProposalFee();
      })
      .then(function(baseProposalFee){
        console.log('New baseProposalFee on token:', parseInt(baseProposalFee));
        assert.equal(parseInt(baseProposalFee), web3.toWei(100, 'ether'));
        return chekValues(131, 610, web3.toWei(0.1, 'ether'), [230, 320, 60, 0, 0], [6, 4, 2, 0, 0], [6, 15, 0, 0, 0], [15, 0, 6, 0, 0]);
      }).then(function(){
        done();
      });
  });

  it("Should change proposalBlocksWait using a proposal, create another proposal and reach enough blocks to be removed.", function(done) {
    var signature, data;
    token.startCrowdSale(web3.toWei(0.1, 'ether'))
      .then(function() {
        return token.createTokens(accounts[1], 110, {from: accounts[1], value: web3.toWei(11, 'ether')});
      })
      .then(function() {
        return token.createTokens(accounts[2], 500, {from: accounts[2], value: web3.toWei(50, 'ether')});
      })
      .then(function() {
        signature = token.contract.setProposalBlocksWait.getData(0x0).toString('hex').substring(0,10);
        console.log('Action setProposalBlocksWait(uint256) signature', signature);
        return token.buildMinVotes(token.contract.address, 60, signature, {from: accounts[0]});
      })
      .then(function() {
        return token.startDAO();
      })
      .then(function() {
        var transfers = [];
        for (var i = 0; i < 15; i++)
          transfers.push(token.transfer(accounts[1], formatBalance(12), "", {from: accounts[2]}));
        for (i = 0; i < 6; i++)
          transfers.push(token.transfer(accounts[3], formatBalance(10), "", {from: accounts[1]}));
        return Promise.all(transfers);
      })
      .then(function() {
        return chekValues(61, 610, web3.toWei(0.1, 'ether'), [230, 320, 60, 0, 0], [6, 4, 2, 0, 0], [6, 15, 0, 0, 0], [15, 0, 6, 0, 0]);
      })
      .then(function() {
        var data = token.contract.setProposalBlocksWait.getData( web3.toHex(10) ).toString('hex');
        return token.newProposal(token.contract.address, 0, 'Set setProposalBlocksWait to 10 blocks', 100, signature, data, {from: accounts[1], value: web3.toWei(10, 'ether')});
      })
      .then(function(proposals) {
        return token.vote(1, true, {from: accounts[2]});
      })
      .then(function(result) {
        return token.executeProposal(1, {from: accounts[1]});
      })
      .then(function() {
        return token.proposalBlocksWait();
      })
      .then(function(proposalBlocksWait){
        console.log('New proposal blocks wait:', parseInt(proposalBlocksWait));
        assert.equal(parseInt(proposalBlocksWait), 10);
        return chekValues(71, 610, web3.toWei(0.1, 'ether'), [230, 320, 60, 0, 0], [6, 4, 2, 0, 0], [6, 15, 0, 0, 0], [15, 0, 6, 0, 0]);
      })
      .then(function() {
        var data = token.contract.setProposalBlocksWait.getData( web3.toHex(999) ).toString('hex');
        return token.newProposal(token.contract.address, 0, 'Set setProposalBlocksWait to 999 blocks', 100, signature, data, {from: accounts[1], value: web3.toWei(10, 'ether')});
      })
      .then(function(proposals) {
        return token.vote(2, true, {from: accounts[2]});
      })
      .then(function(proposals) {
        return waitBlocks(11);
      })
      .then(function() {
        return token.executeProposal(2, {from: accounts[1]});
      })
      .catch(function(error) {
        if (error.message.indexOf('invalid JUMP') < 0) throw error;
      })
      .then(function(result) {
        return token.removeProposal(2, {from: accounts[2]});
      })
      .then(function() {
        done();
      });
  });

  it("Should add a proposal to send ethers to another address, be voted by another user, check it and get executed.", function(done) {
    var signature, data;
    token.startCrowdSale(web3.toWei(0.1, 'ether'))
      .then(function() {
        return token.createTokens(accounts[1], 110, {from: accounts[1], value: web3.toWei(11, 'ether')});
      })
      .then(function() {
        return token.createTokens(accounts[2], 500, {from: accounts[2], value: web3.toWei(50, 'ether')});
      })
      .then(function() {
        signature = token.contract.sendEther.getData(0x0,0x0).toString('hex').substring(0,10);
        console.log('Action sendEther(address,uint256) signature', signature);
        return token.buildMinVotes(token.contract.address, 70, signature, {from: accounts[0]});
      })
      .then(function() {
        return token.startDAO();
      })
      .then(function() {
        var transfers = [];
        for (var i = 0; i < 15; i++)
          transfers.push(token.transfer(accounts[1], formatBalance(12), "", {from: accounts[2]}));
        for (i = 0; i < 6; i++)
          transfers.push(token.transfer(accounts[3], formatBalance(10), "", {from: accounts[1]}));
        return Promise.all(transfers);
      })
      .then(function() {
        return chekValues(61, 610, web3.toWei(0.1, 'ether'), [230, 320, 60, 0, 0], [6, 4, 2, 0, 0], [6, 15, 0, 0, 0], [15, 0, 6, 0, 0]);
      })
      .then(function() {
        var data = token.contract.sendEther.getData(accounts[3], web3.toWei(6, 'ether')).toString('hex');
        return token.newProposal(token.contract.address, 0, 'Call sendEther(address,uint256)', 100, signature, data, {from: accounts[1], value: web3.toWei(10, 'ether')});
      })
      .then(function() {
        return token.vote(1, true, {from: accounts[2]});
      })
      .then(function(result) {
        return token.executeProposal(1, {from: accounts[3]});
      })
      .then(function() {
        return chekValues(65, 610, web3.toWei(0.1, 'ether'), [230, 320, 60, 0, 0], [6, 4, 2, 0, 0], [6, 15, 0, 0, 0], [15, 0, 6, 0, 0]);
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
        var transfers = [];
        for (var i = 0; i < 15; i++)
          transfers.push(token.transfer(accounts[1], formatBalance(12), "", {from: accounts[2]}));
        for (i = 0; i < 6; i++)
          transfers.push(token.transfer(accounts[3], formatBalance(10), "", {from: accounts[1]}));
        return Promise.all(transfers);
      })
      .then(function() {
        return chekValues(61, 610, web3.toWei(0.1, 'ether'), [230, 320, 60, 0, 0], [6, 4, 2, 0, 0], [6, 15, 0, 0, 0], [15, 0, 6, 0, 0]);
      })
      .then(function() {
        var data = message.contract.showMessage.getData( web3.toHex('Test Bytes32'), web3.toHex(666), 'Test String' ).toString('hex');
        return token.newProposal(message.contract.address, 0, 'Call showMessage(bytes32,uint256,string)', 100, signature, data, {from: accounts[1], value: web3.toWei(10, 'ether')});
      })
      .then(function() {
        return token.vote(1, true, {from: accounts[2]});
      })
      .then(function(result) {
        return token.executeProposal(1, {from: accounts[1]});
      })
      .then(function() {
        return new Promise(function(resolve, reject){
          message.allEvents().get(function(error, log){
            if (error)
              reject(error);
            assert.equal(log[0].event, 'Show');
            assert.equal(log[0].args.b32, '0x5465737420427974657333320000000000000000000000000000000000000000');
            assert.equal(parseInt(log[0].args.number), 666);
            assert.equal(log[0].args.text, 'Test String');
            resolve();
          });
        });
      }).then(function(){
        return chekValues(71, 610, web3.toWei(0.1, 'ether'), [230, 320, 60, 0, 0], [6, 4, 2, 0, 0], [6, 15, 0, 0, 0], [15, 0, 6, 0, 0]);
      }).then(function(){
        done();
      });
  });

});
