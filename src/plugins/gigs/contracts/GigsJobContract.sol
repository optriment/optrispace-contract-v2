// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "../interfaces/IGigsJobContract.sol";

contract GigsJobContract is IGigsJobContract {
    error InvalidCustomerAddress();
    error CustomerMustNotBeDeployer();

    // NOTE: Do not forget to increase version value while adding new functions to the contract
    uint8 public immutable version = 1;
    // Address of OptriSpace Diamond Contract
    address public immutable deployerAddress = msg.sender;
    address public immutable customerAddress;

    constructor(address newCustomerAddress) {
        if (newCustomerAddress == address(0)) revert InvalidCustomerAddress();
        if (newCustomerAddress == deployerAddress) revert CustomerMustNotBeDeployer();

        _enforceEOA(newCustomerAddress, "CustomerMustBeEOA()");

        customerAddress = newCustomerAddress;
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
