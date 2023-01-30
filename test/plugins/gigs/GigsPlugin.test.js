const { expect } = require('chai')
const { ethers } = require('hardhat')
const {
  deployFacet,
  expectRevert,
  getFrontendNodeAddressByTransaction,
  coreAddFrontendNodeTx,
} = require('../../helpers')

const {
  getJobAddressByTransaction,
  gigsAddJobsCategoryTx,
  gigsAddJobsCategory,
  gigsGetJobsCategories,
  gigsGetJob,
  gigsGetJobs,
  gigsAddJobTx,
  gigsAddApplication,
} = require('./helpers')

const { deployDiamond } = require('../../../scripts/deploy.js')

describe('GigsPlugin', async () => {
  let diamondAddress
  let diamondCutFacet

  let coreAddFrontendNodeCommand
  let gigsPlugin
  let gigsAddJobCommand
  let gigsAddApplicationCommand

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

    await deployFacet(diamondCutFacet, 'GigsPlugin')
    await deployFacet(diamondCutFacet, 'GigsAddJobCommand')
    await deployFacet(diamondCutFacet, 'GigsAddApplicationCommand')
    await deployFacet(diamondCutFacet, 'CoreAddFrontendNodeCommand')

    coreAddFrontendNodeCommand = await ethers.getContractAt('CoreAddFrontendNodeCommand', diamondAddress)
    gigsPlugin = await ethers.getContractAt('GigsPlugin', diamondAddress)
    gigsAddJobCommand = await ethers.getContractAt('GigsAddJobCommand', diamondAddress)
    gigsAddApplicationCommand = await ethers.getContractAt('GigsAddApplicationCommand', diamondAddress)
  })

  describe('gigsGetStats', async () => {
    it.skip('must be implemented')
  })

  describe('gigsAddJobsCategory', async () => {
    describe('when executes as not a contract owner', async () => {
      it('returns error', async () => {
        const error = gigsAddJobsCategoryTx(gigsPlugin, other, { categoryCode: '', categoryLabel: '' })
        await expectRevert(error, 'LibDiamond: Must be contract owner')
      })
    })

    describe('with invalid arguments', async () => {
      describe('when code is empty', async () => {
        it('returns error', async () => {
          const error = gigsAddJobsCategoryTx(gigsPlugin, owner, { categoryCode: '', categoryLabel: '' })
          await expectRevert(error, 'CodeRequired()')
        })
      })

      describe('when label is empty', async () => {
        it('returns error', async () => {
          const error = gigsAddJobsCategoryTx(gigsPlugin, owner, { categoryCode: 'first', categoryLabel: '' })
          await expectRevert(error, 'LabelRequired()')
        })
      })
    })

    describe('when jobs category code exists', async () => {
      it('returns error', async () => {
        await gigsAddJobsCategory(gigsPlugin, owner, { categoryCode: 'first', categoryLabel: 'First' })

        const error = gigsAddJobsCategoryTx(gigsPlugin, owner, { categoryCode: 'first', categoryLabel: 'First' })
        await expectRevert(error, 'JobsCategoryCodeExists()')
      })
    })

    it('adds a new record', async () => {
      await gigsAddJobsCategory(gigsPlugin, owner, { categoryCode: 'first', categoryLabel: 'First' })

      const stats = await gigsPlugin.gigsGetStats()
      expect(stats.jobsCategoriesCount).to.eq(1)
    })

    it('emits event JobsCategoryCreated', async () => {
      const result = await gigsAddJobsCategory(gigsPlugin, owner, { categoryCode: 'first', categoryLabel: 'First' })

      expect(result.events.length).to.eq(1)

      const { event, args } = result.events[0]

      expect(event).to.eq('JobsCategoryCreated')
      expect(args.code).to.eq('first')
      expect(args.newIndex).to.eq(0)
    })
  })

  describe('gigsGetJobsCategories', async () => {
    describe('without categories', async () => {
      it('returns empty array', async () => {
        const result = await gigsGetJobsCategories(gigsPlugin, owner)
        expect(result).to.eql([])
      })
    })

    describe('with categories', async () => {
      it('returns array of objects', async () => {
        await gigsAddJobsCategory(gigsPlugin, owner, { categoryCode: 'first', categoryLabel: 'First' })
        await gigsAddJobsCategory(gigsPlugin, owner, { categoryCode: 'second', categoryLabel: 'Second' })
        await gigsAddJobsCategory(gigsPlugin, owner, { categoryCode: 'third', categoryLabel: 'Third' })

        const result = await gigsGetJobsCategories(gigsPlugin, someone)

        const firstCategory = result.find((category) => category.code === 'first')
        expect(firstCategory.label).to.eq('First')

        const secondCategory = result.find((category) => category.code === 'second')
        expect(secondCategory.label).to.eq('Second')

        const thirdCategory = result.find((category) => category.code === 'third')
        expect(thirdCategory.label).to.eq('Third')
      })
    })
  })

  describe('gigsGetJob', async () => {
    describe('when job does not exist', async () => {
      it('returns false and empty object', async () => {
        const { exists, dto } = await gigsGetJob(gigsPlugin, owner, { jobAddress: someone.address })
        expect(exists).to.eq(false)
        expect(dto.id).to.eq(ethers.constants.AddressZero)
      })
    })

    describe('when job exists', async () => {
      let frontendNodeAddress

      beforeEach(async () => {
        const tx = await coreAddFrontendNodeTx(coreAddFrontendNodeCommand, owner, {
          frontendNodeOwnerAddress: frontendNodeOwner.address,
          frontendNodeName: 'domain.tld',
        })

        frontendNodeAddress = await getFrontendNodeAddressByTransaction(tx)
      })

      it('returns true and job DTO', async () => {
        await gigsAddJobsCategory(gigsPlugin, owner, { categoryCode: 'first', categoryLabel: 'First' })

        const tx1 = await gigsAddJobTx(gigsAddJobCommand, customer, {
          frontendNodeAddress: frontendNodeAddress,
          budget: '0.01',
          title: 'title',
          description: 'description',
          categoryIndex: 0,
        })
        const newJobAddress = await getJobAddressByTransaction(tx1)

        const { exists, dto } = await gigsGetJob(gigsPlugin, someone, { jobAddress: newJobAddress })
        expect(exists).to.eq(true)

        expect(dto.id).to.eq(newJobAddress)
        expect(dto.customerAddress).to.eq(customer.address)
        expect(dto.title).to.eq('title')
        expect(dto.description).to.eq('description')
        expect(dto.budget).to.eq(ethers.utils.parseEther('0.01'))
        expect(+dto.applicationsCount).to.eq(0)
        expect(dto.categoryIndex).to.eq(0)
        expect(dto.category.code).to.eq('first')
        expect(dto.category.label).to.eq('First')
      })
    })
  })

  describe('gigsGetJobs', async () => {
    describe('without jobs', async () => {
      it('returns empty array', async () => {
        const result = await gigsPlugin.gigsGetJobs()
        expect(result).to.eql([])
      })
    })

    describe('with jobs', async () => {
      let frontendNodeAddress

      beforeEach(async () => {
        const tx = await coreAddFrontendNodeTx(coreAddFrontendNodeCommand, owner, {
          frontendNodeOwnerAddress: frontendNodeOwner.address,
          frontendNodeName: 'domain.tld',
        })

        frontendNodeAddress = await getFrontendNodeAddressByTransaction(tx)
      })

      it('returns array of objects', async () => {
        await gigsAddJobsCategory(gigsPlugin, owner, { categoryCode: 'first', categoryLabel: 'First' })
        await gigsAddJobsCategory(gigsPlugin, owner, { categoryCode: 'second', categoryLabel: 'Second' })
        await gigsAddJobsCategory(gigsPlugin, owner, { categoryCode: 'third', categoryLabel: 'Third' })

        const tx1 = await gigsAddJobTx(gigsAddJobCommand, customer, {
          frontendNodeAddress: frontendNodeAddress,
          budget: '0.01',
          title: 'title1',
          description: 'description1',
          categoryIndex: 0,
        })
        const firstJobAddress = await getJobAddressByTransaction(tx1)

        const tx2 = await gigsAddJobTx(gigsAddJobCommand, other, {
          frontendNodeAddress: frontendNodeAddress,
          budget: 0,
          title: 'title2',
          description: 'description2',
          categoryIndex: 2,
        })
        const secondJobAddress = await getJobAddressByTransaction(tx2)

        await gigsAddApplication(gigsAddApplicationCommand, freelancer, {
          frontendNodeAddress: frontendNodeAddress,
          jobAddress: firstJobAddress,
          comment: 'comment',
          serviceFee: '0.03',
        })

        const jobs = await gigsGetJobs(gigsPlugin, other)
        expect(jobs.length).to.eq(2)

        const firstJob = jobs.find((job) => job.id === firstJobAddress)
        expect(firstJob.customerAddress).to.eq(customer.address)
        expect(firstJob.title).to.eq('title1')
        expect(firstJob.description).to.eq('description1')
        expect(firstJob.budget).to.eq(ethers.utils.parseEther('0.01'))
        expect(+firstJob.applicationsCount).to.eq(1)
        expect(firstJob.categoryIndex).to.eq(0)
        expect(firstJob.category.code).to.eq('first')
        expect(firstJob.category.label).to.eq('First')

        const secondJob = jobs.find((job) => job.id === secondJobAddress)
        expect(secondJob.customerAddress).to.eq(other.address)
        expect(secondJob.title).to.eq('title2')
        expect(secondJob.description).to.eq('description2')
        expect(secondJob.budget).to.eq(ethers.utils.parseEther('0'))
        expect(+secondJob.applicationsCount).to.eq(0)
        expect(secondJob.categoryIndex).to.eq(2)
        expect(secondJob.category.code).to.eq('third')
        expect(secondJob.category.label).to.eq('Third')
      })
    })
  })
})
