// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {GigsJobEntity} from "../entities/GigsJobEntity.sol";
import {GigsApplicationEntity} from "../entities/GigsApplicationEntity.sol";
import {GigsContractEntity} from "../entities/GigsContractEntity.sol";

interface IGigsFreelancerService {
    function gigsGetMyApplication(
        address jobAddress
    ) external view returns (bool exists, GigsApplicationEntity memory dto);

    function gigsGetContractsAsContractor() external view returns (GigsContractEntity[] memory contracts);
}
