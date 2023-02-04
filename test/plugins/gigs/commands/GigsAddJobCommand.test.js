const { expect } = require('chai')
const { ethers } = require('hardhat')
const {
  deployFacet,
  expectRevert,
  getFrontendNodeAddressByTransaction,
  coreAddFrontendNodeTx,
  coreGetStats,
} = require('../../../helpers')

const {
  getJobAddressByTransaction,
  gigsAddJobsCategory,
  gigsAddJob,
  gigsAddJobTx,
  gigsGetCustomers,
  gigsGetCustomer,
  gigsGetMyCustomerProfile,
} = require('../helpers')

const { deployDiamond } = require('../../../../scripts/deploy.js')

describe('GigsAddJobCommand', async () => {
  // NOTE: We use this to simulate contract which is not an EOA.
  let CONTRACT_WITH_CODE

  let diamondAddress
  let diamondCutFacet

  // Signers
  let owner
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
          let coreGetStatsQuery, gigsPlugin, gigsGetCustomersQuery, gigsGetCustomerQuery, gigsGetMyCustomerProfileQuery

          beforeEach(async () => {
            await deployFacet(diamondCutFacet, 'CoreGetStatsQuery')
            coreGetStatsQuery = await ethers.getContractAt('CoreGetStatsQuery', diamondAddress)

            await deployFacet(diamondCutFacet, 'GigsPlugin')
            gigsPlugin = await ethers.getContractAt('GigsPlugin', diamondAddress)

            await deployFacet(diamondCutFacet, 'GigsGetCustomersQuery')
            gigsGetCustomersQuery = await ethers.getContractAt('GigsGetCustomersQuery', diamondAddress)

            await deployFacet(diamondCutFacet, 'GigsGetCustomerQuery')
            gigsGetCustomerQuery = await ethers.getContractAt('GigsGetCustomerQuery', diamondAddress)

            await deployFacet(diamondCutFacet, 'GigsGetMyCustomerProfileQuery')
            gigsGetMyCustomerProfileQuery = await ethers.getContractAt('GigsGetMyCustomerProfileQuery', diamondAddress)

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

          it('adds a new person', async () => {
            await gigsAddJob(gigsAddJobCommand, customer, {
              frontendNodeAddress: frontendNodeAddress,
              budget: '0.01',
              title: 'title',
              description: 'description',
              categoryIndex: 0,
            })

            const stats = await coreGetStats(coreGetStatsQuery)
            expect(stats.peopleCount).to.eq(1)
          })

          describe('when person does not have Customer profile yet', async () => {
            let jobAddress

            beforeEach(async () => {
              const tx = await gigsAddJobTx(gigsAddJobCommand, customer, {
                frontendNodeAddress: frontendNodeAddress,
                budget: '0.01',
                title: 'title',
                description: 'description',
                categoryIndex: 0,
              })

              jobAddress = await getJobAddressByTransaction(tx)
            })

            it('adds a new customer', async () => {
              const stats = await gigsPlugin.gigsGetStats()
              expect(stats.customersCount).to.eq(1)
            })

            it('returns a created customer from gigsGetCustomersQuery', async () => {
              const customers = await gigsGetCustomers(gigsGetCustomersQuery)
              expect(customers.length).to.eq(1)

              expect(customers[0].id).to.eq(customer.address)
              expect(customers[0].displayName).to.eq('')
              expect(customers[0].totalContractsCount).to.eq(0)
              expect(customers[0].lastActivityAt).to.be.above(0)
            })

            it('creates a Customer profile', async () => {
              const { exists, profile } = await gigsGetMyCustomerProfile(gigsGetMyCustomerProfileQuery, customer)
              expect(exists).to.eq(true)

              expect(profile.owner).to.eq(customer.address)
              expect(profile.myJobs).to.eql([jobAddress])
              expect(profile.myContracts).to.eql([])
            })
          })

          describe('when person has Customer profile', async () => {
            let firstJobAddress, secondJobAddress

            beforeEach(async () => {
              const tx1 = await gigsAddJobTx(gigsAddJobCommand, customer, {
                frontendNodeAddress: frontendNodeAddress,
                budget: '0.01',
                title: 'title',
                description: 'description',
                categoryIndex: 0,
              })

              firstJobAddress = await getJobAddressByTransaction(tx1)
            })

            it('does not add a new customer', async () => {
              await gigsAddJob(gigsAddJobCommand, customer, {
                frontendNodeAddress: frontendNodeAddress,
                budget: '0.02',
                title: 'title2',
                description: 'description2',
                categoryIndex: 0,
              })

              const stats = await gigsPlugin.gigsGetStats()
              expect(stats.customersCount).to.eq(1)
            })

            it('adds a new job to profile', async () => {
              const tx = await gigsAddJobTx(gigsAddJobCommand, customer, {
                frontendNodeAddress: frontendNodeAddress,
                budget: '0.02',
                title: 'title2',
                description: 'description2',
                categoryIndex: 0,
              })

              secondJobAddress = await getJobAddressByTransaction(tx)

              const { exists, profile } = await gigsGetMyCustomerProfile(gigsGetMyCustomerProfileQuery, customer)
              expect(exists).to.eq(true)

              expect(profile.myJobs).to.eql([firstJobAddress, secondJobAddress])
            })

            it('updates person activity timestamp', async () => {
              const { dto: before } = await gigsGetCustomer(gigsGetCustomerQuery, {
                customerAddress: customer.address,
              })
              expect(before.id).to.eq(customer.address)

              const lastActivityAtBefore = +before.lastActivityAt

              await gigsAddJob(gigsAddJobCommand, customer, {
                frontendNodeAddress: frontendNodeAddress,
                budget: '0.02',
                title: 'title2',
                description: 'description2',
                categoryIndex: 0,
              })

              const { dto: after } = await gigsGetCustomer(gigsGetCustomerQuery, {
                customerAddress: customer.address,
              })
              expect(after.id).to.eq(customer.address)
              expect(+after.lastActivityAt).to.be.above(lastActivityAtBefore)
            })
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

            const frontendNode = await ethers.getContractAt('FrontendNode', frontendNodeAddress)
            expect(await frontendNode.clientsCount()).to.eq(1)
          })

          it('adds a new event CLIENT_CREATED to frontend node', async () => {
            await gigsAddJob(gigsAddJobCommand, customer, {
              frontendNodeAddress: frontendNodeAddress,
              budget: '0.01',
              title: 'title',
              description: 'description',
              categoryIndex: 0,
            })

            const frontendNode = await ethers.getContractAt('FrontendNode', frontendNodeAddress)
            const frontendNodeEvent = await frontendNode.getEventByIndex(0)
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
            const frontendNode = await ethers.getContractAt('FrontendNode', frontendNodeAddress)
            const frontendNodeEvent = await frontendNode.getEventByIndex(1)
            expect(+frontendNodeEvent.timestamp).to.be.above(new Date() / 1000)
            expect(frontendNodeEvent.eventType).to.eq('JOB_CREATED')
            expect(frontendNodeEvent.newRecordAddress).to.eq(newJobAddress)
          })

          it('connects to a created contract', async () => {
            const tx = await gigsAddJobTx(gigsAddJobCommand, customer, {
              frontendNodeAddress: frontendNodeAddress,
              budget: '0.01',
              title: 'title',
              description: 'description',
              categoryIndex: 0,
            })
            const newJobAddress = await getJobAddressByTransaction(tx)

            const contract = await ethers.getContractAt('GigsJobContract', newJobAddress)
            expect(await contract.version()).to.eq(1)
            expect(await contract.deployerAddress()).to.eq(diamondAddress)
            expect(await contract.customerAddress()).to.eq(customer.address)
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

              const stats = await coreGetStats(coreGetStatsQuery)
              expect(stats.peopleCount).to.eq(1)

              const gigsStats = await gigsPlugin.gigsGetStats()
              expect(gigsStats.jobsCount).to.eq(2)

              const frontendNode1 = await ethers.getContractAt('FrontendNode', frontendNodeAddress)

              const event1 = await frontendNode1.getEventByIndex(0)
              expect(event1.eventType).to.eq('CLIENT_CREATED')

              const event2 = await frontendNode1.getEventByIndex(1)
              expect(event2.eventType).to.eq('JOB_CREATED')
              expect(event2.newRecordAddress).to.eq(jobAddress1)

              const frontendNode2 = await ethers.getContractAt('FrontendNode', frontendNodeAddress2)

              const event3 = await frontendNode2.getEventByIndex(0)
              expect(event3.eventType).to.eq('JOB_CREATED')
              expect(event3.newRecordAddress).to.eq(jobAddress2)
            })
          })
        })
      })
    })
  })
})
