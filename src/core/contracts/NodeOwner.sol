// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

contract NodeOwner {
    address public immutable issuer = msg.sender;
    address public immutable owner;

    address[] public nodes;
    mapping(address => bool) private _nodeExists;

    error InvalidOwnerAddress();
    error OwnerCannotBeIssuer();
    error OnlyIssuer();
    error InvalidNodeAddress();
    error FrontendNodeExists();

    constructor(address _owner) {
        if (_owner == address(0)) revert InvalidOwnerAddress();
        if (_owner == issuer) revert OwnerCannotBeIssuer();
        _enforceEOA(_owner, "OwnerMustBeEOA()");

        owner = _owner;
    }

    // TODO: https://consensys.github.io/smart-contract-best-practices/development-recommendations/solidity-specific/interface-types/
    function addNode(address nodeAddress) external {
        if (msg.sender != issuer) revert OnlyIssuer();
        if (nodeAddress == address(0)) revert InvalidNodeAddress();

        _enforceHasContractCode(nodeAddress, "NodeMustHaveCode()");

        if (_nodeExists[nodeAddress]) revert FrontendNodeExists();

        _nodeExists[nodeAddress] = true;
        nodes.push(nodeAddress);
    }

    function getNodes() external view returns (address[] memory ownedNodes) {
        return nodes;
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

    function _enforceEOA(address _address, string memory _errorMessage) private view {
        uint256 contractSize;
        // solhint-disable no-inline-assembly
        // slither-disable-next-line assembly
        assembly {
            contractSize := extcodesize(_address)
        }
        // solhint-enable no-inline-assembly

        require(contractSize == 0, _errorMessage);
    }
}
