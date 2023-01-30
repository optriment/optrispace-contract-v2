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

  *)
    echo "Unsupported network!";
    exit 1
    ;;
esac

CONTRACTS_LOG=./tmp/${NETWORK}_contracts.log

echo "Deploying Diamond..."
npx hardhat run scripts/deploy.js --network "${NETWORK}" > $CONTRACTS_LOG

CONTRACT_OWNER=$(grep "ContractOwner:" $CONTRACTS_LOG | awk '{print $2}')
DIAMOND=$(grep "Diamond:" $CONTRACTS_LOG | awk '{print $2}')

echo "Contract Owner: ${CONTRACT_OWNER}"

export DIAMOND_ADDRESS="${DIAMOND:?}"

echo "Deploying CoreAddFrontendNodeCommand..."
npx hardhat run scripts/core/commands/deployCoreAddFrontendNodeCommand.js --network "${NETWORK}"

export FRONTEND_NODE_OWNER="${CONTRACT_OWNER:?}"
export FRONTEND_NODE_NAME="example.tld"

echo "Adding Frontend Node..."
npx hardhat run scripts/core/addFrontendNode.js --network "${NETWORK}" >> $CONTRACTS_LOG

FRONTEND_NODE_ADDRESS=$(grep "FrontendNodeAddress:" $CONTRACTS_LOG | awk '{print $2}')

export FRONTEND_NODE_ADDRESS="${FRONTEND_NODE_ADDRESS:?}"

echo "Deploying GigsPlugin..."
npx hardhat run scripts/plugins/gigs/deployGigsPlugin.js --network "${NETWORK}"

echo "Deploying GigsCustomerService..."
npx hardhat run scripts/plugins/gigs/services/deployGigsCustomerService.js --network "${NETWORK}"

echo "Deploying GigsFreelancerService..."
npx hardhat run scripts/plugins/gigs/services/deployGigsFreelancerService.js --network "${NETWORK}"

echo "Deploying GigsContractsService..."
npx hardhat run scripts/plugins/gigs/services/deployGigsContractsService.js --network "${NETWORK}"

echo "Deploying GigsAddJobCommand..."
npx hardhat run scripts/plugins/gigs/commands/deployGigsAddJobCommand.js --network "${NETWORK}"

echo "Deploying GigsAddApplicationCommand..."
npx hardhat run scripts/plugins/gigs/commands/deployGigsAddApplicationCommand.js --network "${NETWORK}"

echo "Deploying GigsAddContractCommand..."
npx hardhat run scripts/plugins/gigs/commands/deployGigsAddContractCommand.js --network "${NETWORK}"

echo "Deploying GigsAcceptContractCommand..."
npx hardhat run scripts/plugins/gigs/commands/deployGigsAcceptContractCommand.js --network "${NETWORK}"

echo "Deploying GigsFundContractCommand..."
npx hardhat run scripts/plugins/gigs/commands/deployGigsFundContractCommand.js --network "${NETWORK}"

echo "Deploying GigsStartContractCommand..."
npx hardhat run scripts/plugins/gigs/commands/deployGigsStartContractCommand.js --network "${NETWORK}"

echo "Deploying GigsDeliverContractCommand..."
npx hardhat run scripts/plugins/gigs/commands/deployGigsDeliverContractCommand.js --network "${NETWORK}"

echo "Deploying GigsApproveContractCommand..."
npx hardhat run scripts/plugins/gigs/commands/deployGigsApproveContractCommand.js --network "${NETWORK}"

echo "Deploying GigsDeclineContractCommand..."
npx hardhat run scripts/plugins/gigs/commands/deployGigsDeclineContractCommand.js --network "${NETWORK}"

echo "Deploying GigsWithdrawContractCommand..."
npx hardhat run scripts/plugins/gigs/commands/deployGigsWithdrawContractCommand.js --network "${NETWORK}"

echo "Deploying GigsRefundContractCommand..."
npx hardhat run scripts/plugins/gigs/commands/deployGigsRefundContractCommand.js --network "${NETWORK}"

echo "Adding Jobs Categories..."
npx hardhat run scripts/plugins/gigs/addJobsCategories.js --network "${NETWORK}"

echo ""
echo "Put these lines into your frontend .env.local file:"
echo "OPTRISPACE_CONTRACT_ADDRESS=${DIAMOND_ADDRESS}"
echo "FRONTEND_NODE_ADDRESS=${FRONTEND_NODE_ADDRESS}"

exit 0
