//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {GigsCustomerEntity} from "../entities/GigsCustomerEntity.sol";

interface IGigsGetMyCustomerProfileQuery {
    function gigsGetMyCustomerProfile() external view returns (bool exists, GigsCustomerEntity memory profile);
}
