const { expect } = require('chai')
const { ethers } = require('hardhat')
const helpers = require('@nomicfoundation/hardhat-network-helpers')

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
  gigsGetCustomer,
  gigsGetFreelancer,
  addDaysToTimestamp,
} = require('../helpers')

const { deployDiamond } = require('../../../../scripts/deploy.js')

describe('GigsRefundContractCommand', async () => {
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

  describe('gigsRefundContract', async () => {
    const durationInDays = 31
    const daysToStartWork = 7

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
          durationInDays: durationInDays,
          daysToStartWork: daysToStartWork,
        })
        contractAddress = await getContractAddressByTransaction(tx4)
      })

      it('returns error', async () => {
        const Command = await ethers.getContractFactory('GigsRefundContractCommand')
        const command = await Command.deploy()
        await command.deployed()

        const error = gigsRefundContract(command, customer, { contractAddress: contractAddress })
        await expectRevert(error, 'ContractDoesNotExists()')
      })
    })

    describe('Access to contract through Diamond', async () => {
      let gigsRefundContractCommand

      beforeEach(async () => {
        await deployFacet(diamondCutFacet, 'GigsRefundContractCommand')

        gigsRefundContractCommand = await ethers.getContractAt('GigsRefundContractCommand', diamondAddress)
      })

      describe('when executes as a contract owner', async () => {
        it('returns error', async () => {
          const error = gigsRefundContract(gigsRefundContractCommand, owner, {
            contractAddress: ethers.constants.AddressZero,
          })
          await expectRevert(error, 'LibDiamond: Must not be contract owner')
        })
      })

      describe('with invalid arguments', async () => {
        describe('when contract address is zero', async () => {
          it('returns error', async () => {
            const error = gigsRefundContract(gigsRefundContractCommand, freelancer, {
              contractAddress: ethers.constants.AddressZero,
            })
            await expectRevert(error, 'InvalidContractAddress()')
          })
        })

        describe('when contract address is an EOA', async () => {
          it('returns error', async () => {
            const error = gigsRefundContract(gigsRefundContractCommand, freelancer, {
              contractAddress: someone.address,
            })
            await expectRevert(error, 'ContractMustHaveCode()')
          })
        })
      })

      describe('when contract does not exists', async () => {
        it('returns error', async () => {
          const error = gigsRefundContract(gigsRefundContractCommand, freelancer, {
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
            durationInDays: durationInDays,
            daysToStartWork: daysToStartWork,
          })
          contractAddress = await getContractAddressByTransaction(tx4)
        })

        describe('when executes as a contractor', async () => {
          it('returns error', async () => {
            const error = gigsRefundContract(gigsRefundContractCommand, freelancer, {
              contractAddress: contractAddress,
            })
            await expectRevert(error, 'CustomerOnly()')
          })
        })

        describe('when executes as other', async () => {
          it('returns error', async () => {
            const error = gigsRefundContract(gigsRefundContractCommand, other, { contractAddress: contractAddress })
            await expectRevert(error, 'CustomerOnly()')
          })
        })

        describe('when executes as customer', async () => {
          it('returns error', async () => {
            const error = gigsRefundContract(gigsRefundContractCommand, customer, {
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
              const error = gigsRefundContract(gigsRefundContractCommand, customer, {
                contractAddress: contractAddress,
              })
              await expectRevert(error, 'NotAvailableNow()')
            })

            describe('when contract is funded', async () => {
              let gigsContractsService

              beforeEach(async () => {
                await deployFacet(diamondCutFacet, 'GigsContractsService')

                gigsContractsService = await ethers.getContractAt('GigsContractsService', diamondAddress)

                await deployFacet(diamondCutFacet, 'GigsFundContractCommand')

                const gigsFundContractCommand = await ethers.getContractAt('GigsFundContractCommand', diamondAddress)

                await gigsFundContract(gigsFundContractCommand, customer, {
                  contractAddress: contractAddress,
                  value: '0.02',
                })
              })

              describe('when contractor has time to start work', async () => {
                it('returns error', async () => {
                  const error = gigsRefundContract(gigsRefundContractCommand, customer, {
                    contractAddress: contractAddress,
                  })
                  await expectRevert(error, 'NotAvailableNow()')
                })
              })

              describe('when contractor has one second to start work', async () => {
                it('returns error', async () => {
                  const snapshot = await helpers.takeSnapshot()

                  await helpers.time.increase(daysToStartWork * 24 * 60 * 60 - 1)

                  const error = gigsRefundContract(gigsRefundContractCommand, customer, {
                    contractAddress: contractAddress,
                  })
                  await expectRevert(error, 'NotAvailableNow()')

                  await snapshot.restore()
                })
              })

              describe('when work was not started on time', async () => {
                it('has valid state', async () => {
                  const snapshot = await helpers.takeSnapshot()

                  await helpers.time.increase(daysToStartWork * 24 * 60 * 60 + 1)

                  await gigsRefundContract(gigsRefundContractCommand, customer, { contractAddress: contractAddress })

                  const { exists, dto } = await gigsGetContract(gigsContractsService, customer, {
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
                  expect(+dto.startedAt).to.eq(0)
                  expect(+dto.deliveredAt).to.eq(0)
                  expect(+dto.approvedAt).to.eq(0)
                  expect(+dto.declinedAt).to.eq(0)
                  expect(+dto.withdrewAt).to.eq(0)
                  expect(+dto.refundedAt).to.be.above(+dto.deliveredAt)
                  expect(+dto.closedAt).to.eq(+dto.refundedAt)
                  expect(+dto.workShouldBeStartedBefore).to.closeTo(
                    addDaysToTimestamp(+dto.createdAt, +dto.daysToStartWork),
                    10
                  )
                  expect(+dto.resultShouldBeDeliveredBefore).to.closeTo(
                    addDaysToTimestamp(+dto.createdAt, +dto.durationInDays),
                    10
                  )
                  expect(+dto.durationInDays).to.eq(durationInDays)
                  expect(+dto.daysToStartWork).to.eq(daysToStartWork)

                  await snapshot.restore()
                })

                it('sends all tokens from contract to customer', async () => {
                  const customerBalanceBefore = await ethers.provider.getBalance(customer.address)
                  const customerBalanceBeforeInEth = ethers.utils.formatEther(customerBalanceBefore.toString())

                  const snapshot = await helpers.takeSnapshot()

                  await helpers.time.increase(daysToStartWork * 24 * 60 * 60 + 1)

                  await gigsRefundContract(gigsRefundContractCommand, customer, { contractAddress: contractAddress })

                  const contractBalance = await ethers.provider.getBalance(contractAddress)
                  expect(contractBalance).to.eq(0)

                  const customerBalanceAfter = await ethers.provider.getBalance(customer.address)
                  const customerBalanceAfterInEth = ethers.utils.formatEther(customerBalanceAfter.toString())

                  const diff = customerBalanceAfterInEth - customerBalanceBeforeInEth
                  expect(diff).to.be.gt(parseFloat('0.02') - 2)

                  await snapshot.restore()
                })

                it('emits event ContractRefunded', async () => {
                  const snapshot = await helpers.takeSnapshot()

                  await helpers.time.increase(daysToStartWork * 24 * 60 * 60 + 1)

                  const result = await gigsRefundContract(gigsRefundContractCommand, customer, {
                    contractAddress: contractAddress,
                  })

                  expect(result.events.length).to.eq(1)

                  const { event, args } = result.events[0]

                  expect(event).to.eq('ContractRefunded')
                  expect(args.contractAddress).to.eq(contractAddress)

                  await snapshot.restore()
                })

                it('has correct attributes in Contract', async () => {
                  const snapshot = await helpers.takeSnapshot()

                  await helpers.time.increase(daysToStartWork * 24 * 60 * 60 + 1)

                  await gigsRefundContract(gigsRefundContractCommand, customer, {
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

                  await snapshot.restore()
                })
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

                describe('when contractor has time to deliver result', async () => {
                  it('returns error', async () => {
                    const error = gigsRefundContract(gigsRefundContractCommand, customer, {
                      contractAddress: contractAddress,
                    })
                    await expectRevert(error, 'NotAvailableNow()')
                  })
                })

                // FIXME: We should check why this test couldn't use exact one second like other tests above
                describe('when contractor has ten seconds to deliver result', async () => {
                  it('returns error', async () => {
                    const snapshot = await helpers.takeSnapshot()

                    // NOTE: We can't use 1 second here like in examples above, because of transaction time
                    await helpers.time.increase(durationInDays * 24 * 60 * 60 - 10)

                    const error = gigsRefundContract(gigsRefundContractCommand, customer, {
                      contractAddress: contractAddress,
                    })
                    await expectRevert(error, 'NotAvailableNow()')

                    await snapshot.restore()
                  })
                })

                describe('when result was not delivered on time', async () => {
                  it('has valid state', async () => {
                    const snapshot = await helpers.takeSnapshot()

                    await helpers.time.increase(durationInDays * 24 * 60 * 60 + 1)

                    await gigsRefundContract(gigsRefundContractCommand, customer, { contractAddress: contractAddress })

                    const { exists, dto } = await gigsGetContract(gigsContractsService, customer, {
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
                    expect(+dto.deliveredAt).to.eq(0)
                    expect(+dto.approvedAt).to.eq(0)
                    expect(+dto.declinedAt).to.eq(0)
                    expect(+dto.withdrewAt).to.eq(0)
                    expect(+dto.refundedAt).to.be.above(+dto.startedAt)
                    expect(+dto.closedAt).to.eq(+dto.refundedAt)
                    expect(+dto.workShouldBeStartedBefore).to.closeTo(
                      addDaysToTimestamp(+dto.createdAt, +dto.daysToStartWork),
                      10
                    )
                    expect(+dto.resultShouldBeDeliveredBefore).to.closeTo(
                      addDaysToTimestamp(+dto.createdAt, +dto.durationInDays),
                      10
                    )
                    expect(+dto.durationInDays).to.eq(durationInDays)
                    expect(+dto.daysToStartWork).to.eq(daysToStartWork)

                    await snapshot.restore()
                  })

                  it('sends all tokens from contract to customer', async () => {
                    const customerBalanceBefore = await ethers.provider.getBalance(customer.address)
                    const customerBalanceBeforeInEth = ethers.utils.formatEther(customerBalanceBefore.toString())

                    const snapshot = await helpers.takeSnapshot()

                    await helpers.time.increase(durationInDays * 24 * 60 * 60 + 1)

                    await gigsRefundContract(gigsRefundContractCommand, customer, { contractAddress: contractAddress })

                    const contractBalance = await ethers.provider.getBalance(contractAddress)
                    expect(contractBalance).to.eq(0)

                    const customerBalanceAfter = await ethers.provider.getBalance(customer.address)
                    const customerBalanceAfterInEth = ethers.utils.formatEther(customerBalanceAfter.toString())

                    const diff = customerBalanceAfterInEth - customerBalanceBeforeInEth
                    expect(diff).to.be.gt(parseFloat('0.02') - 2)

                    await snapshot.restore()
                  })

                  it('emits event ContractRefunded', async () => {
                    const snapshot = await helpers.takeSnapshot()

                    await helpers.time.increase(durationInDays * 24 * 60 * 60 + 1)

                    const result = await gigsRefundContract(gigsRefundContractCommand, customer, {
                      contractAddress: contractAddress,
                    })

                    expect(result.events.length).to.eq(1)

                    const { event, args } = result.events[0]

                    expect(event).to.eq('ContractRefunded')
                    expect(args.contractAddress).to.eq(contractAddress)

                    await snapshot.restore()
                  })

                  it('has correct attributes in Contract', async () => {
                    const snapshot = await helpers.takeSnapshot()

                    await helpers.time.increase(durationInDays * 24 * 60 * 60 + 1)

                    await gigsRefundContract(gigsRefundContractCommand, customer, {
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

                    await snapshot.restore()
                  })
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
                    const error = gigsRefundContract(gigsRefundContractCommand, customer, {
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
                      const error = gigsRefundContract(gigsRefundContractCommand, customer, {
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
                        const error = gigsRefundContract(gigsRefundContractCommand, customer, {
                          contractAddress: contractAddress,
                        })
                        await expectRevert(error, 'NotAvailableNow()')
                      })
                    })
                  })

                  describe('when contract is declined', async () => {
                    let gigsGetCustomerQuery, gigsGetFreelancerQuery

                    beforeEach(async () => {
                      await deployFacet(diamondCutFacet, 'GigsDeclineContractCommand')
                      const gigsDeclineContractCommand = await ethers.getContractAt(
                        'GigsDeclineContractCommand',
                        diamondAddress
                      )

                      await deployFacet(diamondCutFacet, 'GigsGetCustomerQuery')
                      gigsGetCustomerQuery = await ethers.getContractAt('GigsGetCustomerQuery', diamondAddress)

                      await deployFacet(diamondCutFacet, 'GigsGetFreelancerQuery')
                      gigsGetFreelancerQuery = await ethers.getContractAt('GigsGetFreelancerQuery', diamondAddress)

                      await gigsDeclineContract(gigsDeclineContractCommand, customer, {
                        contractAddress: contractAddress,
                      })
                    })

                    it('has valid state', async () => {
                      await gigsRefundContract(gigsRefundContractCommand, customer, {
                        contractAddress: contractAddress,
                      })

                      const { exists, dto } = await gigsGetContract(gigsContractsService, customer, {
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
                      expect(+dto.approvedAt).to.eq(0)
                      expect(+dto.declinedAt).to.be.above(+dto.deliveredAt)
                      expect(+dto.withdrewAt).to.eq(0)
                      expect(+dto.refundedAt).to.be.above(+dto.declinedAt)
                      expect(+dto.closedAt).to.eq(+dto.refundedAt)
                      expect(+dto.workShouldBeStartedBefore).to.closeTo(
                        addDaysToTimestamp(+dto.createdAt, +dto.daysToStartWork),
                        10
                      )
                      expect(+dto.resultShouldBeDeliveredBefore).to.closeTo(
                        addDaysToTimestamp(+dto.createdAt, +dto.durationInDays),
                        10
                      )
                      expect(+dto.durationInDays).to.eq(durationInDays)
                      expect(+dto.daysToStartWork).to.eq(daysToStartWork)
                    })

                    it('sends all tokens from contract to customer', async () => {
                      const customerBalanceBefore = await ethers.provider.getBalance(customer.address)
                      const customerBalanceBeforeInEth = ethers.utils.formatEther(customerBalanceBefore.toString())

                      await gigsRefundContract(gigsRefundContractCommand, customer, {
                        contractAddress: contractAddress,
                      })

                      const contractBalance = await ethers.provider.getBalance(contractAddress)
                      expect(contractBalance).to.eq(0)

                      const customerBalanceAfter = await ethers.provider.getBalance(customer.address)
                      const customerBalanceAfterInEth = ethers.utils.formatEther(customerBalanceAfter.toString())

                      const diff = customerBalanceAfterInEth - customerBalanceBeforeInEth
                      expect(diff).to.be.gt(parseFloat('0.02') - 2)
                    })

                    it('emits event ContractRefunded', async () => {
                      const result = await gigsRefundContract(gigsRefundContractCommand, customer, {
                        contractAddress: contractAddress,
                      })

                      expect(result.events.length).to.eq(1)

                      const { event, args } = result.events[0]

                      expect(event).to.eq('ContractRefunded')
                      expect(args.contractAddress).to.eq(contractAddress)
                    })

                    it('has correct attributes in Contract', async () => {
                      await gigsRefundContract(gigsRefundContractCommand, customer, {
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

                    it('updates customer activity timestamp', async () => {
                      const { dto: before } = await gigsGetCustomer(gigsGetCustomerQuery, {
                        customerAddress: customer.address,
                      })
                      expect(before.id).to.eq(customer.address)

                      const lastActivityAtBefore = +before.lastActivityAt

                      await gigsRefundContract(gigsRefundContractCommand, customer, {
                        contractAddress: contractAddress,
                      })

                      const { dto: after } = await gigsGetCustomer(gigsGetCustomerQuery, {
                        customerAddress: customer.address,
                      })
                      expect(after.id).to.eq(customer.address)
                      expect(+after.lastActivityAt).to.be.above(lastActivityAtBefore)
                    })

                    it('increases failed contracts in Freelancer profile', async () => {
                      await gigsRefundContract(gigsRefundContractCommand, customer, {
                        contractAddress: contractAddress,
                      })

                      const { dto } = await gigsGetFreelancer(gigsGetFreelancerQuery, {
                        freelancerAddress: freelancer.address,
                      })
                      expect(dto.id).to.eq(freelancer.address)
                      expect(dto.succeededContractsCount).to.eq(0)
                      expect(dto.failedContractsCount).to.eq(1)
                    })

                    describe('when contract is refunded', async () => {
                      beforeEach(async () => {
                        await gigsRefundContract(gigsRefundContractCommand, customer, {
                          contractAddress: contractAddress,
                        })
                      })

                      it('returns error', async () => {
                        const error = gigsRefundContract(gigsRefundContractCommand, customer, {
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
