//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AppStorage, LibAppStorage} from "../../../core/libraries/LibAppStorage.sol";
import {IGigsContractContract} from "../interfaces/IGigsContractContract.sol";

import "../interfaces/IGigsContractsService.sol";

contract GigsContractsService is IGigsContractsService {
    error InvalidContractAddress();
    error Unauthorized();

    function gigsGetContract(
        address contractAddress
    ) external view returns (bool exists, GigsContractEntity memory dto, uint256 contractBalance) {
        if (contractAddress == address(0)) revert InvalidContractAddress();

        AppStorage storage s = LibAppStorage.appStorage();

        if (!s.gigsContractExists[contractAddress]) return (false, dto, 0);

        dto = s.gigsContracts[contractAddress];

        if (dto.customerAddress != msg.sender && dto.contractorAddress != msg.sender) {
            revert Unauthorized();
        }

        exists = true;
        contractBalance = address(contractAddress).balance;
    }
}
