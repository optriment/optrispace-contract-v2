/* global ethers */

const { getSelectors, FacetCutAction } = require('../../libraries/diamond.js')

const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS

const deployGigsPlugin = async (args = {}) => {
  if (typeof DIAMOND_ADDRESS === 'undefined' || DIAMOND_ADDRESS.toString().trim().length === 0) {
    throw new Error('Invalid DIAMOND_ADDRESS')
  }

  const diamondCutFacet = await ethers.getContractAt('DiamondCutFacet', DIAMOND_ADDRESS)

  const GigsPluginFacet = await ethers.getContractFactory('GigsPlugin')
  const gigsPluginFacet = await GigsPluginFacet.deploy()
  await gigsPluginFacet.deployed()

  const gigsPluginSelectors = getSelectors(gigsPluginFacet)

  const tx = await diamondCutFacet.diamondCut(
    [
      {
        facetAddress: gigsPluginFacet.address,
        action: FacetCutAction.Add,
        functionSelectors: gigsPluginSelectors,
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

  if (args.verbose) console.log('GigsPlugin deployed')
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  deployGigsPlugin({ verbose: true }).catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}

exports.deployGigsPlugin = deployGigsPlugin
