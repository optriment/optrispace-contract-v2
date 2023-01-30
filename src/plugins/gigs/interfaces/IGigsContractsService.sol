//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {GigsContractEntity} from "../entities/GigsContractEntity.sol";

interface IGigsContractsService {
    function gigsGetContract(
        address contractAddress
    ) external view returns (bool exists, GigsContractEntity memory dto, uint256 contractBalance);
}
