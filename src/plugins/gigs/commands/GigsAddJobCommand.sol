//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {LibDiamond} from "../../../core/libraries/LibDiamond.sol";
import {AppStorage, FrontendNode, PersonEntity, LibAppStorage} from "../../../core/libraries/LibAppStorage.sol";
import {LibEvents} from "../../../core/libraries/LibEvents.sol";

import {GigsJobContract} from "../contracts/GigsJobContract.sol";
import {GigsCustomerEntity} from "../entities/GigsCustomerEntity.sol";

import "../interfaces/IGigsAddJobCommand.sol";

contract GigsAddJobCommand is IGigsAddJobCommand {
    // Logs out created job record
    event JobCreated(address customerAddress, address newJobAddress);

    error InvalidFrontendNodeAddress();
    error TitleRequired();
    error DescriptionRequired();
    error NoCategories();
    error InvalidCategoryIndex();

    function gigsAddJob(
        address frontendNodeAddress,
        uint256 budget,
        string memory title,
        string memory description,
        uint8 categoryIndex
    ) external {
        LibDiamond.enforceEOA();
        LibDiamond.enforceIsNotContractOwner();

        if (frontendNodeAddress == address(0)) revert InvalidFrontendNodeAddress();
        if (bytes(title).length == 0) revert TitleRequired();
        if (bytes(description).length == 0) revert DescriptionRequired();

        LibDiamond.enforceHasContractCode(frontendNodeAddress, "FrontendNodeMustHaveCode()");

        FrontendNode frontendNode = LibAppStorage.findFrontendNode(frontendNodeAddress);

        AppStorage storage s = LibAppStorage.appStorage();

        if (s.gigsJobsCategoriesCount == 0) revert NoCategories();
        if (categoryIndex > (s.gigsJobsCategoriesCount - 1)) revert InvalidCategoryIndex();

        GigsJobContract job = new GigsJobContract(msg.sender);

        address newJobAddress = address(job);

        emit JobCreated(msg.sender, newJobAddress);

        GigsJobCategoryValue memory category = s.gigsJobsCategories[categoryIndex];

        uint256 newIndex = s.gigsJobsCount;
        s.gigsJobAddressExists[newJobAddress] = true;
        s.gigsJobIndexByAddress[newJobAddress] = newIndex;
        s.gigsJobs[newIndex] = GigsJobEntity({
            id: newJobAddress,
            customerAddress: msg.sender,
            title: title,
            description: description,
            budget: budget,
            createdAt: uint64(block.timestamp), // solhint-disable-line not-rely-on-time
            categoryIndex: categoryIndex,
            applicationsCount: 0,
            category: category
        });
        s.gigsJobsCount++;

        s.gigsCustomerJobExists[msg.sender][newJobAddress] = true;

        (bool personCreated, PersonEntity storage person) = LibAppStorage.findOrCreatePerson(msg.sender);

        if (personCreated) {
            frontendNode.addClient(msg.sender);
        } else {
            person.lastActivityAt = uint64(block.timestamp);
        }

        GigsCustomerEntity storage customer = LibAppStorage.findOrCreateCustomer(msg.sender);

        customer.myJobs.push(newJobAddress);

        frontendNode.addEvent(LibEvents.EVENT_JOB_CREATED, newJobAddress);
    }
}
