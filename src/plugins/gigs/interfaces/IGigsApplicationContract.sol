//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IGigsApplicationContract {
    function deployerAddress() external view returns (address);

    function jobAddress() external view returns (address);

    function applicantAddress() external view returns (address);
}
