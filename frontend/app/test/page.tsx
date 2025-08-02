"use client";

import { useEffect, useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { LiskEscrowSimpleAbi } from "@/app/test/LiskEscrowSimpleAbi";

// Constants
const ESCROW_CONTRACT = "0x44c796914f987c71414971D5A5E32be749664F44";
const IDRX_CONTRACT = "0xD63029C1a3dA68b51c67c6D1DeC3DEe50D681661";
const SELLER_ADDRESS = "0x8A113B3f499E30902781f201e27Fdfd22b3aF7C4";

// Simple IDRX ABI for approval
const IDRX_ABI = [
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

interface Escrow {
  id: string;
  buyer: string;
  seller: string;
  amount: string;
  status: string;
  createdAt: number;
  updatedAt: number;
  fundedAt: number | null;
}

export default function TestPage() {
  const { address } = useAccount();
  const [allEscrows, setAllEscrows] = useState<Escrow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentEscrowId, setCurrentEscrowId] = useState<string>("");

  // Contract write hooks
  const { writeContract: createEscrow, data: createHash } = useWriteContract();
  const { writeContract: approveToken, data: approveHash } = useWriteContract();
  const { writeContract: fundEscrow, data: fundHash } = useWriteContract();
  const { writeContract: releasePayment, data: releaseHash } = useWriteContract();

  // Wait for transaction receipts
  const { isSuccess: createSuccess } = useWaitForTransactionReceipt({ hash: createHash });
  const { isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isSuccess: fundSuccess } = useWaitForTransactionReceipt({ hash: fundHash });
  const { isSuccess: releaseSuccess } = useWaitForTransactionReceipt({ hash: releaseHash });

  // Fetch all escrows from Ponder
  const fetchAllEscrows = async () => {
    try {
      const response = await fetch("http://localhost:42069/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `
            query GetAllEscrows {
              escrows {
                items {
                  id
                  buyer
                  seller
                  amount
                  status
                  createdAt
                  updatedAt
                  fundedAt
                }
              }
            }
          `,
        }),
      });

      const data = await response.json();
      setAllEscrows(data.data?.escrows?.items || []);
    } catch (error) {
      console.error("Failed to fetch escrows:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllEscrows();
    const interval = setInterval(fetchAllEscrows, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, []);

  // Test functions
  const handleCreateContract = () => {
    const deliveryDeadline = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days from now
    
    createEscrow({
      address: ESCROW_CONTRACT,
      abi: LiskEscrowSimpleAbi,
      functionName: "createEscrow",
      args: [
        SELLER_ADDRESS,
        parseUnits("1", 2), // 1 IDRX (2 decimals)
        IDRX_CONTRACT,
        BigInt(deliveryDeadline)
      ],
    });
  };

  const handleApproveAllowance = () => {
    approveToken({
      address: IDRX_CONTRACT,
      abi: IDRX_ABI,
      functionName: "approve",
      args: [ESCROW_CONTRACT, parseUnits("1", 2)], // 1 IDRX
    });
  };

  const handleFundEscrow = () => {
    if (!currentEscrowId) {
      alert("Please enter an escrow ID");
      return;
    }
    
    fundEscrow({
      address: ESCROW_CONTRACT,
      abi: LiskEscrowSimpleAbi,
      functionName: "fundEscrow",
      args: [currentEscrowId as `0x${string}`],
    });
  };

  const handleReleasePayment = () => {
    if (!currentEscrowId) {
      alert("Please enter an escrow ID");
      return;
    }

    releasePayment({
      address: ESCROW_CONTRACT,
      abi: LiskEscrowSimpleAbi,
      functionName: "confirmDelivery",
      args: [currentEscrowId as `0x${string}`],
    });
  };

  const handleDocumentUpload = async () => {
    alert("Document upload to Supabase not implemented in test page. Use the main app flow.");
  };

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">Escrow Test Page</h1>
      
      {/* Test Functions Section */}
      <div className="bg-gray-100 p-6 rounded-lg mb-8">
        <h2 className="text-xl font-semibold mb-4">Test Functions</h2>
        
        <div className="space-y-4">
          {/* Create Contract */}
          <div>
            <button
              onClick={handleCreateContract}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              1. Create Contract (Seller: {SELLER_ADDRESS.slice(0,6)}..., 1 IDRX, 7 days)
            </button>
            {createSuccess && <span className="ml-2 text-green-600">✓ Created!</span>}
          </div>

          {/* Approve Allowance */}
          <div>
            <button
              onClick={handleApproveAllowance}
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
            >
              2. Approve IDRX Allowance (1 IDRX)
            </button>
            {approveSuccess && <span className="ml-2 text-green-600">✓ Approved!</span>}
          </div>

          {/* Fund Escrow */}
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Enter Escrow ID (0x...)"
              value={currentEscrowId}
              onChange={(e) => setCurrentEscrowId(e.target.value)}
              className="border px-3 py-2 rounded flex-1"
            />
            <button
              onClick={handleFundEscrow}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              3. Fund Escrow
            </button>
            {fundSuccess && <span className="ml-2 text-green-600">✓ Funded!</span>}
          </div>

          {/* Upload Documents */}
          <div>
            <button
              onClick={handleDocumentUpload}
              className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
            >
              4. Upload Documents (Seller - Use main app)
            </button>
          </div>

          {/* Release Payment */}
          <div>
            <button
              onClick={handleReleasePayment}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              5. Release Payment (Buyer)
            </button>
            {releaseSuccess && <span className="ml-2 text-green-600">✓ Released!</span>}
          </div>
        </div>
      </div>

      {/* All Escrows from Ponder */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">All Escrows from Ponder ({allEscrows.length} total)</h2>
        
        {loading ? (
          <p>Loading escrows...</p>
        ) : allEscrows.length === 0 ? (
          <p>No escrows found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buyer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seller</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allEscrows.map((escrow) => (
                  <tr key={escrow.id} className={escrow.buyer === address?.toLowerCase() || escrow.seller === address?.toLowerCase() ? "bg-blue-50" : ""}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{escrow.id.slice(0, 10)}...</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{escrow.buyer.slice(0, 6)}...{escrow.buyer.slice(-4)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{escrow.seller.slice(0, 6)}...{escrow.seller.slice(-4)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{(Number(escrow.amount) / 100).toFixed(2)} IDRX</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        escrow.status === "SETTLED" ? "bg-green-100 text-green-800" :
                        escrow.status === "FUNDED" ? "bg-blue-100 text-blue-800" :
                        escrow.status === "DOCUMENTS_PENDING" ? "bg-yellow-100 text-yellow-800" :
                        escrow.status === "DISPUTED" ? "bg-red-100 text-red-800" :
                        escrow.status === "CANCELLED" ? "bg-gray-100 text-gray-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {escrow.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(escrow.createdAt * 1000).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Connected Wallet Info */}
      <div className="mt-8 text-sm text-gray-600">
        <p>Connected as: {address || "Not connected"}</p>
        <p>Ponder endpoint: http://localhost:42069/graphql</p>
        <p>Auto-refresh: Every 3 seconds</p>
      </div>
    </div>
  );
}