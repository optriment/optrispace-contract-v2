//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

contract Member {
    address public immutable issuer = msg.sender;
    address public immutable owner;
    string public displayName = "";

    error InvalidOwnerAddress();
    error InvalidOwner();
    error OnlyIssuer();
    error DisplayNameRequired();

    constructor(address _owner) {
        if (_owner == address(0)) revert InvalidOwnerAddress();
        if (_owner == issuer) revert InvalidOwner();
        _enforceEOA(_owner, "OwnerMustBeEOA()");

        owner = _owner;
    }

    function setDisplayName(string memory newDisplayName) external {
        if (msg.sender != issuer) revert OnlyIssuer();
        if (bytes(newDisplayName).length == 0) revert DisplayNameRequired();

        displayName = newDisplayName;
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
