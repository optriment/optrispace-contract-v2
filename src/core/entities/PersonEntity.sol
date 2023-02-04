//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

struct PersonEntity {
    address owner;
    string displayName;
    uint64 createdAt;
    uint64 lastActivityAt;
}
