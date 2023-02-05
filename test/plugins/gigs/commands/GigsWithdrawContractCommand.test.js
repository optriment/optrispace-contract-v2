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
  gigsGetFreelancer,
  addDaysToTimestamp,
} = require('../helpers')

const { deployDiamond } = require('../../../../scripts/deploy.js')

describe('GigsWithdrawContractCommand', async () => {
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

  describe('gigsWithdrawContract', async () => {
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
        const Command = await ethers.getContractFactory('GigsWithdrawContractCommand')
        const command = await Command.deploy()
        await command.deployed()

        const error = gigsWithdrawContract(command, freelancer, { contractAddress: contractAddress })
        await expectRevert(error, 'ContractDoesNotExists()')
      })
    })

    describe('Access to contract through Diamond', async () => {
      let gigsWithdrawContractCommand

      beforeEach(async () => {
        await deployFacet(diamondCutFacet, 'GigsWithdrawContractCommand')

        gigsWithdrawContractCommand = await ethers.getContractAt('GigsWithdrawContractCommand', diamondAddress)
      })

      describe('when executes as a contract owner', async () => {
        it('returns error', async () => {
          const error = gigsWithdrawContract(gigsWithdrawContractCommand, owner, {
            contractAddress: ethers.constants.AddressZero,
          })
          await expectRevert(error, 'LibDiamond: Must not be contract owner')
        })
      })

      describe('with invalid arguments', async () => {
        describe('when contract address is zero', async () => {
          it('returns error', async () => {
            const error = gigsWithdrawContract(gigsWithdrawContractCommand, freelancer, {
              contractAddress: ethers.constants.AddressZero,
            })
            await expectRevert(error, 'InvalidContractAddress()')
          })
        })

        describe('when contract address is an EOA', async () => {
          it('returns error', async () => {
            const error = gigsWithdrawContract(gigsWithdrawContractCommand, freelancer, {
              contractAddress: someone.address,
            })
            await expectRevert(error, 'ContractMustHaveCode()')
          })
        })
      })

      describe('when contract does not exists', async () => {
        it('returns error', async () => {
          const error = gigsWithdrawContract(gigsWithdrawContractCommand, freelancer, {
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
            const error = gigsWithdrawContract(gigsWithdrawContractCommand, customer, {
              contractAddress: contractAddress,
            })
            await expectRevert(error, 'ContractorOnly()')
          })
        })

        describe('when executes as other', async () => {
          it('returns error', async () => {
            const error = gigsWithdrawContract(gigsWithdrawContractCommand, other, { contractAddress: contractAddress })
            await expectRevert(error, 'ContractorOnly()')
          })
        })

        describe('when executes as contractor', async () => {
          it('returns error', async () => {
            const error = gigsWithdrawContract(gigsWithdrawContractCommand, freelancer, {
              contractAddress: contractAddress,
            })
            await expectRevert(error, 'NotAvailableNow()')
          })

          describe('when contract is accepted', async () => {
            beforeEach(async () => {
              await deployFacet(diamondCutFacet, 'GigsAcceptContractCommand')

              const gigsAcceptContractCommand = await ethers.getContractAt('GigsAcceptContractCommand', diamondAddress)

              await gigsAcceptContract(gigsAcceptContractCommand, freelancer, { contractAddress: contractAddress })
            })

            it('returns error', async () => {
              const error = gigsWithdrawContract(gigsWithdrawContractCommand, freelancer, {
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
                const error = gigsWithdrawContract(gigsWithdrawContractCommand, freelancer, {
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
                  const error = gigsWithdrawContract(gigsWithdrawContractCommand, freelancer, {
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
                    const error = gigsWithdrawContract(gigsWithdrawContractCommand, freelancer, {
                      contractAddress: contractAddress,
                    })
                    await expectRevert(error, 'NotAvailableNow()')
                  })

                  describe('when contract is approved', async () => {
                    let gigsContractsService, gigsGetFreelancerQuery

                    beforeEach(async () => {
                      await deployFacet(diamondCutFacet, 'GigsContractsService')
                      gigsContractsService = await ethers.getContractAt('GigsContractsService', diamondAddress)

                      await deployFacet(diamondCutFacet, 'GigsApproveContractCommand')
                      const gigsApproveContractCommand = await ethers.getContractAt(
                        'GigsApproveContractCommand',
                        diamondAddress
                      )

                      await deployFacet(diamondCutFacet, 'GigsGetFreelancerQuery')
                      gigsGetFreelancerQuery = await ethers.getContractAt('GigsGetFreelancerQuery', diamondAddress)

                      await gigsApproveContract(gigsApproveContractCommand, customer, {
                        contractAddress: contractAddress,
                      })
                    })

                    it('has valid state', async () => {
                      await gigsWithdrawContract(gigsWithdrawContractCommand, freelancer, {
                        contractAddress: contractAddress,
                      })

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
                      expect(dto.status).to.eq('closed')
                      expect(dto.value).to.eq(ethers.utils.parseEther('0.02'))
                      expect(dto.serviceFee).to.eq(ethers.utils.parseEther('0.01'))
                      expect(+dto.createdAt).to.be.above(new Date() / 1000)
                      expect(+dto.acceptedAt).to.be.above(+dto.createdAt)
                      expect(+dto.fundedAt).to.be.above(+dto.acceptedAt)
                      expect(+dto.startedAt).to.be.above(+dto.fundedAt)
                      expect(+dto.deliveredAt).to.be.above(+dto.startedAt)
                      expect(+dto.approvedAt).to.be.above(+dto.deliveredAt)
                      expect(+dto.declinedAt).to.eq(0)
                      expect(+dto.withdrewAt).to.be.above(+dto.approvedAt)
                      expect(+dto.refundedAt).to.eq(0)
                      expect(+dto.closedAt).to.eq(+dto.withdrewAt)
                      expect(+dto.workShouldBeStartedBefore).to.closeTo(
                        addDaysToTimestamp(+dto.createdAt, +dto.daysToStartWork),
                        10
                      )
                      expect(+dto.resultShouldBeDeliveredBefore).to.closeTo(
                        addDaysToTimestamp(+dto.createdAt, +dto.durationInDays),
                        10
                      )
                      expect(+dto.durationInDays).to.eq(2)
                      expect(+dto.daysToStartWork).to.eq(1)
                    })

                    it('sends all tokens from contract to freelancer', async () => {
                      const contractorBalanceBefore = await ethers.provider.getBalance(freelancer.address)
                      const contractorBalanceBeforeInEth = ethers.utils.formatEther(contractorBalanceBefore.toString())

                      await gigsWithdrawContract(gigsWithdrawContractCommand, freelancer, {
                        contractAddress: contractAddress,
                      })

                      const contractBalance = await ethers.provider.getBalance(contractAddress)
                      expect(contractBalance).to.eq(0)

                      const contractorBalanceAfter = await ethers.provider.getBalance(freelancer.address)
                      const contractorBalanceAfterInEth = ethers.utils.formatEther(contractorBalanceAfter.toString())

                      const diff = contractorBalanceAfterInEth - contractorBalanceBeforeInEth
                      expect(diff).to.be.gt(parseFloat('0.02') - 2)
                    })

                    it('emits event ContractWithdrew', async () => {
                      const result = await gigsWithdrawContract(gigsWithdrawContractCommand, freelancer, {
                        contractAddress: contractAddress,
                      })

                      expect(result.events.length).to.eq(1)

                      const { event, args } = result.events[0]

                      expect(event).to.eq('ContractWithdrew')
                      expect(args.contractAddress).to.eq(contractAddress)
                    })

                    it('has correct attributes in Contract', async () => {
                      await gigsWithdrawContract(gigsWithdrawContractCommand, freelancer, {
                        contractAddress: contractAddress,
                      })

                      const { dto } = await gigsGetContract(gigsContractsService, freelancer, {
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
                      expect(await contract.workShouldBeStartedBefore()).to.eq(+dto.workShouldBeStartedBefore)
                      expect(await contract.resultShouldBeDeliveredBefore()).to.eq(+dto.resultShouldBeDeliveredBefore)
                      expect(await contract.state()).to.eq(7)
                      expect(await contract.getStatus()).to.eq('closed')

                      expect(await ethers.provider.getBalance(contractAddress)).to.eq(0)
                    })

                    it('updates freelancer activity timestamp', async () => {
                      const { dto: before } = await gigsGetFreelancer(gigsGetFreelancerQuery, {
                        freelancerAddress: freelancer.address,
                      })
                      expect(before.id).to.eq(freelancer.address)

                      const lastActivityAtBefore = +before.lastActivityAt

                      await gigsWithdrawContract(gigsWithdrawContractCommand, freelancer, {
                        contractAddress: contractAddress,
                      })

                      const { dto: after } = await gigsGetFreelancer(gigsGetFreelancerQuery, {
                        freelancerAddress: freelancer.address,
                      })
                      expect(after.id).to.eq(freelancer.address)
                      expect(+after.lastActivityAt).to.be.above(lastActivityAtBefore)
                    })

                    it('does not increase succeeded and failed contracts in Freelancer profile', async () => {
                      await gigsWithdrawContract(gigsWithdrawContractCommand, freelancer, {
                        contractAddress: contractAddress,
                      })

                      const { dto } = await gigsGetFreelancer(gigsGetFreelancerQuery, {
                        freelancerAddress: freelancer.address,
                      })
                      expect(dto.id).to.eq(freelancer.address)
                      expect(dto.succeededContractsCount).to.eq(1)
                      expect(dto.failedContractsCount).to.eq(0)
                    })

                    describe('when contract is withdrew', async () => {
                      beforeEach(async () => {
                        await gigsWithdrawContract(gigsWithdrawContractCommand, freelancer, {
                          contractAddress: contractAddress,
                        })
                      })

                      it('returns error', async () => {
                        const error = gigsWithdrawContract(gigsWithdrawContractCommand, freelancer, {
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
                      const error = gigsWithdrawContract(gigsWithdrawContractCommand, freelancer, {
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
                        const error = gigsWithdrawContract(gigsWithdrawContractCommand, freelancer, {
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
