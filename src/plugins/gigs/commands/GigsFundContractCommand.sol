//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {IGigsContractContract} from "../interfaces/IGigsContractContract.sol";
import {GigsContractEntity, GigsAbstractContractCommand} from "./GigsAbstractContractCommand.sol";

import "../interfaces/IGigsFundContractCommand.sol";

contract GigsFundContractCommand is IGigsFundContractCommand, GigsAbstractContractCommand {
    // Logs out funded contract record
    event ContractFunded(address contractAddress);

    error CustomerOnly();

    function gigsFundContract(address contractAddress) external payable {
        GigsContractEntity storage dto = getDTO(contractAddress);

        if (dto.customerAddress != msg.sender) {
            revert CustomerOnly();
        }

        emit ContractFunded(contractAddress);

        uint64 workShouldBeStartedBefore = _addDaysToTimestamp(dto.daysToStartWork);
        uint64 resultShouldBeDeliveredBefore = _addDaysToTimestamp(dto.durationInDays);

        IGigsContractContract(contractAddress).fund{value: msg.value}(
            workShouldBeStartedBefore,
            resultShouldBeDeliveredBefore
        );

        dto.status = "funded";
        dto.fundedAt = uint64(block.timestamp); // solhint-disable-line not-rely-on-time
        dto.workShouldBeStartedBefore = workShouldBeStartedBefore;
        dto.resultShouldBeDeliveredBefore = resultShouldBeDeliveredBefore;
    }

    function _addDaysToTimestamp(uint value) private view returns (uint64) {
        return uint64(block.timestamp + (value * 1 days)); // solhint-disable-line not-rely-on-time
    }
}
