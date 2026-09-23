const { registerProduct, updateEvent, markSold, verifyProduct } = require('./chain');

async function runTestChain() {
  console.log("=================================================");
  console.log(" TruSecure Blockchain Bridge Integration Test    ");
  console.log("=================================================");

  const testSerial = `SN-TEST-BRIDGE-${Date.now()}`;
  const description = "Test Luxury Product";

  try {
    // 1. registerProduct
    console.log("\n[1] Calling registerProduct()...");
    const regRes = await registerProduct(testSerial, description);
    console.log("-> Success:", regRes);

    // 2. updateEvent
    console.log("\n[2] Calling updateEvent()...");
    const updateRes = await updateEvent(testSerial, "Location B (Warehouse Hub)", "InTransit");
    console.log("-> Success:", updateRes);

    // 3. markSold
    console.log("\n[3] Calling markSold()...");
    const soldRes = await markSold(testSerial);
    console.log("-> Success:", soldRes);

    // 4. verifyProduct
    console.log("\n[4] Calling verifyProduct()...");
    const verifyRes = await verifyProduct(testSerial);
    console.log("-> Success:", JSON.stringify(verifyRes, null, 2));

    console.log("\n=================================================");
    console.log(" ALL 4 CHAIN.JS FUNCTIONS EXECUTED SUCCESSFULLY! ");
    console.log("=================================================");
  } catch (err) {
    console.error("\n[Error] Integration test failed:", err);
    process.exit(1);
  }
}

runTestChain();
