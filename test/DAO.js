
var protobuf = require("protobufjs");

var help = require("./helpers");

var LifToken = artifacts.require("./LifToken.sol");
var Message = artifacts.require("./Message.sol");

const LOG_EVENTS = false;

contract('LifToken DAO', function(accounts) {

  var token;
  var eventsWatcher;

  beforeEach(async function() {
    token = await LifToken.new(web3.toWei(10, 'ether'), 10000, 2, 3, 5)
    eventsWatcher = token.allEvents();
    eventsWatcher.watch(function(error, log){
      if (LOG_EVENTS)
        console.log('Event:', log.event, ':',log.args);
    });
  });

  afterEach(function(done) {
    eventsWatcher.stopWatching();
    done();
  });

  it("Should add the min votes needed for native contract actions", async function() {
    var signature = token.contract.setBaseProposalFee.getData(0x0).toString('hex').substring(0,10);
    console.log('Action setBaseProposalFee(uint256) signature', signature);
    await token.addDAOAction(token.contract.address, 86, signature, {from: accounts[0]});

    signature = token.contract.setProposalBlocksWait.getData(0x0).toString('hex').substring(0,10);
    console.log('Action setProposalBlocksWait(uint256) signature', signature);
    await token.addDAOAction(token.contract.address, 87, signature, {from: accounts[0]});

    signature = token.contract.addDAOAction.getData(0x0, 0x0, 0x0).toString('hex').substring(0,10);
    console.log('Action addDAOAction(address,uint,bytes4) signature', signature);
    await token.addDAOAction(token.contract.address, 88, signature, {from: accounts[0]});

    signature = token.contract.sendEther.getData(0x0, 0x0).toString('hex').substring(0,10);
    console.log('Action sendEther(address,uint) signature', signature);
    await token.addDAOAction(token.contract.address, 89, signature, {from: accounts[0]});

    signature = token.contract.setStatus.getData(0x0).toString('hex').substring(0,10);
    console.log('Action setStatus(uint) signature', signature);
    await token.addDAOAction(token.contract.address, 90, signature, {from: accounts[0]});
    assert.equal(parseInt(await token.getActionDAO(token.contract.address, token.contract.setBaseProposalFee.getData(0x0).toString('hex').substring(0,10))), 86);
    assert.equal(parseInt(await token.getActionDAO(token.contract.address, token.contract.setProposalBlocksWait.getData(0x0).toString('hex').substring(0,10))), 87);
    assert.equal(parseInt(await token.getActionDAO(token.contract.address, token.contract.addDAOAction.getData(0x0).toString('hex').substring(0,10))), 88);
    assert.equal(parseInt(await token.getActionDAO(token.contract.address, token.contract.sendEther.getData(0x0).toString('hex').substring(0,10))), 89);
    assert.equal(parseInt(await token.getActionDAO(token.contract.address, token.contract.setStatus.getData(0x0).toString('hex').substring(0,10))), 90);

  });

  it("Should add a setMinProposalVotes proposal, be voted by another user, check it and get executed.", async function() {
    var signature, data;
    signature = token.contract.setMinProposalVotes.getData(0x0).toString('hex').substring(0,10);
    console.log('Action setMinProposalVotes(uint256) signature', signature);
    await token.addDAOAction(token.contract.address, 90, signature, {from: accounts[0]})
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts);
    await token.setStatus(4);
    var transfers = [];
    for (var i = 0; i < 15; i++)
      transfers.push(token.transfer(accounts[1], help.lif2LifWei(100), "", {from: accounts[2]}));
    for (i = 0; i < 6; i++)
      transfers.push(token.transfer(accounts[3], help.lif2LifWei(10), "", {from: accounts[1]}));

    await Promise.all(transfers);
    await help.checkToken(token, accounts, 10000000, [4001440,2998500,2000060,1000000,0], [6, 5, 2, 1, 0], [6, 15, 0, 0, 0], [16, 1, 7, 1, 0]);

    data = token.contract.setMinProposalVotes.getData( web3.toHex(10) ).toString('hex');
    await token.newProposal(token.contract.address, 0, 'Set minProposalVotes to 10', 100, signature, data, {from: accounts[1], value: web3.toWei(10, 'ether')});
    await token.vote(1, true, {from: accounts[2]});
    await token.vote(1, true, {from: accounts[3]});
    await token.vote(1, true, {from: accounts[0]});

    await token.executeProposal(1, {from: accounts[0]});
    data = token.contract.setMinProposalVotes.getData( web3.toHex(20) ).toString('hex');
    try {
      await token.newProposal(token.contract.address, 0, 'Set minProposalVotes to 20', 100, signature, data, {from: accounts[1], value: web3.toWei(10, 'ether')});
    } catch (error) {
      if (error.message.indexOf('invalid JUMP') < 0) throw error;
    }
    let minProposalVotes = await token.minProposalVotes();
    console.log('New minProposalVotes on token:', parseInt(minProposalVotes));
    assert.equal(parseInt(minProposalVotes), 10);
    await help.checkToken(token, accounts, 10000000, [4001440,2998500,2000060,1000000,0], [6, 5, 2, 1, 0], [6, 15, 0, 0, 0], [16, 1, 7, 1, 0]);
  });

  it("Should add a setBaseProposalFee proposal, be voted by another user, check it and get executed.", async function() {
    var signature, data;
    signature = token.contract.setBaseProposalFee.getData(0x0).toString('hex').substring(0,10);
    console.log('Action setBaseProposalFee(uint256) signature', signature);
    await token.addDAOAction(token.contract.address, 90, signature, {from: accounts[0]})
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts);
    await token.setStatus(4);
    var transfers = [];
    for (var i = 0; i < 15; i++)
      transfers.push(token.transfer(accounts[1], help.lif2LifWei(100), "", {from: accounts[2]}));
    for (i = 0; i < 6; i++)
      transfers.push(token.transfer(accounts[3], help.lif2LifWei(10), "", {from: accounts[1]}));

    await Promise.all(transfers);
    await help.checkToken(token, accounts, 10000000, [4001440,2998500,2000060,1000000,0], [6, 5, 2, 1, 0], [6, 15, 0, 0, 0], [16, 1, 7, 1, 0]);

    var data = token.contract.setBaseProposalFee.getData( web3.toHex( web3.toWei(60, 'ether') ) ).toString('hex');
    await token.newProposal(token.contract.address, 0, 'Set baseProposalFee to 60 ETH', 100, signature, data, {from: accounts[1], value: web3.toWei(10, 'ether')});
    await token.vote(1, true, {from: accounts[2]});
    await token.vote(1, true, {from: accounts[3]});
    await token.vote(1, true, {from: accounts[0]});
    await token.executeProposal(1, {from: accounts[0]});

    let baseProposalFee = await token.baseProposalFee();
    assert.equal(parseInt(baseProposalFee), web3.toWei(60, 'ether'));
    var data = token.contract.setBaseProposalFee.getData( web3.toHex( web3.toWei(100, 'ether') ) ).toString('hex');

    try {
      await token.newProposal(token.contract.address, 0, 'Set baseProposalFee to 100 ETH', 100, signature, data, {from: accounts[1], value: web3.toWei(10, 'ether')});
    } catch (error) {
      if (error.message.indexOf('invalid JUMP') < 0) throw error;
    }

    var data = token.contract.setBaseProposalFee.getData( web3.toHex( web3.toWei(100, 'ether') ) ).toString('hex');
    await token.newProposal(token.contract.address, 0, 'Set baseProposalFee to 100 ETH', 100, signature, data, {from: accounts[1], value: web3.toWei(60, 'ether')});
    await token.vote(2, true, {from: accounts[2]});
    await token.vote(2, true, {from: accounts[3]});
    await token.vote(2, true, {from: accounts[0]});
    await token.executeProposal(2, {from: accounts[0]});

    baseProposalFee = await token.baseProposalFee();
    console.log('New baseProposalFee on token:', parseInt(baseProposalFee));

    assert.equal(parseInt(baseProposalFee), web3.toWei(100, 'ether'));
    await help.checkToken(token, accounts, 10000000, [4001440,2998500,2000060,1000000,0], [6, 5, 2, 1, 0], [6, 15, 0, 0, 0], [16, 1, 7, 1, 0]);
  });

  it("Should change proposalBlocksWait using a proposal, create another proposal and reach enough blocks to be removed.", async function() {
    var signature, data;
    signature = token.contract.setProposalBlocksWait.getData(0x0).toString('hex').substring(0,10);
    console.log('Action setProposalBlocksWait(uint256) signature', signature);
    await token.addDAOAction(token.contract.address, 90, signature, {from: accounts[0]})
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts);
    await token.setStatus(4);
    var transfers = [];
    for (var i = 0; i < 15; i++)
      transfers.push(token.transfer(accounts[1], help.lif2LifWei(100), "", {from: accounts[2]}));
    for (i = 0; i < 6; i++)
      transfers.push(token.transfer(accounts[3], help.lif2LifWei(10), "", {from: accounts[1]}));

    await Promise.all(transfers);
    await help.checkToken(token, accounts, 10000000, [4001440,2998500,2000060,1000000,0], [6, 5, 2, 1, 0], [6, 15, 0, 0, 0], [16, 1, 7, 1, 0]);

    var data = token.contract.setProposalBlocksWait.getData( web3.toHex(10) ).toString('hex');
    token.newProposal(token.contract.address, 0, 'Set setProposalBlocksWait to 10 blocks', 100, signature, data, {from: accounts[1], value: web3.toWei(10, 'ether')});
    await token.vote(1, true, {from: accounts[2]});
    await token.vote(1, true, {from: accounts[3]});
    await token.vote(1, true, {from: accounts[0]});
    await token.executeProposal(1, {from: accounts[0]});
    let proposalBlocksWait = await token.proposalBlocksWait();
    console.log('New proposal blocks wait:', parseInt(proposalBlocksWait));
    assert.equal(parseInt(proposalBlocksWait), 10);
    await help.checkToken(token, accounts, 10000000, [4001440,2998500,2000060,1000000,0], [6, 5, 2, 1, 0], [6, 15, 0, 0, 0], [16, 1, 7, 1, 0]);

    var data = token.contract.setProposalBlocksWait.getData( web3.toHex(999) ).toString('hex');
    await token.newProposal(token.contract.address, 0, 'Set setProposalBlocksWait to 999 blocks', 100, signature, data, {from: accounts[1], value: web3.toWei(10, 'ether')});
    await token.vote(2, true, {from: accounts[2]});
    await token.vote(2, true, {from: accounts[3]});
    await token.vote(2, true, {from: accounts[0]});
    await help.waitBlocks(11, accounts);

    try {
      await token.executeProposal(2, {from: accounts[0]});
    } catch (error) {
      if (error.message.indexOf('invalid JUMP') < 0) throw error;
    }
    await token.removeProposal(2, {from: accounts[2]});
  });

  it("Should add a proposal to send ethers to another address, be voted by another user, check it and get executed.", async function() {
    var signature, data;
    signature = token.contract.sendEther.getData(0x0,0x0).toString('hex').substring(0,10);
    console.log('Action sendEther(address,uint256) signature', signature);
    await token.addDAOAction(token.contract.address, 50, signature, {from: accounts[0]})
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts);
    await token.setStatus(4);
    var transfers = [];
    for (var i = 0; i < 15; i++)
      transfers.push(token.transfer(accounts[1], help.lif2LifWei(100), "", {from: accounts[2]}));
    for (i = 0; i < 6; i++)
      transfers.push(token.transfer(accounts[3], help.lif2LifWei(10), "", {from: accounts[1]}));
    await Promise.all(transfers);
    await help.checkToken(token, accounts, 10000000, [4001440,2998500,2000060,1000000,0], [6, 5, 2, 1, 0], [6, 15, 0, 0, 0], [16, 1, 7, 1, 0]);

    var data = token.contract.sendEther.getData(accounts[3], web3.toWei(6, 'ether')).toString('hex');
    await token.newProposal(token.contract.address, 0, 'Call sendEther(address,uint256)', 100, signature, data, {from: accounts[1], value: web3.toWei(10, 'ether')});
    await token.vote(1, true, {from: accounts[2]});
    await token.vote(1, true, {from: accounts[3]});
    await token.executeProposal(1, {from: accounts[0]});

    await help.checkToken(token, accounts, 10000000, [4001440,2998500,2000060,1000000,0], [6, 5, 2, 1, 0], [6, 15, 0, 0, 0], [16, 1, 7, 1, 0]);
  });

  it("Should add a proposal to call a function outside the contract, be voted by another user, check it and get executed.", async function() {
    var signature, test;
    let message = await Message.new()
    signature = message.contract.showMessage.getData(0x0, 0x0, 0x0).toString('hex').substring(0,10);
    console.log('Action showMessage(bytes32,uint256,string) signature', signature);
    await  token.addDAOAction(message.contract.address, 60, signature, {from: accounts[0]});
    await help.simulateCrowdsale(token, 10000000, web3.toWei(0.1, 'ether'), [4000000,3000000,2000000,1000000,0], accounts);
    await token.setStatus(4);
    var transfers = [];
    for (var i = 0; i < 15; i++)
      transfers.push(token.transfer(accounts[1], help.lif2LifWei(100), "", {from: accounts[2]}));
    for (i = 0; i < 6; i++)
      transfers.push(token.transfer(accounts[3], help.lif2LifWei(10), "", {from: accounts[1]}));
    await Promise.all(transfers);
    await help.checkToken(token, accounts, 10000000, [4001440,2998500,2000060,1000000,0], [6, 5, 2, 1, 0], [6, 15, 0, 0, 0], [16, 1, 7, 1, 0]);

    var data = message.contract.showMessage.getData( web3.toHex('Test Bytes32'), web3.toHex(666), 'Test String' ).toString('hex');
    await token.newProposal(message.contract.address, 0, 'Call showMessage(bytes32,uint256,string)', 100, signature, data, {from: accounts[1], value: web3.toWei(10, 'ether')});
    await token.vote(1, true, {from: accounts[2]});
    await token.vote(1, true, {from: accounts[3]});
    await token.executeProposal(1, {from: accounts[0]});
    await new Promise(function(resolve, reject){
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
    await help.checkToken(token, accounts, 10000000, [4001440,2998500,2000060,1000000,0], [6, 5, 2, 1, 0], [6, 15, 0, 0, 0], [16, 1, 7, 1, 0]);
  });

});
