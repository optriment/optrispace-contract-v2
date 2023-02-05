//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {Test} from "forge-std/Test.sol";
import {DiamondCutFacet} from "../../src/core/facets/DiamondCutFacet.sol";
import {OptriSpace} from "../../src/OptriSpace.sol";

contract OptriSpaceTest is Test {
    OptriSpace optriSpace;

    function setUp() public {
        DiamondCutFacet diamondCutFacet = new DiamondCutFacet();
        optriSpace = new OptriSpace(address(this), address(diamondCutFacet), "Test");
    }

    function test_hasReleaseName() public {
        assertEq(optriSpace.releaseName(), "Test");
    }
}
