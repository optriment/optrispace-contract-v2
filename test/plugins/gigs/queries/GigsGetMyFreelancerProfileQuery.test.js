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
  gigsAddContract,
  gigsAddContractTx,
  gigsAcceptContract,
  gigsFundContract,
  gigsStartContract,
  gigsDeliverContract,
  gigsApproveContract,
  gigsDeclineContract,
  gigsRefundContract,
  gigsGetMyFreelancerProfile,
} = require('../helpers')

const { deployDiamond } = require('../../../../scripts/deploy.js')

describe('GigsGetMyFreelancerProfileQuery', async () => {
  let diamondAddress
  let diamondCutFacet

  let gigsGetMyFreelancerProfileQuery

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

    await deployFacet(diamondCutFacet, 'GigsGetMyFreelancerProfileQuery')
    gigsGetMyFreelancerProfileQuery = await ethers.getContractAt('GigsGetMyFreelancerProfileQuery', diamondAddress)
  })

  describe('gigsGetMyFreelancerProfile', async () => {
    describe('when freelancer does not exist', async () => {
      it('returns false and empty dto', async () => {
        const { exists, profile } = await gigsGetMyFreelancerProfile(gigsGetMyFreelancerProfileQuery, other)
        expect(exists).to.eq(false)

        expect(profile.owner).to.eq(ethers.constants.AddressZero)
      })
    })

    describe('when freelancer exists', async () => {
      let frontendNodeAddress, jobAddress, applicationAddress, otherApplicationAddress

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

        await gigsAddJobsCategory(gigsPlugin, owner, { categoryCode: 'code', categoryLabel: 'Label' })

        const tx2 = await gigsAddJobTx(gigsAddJobCommand, customer, {
          frontendNodeAddress: frontendNodeAddress,
          budget: '0.01',
          title: 'title',
          description: 'description',
          categoryIndex: 0,
        })
        jobAddress = await getJobAddressByTransaction(tx2)

        const tx3 = await gigsAddApplicationTx(gigsAddApplicationCommand, freelancer, {
          frontendNodeAddress: frontendNodeAddress,
          jobAddress: jobAddress,
          comment: 'comment1',
          serviceFee: '0.02',
        })

        applicationAddress = await getApplicationAddressByTransaction(tx3)

        const tx4 = await gigsAddApplicationTx(gigsAddApplicationCommand, other, {
          frontendNodeAddress: frontendNodeAddress,
          jobAddress: jobAddress,
          comment: 'comment2',
          serviceFee: '0.03',
        })

        otherApplicationAddress = await getApplicationAddressByTransaction(tx4)
      })

      describe('without contracts', async () => {
        it('returns freelancer', async () => {
          const { exists, profile } = await gigsGetMyFreelancerProfile(gigsGetMyFreelancerProfileQuery, freelancer)
          expect(exists).to.eq(true)

          expect(profile.owner).to.eq(freelancer.address)
          expect(profile.about).to.eq('')
          expect(profile.myApplications).to.eql([applicationAddress])
          expect(profile.myContracts).to.eql([])
          expect(profile.failedContractsCount).to.eq(0)
          expect(profile.succeededContractsCount).to.eq(0)
          expect(profile.createdAt).to.be.above(0)
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

          await gigsAddContract(gigsAddContractCommand, customer, {
            frontendNodeAddress: frontendNodeAddress,
            jobAddress: jobAddress,
            applicationAddress: otherApplicationAddress,
            title: 'title2',
            description: 'description2',
            value: '0.03',
            durationInDays: 2,
            daysToStartWork: 1,
          })
        })

        it('returns totalContractsCount', async () => {
          const { exists, profile } = await gigsGetMyFreelancerProfile(gigsGetMyFreelancerProfileQuery, freelancer)
          expect(exists).to.eq(true)

          expect(profile.owner).to.eq(freelancer.address)
          expect(profile.about).to.eq('')
          expect(profile.myApplications).to.eql([applicationAddress])
          expect(profile.myContracts).to.eql([contractAddress])
          expect(profile.failedContractsCount).to.eq(0)
          expect(profile.succeededContractsCount).to.eq(0)
          expect(profile.createdAt).to.be.above(0)
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
            const { exists, profile } = await gigsGetMyFreelancerProfile(gigsGetMyFreelancerProfileQuery, freelancer)
            expect(exists).to.eq(true)

            expect(profile.owner).to.eq(freelancer.address)
            expect(profile.about).to.eq('')
            expect(profile.myApplications).to.eql([applicationAddress])
            expect(profile.myContracts).to.eql([contractAddress])
            expect(profile.failedContractsCount).to.eq(0)
            expect(profile.succeededContractsCount).to.eq(1)
            expect(profile.createdAt).to.be.above(0)
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
            const { exists, profile } = await gigsGetMyFreelancerProfile(gigsGetMyFreelancerProfileQuery, freelancer)
            expect(exists).to.eq(true)

            expect(profile.owner).to.eq(freelancer.address)
            expect(profile.about).to.eq('')
            expect(profile.myApplications).to.eql([applicationAddress])
            expect(profile.myContracts).to.eql([contractAddress])
            expect(profile.failedContractsCount).to.eq(1)
            expect(profile.succeededContractsCount).to.eq(0)
            expect(profile.createdAt).to.be.above(0)
          })
        })
      })
    })
  })
})
