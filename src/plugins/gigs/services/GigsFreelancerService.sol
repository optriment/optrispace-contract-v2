//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {LibDiamond} from "../../../core/libraries/LibDiamond.sol";
import {AppStorage, LibAppStorage} from "../../../core/libraries/LibAppStorage.sol";
import {LibEvents} from "../../../core/libraries/LibEvents.sol";

import {GigsApplicationContract} from "../contracts/GigsApplicationContract.sol";

import "../interfaces/IGigsFreelancerService.sol";

contract GigsFreelancerService is IGigsFreelancerService {
    error InvalidJobAddress();
    error JobDoesNotExist();
    error ApplicantsOnly();

    function gigsGetMyApplication(
        address jobAddress
    ) external view returns (bool exists, GigsApplicationEntity memory dto) {
        if (jobAddress == address(0)) revert InvalidJobAddress();

        AppStorage storage s = LibAppStorage.appStorage();

        if (!s.gigsJobAddressExists[jobAddress]) revert JobDoesNotExist();

        GigsJobEntity memory job = s.gigsJobs[s.gigsJobIndexByAddress[jobAddress]];

        if (job.customerAddress == msg.sender) revert ApplicantsOnly();

        if (!s.gigsJobApplicantExists[jobAddress][msg.sender]) return (false, dto);

        uint256 applicationIndex = s.gigsJobApplicationsMapping[jobAddress][msg.sender];
        address applicationAddress = s.gigsJobApplications[jobAddress][applicationIndex];

        return (true, s.gigsApplications[applicationAddress]);
    }

    function gigsGetContractsAsContractor() external view returns (GigsContractEntity[] memory contracts) {
        AppStorage storage s = LibAppStorage.appStorage();

        address[] memory myContracts = s.gigsMemberContractsAsContractor[msg.sender];
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
