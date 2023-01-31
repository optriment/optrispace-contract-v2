// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {StatsValue} from "../values/StatsValue.sol";

interface ICoreGetStatsQuery {
    function coreGetStats() external view returns (StatsValue memory stats);
}
