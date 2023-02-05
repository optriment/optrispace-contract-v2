// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

struct GigsMyApplicationValue {
    address jobAddress;
    address applicationAddress;
    address contractAddress;
    address applicantAddress;
    bool hasContract;
    string jobTitle;
    string jobDescription;
    string applicationComment;
    string jobCategoryCode;
    string jobCategoryLabel;
    uint256 jobBudget;
    uint256 applicationServiceFee;
    uint64 applicationCreatedAt;
}
