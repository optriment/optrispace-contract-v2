#!/bin/bash

set -eu

if [ $# -ne 1 ]; then
  echo "Please provide network name in a first argument!"
  echo "Example: $0 localhost"
  exit 1
fi

NETWORK=""

case "$1" in
  "localhost")
    NETWORK="localhost"
    ;;

  "bsc-testnet")
    NETWORK="bsc-testnet"
    ;;

  "bsc-mainnet")
    NETWORK="bsc-mainnet"
    ;;

  *)
    echo "Unsupported network!";
    exit 1
    ;;
esac

DATE=$(TZ="UTC" date -u +"%Y-%m-%dT%H:%M:%SZ")
echo "Deployment date: ${DATE}"
echo ""

CONTRACTS_LOG=./tmp/${NETWORK}_contracts.log

echo "Deploying Diamond..."
npx hardhat run scripts/deploy.js --network "${NETWORK}" > $CONTRACTS_LOG

CONTRACT_OWNER=$(grep "ContractOwner:" $CONTRACTS_LOG | awk '{print $2}')
DIAMOND=$(grep "Diamond:" $CONTRACTS_LOG | awk '{print $2}')

echo "Contract Owner: ${CONTRACT_OWNER}"
echo ""

export DIAMOND_ADDRESS="${DIAMOND:?}"

echo "Deploying CoreAddFrontendNodeCommand..."
npx hardhat run scripts/core/commands/deployCoreAddFrontendNodeCommand.js --network "${NETWORK}"
echo ""

echo "Deploying CoreGetStatsQuery..."
npx hardhat run scripts/core/queries/deployCoreGetStatsQuery.js --network "${NETWORK}"
echo ""

export FRONTEND_NODE_OWNER="${CONTRACT_OWNER:?}"
export FRONTEND_NODE_NAME="example.tld"

echo "Adding Frontend Node..."
npx hardhat run scripts/core/addFrontendNode.js --network "${NETWORK}" >> $CONTRACTS_LOG
echo ""

FRONTEND_NODE_ADDRESS=$(grep "FrontendNodeAddress:" $CONTRACTS_LOG | awk '{print $2}')

export FRONTEND_NODE_ADDRESS="${FRONTEND_NODE_ADDRESS:?}"

echo "Deploying GigsPlugin..."
npx hardhat run scripts/plugins/gigs/deployGigsPlugin.js --network "${NETWORK}"
echo ""

echo "Deploying GigsCustomerService..."
npx hardhat run scripts/plugins/gigs/services/deployGigsCustomerService.js --network "${NETWORK}"
echo ""

echo "Deploying GigsFreelancerService..."
npx hardhat run scripts/plugins/gigs/services/deployGigsFreelancerService.js --network "${NETWORK}"
echo ""

echo "Deploying GigsContractsService..."
npx hardhat run scripts/plugins/gigs/services/deployGigsContractsService.js --network "${NETWORK}"
echo ""

echo "Deploying GigsGetMyApplicationsQuery..."
npx hardhat run scripts/plugins/gigs/queries/deployGigsGetMyApplicationsQuery.js --network "${NETWORK}"
echo ""

echo "Deploying GigsGetCustomersQuery..."
npx hardhat run scripts/plugins/gigs/queries/deployGigsGetCustomersQuery.js --network "${NETWORK}"
echo ""

echo "Deploying GigsGetFreelancersQuery..."
npx hardhat run scripts/plugins/gigs/queries/deployGigsGetFreelancersQuery.js --network "${NETWORK}"
echo ""

echo "Deploying GigsGetCustomerQuery..."
npx hardhat run scripts/plugins/gigs/queries/deployGigsGetCustomerQuery.js --network "${NETWORK}"
echo ""

echo "Deploying GigsGetFreelancerQuery..."
npx hardhat run scripts/plugins/gigs/queries/deployGigsGetFreelancerQuery.js --network "${NETWORK}"
echo ""

echo "Deploying GigsGetMyCustomerProfileQuery..."
npx hardhat run scripts/plugins/gigs/queries/deployGigsGetMyCustomerProfileQuery.js --network "${NETWORK}"
echo ""

echo "Deploying GigsGetMyFreelancerProfileQuery..."
npx hardhat run scripts/plugins/gigs/queries/deployGigsGetMyFreelancerProfileQuery.js --network "${NETWORK}"
echo ""

echo "Deploying GigsAddJobCommand..."
npx hardhat run scripts/plugins/gigs/commands/deployGigsAddJobCommand.js --network "${NETWORK}"
echo ""

echo "Deploying GigsAddApplicationCommand..."
npx hardhat run scripts/plugins/gigs/commands/deployGigsAddApplicationCommand.js --network "${NETWORK}"
echo ""

echo "Deploying GigsAddContractCommand..."
npx hardhat run scripts/plugins/gigs/commands/deployGigsAddContractCommand.js --network "${NETWORK}"
echo ""

echo "Deploying GigsAcceptContractCommand..."
npx hardhat run scripts/plugins/gigs/commands/deployGigsAcceptContractCommand.js --network "${NETWORK}"
echo ""

echo "Deploying GigsFundContractCommand..."
npx hardhat run scripts/plugins/gigs/commands/deployGigsFundContractCommand.js --network "${NETWORK}"
echo ""

echo "Deploying GigsStartContractCommand..."
npx hardhat run scripts/plugins/gigs/commands/deployGigsStartContractCommand.js --network "${NETWORK}"
echo ""

echo "Deploying GigsDeliverContractCommand..."
npx hardhat run scripts/plugins/gigs/commands/deployGigsDeliverContractCommand.js --network "${NETWORK}"
echo ""

echo "Deploying GigsApproveContractCommand..."
npx hardhat run scripts/plugins/gigs/commands/deployGigsApproveContractCommand.js --network "${NETWORK}"
echo ""

echo "Deploying GigsDeclineContractCommand..."
npx hardhat run scripts/plugins/gigs/commands/deployGigsDeclineContractCommand.js --network "${NETWORK}"
echo ""

echo "Deploying GigsWithdrawContractCommand..."
npx hardhat run scripts/plugins/gigs/commands/deployGigsWithdrawContractCommand.js --network "${NETWORK}"
echo ""

echo "Deploying GigsRefundContractCommand..."
npx hardhat run scripts/plugins/gigs/commands/deployGigsRefundContractCommand.js --network "${NETWORK}"
echo ""

echo "Adding Jobs Categories..."
npx hardhat run scripts/plugins/gigs/addJobsCategories.js --network "${NETWORK}"
echo ""

echo "Put these lines into your frontend .env.local file:"
echo "OPTRISPACE_CONTRACT_ADDRESS=${DIAMOND_ADDRESS}"
echo "FRONTEND_NODE_ADDRESS=${FRONTEND_NODE_ADDRESS}"

exit 0
