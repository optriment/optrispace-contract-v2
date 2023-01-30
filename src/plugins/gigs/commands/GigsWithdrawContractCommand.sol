//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {IGigsContractContract} from "../interfaces/IGigsContractContract.sol";
import {GigsContractEntity, GigsAbstractContractCommand} from "./GigsAbstractContractCommand.sol";

import "../interfaces/IGigsWithdrawContractCommand.sol";

contract GigsWithdrawContractCommand is IGigsWithdrawContractCommand, GigsAbstractContractCommand {
    // Logs out withdrew contract record
    event ContractWithdrew(address contractAddress);

    error ContractorOnly();

    function gigsWithdrawContract(address contractAddress) external {
        GigsContractEntity storage dto = getDTO(contractAddress);

        if (dto.contractorAddress != msg.sender) {
            revert ContractorOnly();
        }

        emit ContractWithdrew(contractAddress);

        IGigsContractContract(contractAddress).withdraw();

        dto.status = "closed";
        dto.withdrewAt = uint64(block.timestamp); // solhint-disable-line not-rely-on-time
        dto.closedAt = uint64(block.timestamp); // solhint-disable-line not-rely-on-time
    }
}
