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
    it('adds functions', async () => {
      const { selectors: coreAddFrontendNodeCommandSelectors, address: coreAddFrontendNodeCommandAddress } =
        await deployFacet(diamondCutFacet, 'CoreAddFrontendNodeCommand')

      const result = await diamondLoupeFacet.facetFunctionSelectors(coreAddFrontendNodeCommandAddress)
      assert.sameMembers(result, coreAddFrontendNodeCommandSelectors)
    })
  })

  describe('plugins', async () => {
    describe('Gigs', async () => {
      it('adds functions', async () => {
        let result

        // GigsPlugin

        const { selectors: gigsPluginSelectors, address: gigsPluginAddress } = await deployFacet(
          diamondCutFacet,
          'GigsPlugin'
        )

        result = await diamondLoupeFacet.facetFunctionSelectors(gigsPluginAddress)
        assert.sameMembers(result, gigsPluginSelectors)

        // GigsCustomerService

        const { selectors: gigsCustomerServiceSelectors, address: gigsCustomerServiceAddress } = await deployFacet(
          diamondCutFacet,
          'GigsCustomerService'
        )

        result = await diamondLoupeFacet.facetFunctionSelectors(gigsCustomerServiceAddress)
        assert.sameMembers(result, gigsCustomerServiceSelectors)

        // GigsFreelancerService

        const { selectors: gigsFreelancerServiceSelectors, address: gigsFreelancerServiceAddress } = await deployFacet(
          diamondCutFacet,
          'GigsFreelancerService'
        )

        result = await diamondLoupeFacet.facetFunctionSelectors(gigsFreelancerServiceAddress)
        assert.sameMembers(result, gigsFreelancerServiceSelectors)

        // GigsContractsService

        const { selectors: gigsContractsServiceSelectors, address: gigsContractsServiceAddress } = await deployFacet(
          diamondCutFacet,
          'GigsContractsService'
        )

        result = await diamondLoupeFacet.facetFunctionSelectors(gigsContractsServiceAddress)
        assert.sameMembers(result, gigsContractsServiceSelectors)

        // GigsAddJobCommand

        const { selectors: gigsAddJobCommandSelectors, address: gigsAddJobCommandAddress } = await deployFacet(
          diamondCutFacet,
          'GigsAddJobCommand'
        )

        result = await diamondLoupeFacet.facetFunctionSelectors(gigsAddJobCommandAddress)
        assert.sameMembers(result, gigsAddJobCommandSelectors)

        // GigsAddApplicationCommand

        const { selectors: gigsAddApplicationCommandSelectors, address: gigsAddApplicationCommandAddress } =
          await deployFacet(diamondCutFacet, 'GigsAddApplicationCommand')

        result = await diamondLoupeFacet.facetFunctionSelectors(gigsAddApplicationCommandAddress)
        assert.sameMembers(result, gigsAddApplicationCommandSelectors)

        // GigsAddContractCommand

        const { selectors: gigsAddContractCommandSelectors, address: gigsAddContractCommandAddress } =
          await deployFacet(diamondCutFacet, 'GigsAddContractCommand')

        result = await diamondLoupeFacet.facetFunctionSelectors(gigsAddContractCommandAddress)
        assert.sameMembers(result, gigsAddContractCommandSelectors)

        // GigsAcceptContractCommand

        const { selectors: gigsAcceptContractCommandSelectors, address: gigsAcceptContractCommandAddress } =
          await deployFacet(diamondCutFacet, 'GigsAcceptContractCommand')

        result = await diamondLoupeFacet.facetFunctionSelectors(gigsAcceptContractCommandAddress)
        assert.sameMembers(result, gigsAcceptContractCommandSelectors)

        // GigsFundContractCommand

        const { selectors: gigsFundContractCommandSelectors, address: gigsFundContractCommandAddress } =
          await deployFacet(diamondCutFacet, 'GigsFundContractCommand')

        result = await diamondLoupeFacet.facetFunctionSelectors(gigsFundContractCommandAddress)
        assert.sameMembers(result, gigsFundContractCommandSelectors)

        // GigsStartContractCommand

        const { selectors: gigsStartContractCommandSelectors, address: gigsStartContractCommandAddress } =
          await deployFacet(diamondCutFacet, 'GigsStartContractCommand')

        result = await diamondLoupeFacet.facetFunctionSelectors(gigsStartContractCommandAddress)
        assert.sameMembers(result, gigsStartContractCommandSelectors)

        // GigsDeliverContractCommand

        const { selectors: gigsDeliverContractCommandSelectors, address: gigsDeliverContractCommandAddress } =
          await deployFacet(diamondCutFacet, 'GigsDeliverContractCommand')

        result = await diamondLoupeFacet.facetFunctionSelectors(gigsDeliverContractCommandAddress)
        assert.sameMembers(result, gigsDeliverContractCommandSelectors)

        // GigsApproveContractCommand

        const { selectors: gigsApproveContractCommandSelectors, address: gigsApproveContractCommandAddress } =
          await deployFacet(diamondCutFacet, 'GigsApproveContractCommand')

        result = await diamondLoupeFacet.facetFunctionSelectors(gigsApproveContractCommandAddress)
        assert.sameMembers(result, gigsApproveContractCommandSelectors)

        // GigsDeclineContractCommand

        const { selectors: gigsDeclineContractCommandSelectors, address: gigsDeclineContractCommandAddress } =
          await deployFacet(diamondCutFacet, 'GigsDeclineContractCommand')

        result = await diamondLoupeFacet.facetFunctionSelectors(gigsDeclineContractCommandAddress)
        assert.sameMembers(result, gigsDeclineContractCommandSelectors)

        // GigsWithdrawContractCommand

        const { selectors: gigsWithdrawContractCommandSelectors, address: gigsWithdrawContractCommandAddress } =
          await deployFacet(diamondCutFacet, 'GigsWithdrawContractCommand')

        result = await diamondLoupeFacet.facetFunctionSelectors(gigsWithdrawContractCommandAddress)
        assert.sameMembers(result, gigsWithdrawContractCommandSelectors)

        // GigsRefundContractCommand

        const { selectors: gigsRefundContractCommandSelectors, address: gigsRefundContractCommandAddress } =
          await deployFacet(diamondCutFacet, 'GigsRefundContractCommand')

        result = await diamondLoupeFacet.facetFunctionSelectors(gigsRefundContractCommandAddress)
        assert.sameMembers(result, gigsRefundContractCommandSelectors)
      })
    })
  })
})
