const express = require('express');
const router = express.Router();
const chain = require('../chain');
const db = require('../db');

// Helper for DB queries with graceful fallback if PostgreSQL service is offline
async function safeDbQuery(queryText, params = []) {
  try {
    return await db.query(queryText, params);
  } catch (err) {
    console.warn('[DB Warning] PostgreSQL query skipped/failed:', err.message);
    return null;
  }
}

// POST /products/register - Manufacturer registers a product
router.post('/register', async (req, res) => {
  try {
    const { productId, serialNumber, name, manufacturer, description, userRole, privateKey } = req.body;
    const targetSerial = serialNumber || productId;

    if (!targetSerial) {
      return res.status(400).json({ error: 'serialNumber or productId is required' });
    }

    if (userRole && userRole !== 'Manufacturer' && userRole !== 'Administrator') {
      return res.status(403).json({ error: 'Only Manufacturer can call this function' });
    }

    const signerKey = privateKey || chain.DEFAULT_KEYS.manufacturer;
    const chainRes = await chain.registerProduct(targetSerial, description || name || "Product", signerKey);
    const productHash = chainRes.transactionHash;

    await safeDbQuery(
      `INSERT INTO products (product_id, name, manufacturer, serial_number, description, product_hash, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (product_id) DO UPDATE SET status = EXCLUDED.status`,
      [targetSerial, name || 'Product', manufacturer || 'Rolex', targetSerial, description || '', productHash, 'Registered']
    );

    res.json({
      message: 'Product registered successfully',
      productId: targetSerial,
      status: 'Registered',
      transactionHash: chainRes.transactionHash,
      blockNumber: chainRes.blockNumber
    });
  } catch (err) {
    console.error('[API Error] /products/register:', err.message);
    const statusCode = err.message.includes('Only Manufacturer') ? 403 : 500;
    res.status(statusCode).json({ error: err.message });
  }
});

// POST /products/update - Supplier or Retailer updates transit event
router.post('/update', async (req, res) => {
  try {
    const { productId, location, status, userRole, privateKey } = req.body;

    if (!productId || !location || !status) {
      return res.status(400).json({ error: 'productId, location, and status are required' });
    }

    if (userRole && userRole !== 'Supplier' && userRole !== 'Retailer' && userRole !== 'Administrator') {
      return res.status(403).json({ error: 'Only Supplier or Retailer can call this function' });
    }

    const signerKey = privateKey || (userRole === 'Retailer' ? chain.DEFAULT_KEYS.retailer : chain.DEFAULT_KEYS.supplier);
    const chainRes = await chain.updateEvent(productId, location, status, signerKey);

    await safeDbQuery(
      `UPDATE products SET status = $1 WHERE product_id = $2`,
      [status, productId]
    );

    res.json({
      message: 'Product event updated successfully',
      productId,
      location,
      status,
      transactionHash: chainRes.transactionHash,
      blockNumber: chainRes.blockNumber
    });
  } catch (err) {
    console.error('[API Error] /products/update:', err.message);
    const statusCode = err.message.includes('Only Supplier') ? 403 : 500;
    res.status(statusCode).json({ error: err.message });
  }
});

// POST /products/sell - Retailer marks product as sold
router.post('/sell', async (req, res) => {
  try {
    const { productId, userRole, privateKey } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'productId is required' });
    }

    if (userRole && userRole !== 'Retailer' && userRole !== 'Administrator') {
      return res.status(403).json({ error: 'Only Retailer can call this function' });
    }

    const signerKey = privateKey || chain.DEFAULT_KEYS.retailer;
    const chainRes = await chain.markSold(productId, signerKey);

    await safeDbQuery(
      `UPDATE products SET status = $1 WHERE product_id = $2`,
      ['Sold', productId]
    );

    res.json({
      message: 'Product marked as sold',
      productId,
      status: 'Sold',
      transactionHash: chainRes.transactionHash,
      blockNumber: chainRes.blockNumber
    });
  } catch (err) {
    console.error('[API Error] /products/sell:', err.message);
    const statusCode = err.message.includes('Only Retailer') ? 403 : 500;
    res.status(statusCode).json({ error: err.message });
  }
});

// GET /products/verify/:id - Consumer check: decodes QR, compares H' vs H and location matching
router.get('/verify/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const scannedLocation = req.query.scannedLocation || req.query.location;

    let verifyRes;
    if (scannedLocation) {
      verifyRes = await chain.verifyProductWithLocation(id, scannedLocation);
    } else {
      verifyRes = await chain.verifyProduct(id);
    }

    const dbRes = await safeDbQuery('SELECT * FROM products WHERE product_id = $1', [id]);
    const metadata = dbRes && dbRes.rows.length > 0 ? dbRes.rows[0] : null;

    res.json({
      productId: id,
      verified: verifyRes.isAuthentic,
      status: verifyRes.statusResult, // "Authentic" or "Compromised"
      scannedLocation: scannedLocation || null,
      metadata,
      history: verifyRes.history
    });
  } catch (err) {
    console.error('[API Error] /products/verify:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /products/:id/history - Returns full on-chain and off-chain event history
router.get('/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const verifyRes = await chain.verifyProduct(id);

    const dbRes = await safeDbQuery('SELECT * FROM products WHERE product_id = $1', [id]);
    const metadata = dbRes && dbRes.rows.length > 0 ? dbRes.rows[0] : null;

    res.json({
      productId: id,
      metadata,
      history: verifyRes.history
    });
  } catch (err) {
    console.error('[API Error] /products/:id/history:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
