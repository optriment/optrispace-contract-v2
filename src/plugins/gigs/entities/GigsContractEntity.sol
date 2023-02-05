// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

struct GigsContractEntity {
    address id;
    address jobAddress;
    address applicationAddress;
    address customerAddress;
    address contractorAddress;
    string title;
    string description;
    string status;
    uint256 value;
    uint256 serviceFee;
    uint64 createdAt;
    uint64 acceptedAt;
    uint64 fundedAt;
    uint64 startedAt;
    uint64 deliveredAt;
    uint64 approvedAt;
    uint64 declinedAt;
    uint64 withdrewAt;
    uint64 refundedAt;
    uint64 closedAt;
    uint64 workShouldBeStartedBefore;
    uint64 resultShouldBeDeliveredBefore;
    uint8 durationInDays;
    uint8 daysToStartWork;
}
