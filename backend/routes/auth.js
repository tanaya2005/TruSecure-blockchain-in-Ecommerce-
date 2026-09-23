const express = require('express');
const jwt = require('jsonwebtoken');
const { DEFAULT_KEYS } = require('../chain');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'trusecure_super_secret_key_2026';

// Pre-seeded user accounts map matching seed/users.csv & local Hardhat roles
const USERS_DB = {
  admin: { username: 'admin', password: 'admin123', role: 'Administrator', privateKey: DEFAULT_KEYS.admin },
  rolex_mfg: { username: 'rolex_mfg', password: 'mfg123', role: 'Manufacturer', privateKey: DEFAULT_KEYS.manufacturer },
  logistic_sup: { username: 'logistic_sup', password: 'sup123', role: 'Supplier', privateKey: DEFAULT_KEYS.supplier },
  retail_store: { username: 'retail_store', password: 'ret123', role: 'Retailer', privateKey: DEFAULT_KEYS.retailer },
  consumer_guest: { username: 'consumer_guest', password: 'guest123', role: 'Consumer', privateKey: null }
};

// POST /auth/login - Role-based authentication
router.post('/login', async (req, res) => {
  const { username, password, role } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const existingUser = USERS_DB[username];
  if (existingUser && existingUser.password === password) {
    const token = jwt.sign(
      { username: existingUser.username, role: existingUser.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      message: 'Login successful',
      token,
      user: {
        username: existingUser.username,
        role: existingUser.role,
        privateKey: existingUser.privateKey
      }
    });
  }

  // Dynamic role assignment fallback for custom logins
  const assignedRole = role || 'Consumer';
  let privateKey = null;
  if (assignedRole === 'Manufacturer') privateKey = DEFAULT_KEYS.manufacturer;
  else if (assignedRole === 'Supplier') privateKey = DEFAULT_KEYS.supplier;
  else if (assignedRole === 'Retailer') privateKey = DEFAULT_KEYS.retailer;
  else if (assignedRole === 'Administrator') privateKey = DEFAULT_KEYS.admin;

  const token = jwt.sign(
    { username, role: assignedRole },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    message: 'Login successful',
    token,
    user: {
      username,
      role: assignedRole,
      privateKey
    }
  });
});

module.exports = router;
