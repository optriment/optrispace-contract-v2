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
  gigsAddContract,
  gigsGetMyApplication,
  gigsGetContractsAsContractor,
} = require('../helpers')

const { deployDiamond } = require('../../../../scripts/deploy.js')

describe('GigsFreelancerService', async () => {
  let diamondAddress
  let diamondCutFacet

  let coreAddFrontendNodeCommand
  let gigsPlugin
  let gigsFreelancerService
  let gigsAddJobCommand
  let gigsAddApplicationCommand
  let gigsAddContractCommand

  // Signers
  let owner
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
    await deployFacet(diamondCutFacet, 'GigsPlugin')
    await deployFacet(diamondCutFacet, 'GigsFreelancerService')
    await deployFacet(diamondCutFacet, 'GigsContractsService')
    await deployFacet(diamondCutFacet, 'GigsAddJobCommand')
    await deployFacet(diamondCutFacet, 'GigsAddApplicationCommand')
    await deployFacet(diamondCutFacet, 'GigsAddContractCommand')

    coreAddFrontendNodeCommand = await ethers.getContractAt('CoreAddFrontendNodeCommand', diamondAddress)
    gigsPlugin = await ethers.getContractAt('GigsPlugin', diamondAddress)
    gigsFreelancerService = await ethers.getContractAt('GigsFreelancerService', diamondAddress)
    gigsAddJobCommand = await ethers.getContractAt('GigsAddJobCommand', diamondAddress)
    gigsAddApplicationCommand = await ethers.getContractAt('GigsAddApplicationCommand', diamondAddress)
    gigsAddContractCommand = await ethers.getContractAt('GigsAddContractCommand', diamondAddress)
  })

  describe('gigsGetMyApplication', async () => {
    describe('when job does not exist', async () => {
      it('returns error', async () => {
        const tx = gigsGetMyApplication(gigsFreelancerService, other, { jobAddress: someone.address })
        await expectRevert(tx, 'JobDoesNotExist()')
      })
    })

    describe('when job exists', async () => {
      let jobAddress, frontendNodeAddress

      beforeEach(async () => {
        const tx1 = await coreAddFrontendNodeTx(coreAddFrontendNodeCommand, owner, {
          frontendNodeOwnerAddress: frontendNodeOwner.address,
          frontendNodeName: 'domain.tld',
        })
        frontendNodeAddress = await getFrontendNodeAddressByTransaction(tx1)

        await gigsAddJobsCategory(gigsPlugin, owner, { categoryCode: 'code', categoryLabel: 'Label' })

        const tx2 = await gigsAddJobTx(gigsAddJobCommand, customer, {
          frontendNodeAddress: frontendNodeAddress,
          budget: '0.01',
          title: 'title1',
          description: 'description1',
          categoryIndex: 0,
        })
        jobAddress = await getJobAddressByTransaction(tx2)
      })

      describe('when customer requests application for his own job', async () => {
        it('returns error', async () => {
          const tx = gigsGetMyApplication(gigsFreelancerService, customer, { jobAddress: jobAddress })
          await expectRevert(tx, 'ApplicantsOnly()')
        })
      })

      describe('when applicant has not applied for this job', async () => {
        it('returns false and an empty DTO', async () => {
          const { exists, dto } = await gigsGetMyApplication(gigsFreelancerService, freelancer, {
            jobAddress: jobAddress,
          })
          expect(exists).to.eq(false)
          expect(dto.id).to.eq(ethers.constants.AddressZero)
        })
      })

      describe('when applicant has applied for this job', async () => {
        let applicationAddress

        beforeEach(async () => {
          const tx = await gigsAddApplicationTx(gigsAddApplicationCommand, freelancer, {
            frontendNodeAddress: frontendNodeAddress,
            jobAddress: jobAddress,
            comment: 'comment',
            serviceFee: '0.01',
          })
          applicationAddress = await getApplicationAddressByTransaction(tx)
        })

        describe('without contract', async () => {
          it('returns true and application DTO', async () => {
            const { exists, dto } = await gigsGetMyApplication(gigsFreelancerService, freelancer, {
              jobAddress: jobAddress,
            })
            expect(exists).to.eq(true)

            expect(dto.id).to.eq(applicationAddress)
            expect(dto.jobAddress).to.eq(jobAddress)
            expect(dto.applicantAddress).to.eq(freelancer.address)
            expect(dto.contractAddress).to.eq(ethers.constants.AddressZero)
            expect(dto.hasContract).to.eq(false)
            expect(dto.comment).to.eq('comment')
            expect(dto.serviceFee).to.eq(ethers.utils.parseEther('0.01'))
            expect(+dto.createdAt).to.be.above(0)
          })
        })

        describe('with contract', async () => {
          it('returns true and information about contract', async () => {
            const tx = await gigsAddContractTx(gigsAddContractCommand, customer, {
              frontendNodeAddress: frontendNodeAddress,
              jobAddress: jobAddress,
              applicationAddress: applicationAddress,
              title: 'title',
              description: 'description',
              value: '0.01',
              durationInDays: 2,
              daysToStartWork: 1,
            })
            const newContractAddress = await getContractAddressByTransaction(tx)

            const { exists, dto } = await gigsGetMyApplication(gigsFreelancerService, freelancer, {
              jobAddress: jobAddress,
            })
            expect(exists).to.eq(true)

            expect(dto.id).to.eq(applicationAddress)
            expect(dto.jobAddress).to.eq(jobAddress)
            expect(dto.applicantAddress).to.eq(freelancer.address)
            expect(dto.contractAddress).to.eq(newContractAddress)
            expect(dto.hasContract).to.eq(true)
            expect(dto.comment).to.eq('comment')
            expect(dto.serviceFee).to.eq(ethers.utils.parseEther('0.01'))
            expect(+dto.createdAt).to.be.above(0)
          })
        })
      })
    })
  })

  describe('gigsGetContractsAsContractor', async () => {
    let frontendNodeAddress

    beforeEach(async () => {
      const tx = await coreAddFrontendNodeTx(coreAddFrontendNodeCommand, owner, {
        frontendNodeOwnerAddress: frontendNodeOwner.address,
        frontendNodeName: 'domain.tld',
      })
      frontendNodeAddress = await getFrontendNodeAddressByTransaction(tx)
    })

    describe('when there are no contracts', async () => {
      it('returns an empty array', async () => {
        const contracts = await gigsGetContractsAsContractor(gigsFreelancerService, other)
        expect(contracts).to.eql([])
      })
    })

    describe('when requested as a customer', async () => {
      beforeEach(async () => {
        await gigsAddJobsCategory(gigsPlugin, owner, { categoryCode: 'code', categoryLabel: 'label' })

        const tx1 = await gigsAddJobTx(gigsAddJobCommand, customer, {
          frontendNodeAddress: frontendNodeAddress,
          budget: '0.01',
          title: 'job1',
          description: 'description1',
          categoryIndex: 0,
        })
        const jobAddress = await getJobAddressByTransaction(tx1)

        const tx2 = await gigsAddApplicationTx(gigsAddApplicationCommand, freelancer, {
          frontendNodeAddress: frontendNodeAddress,
          jobAddress: jobAddress,
          comment: 'comment1',
          serviceFee: '0.02',
        })
        const applicationAddress = await getApplicationAddressByTransaction(tx2)

        await gigsAddContract(gigsAddContractCommand, customer, {
          frontendNodeAddress: frontendNodeAddress,
          jobAddress: jobAddress,
          applicationAddress: applicationAddress,
          title: 'title1',
          description: 'description1',
          value: '0.03',
          durationInDays: 2,
          daysToStartWork: 1,
        })
      })

      it('returns an empty array', async () => {
        const contracts = await gigsGetContractsAsContractor(gigsFreelancerService, customer)
        expect(contracts).to.eql([])
      })
    })

    describe('when there are contracts and one of them belongs to a freelancer', async () => {
      let jobAddress, applicationAddress

      beforeEach(async () => {
        await gigsAddJobsCategory(gigsPlugin, owner, { categoryCode: 'code', categoryLabel: 'Label' })

        const tx1 = await gigsAddJobTx(gigsAddJobCommand, customer, {
          frontendNodeAddress: frontendNodeAddress,
          budget: '0.01',
          title: 'job1',
          description: 'job1description',
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

        const tx3 = await gigsAddApplicationTx(gigsAddApplicationCommand, other, {
          frontendNodeAddress: frontendNodeAddress,
          jobAddress: jobAddress,
          comment: 'comment2',
          serviceFee: '0.03',
        })
        const anotherApplication = await getApplicationAddressByTransaction(tx3)

        await gigsAddContract(gigsAddContractCommand, customer, {
          frontendNodeAddress: frontendNodeAddress,
          jobAddress: jobAddress,
          applicationAddress: anotherApplication,
          title: 'title2',
          description: 'description2',
          value: '0.04',
          durationInDays: 6,
          daysToStartWork: 5,
        })
      })

      it('returns only owned contract', async () => {
        const tx = await gigsAddContractTx(gigsAddContractCommand, customer, {
          frontendNodeAddress: frontendNodeAddress,
          jobAddress: jobAddress,
          applicationAddress: applicationAddress,
          title: 'title1',
          description: 'description1',
          value: '0.03',
          durationInDays: 2,
          daysToStartWork: 1,
        })
        const contractAddress = await getContractAddressByTransaction(tx)

        const contracts = await gigsGetContractsAsContractor(gigsFreelancerService, freelancer)
        expect(contracts.length).to.eq(1)

        const myContract = contracts[0]
        expect(myContract.id).to.eq(contractAddress)
        expect(myContract.jobAddress).to.eq(jobAddress)
        expect(myContract.applicationAddress).to.eq(applicationAddress)
        expect(myContract.customerAddress).to.eq(customer.address)
        expect(myContract.contractorAddress).to.eq(freelancer.address)
        expect(myContract.title).to.eq('title1')
        expect(myContract.description).to.eq('description1')
        expect(myContract.value).to.eq(ethers.utils.parseEther('0.03'))
        expect(myContract.serviceFee).to.eq(ethers.utils.parseEther('0.02'))
        expect(+myContract.durationInDays).to.eq(2)
        expect(+myContract.daysToStartWork).to.eq(1)
        expect(+myContract.createdAt).to.be.above(0)
        expect(myContract.status).to.eq('created')
      })
    })
  })
})
