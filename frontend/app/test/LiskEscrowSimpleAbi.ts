export const LiskEscrowSimpleAbi = [
  {
    "type": "function",
    "name": "createEscrow",
    "inputs": [
      { "name": "_seller", "type": "address", "internalType": "address" },
      { "name": "_amount", "type": "uint256", "internalType": "uint256" },
      { "name": "_token", "type": "address", "internalType": "address" },
      { "name": "_deliveryDeadline", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [
      { "name": "escrowId", "type": "bytes32", "internalType": "bytes32" }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "fundEscrow",
    "inputs": [
      { "name": "_escrowId", "type": "bytes32", "internalType": "bytes32" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "storeDocumentHash",
    "inputs": [
      { "name": "_escrowId", "type": "bytes32", "internalType": "bytes32" },
      { "name": "_documentHash", "type": "bytes32", "internalType": "bytes32" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "confirmDelivery",
    "inputs": [
      { "name": "_escrowId", "type": "bytes32", "internalType": "bytes32" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "initiateDispute",
    "inputs": [
      { "name": "_escrowId", "type": "bytes32", "internalType": "bytes32" },
      { "name": "_reason", "type": "string", "internalType": "string" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "cancelEscrow",
    "inputs": [
      { "name": "_escrowId", "type": "bytes32", "internalType": "bytes32" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "EscrowCreated",
    "inputs": [
      { "name": "escrowId", "type": "bytes32", "indexed": true, "internalType": "bytes32" },
      { "name": "buyer", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "seller", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "amount", "type": "uint256", "indexed": false, "internalType": "uint256" },
      { "name": "deliveryDeadline", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EscrowFunded",
    "inputs": [
      { "name": "escrowId", "type": "bytes32", "indexed": true, "internalType": "bytes32" },
      { "name": "timestamp", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "DocumentsUploaded",
    "inputs": [
      { "name": "escrowId", "type": "bytes32", "indexed": true, "internalType": "bytes32" },
      { "name": "documentHash", "type": "bytes32", "indexed": false, "internalType": "bytes32" },
      { "name": "timestamp", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "DeliveryConfirmed",
    "inputs": [
      { "name": "escrowId", "type": "bytes32", "indexed": true, "internalType": "bytes32" },
      { "name": "timestamp", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PaymentReleased",
    "inputs": [
      { "name": "escrowId", "type": "bytes32", "indexed": true, "internalType": "bytes32" },
      { "name": "recipient", "type": "address", "indexed": false, "internalType": "address" },
      { "name": "amount", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EscrowCancelled",
    "inputs": [
      { "name": "escrowId", "type": "bytes32", "indexed": true, "internalType": "bytes32" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "DisputeInitiated",
    "inputs": [
      { "name": "escrowId", "type": "bytes32", "indexed": true, "internalType": "bytes32" },
      { "name": "initiator", "type": "address", "indexed": false, "internalType": "address" },
      { "name": "reason", "type": "string", "indexed": false, "internalType": "string" }
    ],
    "anonymous": false
  }
] as const;