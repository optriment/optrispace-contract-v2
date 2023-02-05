const { expect } = require('chai')
const { ethers } = require('hardhat')

const {
  deployFacet,
  expectRevert,
  getFrontendNodeAddressByTransaction,
  getFrontendNodeOwnerContractAddressByTransaction,
  coreAddFrontendNodeTx,
  coreAddFrontendNode,
  coreGetStats,
} = require('../../helpers')

const { deployDiamond } = require('../../../scripts/deploy.js')

describe('CoreAddFrontendNodeCommand', async () => {
  // NOTE: We use this to simulate contract which is not an EOA.
  let CONTRACT_WITH_CODE

  let diamondAddress
  let diamondCutFacet

  // Signers
  let owner
  let frontendNodeOwner

  before(async () => {
    const DummyContract = await ethers.getContractFactory('DummyContract')
    const dummyContract = await DummyContract.deploy()
    await dummyContract.deployed()

    CONTRACT_WITH_CODE = dummyContract.address
  })

  beforeEach(async () => {
    ;[owner, frontendNodeOwner] = await ethers.getSigners()

    diamondAddress = await deployDiamond('Test')
    diamondCutFacet = await ethers.getContractAt('DiamondCutFacet', diamondAddress)
  })

  describe('coreAddFrontendNode', async () => {
    describe('Direct access to contract', async () => {
      it.skip('should return error')
    })

    describe('Access to contract through Diamond', async () => {
      let coreAddFrontendNodeCommand, coreGetStatsQuery

      beforeEach(async () => {
        await deployFacet(diamondCutFacet, 'CoreAddFrontendNodeCommand')
        coreAddFrontendNodeCommand = await ethers.getContractAt('CoreAddFrontendNodeCommand', diamondAddress)

        await deployFacet(diamondCutFacet, 'CoreGetStatsQuery')
        coreGetStatsQuery = await ethers.getContractAt('CoreGetStatsQuery', diamondAddress)
      })

      describe('when executes as not a contract owner', async () => {
        it('returns error', async () => {
          const error = coreAddFrontendNodeTx(coreAddFrontendNodeCommand, frontendNodeOwner, {
            frontendNodeOwnerAddress: ethers.constants.AddressZero,
            frontendNodeName: '',
          })
          await expectRevert(error, 'LibDiamond: Must be contract owner')
        })
      })

      describe('with invalid arguments', async () => {
        describe('when node owner address is zero', async () => {
          it('returns error', async () => {
            const error = coreAddFrontendNodeTx(coreAddFrontendNodeCommand, owner, {
              frontendNodeOwnerAddress: ethers.constants.AddressZero,
              frontendNodeName: '',
            })
            await expectRevert(error, 'InvalidOwnerAddress()')
          })
        })

        describe('when node owner address is a contract', async () => {
          it('returns error', async () => {
            const error = coreAddFrontendNodeTx(coreAddFrontendNodeCommand, owner, {
              frontendNodeOwnerAddress: CONTRACT_WITH_CODE,
              frontendNodeName: 'domain.tld',
            })
            await expectRevert(error, 'OwnerMustBeEOA()')
          })
        })

        describe('when node name is empty', async () => {
          it('returns error', async () => {
            const error = coreAddFrontendNodeTx(coreAddFrontendNodeCommand, owner, {
              frontendNodeOwnerAddress: frontendNodeOwner.address,
              frontendNodeName: '',
            })
            await expectRevert(error, 'DisplayNameRequired()')
          })
        })
      })

      it('emits FrontendNodeCreated', async () => {
        const result = await coreAddFrontendNode(coreAddFrontendNodeCommand, owner, {
          frontendNodeOwnerAddress: frontendNodeOwner.address,
          frontendNodeName: 'domain.tld',
        })

        expect(result.events.length).to.eq(1)

        const { event, args } = result.events[0]

        expect(event).to.eq('FrontendNodeCreated')
        expect(args.nodeOwnerAddress).to.eq(frontendNodeOwner.address)
        expect(args.nodeOwnerContractAddress.startsWith('0x')).to.eq(true)
        expect(args.newFrontendNodeAddress.startsWith('0x')).to.eq(true)
      })

      it('increases number of records', async () => {
        await coreAddFrontendNode(coreAddFrontendNodeCommand, owner, {
          frontendNodeOwnerAddress: frontendNodeOwner.address,
          frontendNodeName: 'domain.tld',
        })

        await coreAddFrontendNode(coreAddFrontendNodeCommand, owner, {
          frontendNodeOwnerAddress: frontendNodeOwner.address,
          frontendNodeName: 'domain2.tld',
        })

        const stats = await coreGetStats(coreGetStatsQuery)
        expect(stats.peopleCount).to.eq(0)
        expect(stats.nodeOwnersCount).to.eq(1)
        expect(stats.frontendNodesCount).to.eq(2)
      })

      describe('connect to a NodeOwner', async () => {
        let tx, nodeOwnerContract

        beforeEach(async () => {
          tx = await coreAddFrontendNodeTx(coreAddFrontendNodeCommand, owner, {
            frontendNodeOwnerAddress: frontendNodeOwner.address,
            frontendNodeName: 'domain.tld',
          })

          const nodeOwnerContractAddress = await getFrontendNodeOwnerContractAddressByTransaction(tx)

          nodeOwnerContract = await ethers.getContractAt('NodeOwner', nodeOwnerContractAddress)
        })

        it('has valid state', async () => {
          expect(await nodeOwnerContract.issuer()).to.eq(diamondAddress)
          expect(await nodeOwnerContract.owner()).to.eq(frontendNodeOwner.address)
        })

        it('should add FrontendNode to NodeOwner', async () => {
          const frontendNodeAddress = await getFrontendNodeAddressByTransaction(tx)

          const nodes = await nodeOwnerContract.getNodes()

          expect(nodes.length).to.eq(1)
          expect(nodes[0]).to.eq(frontendNodeAddress)

          const firstNode = await nodeOwnerContract.nodes(0)

          expect(firstNode).to.eq(frontendNodeAddress)
        })

        describe('connect to a FrontendNode', async () => {
          let frontendNodeContract

          beforeEach(async () => {
            const frontendNodeContractAddress = await getFrontendNodeAddressByTransaction(tx)

            frontendNodeContract = await ethers.getContractAt('FrontendNode', frontendNodeContractAddress)
          })

          it('has valid state', async () => {
            expect(await frontendNodeContract.issuer()).to.eq(diamondAddress)
            expect(await frontendNodeContract.owner()).to.eq(nodeOwnerContract.address)
            expect(await frontendNodeContract.displayName()).to.eq('domain.tld')
          })

          it('does not have any events', async () => {
            const { eventTypes, eventsCount } = await frontendNodeContract.getEventTypesCount()

            expect(eventTypes.length).to.eq(4)
            expect(eventsCount.length).to.eq(4)

            expect(eventTypes).to.eql(['CLIENT_CREATED', 'JOB_CREATED', 'APPLICATION_CREATED', 'CONTRACT_CREATED'])

            const e = {}

            for (let idx = 0; idx < eventTypes.length; idx++) {
              e[eventTypes[idx]] = +eventsCount[idx]
            }

            expect(e.CLIENT_CREATED).to.eq(0)
            expect(e.JOB_CREATED).to.eq(0)
            expect(e.APPLICATION_CREATED).to.eq(0)
            expect(e.CONTRACT_CREATED).to.eq(0)
          })
        })
      })
    })
  })
})
