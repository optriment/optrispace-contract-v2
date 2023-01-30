//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {LibDiamond} from "../../../core/libraries/LibDiamond.sol";
import {AppStorage, FrontendNode, Member, LibAppStorage} from "../../../core/libraries/LibAppStorage.sol";
import {LibEvents} from "../../../core/libraries/LibEvents.sol";

import {GigsJobContract} from "../contracts/GigsJobContract.sol";

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

        address customerAddress = msg.sender;

        GigsJobContract job = new GigsJobContract(customerAddress);

        address newJobAddress = address(job);

        emit JobCreated(customerAddress, newJobAddress);

        GigsJobCategoryValue memory category = s.gigsJobsCategories[categoryIndex];

        uint256 newIndex = s.gigsJobsCount;
        s.gigsJobAddressExists[newJobAddress] = true;
        s.gigsJobIndexByAddress[newJobAddress] = newIndex;
        s.gigsJobs[newIndex] = GigsJobEntity({
            id: newJobAddress,
            customerAddress: customerAddress,
            title: title,
            description: description,
            budget: budget,
            createdAt: uint64(block.timestamp), // solhint-disable-line not-rely-on-time
            categoryIndex: categoryIndex,
            applicationsCount: 0,
            category: category
        });
        s.gigsJobsCount++;

        s.gigsMemberJobs[customerAddress].push(newJobAddress);
        s.gigsMemberJobExists[customerAddress][newJobAddress] = true;

        (bool memberCreated, Member member) = LibAppStorage.findOrCreateMember(customerAddress);

        if (memberCreated) {
            frontendNode.addClient(address(member));
        }

        frontendNode.addEvent(LibEvents.EVENT_JOB_CREATED, newJobAddress);
    }
}
