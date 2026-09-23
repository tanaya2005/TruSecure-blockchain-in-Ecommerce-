const { registerProduct, updateEvent, markSold, verifyProductWithLocation } = require('./chain');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runEndToEndQrTest() {
  console.log("=========================================================================");
  console.log(" TruSecure End-to-End Workflow & Location-Based Counterfeit Audit Test  ");
  console.log("=========================================================================");

  const serialNumber = `SN-E2E-QR-${Date.now()}`;
  const description = "Luxury Chronograph Watch (E2E Test)";

  try {
    // 1. Manufacturer registers product at Location A
    console.log("\n[Step 1] Manufacturer registers product at Location A...");
    const regRes = await registerProduct(serialNumber, description);
    console.log("-> Registration Tx Hash:", regRes.transactionHash);
    await delay(500);

    // 2. Supplier updates transit to Location B
    console.log("\n[Step 2] Supplier updates transit location to Location B...");
    const supRes = await updateEvent(serialNumber, "Location B (Transit Hub)", "InTransit");
    console.log("-> Supplier Transit Tx Hash:", supRes.transactionHash);
    await delay(500);

    // 3. Retailer receives item at Location C and marks as sold
    console.log("\n[Step 3] Retailer receives item at Location C...");
    const retUpdateRes = await updateEvent(serialNumber, "Location C (Retail Store)", "DeliveredToRetail");
    console.log("-> Retail Receiving Tx Hash:", retUpdateRes.transactionHash);
    await delay(500);

    console.log("[Step 3b] Retailer marks item as sold...");
    const retSoldRes = await markSold(serialNumber);
    console.log("-> Mark Sold Tx Hash:", retSoldRes.transactionHash);
    await delay(500);

    // 4. Consumer verification with Genuine QR at Location C (Location match)
    console.log("\n[Step 4] Consumer scans Genuine QR code at Location C (Match Check)...");
    const authenticRes = await verifyProductWithLocation(serialNumber, "Location C (Retail Store)");
    console.log("-> Verification Status:", authenticRes.statusResult);
    console.log("-> Is Authentic:", authenticRes.isAuthentic);
    console.log("-> On-Chain Event Logs Count:", authenticRes.history.length);
    console.log("-> Last Logged Location:", authenticRes.history[authenticRes.history.length - 1].location);

    if (!authenticRes.isAuthentic) {
      throw new Error("Expected Genuine QR scan at Location C to return Authentic!");
    }

    // 5. Simulated Copied QR presented at Fake Location D (Location mismatch: C != D)
    console.log("\n[Step 5] Counterfeit Audit: Copied QR presented at Fake Location D (Mismatch Check)...");
    const counterfeitRes = await verifyProductWithLocation(serialNumber, "Location D (Fake Black-Market Outlet)");
    console.log("-> Verification Status:", counterfeitRes.statusResult);
    console.log("-> Is Authentic:", counterfeitRes.isAuthentic);

    if (counterfeitRes.isAuthentic) {
      throw new Error("Expected Copied QR scan at fake Location D to return Compromised!");
    }

    console.log("\n=========================================================================");
    console.log(" BOTH OUTCOMES VERIFIED: GENUINE = AUTHENTIC | COPIED = COUNTERFEIT     ");
    console.log("=========================================================================");
  } catch (err) {
    console.error("\n[Error] End-to-end QR test failed:", err);
    process.exit(1);
  }
}

runEndToEndQrTest();
