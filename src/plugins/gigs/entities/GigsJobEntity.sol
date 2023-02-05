// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "../values/GigsJobCategoryValue.sol";

struct GigsJobEntity {
    address id;
    address customerAddress;
    string title;
    string description;
    uint256 budget;
    uint64 createdAt;
    uint8 applicationsCount;
    uint8 categoryIndex;
    GigsJobCategoryValue category;
}
