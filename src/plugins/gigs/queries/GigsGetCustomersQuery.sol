// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AppStorage, PersonEntity, LibAppStorage} from "../../../core/libraries/LibAppStorage.sol";
import {GigsCustomerEntity} from "../entities/GigsCustomerEntity.sol";

import "../interfaces/IGigsGetCustomersQuery.sol";

contract GigsGetCustomersQuery is IGigsGetCustomersQuery {
    function gigsGetCustomers() external view returns (GigsCustomerValue[] memory customers) {
        AppStorage storage s = LibAppStorage.appStorage();

        customers = new GigsCustomerValue[](s.gigsCustomersCount);

        uint256 i = 0;

        while (i < s.gigsCustomersCount) {
            GigsCustomerEntity memory customer = s.gigsCustomers[i];

            PersonEntity memory person = s.people[s.personIndexByAddress[customer.owner]];

            customers[i] = GigsCustomerValue({
                id: customer.owner,
                displayName: person.displayName,
                // TODO: Add totalApprovedContractsCount
                // TODO: Add totalDeclinedContractsCount
                totalContractsCount: customer.myContracts.length,
                lastActivityAt: person.lastActivityAt
            });

            unchecked {
                ++i;
            }
        }
    }
}
