// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {GigsCustomerValue} from "../values/GigsCustomerValue.sol";

interface IGigsGetCustomerQuery {
    function gigsGetCustomer(
        address customerAddress
    ) external view returns (bool exists, GigsCustomerValue memory customer);
}
