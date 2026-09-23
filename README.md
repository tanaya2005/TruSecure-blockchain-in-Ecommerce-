# TruSecure: Decentralized Product Security using Blockchain & Smart Contract-Based QR Verification

TruSecure is a blockchain-based product authentication system designed to combat counterfeit goods by combining an Ethereum smart contract ledger, cryptographic hashing (SHA-256), and dynamic QR code verification. Every product is registered on-chain with a unique hash of its details. As the product transitions through the supply chain, each stage appends an event and recalculates the hash against the original ledger state, enabling instant detection of tampering or counterfeit goods.

---

## Participant Roles (System Architecture - Sect. 3)

The system defines 5 primary participant roles across the supply chain lifecycle:

1. **Administrator**
   - **Responsibility:** User management and access control.
   - **Description:** Manages participant accounts and role authorizations, ensuring only verified entity accounts (manufacturers, suppliers, retailers) can perform state-changing supply chain actions.

2. **Manufacturer**
   - **Responsibility:** Product onboarding & initial QR generation.
   - **Description:** Connects a MetaMask wallet to register new products with serial numbers, names, and descriptions. Computes the initial cryptographic hash $H = \text{SHA-256}(P)$, submits the transaction on-chain, and receives a downloadable QR code encoding product details.

3. **Supplier**
   - **Responsibility:** In-transit tracking & event logging.
   - **Description:** Scans product QR codes to append supply chain movement events (location, timestamp, carrier info). Pays required transaction gas fees to commit updated states $T_i = (P, H, T_s)$ to the blockchain.

4. **Retailer**
   - **Responsibility:** Retail receiving & final sale recording.
   - **Description:** Scans QR codes to log arrival at retail outlets and update inventory availability. Provides the functionality to execute final sale transactions on-chain (`markSold`), changing product status to sold.

5. **Consumer**
   - **Responsibility:** Verification & Anti-Counterfeit audit.
   - **Description:** Scans product QR codes using any device/camera without requiring a crypto wallet. Recomputes $H' = \text{Hash}(P_{QR} + E)$ and verifies against the immutable on-chain state $H$. Displays authentic provenance history if $H' = H$, or triggers an immediate counterfeit alert on mismatch.

---

## Repository Structure

- `contracts/`: Hardhat environment containing Solidity smart contracts (`ProductRegistry.sol`), tests, and deployment scripts.
- `backend/`: Express.js REST API bridging PostgreSQL off-chain metadata with blockchain query routines (`ethers.js`).
- `frontend/`: React single-page UI containing role-based dashboards (`Login`, `Manufacturer`, `Supplier`, `Retailer`, `Consumer`).
- `benchmark/`: Automated performance measurement harness evaluating execution latency, accuracy, and gas utilization.

---

## Quick Start

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Smart Contract Compilation
```bash
cd contracts
npx hardhat compile
```

### 3. Run Backend API & Frontend UI
```bash
npm run dev
```
- Backend API runs on `http://localhost:5000`
- Frontend UI runs on `http://localhost:3000`
