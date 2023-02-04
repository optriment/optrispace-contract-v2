//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AppStorage, LibAppStorage} from "../../../core/libraries/LibAppStorage.sol";

import "../interfaces/IGigsGetMyFreelancerProfileQuery.sol";

contract GigsGetMyFreelancerProfileQuery is IGigsGetMyFreelancerProfileQuery {
    function gigsGetMyFreelancerProfile() external view returns (bool exists, GigsFreelancerEntity memory profile) {
        AppStorage storage s = LibAppStorage.appStorage();

        if (s.gigsFreelancerExists[msg.sender]) {
            exists = true;
            profile = s.gigsFreelancers[s.gigsFreelancerIndexByAddress[msg.sender]];
        }
    }
}
