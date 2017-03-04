var Message = artifacts.require("Message.sol");
var LifToken = artifacts.require("LifToken.sol");

module.exports = function(deployer) {
  deployer.deploy(Message);
  deployer.deploy(LifToken);
};
