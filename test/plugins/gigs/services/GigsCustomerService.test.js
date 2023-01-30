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
  gigsAddJob,
  gigsAddJobTx,
  gigsAddContract,
  gigsAddContractTx,
  gigsAddApplication,
  gigsAddApplicationTx,
  gigsGetMyJobs,
  gigsGetApplications,
  gigsGetJobAndApplicationForContract,
  gigsGetContractsAsCustomer,
} = require('../helpers')

const { deployDiamond } = require('../../../../scripts/deploy.js')

describe('GigsCustomerService', async () => {
  let diamondAddress
  let diamondCutFacet

  let coreAddFrontendNodeCommand
  let gigsPlugin
  let gigsCustomerService
  let gigsAddJobCommand
  let gigsAddApplicationCommand
  let gigsAddContractCommand

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
    await deployFacet(diamondCutFacet, 'GigsPlugin')
    await deployFacet(diamondCutFacet, 'GigsCustomerService')
    await deployFacet(diamondCutFacet, 'GigsAddJobCommand')
    await deployFacet(diamondCutFacet, 'GigsAddApplicationCommand')
    await deployFacet(diamondCutFacet, 'GigsAddContractCommand')

    coreAddFrontendNodeCommand = await ethers.getContractAt('CoreAddFrontendNodeCommand', diamondAddress)
    gigsPlugin = await ethers.getContractAt('GigsPlugin', diamondAddress)
    gigsCustomerService = await ethers.getContractAt('GigsCustomerService', diamondAddress)
    gigsAddJobCommand = await ethers.getContractAt('GigsAddJobCommand', diamondAddress)
    gigsAddApplicationCommand = await ethers.getContractAt('GigsAddApplicationCommand', diamondAddress)
    gigsAddContractCommand = await ethers.getContractAt('GigsAddContractCommand', diamondAddress)
  })

  describe('gigsGetMyJobs', async () => {
    describe('without jobs', async () => {
      it('returns empty array', async () => {
        const result = await gigsGetMyJobs(gigsCustomerService, customer)
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

      it('returns only my own jobs', async () => {
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

        const tx2 = await gigsAddJobTx(gigsAddJobCommand, customer, {
          frontendNodeAddress: frontendNodeAddress,
          budget: 0,
          title: 'title2',
          description: 'description2',
          categoryIndex: 2,
        })
        const secondJobAddress = await getJobAddressByTransaction(tx2)

        await gigsAddJob(gigsAddJobCommand, other, {
          frontendNodeAddress: frontendNodeAddress,
          budget: 0,
          title: 'title3',
          description: 'description3',
          categoryIndex: 1,
        })

        await gigsAddApplication(gigsAddApplicationCommand, other, {
          frontendNodeAddress: frontendNodeAddress,
          jobAddress: firstJobAddress,
          comment: 'comment',
          serviceFee: '0.03',
        })

        const jobs = await gigsGetMyJobs(gigsCustomerService, customer)
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
        expect(secondJob.customerAddress).to.eq(customer.address)
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

  describe('gigsGetApplications', async () => {
    describe('when job does not exist', async () => {
      it('returns error', async () => {
        const tx = gigsCustomerService.gigsGetApplications(someone.address)

        await expectRevert(tx, 'JobDoesNotExist()')
      })
    })

    describe('when job exists', async () => {
      let jobAddress, frontendNodeAddress

      beforeEach(async () => {
        await gigsAddJobsCategory(gigsPlugin, owner, { categoryCode: 'code', categoryLabel: 'label' })

        const tx1 = await coreAddFrontendNodeTx(coreAddFrontendNodeCommand, owner, {
          frontendNodeOwnerAddress: frontendNodeOwner.address,
          frontendNodeName: 'domain.tld',
        })
        frontendNodeAddress = await getFrontendNodeAddressByTransaction(tx1)

        const tx2 = await gigsAddJobTx(gigsAddJobCommand, customer, {
          frontendNodeAddress: frontendNodeAddress,
          budget: '0.01',
          title: 'title1',
          description: 'description1',
          categoryIndex: 0,
        })
        jobAddress = await getJobAddressByTransaction(tx2)
      })

      describe('when requested as not a job owner', async () => {
        it('returns error', async () => {
          const tx = gigsGetApplications(gigsCustomerService, other, { jobAddress: jobAddress })

          await expectRevert(tx, 'CustomerOnly()')
        })
      })

      describe('when requested as a job owner', async () => {
        describe('without applications', async () => {
          it('returns an empty array', async () => {
            const jobApplications = await gigsGetApplications(gigsCustomerService, customer, { jobAddress: jobAddress })
            expect(jobApplications).to.eql([])
          })
        })

        describe('when there are applications for another customer job', async () => {
          it('returns an empty array', async () => {
            const tx = await gigsAddJobTx(gigsAddJobCommand, someone, {
              frontendNodeAddress: frontendNodeAddress,
              budget: 0,
              title: 'title2',
              description: 'description2',
              categoryIndex: 0,
            })
            const anotherCustomerJobAddress = await getJobAddressByTransaction(tx)

            await gigsAddApplication(gigsAddApplicationCommand, other, {
              frontendNodeAddress: frontendNodeAddress,
              jobAddress: anotherCustomerJobAddress,
              comment: 'comment2',
              serviceFee: '0.99',
            })

            const jobApplications = await gigsGetApplications(gigsCustomerService, customer, { jobAddress: jobAddress })
            expect(jobApplications).to.eql([])
          })
        })

        describe('when there are applications for another job', async () => {
          it('returns an empty array', async () => {
            const tx = await gigsAddJobTx(gigsAddJobCommand, customer, {
              frontendNodeAddress: frontendNodeAddress,
              budget: 0,
              title: 'title2',
              description: 'description2',
              categoryIndex: 0,
            })
            const anotherJobAddress = await getJobAddressByTransaction(tx)

            await gigsAddApplication(gigsAddApplicationCommand, other, {
              frontendNodeAddress: frontendNodeAddress,
              jobAddress: anotherJobAddress,
              comment: 'comment2',
              serviceFee: '0.99',
            })

            const jobApplications = await gigsGetApplications(gigsCustomerService, customer, { jobAddress: jobAddress })
            expect(jobApplications).to.eql([])
          })
        })

        describe('when there are applications for a requested job', async () => {
          it('returns array of objects', async () => {
            const tx1 = await gigsAddApplicationTx(gigsAddApplicationCommand, freelancer, {
              frontendNodeAddress: frontendNodeAddress,
              jobAddress: jobAddress,
              comment: 'comment1',
              serviceFee: '0.01',
            })
            const firstApplicationAddress = await getApplicationAddressByTransaction(tx1)

            const tx2 = await gigsAddApplicationTx(gigsAddApplicationCommand, other, {
              frontendNodeAddress: frontendNodeAddress,
              jobAddress: jobAddress,
              comment: 'comment2',
              serviceFee: '0.99',
            })
            const secondApplicationAddress = await getApplicationAddressByTransaction(tx2)

            const tx3 = await gigsAddContractTx(gigsAddContractCommand, customer, {
              frontendNodeAddress: frontendNodeAddress,
              jobAddress: jobAddress,
              applicationAddress: secondApplicationAddress,
              title: 'title',
              description: 'description',
              value: '0.01',
              durationInDays: 2,
              daysToStartWork: 1,
            })
            const newContractAddress = await getContractAddressByTransaction(tx3)

            const jobApplications = await gigsGetApplications(gigsCustomerService, customer, { jobAddress: jobAddress })
            expect(jobApplications.length).to.eq(2)

            const firstApplication = jobApplications.find((dto) => dto.id === firstApplicationAddress)
            expect(firstApplication.jobAddress).to.eq(jobAddress)
            expect(firstApplication.applicantAddress).to.eq(freelancer.address)
            expect(firstApplication.contractAddress).to.eq(ethers.constants.AddressZero)
            expect(firstApplication.hasContract).to.eq(false)
            expect(firstApplication.comment).to.eq('comment1')
            expect(firstApplication.serviceFee).to.eq(ethers.utils.parseEther('0.01'))
            expect(+firstApplication.createdAt).to.be.above(0)

            const secondApplication = jobApplications.find((dto) => dto.id === secondApplicationAddress)
            expect(secondApplication.jobAddress).to.eq(jobAddress)
            expect(secondApplication.applicantAddress).to.eq(other.address)
            expect(secondApplication.contractAddress).to.eq(newContractAddress)
            expect(secondApplication.hasContract).to.eq(true)
            expect(secondApplication.comment).to.eq('comment2')
            expect(secondApplication.serviceFee).to.eq(ethers.utils.parseEther('0.99'))
            expect(+secondApplication.createdAt).to.be.above(0)
          })
        })
      })
    })
  })

  describe('gigsGetJobAndApplicationForContract', async () => {
    describe('with invalid arguments', async () => {
      describe('when jobAddress is zero', async () => {
        it('returns error', async () => {
          const error = gigsGetJobAndApplicationForContract(gigsCustomerService, other, {
            jobAddress: ethers.constants.AddressZero,
            applicationAddress: ethers.constants.AddressZero,
          })
          await expectRevert(error, 'InvalidJobAddress()')
        })
      })

      describe('when applicationAddress is zero', async () => {
        it('returns error', async () => {
          const error = gigsGetJobAndApplicationForContract(gigsCustomerService, other, {
            jobAddress: someone.address,
            applicationAddress: ethers.constants.AddressZero,
          })
          await expectRevert(error, 'InvalidApplicationAddress()')
        })
      })
    })

    describe('when job does not exist', async () => {
      it('returns error', async () => {
        const error = gigsGetJobAndApplicationForContract(gigsCustomerService, other, {
          jobAddress: someone.address,
          applicationAddress: someone.address,
        })
        await expectRevert(error, 'JobDoesNotExist()')
      })
    })

    describe('when job exists', async () => {
      let jobAddress, frontendNodeAddress

      beforeEach(async () => {
        await gigsAddJobsCategory(gigsPlugin, owner, { categoryCode: 'code', categoryLabel: 'label' })

        const tx1 = await coreAddFrontendNodeTx(coreAddFrontendNodeCommand, owner, {
          frontendNodeOwnerAddress: frontendNodeOwner.address,
          frontendNodeName: 'domain.tld',
        })
        frontendNodeAddress = await getFrontendNodeAddressByTransaction(tx1)

        const tx2 = await gigsAddJobTx(gigsAddJobCommand, customer, {
          frontendNodeAddress: frontendNodeAddress,
          budget: '0.01',
          title: 'title1',
          description: 'description1',
          categoryIndex: 0,
        })
        jobAddress = await getJobAddressByTransaction(tx2)
      })

      describe('when requested as not a job owner', async () => {
        it('returns error', async () => {
          const error = gigsGetJobAndApplicationForContract(gigsCustomerService, other, {
            jobAddress: jobAddress,
            applicationAddress: someone.address,
          })
          await expectRevert(error, 'CustomerOnly()')
        })
      })

      describe('when requested as a job owner', async () => {
        describe('when application does not exist', async () => {
          it('returns error', async () => {
            const error = gigsGetJobAndApplicationForContract(gigsCustomerService, customer, {
              jobAddress: jobAddress,
              applicationAddress: someone.address,
            })
            await expectRevert(error, 'ApplicationDoesNotExist()')
          })
        })

        describe('when application exists', async () => {
          let applicationAddress

          beforeEach(async () => {
            const tx = await gigsAddApplicationTx(gigsAddApplicationCommand, freelancer, {
              frontendNodeAddress: frontendNodeAddress,
              jobAddress: jobAddress,
              comment: 'comment',
              serviceFee: '0.02',
            })
            applicationAddress = await getApplicationAddressByTransaction(tx)
          })

          describe('when contract exists', async () => {
            beforeEach(async () => {
              await gigsAddContract(gigsAddContractCommand, customer, {
                frontendNodeAddress: frontendNodeAddress,
                jobAddress: jobAddress,
                applicationAddress: applicationAddress,
                title: 'title',
                description: 'description',
                value: '0.03',
                durationInDays: 2,
                daysToStartWork: 1,
              })
            })

            it('returns error', async () => {
              const error = gigsGetJobAndApplicationForContract(gigsCustomerService, customer, {
                jobAddress: jobAddress,
                applicationAddress: applicationAddress,
              })
              await expectRevert(error, 'ContractExists()')
            })
          })

          describe('when contract does not exists', async () => {
            it('returns DTO', async () => {
              const dto = await gigsGetJobAndApplicationForContract(gigsCustomerService, customer, {
                jobAddress: jobAddress,
                applicationAddress: applicationAddress,
              })

              expect(dto.jobAddress).to.eq(jobAddress)
              expect(dto.applicationAddress).to.eq(applicationAddress)
              expect(dto.applicantAddress).to.eq(freelancer.address)
              expect(dto.title).to.eq('title1')
              expect(dto.description).to.eq('description1')
              expect(dto.budget).to.eq(ethers.utils.parseEther('0.01'))
              expect(dto.comment).to.eq('comment')
              expect(dto.serviceFee).to.eq(ethers.utils.parseEther('0.02'))
            })
          })
        })
      })
    })
  })

  describe('gigsGetContractsAsCustomer', async () => {
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
        const contracts = await gigsGetContractsAsCustomer(gigsCustomerService, other)
        expect(contracts).to.eql([])
      })
    })

    describe('when there are contracts when person is a contractor', async () => {
      beforeEach(async () => {
        await gigsAddJobsCategory(gigsPlugin, owner, { categoryCode: 'code', categoryLabel: 'label' })

        const tx1 = await gigsAddJobTx(gigsAddJobCommand, customer, {
          frontendNodeAddress: frontendNodeAddress,
          budget: '0.01',
          title: 'job1',
          description: 'job1description',
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
        const contracts = await gigsGetContractsAsCustomer(gigsCustomerService, freelancer)
        expect(contracts).to.eql([])
      })
    })

    describe('when there are another person contracts', async () => {
      beforeEach(async () => {
        await gigsAddJobsCategory(gigsPlugin, owner, { categoryCode: 'code', categoryLabel: 'label' })

        const tx1 = await gigsAddJobTx(gigsAddJobCommand, someone, {
          frontendNodeAddress: frontendNodeAddress,
          budget: '0.01',
          title: 'job1',
          description: 'job1description',
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

        await gigsAddContract(gigsAddContractCommand, someone, {
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
        const contracts = await gigsGetContractsAsCustomer(gigsCustomerService, customer)
        expect(contracts).to.eql([])
      })
    })

    describe('when there are contracts when person is a customer', async () => {
      let jobAddress1, jobAddress2, applicationAddress1, applicationAddress2

      beforeEach(async () => {
        await gigsAddJobsCategory(gigsPlugin, owner, { categoryCode: 'code', categoryLabel: 'label' })

        const tx1 = await gigsAddJobTx(gigsAddJobCommand, customer, {
          frontendNodeAddress: frontendNodeAddress,
          budget: '0.01',
          title: 'job1',
          description: 'job1description',
          categoryIndex: 0,
        })
        jobAddress1 = await getJobAddressByTransaction(tx1)

        const tx2 = await gigsAddApplicationTx(gigsAddApplicationCommand, freelancer, {
          frontendNodeAddress: frontendNodeAddress,
          jobAddress: jobAddress1,
          comment: 'comment1',
          serviceFee: '0.02',
        })
        applicationAddress1 = await getApplicationAddressByTransaction(tx2)

        const tx3 = await gigsAddJobTx(gigsAddJobCommand, customer, {
          frontendNodeAddress: frontendNodeAddress,
          budget: '0.03',
          title: 'job2',
          description: 'job2description',
          categoryIndex: 0,
        })
        jobAddress2 = await getJobAddressByTransaction(tx3)

        const tx4 = await gigsAddApplicationTx(gigsAddApplicationCommand, other, {
          frontendNodeAddress: frontendNodeAddress,
          jobAddress: jobAddress2,
          comment: 'comment2',
          serviceFee: '0.04',
        })
        applicationAddress2 = await getApplicationAddressByTransaction(tx4)
      })

      it('returns contracts', async () => {
        const tx1 = await gigsAddContractTx(gigsAddContractCommand, customer, {
          frontendNodeAddress: frontendNodeAddress,
          jobAddress: jobAddress1,
          applicationAddress: applicationAddress1,
          title: 'title1',
          description: 'description1',
          value: '0.05',
          durationInDays: 2,
          daysToStartWork: 1,
        })
        const contractAddress1 = await getContractAddressByTransaction(tx1)

        const tx2 = await gigsAddContractTx(gigsAddContractCommand, customer, {
          frontendNodeAddress: frontendNodeAddress,
          jobAddress: jobAddress2,
          applicationAddress: applicationAddress2,
          title: 'title2',
          description: 'description2',
          value: '0.06',
          durationInDays: 6,
          daysToStartWork: 5,
        })
        const contractAddress2 = await getContractAddressByTransaction(tx2)

        const contracts = await gigsGetContractsAsCustomer(gigsCustomerService, customer)
        expect(contracts.length).to.eql(2)

        const firstContract = contracts.find((contract) => contract.id === contractAddress1)
        expect(firstContract.jobAddress).to.eq(jobAddress1)
        expect(firstContract.applicationAddress).to.eq(applicationAddress1)
        expect(firstContract.customerAddress).to.eq(customer.address)
        expect(firstContract.contractorAddress).to.eq(freelancer.address)
        expect(firstContract.title).to.eq('title1')
        expect(firstContract.description).to.eq('description1')
        expect(firstContract.value).to.eq(ethers.utils.parseEther('0.05'))
        expect(+firstContract.durationInDays).to.eq(2)
        expect(+firstContract.daysToStartWork).to.eq(1)
        expect(+firstContract.createdAt).to.be.above(0)
        expect(firstContract.serviceFee).to.eq(ethers.utils.parseEther('0.02'))
        expect(firstContract.status).to.eq('created')

        const secondContract = contracts.find((contract) => contract.id === contractAddress2)
        expect(secondContract.jobAddress).to.eq(jobAddress2)
        expect(secondContract.applicationAddress).to.eq(applicationAddress2)
        expect(secondContract.customerAddress).to.eq(customer.address)
        expect(secondContract.contractorAddress).to.eq(other.address)
        expect(secondContract.title).to.eq('title2')
        expect(secondContract.description).to.eq('description2')
        expect(secondContract.value).to.eq(ethers.utils.parseEther('0.06'))
        expect(+secondContract.durationInDays).to.eq(6)
        expect(+secondContract.daysToStartWork).to.eq(5)
        expect(+secondContract.createdAt).to.be.above(0)
        expect(secondContract.serviceFee).to.eq(ethers.utils.parseEther('0.04'))
        expect(secondContract.status).to.eq('created')
      })
    })
  })
})
