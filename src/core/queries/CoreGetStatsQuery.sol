// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AppStorage, LibAppStorage} from "../libraries/LibAppStorage.sol";

import "../interfaces/ICoreGetStatsQuery.sol";

contract CoreGetStatsQuery is ICoreGetStatsQuery {
    function coreGetStats() external view returns (StatsValue memory stats) {
        AppStorage storage s = LibAppStorage.appStorage();

        stats.peopleCount = s.peopleCount;
        stats.nodeOwnersCount = s.nodeOwnersCount;
        stats.frontendNodesCount = s.frontendNodesCount;
    }
}
