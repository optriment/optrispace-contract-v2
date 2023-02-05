// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {GigsMyApplicationValue} from "../values/GigsMyApplicationValue.sol";

interface IGigsGetMyApplicationsQuery {
    function gigsGetMyApplications() external view returns (GigsMyApplicationValue[] memory applications);
}
