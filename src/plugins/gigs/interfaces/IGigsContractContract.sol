//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IGigsContractContract {
    enum States {
        Created,
        Accepted,
        Funded,
        Started,
        Delivered,
        Approved,
        Declined,
        Closed
    }

    function accept() external;

    function fund(uint64 workShouldBeStartedBefore, uint64 resultShouldBeDeliveredBefore) external payable;

    function start() external;

    function deliver() external;

    function approve() external;

    function decline() external;

    function withdraw() external;

    function refund() external;

    function getStatus() external view returns (string memory);
}
