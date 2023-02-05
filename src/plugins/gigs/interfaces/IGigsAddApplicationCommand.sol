// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {GigsJobEntity} from "../entities/GigsJobEntity.sol";
import {GigsApplicationEntity} from "../entities/GigsApplicationEntity.sol";

interface IGigsAddApplicationCommand {
    function gigsAddApplication(
        address frontendNodeAddress,
        address jobAddress,
        string memory comment,
        uint256 serviceFee
    ) external;
}
