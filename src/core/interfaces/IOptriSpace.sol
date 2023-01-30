// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {StatsValue} from "../values/StatsValue.sol";
import {FrontendNodeEventValue} from "../values/FrontendNodeEventValue.sol";

// solhint-disable-next-line func-name-mixedcase
interface IOptriSpace {
    function getStats() external view returns (StatsValue memory stats);

    function getFrontendNodeClientsCount(address frontendNodeAddress) external view returns (uint256);

    function getFrontendNodeEventByIndex(
        address frontendNodeAddress,
        uint256 index
    ) external view returns (FrontendNodeEventValue memory frontendNodeEvent);
}
