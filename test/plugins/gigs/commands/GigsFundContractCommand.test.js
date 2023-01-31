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
  addDaysToTimestamp,
} = require('../helpers')

const { deployDiamond } = require('../../../../scripts/deploy.js')

describe('GigsFundContractCommand', async () => {
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

    diamondAddress = await deployDiamond()
    diamondCutFacet = await ethers.getContractAt('DiamondCutFacet', diamondAddress)
  })

  describe('gigsFundContract', async () => {
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
        const Command = await ethers.getContractFactory('GigsFundContractCommand')
        const command = await Command.deploy()
        await command.deployed()

        const error = gigsFundContract(command, customer, { contractAddress: contractAddress, value: '0' })
        await expectRevert(error, 'ContractDoesNotExists()')
      })
    })

    describe('Access to contract through Diamond', async () => {
      let gigsFundContractCommand

      beforeEach(async () => {
        await deployFacet(diamondCutFacet, 'GigsFundContractCommand')

        gigsFundContractCommand = await ethers.getContractAt('GigsFundContractCommand', diamondAddress)
      })

      describe('when executes as a contract owner', async () => {
        it('returns error', async () => {
          const error = gigsFundContract(gigsFundContractCommand, owner, {
            contractAddress: ethers.constants.AddressZero,
            value: '0',
          })
          await expectRevert(error, 'LibDiamond: Must not be contract owner')
        })
      })

      describe('with invalid arguments', async () => {
        describe('when contract address is zero', async () => {
          it('returns error', async () => {
            const error = gigsFundContract(gigsFundContractCommand, freelancer, {
              contractAddress: ethers.constants.AddressZero,
              value: '0',
            })
            await expectRevert(error, 'InvalidContractAddress()')
          })
        })

        describe('when contract address is an EOA', async () => {
          it('returns error', async () => {
            const error = gigsFundContract(gigsFundContractCommand, freelancer, {
              contractAddress: someone.address,
              value: '0',
            })
            await expectRevert(error, 'ContractMustHaveCode()')
          })
        })
      })

      describe('when contract does not exists', async () => {
        it('returns error', async () => {
          const error = gigsFundContract(gigsFundContractCommand, freelancer, {
            contractAddress: CONTRACT_WITH_CODE,
            value: '0',
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

        describe('when executes as a freelancer', async () => {
          it('returns error', async () => {
            const error = gigsFundContract(gigsFundContractCommand, freelancer, {
              contractAddress: contractAddress,
              value: '0',
            })
            await expectRevert(error, 'CustomerOnly()')
          })
        })

        describe('when executes as other', async () => {
          it('returns error', async () => {
            const error = gigsFundContract(gigsFundContractCommand, other, {
              contractAddress: contractAddress,
              value: '0',
            })
            await expectRevert(error, 'CustomerOnly()')
          })
        })

        describe('when executes as customer', async () => {
          let gigsContractsService

          beforeEach(async () => {
            await deployFacet(diamondCutFacet, 'GigsContractsService')

            gigsContractsService = await ethers.getContractAt('GigsContractsService', diamondAddress)
          })

          it('returns error', async () => {
            const error = gigsFundContract(gigsFundContractCommand, customer, {
              contractAddress: contractAddress,
              value: '0',
            })
            await expectRevert(error, 'NotAvailableNow()')
          })

          describe('when contract is accepted', async () => {
            let gigsAcceptContractCommand

            beforeEach(async () => {
              await deployFacet(diamondCutFacet, 'GigsAcceptContractCommand')

              gigsAcceptContractCommand = await ethers.getContractAt('GigsAcceptContractCommand', diamondAddress)

              await gigsAcceptContract(gigsAcceptContractCommand, freelancer, { contractAddress: contractAddress })
            })

            describe('when amount is zero', async () => {
              it('returns error', async () => {
                const error = gigsFundContract(gigsFundContractCommand, customer, {
                  contractAddress: contractAddress,
                  value: '0',
                })
                await expectRevert(error, 'AmountIsTooSmall()')
              })
            })

            describe('when amount is too small', async () => {
              it('returns error', async () => {
                const error = gigsFundContract(gigsFundContractCommand, customer, {
                  contractAddress: contractAddress,
                  value: '0.019',
                })
                await expectRevert(error, 'AmountIsTooSmall()')
              })
            })

            describe('when amount is exact value', async () => {
              describe('when contract has been funded on the next day', async () => {
                it('should calculate dates depends on a gap', async () => {
                  const snapshot = await helpers.takeSnapshot()

                  const delayInDays = 1

                  await helpers.time.increase(delayInDays * 24 * 60 * 60)

                  await gigsFundContract(gigsFundContractCommand, customer, {
                    contractAddress: contractAddress,
                    value: '0.02',
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
                  expect(dto.status).to.eq('funded')
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
                  expect(+dto.refundedAt).to.eq(0)
                  expect(+dto.closedAt).to.eq(0)
                  expect(+dto.workShouldBeStartedBefore).to.closeTo(
                    addDaysToTimestamp(+dto.createdAt, +dto.daysToStartWork + delayInDays),
                    10
                  )
                  expect(+dto.resultShouldBeDeliveredBefore).to.closeTo(
                    addDaysToTimestamp(+dto.createdAt, +dto.durationInDays + delayInDays),
                    10
                  )
                  expect(+dto.durationInDays).to.eq(2)
                  expect(+dto.daysToStartWork).to.eq(1)

                  await snapshot.restore()
                })

                it('has correct attributes in Contract', async () => {
                  const snapshot = await helpers.takeSnapshot()

                  const delayInDays = 1

                  await helpers.time.increase(delayInDays * 24 * 60 * 60)

                  await gigsFundContract(gigsFundContractCommand, customer, {
                    contractAddress: contractAddress,
                    value: '0.02',
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
                  expect(await contract.state()).to.eq(2)
                  expect(await contract.getStatus()).to.eq('funded')

                  expect(await ethers.provider.getBalance(contractAddress)).to.eq(ethers.utils.parseEther('0.02'))

                  await snapshot.restore()
                })
              })

              it('has valid state', async () => {
                await gigsFundContract(gigsFundContractCommand, customer, {
                  contractAddress: contractAddress,
                  value: '0.02',
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
                expect(dto.status).to.eq('funded')
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
                expect(+dto.refundedAt).to.eq(0)
                expect(+dto.closedAt).to.eq(0)
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

              it('sends all tokens to Contract', async () => {
                await gigsFundContract(gigsFundContractCommand, customer, {
                  contractAddress: contractAddress,
                  value: '0.02',
                })

                const contractBalance = await ethers.provider.getBalance(contractAddress)
                expect(contractBalance).to.eq(ethers.utils.parseEther('0.02'))
              })

              it('emits event ContractFunded', async () => {
                const result = await gigsFundContract(gigsFundContractCommand, customer, {
                  contractAddress: contractAddress,
                  value: '0.02',
                })

                // 0 - ContractFunded
                // 1 - WorkShouldBeStartedBeforeChanged (through GigsContractContract)
                // 2 - ResultShouldBeDeliveredBeforeChanged (through GigsContractContract)
                expect(result.events.length).to.eq(3)

                const { event, args } = result.events[0]

                expect(event).to.eq('ContractFunded')
                expect(args.contractAddress).to.eq(contractAddress)
              })

              it('has correct attributes in Contract', async () => {
                await gigsFundContract(gigsFundContractCommand, customer, {
                  contractAddress: contractAddress,
                  value: '0.02',
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
                expect(await contract.state()).to.eq(2)
                expect(await contract.getStatus()).to.eq('funded')

                expect(await ethers.provider.getBalance(contractAddress)).to.eq(ethers.utils.parseEther('0.02'))
              })
            })

            describe('when amount is greater than contract value', async () => {
              it('has valid state', async () => {
                await gigsFundContract(gigsFundContractCommand, customer, {
                  contractAddress: contractAddress,
                  value: '0.03',
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
                expect(dto.status).to.eq('funded')
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
                expect(+dto.refundedAt).to.eq(0)
                expect(+dto.closedAt).to.eq(0)
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

              it('sends all tokens to Contract', async () => {
                await gigsFundContract(gigsFundContractCommand, customer, {
                  contractAddress: contractAddress,
                  value: '0.03',
                })

                const contractBalance = await ethers.provider.getBalance(contractAddress)
                expect(contractBalance).to.eq(ethers.utils.parseEther('0.03'))
              })

              it('has correct attributes in Contract', async () => {
                await gigsFundContract(gigsFundContractCommand, customer, {
                  contractAddress: contractAddress,
                  value: '0.03',
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
                expect(await contract.state()).to.eq(2)
                expect(await contract.getStatus()).to.eq('funded')

                expect(await ethers.provider.getBalance(contractAddress)).to.eq(ethers.utils.parseEther('0.03'))
              })
            })

            describe('when contract is funded', async () => {
              beforeEach(async () => {
                await gigsFundContract(gigsFundContractCommand, customer, {
                  contractAddress: contractAddress,
                  value: '0.02',
                })
              })

              it('returns error', async () => {
                const error = gigsFundContract(gigsFundContractCommand, customer, {
                  contractAddress: contractAddress,
                  value: '0.02',
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
