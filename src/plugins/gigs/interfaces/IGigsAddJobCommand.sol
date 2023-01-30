//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {GigsJobEntity} from "../entities/GigsJobEntity.sol";
import {GigsJobCategoryValue} from "../values/GigsJobCategoryValue.sol";

interface IGigsAddJobCommand {
    function gigsAddJob(
        address frontendNodeAddress,
        uint256 budget,
        string memory title,
        string memory description,
        uint8 categoryIndex
    ) external;
}
