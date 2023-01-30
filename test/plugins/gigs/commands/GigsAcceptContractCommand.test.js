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
  gigsAddContractTx,
  gigsAddApplicationTx,
  gigsAcceptContract,
  gigsFundContract,
  gigsStartContract,
  gigsDeliverContract,
  gigsApproveContract,
  gigsDeclineContract,
  gigsWithdrawContract,
  gigsRefundContract,
  gigsGetContract,
} = require('../helpers')

const { deployDiamond } = require('../../../../scripts/deploy.js')

describe('GigsAcceptContractCommand', async () => {
  // NOTE: We use this to simulate contract which is not an EOA.
  let CONTRACT_WITH_CODE

  let diamondAddress
  let diamondCutFacet

  // Signers
  let owner // eslint-disable-line no-unused-vars
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

    diamondAddress = await deployDiamond()
    diamondCutFacet = await ethers.getContractAt('DiamondCutFacet', diamondAddress)
  })

  describe('gigsAcceptContract', async () => {
    describe('Direct access to contract', async () => {
      let contractAddress

      beforeEach(async () => {
        await deployFacet(diamondCutFacet, 'CoreAddFrontendNodeCommand')
        const coreAddFrontendNodeCommand = await ethers.getContractAt('CoreAddFrontendNodeCommand', diamondAddress)

        await deployFacet(diamondCutFacet, 'GigsPlugin')
        const gigsPlugin = await ethers.getContractAt('GigsPlugin', diamondAddress)

        await deployFacet(diamondCutFacet, 'GigsAddJobCommand')
        const gigsAddJobCommand = await ethers.getContractAt('GigsAddJobCommand', diamondAddress)

        await deployFacet(diamondCutFacet, 'GigsAddApplicationCommand')
        const gigsAddApplicationCommand = await ethers.getContractAt('GigsAddApplicationCommand', diamondAddress)

        await deployFacet(diamondCutFacet, 'GigsAddContractCommand')
        const gigsAddContractCommand = await ethers.getContractAt('GigsAddContractCommand', diamondAddress)

        const tx1 = await coreAddFrontendNodeTx(coreAddFrontendNodeCommand, owner, {
          frontendNodeOwnerAddress: frontendNodeOwner.address,
          frontendNodeName: 'domain.tld',
        })
        const frontendNodeAddress = await getFrontendNodeAddressByTransaction(tx1)

        await gigsAddJobsCategory(gigsPlugin, owner, { categoryCode: 'code', categoryLabel: 'label' })

        const tx2 = await gigsAddJobTx(gigsAddJobCommand, customer, {
          frontendNodeAddress: frontendNodeAddress,
          budget: '0.01',
          title: 'title1',
          description: 'description1',
          categoryIndex: 0,
        })
        const jobAddress = await getJobAddressByTransaction(tx2)

        const tx3 = await gigsAddApplicationTx(gigsAddApplicationCommand, freelancer, {
          frontendNodeAddress: frontendNodeAddress,
          jobAddress: jobAddress,
          comment: 'comment',
          serviceFee: '0.01',
        })
        const applicationAddress = await getApplicationAddressByTransaction(tx3)

        const tx4 = await gigsAddContractTx(gigsAddContractCommand, customer, {
          frontendNodeAddress: frontendNodeAddress,
          jobAddress: jobAddress,
          applicationAddress: applicationAddress,
          title: 'title',
          description: 'description',
          value: '0.01',
          durationInDays: 2,
          daysToStartWork: 1,
        })
        contractAddress = await getContractAddressByTransaction(tx4)
      })

      it('returns error', async () => {
        const Command = await ethers.getContractFactory('GigsAcceptContractCommand')
        const command = await Command.deploy()
        await command.deployed()

        const error = gigsAcceptContract(command, freelancer, { contractAddress: contractAddress })
        await expectRevert(error, 'ContractDoesNotExists()')
      })
    })

    describe('Access to contract through Diamond', async () => {
      let gigsAcceptContractCommand

      beforeEach(async () => {
        await deployFacet(diamondCutFacet, 'GigsAcceptContractCommand')

        gigsAcceptContractCommand = await ethers.getContractAt('GigsAcceptContractCommand', diamondAddress)
      })

      describe('when executes as a contract owner', async () => {
        it('returns error', async () => {
          const error = gigsAcceptContract(gigsAcceptContractCommand, owner, {
            contractAddress: ethers.constants.AddressZero,
          })
          await expectRevert(error, 'LibDiamond: Must not be contract owner')
        })
      })

      describe('with invalid arguments', async () => {
        describe('when contract address is zero', async () => {
          it('returns error', async () => {
            const error = gigsAcceptContract(gigsAcceptContractCommand, freelancer, {
              contractAddress: ethers.constants.AddressZero,
            })
            await expectRevert(error, 'InvalidContractAddress()')
          })
        })

        describe('when contract address is an EOA', async () => {
          it('returns error', async () => {
            const error = gigsAcceptContract(gigsAcceptContractCommand, freelancer, {
              contractAddress: someone.address,
            })
            await expectRevert(error, 'ContractMustHaveCode()')
          })
        })
      })

      describe('when contract does not exists', async () => {
        it('returns error', async () => {
          const error = gigsAcceptContract(gigsAcceptContractCommand, freelancer, {
            contractAddress: CONTRACT_WITH_CODE,
          })
          await expectRevert(error, 'ContractDoesNotExists()')
        })
      })

      describe('when contract is created', async () => {
        let jobAddress, applicationAddress, contractAddress

        beforeEach(async () => {
          await deployFacet(diamondCutFacet, 'CoreAddFrontendNodeCommand')
          const coreAddFrontendNodeCommand = await ethers.getContractAt('CoreAddFrontendNodeCommand', diamondAddress)

          await deployFacet(diamondCutFacet, 'GigsPlugin')
          const gigsPlugin = await ethers.getContractAt('GigsPlugin', diamondAddress)

          await deployFacet(diamondCutFacet, 'GigsAddJobCommand')
          const gigsAddJobCommand = await ethers.getContractAt('GigsAddJobCommand', diamondAddress)

          await deployFacet(diamondCutFacet, 'GigsAddApplicationCommand')
          const gigsAddApplicationCommand = await ethers.getContractAt('GigsAddApplicationCommand', diamondAddress)

          await deployFacet(diamondCutFacet, 'GigsAddContractCommand')
          const gigsAddContractCommand = await ethers.getContractAt('GigsAddContractCommand', diamondAddress)

          const tx1 = await coreAddFrontendNodeTx(coreAddFrontendNodeCommand, owner, {
            frontendNodeOwnerAddress: frontendNodeOwner.address,
            frontendNodeName: 'domain.tld',
          })
          const frontendNodeAddress = await getFrontendNodeAddressByTransaction(tx1)

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

          const tx4 = await gigsAddContractTx(gigsAddContractCommand, customer, {
            frontendNodeAddress: frontendNodeAddress,
            jobAddress: jobAddress,
            applicationAddress: applicationAddress,
            title: 'title',
            description: 'description',
            value: '0.02',
            durationInDays: 2,
            daysToStartWork: 1,
          })
          contractAddress = await getContractAddressByTransaction(tx4)
        })

        describe('when executes as a customer', async () => {
          it('returns error', async () => {
            const error = gigsAcceptContract(gigsAcceptContractCommand, customer, { contractAddress: contractAddress })
            await expectRevert(error, 'ContractorOnly()')
          })
        })

        describe('when executes as other', async () => {
          it('returns error', async () => {
            const error = gigsAcceptContract(gigsAcceptContractCommand, other, { contractAddress: contractAddress })
            await expectRevert(error, 'ContractorOnly()')
          })
        })

        describe('when executes as contractor', async () => {
          let gigsContractsService

          beforeEach(async () => {
            await deployFacet(diamondCutFacet, 'GigsContractsService')

            gigsContractsService = await ethers.getContractAt('GigsContractsService', diamondAddress)
          })

          it('has valid state', async () => {
            await gigsAcceptContract(gigsAcceptContractCommand, freelancer, { contractAddress: contractAddress })

            const { exists, dto } = await gigsGetContract(gigsContractsService, freelancer, {
              contractAddress: contractAddress,
            })
            expect(exists).to.eq(true)
            expect(dto.id).to.eq(contractAddress)
            expect(dto.jobAddress).to.eq(jobAddress)
            expect(dto.applicationAddress).to.eq(applicationAddress)
            expect(dto.customerAddress).to.eq(customer.address)
            expect(dto.contractorAddress).to.eq(freelancer.address)
            expect(dto.title).to.eq('title')
            expect(dto.description).to.eq('description')
            expect(dto.status).to.eq('accepted')
            expect(dto.value).to.eq(ethers.utils.parseEther('0.02'))
            expect(dto.serviceFee).to.eq(ethers.utils.parseEther('0.01'))
            expect(+dto.createdAt).to.be.above(new Date() / 1000)
            expect(+dto.acceptedAt).to.be.above(+dto.createdAt)
            expect(+dto.fundedAt).to.eq(0)
            expect(+dto.startedAt).to.eq(0)
            expect(+dto.deliveredAt).to.eq(0)
            expect(+dto.approvedAt).to.eq(0)
            expect(+dto.declinedAt).to.eq(0)
            expect(+dto.withdrewAt).to.eq(0)
            expect(+dto.refundedAt).to.eq(0)
            expect(+dto.closedAt).to.eq(0)
            expect(+dto.workShouldBeStartedBefore).to.eq(0)
            expect(+dto.resultShouldBeDeliveredBefore).to.eq(0)
            expect(+dto.durationInDays).to.eq(2)
            expect(+dto.daysToStartWork).to.eq(1)
          })

          it('emits event ContractAccepted', async () => {
            const result = await gigsAcceptContract(gigsAcceptContractCommand, freelancer, {
              contractAddress: contractAddress,
            })

            expect(result.events.length).to.eq(1)

            const { event, args } = result.events[0]

            expect(event).to.eq('ContractAccepted')
            expect(args.contractAddress).to.eq(contractAddress)
          })

          it('has correct attributes in Contract', async () => {
            await gigsAcceptContract(gigsAcceptContractCommand, freelancer, {
              contractAddress: contractAddress,
            })

            const contract = await ethers.getContractAt('GigsContractContract', contractAddress)
            expect(await contract.version()).to.eq(1)
            expect(await contract.deployerAddress()).to.eq(diamondAddress)
            expect(await contract.jobAddress()).to.eq(jobAddress)
            expect(await contract.applicationAddress()).to.eq(applicationAddress)
            expect(await contract.customerAddress()).to.eq(customer.address)
            expect(await contract.contractorAddress()).to.eq(freelancer.address)
            expect(await contract.value()).to.eq(ethers.utils.parseEther('0.02'))
            expect(await contract.workShouldBeStartedBefore()).to.eq(0)
            expect(await contract.resultShouldBeDeliveredBefore()).to.eq(0)
            expect(await contract.state()).to.eq(1)
            expect(await contract.getStatus()).to.eq('accepted')

            expect(await ethers.provider.getBalance(contractAddress)).to.eq(0)
          })

          describe('when contract is accepted', async () => {
            beforeEach(async () => {
              await gigsAcceptContract(gigsAcceptContractCommand, freelancer, { contractAddress: contractAddress })
            })

            it('returns error', async () => {
              const error = gigsAcceptContract(gigsAcceptContractCommand, freelancer, {
                contractAddress: contractAddress,
              })
              await expectRevert(error, 'NotAvailableNow()')
            })

            describe('when contract is funded', async () => {
              beforeEach(async () => {
                await deployFacet(diamondCutFacet, 'GigsFundContractCommand')

                const gigsFundContractCommand = await ethers.getContractAt('GigsFundContractCommand', diamondAddress)

                await gigsFundContract(gigsFundContractCommand, customer, {
                  contractAddress: contractAddress,
                  value: '0.02',
                })
              })

              it('returns error', async () => {
                const error = gigsAcceptContract(gigsAcceptContractCommand, freelancer, {
                  contractAddress: contractAddress,
                })
                await expectRevert(error, 'NotAvailableNow()')
              })

              describe('when contract is started', async () => {
                beforeEach(async () => {
                  await deployFacet(diamondCutFacet, 'GigsStartContractCommand')

                  const gigsStartContractCommand = await ethers.getContractAt(
                    'GigsStartContractCommand',
                    diamondAddress
                  )

                  await gigsStartContract(gigsStartContractCommand, freelancer, { contractAddress: contractAddress })
                })

                it('returns error', async () => {
                  const error = gigsAcceptContract(gigsAcceptContractCommand, freelancer, {
                    contractAddress: contractAddress,
                  })
                  await expectRevert(error, 'NotAvailableNow()')
                })

                describe('when contract is delivered', async () => {
                  beforeEach(async () => {
                    await deployFacet(diamondCutFacet, 'GigsDeliverContractCommand')

                    const gigsDeliverContractCommand = await ethers.getContractAt(
                      'GigsDeliverContractCommand',
                      diamondAddress
                    )

                    await gigsDeliverContract(gigsDeliverContractCommand, freelancer, {
                      contractAddress: contractAddress,
                    })
                  })

                  it('returns error', async () => {
                    const error = gigsAcceptContract(gigsAcceptContractCommand, freelancer, {
                      contractAddress: contractAddress,
                    })
                    await expectRevert(error, 'NotAvailableNow()')
                  })

                  describe('when contract is approved', async () => {
                    beforeEach(async () => {
                      await deployFacet(diamondCutFacet, 'GigsApproveContractCommand')

                      const gigsApproveContractCommand = await ethers.getContractAt(
                        'GigsApproveContractCommand',
                        diamondAddress
                      )

                      await gigsApproveContract(gigsApproveContractCommand, customer, {
                        contractAddress: contractAddress,
                      })
                    })

                    it('returns error', async () => {
                      const error = gigsAcceptContract(gigsAcceptContractCommand, freelancer, {
                        contractAddress: contractAddress,
                      })
                      await expectRevert(error, 'NotAvailableNow()')
                    })

                    describe('when contract is withdrew', async () => {
                      beforeEach(async () => {
                        await deployFacet(diamondCutFacet, 'GigsWithdrawContractCommand')

                        const gigsWithdrawContractCommand = await ethers.getContractAt(
                          'GigsWithdrawContractCommand',
                          diamondAddress
                        )

                        await gigsWithdrawContract(gigsWithdrawContractCommand, freelancer, {
                          contractAddress: contractAddress,
                        })
                      })

                      it('returns error', async () => {
                        const error = gigsAcceptContract(gigsAcceptContractCommand, freelancer, {
                          contractAddress: contractAddress,
                        })
                        await expectRevert(error, 'NotAvailableNow()')
                      })
                    })
                  })

                  describe('when contract is declined', async () => {
                    beforeEach(async () => {
                      await deployFacet(diamondCutFacet, 'GigsDeclineContractCommand')

                      const gigsDeclineContractCommand = await ethers.getContractAt(
                        'GigsDeclineContractCommand',
                        diamondAddress
                      )

                      await gigsDeclineContract(gigsDeclineContractCommand, customer, {
                        contractAddress: contractAddress,
                      })
                    })

                    it('returns error', async () => {
                      const error = gigsAcceptContract(gigsAcceptContractCommand, freelancer, {
                        contractAddress: contractAddress,
                      })
                      await expectRevert(error, 'NotAvailableNow()')
                    })

                    describe('when contract is refunded', async () => {
                      beforeEach(async () => {
                        await deployFacet(diamondCutFacet, 'GigsRefundContractCommand')

                        const gigsRefundContractCommand = await ethers.getContractAt(
                          'GigsRefundContractCommand',
                          diamondAddress
                        )

                        await gigsRefundContract(gigsRefundContractCommand, customer, {
                          contractAddress: contractAddress,
                        })
                      })

                      it('returns error', async () => {
                        const error = gigsAcceptContract(gigsAcceptContractCommand, freelancer, {
                          contractAddress: contractAddress,
                        })
                        await expectRevert(error, 'NotAvailableNow()')
                      })
                    })
                  })
                })
              })
            })
          })
        })
      })
    })
  })
})
