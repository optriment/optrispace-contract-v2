// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IGigsJobContract {
    function deployerAddress() external view returns (address);

    function customerAddress() external view returns (address);
}
