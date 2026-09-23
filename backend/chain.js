const { ethers } = require('ethers');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const RPC_URL = process.env.SEPOLIA_RPC_URL || 'http://127.0.0.1:8545';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
  console.warn('[Warning] CONTRACT_ADDRESS is not set in backend/.env!');
}

let PRODUCT_REGISTRY_ABI;
const artifactPath = path.join(__dirname, '../contracts/artifacts/contracts/ProductRegistry.sol/ProductRegistry.json');
if (fs.existsSync(artifactPath)) {
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  PRODUCT_REGISTRY_ABI = artifact.abi;
} else {
  PRODUCT_REGISTRY_ABI = [
    "function registerProduct(string memory serialNumber, string memory description) external returns (string memory)",
    "function updateEvent(string memory productId, string memory location, string memory status) external",
    "function markSold(string memory productId) external",
    "function verifyProduct(string memory productId) external view returns (string memory statusResult, tuple(string location, string status, address updatedBy, uint256 timestamp)[] history)",
    "function verifyProductWithLocation(string memory productId, string memory scannedLocation) external view returns (string memory statusResult, tuple(string location, string status, address updatedBy, uint256 timestamp)[] history)",
    "function getProduct(string memory productId) external view returns (tuple(string productId, string serialNumber, string description, bytes32 productHash, uint256 timestamp, string currentStatus, bool exists))",
    "function getProductHistory(string memory productId) external view returns (tuple(string location, string status, address updatedBy, uint256 timestamp)[])"
  ];
}

const DEFAULT_KEYS = {
  admin: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  manufacturer: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  supplier: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  retailer: "0x7c852118294e37d0a65349923ed240d046c82098d6728a4789df6891eb70425c"
};

const provider = new ethers.JsonRpcProvider(RPC_URL);

function getContractInstance(privateKey) {
  const signerKey = privateKey || process.env.PRIVATE_KEY || DEFAULT_KEYS.admin;
  const wallet = new ethers.Wallet(signerKey, provider);
  return { contract: new ethers.Contract(CONTRACT_ADDRESS, PRODUCT_REGISTRY_ABI, wallet), wallet };
}

async function registerProduct(serialNumber, description, signerPrivateKey = DEFAULT_KEYS.manufacturer) {
  const { contract, wallet } = getContractInstance(signerPrivateKey);
  const nonce = await provider.getTransactionCount(wallet.address, 'pending');
  const tx = await contract.registerProduct(serialNumber, description, { nonce });
  const receipt = await tx.wait();
  return {
    success: true,
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    productId: serialNumber
  };
}

async function updateEvent(productId, location, status, signerPrivateKey = DEFAULT_KEYS.supplier) {
  const { contract, wallet } = getContractInstance(signerPrivateKey);
  const nonce = await provider.getTransactionCount(wallet.address, 'pending');
  const tx = await contract.updateEvent(productId, location, status, { nonce });
  const receipt = await tx.wait();
  return {
    success: true,
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    productId,
    location,
    status
  };
}

async function markSold(productId, signerPrivateKey = DEFAULT_KEYS.retailer) {
  const { contract, wallet } = getContractInstance(signerPrivateKey);
  const nonce = await provider.getTransactionCount(wallet.address, 'pending');
  const tx = await contract.markSold(productId, { nonce });
  const receipt = await tx.wait();
  return {
    success: true,
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    productId,
    status: 'Sold'
  };
}

async function verifyProduct(productId) {
  const contract = new ethers.Contract(CONTRACT_ADDRESS, PRODUCT_REGISTRY_ABI, provider);
  const [statusResult, rawHistory] = await contract.verifyProduct(productId);

  const history = rawHistory.map(item => ({
    location: item.location,
    status: item.status,
    updatedBy: item.updatedBy,
    timestamp: Number(item.timestamp)
  }));

  return {
    productId,
    statusResult,
    isAuthentic: statusResult === 'Authentic',
    history
  };
}

async function verifyProductWithLocation(productId, scannedLocation) {
  const contract = new ethers.Contract(CONTRACT_ADDRESS, PRODUCT_REGISTRY_ABI, provider);
  const [statusResult, rawHistory] = await contract.verifyProductWithLocation(productId, scannedLocation);

  const history = rawHistory.map(item => ({
    location: item.location,
    status: item.status,
    updatedBy: item.updatedBy,
    timestamp: Number(item.timestamp)
  }));

  return {
    productId,
    scannedLocation,
    statusResult,
    isAuthentic: statusResult === 'Authentic',
    history
  };
}

module.exports = {
  provider,
  CONTRACT_ADDRESS,
  PRODUCT_REGISTRY_ABI,
  DEFAULT_KEYS,
  registerProduct,
  updateEvent,
  markSold,
  verifyProduct,
  verifyProductWithLocation
};
