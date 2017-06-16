var Message = artifacts.require("Message.sol");
var LifToken = artifacts.require("LifToken.sol");
var LifCrowdsale = artifacts.require("LifCrowdsale.sol");
var FuturePayment = artifacts.require("FuturePayment.sol");

module.exports = function(deployer) {
  deployer.deploy(Message);
  deployer.deploy(LifToken);
  deployer.deploy(LifCrowdsale);
  deployer.deploy(FuturePayment);
};
