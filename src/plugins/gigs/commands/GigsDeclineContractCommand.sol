// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {IGigsContractContract} from "../interfaces/IGigsContractContract.sol";
import {GigsContractEntity, GigsAbstractContractCommand} from "./GigsAbstractContractCommand.sol";

import "../interfaces/IGigsDeclineContractCommand.sol";

contract GigsDeclineContractCommand is IGigsDeclineContractCommand, GigsAbstractContractCommand {
    // Logs out declined contract record
    event ContractDeclined(address contractAddress);

    error CustomerOnly();

    function gigsDeclineContract(address contractAddress) external {
        GigsContractEntity storage dto = getDTO(contractAddress);

        if (dto.customerAddress != msg.sender) {
            revert CustomerOnly();
        }

        emit ContractDeclined(contractAddress);

        IGigsContractContract(contractAddress).decline();

        dto.status = "declined";
        dto.declinedAt = uint64(block.timestamp); // solhint-disable-line not-rely-on-time

        updatePersonActivity(dto.customerAddress);
    }
}
