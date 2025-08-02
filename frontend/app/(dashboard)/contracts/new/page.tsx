"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Loader2, 
  ArrowLeft, 
  Upload, 
  FileText,
  Mail,
  DollarSign
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { LiskEscrowSimpleAbi } from "@/lib/contracts/LiskEscrowSimpleAbi";
import { ESCROW_CONTRACT, IDRX_CONTRACT, SELLER_ADDRESS } from "@/lib/contracts/constants";

export default function CreateContractPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { address: account } = useAccount();
  
  // Contract write hooks
  const { writeContract: createEscrow, data: createHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: createHash,
  });
  
  const [formData, setFormData] = useState({
    sellerEmail: "",
    amount: "",
    deliveryDays: "7", // Default 7 days
    poDocument: null as File | null,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setFormData({ ...formData, poDocument: file });
    } else {
      toast.error('Please select a PDF file');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.sellerEmail || !formData.amount) {
      toast.error('Please fill in seller email and amount');
      return;
    }

    if (!account) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      const deliveryDeadline = Math.floor(Date.now() / 1000) + parseInt(formData.deliveryDays) * 24 * 60 * 60;
      const amountInWei = parseUnits(formData.amount, 2); // IDRX has 2 decimals

      console.log('Creating escrow contract:', {
        sellerEmail: formData.sellerEmail,
        sellerAddress: SELLER_ADDRESS,
        buyerAddress: account,
        amount: amountInWei.toString(),
        deliveryDeadline: deliveryDeadline
      });

      // Call the smart contract
      await createEscrow({
        address: ESCROW_CONTRACT,
        abi: LiskEscrowSimpleAbi,
        functionName: "createEscrow",
        args: [
          SELLER_ADDRESS,
          amountInWei,
          IDRX_CONTRACT,
          BigInt(deliveryDeadline)
        ],
      });
      
      toast.success('Transaction submitted! Waiting for confirmation...');
    } catch (error) {
      console.error('Error creating contract:', error);
      toast.error('Failed to create contract');
    }
  };

  // Watch for transaction confirmation
  React.useEffect(() => {
    if (isConfirmed && createHash) {
      toast.success('Contract created successfully!');
      
      // Store PO document in localStorage or handle upload
      if (formData.poDocument) {
        // In a real app, you'd upload this to Supabase/IPFS
        console.log('PO Document to upload:', formData.poDocument);
      }
      
      // Navigate to contracts page
      router.push("/contracts");
    }
  }, [isConfirmed, createHash, router, formData.poDocument]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Contract</h1>
        <p className="text-gray-600">Start a secure escrow transaction</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Contract Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Seller Email */}
            <div className="space-y-2">
              <Label htmlFor="sellerEmail" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-500" />
                Seller Email Address
              </Label>
              <Input
                id="sellerEmail"
                type="email"
                placeholder="seller@company.com"
                value={formData.sellerEmail}
                onChange={(e) => setFormData({ ...formData, sellerEmail: e.target.value })}
                required
                className="text-lg"
              />
              <p className="text-sm text-gray-500">
                Enter the email address of the seller you want to purchase from
              </p>
            </div>

            {/* Purchase Order Document */}
            <div className="space-y-2">
              <Label htmlFor="poDocument" className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500" />
                Purchase Order Document (PDF)
              </Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <input
                  id="poDocument"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  required
                />
                <label htmlFor="poDocument" className="cursor-pointer">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  {formData.poDocument ? (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-900">
                        {formData.poDocument.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(formData.poDocument.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-700">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PDF files only (max 10MB)
                      </p>
                    </>
                  )}
                </label>
              </div>
              <p className="text-sm text-gray-500">
                Upload your purchase order that contains the transaction details
              </p>
            </div>

            {/* Contract Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-500" />
                Contract Amount (IDRX)
              </Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  min="0.01"
                  step="0.01"
                  className="text-lg flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-gray-500 font-medium bg-gray-100 px-3 py-2 rounded">
                  IDRX
                </span>
              </div>
              <p className="text-sm text-gray-500">
                The total amount to be held in escrow
              </p>
            </div>

            {/* Delivery Days */}
            <div className="space-y-2">
              <Label htmlFor="deliveryDays">
                Delivery Deadline (Days)
              </Label>
              <Input
                id="deliveryDays"
                type="number"
                value={formData.deliveryDays}
                onChange={(e) => setFormData({ ...formData, deliveryDays: e.target.value })}
                min="1"
                max="365"
                className="text-lg"
              />
              <p className="text-sm text-gray-500">
                Number of days for the seller to deliver the goods
              </p>
            </div>

            {/* Summary */}
            <div className="bg-blue-50 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-blue-900">How it works:</h3>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Contract will be created and seller will be notified</li>
                <li>You'll fund the escrow after seller accepts</li>
                <li>Seller ships goods and uploads shipping documents</li>
                <li>You verify delivery and release payment</li>
              </ol>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full h-12 text-base"
              disabled={isLoading || isConfirming}
            >
              {isConfirming ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Confirming Transaction...
                </>
              ) : isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Creating Contract...
                </>
              ) : (
                <>
                  Create Escrow Contract
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}