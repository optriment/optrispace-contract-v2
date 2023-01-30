//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "../interfaces/IGigsContractContract.sol";

contract GigsContractContract is IGigsContractContract {
    event WorkShouldBeStartedBeforeChanged(address contractAddress, uint64 value);
    event ResultShouldBeDeliveredBeforeChanged(address contractAddress, uint64 value);

    error DeployerOnly();
    error NotAvailableNow();
    error InvalidJobAddress();
    error InvalidApplicationAddress();
    error InvalidCustomerAddress();
    error InvalidContractorAddress();
    error ValueRequired();
    error AmountIsTooSmall();
    error TooLateForWork();
    error TooLateForDeliverResult();
    error InvalidState();

    // NOTE: Do not forget to increase version value while adding new functions to the contract
    uint8 public immutable version = 1;
    // Address of OptriSpace Diamond Contract
    address public immutable deployerAddress = msg.sender;
    address public immutable jobAddress;
    address public immutable applicationAddress;
    address public immutable customerAddress;
    address public immutable contractorAddress;
    uint256 public immutable value;
    uint64 public workShouldBeStartedBefore;
    uint64 public resultShouldBeDeliveredBefore;
    States public state;

    constructor(
        address newJobAddress,
        address newApplicationAddress,
        address newCustomerAddress,
        address newContractorAddress,
        uint256 newValue
    ) {
        // TODO: Check that msg.sender is a OptriSpace Diamond address

        if (newJobAddress == address(0)) revert InvalidJobAddress();
        if (newApplicationAddress == address(0)) revert InvalidApplicationAddress();
        if (newCustomerAddress == address(0)) revert InvalidCustomerAddress();
        if (newContractorAddress == address(0)) revert InvalidContractorAddress();
        if (newValue == 0) revert ValueRequired();

        _enforceHasContractCode(newJobAddress, "JobMustHaveCode()");
        _enforceHasContractCode(newApplicationAddress, "ApplicationMustHaveCode()");
        _enforceEOA(newCustomerAddress, "CustomerMustBeEOA()");
        _enforceEOA(newContractorAddress, "ContractorMustBeEOA()");

        jobAddress = newJobAddress;
        applicationAddress = newApplicationAddress;
        customerAddress = newCustomerAddress;
        contractorAddress = newContractorAddress;
        value = newValue;
        state = States.Created;
    }

    function accept() external {
        if (msg.sender != deployerAddress) revert DeployerOnly();
        if (state != States.Created) revert NotAvailableNow();

        state = States.Accepted;
    }

    function fund(uint64 newWorkShouldBeStartedBefore, uint64 newResultShouldBeDeliveredBefore) external payable {
        if (msg.sender != deployerAddress) revert DeployerOnly();
        if (state != States.Accepted) revert NotAvailableNow();

        if (msg.value < value) revert AmountIsTooSmall();

        workShouldBeStartedBefore = newWorkShouldBeStartedBefore;
        resultShouldBeDeliveredBefore = newResultShouldBeDeliveredBefore;

        emit WorkShouldBeStartedBeforeChanged(address(this), newWorkShouldBeStartedBefore);
        emit ResultShouldBeDeliveredBeforeChanged(address(this), newResultShouldBeDeliveredBefore);

        state = States.Funded;
    }

    function start() external {
        if (msg.sender != deployerAddress) revert DeployerOnly();
        if (state != States.Funded) revert NotAvailableNow();

        // solhint-disable not-rely-on-time
        // slither-disable-next-line timestamp
        if (block.timestamp > workShouldBeStartedBefore) revert TooLateForWork();
        // solhint-enable not-rely-on-time

        state = States.Started;
    }

    function deliver() external {
        if (msg.sender != deployerAddress) revert DeployerOnly();
        if (state != States.Started) revert NotAvailableNow();

        // solhint-disable not-rely-on-time
        // slither-disable-next-line timestamp
        if (block.timestamp > resultShouldBeDeliveredBefore) revert TooLateForDeliverResult();
        // solhint-enable not-rely-on-time

        state = States.Delivered;
    }

    function approve() external {
        if (msg.sender != deployerAddress) revert DeployerOnly();
        if (state != States.Started && state != States.Delivered) revert NotAvailableNow();

        state = States.Approved;
    }

    function decline() external {
        if (msg.sender != deployerAddress) revert DeployerOnly();
        if (state != States.Delivered) revert NotAvailableNow();

        state = States.Declined;
    }

    function withdraw() external {
        if (msg.sender != deployerAddress) revert DeployerOnly();
        if (state != States.Approved) revert NotAvailableNow();

        state = States.Closed;

        // solhint-disable avoid-low-level-calls
        // slither-disable-next-line low-level-calls
        (bool success, ) = contractorAddress.call{value: address(this).balance}("");
        // solhint-enable avoid-low-level-calls
        require(success, "withdraw failed");
    }

    function refund() external {
        if (msg.sender != deployerAddress) revert DeployerOnly();

        if (!_isRefundable()) revert NotAvailableNow();

        state = States.Closed;

        // solhint-disable avoid-low-level-calls
        // slither-disable-next-line low-level-calls
        (bool success, ) = customerAddress.call{value: address(this).balance}("");
        // solhint-enable avoid-low-level-calls
        require(success, "refund failed");
    }

    // solhint-disable-next-line code-complexity
    function getStatus() external view returns (string memory) {
        if (state == States.Created) return "created";
        if (state == States.Accepted) return "accepted";
        if (state == States.Funded) return "funded";
        if (state == States.Started) return "started";
        if (state == States.Delivered) return "delivered";
        if (state == States.Approved) return "approved";
        if (state == States.Declined) return "declined";
        if (state == States.Closed) return "closed";

        revert InvalidState();
    }

    //
    // Private
    //

    // slither-disable-next-line timestamp
    function _isRefundable() private view returns (bool) {
        // solhint-disable not-rely-on-time
        if (state == States.Funded && block.timestamp > workShouldBeStartedBefore) return true;
        if (state == States.Started && block.timestamp > resultShouldBeDeliveredBefore) return true;
        // solhint-enable not-rely-on-time
        if (state == States.Declined) return true;

        return false;
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
