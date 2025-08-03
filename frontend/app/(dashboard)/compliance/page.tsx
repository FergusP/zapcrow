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
  Loader2,
  Eye,
  Download
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { keccak256, toBytes } from "viem";
import { graphqlClient, handleGraphQLError } from "@/lib/graphql/client";
import { GET_SELLER_ESCROWS, GET_ALL_ESCROWS, GET_BUYER_ESCROWS } from "@/lib/graphql/queries";
import type { EscrowsResponse } from "@/lib/graphql/client";
import { documentService, type DocumentRecord } from "@/lib/services/document-service";

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
  const [documents, setDocuments] = useState<Record<string, DocumentRecord[]>>({});
  const [uploadingContract, setUploadingContract] = useState<string | null>(null);
  
  // Contract write hooks
  const { writeContract, data: uploadHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: uploadHash });

  // Fetch seller's contracts from Ponder using graphql-request
  const fetchSellerContracts = async () => {
    if (!address) return;
    
    try {
      // console.log("Fetching escrows for seller:", address.toLowerCase());
      const data = await graphqlClient.request<EscrowsResponse>(
        GET_SELLER_ESCROWS,
        { seller: address.toLowerCase() }
      );
      // console.log("GraphQL response:", data);
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

  // Fetch documents for each escrow
  useEffect(() => {
    const fetchDocuments = async () => {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        return;
      }
      
      const allEscrows = [...escrows, ...buyerEscrows];
      for (const escrow of allEscrows) {
        try {
          const docs = await documentService.getDocumentsByEscrow(escrow.id);
          setDocuments(prev => ({ ...prev, [escrow.id]: docs }));
        } catch (error) {
          console.error(`Error fetching documents for escrow ${escrow.id}:`, error);
        }
      }
    };

    if (escrows.length > 0 || buyerEscrows.length > 0) {
      fetchDocuments();
    }
  }, [escrows, buyerEscrows]);

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
    if (!file || !address) {
      toast.error("Please select a file first");
      return;
    }

    setUploadingContract(contractId);

    try {
      let documentHash: `0x${string}`;
      
      // Check if Supabase is configured
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        // Upload to Supabase
        const document = await documentService.uploadDocument(
          file,
          contractId,
          contractId, // Using escrowId as contractId for now
          'bill_of_lading', // Using a valid document type from the schema
          address.toLowerCase()
        );
        
        // Update local documents state
        setDocuments(prev => ({
          ...prev,
          [contractId]: [...(prev[contractId] || []), document]
        }));
        
        // Use the document hash from the service
        documentHash = document.file_hash as `0x${string}`;
        
        toast.success("Document uploaded to storage!");
      } else {
        // Fallback to local hash calculation if Supabase not configured
        const buffer = await file.arrayBuffer();
        const hashArray = new Uint8Array(buffer);
        documentHash = keccak256(hashArray);
        
        toast.warning("Using local storage only. Configure Supabase for persistent storage.");
      }

      // Clear the file selection after successful upload
      setUploadedFiles(prev => {
        const newFiles = { ...prev };
        delete newFiles[`${contractId}-main`];
        return newFiles;
      });
      
      // Reset file input
      const fileInput = document.getElementById(`${contractId}-main`) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

      // Don't submit to blockchain here - just upload
      setUploadingContract(null);
      toast.success("Document uploaded successfully!");
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
              // console.log("All escrows:", data.escrows.items);
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
                                id={`${contract.id}-main`}
                                className="hidden"
                                accept=".pdf,.png,.jpg,.doc,.docx"
                                disabled={isUploading || isConfirming || documentsAlreadyUploaded || (documents[contract.id] && documents[contract.id].filter(doc => doc.type === 'bill_of_lading').length > 0)}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setUploadedFiles(prev => ({ ...prev, [fileKey]: file }));
                                  }
                                }}
                              />
                              <label htmlFor={`${contract.id}-main`}>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  asChild 
                                  disabled={isUploading || isConfirming || documentsAlreadyUploaded || (documents[contract.id] && documents[contract.id].filter(doc => doc.type === 'bill_of_lading').length > 0)}
                                >
                                  <span className={documents[contract.id] && documents[contract.id].filter(doc => doc.type === 'bill_of_lading').length > 0 ? "cursor-not-allowed opacity-50" : "cursor-pointer"}>
                                    <Upload className="h-3 w-3 mr-1" />
                                    Choose File
                                  </span>
                                </Button>
                              </label>
                              {hasSelectedFile && !documentsAlreadyUploaded && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="border-red-200 text-red-600 hover:bg-red-50"
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
                      
                      {/* Display uploaded documents from database */}
                      {documents[contract.id] && documents[contract.id].filter(doc => doc.type === 'bill_of_lading').length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-sm font-medium text-gray-700">Uploaded Documents:</p>
                          {documents[contract.id].filter(doc => doc.type === 'bill_of_lading').map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-2 bg-white rounded border">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-gray-400" />
                                <div>
                                  <p className="text-sm font-medium">{doc.file_name}</p>
                                  <p className="text-xs text-gray-500">
                                    Uploaded {formatDistanceToNow(new Date(doc.uploaded_at), { addSuffix: true })}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={
                                  doc.status === 'approved' ? 'bg-green-100 text-green-800' :
                                  doc.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }>
                                  {doc.status}
                                </Badge>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => window.open(doc.file_url, '_blank')}
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                  {contract.status !== 'DOCUMENTS_PENDING' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-red-200 text-red-600 hover:bg-red-50"
                                      onClick={async () => {
                                        try {
                                          // Extract file path from URL
                                          const urlParts = doc.file_url.split('/');
                                          const filePath = urlParts.slice(-2).join('/');
                                          await documentService.deleteDocument(doc.id, filePath);
                                          
                                          // Update local state
                                          setDocuments(prev => ({
                                            ...prev,
                                            [contract.id]: prev[contract.id].filter(d => d.id !== doc.id)
                                          }));
                                          toast.success("Document removed successfully");
                                        } catch (error) {
                                          console.error("Error deleting document:", error);
                                          toast.error("Failed to remove document");
                                        }
                                      }}
                                    >
                                      Remove
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Upload/Submit Buttons */}
                      {!documentsAlreadyUploaded ? (
                        <>
                          {/* Show upload button if no shipping documents uploaded yet */}
                          {(!documents[contract.id] || documents[contract.id].filter(doc => doc.type === 'bill_of_lading').length === 0) && (
                            <>
                              <Button 
                                className="w-full"
                                disabled={!hasSelectedFile || isUploading}
                                onClick={() => handleDocumentUpload(contract.id)}
                              >
                                {isUploading ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Uploading...
                                  </>
                                ) : (
                                  <>
                                    <Upload className="h-4 w-4 mr-2" />
                                    Upload Document
                                  </>
                                )}
                              </Button>
                              <p className="text-xs text-gray-500 text-center">
                                Upload your shipping documents first
                              </p>
                            </>
                          )}
                          
                          {/* Show submit button if shipping documents are uploaded */}
                          {documents[contract.id] && documents[contract.id].filter(doc => doc.type === 'bill_of_lading').length > 0 && (
                            <>
                              <Button 
                                className="w-full bg-green-600 hover:bg-green-700"
                                disabled={isConfirming}
                                onClick={async () => {
                                  const billOfLadingDocs = documents[contract.id].filter(doc => doc.type === 'bill_of_lading');
                                  const latestDoc = billOfLadingDocs[billOfLadingDocs.length - 1];
                                  const documentHash = latestDoc.file_hash as `0x${string}`;
                                  
                                  writeContract({
                                    address: ESCROW_CONTRACT,
                                    abi: ESCROW_ABI,
                                    functionName: "storeDocumentHash",
                                    args: [contract.id as `0x${string}`, documentHash],
                                  });
                                  
                                  toast.info("Submitting document hash to blockchain...");
                                }}
                              >
                                {isConfirming ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Confirming...
                                  </>
                                ) : (
                                  <>
                                    <Shield className="h-4 w-4 mr-2" />
                                    Submit to Blockchain
                                  </>
                                )}
                              </Button>
                              <p className="text-xs text-gray-500 text-center mt-2">
                                Document uploaded! Submit to blockchain
                              </p>
                            </>
                          )}
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