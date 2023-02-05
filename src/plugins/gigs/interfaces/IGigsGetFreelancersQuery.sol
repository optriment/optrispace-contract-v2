// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {GigsFreelancerValue} from "../values/GigsFreelancerValue.sol";

interface IGigsGetFreelancersQuery {
    function gigsGetFreelancers() external view returns (GigsFreelancerValue[] memory freelancers);
}
