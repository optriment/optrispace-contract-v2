require('dotenv').config() // eslint-disable-line node/no-unpublished-require
require('@nomiclabs/hardhat-etherscan') // eslint-disable-line node/no-unpublished-require
require('@nomiclabs/hardhat-waffle') // eslint-disable-line node/no-unpublished-require
require('hardhat-gas-reporter') // eslint-disable-line node/no-unpublished-require
require('solidity-coverage') // eslint-disable-line node/no-unpublished-require
require('hardhat-contract-sizer') // eslint-disable-line node/no-unpublished-require

// specify mnemonic with env or .env file
const mnemonic = process.env.MNEMONIC

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  paths: {
    sources: './src',
    tests: './test',
  },
  solidity: {
    compilers: [
      {
        version: '0.8.17',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      throwOnTransactionFailures: true,
      throwOnCallFailures: true,
      loggingEnabled: false,
      allowUnlimitedContractSize: false,
    },
    'bsc-testnet': {
      url: 'https://data-seed-prebsc-1-s1.binance.org:8545',
      chainId: 97,
      gasPrice: 20000000000,
      accounts: { mnemonic: mnemonic },
    },
    'bsc-mainnet': {
      url: 'https://bsc-dataseed.binance.org/',
      chainId: 56,
      gasPrice: 20000000000,
      accounts: { mnemonic: mnemonic },
    },
  },
  // https://www.npmjs.com/package/hardhat-gas-reporter
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY || null,
    gasPriceApi: 'https://api.bscscan.com/api?module=proxy&action=eth_gasPrice',
    token: 'BNB',
    currency: 'USD',
    codechecks: true,
    showTimeSpent: true,
    onlyCalledMethods: false,
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  contractSizer: {
    strict: true,
    // runOnCompile: true,
    // disambiguatePaths: true,
  },
}
