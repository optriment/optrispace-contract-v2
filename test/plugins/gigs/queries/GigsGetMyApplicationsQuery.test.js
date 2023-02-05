const { expect } = require('chai')
const { ethers } = require('hardhat')
const { deployFacet, getFrontendNodeAddressByTransaction, coreAddFrontendNodeTx } = require('../../../helpers')

const {
  getJobAddressByTransaction,
  getApplicationAddressByTransaction,
  gigsAddJobsCategory,
  gigsAddJobTx,
  gigsAddApplication,
  gigsAddApplicationTx,
  gigsGetMyApplications,
} = require('../helpers')

const { deployDiamond } = require('../../../../scripts/deploy.js')

describe('GigsGetMyApplicationsQuery', async () => {
  let diamondAddress
  let diamondCutFacet

  let coreAddFrontendNodeCommand
  let gigsPlugin
  let gigsGetMyApplicationsQuery
  let gigsAddJobCommand
  let gigsAddApplicationCommand

  // Signers
  let owner
  let customer
  let freelancer
  let other
  let someone
  let frontendNodeOwner

  beforeEach(async () => {
    ;[owner, customer, freelancer, other, someone, frontendNodeOwner] = await ethers.getSigners()

    diamondAddress = await deployDiamond('Test')
    diamondCutFacet = await ethers.getContractAt('DiamondCutFacet', diamondAddress)

    await deployFacet(diamondCutFacet, 'CoreAddFrontendNodeCommand')
    await deployFacet(diamondCutFacet, 'GigsPlugin')
    await deployFacet(diamondCutFacet, 'GigsGetMyApplicationsQuery')
    await deployFacet(diamondCutFacet, 'GigsAddJobCommand')
    await deployFacet(diamondCutFacet, 'GigsAddApplicationCommand')

    coreAddFrontendNodeCommand = await ethers.getContractAt('CoreAddFrontendNodeCommand', diamondAddress)
    gigsPlugin = await ethers.getContractAt('GigsPlugin', diamondAddress)
    gigsGetMyApplicationsQuery = await ethers.getContractAt('GigsGetMyApplicationsQuery', diamondAddress)
    gigsAddJobCommand = await ethers.getContractAt('GigsAddJobCommand', diamondAddress)
    gigsAddApplicationCommand = await ethers.getContractAt('GigsAddApplicationCommand', diamondAddress)
  })

  describe('gigsGetMyApplications', async () => {
    let frontendNodeAddress

    beforeEach(async () => {
      const tx = await coreAddFrontendNodeTx(coreAddFrontendNodeCommand, owner, {
        frontendNodeOwnerAddress: frontendNodeOwner.address,
        frontendNodeName: 'domain.tld',
      })
      frontendNodeAddress = await getFrontendNodeAddressByTransaction(tx)
    })

    describe('when there are no applications', async () => {
      it('returns an empty array', async () => {
        const contracts = await gigsGetMyApplications(gigsGetMyApplicationsQuery, other)
        expect(contracts).to.eql([])
      })
    })

    describe('when applied for one job', async () => {
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

        await gigsAddApplication(gigsAddApplicationCommand, someone, {
          frontendNodeAddress: frontendNodeAddress,
          jobAddress: jobAddress,
          comment: 'comment2',
          serviceFee: '0.03',
        })
      })

      it('returns only my application', async () => {
        const applications = await gigsGetMyApplications(gigsGetMyApplicationsQuery, freelancer)
        expect(applications.length).to.eq(1)

        const application = applications[0]
        expect(application.applicationAddress).to.eq(applicationAddress)
        expect(application.jobAddress).to.eq(jobAddress)
        expect(application.contractAddress).to.eq(ethers.constants.AddressZero)
        expect(application.applicantAddress).to.eq(freelancer.address)
        expect(application.hasContract).to.eq(false)
        expect(application.jobTitle).to.eq('title')
        expect(application.jobDescription).to.eq('description')
        expect(application.applicationComment).to.eq('comment1')
        expect(application.jobCategoryCode).to.eq('code')
        expect(application.jobCategoryLabel).to.eq('Label')
        expect(application.jobBudget).to.eq(ethers.utils.parseEther('0.01'))
        expect(application.applicationServiceFee).to.eq(ethers.utils.parseEther('0.02'))
        expect(application.applicationCreatedAt).to.be.above(0)
      })
    })

    describe('when applied for multiple jobs', async () => {
      let job1Address, job2Address, application1Address, application2Address

      beforeEach(async () => {
        await gigsAddJobsCategory(gigsPlugin, owner, { categoryCode: 'code1', categoryLabel: 'Label1' })
        await gigsAddJobsCategory(gigsPlugin, owner, { categoryCode: 'code2', categoryLabel: 'Label2' })

        const tx1 = await gigsAddJobTx(gigsAddJobCommand, customer, {
          frontendNodeAddress: frontendNodeAddress,
          budget: '0.01',
          title: 'title1',
          description: 'description1',
          categoryIndex: 0,
        })
        job1Address = await getJobAddressByTransaction(tx1)

        const tx2 = await gigsAddJobTx(gigsAddJobCommand, someone, {
          frontendNodeAddress: frontendNodeAddress,
          budget: '0.02',
          title: 'title2',
          description: 'description2',
          categoryIndex: 1,
        })
        job2Address = await getJobAddressByTransaction(tx2)

        const tx3 = await gigsAddApplicationTx(gigsAddApplicationCommand, freelancer, {
          frontendNodeAddress: frontendNodeAddress,
          jobAddress: job1Address,
          comment: 'comment1',
          serviceFee: '0.03',
        })
        application1Address = await getApplicationAddressByTransaction(tx3)

        const tx4 = await gigsAddApplicationTx(gigsAddApplicationCommand, freelancer, {
          frontendNodeAddress: frontendNodeAddress,
          jobAddress: job2Address,
          comment: 'comment2',
          serviceFee: '0.04',
        })
        application2Address = await getApplicationAddressByTransaction(tx4)

        await gigsAddApplication(gigsAddApplicationCommand, other, {
          frontendNodeAddress: frontendNodeAddress,
          jobAddress: job1Address,
          comment: 'comment3',
          serviceFee: '0.05',
        })

        await gigsAddApplication(gigsAddApplicationCommand, other, {
          frontendNodeAddress: frontendNodeAddress,
          jobAddress: job2Address,
          comment: 'comment4',
          serviceFee: '0.06',
        })
      })

      it('returns only my applications', async () => {
        const applications = await gigsGetMyApplications(gigsGetMyApplicationsQuery, freelancer)
        expect(applications.length).to.eq(2)

        const firstApplication = applications.find((a) => a.applicationAddress === application1Address)
        expect(firstApplication.jobAddress).to.eq(job1Address)
        expect(firstApplication.contractAddress).to.eq(ethers.constants.AddressZero)
        expect(firstApplication.applicantAddress).to.eq(freelancer.address)
        expect(firstApplication.hasContract).to.eq(false)
        expect(firstApplication.jobTitle).to.eq('title1')
        expect(firstApplication.jobDescription).to.eq('description1')
        expect(firstApplication.applicationComment).to.eq('comment1')
        expect(firstApplication.jobCategoryCode).to.eq('code1')
        expect(firstApplication.jobCategoryLabel).to.eq('Label1')
        expect(firstApplication.jobBudget).to.eq(ethers.utils.parseEther('0.01'))
        expect(firstApplication.applicationServiceFee).to.eq(ethers.utils.parseEther('0.03'))
        expect(firstApplication.applicationCreatedAt).to.be.above(0)

        const secondApplication = applications.find((a) => a.applicationAddress === application2Address)
        expect(secondApplication.jobAddress).to.eq(job2Address)
        expect(secondApplication.contractAddress).to.eq(ethers.constants.AddressZero)
        expect(secondApplication.applicantAddress).to.eq(freelancer.address)
        expect(secondApplication.hasContract).to.eq(false)
        expect(secondApplication.jobTitle).to.eq('title2')
        expect(secondApplication.jobDescription).to.eq('description2')
        expect(secondApplication.applicationComment).to.eq('comment2')
        expect(secondApplication.jobCategoryCode).to.eq('code2')
        expect(secondApplication.jobCategoryLabel).to.eq('Label2')
        expect(secondApplication.jobBudget).to.eq(ethers.utils.parseEther('0.02'))
        expect(secondApplication.applicationServiceFee).to.eq(ethers.utils.parseEther('0.04'))
        expect(secondApplication.applicationCreatedAt).to.be.above(0)
      })
    })
  })
})
