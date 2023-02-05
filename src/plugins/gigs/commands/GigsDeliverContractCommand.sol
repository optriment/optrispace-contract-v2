// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {IGigsContractContract} from "../interfaces/IGigsContractContract.sol";
import {GigsContractEntity, GigsAbstractContractCommand} from "./GigsAbstractContractCommand.sol";

import "../interfaces/IGigsDeliverContractCommand.sol";

contract GigsDeliverContractCommand is IGigsDeliverContractCommand, GigsAbstractContractCommand {
    // Logs out delivered contract record
    event ContractDelivered(address contractAddress);

    error ContractorOnly();

    function gigsDeliverContract(address contractAddress) external {
        GigsContractEntity storage dto = getDTO(contractAddress);

        if (dto.contractorAddress != msg.sender) {
            revert ContractorOnly();
        }

        emit ContractDelivered(contractAddress);

        IGigsContractContract(contractAddress).deliver();

        dto.status = "delivered";
        dto.deliveredAt = uint64(block.timestamp); // solhint-disable-line not-rely-on-time

        updatePersonActivity(dto.contractorAddress);
    }
}
