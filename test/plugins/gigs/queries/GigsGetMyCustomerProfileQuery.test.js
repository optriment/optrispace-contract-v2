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
  gigsGetMyCustomerProfile,
} = require('../helpers')

const { deployDiamond } = require('../../../../scripts/deploy.js')

describe('GigsGetMyCustomerProfileQuery', async () => {
  let diamondAddress
  let diamondCutFacet

  let gigsGetMyCustomerProfileQuery

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

    await deployFacet(diamondCutFacet, 'GigsGetMyCustomerProfileQuery')
    gigsGetMyCustomerProfileQuery = await ethers.getContractAt('GigsGetMyCustomerProfileQuery', diamondAddress)
  })

  describe('gigsGetMyCustomerProfile', async () => {
    describe('when customer does not exist', async () => {
      it('returns false and empty dto', async () => {
        const { exists, profile } = await gigsGetMyCustomerProfile(gigsGetMyCustomerProfileQuery, other)
        expect(exists).to.eq(false)

        expect(profile.owner).to.eq(ethers.constants.AddressZero)
      })
    })

    describe('when customer exists', async () => {
      let frontendNodeAddress, gigsAddJobCommand, jobAddress, anotherJobAddress

      beforeEach(async () => {
        await deployFacet(diamondCutFacet, 'CoreAddFrontendNodeCommand')
        const coreAddFrontendNodeCommand = await ethers.getContractAt('CoreAddFrontendNodeCommand', diamondAddress)

        await deployFacet(diamondCutFacet, 'GigsPlugin')
        const gigsPlugin = await ethers.getContractAt('GigsPlugin', diamondAddress)

        await deployFacet(diamondCutFacet, 'GigsAddJobCommand')
        gigsAddJobCommand = await ethers.getContractAt('GigsAddJobCommand', diamondAddress)

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

        const tx3 = await gigsAddJobTx(gigsAddJobCommand, other, {
          frontendNodeAddress: frontendNodeAddress,
          budget: '0.02',
          title: 'title2',
          description: 'description2',
          categoryIndex: 0,
        })
        anotherJobAddress = await getJobAddressByTransaction(tx3)
      })

      describe('without contracts', async () => {
        it('returns customer', async () => {
          const { exists, profile } = await gigsGetMyCustomerProfile(gigsGetMyCustomerProfileQuery, customer)
          expect(exists).to.eq(true)

          expect(profile.owner).to.eq(customer.address)
          expect(profile.myJobs).to.eql([jobAddress])
          expect(profile.myContracts).to.eql([])
          expect(profile.createdAt).to.be.above(0)
        })
      })

      describe('with contracts', async () => {
        let contractAddress

        beforeEach(async () => {
          await deployFacet(diamondCutFacet, 'GigsAddApplicationCommand')
          const gigsAddApplicationCommand = await ethers.getContractAt('GigsAddApplicationCommand', diamondAddress)

          await deployFacet(diamondCutFacet, 'GigsAddContractCommand')
          const gigsAddContractCommand = await ethers.getContractAt('GigsAddContractCommand', diamondAddress)

          const tx1 = await gigsAddApplicationTx(gigsAddApplicationCommand, freelancer, {
            frontendNodeAddress: frontendNodeAddress,
            jobAddress: jobAddress,
            comment: 'comment1',
            serviceFee: '0.02',
          })
          const applicationAddress = await getApplicationAddressByTransaction(tx1)

          const tx2 = await gigsAddApplicationTx(gigsAddApplicationCommand, freelancer, {
            frontendNodeAddress: frontendNodeAddress,
            jobAddress: anotherJobAddress,
            comment: 'comment2',
            serviceFee: '0.03',
          })
          const anotherApplicationAddress = await getApplicationAddressByTransaction(tx2)

          const tx3 = await gigsAddContractTx(gigsAddContractCommand, customer, {
            frontendNodeAddress: frontendNodeAddress,
            jobAddress: jobAddress,
            applicationAddress: applicationAddress,
            title: 'title',
            description: 'description',
            value: '0.02',
            durationInDays: 2,
            daysToStartWork: 1,
          })
          contractAddress = await getContractAddressByTransaction(tx3)

          await gigsAddContract(gigsAddContractCommand, other, {
            frontendNodeAddress: frontendNodeAddress,
            jobAddress: anotherJobAddress,
            applicationAddress: anotherApplicationAddress,
            title: 'title2',
            description: 'description2',
            value: '0.03',
            durationInDays: 2,
            daysToStartWork: 1,
          })
        })

        it('returns totalContractsCount', async () => {
          const { exists, profile } = await gigsGetMyCustomerProfile(gigsGetMyCustomerProfileQuery, customer)
          expect(exists).to.eq(true)

          expect(profile.owner).to.eq(customer.address)
          expect(profile.myJobs).to.eql([jobAddress])
          expect(profile.myContracts).to.eql([contractAddress])
          expect(profile.createdAt).to.be.above(0)
        })
      })
    })
  })
})
