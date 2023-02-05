// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "../interfaces/IGigsApplicationContract.sol";

contract GigsApplicationContract is IGigsApplicationContract {
    error InvalidJobAddress();
    error InvalidApplicantAddress();
    error ApplicantMustNotBeDeployer();

    // NOTE: Do not forget to increase version value while adding new functions to the contract
    uint8 public immutable version = 1;
    // Address of OptriSpace Diamond Contract
    address public immutable deployerAddress = msg.sender;
    address public immutable jobAddress;
    address public immutable applicantAddress;

    constructor(address newJobAddress, address newApplicantAddress) {
        if (newJobAddress == address(0)) revert InvalidJobAddress();
        if (newApplicantAddress == address(0)) revert InvalidApplicantAddress();
        if (newApplicantAddress == deployerAddress) revert ApplicantMustNotBeDeployer();

        _enforceHasContractCode(newJobAddress, "JobMustHaveCode()");
        _enforceEOA(newApplicantAddress, "ApplicantMustBeEOA()");

        jobAddress = newJobAddress;
        applicantAddress = newApplicantAddress;
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
