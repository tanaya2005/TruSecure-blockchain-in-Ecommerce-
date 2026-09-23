const http = require('http');
const app = require('./server');

let server;
const PORT = 5055; // Test server port
const BASE_URL = `http://127.0.0.1:${PORT}`;

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, text: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runApiTests() {
  console.log("=================================================");
  console.log(" TruSecure REST API Automated Integration Tests ");
  console.log("=================================================");

  server = app.listen(PORT);
  const testSerial = `SN-API-TEST-${Date.now()}`;

  try {
    // 1. POST /auth/login
    console.log("\n[Test 1] POST /auth/login (Manufacturer)");
    const loginRes = await makeRequest('POST', '/auth/login', {
      username: 'rolex_mfg',
      password: 'mfg123',
      role: 'Manufacturer'
    });
    console.log(`-> Status ${loginRes.status}:`, loginRes.data.user);
    if (loginRes.status !== 200 || !loginRes.data.token) throw new Error("Login failed");

    // 2. POST /products/register (Failure: Wrong Role)
    console.log("\n[Test 2] POST /products/register (Failure: Consumer role attempts register)");
    const failRegRes = await makeRequest('POST', '/products/register', {
      productId: testSerial,
      description: "Unauthorized Item",
      userRole: "Consumer"
    });
    console.log(`-> Status ${failRegRes.status} (Expected 403):`, failRegRes.data);
    if (failRegRes.status !== 403) throw new Error("Expected 403 for unauthorized registration");

    // 3. POST /products/register (Success)
    console.log("\n[Test 3] POST /products/register (Success: Manufacturer role)");
    const regRes = await makeRequest('POST', '/products/register', {
      productId: testSerial,
      name: "Luxury Chronograph",
      manufacturer: "Rolex",
      description: "2026 Edition Gold Watch",
      userRole: "Manufacturer"
    });
    console.log(`-> Status ${regRes.status}:`, regRes.data);
    if (regRes.status !== 200 || regRes.data.status !== 'Registered') throw new Error("Registration failed");

    // 4. POST /products/update (Success: Supplier role)
    console.log("\n[Test 4] POST /products/update (Success: Supplier role)");
    const updateRes = await makeRequest('POST', '/products/update', {
      productId: testSerial,
      location: "Location B (Transit Hub)",
      status: "InTransit",
      userRole: "Supplier"
    });
    console.log(`-> Status ${updateRes.status}:`, updateRes.data);
    if (updateRes.status !== 200 || updateRes.data.status !== 'InTransit') throw new Error("Update failed");

    // 5. POST /products/sell (Failure: Supplier attempts sell)
    console.log("\n[Test 5] POST /products/sell (Failure: Supplier role attempts sell)");
    const failSellRes = await makeRequest('POST', '/products/sell', {
      productId: testSerial,
      userRole: "Supplier"
    });
    console.log(`-> Status ${failSellRes.status} (Expected 403):`, failSellRes.data);
    if (failSellRes.status !== 403) throw new Error("Expected 403 for non-retailer sell attempt");

    // 6. POST /products/sell (Success: Retailer role)
    console.log("\n[Test 6] POST /products/sell (Success: Retailer role)");
    const sellRes = await makeRequest('POST', '/products/sell', {
      productId: testSerial,
      userRole: "Retailer"
    });
    console.log(`-> Status ${sellRes.status}:`, sellRes.data);
    if (sellRes.status !== 200 || sellRes.data.status !== 'Sold') throw new Error("Sell failed");

    // 7. GET /products/verify/:id (Success: Authentic check)
    console.log(`\n[Test 7] GET /products/verify/${testSerial} (Authentic product check)`);
    const verifyRes = await makeRequest('GET', `/products/verify/${testSerial}`);
    console.log(`-> Status ${verifyRes.status}:`, verifyRes.data);
    if (verifyRes.status !== 200 || verifyRes.data.status !== 'Authentic') throw new Error("Verification failed");

    // 8. GET /products/verify/:id (Failure: Non-existent product)
    console.log("\n[Test 8] GET /products/verify/SN-NON-EXISTENT (Compromised check)");
    const failVerifyRes = await makeRequest('GET', '/products/verify/SN-NON-EXISTENT');
    console.log(`-> Status ${failVerifyRes.status}:`, failVerifyRes.data);
    if (failVerifyRes.status !== 200 || failVerifyRes.data.status !== 'Compromised') throw new Error("Expected Compromised status");

    // 9. GET /products/:id/history
    console.log(`\n[Test 9] GET /products/${testSerial}/history (Event history check)`);
    const historyRes = await makeRequest('GET', `/products/${testSerial}/history`);
    console.log(`-> Status ${historyRes.status}: History items count: ${historyRes.data.history.length}`);
    if (historyRes.status !== 200 || historyRes.data.history.length !== 3) throw new Error("History check failed");

    console.log("\n=================================================");
    console.log(" ALL REST API ENDPOINTS PASSED SUCCESSFULLY!    ");
    console.log("=================================================");
  } catch (err) {
    console.error("\n[Error] API Integration test failed:", err.message);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
  }
}

runApiTests();
