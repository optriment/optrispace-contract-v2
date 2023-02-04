//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {LibDiamond} from "../../../core/libraries/LibDiamond.sol";
import {AppStorage, FrontendNode, LibAppStorage} from "../../../core/libraries/LibAppStorage.sol";
import {LibEvents} from "../../../core/libraries/LibEvents.sol";
import {GigsCustomerEntity} from "../entities/GigsCustomerEntity.sol";

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

        if (!s.gigsCustomerExists[msg.sender]) return jobs;

        GigsCustomerEntity memory customer = s.gigsCustomers[s.gigsCustomerIndexByAddress[msg.sender]];

        uint256 myJobsCount = customer.myJobs.length;

        jobs = new GigsJobEntity[](myJobsCount);

        uint256 i = 0;

        while (i < myJobsCount) {
            jobs[i] = s.gigsJobs[s.gigsJobIndexByAddress[customer.myJobs[i]]];

            unchecked {
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

        if (!s.gigsCustomerJobExists[msg.sender][jobAddress]) return applications;

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

        if (!s.gigsCustomerExists[msg.sender]) return contracts;

        GigsCustomerEntity memory customer = s.gigsCustomers[s.gigsCustomerIndexByAddress[msg.sender]];

        uint256 myContractsCount = customer.myContracts.length;

        contracts = new GigsContractEntity[](myContractsCount);

        uint256 i = 0;

        while (i < myContractsCount) {
            contracts[i] = s.gigsContracts[customer.myContracts[i]];

            unchecked {
                ++i;
            }
        }
    }
}
