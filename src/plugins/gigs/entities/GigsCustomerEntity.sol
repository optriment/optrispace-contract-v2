// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

struct GigsCustomerEntity {
    address owner;
    address[] myJobs;
    address[] myContracts;
    uint64 createdAt;
}
