pragma solidity ^0.4.18;

contract Message {

    event Show(bytes32 b32, uint256 number, string text);

    function showMessage(bytes32 _message, uint256 _number, string _text) public view {

      Show(_message, _number, _text);

    }

    function fail() public {

      revert();

    }

    function call(address to, bytes data) public returns (bool) {
      if (to.call(data))
        return true;
      else
        return false;
    }

}
