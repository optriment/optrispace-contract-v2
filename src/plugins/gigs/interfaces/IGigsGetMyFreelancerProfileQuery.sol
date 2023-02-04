//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {GigsFreelancerEntity} from "../entities/GigsFreelancerEntity.sol";

interface IGigsGetMyFreelancerProfileQuery {
    function gigsGetMyFreelancerProfile() external view returns (bool exists, GigsFreelancerEntity memory profile);
}
