export const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

export const PRODUCT_REGISTRY_ABI = [
  "function registerProduct(string memory serialNumber, string memory description) external returns (string memory)",
  "function updateEvent(string memory productId, string memory location, string memory status) external",
  "function markSold(string memory productId) external",
  "function verifyProduct(string memory productId) external view returns (string memory statusResult, tuple(string location, string status, address updatedBy, uint256 timestamp)[] history)",
  "function verifyProductWithLocation(string memory productId, string memory scannedLocation) external view returns (string memory statusResult, tuple(string location, string status, address updatedBy, uint256 timestamp)[] history)",
  "function getProduct(string memory productId) external view returns (tuple(string productId, string serialNumber, string description, bytes32 productHash, uint256 timestamp, string currentStatus, bool exists))",
  "function getProductHistory(string memory productId) external view returns (tuple(string location, string status, address updatedBy, uint256 timestamp)[])"
];
