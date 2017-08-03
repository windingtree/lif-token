// Extracted from zeppelin-solidity helper in:
// https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/test/helpers/advanceToBlock.js
module.exports = {
  advanceBlock: function() {
    return new Promise((resolve, reject) => {
      web3.currentProvider.sendAsync({
        jsonrpc: '2.0',
        method: 'evm_mine',
        id: Date.now(),
      }, (err, res) => {
        return err ? reject(err) : resolve(res)
      })
    })
  },

  // Advances the block number so that the last mined block is `number`.
  advanceToBlock: async function(number) {
    let advanceBlock = this.advanceBlock;
    if (web3.eth.blockNumber > number) {
      throw Error(`block number ${number} is in the past (current is ${web3.eth.blockNumber})`)
    }

    while (web3.eth.blockNumber < number) {
      await advanceBlock();
    }
  }
}
