//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {LibDiamond} from "../../../core/libraries/LibDiamond.sol";
import {AppStorage, FrontendNode, Member, LibAppStorage} from "../../../core/libraries/LibAppStorage.sol";
import {LibEvents} from "../../../core/libraries/LibEvents.sol";

import "../interfaces/IGigsCustomerService.sol";

contract GigsCustomerService is IGigsCustomerService {
    error InvalidJobAddress();
    error JobDoesNotExist();
    error CustomerOnly();
    error InvalidApplicationAddress();
    error ApplicationDoesNotExist();
    error ContractExists();

    function gigsGetMyJobs() external view returns (GigsJobEntity[] memory jobs) {
        AppStorage storage s = LibAppStorage.appStorage();

        address[] memory memberJobs = s.gigsMemberJobs[msg.sender];
        uint256 myJobsCount = memberJobs.length;

        jobs = new GigsJobEntity[](myJobsCount);

        uint256 i = 0;

        while (i < myJobsCount) {
            unchecked {
                jobs[i] = s.gigsJobs[s.gigsJobIndexByAddress[memberJobs[i]]];
                ++i;
            }
        }
    }

    function gigsGetApplications(
        address jobAddress
    ) external view returns (GigsApplicationEntity[] memory applications) {
        if (jobAddress == address(0)) revert InvalidJobAddress();

        AppStorage storage s = LibAppStorage.appStorage();

        if (!s.gigsJobAddressExists[jobAddress]) revert JobDoesNotExist();

        GigsJobEntity memory job = s.gigsJobs[s.gigsJobIndexByAddress[jobAddress]];

        if (job.customerAddress != msg.sender) revert CustomerOnly();

        if (!s.gigsMemberJobExists[msg.sender][jobAddress]) return applications;

        address[] memory jobApplications = s.gigsJobApplications[jobAddress];
        uint256 jobApplicationsCount = jobApplications.length;

        applications = new GigsApplicationEntity[](jobApplicationsCount);

        uint256 i = 0;

        while (i < jobApplicationsCount) {
            unchecked {
                applications[i] = s.gigsApplications[jobApplications[i]];
                ++i;
            }
        }
    }

    function gigsGetJobAndApplicationForContract(
        address jobAddress,
        address applicationAddress
    ) external view returns (GigsJobWithApplicationValue memory) {
        if (jobAddress == address(0)) revert InvalidJobAddress();
        if (applicationAddress == address(0)) revert InvalidApplicationAddress();

        AppStorage storage s = LibAppStorage.appStorage();

        if (!s.gigsJobAddressExists[jobAddress]) revert JobDoesNotExist();

        GigsJobEntity memory job = s.gigsJobs[s.gigsJobIndexByAddress[jobAddress]];

        if (job.customerAddress != msg.sender) revert CustomerOnly();

        if (!s.gigsJobApplicationExists[jobAddress][applicationAddress]) revert ApplicationDoesNotExist();

        if (s.gigsContractByJobAndApplicationExists[jobAddress][applicationAddress]) revert ContractExists();

        GigsApplicationEntity memory application = s.gigsApplications[applicationAddress];

        return
            GigsJobWithApplicationValue({
                jobAddress: job.id,
                applicationAddress: application.id,
                applicantAddress: application.applicantAddress,
                budget: job.budget,
                serviceFee: application.serviceFee,
                title: job.title,
                description: job.description,
                comment: application.comment
            });
    }

    function gigsGetContractsAsCustomer() external view returns (GigsContractEntity[] memory contracts) {
        AppStorage storage s = LibAppStorage.appStorage();

        address[] memory myContracts = s.gigsMemberContractsAsCustomer[msg.sender];
        uint256 myContractsCount = myContracts.length;

        contracts = new GigsContractEntity[](myContractsCount);

        uint256 i = 0;

        while (i < myContractsCount) {
            unchecked {
                contracts[i] = s.gigsContracts[myContracts[i]];
                ++i;
            }
        }
    }
}
