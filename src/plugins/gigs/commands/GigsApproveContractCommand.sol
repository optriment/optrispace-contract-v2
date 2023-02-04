//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AppStorage, LibAppStorage} from "../../../core/libraries/LibAppStorage.sol";
import {IGigsContractContract} from "../interfaces/IGigsContractContract.sol";
import {GigsContractEntity, GigsAbstractContractCommand} from "./GigsAbstractContractCommand.sol";
import {GigsFreelancerEntity} from "../entities/GigsFreelancerEntity.sol";

import "../interfaces/IGigsApproveContractCommand.sol";

contract GigsApproveContractCommand is IGigsApproveContractCommand, GigsAbstractContractCommand {
    // Logs out approved contract record
    event ContractApproved(address contractAddress);

    error CustomerOnly();

    function gigsApproveContract(address contractAddress) external {
        GigsContractEntity storage dto = getDTO(contractAddress);

        if (dto.customerAddress != msg.sender) {
            revert CustomerOnly();
        }

        emit ContractApproved(contractAddress);

        IGigsContractContract(contractAddress).approve();

        dto.status = "approved";
        dto.approvedAt = uint64(block.timestamp); // solhint-disable-line not-rely-on-time

        updatePersonActivity(dto.customerAddress);

        AppStorage storage s = LibAppStorage.appStorage();

        GigsFreelancerEntity storage freelancer = s.gigsFreelancers[
            s.gigsFreelancerIndexByAddress[dto.contractorAddress]
        ];
        freelancer.succeededContractsCount++;
    }
}
