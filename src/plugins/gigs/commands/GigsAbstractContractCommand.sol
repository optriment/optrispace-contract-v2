//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {LibDiamond} from "../../../core/libraries/LibDiamond.sol";
import {AppStorage, LibAppStorage} from "../../../core/libraries/LibAppStorage.sol";
import {LibEvents} from "../../../core/libraries/LibEvents.sol";

import {GigsContractEntity} from "../entities/GigsContractEntity.sol";

contract GigsAbstractContractCommand {
    error InvalidContractAddress();
    error ContractDoesNotExists();

    function getDTO(address contractAddress) internal view returns (GigsContractEntity storage dto) {
        LibDiamond.enforceEOA();
        LibDiamond.enforceIsNotContractOwner();

        if (contractAddress == address(0)) revert InvalidContractAddress();

        LibDiamond.enforceHasContractCode(contractAddress, "ContractMustHaveCode()");

        AppStorage storage s = LibAppStorage.appStorage();

        if (!s.gigsContractExists[contractAddress]) revert ContractDoesNotExists();

        dto = s.gigsContracts[contractAddress];
    }
}
