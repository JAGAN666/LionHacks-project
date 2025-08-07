import { ethers } from "hardhat";

async function main() {
  console.log("Deploying Academic Achievement NFT contracts...");

  // Deploy AcademicAchievementNFT
  const AcademicAchievementNFT = await ethers.getContractFactory("AcademicAchievementNFT");
  const nftContract = await AcademicAchievementNFT.deploy();
  await nftContract.waitForDeployment();

  console.log("AcademicAchievementNFT deployed to:", await nftContract.getAddress());

  // Deploy AccessGatekeeper
  const AccessGatekeeper = await ethers.getContractFactory("AccessGatekeeper");
  const gatekeeperContract = await AccessGatekeeper.deploy(await nftContract.getAddress());
  await gatekeeperContract.waitForDeployment();

  console.log("AccessGatekeeper deployed to:", await gatekeeperContract.getAddress());

  // Grant MINTER_ROLE to the deployer and potentially to a backend service
  const MINTER_ROLE = await nftContract.MINTER_ROLE();
  console.log("Granting MINTER_ROLE to deployer...");
  
  // Add gatekeeper as a minter if needed
  // await nftContract.grantRole(MINTER_ROLE, await gatekeeperContract.getAddress());

  // Setup some demo opportunities
  console.log("Creating demo opportunities...");
  
  const currentTime = Math.floor(Date.now() / 1000);
  const oneMonthFromNow = currentTime + (30 * 24 * 60 * 60);
  const threeMonthsFromNow = currentTime + (90 * 24 * 60 * 60);

  // Opportunity 1: Premium Research Database (requires GPA Guardian)
  await gatekeeperContract.createOpportunity(
    "Premium Research Database Access",
    "Unlock access to IEEE Xplore, ACM Digital Library, and other premium research databases",
    [0], // GPA_GUARDIAN
    100,
    currentTime,
    threeMonthsFromNow,
    "https://api.academic-nft.com/opportunities/1/metadata"
  );

  // Opportunity 2: Google Internship Fast-Track (requires GPA Guardian or Research Rockstar)
  await gatekeeperContract.createOpportunity(
    "Google Engineering Internship Fast-Track",
    "Direct application pipeline to Google's engineering internship program",
    [0, 1], // GPA_GUARDIAN, RESEARCH_ROCKSTAR
    50,
    currentTime,
    oneMonthFromNow,
    "https://api.academic-nft.com/opportunities/2/metadata"
  );

  // Opportunity 3: Alumni Mentorship (requires Leadership Legend)
  await gatekeeperContract.createOpportunity(
    "Exclusive Alumni Mentorship Network",
    "Connect with successful alumni for career guidance and networking",
    [2], // LEADERSHIP_LEGEND
    200,
    currentTime,
    threeMonthsFromNow,
    "https://api.academic-nft.com/opportunities/3/metadata"
  );

  console.log("\n=== Deployment Summary ===");
  console.log(`AcademicAchievementNFT: ${await nftContract.getAddress()}`);
  console.log(`AccessGatekeeper: ${await gatekeeperContract.getAddress()}`);
  console.log("Demo opportunities created successfully!");

  // Save deployment info
  const deployInfo = {
    network: "localhost",
    nftContract: await nftContract.getAddress(),
    gatekeeperContract: await gatekeeperContract.getAddress(),
    deployedAt: new Date().toISOString()
  };

  console.log("\nDeployment info:", JSON.stringify(deployInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });