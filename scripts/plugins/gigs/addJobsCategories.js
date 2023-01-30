/* global ethers */

const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS

async function addJobsCategories(args = {}) {
  if (typeof DIAMOND_ADDRESS === 'undefined' || DIAMOND_ADDRESS.toString().trim().length === 0) {
    throw new Error('Invalid DIAMOND_ADDRESS')
  }

  const GigsPlugin = await ethers.getContractAt('GigsPlugin', DIAMOND_ADDRESS)

  await GigsPlugin.gigsAddJobsCategory('other', 'Other')
  await GigsPlugin.gigsAddJobsCategory('programming', 'Programming & Software Development')
  await GigsPlugin.gigsAddJobsCategory('marketing', 'Marketing')
  await GigsPlugin.gigsAddJobsCategory('seo', 'SEO')
  await GigsPlugin.gigsAddJobsCategory('system_administration', 'System Administration')
  await GigsPlugin.gigsAddJobsCategory('design_and_illustrations', 'Design & Illustrations')
  await GigsPlugin.gigsAddJobsCategory('writing', 'Writing')
  await GigsPlugin.gigsAddJobsCategory('translations', 'Translations')
  await GigsPlugin.gigsAddJobsCategory('multimedia', 'Multimedia')
  await GigsPlugin.gigsAddJobsCategory('administration_support', 'Administration Support')
  await GigsPlugin.gigsAddJobsCategory('customer_service', 'Customer Service')
  await GigsPlugin.gigsAddJobsCategory('data_science_and_analytics', 'Data Science & Analytics')
  await GigsPlugin.gigsAddJobsCategory('legal', 'Legal')
  await GigsPlugin.gigsAddJobsCategory('engineering_and_architecture', 'Engineering & Architecture')
  await GigsPlugin.gigsAddJobsCategory('human_resources', 'Human Resources')
  await GigsPlugin.gigsAddJobsCategory('testing', 'QA & Testing')

  if (args.verbose) console.log('Jobs Categories added!')
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  addJobsCategories({ verbose: true }).catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
