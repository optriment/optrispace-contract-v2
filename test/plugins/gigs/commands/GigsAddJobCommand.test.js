const { expect } = require('chai')
const { ethers } = require('hardhat')
const {
  deployFacet,
  expectRevert,
  getFrontendNodeAddressByTransaction,
  coreAddFrontendNodeTx,
} = require('../../../helpers')

const { getJobAddressByTransaction, gigsAddJobsCategory, gigsAddJob, gigsAddJobTx } = require('../helpers')

const { deployDiamond } = require('../../../../scripts/deploy.js')

describe('GigsAddJobCommand', async () => {
  // NOTE: We use this to simulate contract which is not an EOA.
  let CONTRACT_WITH_CODE

  let diamondAddress
  let diamondCutFacet

  // Signers
  let owner // eslint-disable-line no-unused-vars
  let customer
  let other
  let frontendNodeOwner

  before(async () => {
    const DummyContract = await ethers.getContractFactory('DummyContract')
    const dummyContract = await DummyContract.deploy()
    await dummyContract.deployed()

    CONTRACT_WITH_CODE = dummyContract.address
  })

  beforeEach(async () => {
    ;[owner, customer, other, frontendNodeOwner] = await ethers.getSigners()

    diamondAddress = await deployDiamond()
    diamondCutFacet = await ethers.getContractAt('DiamondCutFacet', diamondAddress)
  })

  describe('gigsAddJob', async () => {
    describe('Direct access to contract', async () => {
      let frontendNodeAddress

      beforeEach(async () => {
        await deployFacet(diamondCutFacet, 'CoreAddFrontendNodeCommand')
        const coreAddFrontendNodeCommand = await ethers.getContractAt('CoreAddFrontendNodeCommand', diamondAddress)

        const tx1 = await coreAddFrontendNodeTx(coreAddFrontendNodeCommand, owner, {
          frontendNodeOwnerAddress: frontendNodeOwner.address,
          frontendNodeName: 'domain.tld',
        })
        frontendNodeAddress = await getFrontendNodeAddressByTransaction(tx1)
      })

      it('returns error', async () => {
        const Command = await ethers.getContractFactory('GigsAddJobCommand')
        const command = await Command.deploy()
        await command.deployed()

        const error = gigsAddJobTx(command, customer, {
          frontendNodeAddress: frontendNodeAddress,
          budget: '0',
          title: 'title',
          description: 'description',
          categoryIndex: 42,
        })
        await expectRevert(error, 'FrontendNodeDoesNotExist()')
      })
    })

    describe('Access to contract through Diamond', async () => {
      let gigsAddJobCommand

      beforeEach(async () => {
        await deployFacet(diamondCutFacet, 'GigsAddJobCommand')
        gigsAddJobCommand = await ethers.getContractAt('GigsAddJobCommand', diamondAddress)
      })

      describe('when executes as a contract owner', async () => {
        it('returns error', async () => {
          const error = gigsAddJobTx(gigsAddJobCommand, owner, {
            frontendNodeAddress: ethers.constants.AddressZero,
            budget: 0,
            title: '',
            description: '',
            categoryIndex: 0,
          })
          await expectRevert(error, 'LibDiamond: Must not be contract owner')
        })
      })

      describe('with invalid arguments', async () => {
        describe('when frontend node is zero', async () => {
          it('returns error', async () => {
            const error = gigsAddJobTx(gigsAddJobCommand, customer, {
              frontendNodeAddress: ethers.constants.AddressZero,
              budget: 0,
              title: '',
              description: '',
              categoryIndex: 0,
            })
            await expectRevert(error, 'InvalidFrontendNodeAddress()')
          })
        })

        describe('when title is empty', async () => {
          it('returns error', async () => {
            const error = gigsAddJobTx(gigsAddJobCommand, customer, {
              frontendNodeAddress: other.address,
              budget: 0,
              title: '',
              description: '',
              categoryIndex: 0,
            })
            await expectRevert(error, 'TitleRequired()')
          })
        })

        describe('when description is empty', async () => {
          it('returns error', async () => {
            const error = gigsAddJobTx(gigsAddJobCommand, customer, {
              frontendNodeAddress: other.address,
              budget: 0,
              title: 'title',
              description: '',
              categoryIndex: 0,
            })
            await expectRevert(error, 'DescriptionRequired()')
          })
        })

        describe('when frontend node is an EOA', async () => {
          it('returns error', async () => {
            const error = gigsAddJobTx(gigsAddJobCommand, customer, {
              frontendNodeAddress: other.address,
              budget: 0,
              title: 'title',
              description: 'description',
              categoryIndex: 0,
            })
            await expectRevert(error, 'FrontendNodeMustHaveCode()')
          })
        })
      })

      describe('when frontend node does not exist', async () => {
        it('returns error', async () => {
          const error = gigsAddJobTx(gigsAddJobCommand, customer, {
            frontendNodeAddress: CONTRACT_WITH_CODE,
            budget: 0,
            title: 'title',
            description: 'description',
            categoryIndex: 0,
          })

          await expectRevert(error, 'FrontendNodeDoesNotExist()')
        })
      })

      describe('when frontend node exists', async () => {
        let coreAddFrontendNodeCommand, frontendNodeAddress

        beforeEach(async () => {
          await deployFacet(diamondCutFacet, 'CoreAddFrontendNodeCommand')
          coreAddFrontendNodeCommand = await ethers.getContractAt('CoreAddFrontendNodeCommand', diamondAddress)

          const tx = await coreAddFrontendNodeTx(coreAddFrontendNodeCommand, owner, {
            frontendNodeOwnerAddress: frontendNodeOwner.address,
            frontendNodeName: 'domain.tld',
          })
          frontendNodeAddress = await getFrontendNodeAddressByTransaction(tx)
        })

        describe('without jobs categories', async () => {
          it('returns error', async () => {
            const error = gigsAddJobTx(gigsAddJobCommand, customer, {
              frontendNodeAddress: frontendNodeAddress,
              budget: 0,
              title: 'title',
              description: 'description',
              categoryIndex: 0,
            })
            await expectRevert(error, 'NoCategories()')
          })
        })

        describe('with jobs categories', async () => {
          let optriSpace, gigsPlugin

          beforeEach(async () => {
            optriSpace = await ethers.getContractAt('OptriSpace', diamondAddress)

            await deployFacet(diamondCutFacet, 'GigsPlugin')
            gigsPlugin = await ethers.getContractAt('GigsPlugin', diamondAddress)

            await gigsAddJobsCategory(gigsPlugin, owner, { categoryCode: 'code', categoryLabel: 'label' })
          })

          describe('when category index does not exist', async () => {
            it('returns error', async () => {
              const error = gigsAddJobTx(gigsAddJobCommand, customer, {
                frontendNodeAddress: frontendNodeAddress,
                budget: 0,
                title: 'title',
                description: 'description',
                categoryIndex: 1,
              })
              await expectRevert(error, 'InvalidCategoryIndex()')
            })
          })

          it('adds a new job', async () => {
            await gigsAddJob(gigsAddJobCommand, customer, {
              frontendNodeAddress: frontendNodeAddress,
              budget: '0.01',
              title: 'title',
              description: 'description',
              categoryIndex: 0,
            })

            const stats = await gigsPlugin.gigsGetStats()
            expect(stats.jobsCount).to.eq(1)
          })

          it('adds a new member', async () => {
            await gigsAddJob(gigsAddJobCommand, customer, {
              frontendNodeAddress: frontendNodeAddress,
              budget: '0.01',
              title: 'title',
              description: 'description',
              categoryIndex: 0,
            })

            const stats = await optriSpace.getStats()
            expect(stats.membersCount).to.eq(1)
          })

          it('emits event JobCreated', async () => {
            const tx = await gigsAddJobTx(gigsAddJobCommand, customer, {
              frontendNodeAddress: frontendNodeAddress,
              budget: '0.01',
              title: 'title',
              description: 'description',
              categoryIndex: 0,
            })

            const result = await tx.wait()

            expect(result.events.length).to.eq(1)

            const { event, args } = result.events[0]

            expect(event).to.eq('JobCreated')
            expect(args.customerAddress).to.eq(customer.address)
            expect(args.newJobAddress.startsWith('0x')).to.eq(true)
          })

          it('adds a new client to frontend node', async () => {
            await gigsAddJob(gigsAddJobCommand, customer, {
              frontendNodeAddress: frontendNodeAddress,
              budget: '0.01',
              title: 'title',
              description: 'description',
              categoryIndex: 0,
            })

            expect(await optriSpace.getFrontendNodeClientsCount(frontendNodeAddress)).to.eq(1)
          })

          it('adds a new event CLIENT_CREATED to frontend node', async () => {
            await gigsAddJob(gigsAddJobCommand, customer, {
              frontendNodeAddress: frontendNodeAddress,
              budget: '0.01',
              title: 'title',
              description: 'description',
              categoryIndex: 0,
            })

            const frontendNodeEvent = await optriSpace.getFrontendNodeEventByIndex(frontendNodeAddress, 0)
            expect(+frontendNodeEvent.timestamp).to.be.above(new Date() / 1000)
            expect(frontendNodeEvent.eventType).to.eq('CLIENT_CREATED')
          })

          it('adds a new event JOB_CREATED to frontend node', async () => {
            const tx = await gigsAddJobTx(gigsAddJobCommand, customer, {
              frontendNodeAddress: frontendNodeAddress,
              budget: '0.01',
              title: 'title',
              description: 'description',
              categoryIndex: 0,
            })
            const newJobAddress = await getJobAddressByTransaction(tx)

            // 1 - because:
            // index 0 used by CLIENT_CREATED event as a customer
            const frontendNodeEvent = await optriSpace.getFrontendNodeEventByIndex(frontendNodeAddress, 1)
            expect(+frontendNodeEvent.timestamp).to.be.above(new Date() / 1000)
            expect(frontendNodeEvent.eventType).to.eq('JOB_CREATED')
            expect(frontendNodeEvent.newRecordAddress).to.eq(newJobAddress)
          })

          describe('when added another job as the customer on the second node', async () => {
            let frontendNodeAddress2

            beforeEach(async () => {
              const tx = await coreAddFrontendNodeTx(coreAddFrontendNodeCommand, owner, {
                frontendNodeOwnerAddress: frontendNodeOwner.address,
                frontendNodeName: 'domain2.tld',
              })
              frontendNodeAddress2 = await getFrontendNodeAddressByTransaction(tx)
            })

            it('does not create a client on the second node', async () => {
              const tx1 = await gigsAddJobTx(gigsAddJobCommand, customer, {
                frontendNodeAddress: frontendNodeAddress,
                budget: '0.01',
                title: 'title',
                description: 'description',
                categoryIndex: 0,
              })
              const jobAddress1 = await getJobAddressByTransaction(tx1)

              const tx2 = await gigsAddJobTx(gigsAddJobCommand, customer, {
                frontendNodeAddress: frontendNodeAddress2,
                budget: '0.01',
                title: 'title',
                description: 'description',
                categoryIndex: 0,
              })
              const jobAddress2 = await getJobAddressByTransaction(tx2)

              const stats = await optriSpace.getStats()
              expect(stats.membersCount).to.eq(1)

              const gigsStats = await gigsPlugin.gigsGetStats()
              expect(gigsStats.jobsCount).to.eq(2)

              const event1 = await optriSpace.getFrontendNodeEventByIndex(frontendNodeAddress, 0)
              expect(event1.eventType).to.eq('CLIENT_CREATED')

              const event2 = await optriSpace.getFrontendNodeEventByIndex(frontendNodeAddress, 1)
              expect(event2.eventType).to.eq('JOB_CREATED')
              expect(event2.newRecordAddress).to.eq(jobAddress1)

              const event3 = await optriSpace.getFrontendNodeEventByIndex(frontendNodeAddress2, 0)
              expect(event3.eventType).to.eq('JOB_CREATED')
              expect(event3.newRecordAddress).to.eq(jobAddress2)
            })
          })
        })
      })
    })
  })
})
