// Contract addresses
export const ESCROW_CONTRACT = "0x44c796914f987c71414971D5A5E32be749664F44";
export const IDRX_CONTRACT = "0xD63029C1a3dA68b51c67c6D1DeC3DEe50D681661";

// Mock seller address (for demo purposes)
export const SELLER_ADDRESS = "0x8A113B3f499E30902781f201e27Fdfd22b3aF7C4";

// IDRX Token ABI for approval
export const IDRX_ABI = [
  {
    name: "approve",
    type: "function",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable"
  }
] as const;