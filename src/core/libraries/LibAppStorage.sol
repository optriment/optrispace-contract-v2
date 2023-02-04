// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {LibDiamond} from "../libraries/LibDiamond.sol";

import {NodeOwner} from "../contracts/NodeOwner.sol";
import {FrontendNode} from "../contracts/FrontendNode.sol";
import {PersonEntity} from "../entities/PersonEntity.sol";
import {StatsValue} from "../values/StatsValue.sol";

// Gigs
import {GigsJobContract} from "../../plugins/gigs/contracts/GigsJobContract.sol";
import {GigsApplicationContract} from "../../plugins/gigs/contracts/GigsApplicationContract.sol";
import {GigsContractContract} from "../../plugins/gigs/contracts/GigsContractContract.sol";
import {GigsJobEntity} from "../../plugins/gigs/entities/GigsJobEntity.sol";
import {GigsApplicationEntity} from "../../plugins/gigs/entities/GigsApplicationEntity.sol";
import {GigsContractEntity} from "../../plugins/gigs/entities/GigsContractEntity.sol";
import {GigsCustomerEntity} from "../../plugins/gigs/entities/GigsCustomerEntity.sol";
import {GigsFreelancerEntity} from "../../plugins/gigs/entities/GigsFreelancerEntity.sol";
import {GigsJobCategoryValue} from "../../plugins/gigs/values/GigsJobCategoryValue.sol";
import {GigsStatsValue} from "../../plugins/gigs/values/GigsStatsValue.sol";

struct AppStorage {
    mapping(address => bool) frontendNodeAddressExists;
    mapping(address => FrontendNode) frontendNodeByAddress;
    uint256 frontendNodesCount;
    mapping(address => bool) nodeOwnerAddressExists;
    mapping(address => NodeOwner) nodeOwners;
    uint256 nodeOwnersCount;
    mapping(uint256 => PersonEntity) people;
    mapping(address => bool) personExists;
    mapping(address => uint256) personIndexByAddress;
    uint256 peopleCount;
    //
    // Gigs Customers
    //
    mapping(uint256 => GigsCustomerEntity) gigsCustomers;
    mapping(address => bool) gigsCustomerExists;
    mapping(address => uint256) gigsCustomerIndexByAddress;
    uint256 gigsCustomersCount;
    //
    // Gigs Freelancers
    //
    mapping(uint256 => GigsFreelancerEntity) gigsFreelancers;
    mapping(address => bool) gigsFreelancerExists;
    mapping(address => uint256) gigsFreelancerIndexByAddress;
    uint256 gigsFreelancersCount;
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
    mapping(address => GigsApplicationEntity) gigsApplications;
    // Key - job address, subkey - application address
    mapping(address => mapping(address => bool)) gigsJobApplicationExists;
    mapping(address => address[]) gigsJobApplications;
    mapping(address => mapping(address => uint256)) gigsJobApplicationsMapping;
    // Key - job address, subkey - applicant address
    mapping(address => mapping(address => bool)) gigsJobApplicantExists;
    // Key - job address, subkey - application address
    mapping(address => mapping(address => address)) gigsJobApplicant;
    // Key - customer address, subkey - job address
    mapping(address => mapping(address => bool)) gigsCustomerJobExists;
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

    function updatePersonActivity(address personAddress) internal {
        AppStorage storage s = appStorage();

        if (!s.personExists[personAddress]) revert("PersonDoesNotExist()");

        PersonEntity storage person = s.people[s.personIndexByAddress[personAddress]];

        person.lastActivityAt = uint64(block.timestamp);
    }

    function findOrCreatePerson(address personAddress) internal returns (bool created, PersonEntity storage person) {
        AppStorage storage s = appStorage();

        if (s.personExists[personAddress]) {
            return (false, s.people[s.personIndexByAddress[personAddress]]);
        }

        s.personExists[personAddress] = true;
        PersonEntity memory p = PersonEntity({
            owner: personAddress,
            displayName: "",
            createdAt: uint64(block.timestamp),
            lastActivityAt: uint64(block.timestamp)
        });

        uint256 newPersonIndex = s.peopleCount;

        s.personIndexByAddress[personAddress] = newPersonIndex;
        s.people[newPersonIndex] = p;
        s.peopleCount++;

        return (true, s.people[newPersonIndex]);
    }

    function findCustomer(address customerAddress) internal view returns (GigsCustomerEntity storage customer) {
        AppStorage storage s = appStorage();

        if (!s.gigsCustomerExists[customerAddress]) revert("GigsCustomerDoesNotExist()");

        return s.gigsCustomers[s.gigsCustomerIndexByAddress[customerAddress]];
    }

    function findFreelancer(address freelancerAddress) internal view returns (GigsFreelancerEntity storage freelancer) {
        AppStorage storage s = appStorage();

        if (!s.gigsFreelancerExists[freelancerAddress]) revert("GigsFreelancerDoesNotExist()");

        return s.gigsFreelancers[s.gigsFreelancerIndexByAddress[freelancerAddress]];
    }

    function findOrCreateCustomer(address customerAddress) internal returns (GigsCustomerEntity storage customer) {
        AppStorage storage s = appStorage();

        if (s.gigsCustomerExists[customerAddress]) {
            return s.gigsCustomers[s.gigsCustomerIndexByAddress[customerAddress]];
        }

        address[] memory myJobs;
        address[] memory myContracts;

        s.gigsCustomerExists[customerAddress] = true;
        GigsCustomerEntity memory c = GigsCustomerEntity({
            owner: customerAddress,
            myJobs: myJobs,
            myContracts: myContracts,
            createdAt: uint64(block.timestamp)
        });

        uint256 newCustomerIndex = s.gigsCustomersCount;

        s.gigsCustomerIndexByAddress[customerAddress] = newCustomerIndex;
        s.gigsCustomers[newCustomerIndex] = c;
        s.gigsCustomersCount++;

        return s.gigsCustomers[newCustomerIndex];
    }

    function findOrCreateFreelancer(
        address freelancerAddress
    ) internal returns (GigsFreelancerEntity storage freelancer) {
        AppStorage storage s = appStorage();

        if (s.gigsFreelancerExists[freelancerAddress]) {
            return s.gigsFreelancers[s.gigsFreelancerIndexByAddress[freelancerAddress]];
        }

        address[] memory myApplications;
        address[] memory myContracts;

        s.gigsFreelancerExists[freelancerAddress] = true;
        GigsFreelancerEntity memory f = GigsFreelancerEntity({
            owner: freelancerAddress,
            about: "",
            myApplications: myApplications,
            myContracts: myContracts,
            failedContractsCount: 0,
            succeededContractsCount: 0,
            createdAt: uint64(block.timestamp)
        });

        uint256 newFreelancerIndex = s.gigsFreelancersCount;

        s.gigsFreelancerIndexByAddress[freelancerAddress] = newFreelancerIndex;
        s.gigsFreelancers[newFreelancerIndex] = f;
        s.gigsFreelancersCount++;

        return s.gigsFreelancers[newFreelancerIndex];
    }
}
