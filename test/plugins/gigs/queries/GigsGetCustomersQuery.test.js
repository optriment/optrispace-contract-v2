const { expect } = require('chai')
const { ethers } = require('hardhat')
const { deployFacet, getFrontendNodeAddressByTransaction, coreAddFrontendNodeTx } = require('../../../helpers')

const {
  getJobAddressByTransaction,
  getApplicationAddressByTransaction,
  gigsAddJobsCategory,
  gigsAddJob,
  gigsAddJobTx,
  gigsAddApplicationTx,
  gigsAddContract,
  gigsGetCustomers,
} = require('../helpers')

const { deployDiamond } = require('../../../../scripts/deploy.js')

describe('GigsGetCustomersQuery', async () => {
  let diamondAddress
  let diamondCutFacet

  let gigsPlugin
  let gigsGetCustomersQuery
  let gigsAddJobCommand

  // Signers
  let owner
  let customer
  let freelancer
  let someone
  let frontendNodeOwner

  beforeEach(async () => {
    ;[owner, customer, freelancer, someone, frontendNodeOwner] = await ethers.getSigners()

    diamondAddress = await deployDiamond()
    diamondCutFacet = await ethers.getContractAt('DiamondCutFacet', diamondAddress)

    await deployFacet(diamondCutFacet, 'GigsPlugin')
    await deployFacet(diamondCutFacet, 'GigsGetCustomersQuery')
    await deployFacet(diamondCutFacet, 'GigsAddJobCommand')

    gigsPlugin = await ethers.getContractAt('GigsPlugin', diamondAddress)
    gigsGetCustomersQuery = await ethers.getContractAt('GigsGetCustomersQuery', diamondAddress)
    gigsAddJobCommand = await ethers.getContractAt('GigsAddJobCommand', diamondAddress)
  })

  describe('gigsGetCustomers', async () => {
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

    describe('when there are no customers', async () => {
      it('returns an empty array', async () => {
        const customers = await gigsGetCustomers(gigsGetCustomersQuery, freelancer)
        expect(customers).to.eql([])
      })
    })

    describe('with one customer', async () => {
      let jobAddress

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
      })

      describe('without contracts', async () => {
        it('returns only one customer', async () => {
          const customers = await gigsGetCustomers(gigsGetCustomersQuery, freelancer)
          expect(customers.length).to.eq(1)

          const fistCustomer = customers[0]
          expect(fistCustomer.id).to.eq(customer.address)
          expect(fistCustomer.displayName).to.eq('')
          expect(fistCustomer.totalContractsCount).to.eq(0)
          expect(fistCustomer.lastActivityAt).to.be.above(0)
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
          const customers = await gigsGetCustomers(gigsGetCustomersQuery, freelancer)
          expect(customers.length).to.eq(1)

          const firstCustomer = customers[0]
          expect(firstCustomer.id).to.eq(customer.address)
          expect(firstCustomer.displayName).to.eq('')
          expect(firstCustomer.totalContractsCount).to.eq(1)
          expect(firstCustomer.lastActivityAt).to.be.above(0)
        })
      })
    })

    describe('with many customers', async () => {
      beforeEach(async () => {
        await gigsAddJobsCategory(gigsPlugin, owner, { categoryCode: 'code', categoryLabel: 'Label' })

        await gigsAddJob(gigsAddJobCommand, customer, {
          frontendNodeAddress: frontendNodeAddress,
          budget: '0.01',
          title: 'title1',
          description: 'description1',
          categoryIndex: 0,
        })

        await gigsAddJob(gigsAddJobCommand, someone, {
          frontendNodeAddress: frontendNodeAddress,
          budget: '0.02',
          title: 'title2',
          description: 'description2',
          categoryIndex: 0,
        })
      })

      it('returns two customers', async () => {
        const customers = await gigsGetCustomers(gigsGetCustomersQuery, freelancer)
        expect(customers.length).to.eq(2)

        const firstCustomer = customers[0]
        expect(firstCustomer.id).to.eq(customer.address)
        expect(firstCustomer.displayName).to.eq('')
        expect(firstCustomer.totalContractsCount).to.eq(0)
        expect(firstCustomer.lastActivityAt).to.be.above(0)

        const secondCustomer = customers[1]
        expect(secondCustomer.id).to.eq(someone.address)
        expect(secondCustomer.displayName).to.eq('')
        expect(secondCustomer.totalContractsCount).to.eq(0)
        expect(secondCustomer.lastActivityAt).to.be.above(0)
      })
    })
  })
})
