'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useAccount } from 'wagmi';
import {
  mockContracts,
  getCurrentUser,
  getComplianceDocumentsByContract,
  mockTransactions
} from '@/lib/mock-data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { address: account } = useAccount();
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Use mock data
  const currentUser = getCurrentUser();
  const contract = mockContracts.find(c => c.id === params.id);
  const documents = contract ? getComplianceDocumentsByContract(contract.id) : [];
  const relatedTransactions = mockTransactions.filter(t => t.contractId === params.id);
  
  const formatIDRX = (amount: number) => {
    return `IDR ${amount.toLocaleString('id-ID')}`;
  };

  if (!contract) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='text-center'>
          <p className='text-red-500 mb-2'>Contract not found</p>
          <Link href="/contracts">
            <Button variant="outline">Back to Contracts</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Determine user role in this contract
  const isBuyer = contract.buyer.id === currentUser.id;
  const isSeller = contract.seller.id === currentUser.id;
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
    setIsProcessing(true);
    try {
      toast.success('Escrow funded successfully!');
      setTimeout(() => {
        router.push('/contracts');
      }, 2000);
    } catch (error) {
      toast.error('Failed to fund escrow');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReleaseFunds = async () => {
    setIsProcessing(true);
    try {
      toast.success('Funds released successfully!');
      setTimeout(() => {
        router.push('/contracts');
      }, 2000);
    } catch (error) {
      toast.error('Failed to release funds');
    } finally {
      setIsProcessing(false);
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
            <h1 className='text-2xl font-bold'>
              {contract.contractNumber}
            </h1>
            <p className='text-gray-600'>
              View contract details and take actions
            </p>
          </div>
        </div>
        <Badge className={`${getStatusColor(contract.status)} px-3 py-1`}>
          {getStatusIcon(contract.status)}
          <span className='ml-2'>{getStatusDisplay(contract.status)}</span>
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
                      <AvatarImage src={contract.buyer.avatar} />
                      <AvatarFallback>{contract.buyer.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className='space-y-1'>
                      <p className='font-semibold'>{contract.buyer.name}</p>
                      <p className='text-sm text-gray-600 flex items-center gap-1'>
                        <Building2 className="h-3 w-3" />
                        {contract.buyer.company}
                      </p>
                      <p className='text-sm text-gray-600'>{contract.buyer.email}</p>
                      <p className='text-xs text-gray-500 flex items-center gap-1'>
                        <Globe className="h-3 w-3" />
                        {contract.buyer.country}
                      </p>
                      <p className='text-xs text-gray-500 font-mono'>
                        {contract.buyer.walletAddress}
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
                      <AvatarImage src={contract.seller.avatar} />
                      <AvatarFallback>{contract.seller.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className='space-y-1'>
                      <p className='font-semibold'>{contract.seller.name}</p>
                      <p className='text-sm text-gray-600 flex items-center gap-1'>
                        <Building2 className="h-3 w-3" />
                        {contract.seller.company}
                      </p>
                      <p className='text-sm text-gray-600'>{contract.seller.email}</p>
                      <p className='text-xs text-gray-500 flex items-center gap-1'>
                        <Globe className="h-3 w-3" />
                        {contract.seller.country}
                      </p>
                      <p className='text-xs text-gray-500 font-mono'>
                        {contract.seller.walletAddress}
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
                  <p className='text-2xl font-bold'>
                    {formatIDRX(contract.amount)}
                  </p>
                </div>
                <div>
                  <p className='text-sm font-medium text-gray-600'>
                    Delivery Deadline
                  </p>
                  <p className='text-sm'>{new Date(contract.deadline).toLocaleDateString()}</p>
                </div>
              </div>
              <Separator />
              <div>
                <p className='text-sm font-medium text-gray-600 mb-1'>Description</p>
                <p className='text-sm text-gray-800'>{contract.description}</p>
              </div>
              <Separator />
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <p className='text-sm font-medium text-gray-600'>Created</p>
                  <p className='text-sm'>{new Date(contract.createdAt).toLocaleDateString()}</p>
                </div>
                {contract.fundedAt && (
                  <div>
                    <p className='text-sm font-medium text-gray-600'>Funded</p>
                    <p className='text-sm'>{new Date(contract.fundedAt).toLocaleDateString()}</p>
                  </div>
                )}
                {contract.documentsUploadedAt && (
                  <div>
                    <p className='text-sm font-medium text-gray-600'>Documents Uploaded</p>
                    <p className='text-sm'>{new Date(contract.documentsUploadedAt).toLocaleDateString()}</p>
                  </div>
                )}
                {contract.settledAt && (
                  <div>
                    <p className='text-sm font-medium text-gray-600'>Settled</p>
                    <p className='text-sm'>{new Date(contract.settledAt).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
              {contract.escrowId && (
                <>
                  <Separator />
                  <div>
                    <p className='text-sm font-medium text-gray-600'>Blockchain Details</p>
                    <div className='space-y-2 mt-2'>
                      <div className='flex items-center justify-between text-sm'>
                        <span className='text-gray-600'>Escrow ID:</span>
                        <span className='font-mono text-xs'>{contract.escrowId}</span>
                      </div>
                      {contract.transactionHash && (
                        <div className='flex items-center justify-between text-sm'>
                          <span className='text-gray-600'>Transaction:</span>
                          <a 
                            href={`https://sepolia-blockscout.lisk.com/tx/${contract.transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className='font-mono text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1'
                          >
                            {contract.transactionHash.slice(0, 8)}...
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
              {contract.purchaseOrderUrl && (
                <>
                  <Separator />
                  <div>
                    <p className='text-sm font-medium text-gray-600 mb-2'>Purchase Order</p>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download PO
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Action Cards based on status and role */}
          {isBuyer && contract.status === 'created' && (
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
                    <span className='font-bold text-lg'>{formatIDRX(contract.amount)}</span>
                  </div>
                  <p className='text-xs text-gray-600'>
                    Funds will be held in escrow until delivery is confirmed
                  </p>
                </div>
                <Button
                  onClick={handleFundEscrow}
                  disabled={isProcessing}
                  className='w-full bg-blue-600 hover:bg-blue-700'
                >
                  {isProcessing ? (
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

          {contract.status === 'funded' && (
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

          {contract.status === 'documents_pending' && (
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
                {documents.length > 0 && (
                  <div className='space-y-2'>
                    <p className='text-sm font-medium text-gray-700'>Uploaded Documents:</p>
                    {documents.map((doc) => (
                      <div key={doc.id} className='flex items-center justify-between p-3 bg-white rounded-lg border'>
                        <div className='flex items-center gap-2'>
                          <FileText className='h-4 w-4 text-gray-400' />
                          <div>
                            <p className='text-sm font-medium'>{doc.name}</p>
                            <p className='text-xs text-gray-500'>
                              Uploaded {formatDistanceToNow(new Date(doc.uploadedAt), { addSuffix: true })}
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
                          <Button variant='ghost' size='sm'>
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
                      disabled={isProcessing}
                      className='flex-1 bg-green-600 hover:bg-green-700'
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                          Processing...
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

          {contract.status === 'settled' && (
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

          {contract.status === 'disputed' && (
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
                      {formatDistanceToNow(new Date(contract.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                {contract.fundedAt && (
                  <div className='flex gap-3'>
                    <div className='w-2 h-2 rounded-full bg-purple-500 mt-2'></div>
                    <div>
                      <p className='font-medium text-sm'>Escrow Funded</p>
                      <p className='text-xs text-gray-500'>
                        {formatDistanceToNow(new Date(contract.fundedAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                )}
                {contract.documentsUploadedAt && (
                  <div className='flex gap-3'>
                    <div className='w-2 h-2 rounded-full bg-orange-500 mt-2'></div>
                    <div>
                      <p className='font-medium text-sm'>Documents Uploaded</p>
                      <p className='text-xs text-gray-500'>
                        {formatDistanceToNow(new Date(contract.documentsUploadedAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                )}
                {contract.settledAt && (
                  <div className='flex gap-3'>
                    <div className='w-2 h-2 rounded-full bg-green-500 mt-2'></div>
                    <div>
                      <p className='font-medium text-sm'>Contract Settled</p>
                      <p className='text-xs text-gray-500'>
                        {formatDistanceToNow(new Date(contract.settledAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                )}
                {contract.disputedAt && (
                  <div className='flex gap-3'>
                    <div className='w-2 h-2 rounded-full bg-red-500 mt-2'></div>
                    <div>
                      <p className='font-medium text-sm'>Dispute Initiated</p>
                      <p className='text-xs text-gray-500'>
                        {formatDistanceToNow(new Date(contract.disputedAt), { addSuffix: true })}
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