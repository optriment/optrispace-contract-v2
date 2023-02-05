// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AppStorage, LibAppStorage} from "../../../core/libraries/LibAppStorage.sol";
import {IGigsContractContract} from "../interfaces/IGigsContractContract.sol";
import {GigsContractEntity, GigsAbstractContractCommand} from "./GigsAbstractContractCommand.sol";
import {GigsFreelancerEntity} from "../entities/GigsFreelancerEntity.sol";

import "../interfaces/IGigsRefundContractCommand.sol";

contract GigsRefundContractCommand is IGigsRefundContractCommand, GigsAbstractContractCommand {
    // Logs out refunded contract record
    event ContractRefunded(address contractAddress);

    error CustomerOnly();

    function gigsRefundContract(address contractAddress) external {
        GigsContractEntity storage dto = getDTO(contractAddress);

        if (dto.customerAddress != msg.sender) {
            revert CustomerOnly();
        }

        emit ContractRefunded(contractAddress);

        IGigsContractContract(contractAddress).refund();

        dto.status = "closed";
        dto.refundedAt = uint64(block.timestamp); // solhint-disable-line not-rely-on-time
        dto.closedAt = uint64(block.timestamp); // solhint-disable-line not-rely-on-time

        AppStorage storage s = LibAppStorage.appStorage();

        GigsFreelancerEntity storage freelancer = s.gigsFreelancers[
            s.gigsFreelancerIndexByAddress[dto.contractorAddress]
        ];
        freelancer.failedContractsCount++;

        updatePersonActivity(dto.customerAddress);
    }
}
