//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {GigsCustomerValue} from "../values/GigsCustomerValue.sol";

interface IGigsGetCustomersQuery {
    function gigsGetCustomers() external view returns (GigsCustomerValue[] memory customers);
}
