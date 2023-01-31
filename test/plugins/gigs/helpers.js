const { ethers } = require('hardhat')

const { getTransactionEventResult } = require('../../helpers')

const getJobAddressByTransaction = async (tx) => {
  const args = await getTransactionEventResult(tx)
  return args.newJobAddress
}

const getApplicationAddressByTransaction = async (tx) => {
  const args = await getTransactionEventResult(tx)
  return args.newApplicationAddress
}

const getContractAddressByTransaction = async (tx) => {
  const args = await getTransactionEventResult(tx)
  return args.newContractAddress
}

const gigsAddJob = async (contract, as, args = {}) => {
  const tx = await gigsAddJobTx(contract, as, args)
  return await tx.wait()
}

const gigsAddJobTx = async (contract, as, args = {}) => {
  return await contract
    .connect(as)
    .gigsAddJob(
      args.frontendNodeAddress,
      ethers.utils.parseEther(args.budget.toString()),
      args.title,
      args.description,
      args.categoryIndex
    )
}

const gigsAddApplication = async (contract, as, args = {}) => {
  const tx = await gigsAddApplicationTx(contract, as, args)
  return await tx.wait()
}

const gigsAddApplicationTx = async (contract, as, args = {}) => {
  return await contract
    .connect(as)
    .gigsAddApplication(
      args.frontendNodeAddress,
      args.jobAddress,
      args.comment,
      ethers.utils.parseEther(args.serviceFee.toString())
    )
}

const gigsAddContract = async (contract, as, args = {}) => {
  const tx = await gigsAddContractTx(contract, as, args)
  return await tx.wait()
}

const gigsAddContractTx = async (contract, as, args = {}) => {
  return await contract
    .connect(as)
    .gigsAddContract(
      args.frontendNodeAddress,
      args.jobAddress,
      args.applicationAddress,
      args.title,
      args.description,
      ethers.utils.parseEther(args.value.toString()),
      args.durationInDays,
      args.daysToStartWork
    )
}

const gigsAddJobsCategory = async (contract, as, args = {}) => {
  const tx = await gigsAddJobsCategoryTx(contract, as, args)
  return await tx.wait()
}

const gigsAddJobsCategoryTx = async (contract, as, args = {}) => {
  return await contract.connect(as).gigsAddJobsCategory(args.categoryCode, args.categoryLabel)
}

const gigsAcceptContract = async (contract, as, args = {}) => {
  const tx = await contract.connect(as).gigsAcceptContract(args.contractAddress)
  return await tx.wait()
}

const gigsFundContract = async (contract, as, args = {}) => {
  const tx = await contract.connect(as).gigsFundContract(args.contractAddress, {
    value: ethers.utils.parseEther(args.value.toString()),
  })
  return await tx.wait()
}

const gigsStartContract = async (contract, as, args = {}) => {
  const tx = await contract.connect(as).gigsStartContract(args.contractAddress)
  return await tx.wait()
}

const gigsDeliverContract = async (contract, as, args = {}) => {
  const tx = await contract.connect(as).gigsDeliverContract(args.contractAddress)
  return await tx.wait()
}

const gigsApproveContract = async (contract, as, args = {}) => {
  const tx = await contract.connect(as).gigsApproveContract(args.contractAddress)
  return await tx.wait()
}

const gigsDeclineContract = async (contract, as, args = {}) => {
  const tx = await contract.connect(as).gigsDeclineContract(args.contractAddress)
  return await tx.wait()
}

const gigsWithdrawContract = async (contract, as, args = {}) => {
  const tx = await contract.connect(as).gigsWithdrawContract(args.contractAddress)
  return await tx.wait()
}

const gigsRefundContract = async (contract, as, args = {}) => {
  const tx = await contract.connect(as).gigsRefundContract(args.contractAddress)
  return await tx.wait()
}

const gigsGetJobsCategories = async (contract, as) => {
  return await contract.connect(as).gigsGetJobsCategories()
}

const gigsGetJobs = async (contract, as) => {
  return await contract.connect(as).gigsGetJobs()
}

const gigsGetJob = async (contract, as, args = {}) => {
  return await contract.connect(as).gigsGetJob(args.jobAddress)
}

const gigsGetMyJobs = async (contract, as) => {
  return await contract.connect(as).gigsGetMyJobs()
}

const gigsGetApplications = async (contract, as, args = {}) => {
  return await contract.connect(as).gigsGetApplications(args.jobAddress)
}

const gigsGetMyApplication = async (contract, as, args = {}) => {
  return await contract.connect(as).gigsGetMyApplication(args.jobAddress)
}

const gigsGetMyApplications = async (contract, as) => {
  return await contract.connect(as).gigsGetMyApplications()
}

const gigsGetContract = async (contract, as, args = {}) => {
  return await contract.connect(as).gigsGetContract(args.contractAddress)
}

const gigsGetJobAndApplicationForContract = async (contract, as, args = {}) => {
  return await contract.connect(as).gigsGetJobAndApplicationForContract(args.jobAddress, args.applicationAddress)
}

const gigsGetContractsAsCustomer = async (contract, as) => {
  return await contract.connect(as).gigsGetContractsAsCustomer()
}

const gigsGetContractsAsContractor = async (contract, as) => {
  return await contract.connect(as).gigsGetContractsAsContractor()
}

const addDaysToTimestamp = (timestamp, daysToAdd) => {
  return timestamp + daysToAdd * 60 * 60 * 24
}

module.exports = {
  getJobAddressByTransaction,
  getApplicationAddressByTransaction,
  getContractAddressByTransaction,
  gigsAddJob,
  gigsAddJobTx,
  gigsAddApplication,
  gigsAddApplicationTx,
  gigsAddContract,
  gigsAddContractTx,
  gigsAddJobsCategory,
  gigsAddJobsCategoryTx,
  gigsAcceptContract,
  gigsFundContract,
  gigsStartContract,
  gigsDeliverContract,
  gigsApproveContract,
  gigsDeclineContract,
  gigsWithdrawContract,
  gigsRefundContract,
  gigsGetJobsCategories,
  gigsGetJobs,
  gigsGetJob,
  gigsGetMyJobs,
  gigsGetApplications,
  gigsGetMyApplication,
  gigsGetMyApplications,
  gigsGetContract,
  gigsGetJobAndApplicationForContract,
  gigsGetContractsAsCustomer,
  gigsGetContractsAsContractor,
  addDaysToTimestamp,
}
