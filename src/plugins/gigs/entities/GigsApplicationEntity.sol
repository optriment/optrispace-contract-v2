// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

struct GigsApplicationEntity {
    address id;
    address jobAddress;
    address applicantAddress;
    string comment;
    uint256 serviceFee;
    uint64 createdAt;
    bool hasContract;
    address contractAddress;
}
