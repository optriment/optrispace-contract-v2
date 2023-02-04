//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

struct GigsFreelancerEntity {
    address owner;
    string about;
    address[] myApplications;
    address[] myContracts;
    uint256 failedContractsCount;
    uint256 succeededContractsCount;
    uint64 createdAt;
}
