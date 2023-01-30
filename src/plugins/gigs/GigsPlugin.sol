//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {LibDiamond} from "../../core/libraries/LibDiamond.sol";
import {AppStorage, LibAppStorage} from "../../core/libraries/LibAppStorage.sol";

import "./interfaces/IGigsPlugin.sol";

contract GigsPlugin is IGigsPlugin {
    // Logs out created jobs category record
    event JobsCategoryCreated(string code, uint256 newIndex);

    error CodeRequired();
    error LabelRequired();
    error JobsCategoryCodeExists();

    function gigsAddJobsCategory(string memory code, string memory label) external {
        LibDiamond.enforceIsContractOwner();

        if (bytes(code).length == 0) revert CodeRequired();
        if (bytes(label).length == 0) revert LabelRequired();

        AppStorage storage s = LibAppStorage.appStorage();

        if (s.gigsJobsCategoryCodeExists[code]) revert JobsCategoryCodeExists();

        uint256 newIndex = s.gigsJobsCategoriesCount;

        s.gigsJobsCategoryCodeExists[code] = true;
        s.gigsJobsCategoryIndexByCode[code] = newIndex;
        s.gigsJobsCategories[newIndex] = GigsJobCategoryValue({code: code, label: label});
        s.gigsJobsCategoriesCount++;

        emit JobsCategoryCreated(code, newIndex);
    }

    function gigsGetStats() external view returns (GigsStatsValue memory stats) {
        AppStorage storage s = LibAppStorage.appStorage();

        stats.jobsCount = s.gigsJobsCount;
        stats.applicationsCount = s.gigsApplicationsCount;
        stats.contractsCount = s.gigsContractsCount;
        stats.jobsCategoriesCount = s.gigsJobsCategoriesCount;
    }

    function gigsGetJobsCategories() external view returns (GigsJobCategoryValue[] memory categories) {
        AppStorage storage s = LibAppStorage.appStorage();

        categories = new GigsJobCategoryValue[](s.gigsJobsCategoriesCount);

        uint256 i = 0;

        while (i < s.gigsJobsCategoriesCount) {
            unchecked {
                categories[i] = s.gigsJobsCategories[i];
                ++i;
            }
        }
    }

    function gigsGetJob(address jobAddress) external view returns (bool exists, GigsJobEntity memory dto) {
        AppStorage storage s = LibAppStorage.appStorage();

        if (s.gigsJobAddressExists[jobAddress]) {
            exists = true;
            dto = s.gigsJobs[s.gigsJobIndexByAddress[jobAddress]];
        }
    }

    function gigsGetJobs() external view returns (GigsJobEntity[] memory jobs) {
        AppStorage storage s = LibAppStorage.appStorage();

        jobs = new GigsJobEntity[](s.gigsJobsCount);

        uint256 i = 0;

        while (i < s.gigsJobsCount) {
            unchecked {
                jobs[i] = s.gigsJobs[i];
                ++i;
            }
        }
    }
}
