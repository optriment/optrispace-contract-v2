/* global ethers */

const { getSelectors, FacetCutAction } = require('./libraries/diamond.js')

async function deployDiamond(releaseName, args = {}) {
  if (typeof releaseName !== 'string' || releaseName.trim().length === 0) {
    throw new Error('Release name must be provided')
  }

  const accounts = await ethers.getSigners()
  const contractOwner = accounts[0]

  if (args.verbose) console.log('ContractOwner:', contractOwner.address)

  // deploy DiamondCutFacet
  const DiamondCutFacet = await ethers.getContractFactory('DiamondCutFacet')
  const diamondCutFacet = await DiamondCutFacet.deploy()
  await diamondCutFacet.deployed()
  if (args.verbose) console.log('DiamondCutFacet:', diamondCutFacet.address)

  // deploy Diamond
  const Diamond = await ethers.getContractFactory('OptriSpace')
  const diamond = await Diamond.deploy(contractOwner.address, diamondCutFacet.address, releaseName)
  await diamond.deployed()

  // deploy DiamondInit
  // DiamondInit provides a function that is called when the diamond is upgraded to initialize state variables
  // Read about how the diamondCut function works here: https://eips.ethereum.org/EIPS/eip-2535#addingreplacingremoving-functions
  const DiamondInit = await ethers.getContractFactory('DiamondInit')
  const diamondInit = await DiamondInit.deploy()
  await diamondInit.deployed()
  if (args.verbose) console.log('DiamondInit:', diamondInit.address)

  // deploy facets
  const FacetNames = ['DiamondLoupeFacet', 'OwnershipFacet']
  const cut = []
  for (const FacetName of FacetNames) {
    const Facet = await ethers.getContractFactory(FacetName)
    const facet = await Facet.deploy()
    await facet.deployed()
    if (args.verbose) console.log(`${FacetName}: ${facet.address}`)
    cut.push({
      facetAddress: facet.address,
      action: FacetCutAction.Add,
      functionSelectors: getSelectors(facet),
    })
  }

  // upgrade diamond with facets
  const diamondCut = await ethers.getContractAt('IDiamondCut', diamond.address)

  // call to init function
  const functionCall = diamondInit.interface.encodeFunctionData('init')
  const tx = await diamondCut.diamondCut(cut, diamondInit.address, functionCall)
  const receipt = await tx.wait()
  if (!receipt.status) {
    throw Error(`Diamond upgrade failed: ${tx.hash}`)
  }

  if (args.verbose) console.log('Diamond:', diamond.address)

  return diamond.address
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  deployDiamond(process.env.RELEASE_NAME, { verbose: true }).catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}

exports.deployDiamond = deployDiamond
