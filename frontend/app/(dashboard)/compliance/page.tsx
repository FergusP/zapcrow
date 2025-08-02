"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Upload, 
  FileText, 
  Shield, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Package,
  Truck,
  Loader2
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { keccak256, toBytes } from "viem";
import { graphqlClient, handleGraphQLError } from "@/lib/graphql/client";
import { GET_SELLER_ESCROWS, GET_ALL_ESCROWS, GET_BUYER_ESCROWS } from "@/lib/graphql/queries";
import type { EscrowsResponse } from "@/lib/graphql/client";

// Contract addresses
const ESCROW_CONTRACT = "0x44c796914f987c71414971D5A5E32be749664F44";

// Minimal ABI for storeDocumentHash
const ESCROW_ABI = [
  {
    name: "storeDocumentHash",
    type: "function",
    inputs: [
      { name: "_escrowId", type: "bytes32" },
      { name: "_documentHash", type: "bytes32" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  }
] as const;

import type { Escrow } from "@/lib/graphql/client";

export default function CompliancePage() {
  const { address } = useAccount();
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [buyerEscrows, setBuyerEscrows] = useState<Escrow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File | null>>({});
  const [uploadingContract, setUploadingContract] = useState<string | null>(null);
  
  // Contract write hooks
  const { writeContract, data: uploadHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: uploadHash });

  // Fetch seller's contracts from Ponder using graphql-request
  const fetchSellerContracts = async () => {
    if (!address) return;
    
    try {
      console.log("Fetching escrows for seller:", address.toLowerCase());
      const data = await graphqlClient.request<EscrowsResponse>(
        GET_SELLER_ESCROWS,
        { seller: address.toLowerCase() }
      );
      console.log("GraphQL response:", data);
      setEscrows(data.escrows.items);
      
      // Also fetch buyer contracts for informational purposes
      const buyerData = await graphqlClient.request<EscrowsResponse>(
        GET_BUYER_ESCROWS,
        { buyer: address.toLowerCase() }
      );
      setBuyerEscrows(buyerData.escrows.items);
    } catch (error) {
      console.error("Failed to fetch escrows:", handleGraphQLError(error));
      toast.error("Failed to fetch contracts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSellerContracts();
    const interval = setInterval(fetchSellerContracts, 5000);
    return () => clearInterval(interval);
  }, [address]);

  // Effect to handle successful uploads
  useEffect(() => {
    if (isConfirmed) {
      toast.success("Document hash stored on blockchain!");
      setUploadingContract(null);
      setUploadedFiles({});
      fetchSellerContracts();
    }
  }, [isConfirmed]);

  const formatIDRX = (amount: string) => {
    return `${(Number(amount) / 100).toFixed(2)} IDRX`;
  };


  // Filter contracts that need documents
  const pendingContracts = escrows.filter(e => 
    e.status === 'FUNDED' || e.status === 'DOCUMENTS_PENDING'
  );

  // Calculate stats
  const stats = {
    totalContracts: escrows.length,
    funded: escrows.filter(e => e.status === 'FUNDED').length,
    documentsUploaded: escrows.filter(e => e.status === 'DOCUMENTS_PENDING').length,
    settled: escrows.filter(e => e.status === 'SETTLED').length
  };

  const handleDocumentUpload = async (contractId: string) => {
    const file = uploadedFiles[`${contractId}-main`];
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    setUploadingContract(contractId);

    try {
      // In a real app, you would:
      // 1. Upload to Supabase storage
      // 2. Get the file URL/hash
      // For now, we'll create a mock hash from the file name
      const documentHash = keccak256(toBytes(file.name + Date.now()));

      // Store hash on blockchain
      writeContract({
        address: ESCROW_CONTRACT,
        abi: ESCROW_ABI,
        functionName: "storeDocumentHash",
        args: [contractId as `0x${string}`, documentHash],
      });

      toast.info("Submitting document hash to blockchain...");
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error("Failed to upload document");
      setUploadingContract(null);
    }
  };

  if (!address) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">Please connect your wallet to view compliance documents</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Compliance Documents</h1>
          <p className="text-gray-600">Upload shipping documents for your contracts</p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={async () => {
            try {
              const data = await graphqlClient.request<EscrowsResponse>(GET_ALL_ESCROWS);
              console.log("All escrows:", data.escrows.items);
              toast.info(`Found ${data.escrows.items.length} total escrows in the system`);
            } catch (error) {
              console.error("Error fetching all escrows:", error);
            }
          }}
        >
          Debug: Show All Escrows
        </Button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <Card className="gradient-card-blue hover-lift">
          <CardContent className="stats-card-content">
            <div className="stats-icon bg-blue-500">
              <Shield className="h-7 w-7 text-white" />
            </div>
            <div className="stats-value text-blue-900">{stats.totalContracts}</div>
            <div className="stats-label text-blue-700">Total Contracts</div>
          </CardContent>
        </Card>
        <Card className="gradient-card-orange hover-lift">
          <CardContent className="stats-card-content">
            <div className="stats-icon bg-orange-500">
              <Clock className="h-7 w-7 text-white" />
            </div>
            <div className="stats-value text-orange-900">{stats.funded}</div>
            <div className="stats-label text-orange-700">Awaiting Documents</div>
          </CardContent>
        </Card>
        <Card className="gradient-card-yellow hover-lift">
          <CardContent className="stats-card-content">
            <div className="stats-icon bg-yellow-500">
              <FileText className="h-7 w-7 text-white" />
            </div>
            <div className="stats-value text-yellow-900">{stats.documentsUploaded}</div>
            <div className="stats-label text-yellow-700">Documents Uploaded</div>
          </CardContent>
        </Card>
        <Card className="gradient-card-green hover-lift">
          <CardContent className="stats-card-content">
            <div className="stats-icon bg-green-500">
              <CheckCircle className="h-7 w-7 text-white" />
            </div>
            <div className="stats-value text-green-900">{stats.settled}</div>
            <div className="stats-label text-green-700">Settled</div>
          </CardContent>
        </Card>
      </div>

      {/* Contracts Needing Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Contracts Awaiting Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
              <p className="text-gray-500 mt-2">Loading contracts...</p>
            </div>
          ) : pendingContracts.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No contracts require documents at this time</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingContracts.map((contract) => {
                const fileKey = `${contract.id}-main`;
                const hasSelectedFile = uploadedFiles[fileKey] !== undefined;
                const isUploading = uploadingContract === contract.id;
                const documentsAlreadyUploaded = contract.status === 'DOCUMENTS_PENDING';
                
                return (
                  <div key={contract.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">Contract #{contract.id.slice(0, 10)}...</h3>
                          <Badge className={
                            contract.status === 'FUNDED' ? 'bg-purple-100 text-purple-800' : 
                            'bg-yellow-100 text-yellow-800'
                          }>
                            <Truck className="h-3 w-3 mr-1" />
                            {contract.status === 'FUNDED' ? 'Ready to Ship' : 'Documents Uploaded'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Buyer: {contract.buyer.slice(0, 6)}...{contract.buyer.slice(-4)} | Amount: {formatIDRX(contract.amount)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {contract.fundedAt ? `Funded ${formatDistanceToNow(new Date(contract.fundedAt * 1000), { addSuffix: true })}` : 'Not funded yet'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Document Upload Section */}
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-gray-700">
                        {documentsAlreadyUploaded ? 'Documents Already Uploaded' : 'Upload Shipping Documents:'}
                      </p>
                      
                      <div className={`flex items-center gap-3 p-3 rounded-lg ${documentsAlreadyUploaded ? 'bg-green-50' : 'bg-gray-50'}`}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {documentsAlreadyUploaded ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : hasSelectedFile ? (
                              <FileText className="h-4 w-4 text-blue-600" />
                            ) : (
                              <Clock className="h-4 w-4 text-gray-400" />
                            )}
                            <span className={`text-sm font-medium ${documentsAlreadyUploaded ? 'text-green-700' : ''}`}>
                              {documentsAlreadyUploaded ? 'Documents Successfully Uploaded' : 'Shipping Documents Package'}
                            </span>
                          </div>
                          {!documentsAlreadyUploaded && hasSelectedFile && uploadedFiles[fileKey] && (
                            <p className="text-xs text-gray-500 mt-1 ml-6">
                              Selected: {uploadedFiles[fileKey]!.name}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {!documentsAlreadyUploaded && (
                            <>
                              <input
                                type="file"
                                id={fileKey}
                                className="hidden"
                                accept=".pdf,.png,.jpg,.doc,.docx"
                                disabled={isUploading || isConfirming || documentsAlreadyUploaded}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setUploadedFiles(prev => ({ ...prev, [fileKey]: file }));
                                  }
                                }}
                              />
                              <label htmlFor={fileKey}>
                                <Button size="sm" variant="outline" asChild disabled={isUploading || isConfirming || documentsAlreadyUploaded}>
                                  <span className="cursor-pointer">
                                    <Upload className="h-3 w-3 mr-1" />
                                    Choose File
                                  </span>
                                </Button>
                              </label>
                              {hasSelectedFile && (
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  disabled={isUploading || isConfirming}
                                  onClick={() => {
                                    setUploadedFiles(prev => {
                                      const newFiles = { ...prev };
                                      delete newFiles[fileKey];
                                      return newFiles;
                                    });
                                  }}
                                >
                                  Remove
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Submit Button */}
                      {!documentsAlreadyUploaded ? (
                        <>
                          <Button 
                            className="w-full"
                            disabled={!hasSelectedFile || isUploading || isConfirming || documentsAlreadyUploaded}
                            onClick={() => handleDocumentUpload(contract.id)}
                          >
                            {isUploading || isConfirming ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                {isConfirming ? 'Confirming on blockchain...' : 'Uploading...'}
                              </>
                            ) : (
                              <>
                                <Shield className="h-4 w-4 mr-2" />
                                Submit Document Hash to Blockchain
                              </>
                            )}
                          </Button>
                          <p className="text-xs text-gray-500 text-center">
                            Document hash will be stored on-chain for buyer verification
                          </p>
                        </>
                      ) : (
                        <div className="bg-green-100 border border-green-300 rounded-lg p-3 text-center">
                          <p className="text-sm text-green-800 font-medium">
                            ✓ Documents submitted successfully
                          </p>
                          <p className="text-xs text-green-700 mt-1">
                            Waiting for buyer to confirm delivery
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notice for Buyer Contracts */}
      {buyerEscrows.length > 0 && escrows.length === 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-900">You are a buyer in {buyerEscrows.length} contract{buyerEscrows.length > 1 ? 's' : ''}</p>
                <p className="text-sm text-yellow-700 mt-1">
                  As a buyer, you don't need to upload shipping documents. Sellers will upload documents for verification.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Seller's Contracts */}
      <Card>
        <CardHeader>
          <CardTitle>All Your Contracts (as Seller)</CardTitle>
        </CardHeader>
        <CardContent>
          {escrows.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No contracts found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {escrows.map((contract) => (
                <div key={contract.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">Contract #{contract.id.slice(0, 10)}...</p>
                      <p className="text-xs text-gray-500">
                        Amount: {formatIDRX(contract.amount)} • Created {formatDistanceToNow(new Date(contract.createdAt * 1000), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    className={
                      contract.status === 'SETTLED' ? 'bg-green-100 text-green-800' : 
                      contract.status === 'FUNDED' ? 'bg-purple-100 text-purple-800' : 
                      contract.status === 'DOCUMENTS_PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      contract.status === 'DISPUTED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }
                  >
                    {contract.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}