// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {IGigsContractContract} from "../interfaces/IGigsContractContract.sol";
import {GigsContractEntity, GigsAbstractContractCommand} from "./GigsAbstractContractCommand.sol";

import "../interfaces/IGigsAcceptContractCommand.sol";

contract GigsAcceptContractCommand is IGigsAcceptContractCommand, GigsAbstractContractCommand {
    // Logs out accepted contract record
    event ContractAccepted(address contractAddress);

    error ContractorOnly();

    function gigsAcceptContract(address contractAddress) external {
        GigsContractEntity storage dto = getDTO(contractAddress);

        if (dto.contractorAddress != msg.sender) {
            revert ContractorOnly();
        }

        emit ContractAccepted(contractAddress);

        IGigsContractContract(contractAddress).accept();

        dto.status = "accepted";
        dto.acceptedAt = uint64(block.timestamp); // solhint-disable-line not-rely-on-time

        updatePersonActivity(dto.contractorAddress);
    }
}
