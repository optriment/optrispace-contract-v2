const { expect } = require('chai')
const { ethers } = require('hardhat')
const { deployFacet, getFrontendNodeAddressByTransaction, coreAddFrontendNodeTx } = require('../../../helpers')

const {
  getJobAddressByTransaction,
  getApplicationAddressByTransaction,
  getContractAddressByTransaction,
  gigsAddJobsCategory,
  gigsAddJobTx,
  gigsAddApplication,
  gigsAddApplicationTx,
  gigsAddContractTx,
  gigsAcceptContract,
  gigsFundContract,
  gigsStartContract,
  gigsDeliverContract,
  gigsApproveContract,
  gigsDeclineContract,
  gigsRefundContract,
  gigsGetFreelancers,
} = require('../helpers')

const { deployDiamond } = require('../../../../scripts/deploy.js')

describe('GigsGetFreelancersQuery', async () => {
  let diamondAddress
  let diamondCutFacet

  let gigsPlugin
  let gigsGetFreelancersQuery
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

    await deployFacet(diamondCutFacet, 'GigsPlugin')
    await deployFacet(diamondCutFacet, 'GigsGetFreelancersQuery')
    await deployFacet(diamondCutFacet, 'GigsAddJobCommand')
    await deployFacet(diamondCutFacet, 'GigsAddApplicationCommand')

    gigsPlugin = await ethers.getContractAt('GigsPlugin', diamondAddress)
    gigsGetFreelancersQuery = await ethers.getContractAt('GigsGetFreelancersQuery', diamondAddress)
    gigsAddJobCommand = await ethers.getContractAt('GigsAddJobCommand', diamondAddress)
    gigsAddApplicationCommand = await ethers.getContractAt('GigsAddApplicationCommand', diamondAddress)
  })

  describe('gigsGetFreelancers', async () => {
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

    describe('when there are no freelancers', async () => {
      it('returns an empty array', async () => {
        const freelancers = await gigsGetFreelancers(gigsGetFreelancersQuery, other)
        expect(freelancers).to.eql([])
      })
    })

    describe('with one freelancer', async () => {
      let jobAddress, application1Address

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

        application1Address = await getApplicationAddressByTransaction(tx2)
      })

      describe('without contracts', async () => {
        it('returns only one freelancer', async () => {
          const freelancers = await gigsGetFreelancers(gigsGetFreelancersQuery, freelancer)
          expect(freelancers.length).to.eq(1)

          const firstFreelancer = freelancers[0]
          expect(firstFreelancer.id).to.eq(freelancer.address)
          expect(firstFreelancer.displayName).to.eq('')
          expect(firstFreelancer.about).to.eq('')
          expect(firstFreelancer.totalContractsCount).to.eq(0)
          expect(firstFreelancer.failedContractsCount).to.eq(0)
          expect(firstFreelancer.succeededContractsCount).to.eq(0)
          expect(firstFreelancer.lastActivityAt).to.be.above(0)
        })
      })

      describe('with contracts', async () => {
        let contractAddress

        beforeEach(async () => {
          await deployFacet(diamondCutFacet, 'GigsAddContractCommand')
          const gigsAddContractCommand = await ethers.getContractAt('GigsAddContractCommand', diamondAddress)

          const tx4 = await gigsAddContractTx(gigsAddContractCommand, customer, {
            frontendNodeAddress: frontendNodeAddress,
            jobAddress: jobAddress,
            applicationAddress: application1Address,
            title: 'title',
            description: 'description',
            value: '0.02',
            durationInDays: 2,
            daysToStartWork: 1,
          })
          contractAddress = await getContractAddressByTransaction(tx4)
        })

        it('returns totalContractsCount', async () => {
          const freelancers = await gigsGetFreelancers(gigsGetFreelancersQuery, freelancer)
          expect(freelancers.length).to.eq(1)

          const firstFreelancer = freelancers[0]
          expect(firstFreelancer.id).to.eq(freelancer.address)
          expect(firstFreelancer.displayName).to.eq('')
          expect(firstFreelancer.about).to.eq('')
          expect(firstFreelancer.totalContractsCount).to.eq(1)
          expect(firstFreelancer.failedContractsCount).to.eq(0)
          expect(firstFreelancer.succeededContractsCount).to.eq(0)
          expect(firstFreelancer.lastActivityAt).to.be.above(0)
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
            const freelancers = await gigsGetFreelancers(gigsGetFreelancersQuery, freelancer)
            expect(freelancers.length).to.eq(1)

            const firstFreelancer = freelancers[0]
            expect(firstFreelancer.id).to.eq(freelancer.address)
            expect(firstFreelancer.displayName).to.eq('')
            expect(firstFreelancer.about).to.eq('')
            expect(firstFreelancer.totalContractsCount).to.eq(1)
            expect(firstFreelancer.failedContractsCount).to.eq(0)
            expect(firstFreelancer.succeededContractsCount).to.eq(1)
            expect(firstFreelancer.lastActivityAt).to.be.above(0)
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
            const freelancers = await gigsGetFreelancers(gigsGetFreelancersQuery, freelancer)
            expect(freelancers.length).to.eq(1)

            const firstFreelancer = freelancers[0]
            expect(firstFreelancer.id).to.eq(freelancer.address)
            expect(firstFreelancer.displayName).to.eq('')
            expect(firstFreelancer.about).to.eq('')
            expect(firstFreelancer.totalContractsCount).to.eq(1)
            expect(firstFreelancer.failedContractsCount).to.eq(1)
            expect(firstFreelancer.succeededContractsCount).to.eq(0)
            expect(firstFreelancer.lastActivityAt).to.be.above(0)
          })
        })
      })
    })

    describe('with many freelancers', async () => {
      beforeEach(async () => {
        await gigsAddJobsCategory(gigsPlugin, owner, { categoryCode: 'code', categoryLabel: 'Label' })

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
          budget: '0.02',
          title: 'title2',
          description: 'description2',
          categoryIndex: 0,
        })
        const secondJobAddress = await getJobAddressByTransaction(tx2)

        await gigsAddApplication(gigsAddApplicationCommand, freelancer, {
          frontendNodeAddress: frontendNodeAddress,
          jobAddress: firstJobAddress,
          comment: 'comment1',
          serviceFee: '0.03',
        })

        await gigsAddApplication(gigsAddApplicationCommand, someone, {
          frontendNodeAddress: frontendNodeAddress,
          jobAddress: firstJobAddress,
          comment: 'comment2',
          serviceFee: '0.04',
        })

        await gigsAddApplication(gigsAddApplicationCommand, freelancer, {
          frontendNodeAddress: frontendNodeAddress,
          jobAddress: secondJobAddress,
          comment: 'comment3',
          serviceFee: '0.05',
        })

        await gigsAddApplication(gigsAddApplicationCommand, other, {
          frontendNodeAddress: frontendNodeAddress,
          jobAddress: secondJobAddress,
          comment: 'comment4',
          serviceFee: '0.06',
        })
      })

      it('returns three freelancers', async () => {
        const freelancers = await gigsGetFreelancers(gigsGetFreelancersQuery, freelancer)
        expect(freelancers.length).to.eq(3)

        const firstFreelancer = freelancers[0]
        expect(firstFreelancer.id).to.eq(freelancer.address)
        expect(firstFreelancer.displayName).to.eq('')
        expect(firstFreelancer.about).to.eq('')
        expect(firstFreelancer.totalContractsCount).to.eq(0)
        expect(firstFreelancer.failedContractsCount).to.eq(0)
        expect(firstFreelancer.succeededContractsCount).to.eq(0)
        expect(firstFreelancer.lastActivityAt).to.be.above(0)

        const secondFreelancer = freelancers[1]
        expect(secondFreelancer.id).to.eq(someone.address)
        expect(secondFreelancer.displayName).to.eq('')
        expect(secondFreelancer.about).to.eq('')
        expect(secondFreelancer.totalContractsCount).to.eq(0)
        expect(secondFreelancer.failedContractsCount).to.eq(0)
        expect(secondFreelancer.succeededContractsCount).to.eq(0)
        expect(secondFreelancer.lastActivityAt).to.be.above(0)

        const thirdFreelancer = freelancers[2]
        expect(thirdFreelancer.id).to.eq(other.address)
        expect(thirdFreelancer.displayName).to.eq('')
        expect(thirdFreelancer.about).to.eq('')
        expect(thirdFreelancer.totalContractsCount).to.eq(0)
        expect(thirdFreelancer.failedContractsCount).to.eq(0)
        expect(thirdFreelancer.succeededContractsCount).to.eq(0)
        expect(thirdFreelancer.lastActivityAt).to.be.above(0)
      })
    })
  })
})
