// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {GigsJobEntity} from "../entities/GigsJobEntity.sol";
import {GigsApplicationEntity} from "../entities/GigsApplicationEntity.sol";
import {GigsContractEntity} from "../entities/GigsContractEntity.sol";

interface IGigsAddContractCommand {
    function gigsAddContract(
        address frontendNodeAddress,
        address jobAddress,
        address applicationAddress,
        string memory title,
        string memory description,
        uint256 value,
        uint8 durationInDays,
        uint8 daysToStartWork
    ) external;
}
