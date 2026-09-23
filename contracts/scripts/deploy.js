const hre = require("hardhat");

async function main() {
  console.log("Deploying ProductRegistry contract to network:", hre.network.name);

  const [admin, manufacturer, supplier, retailer] = await hre.ethers.getSigners();
  console.log("Deployer / Admin Account:", admin.address);

  const ProductRegistry = await hre.ethers.getContractFactory("ProductRegistry");
  const registry = await ProductRegistry.deploy();
  await registry.waitForDeployment();

  const contractAddress = await registry.getAddress();
  console.log(`ProductRegistry deployed to: ${contractAddress}`);

  // Assign roles if signers are available
  if (manufacturer && supplier && retailer) {
    console.log("Assigning roles to local test accounts...");
    await (await registry.assignRole(manufacturer.address, 2)).wait(); // Manufacturer = 2
    await (await registry.assignRole(supplier.address, 3)).wait();     // Supplier = 3
    await (await registry.assignRole(retailer.address, 4)).wait();     // Retailer = 4

    console.log(`- Manufacturer assigned: ${manufacturer.address}`);
    console.log(`- Supplier assigned:     ${supplier.address}`);
    console.log(`- Retailer assigned:     ${retailer.address}`);
  }

  return contractAddress;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = main;
