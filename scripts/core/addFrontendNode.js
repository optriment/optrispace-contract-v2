/* global ethers */

const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS
const FRONTEND_NODE_OWNER = process.env.FRONTEND_NODE_OWNER
const FRONTEND_NODE_NAME = process.env.FRONTEND_NODE_NAME

const getTransactionEventResult = async (tx) => {
  const result = await tx.wait()
  return result.events[0].args
}

const getFrontendNodeAddressByTransaction = async (tx) => {
  const args = await getTransactionEventResult(tx)
  return args.newFrontendNodeAddress
}

const addFrontendNode = async () => {
  if (typeof DIAMOND_ADDRESS === 'undefined' || DIAMOND_ADDRESS.toString().trim().length === 0) {
    throw new Error('Invalid DIAMOND_ADDRESS')
  }

  if (typeof FRONTEND_NODE_OWNER === 'undefined' || FRONTEND_NODE_OWNER.toString().trim().length === 0) {
    throw new Error('Invalid FRONTEND_NODE_OWNER')
  }

  if (typeof FRONTEND_NODE_NAME === 'undefined' || FRONTEND_NODE_NAME.toString().trim().length === 0) {
    throw new Error('Invalid FRONTEND_NODE_NAME')
  }

  const CoreAddFrontendNodeCommand = await ethers.getContractAt('CoreAddFrontendNodeCommand', DIAMOND_ADDRESS)

  const tx = await CoreAddFrontendNodeCommand.coreAddFrontendNode(FRONTEND_NODE_OWNER, FRONTEND_NODE_NAME)
  const newFrontendNodeAddress = await getFrontendNodeAddressByTransaction(tx)

  console.log('FrontendNodeAddress:', newFrontendNodeAddress)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  addFrontendNode({ verbose: true }).catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
