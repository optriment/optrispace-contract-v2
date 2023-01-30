/* global ethers */

const { getSelectors, FacetCutAction } = require('../../../libraries/diamond.js')

const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS

const deployGigsContractsService = async (args = {}) => {
  if (typeof DIAMOND_ADDRESS === 'undefined' || DIAMOND_ADDRESS.toString().trim().length === 0) {
    throw new Error('Invalid DIAMOND_ADDRESS')
  }

  const diamondCutFacet = await ethers.getContractAt('DiamondCutFacet', DIAMOND_ADDRESS)

  const GigsContractsServiceFacet = await ethers.getContractFactory('GigsContractsService')
  const gigsContractsServiceFacet = await GigsContractsServiceFacet.deploy()
  await gigsContractsServiceFacet.deployed()

  const customerServiceSelectors = getSelectors(gigsContractsServiceFacet)

  const tx = await diamondCutFacet.diamondCut(
    [
      {
        facetAddress: gigsContractsServiceFacet.address,
        action: FacetCutAction.Add,
        functionSelectors: customerServiceSelectors,
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

  if (args.verbose) console.log('GigsContractsService deployed')
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  deployGigsContractsService({ verbose: true }).catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}

exports.deployGigsContractsService = deployGigsContractsService
