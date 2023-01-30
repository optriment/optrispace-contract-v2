//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {GigsJobEntity} from "../entities/GigsJobEntity.sol";

import {GigsJobCategoryValue} from "../values/GigsJobCategoryValue.sol";
import {GigsJobWithApplicationValue} from "../values/GigsJobWithApplicationValue.sol";
import {GigsStatsValue} from "../values/GigsStatsValue.sol";

interface IGigsPlugin {
    function gigsAddJobsCategory(string memory code, string memory label) external;

    function gigsGetStats() external view returns (GigsStatsValue memory stats);

    function gigsGetJobsCategories() external view returns (GigsJobCategoryValue[] memory categories);

    function gigsGetJob(address jobAddress) external view returns (bool exists, GigsJobEntity memory dto);

    function gigsGetJobs() external view returns (GigsJobEntity[] memory jobs);
}
