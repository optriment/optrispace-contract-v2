const { expect } = require('chai')
const { ethers } = require('hardhat')
const { deployFacet, getFrontendNodeAddressByTransaction, coreAddFrontendNodeTx } = require('../../../helpers')

const {
  getJobAddressByTransaction,
  getApplicationAddressByTransaction,
  gigsAddJobsCategory,
  gigsAddJobTx,
  gigsAddApplicationTx,
  gigsAddContract,
  gigsGetCustomer,
} = require('../helpers')

const { deployDiamond } = require('../../../../scripts/deploy.js')

describe('GigsGetCustomerQuery', async () => {
  let diamondAddress
  let diamondCutFacet

  let gigsPlugin
  let gigsGetCustomerQuery
  let gigsAddJobCommand

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
    await deployFacet(diamondCutFacet, 'GigsGetCustomerQuery')
    await deployFacet(diamondCutFacet, 'GigsAddJobCommand')

    gigsPlugin = await ethers.getContractAt('GigsPlugin', diamondAddress)
    gigsGetCustomerQuery = await ethers.getContractAt('GigsGetCustomerQuery', diamondAddress)
    gigsAddJobCommand = await ethers.getContractAt('GigsAddJobCommand', diamondAddress)
  })

  describe('gigsGetCustomer', async () => {
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

    describe('when customer does not exist', async () => {
      it('returns false and empty dto', async () => {
        const { exists, dto } = await gigsGetCustomer(gigsGetCustomerQuery, { customerAddress: other.address })
        expect(exists).to.eq(false)
        expect(dto.id).to.eq(ethers.constants.AddressZero)
      })
    })

    describe('when customer exists', async () => {
      let jobAddress

      beforeEach(async () => {
        await gigsAddJobsCategory(gigsPlugin, owner, { categoryCode: 'code', categoryLabel: 'Label' })

        const tx = await gigsAddJobTx(gigsAddJobCommand, customer, {
          frontendNodeAddress: frontendNodeAddress,
          budget: '0.01',
          title: 'title',
          description: 'description',
          categoryIndex: 0,
        })
        jobAddress = await getJobAddressByTransaction(tx)
      })

      describe('without contracts', async () => {
        it('returns customer', async () => {
          const { exists, dto } = await gigsGetCustomer(gigsGetCustomerQuery, {
            customerAddress: customer.address,
          })
          expect(exists).to.eq(true)

          expect(dto.id).to.eq(customer.address)
          expect(dto.displayName).to.eq('')
          expect(dto.totalContractsCount).to.eq(0)
          expect(dto.lastActivityAt).to.be.above(0)
        })
      })

      describe('with contracts', async () => {
        beforeEach(async () => {
          await deployFacet(diamondCutFacet, 'GigsAddApplicationCommand')
          const gigsAddApplicationCommand = await ethers.getContractAt('GigsAddApplicationCommand', diamondAddress)

          await deployFacet(diamondCutFacet, 'GigsAddContractCommand')
          const gigsAddContractCommand = await ethers.getContractAt('GigsAddContractCommand', diamondAddress)

          const tx = await gigsAddApplicationTx(gigsAddApplicationCommand, freelancer, {
            frontendNodeAddress: frontendNodeAddress,
            jobAddress: jobAddress,
            comment: 'comment1',
            serviceFee: '0.02',
          })
          const applicationAddress = await getApplicationAddressByTransaction(tx)

          await gigsAddContract(gigsAddContractCommand, customer, {
            frontendNodeAddress: frontendNodeAddress,
            jobAddress: jobAddress,
            applicationAddress: applicationAddress,
            title: 'title',
            description: 'description',
            value: '0.02',
            durationInDays: 2,
            daysToStartWork: 1,
          })
        })

        it('returns totalContractsCount', async () => {
          const { exists, dto } = await gigsGetCustomer(gigsGetCustomerQuery, {
            customerAddress: customer.address,
          })
          expect(exists).to.eq(true)

          expect(dto.id).to.eq(customer.address)
          expect(dto.displayName).to.eq('')
          expect(dto.totalContractsCount).to.eq(1)
          expect(dto.lastActivityAt).to.be.above(0)
        })
      })
    })
  })
})
