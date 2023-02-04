// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {GigsFreelancerValue} from "../values/GigsFreelancerValue.sol";

interface IGigsGetFreelancerQuery {
    function gigsGetFreelancer(
        address freelancerAddress
    ) external view returns (bool exists, GigsFreelancerValue memory freelancer);
}
