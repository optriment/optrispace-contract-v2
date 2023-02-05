// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AppStorage, PersonEntity, LibAppStorage} from "../../../core/libraries/LibAppStorage.sol";
import {GigsFreelancerEntity} from "../entities/GigsFreelancerEntity.sol";

import "../interfaces/IGigsGetFreelancersQuery.sol";

contract GigsGetFreelancersQuery is IGigsGetFreelancersQuery {
    function gigsGetFreelancers() external view returns (GigsFreelancerValue[] memory freelancers) {
        AppStorage storage s = LibAppStorage.appStorage();

        freelancers = new GigsFreelancerValue[](s.gigsFreelancersCount);

        uint256 i = 0;

        while (i < s.gigsFreelancersCount) {
            GigsFreelancerEntity memory freelancer = s.gigsFreelancers[i];

            PersonEntity memory person = s.people[s.personIndexByAddress[freelancer.owner]];

            freelancers[i] = GigsFreelancerValue({
                id: freelancer.owner,
                displayName: person.displayName,
                about: freelancer.about,
                totalContractsCount: freelancer.myContracts.length,
                failedContractsCount: freelancer.failedContractsCount,
                succeededContractsCount: freelancer.succeededContractsCount,
                lastActivityAt: person.lastActivityAt
            });

            unchecked {
                ++i;
            }
        }
    }
}
