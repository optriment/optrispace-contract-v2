const { assert } = require('chai')
const { ethers } = require('hardhat')

const { getSelectors } = require('../scripts/libraries/diamond.js')
const { deployDiamond } = require('../scripts/deploy.js')
const { deployFacet } = require('./helpers')

describe('OptriSpace', async () => {
  let diamondAddress
  let diamondCutFacet
  let diamondLoupeFacet
  let ownershipFacet

  beforeEach(async () => {
    diamondAddress = await deployDiamond()
    diamondCutFacet = await ethers.getContractAt('DiamondCutFacet', diamondAddress)
    diamondLoupeFacet = await ethers.getContractAt('DiamondLoupeFacet', diamondAddress)
    ownershipFacet = await ethers.getContractAt('OwnershipFacet', diamondAddress)
  })

  describe('default facets', async () => {
    let addresses = []

    beforeEach(async () => {
      const a = []

      for (const address of await diamondLoupeFacet.facetAddresses()) {
        a.push(address)
      }

      addresses = a
    })

    it('should have three facets', async () => {
      assert.equal(addresses.length, 3)
    })

    it('facets should have the right function selectors', async () => {
      let selectors = getSelectors(diamondCutFacet)
      let result = await diamondLoupeFacet.facetFunctionSelectors(addresses[0])
      assert.sameMembers(result, selectors)

      selectors = getSelectors(diamondLoupeFacet)
      result = await diamondLoupeFacet.facetFunctionSelectors(addresses[1])
      assert.sameMembers(result, selectors)

      selectors = getSelectors(ownershipFacet)
      result = await diamondLoupeFacet.facetFunctionSelectors(addresses[2])
      assert.sameMembers(result, selectors)
    })

    it('selectors should be associated to facets correctly', async () => {
      assert.equal(addresses[0], await diamondLoupeFacet.facetAddress('0x1f931c1c'))
      assert.equal(addresses[1], await diamondLoupeFacet.facetAddress('0xcdffacc6'))
      assert.equal(addresses[1], await diamondLoupeFacet.facetAddress('0x01ffc9a7'))
      assert.equal(addresses[2], await diamondLoupeFacet.facetAddress('0xf2fde38b'))
    })
  })

  describe('core', async () => {
    it('adds CoreAddFrontendNodeCommand', async () => {
      const { selectors, address } = await deployFacet(diamondCutFacet, 'CoreAddFrontendNodeCommand')

      const result = await diamondLoupeFacet.facetFunctionSelectors(address)
      assert.sameMembers(result, selectors)
    })

    it('adds CoreGetStatsQuery', async () => {
      const { selectors, address } = await deployFacet(diamondCutFacet, 'CoreGetStatsQuery')

      const result = await diamondLoupeFacet.facetFunctionSelectors(address)
      assert.sameMembers(result, selectors)
    })
  })

  describe('plugins', async () => {
    describe('Gigs', async () => {
      it('adds GigsPlugin', async () => {
        const { selectors, address } = await deployFacet(diamondCutFacet, 'GigsPlugin')

        const result = await diamondLoupeFacet.facetFunctionSelectors(address)
        assert.sameMembers(result, selectors)
      })

      it('adds GigsCustomerService', async () => {
        const { selectors, address } = await deployFacet(diamondCutFacet, 'GigsCustomerService')

        const result = await diamondLoupeFacet.facetFunctionSelectors(address)
        assert.sameMembers(result, selectors)
      })

      it('adds GigsFreelancerService', async () => {
        const { selectors, address } = await deployFacet(diamondCutFacet, 'GigsFreelancerService')

        const result = await diamondLoupeFacet.facetFunctionSelectors(address)
        assert.sameMembers(result, selectors)
      })

      it('adds GigsContractsService', async () => {
        const { selectors, address } = await deployFacet(diamondCutFacet, 'GigsContractsService')

        const result = await diamondLoupeFacet.facetFunctionSelectors(address)
        assert.sameMembers(result, selectors)
      })

      it('adds GigsGetMyApplicationsQuery', async () => {
        const { selectors, address } = await deployFacet(diamondCutFacet, 'GigsGetMyApplicationsQuery')

        const result = await diamondLoupeFacet.facetFunctionSelectors(address)
        assert.sameMembers(result, selectors)
      })

      it('adds GigsGetCustomersQuery', async () => {
        const { selectors, address } = await deployFacet(diamondCutFacet, 'GigsGetCustomersQuery')

        const result = await diamondLoupeFacet.facetFunctionSelectors(address)
        assert.sameMembers(result, selectors)
      })

      it('adds GigsGetFreelancersQuery', async () => {
        const { selectors, address } = await deployFacet(diamondCutFacet, 'GigsGetFreelancersQuery')

        const result = await diamondLoupeFacet.facetFunctionSelectors(address)
        assert.sameMembers(result, selectors)
      })

      it('adds GigsGetCustomerQuery', async () => {
        const { selectors, address } = await deployFacet(diamondCutFacet, 'GigsGetCustomerQuery')

        const result = await diamondLoupeFacet.facetFunctionSelectors(address)
        assert.sameMembers(result, selectors)
      })

      it('adds GigsGetFreelancerQuery', async () => {
        const { selectors, address } = await deployFacet(diamondCutFacet, 'GigsGetFreelancerQuery')

        const result = await diamondLoupeFacet.facetFunctionSelectors(address)
        assert.sameMembers(result, selectors)
      })

      it('adds GigsGetMyCustomerProfileQuery', async () => {
        const { selectors, address } = await deployFacet(diamondCutFacet, 'GigsGetMyCustomerProfileQuery')

        const result = await diamondLoupeFacet.facetFunctionSelectors(address)
        assert.sameMembers(result, selectors)
      })

      it('adds GigsGetMyFreelancerProfileQuery', async () => {
        const { selectors, address } = await deployFacet(diamondCutFacet, 'GigsGetMyFreelancerProfileQuery')

        const result = await diamondLoupeFacet.facetFunctionSelectors(address)
        assert.sameMembers(result, selectors)
      })

      it('adds GigsAddJobCommand', async () => {
        const { selectors, address } = await deployFacet(diamondCutFacet, 'GigsAddJobCommand')

        const result = await diamondLoupeFacet.facetFunctionSelectors(address)
        assert.sameMembers(result, selectors)
      })

      it('adds GigsAddApplicationCommand', async () => {
        const { selectors, address } = await deployFacet(diamondCutFacet, 'GigsAddApplicationCommand')

        const result = await diamondLoupeFacet.facetFunctionSelectors(address)
        assert.sameMembers(result, selectors)
      })

      it('adds GigsAddContractCommand', async () => {
        const { selectors, address } = await deployFacet(diamondCutFacet, 'GigsAddContractCommand')

        const result = await diamondLoupeFacet.facetFunctionSelectors(address)
        assert.sameMembers(result, selectors)
      })

      it('adds GigsAcceptContractCommand', async () => {
        const { selectors, address } = await deployFacet(diamondCutFacet, 'GigsAcceptContractCommand')

        const result = await diamondLoupeFacet.facetFunctionSelectors(address)
        assert.sameMembers(result, selectors)
      })

      it('adds GigsFundContractCommand', async () => {
        const { selectors, address } = await deployFacet(diamondCutFacet, 'GigsFundContractCommand')

        const result = await diamondLoupeFacet.facetFunctionSelectors(address)
        assert.sameMembers(result, selectors)
      })

      it('adds GigsStartContractCommand', async () => {
        const { selectors, address } = await deployFacet(diamondCutFacet, 'GigsStartContractCommand')

        const result = await diamondLoupeFacet.facetFunctionSelectors(address)
        assert.sameMembers(result, selectors)
      })

      it('adds GigsDeliverContractCommand', async () => {
        const { selectors, address } = await deployFacet(diamondCutFacet, 'GigsDeliverContractCommand')

        const result = await diamondLoupeFacet.facetFunctionSelectors(address)
        assert.sameMembers(result, selectors)
      })

      it('adds GigsApproveContractCommand', async () => {
        const { selectors, address } = await deployFacet(diamondCutFacet, 'GigsApproveContractCommand')

        const result = await diamondLoupeFacet.facetFunctionSelectors(address)
        assert.sameMembers(result, selectors)
      })

      it('adds GigsDeclineContractCommand', async () => {
        const { selectors, address } = await deployFacet(diamondCutFacet, 'GigsDeclineContractCommand')

        const result = await diamondLoupeFacet.facetFunctionSelectors(address)
        assert.sameMembers(result, selectors)
      })

      it('adds GigsWithdrawContractCommand', async () => {
        const { selectors, address } = await deployFacet(diamondCutFacet, 'GigsWithdrawContractCommand')

        const result = await diamondLoupeFacet.facetFunctionSelectors(address)
        assert.sameMembers(result, selectors)
      })

      it('adds GigsRefundContractCommand', async () => {
        const { selectors, address } = await deployFacet(diamondCutFacet, 'GigsRefundContractCommand')

        const result = await diamondLoupeFacet.facetFunctionSelectors(address)
        assert.sameMembers(result, selectors)
      })
    })
  })
})
