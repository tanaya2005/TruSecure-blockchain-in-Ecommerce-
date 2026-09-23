const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TruSecure ProductRegistry Smart Contract Unit & Integration Tests", function () {
  let ProductRegistry;
  let registry;
  let admin, manufacturer, supplier, retailer, consumer, unauthorized;

  const Role = {
    None: 0,
    Administrator: 1,
    Manufacturer: 2,
    Supplier: 3,
    Retailer: 4
  };

  beforeEach(async function () {
    [admin, manufacturer, supplier, retailer, consumer, unauthorized] = await ethers.getSigners();

    ProductRegistry = await ethers.getContractFactory("ProductRegistry");
    registry = await ProductRegistry.deploy();
    await registry.waitForDeployment();

    // Assign roles
    await registry.assignRole(manufacturer.address, Role.Manufacturer);
    await registry.assignRole(supplier.address, Role.Supplier);
    await registry.assignRole(retailer.address, Role.Retailer);
  });

  it("1. Successful product registration by a Manufacturer", async function () {
    const serialNumber = "SN-MFG-001";
    const description = "Luxury Handbag";

    const tx = await registry.connect(manufacturer).registerProduct(serialNumber, description);
    await tx.wait();

    const product = await registry.getProduct(serialNumber);
    expect(product.serialNumber).to.equal(serialNumber);
    expect(product.description).to.equal(description);
    expect(product.currentStatus).to.equal("Registered");
    expect(product.exists).to.equal(true);
    expect(product.timestamp).to.be.gt(0);

    // Verify stored hash H = Hash(P)
    const expectedHash = ethers.solidityPackedKeccak256(["string", "string"], [serialNumber, description]);
    expect(product.productHash).to.equal(expectedHash);
  });

  it("2. Rejection when a non-Manufacturer tries to register", async function () {
    const serialNumber = "SN-UNAUTH-001";
    const description = "Unauthorized Item";

    await expect(
      registry.connect(unauthorized).registerProduct(serialNumber, description)
    ).to.be.revertedWith("Only Manufacturer can call this function");

    await expect(
      registry.connect(supplier).registerProduct(serialNumber, description)
    ).to.be.revertedWith("Only Manufacturer can call this function");
  });

  it("3. Event update by Supplier/Retailer changes stored state correctly", async function () {
    const serialNumber = "SN-UPDATE-001";
    await registry.connect(manufacturer).registerProduct(serialNumber, "Pharmaceuticals Batch");

    // Supplier updates event
    await registry.connect(supplier).updateEvent(serialNumber, "Location B (Cold Storage)", "InTransit");
    let product = await registry.getProduct(serialNumber);
    expect(product.currentStatus).to.equal("InTransit");

    // Retailer updates event
    await registry.connect(retailer).updateEvent(serialNumber, "Location C (Retail Store)", "DeliveredToRetail");
    product = await registry.getProduct(serialNumber);
    expect(product.currentStatus).to.equal("DeliveredToRetail");

    const history = await registry.getProductHistory(serialNumber);
    expect(history.length).to.equal(3);
    expect(history[1].location).to.equal("Location B (Cold Storage)");
    expect(history[2].location).to.equal("Location C (Retail Store)");
  });

  it("4. verifyProduct returns Authentic when data is untampered", async function () {
    const serialNumber = "SN-AUTHENTIC-100";
    await registry.connect(manufacturer).registerProduct(serialNumber, "Authentic Goods");
    await registry.connect(supplier).updateEvent(serialNumber, "Transit Node 1", "InTransit");

    const [statusResult, history] = await registry.connect(consumer).verifyProduct(serialNumber);
    expect(statusResult).to.equal("Authentic");
    expect(history.length).to.equal(2);
    expect(history[0].status).to.equal("Registered");
    expect(history[1].status).to.equal("InTransit");
  });

  it("5. verifyProduct returns Compromised when event data is manipulated (simulated tampered H' / fake location)", async function () {
    const serialNumber = "SN-TAMPER-500";
    await registry.connect(manufacturer).registerProduct(serialNumber, "Original Laptop");
    await registry.connect(retailer).updateEvent(serialNumber, "Location C", "InWarehouse");

    // 5a. Non-existent product query returns Compromised
    const [statusNonExistent] = await registry.connect(consumer).verifyProduct("SN-NON-EXISTENT");
    expect(statusNonExistent).to.equal("Compromised");

    // 5b. Simulated tampered H' (invalid custom hash check)
    const tamperedHash = ethers.solidityPackedKeccak256(["string", "string"], [serialNumber, "Tampered Laptop Description"]);
    const statusTamperedHash = await registry.verifyProductHash(serialNumber, tamperedHash);
    expect(statusTamperedHash).to.equal("Compromised");

    // 5c. Location mismatch (scanned Location D vs on-chain Location C)
    const [statusLocationMismatch] = await registry.verifyProductWithLocation(serialNumber, "Location D (Fake Retailer)");
    expect(statusLocationMismatch).to.equal("Compromised");
  });

  it("6. markSold only callable by Retailer", async function () {
    const serialNumber = "SN-SALE-999";
    await registry.connect(manufacturer).registerProduct(serialNumber, "Retail Product");

    // Rejection for Supplier
    await expect(
      registry.connect(supplier).markSold(serialNumber)
    ).to.be.revertedWith("Only Retailer can call this function");

    // Rejection for Manufacturer
    await expect(
      registry.connect(manufacturer).markSold(serialNumber)
    ).to.be.revertedWith("Only Retailer can call this function");

    // Rejection for Unauthorized
    await expect(
      registry.connect(unauthorized).markSold(serialNumber)
    ).to.be.revertedWith("Only Retailer can call this function");

    // Success for Retailer
    await registry.connect(retailer).markSold(serialNumber);
    const product = await registry.getProduct(serialNumber);
    expect(product.currentStatus).to.equal("Sold");
  });

  it("7. Full end-to-end trace matching paper example (Location A -> Location B -> Location C -> Consumer Verification)", async function () {
    const serialNumber = "SN-PAPER-E2E-2026";
    const description = "Designer Watch";

    // Step 1: Manufacturer registers product at Location A
    await registry.connect(manufacturer).registerProduct(serialNumber, description);
    let history = await registry.getProductHistory(serialNumber);
    expect(history[0].location).to.equal("Location A");
    expect(history[0].status).to.equal("Registered");

    // Step 2: Supplier updates location to Location B
    await registry.connect(supplier).updateEvent(serialNumber, "Location B", "InTransit");
    history = await registry.getProductHistory(serialNumber);
    expect(history[1].location).to.equal("Location B");
    expect(history[1].status).to.equal("InTransit");

    // Step 3: Retailer updates location to Location C and marks as sold
    await registry.connect(retailer).updateEvent(serialNumber, "Location C", "InRetailStore");
    await registry.connect(retailer).markSold(serialNumber);
    history = await registry.getProductHistory(serialNumber);
    expect(history[2].location).to.equal("Location C");
    expect(history[3].status).to.equal("Sold");

    // Step 4: Consumer verification at purchase (Scanned Location C matches last recorded Location C)
    const [statusAuthentic, authHistory] = await registry.verifyProductWithLocation(serialNumber, "Location C");
    expect(statusAuthentic).to.equal("Authentic");
    expect(authHistory.length).to.equal(4);

    // Step 5: Counterfeit check (Copied QR presented at fake Location D)
    const [statusCounterfeit] = await registry.verifyProductWithLocation(serialNumber, "Location D");
    expect(statusCounterfeit).to.equal("Compromised");
  });
});
