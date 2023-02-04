//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AppStorage, PersonEntity, LibAppStorage} from "../../../core/libraries/LibAppStorage.sol";
import {GigsCustomerEntity} from "../entities/GigsCustomerEntity.sol";

import "../interfaces/IGigsGetCustomerQuery.sol";

contract GigsGetCustomerQuery is IGigsGetCustomerQuery {
    function gigsGetCustomer(
        address customerAddress
    ) external view returns (bool exists, GigsCustomerValue memory dto) {
        AppStorage storage s = LibAppStorage.appStorage();

        if (s.gigsCustomerExists[customerAddress]) {
            exists = true;

            GigsCustomerEntity memory customer = s.gigsCustomers[s.gigsCustomerIndexByAddress[customerAddress]];

            PersonEntity memory person = s.people[s.personIndexByAddress[customer.owner]];

            dto = GigsCustomerValue({
                id: customer.owner,
                displayName: person.displayName,
                // TODO: Add totalApprovedContractsCount
                // TODO: Add totalDeclinedContractsCount
                totalContractsCount: customer.myContracts.length,
                lastActivityAt: person.lastActivityAt
            });
        }
    }
}
