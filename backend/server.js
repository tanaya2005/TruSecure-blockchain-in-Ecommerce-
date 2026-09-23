const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/products', productRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'TruSecure Backend API' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`TruSecure Backend running on port ${PORT}`);
  });
}

module.exports = app;
