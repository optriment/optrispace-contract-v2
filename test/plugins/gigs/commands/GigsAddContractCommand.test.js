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
  getContractAddressByTransaction,
  gigsAddJobsCategory,
  gigsAddJobTx,
  gigsAddContract,
  gigsAddContractTx,
  gigsAddApplicationTx,
  gigsGetMyApplication,
  gigsGetCustomer,
  gigsGetMyCustomerProfile,
  gigsGetMyFreelancerProfile,
} = require('../helpers')

const { deployDiamond } = require('../../../../scripts/deploy.js')

describe('GigsAddContractCommand', async () => {
  // NOTE: We use this to simulate contract which is not an EOA.
  let CONTRACT_WITH_CODE

  let diamondAddress
  let diamondCutFacet

  // Signers
  let owner
  let customer
  let freelancer
  let other
  let someone
  let frontendNodeOwner

  before(async () => {
    const DummyContract = await ethers.getContractFactory('DummyContract')
    const dummyContract = await DummyContract.deploy()
    await dummyContract.deployed()

    CONTRACT_WITH_CODE = dummyContract.address
  })

  beforeEach(async () => {
    ;[owner, customer, freelancer, other, someone, frontendNodeOwner] = await ethers.getSigners()

    diamondAddress = await deployDiamond('Test')
    diamondCutFacet = await ethers.getContractAt('DiamondCutFacet', diamondAddress)
  })

  describe('gigsAddContract', async () => {
    describe('Direct access to contract', async () => {
      let frontendNodeAddress, jobAddress, applicationAddress

      beforeEach(async () => {
        await deployFacet(diamondCutFacet, 'CoreAddFrontendNodeCommand')
        const coreAddFrontendNodeCommand = await ethers.getContractAt('CoreAddFrontendNodeCommand', diamondAddress)

        await deployFacet(diamondCutFacet, 'GigsPlugin')
        const gigsPlugin = await ethers.getContractAt('GigsPlugin', diamondAddress)

        await deployFacet(diamondCutFacet, 'GigsAddJobCommand')
        const gigsAddJobCommand = await ethers.getContractAt('GigsAddJobCommand', diamondAddress)

        await deployFacet(diamondCutFacet, 'GigsAddApplicationCommand')
        const gigsAddApplicationCommand = await ethers.getContractAt('GigsAddApplicationCommand', diamondAddress)

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

        const tx3 = await gigsAddApplicationTx(gigsAddApplicationCommand, freelancer, {
          frontendNodeAddress: frontendNodeAddress,
          jobAddress: jobAddress,
          comment: 'comment',
          serviceFee: '0.01',
        })
        applicationAddress = await getApplicationAddressByTransaction(tx3)
      })

      it('returns error', async () => {
        const Command = await ethers.getContractFactory('GigsAddContractCommand')
        const command = await Command.deploy()
        await command.deployed()

        const error = gigsAddContractTx(command, customer, {
          frontendNodeAddress: frontendNodeAddress,
          jobAddress: jobAddress,
          applicationAddress: applicationAddress,
          title: 'title',
          description: 'description',
          value: '0.01',
          durationInDays: 6,
          daysToStartWork: 5,
        })
        await expectRevert(error, 'FrontendNodeDoesNotExist()')
      })
    })

    describe('Access to contract through Diamond', async () => {
      let gigsAddContractCommand

      beforeEach(async () => {
        await deployFacet(diamondCutFacet, 'GigsAddContractCommand')
        gigsAddContractCommand = await ethers.getContractAt('GigsAddContractCommand', diamondAddress)
      })

      describe('when executes as a contract owner', async () => {
        it('returns error', async () => {
          const error = gigsAddContractTx(gigsAddContractCommand, owner, {
            frontendNodeAddress: ethers.constants.AddressZero,
            jobAddress: ethers.constants.AddressZero,
            applicationAddress: ethers.constants.AddressZero,
            title: '',
            description: '',
            value: 0,
            durationInDays: 0,
            daysToStartWork: 0,
          })
          await expectRevert(error, 'LibDiamond: Must not be contract owner')
        })
      })

      describe('with invalid arguments', async () => {
        describe('when frontend node is zero', async () => {
          it('returns error', async () => {
            const error = gigsAddContractTx(gigsAddContractCommand, customer, {
              frontendNodeAddress: ethers.constants.AddressZero,
              jobAddress: ethers.constants.AddressZero,
              applicationAddress: ethers.constants.AddressZero,
              title: '',
              description: '',
              value: 0,
              durationInDays: 0,
              daysToStartWork: 0,
            })
            await expectRevert(error, 'InvalidFrontendNodeAddress()')
          })
        })

        describe('when jobAddress is zero', async () => {
          it('returns error', async () => {
            const error = gigsAddContractTx(gigsAddContractCommand, customer, {
              frontendNodeAddress: someone.address,
              jobAddress: ethers.constants.AddressZero,
              applicationAddress: ethers.constants.AddressZero,
              title: '',
              description: '',
              value: 0,
              durationInDays: 0,
              daysToStartWork: 0,
            })
            await expectRevert(error, 'InvalidJobAddress()')
          })
        })

        describe('when applicationAddress is zero', async () => {
          it('returns error', async () => {
            const error = gigsAddContractTx(gigsAddContractCommand, customer, {
              frontendNodeAddress: someone.address,
              jobAddress: someone.address,
              applicationAddress: ethers.constants.AddressZero,
              title: '',
              description: '',
              value: 0,
              durationInDays: 0,
              daysToStartWork: 0,
            })
            await expectRevert(error, 'InvalidApplicationAddress()')
          })
        })

        describe('when title is empty', async () => {
          it('returns error', async () => {
            const error = gigsAddContractTx(gigsAddContractCommand, customer, {
              frontendNodeAddress: someone.address,
              jobAddress: someone.address,
              applicationAddress: someone.address,
              title: '',
              description: '',
              value: 0,
              durationInDays: 0,
              daysToStartWork: 0,
            })
            await expectRevert(error, 'TitleRequired()')
          })
        })

        describe('when description is empty', async () => {
          it('returns error', async () => {
            const error = gigsAddContractTx(gigsAddContractCommand, customer, {
              frontendNodeAddress: someone.address,
              jobAddress: someone.address,
              applicationAddress: someone.address,
              title: 'title',
              description: '',
              value: 0,
              durationInDays: 0,
              daysToStartWork: 0,
            })
            await expectRevert(error, 'DescriptionRequired()')
          })
        })

        describe('when value is zero', async () => {
          it('returns error', async () => {
            const error = gigsAddContractTx(gigsAddContractCommand, customer, {
              frontendNodeAddress: someone.address,
              jobAddress: someone.address,
              applicationAddress: someone.address,
              title: 'title',
              description: 'description',
              value: 0,
              durationInDays: 0,
              daysToStartWork: 0,
            })
            await expectRevert(error, 'ValueRequired()')
          })
        })

        describe('when durationInDays is zero', async () => {
          it('returns error', async () => {
            const error = gigsAddContractTx(gigsAddContractCommand, customer, {
              frontendNodeAddress: someone.address,
              jobAddress: someone.address,
              applicationAddress: someone.address,
              title: 'title',
              description: 'description',
              value: 1,
              durationInDays: 0,
              daysToStartWork: 0,
            })
            await expectRevert(error, 'DurationInDaysRequired()')
          })
        })

        describe('when durationInDays is greater than 31', async () => {
          it('returns error', async () => {
            const error = gigsAddContractTx(gigsAddContractCommand, customer, {
              frontendNodeAddress: someone.address,
              jobAddress: someone.address,
              applicationAddress: someone.address,
              title: 'title',
              description: 'description',
              value: 1,
              durationInDays: 32,
              daysToStartWork: 0,
            })
            await expectRevert(error, 'DurationInDaysOverflow()')
          })
        })

        describe('when daysToStartWork is zero', async () => {
          it('returns error', async () => {
            const error = gigsAddContractTx(gigsAddContractCommand, customer, {
              frontendNodeAddress: someone.address,
              jobAddress: someone.address,
              applicationAddress: someone.address,
              title: 'title',
              description: 'description',
              value: 1,
              durationInDays: 31,
              daysToStartWork: 0,
            })
            await expectRevert(error, 'DaysToStartWorkRequired()')
          })
        })

        describe('when daysToStartWork is greater than 7', async () => {
          it('returns error', async () => {
            const error = gigsAddContractTx(gigsAddContractCommand, customer, {
              frontendNodeAddress: someone.address,
              jobAddress: someone.address,
              applicationAddress: someone.address,
              title: 'title',
              description: 'description',
              value: 1,
              durationInDays: 31,
              daysToStartWork: 8,
            })
            await expectRevert(error, 'DaysToStartWorkOverflow()')
          })
        })

        describe('when daysToStartWork is equal to durationInDays', async () => {
          it('returns error', async () => {
            const error = gigsAddContractTx(gigsAddContractCommand, customer, {
              frontendNodeAddress: someone.address,
              jobAddress: someone.address,
              applicationAddress: someone.address,
              title: 'title',
              description: 'description',
              value: 1,
              durationInDays: 5,
              daysToStartWork: 5,
            })
            await expectRevert(error, 'DaysToStartWorkInvalid()')
          })
        })

        describe('when daysToStartWork is greater than durationInDays', async () => {
          it('returns error', async () => {
            const error = gigsAddContractTx(gigsAddContractCommand, customer, {
              frontendNodeAddress: someone.address,
              jobAddress: someone.address,
              applicationAddress: someone.address,
              title: 'title',
              description: 'description',
              value: 1,
              durationInDays: 5,
              daysToStartWork: 6,
            })
            await expectRevert(error, 'DaysToStartWorkInvalid()')
          })
        })

        describe('when frontend node is an EOA', async () => {
          it('returns error', async () => {
            const error = gigsAddContractTx(gigsAddContractCommand, customer, {
              frontendNodeAddress: someone.address,
              jobAddress: someone.address,
              applicationAddress: someone.address,
              title: 'title',
              description: 'description',
              value: 1,
              durationInDays: 6,
              daysToStartWork: 5,
            })
            await expectRevert(error, 'FrontendNodeMustHaveCode()')
          })
        })

        describe('when job is an EOA', async () => {
          it('returns error', async () => {
            const error = gigsAddContractTx(gigsAddContractCommand, customer, {
              frontendNodeAddress: CONTRACT_WITH_CODE,
              jobAddress: someone.address,
              applicationAddress: someone.address,
              title: 'title',
              description: 'description',
              value: 1,
              durationInDays: 6,
              daysToStartWork: 5,
            })
            await expectRevert(error, 'JobMustHaveCode()')
          })
        })

        describe('when application is an EOA', async () => {
          it('returns error', async () => {
            const error = gigsAddContractTx(gigsAddContractCommand, customer, {
              frontendNodeAddress: CONTRACT_WITH_CODE,
              jobAddress: CONTRACT_WITH_CODE,
              applicationAddress: someone.address,
              title: 'title',
              description: 'description',
              value: 1,
              durationInDays: 6,
              daysToStartWork: 5,
            })
            await expectRevert(error, 'ApplicationMustHaveCode()')
          })
        })
      })

      describe('when frontend node does not exist', async () => {
        it('returns error', async () => {
          const error = gigsAddContractTx(gigsAddContractCommand, customer, {
            frontendNodeAddress: CONTRACT_WITH_CODE,
            jobAddress: CONTRACT_WITH_CODE,
            applicationAddress: CONTRACT_WITH_CODE,
            title: 'title',
            description: 'description',
            value: 1,
            durationInDays: 6,
            daysToStartWork: 5,
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

        describe('when job does not exist', async () => {
          it('returns error', async () => {
            const error = gigsAddContractTx(gigsAddContractCommand, customer, {
              frontendNodeAddress: frontendNodeAddress,
              jobAddress: CONTRACT_WITH_CODE,
              applicationAddress: CONTRACT_WITH_CODE,
              title: 'title',
              description: 'description',
              value: 1,
              durationInDays: 6,
              daysToStartWork: 5,
            })
            await expectRevert(error, 'JobDoesNotExist()')
          })
        })

        describe('when job exists', async () => {
          let gigsPlugin, jobAddress

          beforeEach(async () => {
            await deployFacet(diamondCutFacet, 'GigsPlugin')
            gigsPlugin = await ethers.getContractAt('GigsPlugin', diamondAddress)

            await deployFacet(diamondCutFacet, 'GigsAddJobCommand')
            const gigsAddJobCommand = await ethers.getContractAt('GigsAddJobCommand', diamondAddress)

            await gigsAddJobsCategory(gigsPlugin, owner, { categoryCode: 'code', categoryLabel: 'label' })

            const tx = await gigsAddJobTx(gigsAddJobCommand, customer, {
              frontendNodeAddress: frontendNodeAddress,
              budget: '0.01',
              title: 'title1',
              description: 'description1',
              categoryIndex: 0,
            })
            jobAddress = await getJobAddressByTransaction(tx)
          })

          describe('when requested as not a job owner', async () => {
            it('returns error', async () => {
              const error = gigsAddContractTx(gigsAddContractCommand, other, {
                frontendNodeAddress: frontendNodeAddress,
                jobAddress: jobAddress,
                applicationAddress: CONTRACT_WITH_CODE,
                title: 'title',
                description: 'description',
                value: 1,
                durationInDays: 6,
                daysToStartWork: 5,
              })
              await expectRevert(error, 'CustomerOnly()')
            })
          })

          describe('when application does not exist', async () => {
            it('returns error', async () => {
              const error = gigsAddContractTx(gigsAddContractCommand, customer, {
                frontendNodeAddress: frontendNodeAddress,
                jobAddress: jobAddress,
                applicationAddress: CONTRACT_WITH_CODE,
                title: 'title',
                description: 'description',
                value: 1,
                durationInDays: 6,
                daysToStartWork: 5,
              })
              await expectRevert(error, 'ApplicationDoesNotExist()')
            })
          })

          describe('when application exists', async () => {
            let applicationAddress

            beforeEach(async () => {
              await deployFacet(diamondCutFacet, 'GigsAddApplicationCommand')
              const gigsAddApplicationCommand = await ethers.getContractAt('GigsAddApplicationCommand', diamondAddress)

              const tx = await gigsAddApplicationTx(gigsAddApplicationCommand, freelancer, {
                frontendNodeAddress: frontendNodeAddress,
                jobAddress: jobAddress,
                comment: 'comment',
                serviceFee: '0.01',
              })

              applicationAddress = await getApplicationAddressByTransaction(tx)
            })

            describe('when contract exist', async () => {
              it('returns error', async () => {
                await gigsAddContract(gigsAddContractCommand, customer, {
                  frontendNodeAddress: frontendNodeAddress,
                  jobAddress: jobAddress,
                  applicationAddress: applicationAddress,
                  title: 'title',
                  description: 'description',
                  value: '0.01',
                  durationInDays: 6,
                  daysToStartWork: 5,
                })

                const error = gigsAddContractTx(gigsAddContractCommand, customer, {
                  frontendNodeAddress: frontendNodeAddress,
                  jobAddress: jobAddress,
                  applicationAddress: applicationAddress,
                  title: 'title',
                  description: 'description',
                  value: 1,
                  durationInDays: 6,
                  daysToStartWork: 5,
                })
                await expectRevert(error, 'ContractExists()')
              })
            })

            describe('when contract does not exist', async () => {
              let gigsFreelancerService,
                gigsGetCustomerQuery,
                gigsGetMyCustomerProfileQuery,
                gigsGetMyFreelancerProfileQuery

              beforeEach(async () => {
                await deployFacet(diamondCutFacet, 'GigsFreelancerService')
                gigsFreelancerService = await ethers.getContractAt('GigsFreelancerService', diamondAddress)

                await deployFacet(diamondCutFacet, 'GigsGetCustomerQuery')
                gigsGetCustomerQuery = await ethers.getContractAt('GigsGetCustomerQuery', diamondAddress)

                await deployFacet(diamondCutFacet, 'GigsGetMyCustomerProfileQuery')
                gigsGetMyCustomerProfileQuery = await ethers.getContractAt(
                  'GigsGetMyCustomerProfileQuery',
                  diamondAddress
                )

                await deployFacet(diamondCutFacet, 'GigsGetMyFreelancerProfileQuery')
                gigsGetMyFreelancerProfileQuery = await ethers.getContractAt(
                  'GigsGetMyFreelancerProfileQuery',
                  diamondAddress
                )
              })

              it('adds a new contract', async () => {
                await gigsAddContract(gigsAddContractCommand, customer, {
                  frontendNodeAddress: frontendNodeAddress,
                  jobAddress: jobAddress,
                  applicationAddress: applicationAddress,
                  title: 'title',
                  description: 'description',
                  value: '0.01',
                  durationInDays: 6,
                  daysToStartWork: 5,
                })

                const stats = await gigsPlugin.gigsGetStats()
                expect(stats.contractsCount).to.eq(1)
              })

              it('updates contract in application', async () => {
                const { exists: existsBefore, dto: dtoBefore } = await gigsGetMyApplication(
                  gigsFreelancerService,
                  freelancer,
                  {
                    jobAddress: jobAddress,
                  }
                )

                expect(existsBefore).to.eq(true)
                expect(dtoBefore.contractAddress).to.eq(ethers.constants.AddressZero)
                expect(dtoBefore.hasContract).to.eq(false)

                const tx = await gigsAddContractTx(gigsAddContractCommand, customer, {
                  frontendNodeAddress: frontendNodeAddress,
                  jobAddress: jobAddress,
                  applicationAddress: applicationAddress,
                  title: 'title',
                  description: 'description',
                  value: '0.01',
                  durationInDays: 6,
                  daysToStartWork: 5,
                })

                const newContractAddress = await getContractAddressByTransaction(tx)

                const { exists, dto } = await gigsGetMyApplication(gigsFreelancerService, freelancer, {
                  jobAddress: jobAddress,
                })
                expect(exists).to.eq(true)
                expect(dto.contractAddress).to.eq(newContractAddress)
                expect(dto.hasContract).to.eq(true)
              })

              it('adds contract to Customer profile', async () => {
                const tx = await gigsAddContractTx(gigsAddContractCommand, customer, {
                  frontendNodeAddress: frontendNodeAddress,
                  jobAddress: jobAddress,
                  applicationAddress: applicationAddress,
                  title: 'title',
                  description: 'description',
                  value: '0.01',
                  durationInDays: 6,
                  daysToStartWork: 5,
                })

                const newContractAddress = await getContractAddressByTransaction(tx)

                const { exists, profile } = await gigsGetMyCustomerProfile(gigsGetMyCustomerProfileQuery, customer)
                expect(exists).to.eq(true)
                expect(profile.owner).to.eq(customer.address)
                expect(profile.myJobs).to.eql([jobAddress])
                expect(profile.myContracts).to.eql([newContractAddress])
              })

              it('adds contract to Freelancer profile', async () => {
                const tx = await gigsAddContractTx(gigsAddContractCommand, customer, {
                  frontendNodeAddress: frontendNodeAddress,
                  jobAddress: jobAddress,
                  applicationAddress: applicationAddress,
                  title: 'title',
                  description: 'description',
                  value: '0.01',
                  durationInDays: 6,
                  daysToStartWork: 5,
                })

                const newContractAddress = await getContractAddressByTransaction(tx)

                const { exists, profile } = await gigsGetMyFreelancerProfile(
                  gigsGetMyFreelancerProfileQuery,
                  freelancer
                )
                expect(exists).to.eq(true)
                expect(profile.owner).to.eq(freelancer.address)
                expect(profile.myApplications).to.eql([applicationAddress])
                expect(profile.myContracts).to.eql([newContractAddress])
              })

              it('updates customer activity timestamp', async () => {
                const { dto: before } = await gigsGetCustomer(gigsGetCustomerQuery, {
                  customerAddress: customer.address,
                })
                expect(before.id).to.eq(customer.address)

                const lastActivityAtBefore = +before.lastActivityAt

                await gigsAddContract(gigsAddContractCommand, customer, {
                  frontendNodeAddress: frontendNodeAddress,
                  jobAddress: jobAddress,
                  applicationAddress: applicationAddress,
                  title: 'title',
                  description: 'description',
                  value: '0.01',
                  durationInDays: 6,
                  daysToStartWork: 5,
                })

                const { dto: after } = await gigsGetCustomer(gigsGetCustomerQuery, {
                  customerAddress: customer.address,
                })
                expect(after.id).to.eq(customer.address)
                expect(+after.lastActivityAt).to.be.above(lastActivityAtBefore)
              })

              it('emits event ContractCreated', async () => {
                const tx = await gigsAddContractTx(gigsAddContractCommand, customer, {
                  frontendNodeAddress: frontendNodeAddress,
                  jobAddress: jobAddress,
                  applicationAddress: applicationAddress,
                  title: 'title',
                  description: 'description',
                  value: '0.01',
                  durationInDays: 6,
                  daysToStartWork: 5,
                })

                const result = await tx.wait()
                expect(result.events.length).to.eq(1)

                const { event, args } = result.events[0]

                expect(event).to.eq('ContractCreated')
                expect(args.customerAddress).to.eq(customer.address)
                expect(args.jobAddress).to.eq(jobAddress)
                expect(args.applicationAddress).to.eq(applicationAddress)
                expect(args.newContractAddress.startsWith('0x')).to.eq(true)
              })

              it('does not add a new client to frontend node', async () => {
                await gigsAddContractTx(gigsAddContractCommand, customer, {
                  frontendNodeAddress: frontendNodeAddress,
                  jobAddress: jobAddress,
                  applicationAddress: applicationAddress,
                  title: 'title',
                  description: 'description',
                  value: '0.01',
                  durationInDays: 6,
                  daysToStartWork: 5,
                })

                const frontendNode = await ethers.getContractAt('FrontendNode', frontendNodeAddress)
                expect(await frontendNode.clientsCount()).to.eq(2)
              })

              it('adds a new event CONTRACT_CREATED to frontend node', async () => {
                const tx = await gigsAddContractTx(gigsAddContractCommand, customer, {
                  frontendNodeAddress: frontendNodeAddress,
                  jobAddress: jobAddress,
                  applicationAddress: applicationAddress,
                  title: 'title',
                  description: 'description',
                  value: '0.01',
                  durationInDays: 6,
                  daysToStartWork: 5,
                })
                const newContractAddress = await getContractAddressByTransaction(tx)

                // 4 - because:
                // index 0 used by CLIENT_CREATED event for customer
                // index 1 used by JOB_CREATED event
                // index 2 used by CLIENT_CREATED event for freelancer
                // index 3 used by APPLICATION_CREATED event
                const frontendNode = await ethers.getContractAt('FrontendNode', frontendNodeAddress)
                const frontendNodeEvent = await frontendNode.getEventByIndex(4)

                expect(+frontendNodeEvent.timestamp).to.be.above(new Date() / 1000)
                expect(frontendNodeEvent.eventType).to.eq('CONTRACT_CREATED')
                expect(frontendNodeEvent.newRecordAddress).to.eq(newContractAddress)
              })

              it('connects to a created contract', async () => {
                const tx = await gigsAddContractTx(gigsAddContractCommand, customer, {
                  frontendNodeAddress: frontendNodeAddress,
                  jobAddress: jobAddress,
                  applicationAddress: applicationAddress,
                  title: 'title',
                  description: 'description',
                  value: '0.01',
                  durationInDays: 6,
                  daysToStartWork: 5,
                })
                const newContractAddress = await getContractAddressByTransaction(tx)

                const contract = await ethers.getContractAt('GigsContractContract', newContractAddress)
                expect(await contract.version()).to.eq(1)
                expect(await contract.deployerAddress()).to.eq(diamondAddress)
                expect(await contract.jobAddress()).to.eq(jobAddress)
                expect(await contract.applicationAddress()).to.eq(applicationAddress)
                expect(await contract.customerAddress()).to.eq(customer.address)
                expect(await contract.contractorAddress()).to.eq(freelancer.address)
                expect(await contract.value()).to.eq(ethers.utils.parseEther('0.01'))
                expect(await contract.workShouldBeStartedBefore()).to.eq(0)
                expect(await contract.resultShouldBeDeliveredBefore()).to.eq(0)
                expect(await contract.state()).to.eq(0)
                expect(await contract.getStatus()).to.eq('created')

                expect(await ethers.provider.getBalance(newContractAddress)).to.eq(0)
              })

              describe('when contract created from another node', async () => {
                let frontendNodeAddress2

                beforeEach(async () => {
                  const tx = await coreAddFrontendNodeTx(coreAddFrontendNodeCommand, owner, {
                    frontendNodeOwnerAddress: frontendNodeOwner.address,
                    frontendNodeName: 'domain2.tld',
                  })

                  frontendNodeAddress2 = await getFrontendNodeAddressByTransaction(tx)
                })

                it('adds a new event CONTRACT_CREATED to another frontend node', async () => {
                  const tx = await gigsAddContractTx(gigsAddContractCommand, customer, {
                    frontendNodeAddress: frontendNodeAddress2,
                    jobAddress: jobAddress,
                    applicationAddress: applicationAddress,
                    title: 'title',
                    description: 'description',
                    value: '0.01',
                    durationInDays: 6,
                    daysToStartWork: 5,
                  })
                  const newContractAddress = await getContractAddressByTransaction(tx)

                  const frontendNode2 = await ethers.getContractAt('FrontendNode', frontendNodeAddress2)
                  const frontendNodeEvent = await frontendNode2.getEventByIndex(0)
                  expect(+frontendNodeEvent.timestamp).to.be.above(new Date() / 1000)
                  expect(frontendNodeEvent.eventType).to.eq('CONTRACT_CREATED')
                  expect(frontendNodeEvent.newRecordAddress).to.eq(newContractAddress)
                })
              })
            })
          })
        })
      })
    })
  })
})
