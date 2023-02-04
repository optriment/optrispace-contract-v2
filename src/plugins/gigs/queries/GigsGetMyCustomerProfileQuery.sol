//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AppStorage, LibAppStorage} from "../../../core/libraries/LibAppStorage.sol";

import "../interfaces/IGigsGetMyCustomerProfileQuery.sol";

contract GigsGetMyCustomerProfileQuery is IGigsGetMyCustomerProfileQuery {
    function gigsGetMyCustomerProfile() external view returns (bool exists, GigsCustomerEntity memory profile) {
        AppStorage storage s = LibAppStorage.appStorage();

        if (s.gigsCustomerExists[msg.sender]) {
            exists = true;
            profile = s.gigsCustomers[s.gigsCustomerIndexByAddress[msg.sender]];
        }
    }
}
