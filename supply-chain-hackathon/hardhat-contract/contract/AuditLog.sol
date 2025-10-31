// File: hardhat-contract/contracts/AuditLog.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

contract AuditLog is Ownable {
    constructor(address initialOwner) Ownable(initialOwner) {}

    struct Item {
        string name;
        string location; // initial location
        string timestamp; // human-readable, provided by backend
        address currentOwner;
        bool exists;
    }

    struct TransferRecord {
        address from;
        address to;
        string location;
        string timestamp;
    }

    // Backward-compatible scan view for existing frontend
    struct ScanEvent {
        uint256 timestamp;
        address handlerAddress;
        string locationData;
    }

    mapping(uint256 => Item) public items;
    mapping(uint256 => TransferRecord[]) public transferHistory;

    // Mapping: ItemId => Array of Scan Events (legacy audit trail)
    mapping(uint256 => ScanEvent[]) public itemHistory;

    mapping(address => bool) public isAuthorizedHandler;

    function setHandlerAuthorization(address _handler, bool _isAuthorized) public onlyOwner {
        isAuthorizedHandler[_handler] = _isAuthorized;
    }

    // New: add item with details
    function addItem(
        uint256 _itemId,
        string memory _name,
        string memory _location,
        string memory _timestamp,
        address _owner
    ) public onlyOwner {
        require(!items[_itemId].exists, "Item already exists");
        items[_itemId] = Item({
            name: _name,
            location: _location,
            timestamp: _timestamp,
            currentOwner: _owner,
            exists: true
        });
    }

    // New: transfer/scan record
    function transferItem(
        uint256 _itemId,
        address _to,
        string memory _location,
        string memory _timestamp
    ) public onlyOwner {
        require(items[_itemId].exists, "Item not found");
        require(isAuthorizedHandler[_to], "Handler not authorized");
        address prev = items[_itemId].currentOwner;
        items[_itemId].currentOwner = _to;
        transferHistory[_itemId].push(TransferRecord({
            from: prev,
            to: _to,
            location: _location,
            timestamp: _timestamp
        }));

        // Also push legacy scan for existing UI readers
        itemHistory[_itemId].push(ScanEvent({
            timestamp: block.timestamp,
            handlerAddress: _to,
            locationData: _location
        }));
    }

    function getItemHistory(uint256 _itemId) public view returns (TransferRecord[] memory) {
        return transferHistory[_itemId];
    }

    // Backward-compatible
    function registerItem(uint256 _itemId) public onlyOwner {
        require(!items[_itemId].exists, "Item already exists");
        items[_itemId] = Item({
            name: "",
            location: "",
            timestamp: "",
            currentOwner: owner(),
            exists: true
        });
    }

    function addScan(
        uint256 _itemId,
        address _handler,
        string memory _locationData
    ) public onlyOwner {
        require(items[_itemId].exists, "Item not found");
        require(isAuthorizedHandler[_handler], "Handler not authorized");
        itemHistory[_itemId].push(ScanEvent({
            timestamp: block.timestamp,
            handlerAddress: _handler,
            locationData: _locationData
        }));
    }

    function getHistory(uint256 _itemId) public view returns (ScanEvent[] memory) {
        return itemHistory[_itemId];
    }
}