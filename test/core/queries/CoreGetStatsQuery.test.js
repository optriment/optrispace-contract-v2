const { expect } = require('chai')
const { ethers } = require('hardhat')

const { deployFacet, coreAddFrontendNode, coreGetStats } = require('../../helpers')

const { deployDiamond } = require('../../../scripts/deploy.js')

describe('CoreGetStatsQuery', async () => {
  let diamondAddress
  let diamondCutFacet

  // Signers
  let owner
  let frontendNodeOwner1
  let frontendNodeOwner2

  beforeEach(async () => {
    ;[owner, frontendNodeOwner1, frontendNodeOwner2] = await ethers.getSigners()

    diamondAddress = await deployDiamond()
    diamondCutFacet = await ethers.getContractAt('DiamondCutFacet', diamondAddress)
  })

  describe('coreGetStats', async () => {
    describe('Direct access to contract', async () => {
      it.skip('should return empty values')
    })

    describe('Access to contract through Diamond', async () => {
      let coreGetStatsQuery

      beforeEach(async () => {
        await deployFacet(diamondCutFacet, 'CoreGetStatsQuery')

        coreGetStatsQuery = await ethers.getContractAt('CoreGetStatsQuery', diamondAddress)
      })

      describe('when there are no data in storage', async () => {
        it('returns zero values', async () => {
          const stats = await coreGetStats(coreGetStatsQuery)

          expect(stats.peopleCount).to.eq(0)
          expect(stats.nodeOwnersCount).to.eq(0)
          expect(stats.frontendNodesCount).to.eq(0)
        })
      })

      describe('with data', async () => {
        let coreAddFrontendNodeCommand

        beforeEach(async () => {
          await deployFacet(diamondCutFacet, 'CoreAddFrontendNodeCommand')

          coreAddFrontendNodeCommand = await ethers.getContractAt('CoreAddFrontendNodeCommand', diamondAddress)
        })

        it('returns valid stats', async () => {
          await coreAddFrontendNode(coreAddFrontendNodeCommand, owner, {
            frontendNodeOwnerAddress: frontendNodeOwner1.address,
            frontendNodeName: 'domain1.tld',
          })

          await coreAddFrontendNode(coreAddFrontendNodeCommand, owner, {
            frontendNodeOwnerAddress: frontendNodeOwner1.address,
            frontendNodeName: 'domain2.tld',
          })

          await coreAddFrontendNode(coreAddFrontendNodeCommand, owner, {
            frontendNodeOwnerAddress: frontendNodeOwner2.address,
            frontendNodeName: 'domain3.tld',
          })

          const stats = await coreGetStats(coreGetStatsQuery)

          expect(stats.peopleCount).to.eq(0)
          expect(stats.nodeOwnersCount).to.eq(2)
          expect(stats.frontendNodesCount).to.eq(3)
        })
      })
    })
  })
})
