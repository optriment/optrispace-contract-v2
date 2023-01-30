//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {IGigsContractContract} from "../interfaces/IGigsContractContract.sol";
import {GigsContractEntity, GigsAbstractContractCommand} from "./GigsAbstractContractCommand.sol";

import "../interfaces/IGigsStartContractCommand.sol";

contract GigsStartContractCommand is IGigsStartContractCommand, GigsAbstractContractCommand {
    // Logs out started contract record
    event ContractStarted(address contractAddress);

    error ContractorOnly();

    function gigsStartContract(address contractAddress) external {
        GigsContractEntity storage dto = getDTO(contractAddress);

        if (dto.contractorAddress != msg.sender) {
            revert ContractorOnly();
        }

        emit ContractStarted(contractAddress);

        IGigsContractContract(contractAddress).start();

        dto.status = "started";
        dto.startedAt = uint64(block.timestamp); // solhint-disable-line not-rely-on-time
    }
}
