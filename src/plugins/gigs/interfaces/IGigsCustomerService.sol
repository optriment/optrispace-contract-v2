// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {GigsJobEntity} from "../entities/GigsJobEntity.sol";
import {GigsApplicationEntity} from "../entities/GigsApplicationEntity.sol";
import {GigsContractEntity} from "../entities/GigsContractEntity.sol";
import {GigsJobWithApplicationValue} from "../values/GigsJobWithApplicationValue.sol";

interface IGigsCustomerService {
    function gigsGetMyJobs() external view returns (GigsJobEntity[] memory jobs);

    function gigsGetApplications(
        address jobAddress
    ) external view returns (GigsApplicationEntity[] memory applications);

    function gigsGetJobAndApplicationForContract(
        address jobAddress,
        address applicationAddress
    ) external view returns (GigsJobWithApplicationValue memory);

    function gigsGetContractsAsCustomer() external view returns (GigsContractEntity[] memory contracts);
}
