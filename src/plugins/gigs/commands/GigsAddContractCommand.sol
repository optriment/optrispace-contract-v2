//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {LibDiamond} from "../../../core/libraries/LibDiamond.sol";
import {AppStorage, FrontendNode, LibAppStorage} from "../../../core/libraries/LibAppStorage.sol";
import {LibEvents} from "../../../core/libraries/LibEvents.sol";

import {GigsContractContract} from "../contracts/GigsContractContract.sol";
import {GigsCustomerEntity} from "../entities/GigsCustomerEntity.sol";
import {GigsFreelancerEntity} from "../entities/GigsFreelancerEntity.sol";

import "../interfaces/IGigsAddContractCommand.sol";

contract GigsAddContractCommand is IGigsAddContractCommand {
    // Logs out created contract record
    event ContractCreated(
        address customerAddress,
        address jobAddress,
        address applicationAddress,
        address newContractAddress
    );

    error InvalidFrontendNodeAddress();
    error TitleRequired();
    error DescriptionRequired();
    error InvalidJobAddress();
    error JobDoesNotExist();
    error CustomerOnly();
    error InvalidApplicationAddress();
    error ValueRequired();
    error DurationInDaysRequired();
    error DurationInDaysOverflow();
    error DaysToStartWorkRequired();
    error DaysToStartWorkOverflow();
    error DaysToStartWorkInvalid();
    error ApplicationDoesNotExist();
    error ContractExists();

    // solhint-disable-next-line code-complexity
    function gigsAddContract(
        address frontendNodeAddress,
        address jobAddress,
        address applicationAddress,
        string memory title,
        string memory description,
        uint256 value,
        uint8 durationInDays,
        uint8 daysToStartWork
    ) external {
        LibDiamond.enforceEOA();
        LibDiamond.enforceIsNotContractOwner();

        if (frontendNodeAddress == address(0)) revert InvalidFrontendNodeAddress();
        if (jobAddress == address(0)) revert InvalidJobAddress();
        if (applicationAddress == address(0)) revert InvalidApplicationAddress();
        if (bytes(title).length == 0) revert TitleRequired();
        if (bytes(description).length == 0) revert DescriptionRequired();
        if (value == 0) revert ValueRequired();
        if (durationInDays == 0) revert DurationInDaysRequired();
        if (durationInDays > 31) revert DurationInDaysOverflow();
        if (daysToStartWork == 0) revert DaysToStartWorkRequired();
        if (daysToStartWork > 7) revert DaysToStartWorkOverflow();
        if (daysToStartWork >= durationInDays) revert DaysToStartWorkInvalid();

        LibDiamond.enforceHasContractCode(frontendNodeAddress, "FrontendNodeMustHaveCode()");
        LibDiamond.enforceHasContractCode(jobAddress, "JobMustHaveCode()");
        LibDiamond.enforceHasContractCode(applicationAddress, "ApplicationMustHaveCode()");

        FrontendNode frontendNode = LibAppStorage.findFrontendNode(frontendNodeAddress);

        AppStorage storage s = LibAppStorage.appStorage();

        if (!s.gigsJobAddressExists[jobAddress]) revert JobDoesNotExist();

        GigsJobEntity memory job = s.gigsJobs[s.gigsJobIndexByAddress[jobAddress]];

        if (job.customerAddress != msg.sender) revert CustomerOnly();

        if (!s.gigsJobApplicationExists[jobAddress][applicationAddress]) revert ApplicationDoesNotExist();

        if (s.gigsContractByJobAndApplicationExists[jobAddress][applicationAddress]) revert ContractExists();

        GigsApplicationEntity storage application = s.gigsApplications[applicationAddress];

        address newContractAddress = _deployContract(
            jobAddress,
            applicationAddress,
            msg.sender,
            application.applicantAddress,
            value
        );

        emit ContractCreated(msg.sender, jobAddress, applicationAddress, newContractAddress);

        LibAppStorage.updatePersonActivity(msg.sender);

        addContractToCustomer(msg.sender, newContractAddress);
        addContractToFreelancer(application.applicantAddress, newContractAddress);

        s.gigsContracts[newContractAddress] = GigsContractEntity({
            id: newContractAddress,
            jobAddress: jobAddress,
            applicationAddress: applicationAddress,
            customerAddress: msg.sender,
            contractorAddress: application.applicantAddress,
            title: title,
            description: description,
            value: value,
            serviceFee: application.serviceFee,
            durationInDays: durationInDays,
            daysToStartWork: daysToStartWork,
            status: "created",
            createdAt: uint64(block.timestamp), // solhint-disable-line not-rely-on-time
            acceptedAt: 0,
            fundedAt: 0,
            startedAt: 0,
            deliveredAt: 0,
            approvedAt: 0,
            declinedAt: 0,
            withdrewAt: 0,
            refundedAt: 0,
            closedAt: 0,
            workShouldBeStartedBefore: 0,
            resultShouldBeDeliveredBefore: 0
        });

        application.hasContract = true;
        application.contractAddress = newContractAddress;

        s.gigsContractByJobAndApplicationExists[jobAddress][applicationAddress] = true;
        s.gigsContractIdByJobAndApplication[jobAddress][applicationAddress] = newContractAddress;

        s.gigsContractExists[newContractAddress] = true;

        s.gigsContractsCount++;

        frontendNode.addEvent(LibEvents.EVENT_CONTRACT_CREATED, newContractAddress);
    }

    function _deployContract(
        address jobAddress,
        address applicationAddress,
        address customerAddress,
        address applicantAddress,
        uint256 value
    ) private returns (address newContractAddress) {
        GigsContractContract newContract = new GigsContractContract(
            jobAddress,
            applicationAddress,
            customerAddress,
            applicantAddress,
            value
        );

        newContractAddress = address(newContract);
    }

    function addContractToCustomer(address customerAddress, address contractAddress) private {
        GigsCustomerEntity storage customer = LibAppStorage.findCustomer(customerAddress);

        customer.myContracts.push(contractAddress);
    }

    function addContractToFreelancer(address freelancerAddress, address contractAddress) private {
        GigsFreelancerEntity storage freelancer = LibAppStorage.findFreelancer(freelancerAddress);

        freelancer.myContracts.push(contractAddress);
    }
}
