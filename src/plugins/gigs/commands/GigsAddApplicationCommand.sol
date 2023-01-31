//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {LibDiamond} from "../../../core/libraries/LibDiamond.sol";
import {AppStorage, FrontendNode, Member, LibAppStorage} from "../../../core/libraries/LibAppStorage.sol";
import {LibEvents} from "../../../core/libraries/LibEvents.sol";

import {GigsApplicationContract} from "../contracts/GigsApplicationContract.sol";

import "../interfaces/IGigsAddApplicationCommand.sol";

contract GigsAddApplicationCommand is IGigsAddApplicationCommand {
    // Logs out created application record
    event ApplicationCreated(address applicantAddress, address jobAddress, address newApplicationAddress);

    error InvalidFrontendNodeAddress();
    error InvalidJobAddress();
    error CommentRequired();
    error ServiceFeeRequired();
    error JobDoesNotExist();
    error ApplicantsOnly();
    error AlreadyApplied();

    // solhint-disable-next-line code-complexity
    function gigsAddApplication(
        address frontendNodeAddress,
        address jobAddress,
        string memory comment,
        uint256 serviceFee
    ) external {
        LibDiamond.enforceEOA();
        LibDiamond.enforceIsNotContractOwner();

        if (frontendNodeAddress == address(0)) revert InvalidFrontendNodeAddress();
        if (jobAddress == address(0)) revert InvalidJobAddress();
        if (bytes(comment).length == 0) revert CommentRequired();
        if (serviceFee == 0) revert ServiceFeeRequired();

        LibDiamond.enforceHasContractCode(frontendNodeAddress, "FrontendNodeMustHaveCode()");
        LibDiamond.enforceHasContractCode(jobAddress, "JobMustHaveCode()");

        FrontendNode frontendNode = LibAppStorage.findFrontendNode(frontendNodeAddress);

        AppStorage storage s = LibAppStorage.appStorage();

        if (!s.gigsJobAddressExists[jobAddress]) revert JobDoesNotExist();

        GigsJobEntity storage job = s.gigsJobs[s.gigsJobIndexByAddress[jobAddress]];

        address applicantAddress = msg.sender;

        if (job.customerAddress == applicantAddress) revert ApplicantsOnly();
        if (s.gigsJobApplicantExists[jobAddress][applicantAddress]) revert AlreadyApplied();

        GigsApplicationContract application = new GigsApplicationContract(jobAddress, applicantAddress);

        address newApplicationAddress = address(application);

        s.gigsApplications[newApplicationAddress] = GigsApplicationEntity({
            id: newApplicationAddress,
            jobAddress: jobAddress,
            applicantAddress: applicantAddress,
            comment: comment,
            serviceFee: serviceFee,
            createdAt: uint64(block.timestamp), // solhint-disable-line not-rely-on-time
            hasContract: false,
            contractAddress: address(0)
        });

        s.gigsJobApplicationExists[jobAddress][newApplicationAddress] = true;
        s.gigsJobApplicationsMapping[jobAddress][applicantAddress] = s.gigsJobApplications[jobAddress].length;
        s.gigsJobApplicantExists[jobAddress][applicantAddress] = true;
        s.gigsJobApplicant[jobAddress][newApplicationAddress] = applicantAddress;
        s.gigsMemberApplications[applicantAddress].push(newApplicationAddress);
        s.gigsJobApplications[jobAddress].push(newApplicationAddress);

        job.applicationsCount++;
        s.gigsApplicationsCount++;

        emit ApplicationCreated(applicantAddress, jobAddress, newApplicationAddress);

        (bool memberCreated, Member member) = LibAppStorage.findOrCreateMember(applicantAddress);
        if (memberCreated) {
            frontendNode.addClient(address(member));
        }

        frontendNode.addEvent(LibEvents.EVENT_APPLICATION_CREATED, newApplicationAddress);
    }
}
