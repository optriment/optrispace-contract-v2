//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AppStorage, LibAppStorage} from "../../../core/libraries/LibAppStorage.sol";
import {GigsJobEntity} from "../entities/GigsJobEntity.sol";
import {GigsApplicationEntity} from "../entities/GigsApplicationEntity.sol";

import "../interfaces/IGigsGetMyApplicationsQuery.sol";

contract GigsGetMyApplicationsQuery is IGigsGetMyApplicationsQuery {
    function gigsGetMyApplications() external view returns (GigsMyApplicationValue[] memory applications) {
        AppStorage storage s = LibAppStorage.appStorage();

        address[] memory myApplications = s.gigsMemberApplications[msg.sender];
        uint256 myApplicationsCount = myApplications.length;

        applications = new GigsMyApplicationValue[](myApplicationsCount);

        uint256 i = 0;

        while (i < myApplicationsCount) {
            GigsApplicationEntity memory application = s.gigsApplications[myApplications[i]];
            GigsJobEntity memory job = s.gigsJobs[s.gigsJobIndexByAddress[application.jobAddress]];

            applications[i] = GigsMyApplicationValue({
                jobAddress: job.id,
                applicationAddress: application.id,
                contractAddress: application.contractAddress,
                applicantAddress: application.applicantAddress,
                hasContract: application.hasContract,
                jobTitle: job.title,
                jobDescription: job.description,
                applicationComment: application.comment,
                jobBudget: job.budget,
                applicationServiceFee: application.serviceFee,
                jobCategoryCode: job.category.code,
                jobCategoryLabel: job.category.label,
                applicationCreatedAt: application.createdAt
            });

            unchecked {
                ++i;
            }
        }
    }
}
