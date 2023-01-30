// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {LibDiamond} from "../libraries/LibDiamond.sol";

import {NodeOwner} from "../contracts/NodeOwner.sol";
import {Member} from "../contracts/Member.sol";
import {FrontendNode} from "../contracts/FrontendNode.sol";

import {StatsValue} from "../values/StatsValue.sol";

// Gigs
import {GigsJobContract} from "../../plugins/gigs/contracts/GigsJobContract.sol";
import {GigsApplicationContract} from "../../plugins/gigs/contracts/GigsApplicationContract.sol";
import {GigsContractContract} from "../../plugins/gigs/contracts/GigsContractContract.sol";
import {GigsJobEntity} from "../../plugins/gigs/entities/GigsJobEntity.sol";
import {GigsApplicationEntity} from "../../plugins/gigs/entities/GigsApplicationEntity.sol";
import {GigsContractEntity} from "../../plugins/gigs/entities/GigsContractEntity.sol";
import {GigsJobCategoryValue} from "../../plugins/gigs/values/GigsJobCategoryValue.sol";
import {GigsStatsValue} from "../../plugins/gigs/values/GigsStatsValue.sol";

struct AppStorage {
    mapping(address => bool) frontendNodeAddressExists;
    mapping(address => FrontendNode) frontendNodeByAddress;
    uint256 frontendNodesCount;
    mapping(address => bool) nodeOwnerAddressExists;
    mapping(address => NodeOwner) nodeOwners;
    uint256 nodeOwnersCount;
    mapping(address => bool) memberAddressExists;
    mapping(address => Member) members;
    uint256 membersCount;
    //
    // Gigs JobsCategories
    //
    mapping(uint256 => GigsJobCategoryValue) gigsJobsCategories;
    mapping(string => bool) gigsJobsCategoryCodeExists;
    mapping(string => uint256) gigsJobsCategoryIndexByCode;
    uint256 gigsJobsCategoriesCount;
    //
    // Gigs Jobs
    //
    mapping(uint256 => GigsJobEntity) gigsJobs;
    mapping(address => uint256) gigsJobIndexByAddress;
    mapping(address => bool) gigsJobAddressExists;
    uint256 gigsJobsCount;
    //
    // Gigs Applications
    //
    uint256 gigsApplicationsCount;
    // Key - job address, subkey - application address
    mapping(address => mapping(address => bool)) gigsJobApplicationExists;
    mapping(address => GigsApplicationEntity[]) gigsJobApplications;
    mapping(address => mapping(address => uint256)) gigsJobApplicationsMapping;
    // Key - job address, subkey - applicant address
    mapping(address => mapping(address => bool)) gigsJobApplicantExists;
    // Key - job address, subkey - application address
    mapping(address => mapping(address => address)) gigsJobApplicant;
    // Key - customer address, subkey - job address
    mapping(address => mapping(address => bool)) gigsMemberJobExists;
    mapping(address => address[]) gigsMemberJobs;
    mapping(address => address[]) gigsMemberApplications;
    //
    // Gigs Contracts
    //
    uint256 gigsContractsCount;
    // Key - job address, subkey - application address
    mapping(address => mapping(address => bool)) gigsContractByJobAndApplicationExists;
    mapping(address => GigsContractEntity) gigsContracts;
    // Key - job address, subkey - application address
    mapping(address => mapping(address => address)) gigsContractIdByJobAndApplication;
    // Key - contract address
    mapping(address => bool) gigsContractExists;
    mapping(address => address[]) gigsMemberContractsAsCustomer;
    mapping(address => address[]) gigsMemberContractsAsContractor;
}

library LibAppStorage {
    bytes32 internal constant DIAMOND_STORAGE_POSITION = keccak256("com.optrispace.appstorage");

    error FrontendNodeRequired();
    error FrontendNodeDoesNotExist();

    function appStorage() internal pure returns (AppStorage storage s) {
        bytes32 position = DIAMOND_STORAGE_POSITION;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            s.slot := position
        }
    }

    function enforceIsNotContractOwner() internal view {
        // solhint-disable-next-line reason-string
        require(msg.sender != LibDiamond.diamondStorage().contractOwner, "LibAppStorage: Must not be contract owner");
    }

    function findFrontendNode(address frontendNodeAddress) internal view returns (FrontendNode frontendNode) {
        AppStorage storage s = appStorage();

        if (!s.frontendNodeAddressExists[frontendNodeAddress]) revert FrontendNodeDoesNotExist();

        return s.frontendNodeByAddress[frontendNodeAddress];
    }

    function findOrCreateMember(address memberAddress) internal returns (bool created, Member member) {
        AppStorage storage s = appStorage();

        if (s.memberAddressExists[memberAddress]) {
            return (false, s.members[memberAddress]);
        }

        s.memberAddressExists[memberAddress] = true;
        member = new Member(memberAddress);
        s.members[memberAddress] = member;
        s.membersCount++;

        return (true, member);
    }
}
