//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

/******************************************************************************\
* Author: Nick Mudge <nick@perfectabstractions.com> (https://twitter.com/mudgen)
* Modified by: Alexander Kadyrov <alexander@kadyrov.dev> (https://kadyrov.dev/)
* EIP-2535 Diamonds: https://eips.ethereum.org/EIPS/eip-2535
*
* Implementation of a diamond.
/******************************************************************************/

import {LibDiamond} from "./core/libraries/LibDiamond.sol";
import {IDiamondCut} from "./core/interfaces/IDiamondCut.sol";
import {AppStorage, LibAppStorage, FrontendNode, NodeOwner} from "./core/libraries/LibAppStorage.sol";

import "./core/interfaces/IOptriSpace.sol";

contract OptriSpace is IOptriSpace {
    /// Used by frontend to check is this a contract or not
    string public constant VERSION = "1.0.0";

    // Logs out created frontend node record
    event FrontendNodeCreated(
        address nodeOwnerAddress,
        address nodeOwnerContractAddress,
        address newFrontendNodeAddress
    );

    error FunctionDoesNotExist();

    constructor(address _contractOwner, address _diamondCutFacet) payable {
        LibDiamond.setContractOwner(_contractOwner);

        // Add the diamondCut external function from the diamondCutFacet
        IDiamondCut.FacetCut[] memory cut = new IDiamondCut.FacetCut[](1);
        bytes4[] memory functionSelectors = new bytes4[](1);
        functionSelectors[0] = IDiamondCut.diamondCut.selector;
        cut[0] = IDiamondCut.FacetCut({
            facetAddress: _diamondCutFacet,
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: functionSelectors
        });
        LibDiamond.diamondCut(cut, address(0), "");
    }

    // Find facet for function that is called and execute the
    // function if a facet is found and return any value.
    // solhint-disable-next-line no-complex-fallback
    fallback() external payable {
        LibDiamond.DiamondStorage storage ds;
        bytes32 position = LibDiamond.DIAMOND_STORAGE_POSITION;
        // get diamond storage
        // solhint-disable no-inline-assembly
        // slither-disable-next-line assembly
        assembly {
            ds.slot := position
        }
        // solhint-enable no-inline-assembly

        // get facet from function selector
        address facet = ds.selectorToFacetAndPosition[msg.sig].facetAddress;
        if (facet == address(0)) revert FunctionDoesNotExist();

        // Execute external function from facet using delegatecall and return any value.
        // solhint-disable no-inline-assembly
        // slither-disable-next-line assembly
        assembly {
            // copy function selector and any arguments
            calldatacopy(0, 0, calldatasize())
            // execute function call using the facet
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            // get any return value
            returndatacopy(0, 0, returndatasize())
            // return any return value or error back to the caller
            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
        // solhint-enable no-inline-assembly
    }

    receive() external payable {
        revert("PaymentsDisabled()");
    }

    function getStats() external view returns (StatsValue memory stats) {
        AppStorage storage s = LibAppStorage.appStorage();

        stats.membersCount = s.membersCount;
        stats.nodeOwnersCount = s.nodeOwnersCount;
        stats.frontendNodesCount = s.frontendNodesCount;
    }

    function getFrontendNodeClientsCount(address frontendNodeAddress) external view returns (uint256) {
        return LibAppStorage.findFrontendNode(frontendNodeAddress).clientsCount();
    }

    /// Only for testing purpose
    function getFrontendNodeEventByIndex(
        address frontendNodeAddress,
        uint256 index
    ) external view returns (FrontendNodeEventValue memory frontendNodeEvent) {
        return LibAppStorage.findFrontendNode(frontendNodeAddress).getEventByIndex(index);
    }
}
