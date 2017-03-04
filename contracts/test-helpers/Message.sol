pragma solidity ^0.4.8;

contract Message {

    event Show(bytes32 b32, uint256 number, string text);

    function showMessage(bytes32 _message, uint256 _number, string _text) constant returns (bool) {

        Show(_message, _number, _text);

        return true;

    }

}
