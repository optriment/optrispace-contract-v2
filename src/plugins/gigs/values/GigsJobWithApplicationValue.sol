//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

struct GigsJobWithApplicationValue {
    address jobAddress;
    address applicationAddress;
    address applicantAddress;
    uint256 budget;
    uint256 serviceFee;
    string title;
    string description;
    string comment;
}
