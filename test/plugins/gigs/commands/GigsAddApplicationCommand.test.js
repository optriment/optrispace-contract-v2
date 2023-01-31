const { expect } = require('chai')
const { ethers } = require('hardhat')
const {
  deployFacet,
  expectRevert,
  getFrontendNodeAddressByTransaction,
  coreAddFrontendNodeTx,
} = require('../../../helpers')

const {
  getJobAddressByTransaction,
  getApplicationAddressByTransaction,
  gigsAddJobsCategory,
  gigsAddJobTx,
  gigsAddApplication,
  gigsAddApplicationTx,
  gigsGetJob,
} = require('../helpers')

const { deployDiamond } = require('../../../../scripts/deploy.js')

describe('GigsAddApplicationCommand', async () => {
  // NOTE: We use this to simulate contract which is not an EOA.
  let CONTRACT_WITH_CODE

  let diamondAddress
  let diamondCutFacet

  // Signers
  let owner // eslint-disable-line no-unused-vars
  let customer
  let freelancer
  let someone
  let frontendNodeOwner

  before(async () => {
    const DummyContract = await ethers.getContractFactory('DummyContract')
    const dummyContract = await DummyContract.deploy()
    await dummyContract.deployed()

    CONTRACT_WITH_CODE = dummyContract.address
  })

  beforeEach(async () => {
    ;[owner, customer, freelancer, someone, frontendNodeOwner] = await ethers.getSigners()

    diamondAddress = await deployDiamond()
    diamondCutFacet = await ethers.getContractAt('DiamondCutFacet', diamondAddress)
  })

  describe('gigsAddApplication', async () => {
    describe('Direct access to contract', async () => {
      let frontendNodeAddress, jobAddress

      beforeEach(async () => {
        await deployFacet(diamondCutFacet, 'CoreAddFrontendNodeCommand')
        const coreAddFrontendNodeCommand = await ethers.getContractAt('CoreAddFrontendNodeCommand', diamondAddress)

        await deployFacet(diamondCutFacet, 'GigsPlugin')
        const gigsPlugin = await ethers.getContractAt('GigsPlugin', diamondAddress)

        await deployFacet(diamondCutFacet, 'GigsAddJobCommand')
        const gigsAddJobCommand = await ethers.getContractAt('GigsAddJobCommand', diamondAddress)

        const tx1 = await coreAddFrontendNodeTx(coreAddFrontendNodeCommand, owner, {
          frontendNodeOwnerAddress: frontendNodeOwner.address,
          frontendNodeName: 'domain.tld',
        })
        frontendNodeAddress = await getFrontendNodeAddressByTransaction(tx1)

        await gigsAddJobsCategory(gigsPlugin, owner, { categoryCode: 'code', categoryLabel: 'label' })

        const tx2 = await gigsAddJobTx(gigsAddJobCommand, customer, {
          frontendNodeAddress: frontendNodeAddress,
          budget: '0.01',
          title: 'title1',
          description: 'description1',
          categoryIndex: 0,
        })
        jobAddress = await getJobAddressByTransaction(tx2)
      })

      it('returns error', async () => {
        const Command = await ethers.getContractFactory('GigsAddApplicationCommand')
        const command = await Command.deploy()
        await command.deployed()

        const error = gigsAddApplicationTx(command, freelancer, {
          frontendNodeAddress: frontendNodeAddress,
          jobAddress: jobAddress,
          comment: 'comment',
          serviceFee: '0.01',
        })
        await expectRevert(error, 'FrontendNodeDoesNotExist()')
      })
    })

    describe('Access to contract through Diamond', async () => {
      let gigsAddApplicationCommand

      beforeEach(async () => {
        await deployFacet(diamondCutFacet, 'GigsAddApplicationCommand')
        gigsAddApplicationCommand = await ethers.getContractAt('GigsAddApplicationCommand', diamondAddress)
      })

      describe('when executes as a contract owner', async () => {
        it('returns error', async () => {
          const error = gigsAddApplicationTx(gigsAddApplicationCommand, owner, {
            frontendNodeAddress: ethers.constants.AddressZero,
            jobAddress: ethers.constants.AddressZero,
            comment: '',
            serviceFee: 0,
          })
          await expectRevert(error, 'LibDiamond: Must not be contract owner')
        })
      })

      describe('with invalid arguments', async () => {
        describe('when frontend node is zero', async () => {
          it('returns error', async () => {
            const error = gigsAddApplicationTx(gigsAddApplicationCommand, freelancer, {
              frontendNodeAddress: ethers.constants.AddressZero,
              jobAddress: ethers.constants.AddressZero,
              comment: '',
              serviceFee: 0,
            })
            await expectRevert(error, 'InvalidFrontendNodeAddress()')
          })
        })

        describe('when jobAddress is zero', async () => {
          it('returns error', async () => {
            const error = gigsAddApplicationTx(gigsAddApplicationCommand, freelancer, {
              frontendNodeAddress: someone.address,
              jobAddress: ethers.constants.AddressZero,
              comment: '',
              serviceFee: 0,
            })
            await expectRevert(error, 'InvalidJobAddress()')
          })
        })

        describe('when comment is empty', async () => {
          it('returns error', async () => {
            const error = gigsAddApplicationTx(gigsAddApplicationCommand, freelancer, {
              frontendNodeAddress: someone.address,
              jobAddress: someone.address,
              comment: '',
              serviceFee: 0,
            })
            await expectRevert(error, 'CommentRequired()')
          })
        })

        describe('when serviceFee is zero', async () => {
          it('returns error', async () => {
            const error = gigsAddApplicationTx(gigsAddApplicationCommand, freelancer, {
              frontendNodeAddress: someone.address,
              jobAddress: someone.address,
              comment: 'comment',
              serviceFee: 0,
            })
            await expectRevert(error, 'ServiceFeeRequired()')
          })
        })

        describe('when frontend node is an EOA', async () => {
          it('returns error', async () => {
            const error = gigsAddApplicationTx(gigsAddApplicationCommand, freelancer, {
              frontendNodeAddress: someone.address,
              jobAddress: someone.address,
              comment: 'comment',
              serviceFee: '0.01',
            })
            await expectRevert(error, 'FrontendNodeMustHaveCode()')
          })
        })

        describe('when job is an EOA', async () => {
          it('returns error', async () => {
            const error = gigsAddApplicationTx(gigsAddApplicationCommand, freelancer, {
              frontendNodeAddress: CONTRACT_WITH_CODE,
              jobAddress: someone.address,
              comment: 'comment',
              serviceFee: '0.01',
            })
            await expectRevert(error, 'JobMustHaveCode()')
          })
        })
      })

      describe('when frontend node does not exist', async () => {
        it('returns error', async () => {
          const error = gigsAddApplicationTx(gigsAddApplicationCommand, freelancer, {
            frontendNodeAddress: CONTRACT_WITH_CODE,
            jobAddress: CONTRACT_WITH_CODE,
            comment: 'comment',
            serviceFee: '0.01',
          })
          await expectRevert(error, 'FrontendNodeDoesNotExist()')
        })
      })

      describe('when frontend node exists', async () => {
        let coreAddFrontendNodeCommand, frontendNodeAddress1

        beforeEach(async () => {
          await deployFacet(diamondCutFacet, 'CoreAddFrontendNodeCommand')
          coreAddFrontendNodeCommand = await ethers.getContractAt('CoreAddFrontendNodeCommand', diamondAddress)

          const tx = await coreAddFrontendNodeTx(coreAddFrontendNodeCommand, owner, {
            frontendNodeOwnerAddress: frontendNodeOwner.address,
            frontendNodeName: 'domain.tld',
          })
          frontendNodeAddress1 = await getFrontendNodeAddressByTransaction(tx)
        })

        describe('when job does not exist', async () => {
          it('returns error', async () => {
            const error = gigsAddApplicationTx(gigsAddApplicationCommand, freelancer, {
              frontendNodeAddress: frontendNodeAddress1,
              jobAddress: CONTRACT_WITH_CODE,
              comment: 'comment',
              serviceFee: '0.01',
            })
            await expectRevert(error, 'JobDoesNotExist()')
          })
        })

        describe('when job exists', async () => {
          let optriSpace, gigsPlugin, jobAddress

          beforeEach(async () => {
            optriSpace = await ethers.getContractAt('OptriSpace', diamondAddress)

            await deployFacet(diamondCutFacet, 'GigsPlugin')
            gigsPlugin = await ethers.getContractAt('GigsPlugin', diamondAddress)

            await deployFacet(diamondCutFacet, 'GigsAddJobCommand')
            const gigsAddJobCommand = await ethers.getContractAt('GigsAddJobCommand', diamondAddress)

            await gigsAddJobsCategory(gigsPlugin, owner, { categoryCode: 'code', categoryLabel: 'label' })

            const tx = await gigsAddJobTx(gigsAddJobCommand, customer, {
              frontendNodeAddress: frontendNodeAddress1,
              budget: '0.01',
              title: 'title1',
              description: 'description1',
              categoryIndex: 0,
            })
            jobAddress = await getJobAddressByTransaction(tx)
          })

          describe('when applied as a job owner', async () => {
            it('returns error', async () => {
              const error = gigsAddApplicationTx(gigsAddApplicationCommand, customer, {
                frontendNodeAddress: frontendNodeAddress1,
                jobAddress: jobAddress,
                comment: 'comment',
                serviceFee: '0.01',
              })
              await expectRevert(error, 'ApplicantsOnly()')
            })
          })

          describe('when already applied', async () => {
            it('returns error', async () => {
              await gigsAddApplication(gigsAddApplicationCommand, freelancer, {
                frontendNodeAddress: frontendNodeAddress1,
                jobAddress: jobAddress,
                comment: 'comment',
                serviceFee: '0.01',
              })

              const error = gigsAddApplicationTx(gigsAddApplicationCommand, freelancer, {
                frontendNodeAddress: frontendNodeAddress1,
                jobAddress: jobAddress,
                comment: 'comment',
                serviceFee: '0.01',
              })
              await expectRevert(error, 'AlreadyApplied()')
            })
          })

          it('adds a new application', async () => {
            await gigsAddApplication(gigsAddApplicationCommand, freelancer, {
              frontendNodeAddress: frontendNodeAddress1,
              jobAddress: jobAddress,
              comment: 'comment',
              serviceFee: '0.01',
            })

            const { exists, dto } = await gigsGetJob(gigsPlugin, freelancer, { jobAddress: jobAddress })
            expect(exists).to.eq(true)
            expect(+dto.applicationsCount).to.eq(1)
          })

          it('increases total count of applications', async () => {
            await gigsAddApplication(gigsAddApplicationCommand, freelancer, {
              frontendNodeAddress: frontendNodeAddress1,
              jobAddress: jobAddress,
              comment: 'comment',
              serviceFee: '0.01',
            })

            const stats = await gigsPlugin.gigsGetStats()
            expect(stats.applicationsCount).to.eq(1)
          })

          it('adds a new member', async () => {
            await gigsAddApplication(gigsAddApplicationCommand, freelancer, {
              frontendNodeAddress: frontendNodeAddress1,
              jobAddress: jobAddress,
              comment: 'comment',
              serviceFee: '0.01',
            })

            // Customer + other
            const stats = await optriSpace.getStats()
            expect(stats.membersCount).to.eq(2)
          })

          it('emits event ApplicationCreated', async () => {
            const result = await gigsAddApplication(gigsAddApplicationCommand, freelancer, {
              frontendNodeAddress: frontendNodeAddress1,
              jobAddress: jobAddress,
              comment: 'comment',
              serviceFee: '0.01',
            })

            expect(result.events.length).to.eq(1)

            const { event, args } = result.events[0]

            expect(event).to.eq('ApplicationCreated')
            expect(args.applicantAddress).to.eq(freelancer.address)
            expect(args.jobAddress).to.eq(jobAddress)
            expect(args.newApplicationAddress.startsWith('0x')).to.eq(true)
          })

          it('adds a new client to frontend node', async () => {
            await gigsAddApplication(gigsAddApplicationCommand, freelancer, {
              frontendNodeAddress: frontendNodeAddress1,
              jobAddress: jobAddress,
              comment: 'comment',
              serviceFee: '0.01',
            })

            const frontendNode = await ethers.getContractAt('FrontendNode', frontendNodeAddress1)
            expect(await frontendNode.clientsCount()).to.eq(2)
          })

          it('adds a new event CLIENT_CREATED to frontend node', async () => {
            await gigsAddApplication(gigsAddApplicationCommand, freelancer, {
              frontendNodeAddress: frontendNodeAddress1,
              jobAddress: jobAddress,
              comment: 'comment',
              serviceFee: '0.01',
            })

            // 2 - because:
            // index 0 used by CLIENT_CREATED event for a customer
            // index 1 used by JOB_CREATED event
            const frontendNode = await ethers.getContractAt('FrontendNode', frontendNodeAddress1)
            const frontendNodeEvent = await frontendNode.getEventByIndex(2)
            expect(+frontendNodeEvent.timestamp).to.be.above(new Date() / 1000)
            expect(frontendNodeEvent.eventType).to.eq('CLIENT_CREATED')
          })

          it('adds a new event APPLICATION_CREATED to frontend node', async () => {
            const tx = await gigsAddApplicationTx(gigsAddApplicationCommand, freelancer, {
              frontendNodeAddress: frontendNodeAddress1,
              jobAddress: jobAddress,
              comment: 'comment',
              serviceFee: '0.01',
            })
            const newApplicationAddress = await getApplicationAddressByTransaction(tx)

            // 3 - because:
            // index 0 used by CLIENT_CREATED event for a customer
            // index 1 used by JOB_CREATED event
            // index 2 used by CLIENT_CREATED event for a freelancer
            const frontendNode = await ethers.getContractAt('FrontendNode', frontendNodeAddress1)
            const frontendNodeEvent = await frontendNode.getEventByIndex(3)
            expect(+frontendNodeEvent.timestamp).to.be.above(new Date() / 1000)
            expect(frontendNodeEvent.eventType).to.eq('APPLICATION_CREATED')
            expect(frontendNodeEvent.newRecordAddress).to.eq(newApplicationAddress)
          })

          describe('when freelancer applied from another node', async () => {
            let frontendNodeAddress2

            beforeEach(async () => {
              const tx = await coreAddFrontendNodeTx(coreAddFrontendNodeCommand, owner, {
                frontendNodeOwnerAddress: frontendNodeOwner.address,
                frontendNodeName: 'domain2.tld',
              })
              frontendNodeAddress2 = await getFrontendNodeAddressByTransaction(tx)
            })

            it('adds a new client to another frontend node', async () => {
              await gigsAddApplicationTx(gigsAddApplicationCommand, freelancer, {
                frontendNodeAddress: frontendNodeAddress2,
                jobAddress: jobAddress,
                comment: 'comment',
                serviceFee: '0.01',
              })

              const frontendNode1 = await ethers.getContractAt('FrontendNode', frontendNodeAddress1)
              expect(await frontendNode1.clientsCount()).to.eq(1)

              const frontendNode2 = await ethers.getContractAt('FrontendNode', frontendNodeAddress2)
              expect(await frontendNode2.clientsCount()).to.eq(1)
            })

            it('adds a new event CLIENT_CREATED to another frontend node', async () => {
              await gigsAddApplicationTx(gigsAddApplicationCommand, freelancer, {
                frontendNodeAddress: frontendNodeAddress2,
                jobAddress: jobAddress,
                comment: 'comment',
                serviceFee: '0.01',
              })

              const frontendNode2 = await ethers.getContractAt('FrontendNode', frontendNodeAddress2)
              const frontendNodeEvent = await frontendNode2.getEventByIndex(0)
              expect(+frontendNodeEvent.timestamp).to.be.above(new Date() / 1000)
              expect(frontendNodeEvent.eventType).to.eq('CLIENT_CREATED')
            })

            it('adds a new event APPLICATION_CREATED to another frontend node', async () => {
              const tx = await gigsAddApplicationTx(gigsAddApplicationCommand, freelancer, {
                frontendNodeAddress: frontendNodeAddress2,
                jobAddress: jobAddress,
                comment: 'comment',
                serviceFee: '0.01',
              })
              const newApplicationAddress = await getApplicationAddressByTransaction(tx)

              // 1 - because:
              // index 0 used by CLIENT_CREATED event for freelancer
              const frontendNode2 = await ethers.getContractAt('FrontendNode', frontendNodeAddress2)
              const frontendNodeEvent = await frontendNode2.getEventByIndex(1)
              expect(+frontendNodeEvent.timestamp).to.be.above(new Date() / 1000)
              expect(frontendNodeEvent.eventType).to.eq('APPLICATION_CREATED')
              expect(frontendNodeEvent.newRecordAddress).to.eq(newApplicationAddress)
            })
          })
        })
      })
    })
  })
})
