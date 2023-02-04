const { expect } = require('chai')
const { ethers } = require('hardhat')
const { deployFacet, getFrontendNodeAddressByTransaction, coreAddFrontendNodeTx } = require('../../../helpers')

const {
  getJobAddressByTransaction,
  getApplicationAddressByTransaction,
  getContractAddressByTransaction,
  gigsAddJobsCategory,
  gigsAddJobTx,
  gigsAddApplicationTx,
  gigsAddContractTx,
  gigsAcceptContract,
  gigsFundContract,
  gigsStartContract,
  gigsDeliverContract,
  gigsApproveContract,
  gigsDeclineContract,
  gigsRefundContract,
  gigsGetFreelancer,
} = require('../helpers')

const { deployDiamond } = require('../../../../scripts/deploy.js')

describe('GigsGetFreelancerQuery', async () => {
  let diamondAddress
  let diamondCutFacet

  let gigsPlugin
  let gigsGetFreelancerQuery
  let gigsAddJobCommand
  let gigsAddApplicationCommand

  // Signers
  let owner
  let customer
  let freelancer
  let other
  let frontendNodeOwner

  beforeEach(async () => {
    ;[owner, customer, freelancer, other, frontendNodeOwner] = await ethers.getSigners()

    diamondAddress = await deployDiamond()
    diamondCutFacet = await ethers.getContractAt('DiamondCutFacet', diamondAddress)

    await deployFacet(diamondCutFacet, 'GigsPlugin')
    await deployFacet(diamondCutFacet, 'GigsGetFreelancerQuery')
    await deployFacet(diamondCutFacet, 'GigsAddJobCommand')
    await deployFacet(diamondCutFacet, 'GigsAddApplicationCommand')

    gigsPlugin = await ethers.getContractAt('GigsPlugin', diamondAddress)
    gigsGetFreelancerQuery = await ethers.getContractAt('GigsGetFreelancerQuery', diamondAddress)
    gigsAddJobCommand = await ethers.getContractAt('GigsAddJobCommand', diamondAddress)
    gigsAddApplicationCommand = await ethers.getContractAt('GigsAddApplicationCommand', diamondAddress)
  })

  describe('gigsGetFreelancer', async () => {
    let frontendNodeAddress

    beforeEach(async () => {
      await deployFacet(diamondCutFacet, 'CoreAddFrontendNodeCommand')
      const coreAddFrontendNodeCommand = await ethers.getContractAt('CoreAddFrontendNodeCommand', diamondAddress)

      const tx = await coreAddFrontendNodeTx(coreAddFrontendNodeCommand, owner, {
        frontendNodeOwnerAddress: frontendNodeOwner.address,
        frontendNodeName: 'domain.tld',
      })
      frontendNodeAddress = await getFrontendNodeAddressByTransaction(tx)
    })

    describe('when freelancer does not exist', async () => {
      it('returns false and empty dto', async () => {
        const { exists, dto } = await gigsGetFreelancer(gigsGetFreelancerQuery, { freelancerAddress: other.address })
        expect(exists).to.eq(false)
        expect(dto.id).to.eq(ethers.constants.AddressZero)
      })
    })

    describe('when freelancer exists', async () => {
      let jobAddress, applicationAddress

      beforeEach(async () => {
        await gigsAddJobsCategory(gigsPlugin, owner, { categoryCode: 'code', categoryLabel: 'Label' })

        const tx1 = await gigsAddJobTx(gigsAddJobCommand, customer, {
          frontendNodeAddress: frontendNodeAddress,
          budget: '0.01',
          title: 'title',
          description: 'description',
          categoryIndex: 0,
        })
        jobAddress = await getJobAddressByTransaction(tx1)

        const tx2 = await gigsAddApplicationTx(gigsAddApplicationCommand, freelancer, {
          frontendNodeAddress: frontendNodeAddress,
          jobAddress: jobAddress,
          comment: 'comment1',
          serviceFee: '0.02',
        })

        applicationAddress = await getApplicationAddressByTransaction(tx2)
      })

      describe('without contracts', async () => {
        it('returns freelancer', async () => {
          const { exists, dto } = await gigsGetFreelancer(gigsGetFreelancerQuery, {
            freelancerAddress: freelancer.address,
          })
          expect(exists).to.eq(true)

          expect(dto.id).to.eq(freelancer.address)
          expect(dto.displayName).to.eq('')
          expect(dto.about).to.eq('')
          expect(dto.totalContractsCount).to.eq(0)
          expect(dto.failedContractsCount).to.eq(0)
          expect(dto.succeededContractsCount).to.eq(0)
          expect(dto.lastActivityAt).to.be.above(0)
        })
      })

      describe('with contracts', async () => {
        let contractAddress

        beforeEach(async () => {
          await deployFacet(diamondCutFacet, 'GigsAddContractCommand')
          const gigsAddContractCommand = await ethers.getContractAt('GigsAddContractCommand', diamondAddress)

          const tx = await gigsAddContractTx(gigsAddContractCommand, customer, {
            frontendNodeAddress: frontendNodeAddress,
            jobAddress: jobAddress,
            applicationAddress: applicationAddress,
            title: 'title',
            description: 'description',
            value: '0.02',
            durationInDays: 2,
            daysToStartWork: 1,
          })
          contractAddress = await getContractAddressByTransaction(tx)
        })

        it('returns totalContractsCount', async () => {
          const { exists, dto } = await gigsGetFreelancer(gigsGetFreelancerQuery, {
            freelancerAddress: freelancer.address,
          })
          expect(exists).to.eq(true)

          expect(dto.id).to.eq(freelancer.address)
          expect(dto.displayName).to.eq('')
          expect(dto.about).to.eq('')
          expect(dto.totalContractsCount).to.eq(1)
          expect(dto.failedContractsCount).to.eq(0)
          expect(dto.succeededContractsCount).to.eq(0)
          expect(dto.lastActivityAt).to.be.above(0)
        })

        describe('when contract if succeeded', async () => {
          beforeEach(async () => {
            await deployFacet(diamondCutFacet, 'GigsAcceptContractCommand')
            const gigsAcceptContractCommand = await ethers.getContractAt('GigsAcceptContractCommand', diamondAddress)

            await deployFacet(diamondCutFacet, 'GigsFundContractCommand')
            const gigsFundContractCommand = await ethers.getContractAt('GigsFundContractCommand', diamondAddress)

            await deployFacet(diamondCutFacet, 'GigsStartContractCommand')
            const gigsStartContractCommand = await ethers.getContractAt('GigsStartContractCommand', diamondAddress)

            await deployFacet(diamondCutFacet, 'GigsApproveContractCommand')
            const gigsApproveContractCommand = await ethers.getContractAt('GigsApproveContractCommand', diamondAddress)

            await gigsAcceptContract(gigsAcceptContractCommand, freelancer, { contractAddress: contractAddress })

            await gigsFundContract(gigsFundContractCommand, customer, {
              contractAddress: contractAddress,
              value: '0.02',
            })

            await gigsStartContract(gigsStartContractCommand, freelancer, { contractAddress: contractAddress })

            await gigsApproveContract(gigsApproveContractCommand, customer, { contractAddress: contractAddress })
          })

          it('returns succeededContractsCount', async () => {
            const { exists, dto } = await gigsGetFreelancer(gigsGetFreelancerQuery, {
              freelancerAddress: freelancer.address,
            })
            expect(exists).to.eq(true)

            expect(dto.id).to.eq(freelancer.address)
            expect(dto.displayName).to.eq('')
            expect(dto.about).to.eq('')
            expect(dto.totalContractsCount).to.eq(1)
            expect(dto.failedContractsCount).to.eq(0)
            expect(dto.succeededContractsCount).to.eq(1)
            expect(dto.lastActivityAt).to.be.above(0)
          })
        })

        describe('when contract if failed', async () => {
          beforeEach(async () => {
            await deployFacet(diamondCutFacet, 'GigsAcceptContractCommand')
            const gigsAcceptContractCommand = await ethers.getContractAt('GigsAcceptContractCommand', diamondAddress)

            await deployFacet(diamondCutFacet, 'GigsFundContractCommand')
            const gigsFundContractCommand = await ethers.getContractAt('GigsFundContractCommand', diamondAddress)

            await deployFacet(diamondCutFacet, 'GigsStartContractCommand')
            const gigsStartContractCommand = await ethers.getContractAt('GigsStartContractCommand', diamondAddress)

            await deployFacet(diamondCutFacet, 'GigsDeliverContractCommand')
            const gigsDeliverContractCommand = await ethers.getContractAt('GigsDeliverContractCommand', diamondAddress)

            await deployFacet(diamondCutFacet, 'GigsDeclineContractCommand')
            const gigsDeclineContractCommand = await ethers.getContractAt('GigsDeclineContractCommand', diamondAddress)

            await deployFacet(diamondCutFacet, 'GigsRefundContractCommand')
            const gigsRefundContractCommand = await ethers.getContractAt('GigsRefundContractCommand', diamondAddress)

            await gigsAcceptContract(gigsAcceptContractCommand, freelancer, { contractAddress: contractAddress })

            await gigsFundContract(gigsFundContractCommand, customer, {
              contractAddress: contractAddress,
              value: '0.02',
            })

            await gigsStartContract(gigsStartContractCommand, freelancer, { contractAddress: contractAddress })

            await gigsDeliverContract(gigsDeliverContractCommand, freelancer, { contractAddress: contractAddress })

            await gigsDeclineContract(gigsDeclineContractCommand, customer, { contractAddress: contractAddress })

            await gigsRefundContract(gigsRefundContractCommand, customer, { contractAddress: contractAddress })
          })

          it('returns failedContractsCount', async () => {
            const { exists, dto } = await gigsGetFreelancer(gigsGetFreelancerQuery, {
              freelancerAddress: freelancer.address,
            })
            expect(exists).to.eq(true)

            expect(dto.id).to.eq(freelancer.address)
            expect(dto.displayName).to.eq('')
            expect(dto.about).to.eq('')
            expect(dto.totalContractsCount).to.eq(1)
            expect(dto.failedContractsCount).to.eq(1)
            expect(dto.succeededContractsCount).to.eq(0)
            expect(dto.lastActivityAt).to.be.above(0)
          })
        })
      })
    })
  })
})
