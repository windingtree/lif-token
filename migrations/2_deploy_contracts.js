var Message = artifacts.require("Message.sol");
var LifToken = artifacts.require("LifToken.sol");
var LifCrowdsale = artifacts.require("LifCrowdsale.sol");

module.exports = function(deployer) {
  deployer.deploy(Message);
  deployer.deploy(LifToken);
  //deployer.deploy(LifCrowdsale);
};
