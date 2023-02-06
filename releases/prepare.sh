#!/bin/bash

set -eou pipefail

RELEASES_DIR=./releases
HISTORY_DIR="${RELEASES_DIR}/history"
AVAILABLE_NAMES="${RELEASES_DIR}/available_names.txt"
NEXT_RELEASE_NAME=$(shuf -n 1 "${AVAILABLE_NAMES}")

if [ -z "${NEXT_RELEASE_NAME}" ]; then
  echo "Unable to get release name!"
  exit 1
fi

if [ -d "${HISTORY_DIR}/${NEXT_RELEASE_NAME}" ]; then
  echo "Release ${NEXT_RELEASE_NAME} already exists!"
  exit 1
fi

echo "Next release name: $NEXT_RELEASE_NAME"
echo ""

echo "Creating release directory ${HISTORY_DIR}/${NEXT_RELEASE_NAME}..."
mkdir -p "${HISTORY_DIR}/${NEXT_RELEASE_NAME}"
touch "${HISTORY_DIR}/${NEXT_RELEASE_NAME}/README.md"

echo "Removing ${NEXT_RELEASE_NAME} from ${AVAILABLE_NAMES}..."
CLEAN_NAMES=$(sed "/^${NEXT_RELEASE_NAME}$/d" "$AVAILABLE_NAMES")
echo "${CLEAN_NAMES}" > ${AVAILABLE_NAMES}

echo ""
echo "Use the following command to deploy smart contracts:"
echo "RELEASE_NAME=${NEXT_RELEASE_NAME} ./scripts/deploy-all.sh [localhost|bsc-testnet]"

echo ""
echo "Do not forget to save output log to ${HISTORY_DIR}/${NEXT_RELEASE_NAME}/README.md!"
