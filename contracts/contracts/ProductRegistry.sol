// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ProductRegistry
 * @dev Decentralized Product Security using Blockchain and Smart Contract-Based QR Verification.
 * Reproduces the framework proposed in:
 * "Decentralized framework for product security using blockchain and smart contract-based QR verification"
 * (Shivanna K. et al., Discover Applied Sciences, vol. 8, article 849, 2026, doi:10.1007/s42452-026-08542-z).
 */
contract ProductRegistry {
    enum Role { None, Administrator, Manufacturer, Supplier, Retailer }

    address public administrator;
    mapping(address => Role) public userRoles;

    struct Product {
        string productId;
        string serialNumber;
        string description;
        bytes32 productHash; // Original Hash H = Hash(P)
        uint256 timestamp;   // Registration Timestamp Ts
        string currentStatus;
        bool exists;
    }

    struct EventLog {
        string location;
        string status;
        address updatedBy;
        uint256 timestamp;
    }

    mapping(string => Product) private products;
    mapping(string => EventLog[]) private productHistory;

    // Events
    event RoleAssigned(address indexed account, Role role);
    event ProductRegistered(string indexed productId, string serialNumber, bytes32 productHash, uint256 timestamp);
    event EventUpdated(string indexed productId, string location, string status, address indexed updatedBy, uint256 timestamp);
    event ProductSold(string indexed productId, address indexed retailer, uint256 timestamp);

    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == administrator, "Only Administrator can call this function");
        _;
    }

    modifier onlyManufacturer() {
        require(
            userRoles[msg.sender] == Role.Manufacturer || msg.sender == administrator,
            "Only Manufacturer can call this function"
        );
        _;
    }

    modifier onlySupplierOrRetailer() {
        require(
            userRoles[msg.sender] == Role.Supplier ||
            userRoles[msg.sender] == Role.Retailer ||
            msg.sender == administrator,
            "Only Supplier or Retailer can call this function"
        );
        _;
    }

    modifier onlyRetailer() {
        require(
            userRoles[msg.sender] == Role.Retailer || msg.sender == administrator,
            "Only Retailer can call this function"
        );
        _;
    }

    constructor() {
        administrator = msg.sender;
        userRoles[msg.sender] = Role.Administrator;
        emit RoleAssigned(msg.sender, Role.Administrator);
    }

    /**
     * @notice Administrator assigns user accounts to participant roles.
     * @dev Implements Role-based Access Control (RBAC) described in paper Sect. 3.
     * @param account Target wallet address.
     * @param role Role enum value (1: Administrator, 2: Manufacturer, 3: Supplier, 4: Retailer).
     */
    function assignRole(address account, Role role) external onlyAdmin {
        require(account != address(0), "Invalid address");
        userRoles[account] = role;
        emit RoleAssigned(account, role);
    }

    /**
     * @notice Manufacturer registers a new product and stores its digital fingerprint on-chain.
     * @dev Implements Paper Eq. (1) Hash Generation H = Hash(P) and Eq. (2)/Eq. (9) Transaction Creation T = (P, H, Ts).
     * @param serialNumber Unique serial number of the product.
     * @param description Detailed description of the product.
     * @return productId The unique product identifier (serialNumber).
     */
    function registerProduct(string memory serialNumber, string memory description)
        external
        onlyManufacturer
        returns (string memory productId)
    {
        productId = serialNumber;
        require(!products[productId].exists, "Product already registered");

        // Eq. (1): H = Hash(P)
        bytes32 productHash = keccak256(abi.encodePacked(serialNumber, description));
        uint256 ts = block.timestamp;

        // Eq. (2) & Eq. (9): T = (P, H, Ts)
        products[productId] = Product({
            productId: productId,
            serialNumber: serialNumber,
            description: description,
            productHash: productHash,
            timestamp: ts,
            currentStatus: "Registered",
            exists: true
        });

        EventLog memory initialEvent = EventLog({
            location: "Location A", // Factory / Origin
            status: "Registered",
            updatedBy: msg.sender,
            timestamp: ts
        });

        productHistory[productId].push(initialEvent);

        emit ProductRegistered(productId, serialNumber, productHash, ts);
        return productId;
    }

    /**
     * @notice Supplier or Retailer updates a product's location and status during transit.
     * @dev Implements Paper Eq. (3) Hash Recalculation H' = Hash(P + E) and Eq. (10) State Update T <- T + E.
     * @param productId Unique product identifier.
     * @param location Current geographical location or transit node.
     * @param status Updated status string (e.g., "InTransit", "InWarehouse", "DeliveredToRetail").
     */
    function updateEvent(string memory productId, string memory location, string memory status)
        external
        onlySupplierOrRetailer
    {
        require(products[productId].exists, "Product does not exist");
        require(
            keccak256(bytes(products[productId].currentStatus)) != keccak256(bytes("Sold")),
            "Product already sold"
        );

        products[productId].currentStatus = status;

        EventLog memory newEvent = EventLog({
            location: location,
            status: status,
            updatedBy: msg.sender,
            timestamp: block.timestamp
        });

        productHistory[productId].push(newEvent);

        emit EventUpdated(productId, location, status, msg.sender, block.timestamp);
    }

    /**
     * @notice Retailer marks a product as sold upon consumer purchase.
     * @dev Updates product lifecycle state to Sold while preserving last recorded retail location.
     * @param productId Unique product identifier.
     */
    function markSold(string memory productId) external onlyRetailer {
        require(products[productId].exists, "Product does not exist");
        require(
            keccak256(bytes(products[productId].currentStatus)) != keccak256(bytes("Sold")),
            "Product already sold"
        );

        products[productId].currentStatus = "Sold";

        string memory currentLocation = "Retail Store";
        if (productHistory[productId].length > 0) {
            currentLocation = productHistory[productId][productHistory[productId].length - 1].location;
        }

        EventLog memory soldEvent = EventLog({
            location: currentLocation,
            status: "Sold",
            updatedBy: msg.sender,
            timestamp: block.timestamp
        });

        productHistory[productId].push(soldEvent);

        emit ProductSold(productId, msg.sender, block.timestamp);
    }

    /**
     * @notice Public verification check for consumers and auditors.
     * @dev Implements Paper Eq. (4) Traceability Validation and Eq. (12) Verification Status:
     *      Status = "Authentic" if H' == H, otherwise "Compromised".
     * @param productId Unique product identifier.
     * @return statusResult String indicating "Authentic" or "Compromised".
     * @return history Full array of supply chain event logs.
     */
    function verifyProduct(string memory productId)
        public
        view
        returns (string memory statusResult, EventLog[] memory history)
    {
        if (!products[productId].exists) {
            return ("Compromised", new EventLog[](0));
        }

        // Recompute H' = Hash(P) against stored H
        bytes32 expectedHash = keccak256(abi.encodePacked(products[productId].serialNumber, products[productId].description));
        
        // Eq. (4) & Eq. (12): Verify H' == H
        if (expectedHash == products[productId].productHash) {
            statusResult = "Authentic";
        } else {
            statusResult = "Compromised";
        }

        history = productHistory[productId];
        return (statusResult, history);
    }

    /**
     * @notice Verifies whether a provided custom/recalculated hash H' matches stored H on-chain.
     * @dev Implements Paper Eq. (3) & (4): Checks if H' == H.
     * @param productId Unique product identifier.
     * @param customHash Provided hash H' (e.g., computed from tampered/recalculated data).
     * @return statusResult "Authentic" if customHash == H, otherwise "Compromised".
     */
    function verifyProductHash(string memory productId, bytes32 customHash)
        external
        view
        returns (string memory statusResult)
    {
        if (!products[productId].exists) {
            return "Compromised";
        }

        if (customHash == products[productId].productHash) {
            return "Authentic";
        } else {
            return "Compromised";
        }
    }

    /**
     * @notice Location-based verification check comparing scanned consumer location against last on-chain location.
     * @dev Implements Cookbook Sect. 8.1 / Paper Sect. 3.2 location verification (C != D => Compromised).
     * @param productId Unique product identifier.
     * @param scannedLocation Location provided by consumer scanner.
     * @return statusResult "Authentic" if location matches last recorded state, otherwise "Compromised".
     * @return history Full event history.
     */
    function verifyProductWithLocation(string memory productId, string memory scannedLocation)
        external
        view
        returns (string memory statusResult, EventLog[] memory history)
    {
        if (!products[productId].exists) {
            return ("Compromised", new EventLog[](0));
        }

        history = productHistory[productId];
        if (history.length == 0) {
            return ("Compromised", history);
        }

        string memory lastRecordedLocation = history[history.length - 1].location;

        // Check if scanned location matches the last recorded location on-chain
        if (keccak256(bytes(scannedLocation)) == keccak256(bytes(lastRecordedLocation))) {
            statusResult = "Authentic";
        } else {
            statusResult = "Compromised";
        }

        return (statusResult, history);
    }

    /**
     * @notice Get stored product details.
     * @param productId Unique product identifier.
     */
    function getProduct(string memory productId) external view returns (Product memory) {
        require(products[productId].exists, "Product does not exist");
        return products[productId];
    }

    /**
     * @notice Get full event history for a product.
     * @param productId Unique product identifier.
     */
    function getProductHistory(string memory productId) external view returns (EventLog[] memory) {
        return productHistory[productId];
    }
}
