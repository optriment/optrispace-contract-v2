//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

struct GigsFreelancerValue {
    address id;
    string displayName;
    string about;
    uint256 totalContractsCount;
    uint256 failedContractsCount;
    uint256 succeededContractsCount;
    uint64 lastActivityAt;
}
