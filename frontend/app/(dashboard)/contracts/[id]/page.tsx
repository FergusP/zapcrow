'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Clock,
  DollarSign,
  FileText,
  Package,
  CheckCircle,
  XCircle,
  AlertCircle,
  Shield,
  Download,
  Eye,
  Loader2,
  Globe,
  User,
  Building2,
  ExternalLink,
  Database,
  TestTube,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import {
  mockContracts,
  getCurrentUser,
  getComplianceDocumentsByContract,
  mockTransactions
} from '@/lib/mock-data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LiskEscrowSimpleAbi } from '@/lib/contracts/LiskEscrowSimpleAbi';
import { ESCROW_CONTRACT, IDRX_CONTRACT, IDRX_ABI } from '@/lib/contracts/constants';
import { graphqlClient, handleGraphQLError } from "@/lib/graphql/client";
import { GET_ESCROW_BY_ID } from "@/lib/graphql/queries";
import type { Escrow } from "@/lib/graphql/client";
import { documentService, type DocumentRecord } from "@/lib/services/document-service";

export default function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { address: account } = useAccount();
  const [isProcessing, setIsProcessing] = useState(false);
  const [escrowData, setEscrowData] = useState<Escrow | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchaseOrder, setPurchaseOrder] = useState<DocumentRecord | null>(null);
  
  // Contract write hooks
  const { writeContract: approveToken, data: approveHash } = useWriteContract();
  const { writeContract: fundEscrow, data: fundHash } = useWriteContract();
  const { writeContract: confirmDelivery, data: confirmHash } = useWriteContract();
  
  // Wait for transaction receipts
  const { isLoading: isApproving, isSuccess: isApproved } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isLoading: isFunding, isSuccess: isFunded } = useWaitForTransactionReceipt({ hash: fundHash });
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: confirmHash });
  
  // For now, still use mock data for UI elements not in blockchain
  const currentUser = getCurrentUser();
  const contract = mockContracts.find(c => c.id === params.id);
  const mockDocuments = contract ? getComplianceDocumentsByContract(contract.id) : [];
  const relatedTransactions = mockTransactions.filter(t => t.contractId === params.id);
  const [realDocuments, setRealDocuments] = useState<DocumentRecord[]>([]);
  
  // Fetch escrow data from blockchain
  const fetchEscrowData = async () => {
    if (!params.id) return;
    
    try {
      const data = await graphqlClient.request<{ escrow: Escrow | null }>(
        GET_ESCROW_BY_ID,
        { id: params.id as string }
      );
      setEscrowData(data.escrow);
    } catch (error) {
      console.error("Failed to fetch escrow:", handleGraphQLError(error));
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchEscrowData();
    const interval = setInterval(fetchEscrowData, 3000);
    return () => clearInterval(interval);
  }, [params.id]);
  
  // Fetch purchase order document
  useEffect(() => {
    const fetchPurchaseOrder = async () => {
      if (!params.id || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        return;
      }
      
      try {
        // Documents are stored with escrow_id = blockchain escrow ID
        console.log('Fetching documents for escrow ID:', params.id);
        const documents = await documentService.getDocumentsByEscrow(params.id as string);
        
        console.log('Found documents:', documents.length);
        setRealDocuments(documents);
        const po = documents.find(doc => doc.type === 'purchase_order');
        if (po) {
          setPurchaseOrder(po);
          console.log('Found purchase order:', po);
        }
      } catch (error) {
        console.error('Error fetching documents:', error);
      }
    };
    
    if (params.id) {
      fetchPurchaseOrder();
    }
  }, [params.id]);
  
  // Watch for transaction confirmations
  useEffect(() => {
    if (isApproved) {
      toast.success('Token approval successful! Now funding escrow...');
      // After approval, fund the escrow
      fundEscrow({
        address: ESCROW_CONTRACT,
        abi: LiskEscrowSimpleAbi,
        functionName: "fundEscrow",
        args: [params.id as `0x${string}`],
      });
    }
  }, [isApproved, params.id]);
  
  useEffect(() => {
    if (isFunded) {
      toast.success('Escrow funded successfully!');
      fetchEscrowData();
    }
  }, [isFunded]);
  
  useEffect(() => {
    if (isConfirmed) {
      toast.success('Delivery confirmed! Funds released to seller.');
      fetchEscrowData();
    }
  }, [isConfirmed]);
  
  const formatIDRX = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? Number(amount) : amount;
    return `IDR ${numAmount.toLocaleString('id-ID')}`;
  };

  // Show loading state while fetching blockchain data
  if (loading && !contract) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='text-center'>
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className='text-gray-500'>Loading contract details...</p>
          <p className='text-xs text-gray-400 mt-2'>Waiting for blockchain confirmation...</p>
        </div>
      </div>
    );
  }

  // If no contract found in both mock data and blockchain
  if (!contract && !escrowData) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='text-center'>
          <p className='text-gray-500 mb-2'>Contract not found</p>
          <p className='text-xs text-gray-400 mb-4'>
            If you just created this contract, it may take a few seconds to appear
          </p>
          <div className='flex gap-2 justify-center'>
            <Button 
              variant='outline' 
              onClick={() => {
                setLoading(true);
                fetchEscrowData();
              }}
            >
              <RefreshCw className='h-4 w-4 mr-2' />
              Refresh
            </Button>
            <Link href="/contracts">
              <Button variant="outline">Back to Contracts</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Use real blockchain data if available, merge with mock data for UI details
  const isRealData = !!escrowData;
  
  // Type for the merged data
  type DisplayData = {
    id: string;
    buyer: { address: string; [key: string]: any };
    seller: { address: string; [key: string]: any };
    amount: number;
    status: string;
    createdAt: Date;
    fundedAt: Date | null;
    contractNumber: string;
    description: string;
    currency: string;
    paymentTerms: string;
    deadline: Date;
    updatedAt: Date;
    purchaseOrderUrl?: string;
  };
  
  // Merge real escrow data with mock contract data for rich UI
  const displayData: DisplayData | typeof contract = escrowData ? {
    // Core data from blockchain
    id: escrowData.id,
    buyer: { 
      address: escrowData.buyer,
      // Use mock data for UI details if available
      ...(contract?.buyer || {
        name: `Buyer ${escrowData.buyer.slice(0, 6)}`,
        company: 'Unknown Company',
        email: 'blockchain@user.com',
        country: 'Unknown',
        avatar: null,
        walletAddress: escrowData.buyer
      })
    },
    seller: { 
      address: escrowData.seller,
      // Use mock data for UI details if available
      ...(contract?.seller || {
        name: `Seller ${escrowData.seller.slice(0, 6)}`,
        company: 'Unknown Company', 
        email: 'blockchain@user.com',
        country: 'Unknown',
        avatar: null,
        walletAddress: escrowData.seller
      })
    },
    amount: Number(escrowData.amount) / 100, // Convert from smallest unit
    status: escrowData.status.toLowerCase().replace('_', ''),
    createdAt: new Date(escrowData.createdAt * 1000),
    fundedAt: escrowData.fundedAt ? new Date(escrowData.fundedAt * 1000) : null,
    // Use mock data for additional UI fields
    contractNumber: contract?.contractNumber || `#${escrowData.id.slice(0, 10)}`,
    description: contract?.description || 'Blockchain escrow contract',
    currency: 'IDRX',
    paymentTerms: contract?.paymentTerms || 'On delivery confirmation',
    deadline: contract?.deadline ? new Date(contract.deadline) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    updatedAt: contract?.updatedAt ? new Date(contract.updatedAt) : new Date(),
    purchaseOrderUrl: contract?.purchaseOrderUrl,
  } : contract;
  
  // Get current status for conditional rendering
  const currentStatus = isRealData ? displayData?.status : contract?.status;

  // Determine user role - when using real data, check the address field
  const isBuyer = isRealData && displayData && 'address' in displayData.buyer
    ? displayData.buyer.address === account?.toLowerCase() 
    : contract?.buyer.id === currentUser.id;
  const isSeller = isRealData && displayData && 'address' in displayData.seller
    ? displayData.seller.address === account?.toLowerCase()
    : contract?.seller.id === currentUser.id;
  const userRole = isBuyer ? 'Buyer' : isSeller ? 'Seller' : 'Viewer';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'created':
        return 'bg-blue-100 text-blue-800';
      case 'funded':
        return 'bg-purple-100 text-purple-800';
      case 'documents_pending':
        return 'bg-orange-100 text-orange-800';
      case 'settled':
        return 'bg-green-100 text-green-800';
      case 'disputed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'created':
        return <Clock className='h-4 w-4' />;
      case 'funded':
        return <DollarSign className='h-4 w-4' />;
      case 'documents_pending':
        return <FileText className='h-4 w-4' />;
      case 'settled':
        return <CheckCircle className='h-4 w-4' />;
      case 'disputed':
        return <AlertCircle className='h-4 w-4' />;
      case 'cancelled':
        return <XCircle className='h-4 w-4' />;
      default:
        return <Package className='h-4 w-4' />;
    }
  };

  const getStatusDisplay = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleFundEscrow = async () => {
    if (!escrowData) return;
    
    try {
      // First approve the token spending
      const amountInWei = parseUnits(escrowData.amount, 0); // Amount is already in smallest unit
      
      toast.info('Approving token spend...');
      await approveToken({
        address: IDRX_CONTRACT,
        abi: IDRX_ABI,
        functionName: "approve",
        args: [ESCROW_CONTRACT, amountInWei],
      });
    } catch (error) {
      console.error('Error funding escrow:', error);
      toast.error('Failed to approve token spend');
    }
  };

  const handleReleaseFunds = async () => {
    if (!params.id) return;
    
    try {
      toast.info('Confirming delivery...');
      await confirmDelivery({
        address: ESCROW_CONTRACT,
        abi: LiskEscrowSimpleAbi,
        functionName: "confirmDelivery",
        args: [params.id as `0x${string}`],
      });
    } catch (error) {
      console.error('Error releasing funds:', error);
      toast.error('Failed to confirm delivery');
    }
  };

  const handleRejectDocuments = async () => {
    const reason = prompt('Please provide a reason for rejecting the documents:');
    if (reason) {
      setIsProcessing(true);
      try {
        toast.warning('Documents rejected. Dispute initiated.');
        setTimeout(() => {
          router.push('/contracts');
        }, 2000);
      } catch (error) {
        toast.error('Failed to reject documents');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Link href='/contracts'>
            <Button variant='ghost' size='sm'>
              <ArrowLeft className='h-4 w-4 mr-2' />
              Back to Contracts
            </Button>
          </Link>
          <div>
            <div className='flex items-center gap-3'>
              <h1 className='text-2xl font-bold'>
                {isRealData ? `Contract #${displayData!.id.slice(0, 10)}...` : contract?.contractNumber || 'Unknown'}
              </h1>
              <Badge className={isRealData ? 'bg-green-100 text-green-800 border-green-200' : 'bg-orange-100 text-orange-800 border-orange-200'}>
                {isRealData ? (
                  <>
                    <Database className='h-3 w-3 mr-1' />
                    Blockchain
                  </>
                ) : (
                  <>
                    <TestTube className='h-3 w-3 mr-1' />
                    Mock
                  </>
                )}
              </Badge>
            </div>
            <p className='text-gray-600'>
              View contract details and take actions
            </p>
          </div>
        </div>
        <Badge className={`${getStatusColor(isRealData ? displayData!.status : contract?.status || 'created')} px-3 py-1`}>
          {getStatusIcon(isRealData ? displayData!.status : contract?.status || 'created')}
          <span className='ml-2'>{getStatusDisplay(isRealData ? displayData!.status : contract?.status || 'created')}</span>
        </Badge>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Main Content */}
        <div className='lg:col-span-2 space-y-6'>
          {/* Contract Parties */}
          <Card>
            <CardHeader>
              <CardTitle>Contract Parties</CardTitle>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div>
                  <p className='text-sm font-medium text-gray-600 mb-3'>
                    Buyer
                  </p>
                  <div className='flex items-start gap-3'>
                    <Avatar>
                      <AvatarImage src={displayData!.buyer.avatar || undefined} />
                      <AvatarFallback>{displayData!.buyer.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className='space-y-1'>
                      <p className={`font-semibold ${isRealData ? 'text-green-700' : 'text-orange-700'}`}>
                        {displayData!.buyer.name}
                      </p>
                      <p className='text-sm text-gray-600 flex items-center gap-1'>
                        <Building2 className="h-3 w-3" />
                        {displayData!.buyer.company}
                      </p>
                      <p className='text-sm text-gray-600'>{displayData!.buyer.email}</p>
                      <p className='text-xs text-gray-500 flex items-center gap-1'>
                        <Globe className="h-3 w-3" />
                        {displayData!.buyer.country}
                      </p>
                      <p className='text-xs text-gray-500 font-mono'>
                        {displayData!.buyer.walletAddress || (displayData!.buyer as any).address}
                      </p>
                    </div>
                  </div>
                  {isBuyer && (
                    <Badge variant='outline' className='mt-3'>
                      You
                    </Badge>
                  )}
                </div>
                <div>
                  <p className='text-sm font-medium text-gray-600 mb-3'>
                    Seller
                  </p>
                  <div className='flex items-start gap-3'>
                    <Avatar>
                      <AvatarImage src={displayData!.seller.avatar || undefined} />
                      <AvatarFallback>{displayData!.seller.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className='space-y-1'>
                      <p className={`font-semibold ${isRealData ? 'text-green-700' : 'text-orange-700'}`}>
                        {displayData!.seller.name}
                      </p>
                      <p className='text-sm text-gray-600 flex items-center gap-1'>
                        <Building2 className="h-3 w-3" />
                        {displayData!.seller.company}
                      </p>
                      <p className='text-sm text-gray-600'>{displayData!.seller.email}</p>
                      <p className='text-xs text-gray-500 flex items-center gap-1'>
                        <Globe className="h-3 w-3" />
                        {displayData!.seller.country}
                      </p>
                      <p className='text-xs text-gray-500 font-mono'>
                        {displayData!.seller.walletAddress || (displayData!.seller as any).address}
                      </p>
                    </div>
                  </div>
                  {isSeller && (
                    <Badge variant='outline' className='mt-3'>
                      You
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contract Details */}
          <Card>
            <CardHeader>
              <CardTitle>Contract Details</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex justify-between items-center'>
                <div>
                  <p className='text-sm font-medium text-gray-600'>
                    Contract Amount
                  </p>
                  <p className={`text-2xl font-bold ${isRealData ? 'text-green-700' : 'text-orange-700'}`}>
                    {formatIDRX(isRealData ? displayData!.amount : contract!.amount)}
                  </p>
                </div>
                <div>
                  <p className='text-sm font-medium text-gray-600'>
                    {isRealData ? 'Created Date' : 'Delivery Deadline'}
                  </p>
                  <p className='text-sm'>
                    {isRealData && displayData && 'createdAt' in displayData
                      ? new Date((displayData as DisplayData).createdAt).toLocaleDateString() 
                      : new Date((displayData as any)?.deadline || contract!.deadline).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Separator />
              <div>
                <p className='text-sm font-medium text-gray-600 mb-1'>Description</p>
                <p className='text-sm text-gray-800'>{displayData!.description}</p>
              </div>
              {/* Purchase Order Section */}
              {purchaseOrder && (
                <div>
                  <p className='text-sm font-medium text-gray-600 mb-1'>Purchase Order</p>
                  <Button 
                    variant='outline' 
                    size='sm' 
                    className='mt-1'
                    onClick={() => window.open(purchaseOrder.file_url, '_blank')}
                  >
                    <FileText className='h-4 w-4 mr-2' />
                    View {purchaseOrder.file_name}
                  </Button>
                </div>
              )}
              {isRealData && (
                <div>
                  <p className='text-sm font-medium text-gray-600 mb-1'>Blockchain ID</p>
                  <p className='text-xs font-mono text-green-700'>{displayData!.id}</p>
                </div>
              )}
              <Separator />
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <p className='text-sm font-medium text-gray-600'>Created</p>
                  <p className='text-sm'>
                    {isRealData && displayData && 'createdAt' in displayData 
                      ? new Date((displayData as DisplayData).createdAt).toLocaleDateString() 
                      : new Date((displayData as any)?.createdAt || contract!.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {(isRealData ? displayData!.fundedAt : contract?.fundedAt) && (
                  <div>
                    <p className='text-sm font-medium text-gray-600'>Funded</p>
                    <p className='text-sm'>
                      {isRealData && displayData && 'fundedAt' in displayData && displayData.fundedAt
                        ? new Date((displayData as DisplayData).fundedAt!).toLocaleDateString() 
                        : contract?.fundedAt ? new Date(contract.fundedAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                )}
                {!isRealData && contract?.documentsUploadedAt && (
                  <div>
                    <p className='text-sm font-medium text-gray-600'>Documents Uploaded</p>
                    <p className='text-sm'>{new Date(contract!.documentsUploadedAt).toLocaleDateString()}</p>
                  </div>
                )}
                {!isRealData && contract?.settledAt && (
                  <div>
                    <p className='text-sm font-medium text-gray-600'>Settled</p>
                    <p className='text-sm'>{new Date(contract!.settledAt).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
              {!isRealData && contract?.escrowId && (
                <>
                  <Separator />
                  <div>
                    <p className='text-sm font-medium text-gray-600'>Blockchain Details</p>
                    <div className='space-y-2 mt-2'>
                      <div className='flex items-center justify-between text-sm'>
                        <span className='text-gray-600'>Escrow ID:</span>
                        <span className='font-mono text-xs'>{contract!.escrowId}</span>
                      </div>
                      {contract!.transactionHash && (
                        <div className='flex items-center justify-between text-sm'>
                          <span className='text-gray-600'>Transaction:</span>
                          <a 
                            href={`https://sepolia-blockscout.lisk.com/tx/${contract!.transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className='font-mono text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1'
                          >
                            {contract!.transactionHash.slice(0, 8)}...
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
              {(purchaseOrder || displayData?.purchaseOrderUrl) && (
                <>
                  <Separator />
                  <div>
                    <p className='text-sm font-medium text-gray-600 mb-2'>Purchase Order</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const url = purchaseOrder?.file_url || displayData?.purchaseOrderUrl;
                        if (url) {
                          window.open(url, '_blank');
                        }
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download PO
                    </Button>
                    {purchaseOrder && (
                      <p className='text-xs text-gray-500 mt-1'>
                        Uploaded {formatDistanceToNow(new Date(purchaseOrder.uploaded_at), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Action Cards based on status and role */}
          {isBuyer && currentStatus === 'created' && (
            <Card className='border-blue-200 bg-blue-50'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <DollarSign className='h-5 w-5 text-blue-600' />
                  Action Required
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <p className='text-sm text-gray-700'>
                  This escrow contract has been created and is waiting for funding.
                </p>
                <div className='bg-white p-4 rounded-lg border'>
                  <div className='flex justify-between items-center mb-2'>
                    <span className='font-medium'>Amount to fund:</span>
                    <span className='font-bold text-lg'>{formatIDRX(isRealData ? displayData!.amount : contract!.amount)}</span>
                  </div>
                  <p className='text-xs text-gray-600'>
                    Funds will be held in escrow until delivery is confirmed
                  </p>
                </div>
                <Button
                  onClick={handleFundEscrow}
                  disabled={isApproving || isFunding}
                  className='w-full bg-blue-600 hover:bg-blue-700'
                >
                  {isApproving ? (
                    <>
                      <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                      Approving...
                    </>
                  ) : isFunding ? (
                    <>
                      <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                      Funding...
                    </>
                  ) : (
                    <>
                      <DollarSign className='h-4 w-4 mr-2' />
                      Fund Escrow
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {currentStatus === 'funded' && (
            <Card className='border-purple-200 bg-purple-50'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Clock className='h-5 w-5 text-purple-600' />
                  Waiting for Seller
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-sm text-gray-700'>
                  {isBuyer
                    ? 'The escrow has been funded. Waiting for the seller to ship goods and upload documents.'
                    : 'Please ship the goods and upload shipping documents to proceed.'}
                </p>
                {isSeller && (
                  <Link href="/compliance">
                    <Button className="mt-4" variant="outline">
                      <FileText className="h-4 w-4 mr-2" />
                      Upload Documents
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}

          {currentStatus === 'documentspending' && (
            <Card className='border-orange-200 bg-orange-50'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <FileText className='h-5 w-5 text-orange-600' />
                  {isBuyer ? 'Review Documents' : 'Documents Submitted'}
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <p className='text-sm text-gray-700'>
                  {isBuyer
                    ? 'The seller has uploaded shipping documents. Please review and confirm delivery.'
                    : 'Your documents have been submitted and are awaiting buyer confirmation.'}
                </p>
                
                {/* Document List */}
                {(realDocuments.length > 0 || mockDocuments.length > 0) && (
                  <div className='space-y-2'>
                    <p className='text-sm font-medium text-gray-700'>Uploaded Documents:</p>
                    {/* Show real documents - only shipping documents (bill of lading) for review */}
                    {realDocuments.filter(doc => doc.type === 'bill_of_lading').map((doc) => (
                      <div key={doc.id} className='flex items-center justify-between p-3 bg-white rounded-lg border'>
                        <div className='flex items-center gap-2'>
                          <FileText className='h-4 w-4 text-gray-400' />
                          <div>
                            <p className='text-sm font-medium'>{doc.file_name}</p>
                            <p className='text-xs text-gray-500'>
                              Uploaded {formatDistanceToNow(new Date(doc.uploaded_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <div className='flex items-center gap-2'>
                          <Badge className={
                            doc.status === 'approved' ? 'bg-green-100 text-green-800' :
                            doc.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }>
                            {doc.status}
                          </Badge>
                          <Button 
                            variant='ghost' 
                            size='sm'
                            onClick={() => window.open(doc.file_url, '_blank')}
                          >
                            <Eye className='h-4 w-4' />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {/* Show mock documents if no real documents */}
                    {realDocuments.length === 0 && mockDocuments.map((doc) => (
                      <div key={doc.id} className='flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100'>
                        <div className='flex items-center gap-2'>
                          <FileText className='h-4 w-4 text-gray-400' />
                          <div>
                            <p className='text-sm font-medium'>{doc.name}</p>
                            <p className='text-xs text-gray-500'>
                              Uploaded {formatDistanceToNow(new Date(doc.uploadedAt), { addSuffix: true })} (Mock)
                            </p>
                          </div>
                        </div>
                        <div className='flex items-center gap-2'>
                          <Badge className={
                            doc.status === 'approved' ? 'bg-green-100 text-green-800' :
                            doc.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }>
                            {doc.status}
                          </Badge>
                          <Button variant='ghost' size='sm' disabled>
                            <Eye className='h-4 w-4' />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {isBuyer && (
                  <div className='flex gap-3'>
                    <Button
                      onClick={handleReleaseFunds}
                      disabled={isConfirming}
                      className='flex-1 bg-green-600 hover:bg-green-700'
                    >
                      {isConfirming ? (
                        <>
                          <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                          Confirming...
                        </>
                      ) : (
                        <>
                          <CheckCircle className='h-4 w-4 mr-2' />
                          Confirm & Release Funds
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleRejectDocuments}
                      disabled={isProcessing}
                      variant='outline'
                      className='border-red-200 text-red-600 hover:bg-red-50'
                    >
                      <XCircle className='h-4 w-4 mr-2' />
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {currentStatus === 'settled' && (
            <Card className='border-green-200 bg-green-50'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <CheckCircle className='h-5 w-5 text-green-600' />
                  Contract Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-sm text-gray-700'>
                  This contract has been successfully completed. Funds have been released to the seller.
                </p>
              </CardContent>
            </Card>
          )}

          {currentStatus === 'disputed' && (
            <Card className='border-red-200 bg-red-50'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <AlertCircle className='h-5 w-5 text-red-600' />
                  Contract Disputed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-sm text-gray-700'>
                  This contract is under dispute. Please contact support for resolution.
                </p>
                <Link href="/support">
                  <Button variant="outline" className="mt-4">
                    Contact Support
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Transaction History */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              {relatedTransactions.length === 0 ? (
                <p className='text-sm text-gray-500'>No transactions yet</p>
              ) : (
                <div className='space-y-3'>
                  {relatedTransactions.map((tx) => (
                    <div key={tx.id} className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
                      <div>
                        <p className='text-sm font-medium'>{tx.description}</p>
                        <p className='text-xs text-gray-500'>
                          {formatDistanceToNow(new Date(tx.date), { addSuffix: true })}
                        </p>
                      </div>
                      <div className='text-right'>
                        <p className='font-semibold'>
                          {tx.type === 'received' || tx.type === 'funded' ? '+' : '-'}
                          {formatIDRX(tx.amount)}
                        </p>
                        <Badge variant='outline' className='text-xs'>
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className='space-y-6'>
          {/* Your Role */}
          <Card>
            <CardHeader>
              <CardTitle className='text-lg'>Your Role</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='flex items-center gap-3'>
                <Avatar>
                  <AvatarImage src={currentUser.avatar} />
                  <AvatarFallback>{currentUser.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className='font-semibold'>{userRole}</p>
                  <p className='text-sm text-gray-600'>{currentUser.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contract Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className='text-lg'>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                <div className='flex gap-3'>
                  <div className='w-2 h-2 rounded-full bg-blue-500 mt-2'></div>
                  <div>
                    <p className='font-medium text-sm'>Contract Created</p>
                    <p className='text-xs text-gray-500'>
                      {formatDistanceToNow(
                        isRealData && displayData ? new Date((displayData as DisplayData).createdAt) : new Date(contract!.createdAt), 
                        { addSuffix: true }
                      )}
                    </p>
                  </div>
                </div>
                {(isRealData ? displayData?.fundedAt : contract?.fundedAt) && (
                  <div className='flex gap-3'>
                    <div className='w-2 h-2 rounded-full bg-purple-500 mt-2'></div>
                    <div>
                      <p className='font-medium text-sm'>Escrow Funded</p>
                      <p className='text-xs text-gray-500'>
                        {formatDistanceToNow(
                          isRealData && displayData && (displayData as DisplayData).fundedAt 
                            ? new Date((displayData as DisplayData).fundedAt!) 
                            : new Date(contract!.fundedAt!), 
                          { addSuffix: true }
                        )}
                      </p>
                    </div>
                  </div>
                )}
                {!isRealData && contract?.documentsUploadedAt && (
                  <div className='flex gap-3'>
                    <div className='w-2 h-2 rounded-full bg-orange-500 mt-2'></div>
                    <div>
                      <p className='font-medium text-sm'>Documents Uploaded</p>
                      <p className='text-xs text-gray-500'>
                        {formatDistanceToNow(new Date(contract!.documentsUploadedAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                )}
                {!isRealData && contract?.settledAt && (
                  <div className='flex gap-3'>
                    <div className='w-2 h-2 rounded-full bg-green-500 mt-2'></div>
                    <div>
                      <p className='font-medium text-sm'>Contract Settled</p>
                      <p className='text-xs text-gray-500'>
                        {formatDistanceToNow(new Date(contract!.settledAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                )}
                {!isRealData && contract?.disputedAt && (
                  <div className='flex gap-3'>
                    <div className='w-2 h-2 rounded-full bg-red-500 mt-2'></div>
                    <div>
                      <p className='font-medium text-sm'>Dispute Initiated</p>
                      <p className='text-xs text-gray-500'>
                        {formatDistanceToNow(new Date(contract!.disputedAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Security Notice */}
          <Card>
            <CardHeader>
              <CardTitle className='text-lg flex items-center gap-2'>
                <Shield className='h-5 w-5' />
                Secure Escrow
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-sm text-gray-600'>
                All funds are securely held in a smart contract on the Lisk blockchain. Funds are only released when both parties fulfill their obligations.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}