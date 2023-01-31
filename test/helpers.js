const { expect } = require('chai')
const { ethers } = require('hardhat')
const { getSelectors, FacetCutAction } = require('../scripts/libraries/diamond.js')

// NOTE: https://github.com/volt-protocol/volt-protocol-core/blob/develop/test/helpers.ts

const deployFacet = async (diamondCutFacet, contractName) => {
  const Facet = await ethers.getContractFactory(contractName)
  const facet = await Facet.deploy()
  await facet.deployed()

  const selectors = getSelectors(facet)

  const tx = await diamondCutFacet.diamondCut(
    [
      {
        facetAddress: facet.address,
        action: FacetCutAction.Add,
        functionSelectors: selectors,
      },
    ],
    ethers.constants.AddressZero,
    '0x',
    { gasLimit: 800000 }
  )
  const receipt = await tx.wait()

  if (!receipt.status) {
    throw Error(`Diamond upgrade failed: ${tx.hash}`)
  }

  return {
    selectors,
    address: facet.address,
  }
}

const expectEvent = async (tx, contract, event, args = []) => {
  await expect(tx)
    .to.emit(contract, event)
    .withArgs(...args)
}

const expectRevert = async (tx, errorMessage) => {
  await expect(tx).to.be.revertedWith(errorMessage)
}

const expectError = async (tx, errorMessage) => {
  try {
    await tx
  } catch (e) {
    if (!e.message.match(errorMessage)) {
      throw new Error(`Expected: ${errorMessage}, got: ${e.message}`)
    }
  }
}

const solidityTimestampToDays = (value) => {
  return +value / 60 / 60 / 24
}

const getTransactionEventResult = async (tx) => {
  const result = await tx.wait()
  expect(result.events.length).to.eq(1)
  return result.events[0].args
}

const getFrontendNodeAddressByTransaction = async (tx) => {
  const args = await getTransactionEventResult(tx)
  return args.newFrontendNodeAddress
}

const getFrontendNodeOwnerContractAddressByTransaction = async (tx) => {
  const args = await getTransactionEventResult(tx)
  return args.nodeOwnerContractAddress
}

const coreAddFrontendNode = async (contract, as, args = {}) => {
  const tx = await coreAddFrontendNodeTx(contract, as, args)
  return await tx.wait()
}

const coreAddFrontendNodeTx = async (contract, as, args = {}) => {
  return await contract.connect(as).coreAddFrontendNode(args.frontendNodeOwnerAddress, args.frontendNodeName)
}

const coreGetStats = async (contract) => {
  return await contract.coreGetStats()
}

module.exports = {
  deployFacet,
  expectRevert,
  expectEvent,
  expectError,
  solidityTimestampToDays,
  getTransactionEventResult,
  getFrontendNodeAddressByTransaction,
  getFrontendNodeOwnerContractAddressByTransaction,
  coreAddFrontendNode,
  coreAddFrontendNodeTx,
  coreGetStats,
}
