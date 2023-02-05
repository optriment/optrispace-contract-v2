// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {LibDiamond} from "../libraries/LibDiamond.sol";
import {AppStorage, FrontendNode, LibAppStorage} from "../libraries/LibAppStorage.sol";
import {NodeOwner} from "../contracts/NodeOwner.sol";

import "../interfaces/ICoreAddFrontendNodeCommand.sol";

contract CoreAddFrontendNodeCommand is ICoreAddFrontendNodeCommand {
    // Logs out created frontend node record
    event FrontendNodeCreated(
        address nodeOwnerAddress,
        address nodeOwnerContractAddress,
        address newFrontendNodeAddress
    );

    function coreAddFrontendNode(address ownerAddress, string memory nodeDisplayName) external {
        LibDiamond.enforceIsContractOwner();

        NodeOwner nodeOwner;

        AppStorage storage s = LibAppStorage.appStorage();

        if (s.nodeOwnerAddressExists[ownerAddress]) {
            nodeOwner = s.nodeOwners[ownerAddress];
        } else {
            // TODO: Emit event NodeOwnerCreated()

            s.nodeOwnerAddressExists[ownerAddress] = true;
            nodeOwner = new NodeOwner(ownerAddress);
            s.nodeOwners[ownerAddress] = nodeOwner;
            s.nodeOwnersCount++;
        }

        FrontendNode newFrontendNode = new FrontendNode(address(nodeOwner), nodeDisplayName);

        address newFrontendNodeAddress = address(newFrontendNode);

        emit FrontendNodeCreated(ownerAddress, address(nodeOwner), newFrontendNodeAddress);

        s.frontendNodeByAddress[newFrontendNodeAddress] = newFrontendNode;
        s.frontendNodeAddressExists[newFrontendNodeAddress] = true;
        s.frontendNodesCount++;

        nodeOwner.addNode(newFrontendNodeAddress);
    }
}
