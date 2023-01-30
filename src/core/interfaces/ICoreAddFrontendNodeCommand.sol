// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface ICoreAddFrontendNodeCommand {
    function coreAddFrontendNode(address nodeOwnerAddress, string memory nodeDisplayName) external;
}
