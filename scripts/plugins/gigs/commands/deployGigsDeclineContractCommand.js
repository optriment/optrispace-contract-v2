const { deployFacet } = require('../../../libraries/deployFacet.js')

const deploy = async (args = {}) => {
  await deployFacet('GigsDeclineContractCommand', args)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  deploy({ verbose: true }).catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}

exports.deployGigsDeclineContractCommand = deploy
