// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {LibEvents} from "../libraries/LibEvents.sol";

import {FrontendNodeEventValue} from "../values/FrontendNodeEventValue.sol";

contract FrontendNode {
    address public immutable issuer = msg.sender;

    /// NOTE: Owner is an address of a NodeOwner, not an EOA
    address public immutable owner;

    // slither-disable-next-line immutable-states
    string public displayName;

    error InvalidNodeOwnerAddress();
    error InvalidOwner();
    error InvalidMemberAddress();
    error DisplayNameRequired();
    error OnlyIssuer();

    FrontendNodeEventValue[] public events;
    mapping(string => uint256) public eventsCountByType;

    // Key - Member address, not an EOA, value - timestamp
    mapping(address => uint64) private _clients;
    mapping(address => bool) private _clientExists;
    uint256 public clientsCount;

    // TODO: https://consensys.github.io/smart-contract-best-practices/development-recommendations/solidity-specific/interface-types/
    constructor(address _nodeOwner, string memory _displayName) {
        if (_nodeOwner == address(0)) revert InvalidNodeOwnerAddress();
        if (_nodeOwner == issuer) revert InvalidOwner();

        _enforceHasContractCode(_nodeOwner, "NodeOwnerMustHaveCode()");

        if (bytes(_displayName).length == 0) revert DisplayNameRequired();

        owner = _nodeOwner;
        displayName = _displayName;
    }

    function addEvent(string memory eventType, address newRecordAddress) external {
        if (msg.sender != issuer) revert OnlyIssuer();

        _addEvent(eventType, newRecordAddress);
    }

    function getEventByIndex(uint256 index) external view returns (FrontendNodeEventValue memory e) {
        return events[index];
    }

    function getEventTypesCount() external view returns (string[4] memory eventTypes, uint256[4] memory eventsCount) {
        eventTypes[0] = LibEvents.EVENT_CLIENT_CREATED;
        eventsCount[0] = eventsCountByType[LibEvents.EVENT_CLIENT_CREATED];

        eventTypes[1] = LibEvents.EVENT_JOB_CREATED;
        eventsCount[1] = eventsCountByType[LibEvents.EVENT_JOB_CREATED];

        eventTypes[2] = LibEvents.EVENT_APPLICATION_CREATED;
        eventsCount[2] = eventsCountByType[LibEvents.EVENT_APPLICATION_CREATED];

        eventTypes[3] = LibEvents.EVENT_CONTRACT_CREATED;
        eventsCount[3] = eventsCountByType[LibEvents.EVENT_CONTRACT_CREATED];
    }

    function addClient(address memberContractAddress) external {
        if (memberContractAddress == address(0)) revert InvalidMemberAddress();
        if (msg.sender != issuer) revert OnlyIssuer();

        _enforceHasContractCode(memberContractAddress, "MemberMustHaveCode()");

        if (_clientExists[memberContractAddress]) return;

        _clients[memberContractAddress] = uint64(block.timestamp); // solhint-disable-line not-rely-on-time
        _clientExists[memberContractAddress] = true;
        clientsCount++;

        _addEvent(LibEvents.EVENT_CLIENT_CREATED, memberContractAddress);
    }

    function _addEvent(string memory eventType, address newRecordAddress) private {
        events.push(
            FrontendNodeEventValue({
                timestamp: uint64(block.timestamp), // solhint-disable-line not-rely-on-time
                eventType: eventType,
                newRecordAddress: newRecordAddress
            })
        );

        eventsCountByType[eventType]++;
    }

    function _enforceHasContractCode(address _contract, string memory _errorMessage) private view {
        uint256 contractSize;
        // solhint-disable no-inline-assembly
        // slither-disable-next-line assembly
        assembly {
            contractSize := extcodesize(_contract)
        }
        // solhint-enable no-inline-assembly
        require(contractSize > 0, _errorMessage);
    }
}
