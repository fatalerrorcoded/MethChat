// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

contract MethChat {
    address owner;
    mapping(address => string) public names;

    constructor() {
        owner = msg.sender;
    }

    event Message(address indexed from, string message);
    event NameChanged(address indexed from);

    function send(string calldata message) public {
        require(bytes(message).length <= 512, "Message too long");
        emit Message(msg.sender, message);
    }

    function setName(string calldata name) public {
        require(bytes(name).length <= 32, "Name too long");
        emit NameChanged(msg.sender);
    }

    function destroy() public {
        require(owner == msg.sender);
        selfdestruct(payable(msg.sender));
    }
}
