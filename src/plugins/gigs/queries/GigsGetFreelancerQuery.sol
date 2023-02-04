//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AppStorage, PersonEntity, LibAppStorage} from "../../../core/libraries/LibAppStorage.sol";
import {GigsFreelancerEntity} from "../entities/GigsFreelancerEntity.sol";

import "../interfaces/IGigsGetFreelancerQuery.sol";

contract GigsGetFreelancerQuery is IGigsGetFreelancerQuery {
    function gigsGetFreelancer(
        address freelancerAddress
    ) external view returns (bool exists, GigsFreelancerValue memory dto) {
        AppStorage storage s = LibAppStorage.appStorage();

        if (s.gigsFreelancerExists[freelancerAddress]) {
            exists = true;

            GigsFreelancerEntity memory freelancer = s.gigsFreelancers[
                s.gigsFreelancerIndexByAddress[freelancerAddress]
            ];

            PersonEntity memory person = s.people[s.personIndexByAddress[freelancer.owner]];

            dto = GigsFreelancerValue({
                id: freelancer.owner,
                displayName: person.displayName,
                about: freelancer.about,
                totalContractsCount: freelancer.myContracts.length,
                failedContractsCount: freelancer.failedContractsCount,
                succeededContractsCount: freelancer.succeededContractsCount,
                lastActivityAt: person.lastActivityAt
            });
        }
    }
}
