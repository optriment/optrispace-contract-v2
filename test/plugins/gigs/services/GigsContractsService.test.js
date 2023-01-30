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

describe('GigsContractsService', async () => {
  let diamondAddress
  let diamondCutFacet

  let coreAddFrontendNodeCommand
  let gigsContractsService

  // Signers
  let owner // eslint-disable-line no-unused-vars
  let customer
  let freelancer
  let other
  let someone
  let frontendNodeOwner

  beforeEach(async () => {
    ;[owner, customer, freelancer, other, someone, frontendNodeOwner] = await ethers.getSigners()

    diamondAddress = await deployDiamond()
    diamondCutFacet = await ethers.getContractAt('DiamondCutFacet', diamondAddress)

    await deployFacet(diamondCutFacet, 'CoreAddFrontendNodeCommand')
    await deployFacet(diamondCutFacet, 'GigsContractsService')

    coreAddFrontendNodeCommand = await ethers.getContractAt('CoreAddFrontendNodeCommand', diamondAddress)
    gigsContractsService = await ethers.getContractAt('GigsContractsService', diamondAddress)
  })

  describe('gigsGetContract', async () => {
    describe('with invalid arguments', async () => {
      describe('when contractAddress is zero', async () => {
        it('returns error', async () => {
          const error = gigsGetContract(gigsContractsService, other, {
            contractAddress: ethers.constants.AddressZero,
          })
          await expectRevert(error, 'InvalidContractAddress()')
        })
      })
    })

    describe('when contract does not exist', async () => {
      it('returns false and an empty DTO', async () => {
        const { exists, dto, contractBalance } = await gigsGetContract(gigsContractsService, other, {
          contractAddress: someone.address,
        })

        expect(exists).to.eq(false)
        expect(dto.id).to.eq(ethers.constants.AddressZero)
        expect(contractBalance).to.eq(0)
      })
    })

    describe('when contract is created', async () => {
      let jobAddress, applicationAddress, contractAddress

      beforeEach(async () => {
        await deployFacet(diamondCutFacet, 'GigsPlugin')
        await deployFacet(diamondCutFacet, 'GigsAddJobCommand')
        await deployFacet(diamondCutFacet, 'GigsAddApplicationCommand')
        await deployFacet(diamondCutFacet, 'GigsAddContractCommand')

        const gigsPlugin = await ethers.getContractAt('GigsPlugin', diamondAddress)
        const gigsAddJobCommand = await ethers.getContractAt('GigsAddJobCommand', diamondAddress)
        const gigsAddApplicationCommand = await ethers.getContractAt('GigsAddApplicationCommand', diamondAddress)
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
          serviceFee: '0.02',
        })
        applicationAddress = await getApplicationAddressByTransaction(tx3)

        const tx4 = await gigsAddContractTx(gigsAddContractCommand, customer, {
          frontendNodeAddress: frontendNodeAddress,
          jobAddress: jobAddress,
          applicationAddress: applicationAddress,
          title: 'title',
          description: 'description',
          value: '0.03',
          durationInDays: 2,
          daysToStartWork: 1,
        })
        contractAddress = await getContractAddressByTransaction(tx4)
      })

      describe('when requested by not a participant', async () => {
        it('returns error', async () => {
          const error = gigsGetContract(gigsContractsService, other, {
            contractAddress: contractAddress,
          })
          await expectRevert(error, 'Unauthorized()')
        })
      })

      describe('when requested by a customer', async () => {
        it('returns true and DTO', async () => {
          const { exists, dto, contractBalance } = await gigsGetContract(gigsContractsService, customer, {
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
          expect(dto.value).to.eq(ethers.utils.parseEther('0.03'))
          expect(dto.serviceFee).to.eq(ethers.utils.parseEther('0.02'))
          expect(dto.durationInDays).to.eq(2)
          expect(dto.daysToStartWork).to.eq(1)
          expect(dto.status).to.eq('created')

          expect(contractBalance).to.eq(0)
        })
      })

      describe('when requested by a contractor', async () => {
        it('returns true and DTO', async () => {
          const { exists, dto, contractBalance } = await gigsGetContract(gigsContractsService, freelancer, {
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
          expect(dto.value).to.eq(ethers.utils.parseEther('0.03'))
          expect(dto.serviceFee).to.eq(ethers.utils.parseEther('0.02'))
          expect(dto.durationInDays).to.eq(2)
          expect(dto.daysToStartWork).to.eq(1)
          expect(dto.status).to.eq('created')

          expect(contractBalance).to.eq(0)
        })

        describe('when contract is accepted', async () => {
          beforeEach(async () => {
            await deployFacet(diamondCutFacet, 'GigsAcceptContractCommand')

            const gigsAcceptContractCommand = await ethers.getContractAt('GigsAcceptContractCommand', diamondAddress)

            await gigsAcceptContract(gigsAcceptContractCommand, freelancer, { contractAddress: contractAddress })
          })

          it('returns zero balance', async () => {
            const { dto, contractBalance } = await gigsGetContract(gigsContractsService, customer, {
              contractAddress: contractAddress,
            })
            expect(dto.status).to.eq('accepted')
            expect(contractBalance).to.eq(0)
          })

          describe('when contract is funded', async () => {
            beforeEach(async () => {
              await deployFacet(diamondCutFacet, 'GigsFundContractCommand')

              const gigsFundContractCommand = await ethers.getContractAt('GigsFundContractCommand', diamondAddress)

              await gigsFundContract(gigsFundContractCommand, customer, {
                contractAddress: contractAddress,
                value: '0.03',
              })
            })

            it('returns valid balance', async () => {
              const { dto, contractBalance } = await gigsGetContract(gigsContractsService, customer, {
                contractAddress: contractAddress,
              })
              expect(dto.status).to.eq('funded')
              expect(contractBalance).to.eq(ethers.utils.parseEther('0.03'))
            })

            describe('when contract is started', async () => {
              beforeEach(async () => {
                await deployFacet(diamondCutFacet, 'GigsStartContractCommand')

                const gigsStartContractCommand = await ethers.getContractAt('GigsStartContractCommand', diamondAddress)

                await gigsStartContract(gigsStartContractCommand, freelancer, { contractAddress: contractAddress })
              })

              it('returns valid balance', async () => {
                const { dto, contractBalance } = await gigsGetContract(gigsContractsService, customer, {
                  contractAddress: contractAddress,
                })
                expect(dto.status).to.eq('started')
                expect(contractBalance).to.eq(ethers.utils.parseEther('0.03'))
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

                it('returns valid balance', async () => {
                  const { dto, contractBalance } = await gigsGetContract(gigsContractsService, customer, {
                    contractAddress: contractAddress,
                  })
                  expect(dto.status).to.eq('delivered')
                  expect(contractBalance).to.eq(ethers.utils.parseEther('0.03'))
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

                  it('returns valid balance', async () => {
                    const { dto, contractBalance } = await gigsGetContract(gigsContractsService, customer, {
                      contractAddress: contractAddress,
                    })
                    expect(dto.status).to.eq('approved')
                    expect(contractBalance).to.eq(ethers.utils.parseEther('0.03'))
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

                    it('returns zero balance', async () => {
                      const { dto, contractBalance } = await gigsGetContract(gigsContractsService, customer, {
                        contractAddress: contractAddress,
                      })
                      expect(dto.status).to.eq('closed')
                      expect(contractBalance).to.eq(0)
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

                  it('returns valid balance', async () => {
                    const { dto, contractBalance } = await gigsGetContract(gigsContractsService, customer, {
                      contractAddress: contractAddress,
                    })
                    expect(dto.status).to.eq('declined')
                    expect(contractBalance).to.eq(ethers.utils.parseEther('0.03'))
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

                    it('returns zero balance', async () => {
                      const { dto, contractBalance } = await gigsGetContract(gigsContractsService, customer, {
                        contractAddress: contractAddress,
                      })
                      expect(dto.status).to.eq('closed')
                      expect(contractBalance).to.eq(0)
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
